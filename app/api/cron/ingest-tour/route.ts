import { NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { ingestRegions } from '@/lib/tour/ingest'
import type { IngestResult } from '@/lib/tour/ingest'
import { createIngestDeps } from '@/lib/tour/ingestDeps'

/** 한 번에 처리할 시군구 수. 하루 3건 × 7일 = 주 21건, 250건 완주까지 약 12주. */
const BATCH = 3

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

  const { data: pending, error: pendingError } = await admin
    .from('regions')
    .select('code, tour_area_code, tour_sigungu_code')
    .is('ingested_at', null)
    .order('priority')
    .order('code')
    .limit(BATCH)

  if (pendingError) {
    return NextResponse.json({ error: pendingError.message }, { status: 500 })
  }
  if (!pending || pending.length === 0) {
    return NextResponse.json({ done: true, message: '적재할 지역이 없다' })
  }

  const codes = pending.map((r) => r.code)
  const { data: run } = await admin
    .from('ingest_runs')
    .insert({ region_codes: codes, trigger: 'cron', status: 'running' })
    .select('id')
    .single()

  try {
    const result = await ingestRegions(
      pending.map((r) => ({
        code: r.code,
        areaCode: r.tour_area_code,
        sigunguCode: r.tour_sigungu_code,
      })),
      createIngestDeps(BUDGET_MS),
    )

    // 전부 실패했으면 실패로 남긴다. 일부라도 됐으면 성공이다 —
    // 남은 지역은 ingested_at이 비어 다음 실행이 자동으로 다시 집는다.
    const status = result.processed.length > 0 ? 'ok' : 'failed'
    if (run) {
      await admin
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
    }

    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (run) {
      await admin
        .from('ingest_runs')
        .update({ finished_at: new Date().toISOString(), status: 'failed', error: message })
        .eq('id', run.id)
    }
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/**
 * 관리자 페이지가 펼쳐 읽는 원문. 지역별 사유를 그대로 남겨야
 * 컬럼 오타 같은 구조적 버그를 일시적 장애와 구분할 수 있다.
 */
function describeFailures(result: IngestResult): string | null {
  if (result.failures.length === 0) return null
  const lines = result.failures.map((f) => `${f.code}: ${f.message}`)
  if (result.limitExceeded) lines.unshift('TourAPI 일일 한도 초과')
  return lines.join('\n')
}
