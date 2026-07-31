import { createSupabaseServerClient } from '@/lib/supabase/server'
import { TripAlreadySettledError, type ExpenseRepository } from '../repositories'
import type { Expense } from '../types'

type ExpenseRow = {
  id: string
  trip_id: string
  payer_id: string
  amount: number
  description: string
  category: string
  created_at: string
  expense_participants: { user_id: string }[]
}

/** 조인 결과를 UI 계약(participantIds: string[])으로 되돌린다. */
function toExpense(row: ExpenseRow): Expense {
  return {
    id: row.id,
    tripId: row.trip_id,
    payerId: row.payer_id,
    amount: row.amount,
    description: row.description,
    category: row.category,
    participantIds: row.expense_participants.map((p) => p.user_id),
    createdAt: row.created_at,
  }
}

/** amount/description의 CHECK 제약 위반이 postgrest로 넘어올 때의 SQLSTATE. */
const CHECK_VIOLATION = '23514'

export const supabaseExpenseRepo: ExpenseRepository = {
  async listByTrip(tripId) {
    const supabase = await createSupabaseServerClient()
    const { data, error } = await supabase
      .from('expenses')
      .select('*, expense_participants(user_id)')
      .eq('trip_id', tripId)
      .order('created_at')
      .returns<ExpenseRow[]>()
    if (error) throw error
    return data.map(toExpense)
  },

  async add(input) {
    const supabase = await createSupabaseServerClient()

    // expenses에는 INSERT 정책이 없다. 지출 생성 + 참여자 등록을 한 트랜잭션으로
    // 묶는 add_expense RPC로만 쓸 수 있다(supabase/schema.sql 12번 섹션) — 따로
    // 두 번 왕복하면 그 사이 실패가 참여자 0명짜리 유령 지출을 남길 수 있어서다.
    const { data, error } = await supabase.rpc('add_expense', {
      check_trip_id: input.tripId,
      check_payer_id: input.payerId,
      check_amount: input.amount,
      check_description: input.description,
      check_category: input.category,
      participant_ids: input.participantIds,
    })
    if (error) {
      if (error.message.includes('TRIP_ALREADY_SETTLED')) {
        throw new TripAlreadySettledError()
      }
      if (error.message.includes('NOT_TRIP_MEMBER')) {
        throw new Error('이 여행방의 멤버가 아닙니다.')
      }
      if (error.message.includes('NO_PARTICIPANTS')) {
        throw new Error('나눠 낼 사람은 최소 1명 이상이어야 합니다.')
      }
      // amount > 0, description 공백 아님은 named 예외가 아니라 표의 CHECK 제약이라
      // 이름 없는 23514로 온다. 그대로 던지면 사용자에게 안 보이는 코드만 남는다.
      if (error.code === CHECK_VIOLATION) {
        throw new Error('금액 또는 설명이 올바르지 않습니다.')
      }
      throw error
    }

    // RPC는 새 지출의 id만 돌려준다(uuid). 화면이 바로 쓸 Expense 모양(참여자 조인 포함)은
    // 그 id로 다시 조회해서 만든다 — listByTrip과 매핑 지점을 하나로 유지한다.
    const expenseId = data as string
    const created = await supabase
      .from('expenses')
      .select('*, expense_participants(user_id)')
      .eq('id', expenseId)
      .single<ExpenseRow>()
    if (created.error) throw created.error
    return toExpense(created.data)
  },

  async remove(expenseId) {
    const supabase = await createSupabaseServerClient()

    // expenses에는 DELETE 정책이 없다. 확정 여부 확인과 삭제가 한 트랜잭션이어야
    // 하므로 remove_expense RPC로만 지운다(supabase/schema.sql 12번 섹션) — 정책
    // 시절엔 `not is_trip_settled`가 stable 스냅샷이라 settle_trip 커밋과 겹치면
    // 확정된 송금 리스트에 반영된 지출이 사라지고 되살릴 길이 없었다.
    //
    // RPC는 지워진 행 수를 돌려주지 않는다. 없는 지출도 조용히 성공이라 정책 시절의
    // "0행이면 원인을 되짚는" 되읽기가 필요 없어졌다 — 확정 잠금은 named 예외로 온다.
    const { error } = await supabase.rpc('remove_expense', {
      check_expense_id: expenseId,
    })
    if (error) {
      if (error.message.includes('TRIP_ALREADY_SETTLED')) {
        throw new TripAlreadySettledError()
      }
      if (error.message.includes('NOT_TRIP_MEMBER')) {
        throw new Error('이 여행방의 멤버가 아닙니다.')
      }
      throw error
    }
  },
}
