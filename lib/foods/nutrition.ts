import type { Nutrition } from '@/lib/data/types'

/**
 * 식품의약품안전처 「1일 영양성분 기준치」. 성인 기준 한 벌이고,
 * 포장 식품의 영양성분표가 %를 계산할 때 쓰는 그 값이다.
 * 개인의 필요량이 아니라 표기용 공통 기준이라는 점을 화면에서도 밝힌다.
 */
export const DAILY_VALUE: Nutrition = {
  kcal: 2000,
  carbsG: 324,
  proteinG: 55,
  fatG: 54,
  sodiumMg: 2000,
}

export type NutrientKey = keyof Nutrition

export const NUTRIENT_ORDER: readonly NutrientKey[] = [
  'kcal',
  'carbsG',
  'proteinG',
  'fatG',
  'sodiumMg',
]

/**
 * 1일 기준치 대비 비율(%). 반올림한 정수로 돌려준다.
 *
 * 100을 넘겨도 자르지 않는다. 나트륨은 기준치를 넘는 메뉴가 흔하고,
 * 그 사실 자체가 알려야 할 정보다 — 막대 길이를 100%에서 끊는 것은 화면의 몫이고
 * 여기서 값을 깎으면 "기준치의 175%"라는 문장을 만들 수 없게 된다.
 */
export function dailyValuePercent(key: NutrientKey, value: number): number {
  return Math.round((value / DAILY_VALUE[key]) * 100)
}
