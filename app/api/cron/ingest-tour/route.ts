import { NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { ingestRegions } from '@/lib/tour/ingest'
import type { IngestResult } from '@/lib/tour/ingest'
import { createIngestDeps } from '@/lib/tour/ingestDeps'
import { selectQueue } from '@/lib/tour/queue'

/**
 * 한 번에 처리할 시군구 수. 실측 지역당 0.5초라 60초 제한은 제약이 아니고,
 * 진짜 제약은 TourAPI 일일 한도(1,000)다. 10건이면 70콜로 한도의 7%만 쓴다.
 * 250개를 한 바퀴 도는 데 25일 — 관광 정보 갱신 주기로 충분하다.
 */
const BATCH = 10

/** Vercel Hobby 함수 실행시간 상한에서 안전 여유를 뺀 값. */
const BUDGET_MS = 45_000

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * 정기 적재. Vercel Cron이 매일 KST 03:00에 부른다.
 *
 * 매일 소배치를 택한 이유: 한 번에 15개를 처리하면 Hobby 실행시간 상한에 걸리고,
 * 주 1회는 장애가 한 번만 나도 Supabase에 2주 공백이 생겨 잠김 방지 목적이 흔들린다.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  // 이 엔드포인트는 공개 URL이다. 시크릿이 없으면 켜지 않는다.
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const admin = createSupabaseAdminClient()

  let targets
  try {
    targets = await selectQueue(admin, BATCH)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: message }, { status: 500 })
  }

  if (targets.length === 0) {
    // 3순위(갱신)가 항상 공급되므로 여기 오는 건 regions가 비었을 때뿐이다.
    return NextResponse.json({ done: true, message: '처리할 지역이 없다' })
  }

  const codes = targets.map((t) => t.code)
  const { data: run, error: runError } = await admin
    .from('ingest_runs')
    .insert({ region_codes: codes, trigger: 'cron', status: 'running' })
    .select('id')
    .single()

  // 이력 행이 없어도 적재는 진행한다. 다만 무인 실행이라 로그가 유일한 통로다.
  if (runError) {
    console.error('ingest_runs insert 실패 (cron):', runError.message)
  }

  try {
    const result = await ingestRegions(
      targets.map((t) => ({
        code: t.code,
        areaCode: t.areaCode,
        sigunguCode: t.sigunguCode,
      })),
      createIngestDeps(BUDGET_MS),
    )

    // 실패한 지역만 카운터를 올린다. 임계를 넘으면 큐에서 뒤로 밀린다 —
    // 영원히 실패하는 지역이 매일 배치를 갉아먹는 것을 막는다.
    for (const failure of result.failures) {
      const { data: row } = await admin
        .from('regions')
        .select('attempt_count')
        .eq('code', failure.code)
        .maybeSingle()
      const { error: bumpError } = await admin
        .from('regions')
        .update({
          attempt_count: (row?.attempt_count ?? 0) + 1,
          last_error: failure.message,
        })
        .eq('code', failure.code)
      if (bumpError) {
        console.error(`attempt_count 갱신 실패(${failure.code}):`, bumpError.message)
      }
    }

    // 전부 실패했으면 실패로 남긴다. 일부라도 됐으면 성공이다 —
    // 남은 지역은 ingested_at이 비어 다음 실행이 자동으로 다시 집는다.
    const status = result.processed.length > 0 ? 'ok' : 'failed'
    if (run) {
      const { error: updateError } = await admin
        .from('ingest_runs')
        .update({
          finished_at: new Date().toISOString(),
          region_codes: result.processed,
          upserted: result.upserted,
          status,
          // 일부만 실패해도 사유를 남긴다. status가 ok일 때만 비우면 부분 실패가 조용히 묻힌다.
          error: describeFailures(result),
        })
        .eq('id', run.id)

      if (updateError) {
        console.error('ingest_runs 마감 실패:', updateError.message)
      }
    }

    // 어떤 이유로 뽑힌 배치였는지 남긴다 — 큐가 의도대로 도는지 눈으로 볼 유일한 창구다.
    return NextResponse.json({
      ...result,
      reasons: targets.map((t) => `${t.code}:${t.reason}`),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (run) {
      const { error: catchUpdateError } = await admin
        .from('ingest_runs')
        .update({ finished_at: new Date().toISOString(), status: 'failed', error: message })
        .eq('id', run.id)

      if (catchUpdateError) {
        console.error('ingest_runs 마감 실패:', catchUpdateError.message)
      }
    }
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/**
 * 관리자 페이지가 펼쳐 읽는 원문. 지역별 사유를 그대로 남겨야
 * 컬럼 오타 같은 구조적 버그를 일시적 장애와 구분할 수 있다.
 */
function describeFailures(result: IngestResult): string | null {
  if (result.failures.length === 0 && result.empty.length === 0) return null
  const lines = [
    ...result.failures.map((f) => `${f.code}: ${f.message}`),
    // 0건도 남긴다. 안 남기면 전 지역이 0건인 배치가 "실패, 사유 없음"으로만
    // 보여서 관리자 페이지에서 원인을 짚을 수 없다.
    ...result.empty.map((code) => `${code}: TourAPI 0건`),
  ]
  if (result.limitExceeded) lines.unshift('TourAPI 일일 한도 초과')
  return lines.join('\n')
}
