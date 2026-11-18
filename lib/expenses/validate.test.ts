import { test } from 'node:test'
import assert from 'node:assert/strict'
import { MAX_EXPENSE_AMOUNT, canRemoveExpense, isValidAmount, parseWon } from './validate.ts'

test('쉼표·원·₩·공백을 걷어내고 정수 원으로 읽는다', () => {
  assert.deepEqual(parseWon('152,000원'), { ok: true, won: 152_000 })
  assert.deepEqual(parseWon('₩ 30 000'), { ok: true, won: 30_000 })
  assert.deepEqual(parseWon('7'), { ok: true, won: 7 })
})

test('빈 값·0·음수·소수·문자는 거절한다', () => {
  for (const input of ['', '   ', '0', '-1000', '1000.5', '1e5', '만원', '0x10']) {
    assert.equal(parseWon(input).ok, false, `"${input}"이 통과했다`)
  }
})

test('상한까지는 받고 넘으면 거절한다', () => {
  assert.deepEqual(parseWon(String(MAX_EXPENSE_AMOUNT)), { ok: true, won: MAX_EXPENSE_AMOUNT })
  assert.equal(parseWon(String(MAX_EXPENSE_AMOUNT + 1)).ok, false)
})

test('서버 경계 검사는 같은 상한을 본다', () => {
  assert.equal(isValidAmount(MAX_EXPENSE_AMOUNT), true)
  assert.equal(isValidAmount(MAX_EXPENSE_AMOUNT + 1), false)
  assert.equal(isValidAmount(1.5), false)
  assert.equal(isValidAmount(0), false)
})

test('지출은 결제자 본인과 방장만 지운다', () => {
  const expense = { payerId: 'A' }
  assert.equal(canRemoveExpense(expense, 'A', false), true)
  assert.equal(canRemoveExpense(expense, 'B', true), true)
  assert.equal(canRemoveExpense(expense, 'B', false), false)
})
