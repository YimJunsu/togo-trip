import type { QuizAxis, QuizQuestion } from '@/lib/data/types'
import { AXIS_ORDER } from '@/lib/style/score'

/** 한 축에서 낼 문항 수. 축 점수는 평균이라 축마다 같은 수여야 한쪽으로 기울지 않는다. */
export const QUESTIONS_PER_AXIS = 3

/** 한 번에 내는 문항 수. 화면이 "N문항"이라고 적을 때 이 값을 쓴다. */
export const QUIZ_LENGTH = QUESTIONS_PER_AXIS * AXIS_ORDER.length

/**
 * 원본을 건드리지 않는 Fisher-Yates. random을 주입받는 이유는 테스트에서
 * 고정하기 위해서다 — "정말 풀 안에서만, 축마다 같은 수로 뽑는가"를 확인할 수 있어야 한다.
 */
function shuffle<T>(items: T[], random: () => number): T[] {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[out[i], out[j]] = [out[j]!, out[i]!]
  }
  return out
}

/**
 * 문항 풀에서 이번에 낼 문항을 고른다.
 *
 * 축마다 따로 뽑는다. 전체에서 한 번에 뽑으면 어떤 축은 다섯 문항, 어떤 축은 한 문항이
 * 나올 수 있고, 그러면 한 문항짜리 축은 답 하나가 결과를 통째로 정해 버린다.
 *
 * 풀에 perAxis보다 적게 들어 있는 축은 있는 만큼만 낸다. seed가 줄어도 테스트가
 * 터지는 대신 짧아지기만 하게 둔다 — 점수 계산은 문항 수가 달라도 평균이라 견딘다.
 */
export function pickQuizQuestions(
  pool: QuizQuestion[],
  {
    perAxis = QUESTIONS_PER_AXIS,
    random = Math.random,
  }: { perAxis?: number; random?: () => number } = {},
): QuizQuestion[] {
  const byAxis = {} as Record<QuizAxis, QuizQuestion[]>
  for (const axis of AXIS_ORDER) byAxis[axis] = []
  for (const question of pool) byAxis[question.axis]?.push(question)

  const picked = AXIS_ORDER.flatMap((axis) =>
    shuffle(byAxis[axis], random).slice(0, perAxis),
  )

  // 축 순서대로 몰아서 내면 "계획 얘기만 세 번" 하다가 넘어가는 흐름이 된다.
  return shuffle(picked, random)
}
