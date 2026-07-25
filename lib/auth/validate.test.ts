import { test } from 'node:test'
import assert from 'node:assert/strict'
import { normalizePhone, validateSignUp } from './validate.ts'

const TODAY = new Date('2026-07-21T00:00:00Z')

const VALID = {
  name: '임준수',
  email: 'junsu@togo.trip',
  password: 'togo1234',
  passwordConfirm: 'togo1234',
  phone: '010-1234-5678',
  birthDate: '1995-03-14',
}

test('올바른 입력에는 에러가 없다', () => {
  assert.deepEqual(validateSignUp(VALID, TODAY), {})
})

test('이름은 공백만으로 채울 수 없다', () => {
  assert.equal(
    validateSignUp({ ...VALID, name: '   ' }, TODAY).name,
    '이름을 입력하세요.',
  )
})

test('이메일 형식을 본다', () => {
  assert.ok(validateSignUp({ ...VALID, email: 'junsu' }, TODAY).email)
  assert.ok(validateSignUp({ ...VALID, email: 'junsu@' }, TODAY).email)
  assert.ok(validateSignUp({ ...VALID, email: 'a b@c.d' }, TODAY).email)
})

test('비밀번호는 8자 이상', () => {
  assert.ok(validateSignUp({ ...VALID, password: 'togo123' }, TODAY).password)
  assert.equal(
    validateSignUp({ ...VALID, password: 'togo1234' }, TODAY).password,
    undefined,
  )
})

test('비밀번호 확인이 다르면 에러', () => {
  assert.ok(
    validateSignUp({ ...VALID, passwordConfirm: 'togo9999' }, TODAY)
      .passwordConfirm,
  )
  assert.equal(
    validateSignUp({ ...VALID, passwordConfirm: 'togo1234' }, TODAY)
      .passwordConfirm,
    undefined,
  )
})

test('전화번호는 숫자 10~11자리', () => {
  assert.equal(
    validateSignUp({ ...VALID, phone: '01012345678' }, TODAY).phone,
    undefined,
  )
  assert.equal(
    validateSignUp({ ...VALID, phone: '02-1234-5678' }, TODAY).phone,
    undefined,
  )
  assert.ok(validateSignUp({ ...VALID, phone: '010-1234' }, TODAY).phone)
  assert.ok(validateSignUp({ ...VALID, phone: '010-1234-56789' }, TODAY).phone)
  assert.ok(
    validateSignUp({ ...VALID, phone: '０１０１２３４５６７８' }, TODAY).phone,
  )
})

test('생년월일은 유효한 날짜여야 하고 미래일 수 없다', () => {
  assert.ok(
    validateSignUp({ ...VALID, birthDate: '2026-07-22' }, TODAY).birthDate,
  )
  assert.ok(
    validateSignUp({ ...VALID, birthDate: '1995-02-30' }, TODAY).birthDate,
  )
  assert.ok(validateSignUp({ ...VALID, birthDate: '' }, TODAY).birthDate)
  assert.equal(
    validateSignUp({ ...VALID, birthDate: '2026-07-21' }, TODAY).birthDate,
    undefined,
  )
})

test('여러 필드가 동시에 틀리면 모두 보고한다', () => {
  const errors = validateSignUp(
    { ...VALID, name: '', password: 'x', passwordConfirm: 'x' },
    TODAY,
  )
  assert.equal(Object.keys(errors).length, 2)
})

test('normalizePhone은 숫자만 남긴다', () => {
  assert.equal(normalizePhone('010-1234-5678'), '01012345678')
  assert.equal(normalizePhone(' 010 1234 5678 '), '01012345678')
})
