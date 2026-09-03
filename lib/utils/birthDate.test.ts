import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  clampDay,
  daysInMonth,
  indexFromScroll,
  selectableYears,
  toIso,
} from './birthDate.ts'

test('daysInMonth은 달마다 다른 일수를 낸다', () => {
  assert.equal(daysInMonth(2001, 1), 31)
  assert.equal(daysInMonth(2001, 4), 30)
  assert.equal(daysInMonth(2001, 12), 31)
})

test('daysInMonth의 2월은 윤년 규칙을 따른다', () => {
  assert.equal(daysInMonth(2001, 2), 28)
  assert.equal(daysInMonth(2004, 2), 29)
  // 100의 배수는 윤년이 아니고, 그중 400의 배수는 다시 윤년이다.
  assert.equal(daysInMonth(1900, 2), 28)
  assert.equal(daysInMonth(2000, 2), 29)
})

test('clampDay는 사라진 날짜를 그 달의 마지막 날로 당긴다', () => {
  assert.equal(clampDay(2001, 2, 31), 28)
  assert.equal(clampDay(2004, 2, 31), 29)
  assert.equal(clampDay(2001, 4, 31), 30)
})

test('clampDay는 유효한 날짜를 건드리지 않는다', () => {
  assert.equal(clampDay(2001, 5, 19), 19)
  assert.equal(clampDay(2001, 1, 31), 31)
})

test('indexFromScroll은 가장 가까운 항목으로 반올림한다', () => {
  assert.equal(indexFromScroll(0, 40, 10), 0)
  assert.equal(indexFromScroll(40, 40, 10), 1)
  // 절반을 넘어야 다음 항목이 된다.
  assert.equal(indexFromScroll(59, 40, 10), 1)
  assert.equal(indexFromScroll(61, 40, 10), 2)
})

test('indexFromScroll은 범위 밖을 잘라 낸다', () => {
  // iOS의 고무줄 스크롤은 음수 scrollTop을 만든다.
  assert.equal(indexFromScroll(-120, 40, 10), 0)
  assert.equal(indexFromScroll(9999, 40, 10), 9)
})

test('indexFromScroll은 항목이 없어도 터지지 않는다', () => {
  assert.equal(indexFromScroll(80, 40, 0), 0)
  assert.equal(indexFromScroll(80, 0, 10), 0)
})

test('toIso는 한 자리 월·일을 채운다', () => {
  assert.equal(toIso(2001, 5, 19), '2001-05-19')
  assert.equal(toIso(1995, 12, 31), '1995-12-31')
  assert.equal(toIso(2000, 1, 1), '2000-01-01')
})

test('selectableYears는 만 14세가 되는 해부터 최신순으로 낸다', () => {
  const years = selectableYears(new Date('2026-09-03T00:00:00'))

  assert.equal(years[0], 2012)
  assert.equal(years[1], 2011)
  assert.ok(years.length > 100, '100년 넘게 거슬러 갈 수 있어야 한다')
  // 목록이 최신순이라 휠 위쪽이 최근이다.
  assert.ok(years[0] > years[years.length - 1])
})

test('selectableYears에는 만 14세 미만이 될 연도가 없다', () => {
  const years = selectableYears(new Date('2026-09-03T00:00:00'))

  assert.equal(
    years.includes(2013),
    false,
    '2013년생은 2026년에 만 13세라 목록에 없어야 한다',
  )
})
