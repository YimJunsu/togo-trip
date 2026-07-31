'use server'

// 클라이언트 컴포넌트는 데이터 계층을 직접 import하면 안 된다 — '@/lib/data' 배럴은
// mockAuthRepo(→ node:crypto, seed 계정)까지 함께 물고 있어 그대로 import하면 브라우저
// 번들에 실려 나간다. 여기서 한 겹 감싸 서버에서만 repo를 불러 쓰게 한다.
import { requireMember } from '@/lib/auth/session'
import { itineraryRepo, tripRepo } from '@/lib/data'
import type { AddItineraryItemInput } from '@/lib/data/repositories'
import type { ItineraryItem } from '@/lib/data/types'
import { MAX_MEMO_LENGTH, MAX_TITLE_LENGTH } from '@/lib/itinerary/limits'
import { listTripDays } from '@/lib/utils/days'

/** 'HH:MM'. 24시간제. */
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/

export async function addItineraryItem(
  input: AddItineraryItemInput,
): Promise<ItineraryItem> {
  await requireMember(input.tripId)

  const trip = await tripRepo.get(input.tripId)
  if (!trip) throw new Error('여행방을 찾을 수 없습니다.')

  // 여행 기간 밖의 날짜는 DB가 막지 못한다 — check 제약은 다른 표(trips)를 참조할
  // 수 없다. 화면은 기간 안의 날짜만 보여주지만 Server Action은 그 화면을 거치지
  // 않고 직접 불릴 수 있어, 유일하게 막을 수 있는 이 자리에서 본다.
  if (!listTripDays(trip.startDate, trip.endDate).includes(input.day)) {
    throw new Error('여행 기간 안의 날짜만 넣을 수 있습니다.')
  }

  if (input.at !== null && !TIME.test(input.at)) {
    throw new Error('시간은 HH:MM 형식이어야 합니다.')
  }

  // DB의 CHECK와 같은 규칙이다. 여기서 걸러야 사용자가 읽을 수 있는 문구로 돌아간다.
  const title = input.title.trim()
  if (!title) throw new Error('무엇을 할지 적어야 합니다.')
  if (title.length > MAX_TITLE_LENGTH) {
    throw new Error(`제목은 ${MAX_TITLE_LENGTH}자까지 넣을 수 있습니다.`)
  }

  const memo = input.memo.trim()
  if (memo.length > MAX_MEMO_LENGTH) {
    throw new Error(`메모는 ${MAX_MEMO_LENGTH}자까지 넣을 수 있습니다.`)
  }

  return itineraryRepo.add({ ...input, title, memo })
}

/**
 * tripId를 따로 받는 이유는 멤버십을 먼저 확인하기 위해서다. itemId만으로는
 * 어느 방의 일정인지 알기 전에 게이트를 통과시킬 수 없다. (removeExpense와 같은 꼴)
 */
export async function removeItineraryItem(
  tripId: string,
  itemId: string,
): Promise<void> {
  await requireMember(tripId)

  const items = await itineraryRepo.listByTrip(tripId)
  if (!items.some((i) => i.id === itemId)) {
    throw new Error('이 여행방의 일정이 아닙니다.')
  }

  await itineraryRepo.remove(itemId)
}
