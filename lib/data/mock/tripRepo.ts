import {
  InvalidInviteCodeError,
  TripAlreadySettledError,
  type TripRepository,
} from '../repositories'
import type { Trip } from '../types'
import { findTrip, store } from './store'

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
    // 이미 정산이 끝난 방에 새 사람이 들어오면 확정된 금액의 전제가 깨진다.
    if (trip.settledAt) throw new TripAlreadySettledError()

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

  async setDriver(tripId, userId, isDriver) {
    const trip = findTrip(tripId)
    if (!trip) throw new InvalidInviteCodeError()
    if (trip.settledAt) throw new TripAlreadySettledError()

    const member = store.members.find(
      (m) => m.tripId === tripId && m.userId === userId,
    )
    if (!member) throw new Error('이 여행방의 멤버가 아닙니다.')
    member.isDriver = isDriver

    return store.members.filter((m) => m.tripId === tripId)
  },

  async setDiscountRate(tripId, rate) {
    const trip = findTrip(tripId)
    if (!trip) throw new InvalidInviteCodeError()
    if (trip.settledAt) throw new TripAlreadySettledError()
    if (!Number.isFinite(rate) || rate < 0 || rate > 0.5) {
      throw new Error('할인율은 0% ~ 50% 사이여야 합니다.')
    }
    trip.driverDiscountRate = rate
    return trip
  },
}
