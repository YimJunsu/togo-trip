import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mockAuthRepo as repo } from './authRepo.ts'

/** seed 계정 하나를 집어 온다. mocks/accounts.json의 첫 계정이다. */
async function anyUser() {
  return repo.signIn('junsu@togo.trip', 'togo1234')
}

test('seed 계정은 온보딩을 마친 상태다', async () => {
  const user = await anyUser()
  assert.notEqual(user.onboardedAt, null)
})

test('completeOnboarding은 생년월일과 완료 시각을 쓴다', async () => {
  const before = await anyUser()
  const after = await repo.completeOnboarding(before.id, '1999-12-31')

  assert.equal(after.birthDate, '1999-12-31')
  assert.notEqual(after.onboardedAt, null)
})

test('이미 완료한 사용자의 동의 시각은 덮어쓰지 않는다', async () => {
  const before = await anyUser()
  const first = await repo.completeOnboarding(before.id, '1999-12-31')
  const second = await repo.completeOnboarding(before.id, '1998-01-01')

  // 생년월일은 바뀌어도 동의 시각은 처음 것을 지킨다.
  assert.equal(second.birthDate, '1998-01-01')
  assert.equal(second.onboardedAt, first.onboardedAt)
})

test('없는 사용자면 던진다', async () => {
  await assert.rejects(() => repo.completeOnboarding('없는-아이디', '1999-12-31'))
})
