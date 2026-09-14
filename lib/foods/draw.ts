import { pickRandom } from './filter.ts'

/** 재추첨은 현재 메뉴 이외의 후보에서 한다. 하나뿐이면 유일한 후보를 반환한다. */
export function pickNextFood<T extends { id: string }>(
  candidates: T[],
  previousId?: string,
  random: () => number = Math.random,
): T | null {
  const alternatives = candidates.filter((food) => food.id !== previousId)
  return pickRandom(alternatives.length > 0 ? alternatives : candidates, random)
}
