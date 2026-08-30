import type { SupabaseClient } from '@supabase/supabase-js'
import { OVERVIEW_LIMIT } from './ingest'

/**
 * 이 횟수를 넘게 실패한 지역은 같은 순위 안에서 뒤로 민다.
 * 지우지는 않는다 — 원인이 TourAPI 일시 장애일 수 있고, 관리자 페이지에서
 * 사유를 볼 수 있어야 한다.
 */
export const MAX_ATTEMPTS = 3

export type QueueReason = 'pending' | 'overview' | 'refresh'

export type QueueTarget = {
  code: string
  areaCode: number
  sigunguCode: number | null
  /** 이 지역이 뽑힌 이유. 응답에 담아 큐가 의도대로 도는지 눈으로 볼 수 있게 한다. */
  reason: QueueReason
}

type RegionRow = {
  code: string
  tour_area_code: number
  tour_sigungu_code: number | null
}

const SELECT = 'code, tour_area_code, tour_sigungu_code'

function toTarget(row: RegionRow, reason: QueueReason): QueueTarget {
  return {
    code: row.code,
    areaCode: row.tour_area_code,
    sigunguCode: row.tour_sigungu_code,
    reason,
  }
}

/**
 * cron이 처리할 대상을 우선순위대로 고른다.
 *
 *   1순위  미적재            선적재 누락·실패분. 평소엔 비어 있다
 *   2순위  overview 부족     지역 페이지 본문 보강
 *   3순위  가장 오래된 갱신   항상 있으므로 일감이 마르지 않는다
 *
 * 3순위가 무한히 공급되는 것이 핵심이다. 적재가 끝나도 cron이 놀지 않고,
 * 그 쓰기가 Supabase 무료 플랜의 정지를 막는다.
 */
export async function selectQueue(
  admin: SupabaseClient,
  limit: number,
): Promise<QueueTarget[]> {
  const picked: QueueTarget[] = []
  const seen = new Set<string>()

  const take = (rows: RegionRow[] | null, reason: QueueReason) => {
    for (const row of rows ?? []) {
      if (picked.length >= limit) return
      if (seen.has(row.code)) continue
      seen.add(row.code)
      picked.push(toTarget(row, reason))
    }
  }

  // 1순위: 한 번도 적재되지 않은 지역. 실패가 적은 것부터 집는다.
  const pending = await admin
    .from('regions')
    .select(SELECT)
    .is('ingested_at', null)
    .order('attempt_count')
    .order('priority')
    .order('code')
    .limit(limit)
  if (pending.error) throw new Error(`큐 조회 실패(pending): ${pending.error.message}`)
  take(pending.data, 'pending')
  if (picked.length >= limit) return picked

  // 2순위: 적재는 됐지만 overview가 부족한 지역. 본문 길이가 여기 달려 있다.
  // overview_count는 markIngested가 채워 둔 값이라 조인 없이 바로 본다.
  const thin = await admin
    .from('regions')
    .select(SELECT)
    .not('ingested_at', 'is', null)
    .lt('overview_count', OVERVIEW_LIMIT)
    .lt('attempt_count', MAX_ATTEMPTS)
    .order('priority')
    .order('code')
    .limit(limit)
  if (thin.error) throw new Error(`큐 조회 실패(overview): ${thin.error.message}`)
  take(thin.data, 'overview')
  if (picked.length >= limit) return picked

  // 3순위: 가장 오래 안 건드린 지역부터 갱신. 실패가 잦은 지역은 뒤로 민다.
  const stale = await admin
    .from('regions')
    .select(SELECT)
    .not('ingested_at', 'is', null)
    .lt('attempt_count', MAX_ATTEMPTS)
    .order('refreshed_at', { nullsFirst: true })
    .order('priority')
    .limit(limit)
  if (stale.error) throw new Error(`큐 조회 실패(refresh): ${stale.error.message}`)
  take(stale.data, 'refresh')

  return picked
}
