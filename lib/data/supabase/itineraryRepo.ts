import { createSupabaseServerClient } from '@/lib/supabase/server'
import { sortItinerary } from '@/lib/itinerary/sort'
import type { ItineraryRepository } from '../repositories'
import type { ItineraryItem } from '../types'

type ItineraryRow = {
  id: string
  trip_id: string
  day: string
  at: string | null
  title: string
  memo: string
  created_at: string
}

function toItineraryItem(row: ItineraryRow): ItineraryItem {
  return {
    id: row.id,
    tripId: row.trip_id,
    day: row.day,
    // time 컬럼은 'HH:MM:SS'로 온다. 화면과 mock은 'HH:MM'을 쓴다.
    at: row.at ? row.at.slice(0, 5) : null,
    title: row.title,
    memo: row.memo,
    createdAt: row.created_at,
  }
}

/** title/memo의 CHECK 제약 위반이 postgrest로 넘어올 때의 SQLSTATE. */
const CHECK_VIOLATION = '23514'

/**
 * RPC를 거치지 않고 표를 직접 쓴다. 한 행이 곧 한 일정이라 함께 만들어져야 할
 * 짝이 없고(expenses↔expense_participants 같은 관계가 없다), 돈이 걸리지 않아
 * 확정 잠금과도 얽히지 않는다. 권한은 RLS 정책이 본다(supabase/schema.sql).
 */
export const supabaseItineraryRepo: ItineraryRepository = {
  async listByTrip(tripId) {
    const supabase = await createSupabaseServerClient()
    const { data, error } = await supabase
      .from('itinerary_items')
      .select('*')
      .eq('trip_id', tripId)
      .returns<ItineraryRow[]>()
    if (error) throw error
    // 정렬은 SQL에 맡기지 않는다. "시간 미정을 뒤로"는 nulls first/last 기본값이
    // 갈리기 쉬운 자리라, mock과 같은 순수 함수를 통과시켜 두 구현을 맞춘다.
    return sortItinerary(data.map(toItineraryItem))
  },

  async add(input) {
    const supabase = await createSupabaseServerClient()
    const { data, error } = await supabase
      .from('itinerary_items')
      .insert({
        trip_id: input.tripId,
        day: input.day,
        at: input.at,
        title: input.title,
        memo: input.memo,
      })
      .select('*')
      .single<ItineraryRow>()

    if (error) {
      // 앱(lib/itinerary/actions.ts)이 먼저 거르지만, 액션을 우회한 직접 호출은
      // DB 제약에 걸린다. 그 경우를 postgrest 오류 그대로 흘리지 않는다.
      if (error.code === CHECK_VIOLATION) {
        throw new Error('일정 내용이 너무 길거나 비어 있습니다.')
      }
      throw error
    }
    return toItineraryItem(data)
  },

  async remove(itemId) {
    const supabase = await createSupabaseServerClient()
    // 멤버가 아니면 정책이 0행을 지운다 — 오류가 아니라 조용한 무동작이다.
    // mock의 remove도 없는 id에 무동작이라 두 구현이 같다.
    const { error } = await supabase
      .from('itinerary_items')
      .delete()
      .eq('id', itemId)
    if (error) throw error
  },
}
