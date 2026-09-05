import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createPendingAccount, mockAuthRepo as repo } from './authRepo.ts'

/**
 * 동의 시각은 밀리초 해상도다. 두 번의 completeOnboarding이 같은 밀리초 안에서
 * 끝나면 시각을 덮어써도 문자열이 같아, "덮어쓰지 않는다"는 테스트가 통과해 버린다.
 * 실제로 ??= 를 = 로 바꾸는 변이가 이것 때문에 잡히지 않았다. 시계를 넘겨 놓고 잰다.
 */
function tick() {
  return new Promise((resolve) => setTimeout(resolve, 5))
}

let pendingSeq = 0
/** 구글로 막 인증한 사람. 이메일이 겹치면 계정이 쌓여 테스트끼리 간섭한다. */
function pending() {
  pendingSeq += 1
  return createPendingAccount({
    name: 'JUN DEV',
    email: `pending${pendingSeq}@togo.trip`,
  })
}

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
  await tick()
  const second = await repo.completeOnboarding(before.id, '1998-01-01')

  // 생년월일은 바뀌어도 동의 시각은 처음 것을 지킨다.
  assert.equal(second.birthDate, '1998-01-01')
  assert.equal(second.onboardedAt, first.onboardedAt)
})

test('없는 사용자면 던진다', async () => {
  await assert.rejects(() => repo.completeOnboarding('없는-아이디', '1999-12-31'))
})

test('OAuth로 막 인증한 계정은 온보딩 전이다', () => {
  const user = pending()

  assert.equal(user.onboardedAt, null)
  assert.equal(user.provider, 'google')
  // 구글이 주지 않는 값들이다. 온보딩과 이후 화면에서 채운다.
  assert.equal(user.birthDate, '')
  assert.equal(user.phone, '')
})

test('completeOnboarding이 null인 동의 시각을 처음으로 찍는다', async () => {
  // 이 기능의 핵심 전환이다. 위쪽 테스트들은 seed 계정이 이미 완료 상태라
  // 이 경로를 한 번도 밟지 못했다.
  const before = pending()
  assert.equal(before.onboardedAt, null)

  const after = await repo.completeOnboarding(before.id, '2001-05-19')

  assert.equal(after.birthDate, '2001-05-19')
  assert.notEqual(after.onboardedAt, null)
  assert.ok(
    !Number.isNaN(Date.parse(after.onboardedAt as string)),
    '동의 시각이 파싱 가능한 시각이어야 한다',
  )
})

test('온보딩 전이던 계정도 두 번째 호출에서는 첫 동의 시각을 지킨다', async () => {
  const user = pending()
  const first = await repo.completeOnboarding(user.id, '2001-05-19')
  await tick()
  const second = await repo.completeOnboarding(user.id, '1998-01-01')

  assert.equal(second.birthDate, '1998-01-01')
  assert.equal(second.onboardedAt, first.onboardedAt)
})

test('온보딩을 마쳐도 OAuth 계정은 비밀번호로 로그인할 수 없다', async () => {
  const user = pending()
  await repo.completeOnboarding(user.id, '2001-05-19')

  // 비밀번호가 없는 계정이다. 빈 문자열이 통과하면 누구나 들어올 수 있다.
  await assert.rejects(() => repo.signIn(user.email, ''))
  await assert.rejects(() => repo.signIn(user.email, 'togo1234'))
})
