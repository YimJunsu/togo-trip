import assert from 'node:assert/strict'
import { test } from 'node:test'
import { shareMessage, SHARE_TONE_ORDER } from './shareMessage.ts'

test('반말은 받침에 맞는 조사를 붙인다', () => {
  assert.equal(shareMessage('김밥', 'casual'), '야! 김밥이나 먹으러 가자!!')
  assert.equal(
    shareMessage('순두부찌개', 'casual'),
    '야! 순두부찌개나 먹으러 가자!!',
  )
})

test('존댓말은 메뉴명을 그대로 넣는다', () => {
  assert.equal(shareMessage('김밥', 'polite'), '오늘 김밥 어떠신가요?')
  assert.equal(shareMessage('파스타', 'polite'), '오늘 파스타 어떠신가요?')
})

test('두 톤은 서로 다른 문장을 낸다', () => {
  // 톤 분기가 통째로 빠져도 테스트가 통과하지 않게 못박는다.
  for (const name of ['김밥', '파스타', '마라탕']) {
    assert.notEqual(shareMessage(name, 'casual'), shareMessage(name, 'polite'))
  }
})

test('모든 톤이 메뉴명을 포함한다', () => {
  for (const tone of SHARE_TONE_ORDER) {
    assert.ok(shareMessage('제육볶음', tone).includes('제육볶음'))
  }
})
