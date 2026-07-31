import { test } from 'node:test'
import assert from 'node:assert/strict'
import { sortItinerary } from './sort.ts'

/** 정렬 키만 담은 최소 항목. 어느 순서로 나오는지는 title로 확인한다. */
function item(
  title: string,
  day: string,
  at: string | null,
  createdAt = '2026-01-01T00:00:00.000Z',
) {
  return { title, day, at, createdAt }
}

const titles = (items: { title: string }[]) => items.map((i) => i.title)

test('날짜가 이른 것이 앞이다', () => {
  const sorted = sortItinerary([
    item('둘째날', '2026-08-11', '09:00'),
    item('첫날', '2026-08-10', '09:00'),
  ])
  assert.deepEqual(titles(sorted), ['첫날', '둘째날'])
})

test('같은 날은 시간이 이른 것이 앞이다', () => {
  const sorted = sortItinerary([
    item('저녁', '2026-08-10', '19:00'),
    item('아침', '2026-08-10', '08:00'),
    item('점심', '2026-08-10', '12:30'),
  ])
  assert.deepEqual(titles(sorted), ['아침', '점심', '저녁'])
})

test('시간을 안 정한 일정은 그날 맨 뒤로 간다', () => {
  const sorted = sortItinerary([
    item('미정', '2026-08-10', null),
    item('아침', '2026-08-10', '08:00'),
  ])
  assert.deepEqual(titles(sorted), ['아침', '미정'])
})

test('시간 미정이라도 다음 날보다는 앞이다', () => {
  const sorted = sortItinerary([
    item('둘째날 아침', '2026-08-11', '08:00'),
    item('첫날 미정', '2026-08-10', null),
  ])
  assert.deepEqual(titles(sorted), ['첫날 미정', '둘째날 아침'])
})

test('시간이 같으면 먼저 넣은 것이 앞이다', () => {
  const sorted = sortItinerary([
    item('나중에 넣음', '2026-08-10', '09:00', '2026-07-31T02:00:00.000Z'),
    item('먼저 넣음', '2026-08-10', '09:00', '2026-07-31T01:00:00.000Z'),
  ])
  assert.deepEqual(titles(sorted), ['먼저 넣음', '나중에 넣음'])
})

test('둘 다 시간 미정이면 먼저 넣은 것이 앞이다', () => {
  const sorted = sortItinerary([
    item('나중', '2026-08-10', null, '2026-07-31T02:00:00.000Z'),
    item('먼저', '2026-08-10', null, '2026-07-31T01:00:00.000Z'),
  ])
  assert.deepEqual(titles(sorted), ['먼저', '나중'])
})

test('원본 배열을 건드리지 않는다', () => {
  const original = [
    item('둘째날', '2026-08-11', '09:00'),
    item('첫날', '2026-08-10', '09:00'),
  ]
  sortItinerary(original)
  assert.deepEqual(titles(original), ['둘째날', '첫날'])
})
