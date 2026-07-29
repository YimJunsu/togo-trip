'use server'

// 클라이언트 컴포넌트는 '@/lib/data' 배럴을 직접 import하면 안 된다 —
// mockAuthRepo(→ node:crypto, seed 계정)까지 물고 있어 브라우저 번들에 실린다.
import { requireHost, requireMember } from '@/lib/auth/session'
import { expenseRepo, settlementRepo, tripRepo } from '@/lib/data'
import type { Settlement } from '@/lib/data/types'
import { settleTrip, type SettleResult } from '@/lib/settle/settle'
import { isSettlementParty } from '@/lib/settlements/party'

/** 계산에 필요한 입력을 모아 순수 함수에 넘긴다. 저장은 하지 않는다. */
async function calculate(tripId: string): Promise<SettleResult> {
  const trip = await tripRepo.get(tripId)
  if (!trip) throw new Error('여행방을 찾을 수 없습니다.')

  const [members, expenses] = await Promise.all([
    tripRepo.listMembers(tripId),
    expenseRepo.listByTrip(tripId),
  ])

  return settleTrip({
    members: members.map((m) => ({ userId: m.userId, isDriver: m.isDriver })),
    expenses: expenses.map((e) => ({
      payerId: e.payerId,
      amount: e.amount,
      participantIds: e.participantIds,
    })),
    driverDiscountRate: trip.driverDiscountRate,
  })
}

/**
 * 확정 전 미리보기. 되돌리기 어려운 조작 앞에 결과를 먼저 보여주기 위한 것이다.
 * 확정 화면도 같은 함수를 쓴다 — 부담 내역(shares)은 저장하지 않고 매번 계산한다.
 */
export async function previewSettlement(tripId: string): Promise<SettleResult> {
  await requireMember(tripId)
  return calculate(tripId)
}

export async function startSettlement(tripId: string): Promise<void> {
  await requireHost(tripId)
  const { transfers } = await calculate(tripId)
  await settlementRepo.settle(tripId, transfers)
}

export async function cancelSettlement(tripId: string): Promise<void> {
  await requireHost(tripId)
  await settlementRepo.unsettle(tripId)
}

export async function toggleSettlementPaid(
  tripId: string,
  settlementId: string,
  isPaid: boolean,
): Promise<Settlement> {
  const user = await requireMember(tripId)

  // 당사자만 토글한다. 남의 송금을 "보냈다"고 표시할 수 없어야 한다.
  const settlements = await settlementRepo.listByTrip(tripId)
  const target = settlements.find((s) => s.id === settlementId)
  if (!target) throw new Error('송금 항목을 찾을 수 없습니다.')
  if (!isSettlementParty(target, user.id)) {
    throw new Error('본인이 주고받는 송금만 표시할 수 있습니다.')
  }

  return settlementRepo.markPaid(settlementId, isPaid)
}
