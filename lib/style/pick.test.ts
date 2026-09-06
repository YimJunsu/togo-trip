import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { QuizAxis, QuizQuestion } from '@/lib/data/types'
import seed from '@/mocks/quiz.json'
import { AXIS_ORDER } from './score.ts'
import { pickQuizQuestions, QUESTIONS_PER_AXIS } from './pick.ts'

const POOL = seed as QuizQuestion[]

function countByAxis(questions: QuizQuestion[]): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const q of questions) counts[q.axis] = (counts[q.axis] ?? 0) + 1
  return counts
}

/** 0, 0.5, 0.999… 를 돌려가며 내는 고정 난수. 값이 하나면 셔플이 한쪽으로만 돈다. */
function fakeRandom(values: number[]): () => number {
  let i = 0
  return () => values[i++ % values.length]!
}

test('축마다 같은 수로 낸다', () => {
  const picked = pickQuizQuestions(POOL)
  const counts = countByAxis(picked)
  for (const axis of AXIS_ORDER) {
    assert.equal(counts[axis], QUESTIONS_PER_AXIS, `${axis} 축이 어긋난다`)
  }
  assert.equal(picked.length, AXIS_ORDER.length * QUESTIONS_PER_AXIS)
})

test('풀 안에서만 뽑고 같은 문항을 두 번 내지 않는다', () => {
  for (let run = 0; run < 50; run++) {
    const picked = pickQuizQuestions(POOL)
    const ids = picked.map((q) => q.id)
    assert.equal(new Set(ids).size, ids.length, '중복 문항이 나왔다')
    for (const id of ids) {
      assert.ok(
        POOL.some((q) => q.id === id),
        `풀에 없는 문항: ${id}`,
      )
    }
  }
})

test('같은 난수를 주면 같은 조합이 나온다', () => {
  const values = [0.11, 0.73, 0.42, 0.98, 0.05, 0.61]
  const a = pickQuizQuestions(POOL, { random: fakeRandom(values) })
  const b = pickQuizQuestions(POOL, { random: fakeRandom(values) })
  assert.deepEqual(
    a.map((q) => q.id),
    b.map((q) => q.id),
  )
})

test('난수가 다르면 조합도 달라진다', () => {
  // 매번 같은 12개가 나오면 문항을 24개로 늘린 의미가 없다.
  const a = pickQuizQuestions(POOL, { random: fakeRandom([0.01, 0.99, 0.5]) })
  const b = pickQuizQuestions(POOL, { random: fakeRandom([0.87, 0.12, 0.33]) })
  assert.notDeepEqual(
    a.map((q) => q.id),
    b.map((q) => q.id),
  )
})

test('축 순서대로 몰아서 내지 않는다', () => {
  // 셔플을 빼먹으면 plan 3개 → morning 3개 순으로 나온다.
  const axes = pickQuizQuestions(POOL, {
    random: fakeRandom([0.31, 0.77, 0.08, 0.55]),
  }).map((q) => q.axis as QuizAxis)
  const grouped = AXIS_ORDER.flatMap((axis) =>
    Array.from({ length: QUESTIONS_PER_AXIS }, () => axis),
  )
  assert.notDeepEqual(axes, grouped)
})

test('풀이 모자란 축은 있는 만큼만 낸다', () => {
  const thin = POOL.filter((q) => q.axis !== 'budget' || q.id === 'q7')
  const counts = countByAxis(pickQuizQuestions(thin))
  assert.equal(counts['budget'], 1)
  assert.equal(counts['plan'], QUESTIONS_PER_AXIS)
})
