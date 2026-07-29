import { test } from 'node:test'
import assert from 'node:assert/strict'
import { isSettlementParty } from './party.ts'

test('보내는 사람은 당사자다', () => {
  assert.equal(
    isSettlementParty({ from: 'usr-1', to: 'usr-2' }, 'usr-1'),
    true,
  )
})

test('받는 사람도 당사자다', () => {
  assert.equal(
    isSettlementParty({ from: 'usr-1', to: 'usr-2' }, 'usr-2'),
    true,
  )
})

test('보내지도 받지도 않는 제3자는 당사자가 아니다', () => {
  assert.equal(
    isSettlementParty({ from: 'usr-1', to: 'usr-2' }, 'usr-3'),
    false,
  )
})

test('빈 문자열 userId는 id가 비어있지 않은 송금과 매칭되지 않는다', () => {
  assert.equal(isSettlementParty({ from: 'usr-1', to: 'usr-2' }, ''), false)
})
