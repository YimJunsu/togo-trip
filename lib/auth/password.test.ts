import { test } from 'node:test'
import assert from 'node:assert/strict'
import { hashPassword, hashPasswordSync, verifyPassword } from './password.ts'

test('해시는 salt:hash 형태이고 평문을 담지 않는다', async () => {
  const stored = await hashPassword('togo1234')
  const [salt, hash] = stored.split(':')
  assert.match(salt, /^[0-9a-f]{32}$/)
  assert.match(hash, /^[0-9a-f]{128}$/)
  assert.ok(!stored.includes('togo1234'))
})

test('같은 비밀번호라도 매번 다른 해시가 나온다', async () => {
  const a = await hashPassword('togo1234')
  const b = await hashPassword('togo1234')
  assert.notEqual(a, b)
})

test('맞는 비밀번호는 통과한다', async () => {
  const stored = await hashPassword('togo1234')
  assert.equal(await verifyPassword('togo1234', stored), true)
})

test('틀린 비밀번호는 막는다', async () => {
  const stored = await hashPassword('togo1234')
  assert.equal(await verifyPassword('togo12345', stored), false)
  assert.equal(await verifyPassword('', stored), false)
})

test('망가진 저장값에 던지지 않고 false를 준다', async () => {
  assert.equal(await verifyPassword('togo1234', 'garbage'), false)
  assert.equal(await verifyPassword('togo1234', ''), false)
  assert.equal(await verifyPassword('togo1234', 'aabb:zzzz'), false)
})

test('동기 해시도 같은 형식이고 검증을 통과한다', async () => {
  const stored = hashPasswordSync('togo1234')
  assert.match(stored, /^[0-9a-f]{32}:[0-9a-f]{128}$/)
  assert.equal(await verifyPassword('togo1234', stored), true)
  assert.equal(await verifyPassword('nope', stored), false)
})
