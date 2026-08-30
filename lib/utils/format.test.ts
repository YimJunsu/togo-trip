import { test } from 'node:test'
import assert from 'node:assert/strict'
import { formatDate, formatDateTime, formatWon } from './format.ts'

// 시간대를 일부러 KST가 아닌 곳으로 돌려놓는다. 개발 PC가 이미 Asia/Seoul이면
// timeZone 고정을 지워도 테스트가 통과해 버려서, 정작 잡아야 할 버그를 못 잡는다.
// formatDateTime은 호출 시점에 포매터를 만들므로 여기서 바꿔도 반영된다.
process.env.TZ = 'America/New_York'

test('formatDateTime은 프로세스 시간대와 무관하게 KST를 낸다', () => {
  // Vercel 함수는 UTC로 돈다. getHours()를 쓰면 KST 03:00 cron이 전날 18:00으로
  // 표시된다 — 실제로 났던 버그다.
  assert.equal(formatDateTime('2026-08-12T18:00:00.000Z'), '2026.08.13 03:00')
})

test('formatDateTime은 날짜 경계를 넘지 않는 시각도 맞게 낸다', () => {
  assert.equal(formatDateTime('2026-08-13T05:30:00.000Z'), '2026.08.13 14:30')
})

test('formatDateTime은 자정과 정오를 24시간제로 낸다', () => {
  // hourCycle을 잘못 잡으면 자정이 24:00으로 나온다.
  assert.equal(formatDateTime('2026-08-12T15:00:00.000Z'), '2026.08.13 00:00')
  assert.equal(formatDateTime('2026-08-13T03:00:00.000Z'), '2026.08.13 12:00')
})

test('formatDate는 국내 포맷이다', () => {
  assert.equal(formatDate('2026-08-13'), '2026.08.13')
})

test('formatWon은 세 자리마다 끊고 원을 붙인다', () => {
  assert.equal(formatWon(1234567), '1,234,567원')
})
