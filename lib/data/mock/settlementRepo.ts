import { TripAlreadySettledError, type SettlementRepository } from '../repositories'
import type { Settlement } from '../types'
import { findTrip, store } from './store'

export const mockSettlementRepo: SettlementRepository = {
  async listByTrip(tripId) {
    // supabaseSettlementRepo.listByTrip()이 amount desc로 정렬한다(schema.sql 밖,
    // 쿼리 자체의 .order) — 두 구현이 같은 순서를 내야 NEXT_PUBLIC_DATA_SOURCE
    // 스위치가 화면을 바꾸지 않는다. store를 직접 정렬하면 다른 mock repo가 보는
    // 순서까지 흔들리므로 복사본을 정렬한다.
    return store.settlements
      .filter((s) => s.tripId === tripId)
      .slice()
      .sort((a, b) => b.amount - a.amount)
  },

  async settle(tripId, transfers) {
    const trip = findTrip(tripId)
    if (!trip) throw new Error('여행방을 찾을 수 없습니다.')
    if (trip.settledAt) throw new TripAlreadySettledError()

    const members = store.members.filter((m) => m.tripId === tripId)
    const isMember = (id: string) => members.some((m) => m.userId === id)
    // 방 밖의 사람에게 빚을 지우거나 돈을 받게 할 수 없다.
    if (!transfers.every((t) => isMember(t.from) && isMember(t.to))) {
      throw new Error('송금 대상은 모두 이 여행방의 멤버여야 합니다.')
    }

    const created: Settlement[] = transfers.map((transfer, i) => ({
      id: `stl-${Date.now()}-${i}`,
      tripId,
      from: transfer.from,
      to: transfer.to,
      amount: transfer.amount,
      isPaid: false,
    }))
    store.settlements.push(...created)
    trip.settledAt = new Date().toISOString()
  },

  async unsettle(tripId) {
    const trip = findTrip(tripId)
    if (!trip) throw new Error('여행방을 찾을 수 없습니다.')
    if (!trip.settledAt) return

    store.settlements = store.settlements.filter((s) => s.tripId !== tripId)
    trip.settledAt = null
  },

  async markPaid(settlementId, isPaid) {
    const settlement = store.settlements.find((s) => s.id === settlementId)
    if (!settlement) throw new Error('송금 항목을 찾을 수 없습니다.')
    settlement.isPaid = isPaid
    return settlement
  },
}
