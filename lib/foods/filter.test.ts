import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { Food, FoodCategory, FoodCondition } from '@/lib/data/types'
import { filterFoods, matchFood, pickRandom } from './filter.ts'

function food(
  name: string,
  category: FoodCategory,
  conditions: FoodCondition[],
): Food {
  return {
    id: `food-${name}`,
    name,
    category,
    conditions,
    emoji: '🍽️',
    nutrition: {
      kcal: 500,
      carbsG: 60,
      proteinG: 20,
      fatG: 20,
      sodiumMg: 1000,
    },
  }
}

const FOODS: Food[] = [
  food('김치찌개', 'korean', ['alcohol', 'cold']),
  food('냉면', 'korean', ['hot', 'hangover']),
  food('짜장면', 'chinese', ['cheap', 'tired']),
  food('초밥', 'japanese', ['special', 'diet']),
]

test('필터가 없으면 전부 후보다', () => {
  assert.equal(filterFoods(FOODS).length, 4)
  assert.equal(filterFoods(FOODS, {}).length, 4)
})

test('종류는 하나만 남긴다', () => {
  const found = filterFoods(FOODS, { category: 'korean' })
  assert.deepEqual(
    found.map((f) => f.name),
    ['김치찌개', '냉면'],
  )
})

test('컨디션은 OR이라 고를수록 후보가 늘어난다', () => {
  const one = filterFoods(FOODS, { conditions: ['cold'] })
  const two = filterFoods(FOODS, { conditions: ['cold', 'hot'] })
  assert.deepEqual(
    one.map((f) => f.name),
    ['김치찌개'],
  )
  assert.deepEqual(
    two.map((f) => f.name),
    ['김치찌개', '냉면'],
  )
})

test('종류와 컨디션은 함께 걸면 둘 다 만족해야 한다', () => {
  assert.deepEqual(
    filterFoods(FOODS, {
      category: 'korean',
      conditions: ['cheap', 'hot'],
    }).map((f) => f.name),
    ['냉면'],
  )
  // 한식이면서 가성비인 메뉴는 없다 — 종류가 OR로 새면 짜장면이 끼어든다.
  assert.deepEqual(
    filterFoods(FOODS, { category: 'korean', conditions: ['cheap'] }),
    [],
  )
})

test('빈 컨디션 배열은 조건 없음과 같다', () => {
  assert.equal(filterFoods(FOODS, { conditions: [] }).length, 4)
})

test('matchFood는 태그가 하나만 겹쳐도 통과시킨다', () => {
  const kimchi = FOODS[0]!
  assert.equal(matchFood(kimchi, { conditions: ['diet', 'cold'] }), true)
  assert.equal(matchFood(kimchi, { conditions: ['diet'] }), false)
})

test('pickRandom은 후보 안에서만 고른다', () => {
  // 0에 가까운 값은 첫 번째, 1에 가까운 값은 마지막. 경계에서 범위를 벗어나지 않는지 본다.
  assert.equal(pickRandom(FOODS, () => 0)?.name, '김치찌개')
  assert.equal(pickRandom(FOODS, () => 0.999999)?.name, '초밥')
  assert.equal(pickRandom(FOODS, () => 0.5)?.name, '짜장면')
})

test('후보가 비면 null이다', () => {
  assert.equal(pickRandom([]), null)
  assert.equal(pickRandom(filterFoods(FOODS, { category: 'beverage' })), null)
})
