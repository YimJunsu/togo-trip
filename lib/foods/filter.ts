import type { Food, FoodFilter } from '@/lib/data/types'

/**
 * 종류는 AND(하나만 고르므로 사실상 좁히기), 컨디션은 OR이다.
 * 컨디션을 AND로 걸면 메뉴당 태그가 2~3개뿐이라 두 개만 골라도 후보가 0이 된다.
 * /random의 테마 필터와 같은 규칙이라 두 화면의 조작감이 갈리지 않는다.
 */
export function matchFood(food: Food, filter?: FoodFilter): boolean {
  if (!filter) return true
  if (filter.category && food.category !== filter.category) return false
  if (
    filter.conditions?.length &&
    !filter.conditions.some((c) => food.conditions.includes(c))
  ) {
    return false
  }
  return true
}

export function filterFoods(foods: Food[], filter?: FoodFilter): Food[] {
  return foods.filter((food) => matchFood(food, filter))
}

/**
 * 후보에서 하나를 고른다. 비었으면 null.
 * random을 주입받는 이유는 테스트에서 고정하기 위해서다 — 뽑기 자체가
 * 이 서비스의 기능이라 "정말 후보 안에서만 나오는가"를 확인할 수 있어야 한다.
 */
export function pickRandom<T>(
  pool: T[],
  random: () => number = Math.random,
): T | null {
  if (pool.length === 0) return null
  return pool[Math.floor(random() * pool.length)] ?? null
}
