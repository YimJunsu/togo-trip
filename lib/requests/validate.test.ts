import assert from 'node:assert/strict'
import { test } from 'node:test'
import { MAX_CONTENT_LENGTH, MIN_CONTENT_LENGTH } from './limits.ts'
import { isRequestKind, validateRequestContent } from './validate.ts'

test('앞뒤 공백을 다듬어 돌려준다', () => {
  const result = validateRequestContent(
    '  지도에서 지역을 누르면 바로 뽑기로 가면 좋겠어요  ',
  )
  assert.deepEqual(result, {
    ok: true,
    content: '지도에서 지역을 누르면 바로 뽑기로 가면 좋겠어요',
  })
})

test('공백을 뺀 길이가 최소 미만이면 거른다', () => {
  // 공백으로 길이를 채운 입력이 통과하면 안 된다.
  const padded = 'ㅇㅇ'.padEnd(MIN_CONTENT_LENGTH + 5, ' ')
  const result = validateRequestContent(padded)
  assert.equal(result.ok, false)
  if (!result.ok)
    assert.match(result.error, new RegExp(`${MIN_CONTENT_LENGTH}자`))
})

test('경계값: 최소 길이는 통과, 최대 초과는 거른다', () => {
  assert.equal(validateRequestContent('가'.repeat(MIN_CONTENT_LENGTH)).ok, true)
  assert.equal(validateRequestContent('가'.repeat(MAX_CONTENT_LENGTH)).ok, true)
  assert.equal(
    validateRequestContent('가'.repeat(MAX_CONTENT_LENGTH + 1)).ok,
    false,
  )
})

test('종류는 정해진 셋만 받는다', () => {
  assert.equal(isRequestKind('feature'), true)
  assert.equal(isRequestKind('bug'), true)
  assert.equal(isRequestKind('other'), true)
  assert.equal(isRequestKind('spam'), false)
  assert.equal(isRequestKind(undefined), false)
})
