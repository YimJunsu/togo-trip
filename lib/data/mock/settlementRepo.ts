import seed from '@/mocks/settlements.json'
import type { SettlementRepository } from '../repositories'
import type { Settlement } from '../types'

const settlements = [...(seed as Settlement[])]

export const mockSettlementRepo: SettlementRepository = {
  async listByTrip(tripId) {
    return settlements.filter((s) => s.tripId === tripId)
  },
}
