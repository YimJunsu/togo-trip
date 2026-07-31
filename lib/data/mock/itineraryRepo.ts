import { sortItinerary } from '@/lib/itinerary/sort'
import type { ItineraryRepository } from '../repositories'
import type { ItineraryItem } from '../types'
import { store } from './store'

/**
 * 확정 여부를 보지 않는다. 일정은 돈 계산의 입력이 아니라 확정된 방에서도
 * 계속 고칠 수 있다 — Supabase 쪽 RLS도 확정 조건 없이 멤버십만 본다.
 */
export const mockItineraryRepo: ItineraryRepository = {
  async listByTrip(tripId) {
    return sortItinerary(store.itineraryItems.filter((i) => i.tripId === tripId))
  },

  async add(input) {
    const itineraryItem: ItineraryItem = {
      ...input,
      id: `itn-${Date.now()}`,
      createdAt: new Date().toISOString(),
    }
    store.itineraryItems.push(itineraryItem)
    return itineraryItem
  },

  async remove(itemId) {
    const index = store.itineraryItems.findIndex((i) => i.id === itemId)
    if (index === -1) return
    store.itineraryItems.splice(index, 1)
  },
}
