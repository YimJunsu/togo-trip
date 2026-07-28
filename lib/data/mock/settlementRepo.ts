import { TripAlreadySettledError, type SettlementRepository } from '../repositories'
import type { Settlement } from '../types'
import { findTrip, store } from './store'

export const mockSettlementRepo: SettlementRepository = {
  async listByTrip(tripId) {
    return store.settlements.filter((s) => s.tripId === tripId)
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
    return created
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
