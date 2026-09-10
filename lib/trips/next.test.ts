import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { Trip } from '@/lib/data/types'
import { pickFeaturedTrip } from './next.ts'

function trip(id: string, startDate: string, endDate: string): Trip {
  return {
    id,
    name: id,
    region: '강원',
    startDate,
    endDate,
    inviteCode: 'ABC123',
    createdBy: 'u1',
    coverTheme: 'sea',
    driverDiscountRate: 0.2,
    settledAt: null,
  }
}

// 한국 시각 2026-09-10 08:00 = UTC 2026-09-09 23:00. 서버가 UTC로 돌 때
// 로컬 날짜로 자르면 하루 전으로 읽히는 시각을 일부러 고른다.
const TODAY = new Date('2026-09-09T23:00:00Z')

test('여행방이 없으면 null', () => {
  assert.equal(pickFeaturedTrip([], TODAY), null)
})

test('안 지난 여행 중 가장 가까운 것을 고른다', () => {
  const picked = pickFeaturedTrip(
    [
      trip('far', '2026-12-01', '2026-12-03'),
      trip('near', '2026-09-20', '2026-09-22'),
      trip('past', '2026-08-01', '2026-08-03'),
    ],
    TODAY,
  )
  assert.equal(picked?.id, 'near')
})

test('오늘이 여행 중이면 그 방이 먼저다', () => {
  const picked = pickFeaturedTrip(
    [
      trip('soon', '2026-09-20', '2026-09-22'),
      trip('now', '2026-09-08', '2026-09-11'),
    ],
    TODAY,
  )
  assert.equal(picked?.id, 'now')
})

test('오늘 끝나는 여행은 아직 지나지 않았다', () => {
  // 정산은 마지막 날 저녁에 한다. 이 경계가 밀리면 그날 홈에서 방이 사라진다.
  const picked = pickFeaturedTrip(
    [trip('lastDay', '2026-09-08', '2026-09-10')],
    TODAY,
  )
  assert.equal(picked?.id, 'lastDay')
})

test('전부 지난 여행이면 가장 최근에 다녀온 것', () => {
  const picked = pickFeaturedTrip(
    [
      trip('older', '2026-07-01', '2026-07-03'),
      trip('recent', '2026-08-01', '2026-08-03'),
    ],
    TODAY,
  )
  assert.equal(picked?.id, 'recent')
})

test('KST 자정을 기준으로 자른다', () => {
  // UTC로 자르면 이 시각은 아직 2026-09-09라 9/09에 끝난 여행이 "안 지난 여행"이
  // 되어 다가오는 여행을 밀어낸다.
  const picked = pickFeaturedTrip(
    [
      trip('endedYesterday', '2026-09-07', '2026-09-09'),
      trip('next', '2026-09-20', '2026-09-22'),
    ],
    TODAY,
  )
  assert.equal(picked?.id, 'next')
})
