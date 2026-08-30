import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { ingestRegions } from '@/lib/tour/ingest'
import { createIngestDeps } from '@/lib/tour/ingestDeps'
import type { AttractionRepository } from '../repositories'
import type { Attraction, RegionSummary } from '../types'

/** read-through 즉석 적재의 하루 상한. 사용자 트래픽이 TourAPI 한도를 소진해 cron까지 실패시키는 걸 막는 안전핀. */
const READ_THROUGH_DAILY_LIMIT = 50

/** 즉석 적재 한 번에 주는 시간. 지역 페이지 첫 방문자가 기다리는 시간이라 짧게 잡는다. */
const READ_THROUGH_BUDGET_MS = 15_000

type AttractionRow = {
  content_id: string
  content_type_id: number
  region_code: string
  title: string
  addr: string | null
  lat: number | null
  lng: number | null
  image_url: string | null
  overview: string | null
}

type RegionRow = {
  code: string
  name: string
  province: string
  tour_area_code: number
  tour_sigungu_code: number | null
  ingested_at: string | null
  attraction_count: number
  restaurant_count: number
}

function toAttraction(row: AttractionRow): Attraction {
  return {
    contentId: row.content_id,
    contentTypeId: row.content_type_id === 39 ? 39 : 12,
    regionCode: row.region_code,
    title: row.title,
    addr: row.addr,
    coords: row.lat !== null && row.lng !== null ? [row.lat, row.lng] : null,
    imageUrl: row.image_url,
    overview: row.overview,
  }
}

function toSummary(row: RegionRow): RegionSummary {
  return {
    code: row.code,
    name: row.name,
    province: row.province,
    ingestedAt: row.ingested_at,
    attractionCount: row.attraction_count,
    restaurantCount: row.restaurant_count,
  }
}

async function query(
  code: string,
  opts?: { type?: 12 | 39; limit?: number },
): Promise<Attraction[]> {
  const supabase = await createSupabaseServerClient()
  let q = supabase
    .from('attractions')
    .select('content_id, content_type_id, region_code, title, addr, lat, lng, image_url, overview')
    .eq('region_code', code)
  if (opts?.type) q = q.eq('content_type_id', opts.type)
  // overview가 있는 건을 앞으로. 지역 페이지 본문이 이 값으로 채워지기 때문이다.
  // 정렬 키는 has_overview(생성 컬럼)다 — overview 본문으로 정렬하면 한국어 문단
  // 사전순이 되어 mock이 같은 순서를 재현할 수 없다.
  q = q.order('has_overview', { ascending: false }).order('title')
  // limit이 0일 수도 있다. falsy 검사로 쓰면 0이 "제한 없음"이 된다.
  if (typeof opts?.limit === 'number') q = q.limit(opts.limit)

  const { data, error } = await q
  if (error) throw new Error(`attractions 조회 실패(${code}): ${error.message}`)
  return (data ?? []).map(toAttraction)
}

/**
 * 오늘 read-through가 상한에 닿았는지 본다. service role로 읽는다 —
 * ingest_runs는 RLS가 관리자만 열어 뒀고, 이 검사는 비로그인 요청에서도 돌아야 한다.
 */
async function readThroughExhausted(): Promise<boolean> {
  const admin = createSupabaseAdminClient()
  const since = new Date()
  since.setUTCHours(0, 0, 0, 0)

  const { count, error } = await admin
    .from('ingest_runs')
    .select('id', { count: 'exact', head: true })
    .eq('trigger', 'read_through')
    .gte('started_at', since.toISOString())

  // 세지 못하면 막는 쪽으로 판단한다. 상한의 목적이 한도 소진 방지다.
  if (error) return true
  return (count ?? 0) >= READ_THROUGH_DAILY_LIMIT
}

/**
 * 미적재 지역을 즉석 적재한다. cron과 **같은 ingestRegions**를 쓴다.
 * 동시 요청이 겹쳐도 upsert가 멱등이라 락을 두지 않는다 — 최악은 같은 데이터를 두 번 쓰는 것이다.
 */
async function ingestNow(region: RegionRow): Promise<void> {
  if (await readThroughExhausted()) return

  const admin = createSupabaseAdminClient()
  const { data: run, error: runError } = await admin
    .from('ingest_runs')
    .insert({ region_codes: [region.code], trigger: 'read_through', status: 'running' })
    .select('id')
    .single()

  // 이력 행을 못 만들어도 적재는 계속한다 — 사용자 요청 중이라 여기서 멈추면 화면이 빈다.
  // 다만 조용히 넘어가면 이 실행은 감사 흔적이 0이 되므로 로그로는 반드시 남긴다.
  if (runError) {
    console.error('ingest_runs insert 실패 (read_through):', runError.message)
  }

  try {
    const result = await ingestRegions(
      [
        {
          code: region.code,
          areaCode: region.tour_area_code,
          sigunguCode: region.tour_sigungu_code,
        },
      ],
      createIngestDeps(READ_THROUGH_BUDGET_MS),
    )
    if (run) {
      const { error: okUpdateError } = await admin
        .from('ingest_runs')
        .update({
          finished_at: new Date().toISOString(),
          upserted: result.upserted,
          status: result.processed.length > 0 ? 'ok' : 'failed',
          // 사유를 남긴다. read-through는 사용자 요청 중에 도는 경로라
          // 여기서 조용히 실패하면 다른 데서 드러날 자리가 없다.
          error:
            result.failures.length > 0
              ? result.failures.map((f) => `${f.code}: ${f.message}`).join('\n')
              : result.processed.length > 0
                ? null
                : '적재 결과 없음',
        })
        .eq('id', run.id)
      // 여기서도 실패하면 행이 running 상태로 남는다 — 조용히 넘어가지 않고 로그로 남긴다.
      if (okUpdateError) {
        console.error('ingest_runs update 실패 (read_through, ok):', okUpdateError.message)
      }
    }
  } catch (error) {
    if (run) {
      const { error: failUpdateError } = await admin
        .from('ingest_runs')
        .update({
          finished_at: new Date().toISOString(),
          status: 'failed',
          error: error instanceof Error ? error.message : String(error),
        })
        .eq('id', run.id)
      if (failUpdateError) {
        console.error('ingest_runs update 실패 (read_through, failed):', failUpdateError.message)
      }
    }
  }
}

async function fetchRegionRow(code: string): Promise<RegionRow | null> {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase
    .from('regions')
    .select(
      'code, name, province, tour_area_code, tour_sigungu_code, ingested_at, attraction_count, restaurant_count',
    )
    .eq('code', code)
    .maybeSingle()
  if (error) throw new Error(`regions 조회 실패(${code}): ${error.message}`)
  return data
}

export const supabaseAttractionRepo: AttractionRepository = {
  async listByRegion(code, opts) {
    const rows = await query(code, opts)
    if (rows.length > 0) return rows

    // 빈 결과 → 미적재일 수 있다. 그 자리에서 한 번 적재하고 다시 읽는다.
    const region = await fetchRegionRow(code)
    if (!region || region.ingested_at !== null) return rows

    try {
      await ingestNow(region)
    } catch (error) {
      // read-through는 최적화지 필수 경로가 아니다. service role 키가 없거나
      // Supabase가 닫혀 있으면 createSupabaseAdminClient()가 던지는데, 그게
      // 공개 페이지를 500으로 만들면 안 된다. 빈 목록으로 낮춰 앉힌다.
      console.error(
        'read-through 적재 실패:',
        error instanceof Error ? error.message : String(error),
      )
      return rows
    }
    return query(code, opts)
  },

  async getRegion(code) {
    const row = await fetchRegionRow(code)
    return row ? toSummary(row) : null
  },

  async listIngestedRegions() {
    const supabase = await createSupabaseServerClient()
    const { data, error } = await supabase
      .from('regions')
      .select(
        'code, name, province, tour_area_code, tour_sigungu_code, ingested_at, attraction_count, restaurant_count',
      )
      .not('ingested_at', 'is', null)
      .order('priority')
      .order('code')
    if (error) throw new Error(`적재 지역 조회 실패: ${error.message}`)
    return (data ?? []).map(toSummary)
  },
}
