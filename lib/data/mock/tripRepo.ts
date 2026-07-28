import { InvalidInviteCodeError, type TripRepository } from '../repositories'
import type { Trip } from '../types'
import { store } from './store'

const INVITE_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const INVITE_CODE_LENGTH = 6

/** 헷갈리는 글자(0/O, 1/I)를 뺀 6자리. 입 밖으로 불러줄 수 있어야 한다. */
function generateInviteCode(): string {
  return Array.from(
    { length: INVITE_CODE_LENGTH },
    () =>
      INVITE_CODE_ALPHABET[
        Math.floor(Math.random() * INVITE_CODE_ALPHABET.length)
      ],
  ).join('')
}

export const mockTripRepo: TripRepository = {
  async list(userId) {
    const mine = store.members
      .filter((m) => m.userId === userId)
      .map((m) => m.tripId)
    return store.trips.filter((t) => mine.includes(t.id))
  },

  async get(id) {
    return store.trips.find((t) => t.id === id) ?? null
  },

  async create(userId, displayName, input) {
    const trip: Trip = {
      ...input,
      id: `trp-${Date.now()}`,
      inviteCode: generateInviteCode(),
      createdBy: userId,
      driverDiscountRate: 0.2,
      settledAt: null,
    }
    store.trips.push(trip)
    store.members.push({
      tripId: trip.id,
      userId,
      displayName,
      role: 'host',
      isDriver: false,
    })
    return trip
  },

  async joinByCode(userId, displayName, code) {
    const trip = store.trips.find(
      (t) => t.inviteCode.toUpperCase() === code.trim().toUpperCase(),
    )
    if (!trip) throw new InvalidInviteCodeError()

    // 이미 들어와 있으면 다시 넣지 않는다. 두 번 눌러도 멤버가 겹치지 않는다.
    const already = store.members.some(
      (m) => m.tripId === trip.id && m.userId === userId,
    )
    if (!already) {
      store.members.push({
        tripId: trip.id,
        userId,
        displayName,
        role: 'member',
        isDriver: false,
      })
    }
    return trip
  },

  async listMembers(tripId) {
    return store.members.filter((m) => m.tripId === tripId)
  },
}
