import assert from 'node:assert/strict'
import { test } from 'node:test'
import { pickNextFood } from './draw.ts'

const candidates = [{ id: 'rice' }, { id: 'noodles' }, { id: 'soup' }]

test('첫 추첨은 전체 후보에서 고른다', () => {
  assert.equal(
    pickNextFood(candidates, undefined, () => 0),
    candidates[0],
  )
  assert.equal(
    pickNextFood(candidates, undefined, () => 0.999),
    candidates[2],
  )
})

test('재추첨의 모든 구간에서 직전 메뉴가 제외된다', () => {
  for (const previous of candidates) {
    for (const random of [0, 0.25, 0.5, 0.75, 0.999]) {
      const result = pickNextFood(candidates, previous.id, () => random)
      assert.ok(result)
      assert.notEqual(result.id, previous.id)
      assert.ok(candidates.includes(result))
    }
  }
})

test('후보가 하나면 직전과 같아도 유일한 메뉴를 반환한다', () => {
  assert.equal(pickNextFood([candidates[0]], 'rice'), candidates[0])
})

test('비어 있는 후보에서는 이전 메뉴로 되돌아가지 않는다', () => {
  assert.equal(pickNextFood([], 'rice'), null)
})

test('이전 메뉴가 후보에 없어도 현재 후보 범위를 지키고 원본 순서를 보존한다', () => {
  const before = [...candidates]
  assert.equal(
    pickNextFood(candidates, 'other', () => 0.5),
    candidates[1],
  )
  assert.deepEqual(candidates, before)
})
