import type { SettlementRepository } from '../repositories'
import { store } from './store'

export const mockSettlementRepo: SettlementRepository = {
  async listByTrip(tripId) {
    return store.settlements.filter((s) => s.tripId === tripId)
  },
}
