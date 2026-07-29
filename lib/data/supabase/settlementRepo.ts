import { createSupabaseServerClient } from '@/lib/supabase/server'
import { TripAlreadySettledError, type SettlementRepository } from '../repositories'
import type { Settlement } from '../types'

type SettlementRow = {
  id: string
  trip_id: string
  from_user_id: string
  to_user_id: string
  amount: number
  is_paid: boolean
}

function toSettlement(row: SettlementRow): Settlement {
  return {
    id: row.id,
    tripId: row.trip_id,
    from: row.from_user_id,
    to: row.to_user_id,
    amount: row.amount,
    isPaid: row.is_paid,
  }
}

/** postgrest가 .single()에서 0행/다행일 때 주는 코드. "찾을 수 없음"으로 좁힌다. */
const NO_ROW = 'PGRST116'

export const supabaseSettlementRepo: SettlementRepository = {
  async listByTrip(tripId) {
    const supabase = await createSupabaseServerClient()
    const { data, error } = await supabase
      .from('settlements')
      .select('*')
      .eq('trip_id', tripId)
      .order('amount', { ascending: false })
      .returns<SettlementRow[]>()
    if (error) throw error
    return data.map(toSettlement)
  },

  async settle(tripId, transfers) {
    const supabase = await createSupabaseServerClient()

    // 송금 기록과 잠금이 한 트랜잭션이어야 한다. RLS 정책으로는 쪼개지므로 RPC.
    const { error } = await supabase.rpc('settle_trip', {
      check_trip_id: tripId,
      transfers,
    })
    if (error) {
      if (error.message.includes('TRIP_ALREADY_SETTLED')) {
        throw new TripAlreadySettledError()
      }
      // mock(lib/data/mock/settlementRepo.ts)의 같은 상황 메시지에 맞춘다.
      if (error.message.includes('TRIP_NOT_FOUND')) {
        throw new Error('여행방을 찾을 수 없습니다.')
      }
      if (error.message.includes('NOT_TRIP_MEMBER')) {
        throw new Error('송금 대상은 모두 이 여행방의 멤버여야 합니다.')
      }
      throw error
    }

    return this.listByTrip(tripId)
  },

  async unsettle(tripId) {
    const supabase = await createSupabaseServerClient()
    const { error } = await supabase.rpc('unsettle_trip', {
      check_trip_id: tripId,
    })
    // 이미 풀려 있으면 할 일이 없다. 취소 버튼을 두 번 눌러도 실패하지 않아야 한다.
    if (error && !error.message.includes('TRIP_NOT_SETTLED')) throw error
  },

  async markPaid(settlementId, isPaid) {
    const supabase = await createSupabaseServerClient()
    const { data, error } = await supabase
      .from('settlements')
      .update({ is_paid: isPaid, paid_at: isPaid ? new Date().toISOString() : null })
      .eq('id', settlementId)
      .select('*')
      .single<SettlementRow>()
    if (error) {
      // 당사자만 고칠 수 있다는 정책(schema.sql)에 걸리면 갱신 대상이 0행이 되고,
      // .single()이 이를 "행을 못 찾음"으로 보고한다 — mock의 not-found 메시지로 맞춘다.
      if (error.code === NO_ROW) {
        throw new Error('송금 항목을 찾을 수 없습니다.')
      }
      throw error
    }
    return toSettlement(data)
  },
}
