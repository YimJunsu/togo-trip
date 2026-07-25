import { test } from 'node:test'
import assert from 'node:assert/strict'
import { ageOn, normalizePhone, validateSignUp } from './validate.ts'

const TODAY = new Date('2026-07-21T00:00:00Z')

const VALID = {
  name: '임준수',
  email: 'junsu@togo.trip',
  password: 'togo1234',
  passwordConfirm: 'togo1234',
  phone: '010-1234-5678',
  birthDate: '1995-03-14',
  agreeTerms: true,
  agreePrivacy: true,
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
})

test('만 나이는 생일이 지났는지까지 따진다', () => {
  // 연도만 빼면 둘 다 14로 세어 경계에서 틀린다.
  assert.equal(ageOn('2012-07-21', TODAY), 14) // 생일 당일
  assert.equal(ageOn('2012-07-22', TODAY), 13) // 생일 하루 전
  assert.equal(ageOn('2012-01-01', TODAY), 14)
  assert.equal(ageOn('2012-12-31', TODAY), 13)
})

test('만 14세 미만은 가입할 수 없다', () => {
  // 생일이 지나 만 14세가 된 날은 통과한다.
  assert.equal(
    validateSignUp({ ...VALID, birthDate: '2012-07-21' }, TODAY).birthDate,
    undefined,
  )
  // 하루 차이로 아직 13세면 막는다.
  assert.ok(validateSignUp({ ...VALID, birthDate: '2012-07-22' }, TODAY).birthDate)
  // 오늘 태어난 사람도 당연히 막힌다.
  assert.ok(validateSignUp({ ...VALID, birthDate: '2026-07-21' }, TODAY).birthDate)
})

test('필수 동의를 빠뜨리면 가입할 수 없다', () => {
  assert.ok(validateSignUp({ ...VALID, agreeTerms: false }, TODAY).agreeTerms)
  assert.ok(
    validateSignUp({ ...VALID, agreePrivacy: false }, TODAY).agreePrivacy,
  )
  // 둘 다 빠뜨리면 둘 다 보고한다 — 하나씩 고치게 만들지 않는다.
  const both = validateSignUp(
    { ...VALID, agreeTerms: false, agreePrivacy: false },
    TODAY,
  )
  assert.equal(Object.keys(both).length, 2)
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
