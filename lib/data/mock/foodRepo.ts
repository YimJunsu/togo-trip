import seed from '@/mocks/foods.json'
import { filterFoods, pickRandom } from '@/lib/foods/filter'
import type { FoodRepository } from '../repositories'
import type { Food } from '../types'

/**
 * mocks/foods.json은 scripts/build-food-data.mjs가 CSV에서 만든다.
 * 손으로 고치지 말고 public/datas/fooddata.csv를 고친 뒤 스크립트를 다시 돌린다.
 */
const foods = seed as Food[]

export const mockFoodRepo: FoodRepository = {
  async list(filter) {
    return filterFoods(foods, filter)
  },

  async draw(filter) {
    return pickRandom(filterFoods(foods, filter))
  },
}
