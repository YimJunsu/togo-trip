import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  PENDING_ACCOUNT_RETENTION_HOURS,
  PENDING_ACCOUNT_RETENTION_TEXT,
  pendingCutoff,
} from './retention.ts'

test('pendingCutoff는 정확히 보관 시간만큼 앞선 시각을 낸다', () => {
  const now = new Date('2026-09-04T12:00:00.000Z')
  assert.equal(pendingCutoff(now), '2026-09-03T12:00:00.000Z')
})

test('pendingCutoff는 날짜와 달 경계를 넘어간다', () => {
  assert.equal(
    pendingCutoff(new Date('2026-01-01T05:00:00.000Z')),
    '2025-12-31T05:00:00.000Z',
  )
})

test('pendingCutoff는 시간대와 무관하게 같은 값을 낸다', () => {
  // 서머타임이 있는 지역에서 로컬 시간으로 계산하면 하루가 23시간이나 25시간이 된다.
  // UTC 밀리초로만 빼므로 그 영향을 받지 않아야 한다.
  const springForward = new Date('2026-03-08T10:30:00.000Z')
  const expected = new Date(
    springForward.getTime() - PENDING_ACCOUNT_RETENTION_HOURS * 3600_000,
  ).toISOString()
  assert.equal(pendingCutoff(springForward), expected)
})

test('방침 문구가 실제 보관 시간과 같은 숫자를 쓴다', () => {
  // 이 둘이 갈라지면 방침 화면이 지키지 않는 기간을 약속하게 된다.
  assert.equal(
    PENDING_ACCOUNT_RETENTION_TEXT,
    `${PENDING_ACCOUNT_RETENTION_HOURS}시간`,
  )
})
