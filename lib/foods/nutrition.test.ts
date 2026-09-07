import assert from 'node:assert/strict'
import { test } from 'node:test'
import { DAILY_VALUE, dailyValuePercent, NUTRIENT_ORDER } from './nutrition.ts'

test('기준치와 같은 값이면 100%다', () => {
  for (const key of NUTRIENT_ORDER) {
    assert.equal(dailyValuePercent(key, DAILY_VALUE[key]), 100)
  }
})

test('영양소마다 다른 기준치를 쓴다', () => {
  // 같은 20이라도 단백질은 36%, 지방은 37%다. 한 기준치를 돌려쓰면 둘이 같아진다.
  assert.equal(dailyValuePercent('proteinG', 20), 36)
  assert.equal(dailyValuePercent('fatG', 20), 37)
})

test('반올림한 정수를 돌려준다', () => {
  assert.equal(dailyValuePercent('kcal', 456), 23)
  assert.equal(dailyValuePercent('carbsG', 25), 8)
})

test('100%를 넘겨도 자르지 않는다', () => {
  // 김치찌개 나트륨 1,962mg은 98%지만, 짬뽕 3,500mg은 175%다.
  // 여기서 100으로 깎으면 "기준치의 175%"라는 문장을 만들 수 없게 된다.
  assert.equal(dailyValuePercent('sodiumMg', 3500), 175)
})

test('0은 0%다', () => {
  assert.equal(dailyValuePercent('fatG', 0), 0)
})
