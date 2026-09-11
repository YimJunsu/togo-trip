import type { QuizAxis, QuizQuestion, StyleCode } from '@/lib/data/types'

/**
 * 축별 두 극단의 글자. 점수가 낮으면 low, 높으면 high 쪽이다.
 * 코드 글자 순서는 AXIS_ORDER를 따르고, 이 순서가 곧 공유 URL이라 바꾸지 않는다.
 */
export const AXIS_ORDER: readonly QuizAxis[] = [
  'plan',
  'morning',
  'activity',
  'budget',
]

type AxisSide = {
  letter: string
  label: string
  /**
   * 그쪽에 선 사람이 여행에서 실제로 어떻게 움직이는지. 결과 화면의 «축별 풀이»가
   * 네 축의 이 문장을 이어 붙여 그 유형의 본문을 만든다 — 16유형이 각자 다른 조합을
   * 갖게 되어 결과 페이지마다 서버 본문이 달라진다.
   */
  note: string
}

export const AXIS_META: Record<
  QuizAxis,
  { label: string; low: AxisSide; high: AxisSide }
> = {
  plan: {
    label: '계획',
    low: {
      letter: 'P',
      label: '계획형',
      note: '출발 전에 동선과 예약이 끝나 있습니다. 변수가 생겨도 예비 후보가 있어 흔들림이 짧고, 대신 계획이 없는 상태 자체를 불편해합니다.',
    },
    high: {
      letter: 'F',
      label: '즉흥형',
      note: '큰 방향만 잡고 나머지는 현장에서 정합니다. 우연히 들어간 골목이 그날의 하이라이트가 되지만, 이름난 곳은 예약이 없어 놓치기도 합니다.',
    },
  },
  morning: {
    label: '시간대',
    low: {
      letter: 'M',
      label: '아침형',
      note: '해 뜰 무렵부터 움직입니다. 관광지가 붐비기 전에 한 바퀴 돌고, 해가 지면 일찍 숙소로 들어와 다음 날을 준비합니다.',
    },
    high: {
      letter: 'N',
      label: '밤형',
      note: '오전은 천천히 시작하고 해가 진 뒤에 진짜 여행이 시작됩니다. 야시장, 심야 식당, 밤바다가 이 유형의 무대입니다.',
    },
  },
  activity: {
    label: '체력',
    low: {
      letter: 'A',
      label: '액티브',
      note: '하루에 몇 곳을 돌았는지가 곧 만족도입니다. 걷고 오르고 타는 일정을 빼곡히 채우고, 쉬는 시간은 이동 중이면 충분합니다.',
    },
    high: {
      letter: 'R',
      label: '휴식형',
      note: '숙소와 그 근처가 여행의 중심입니다. 한 곳에 오래 머물며 풍경과 음식을 천천히 즐기고, 코스가 많으면 오히려 피곤해집니다.',
    },
  },
  budget: {
    label: '지갑',
    low: {
      letter: 'S',
      label: '가성비',
      note: '쓸 곳과 아낄 곳을 미리 나눕니다. 숙소는 깨끗하면 되고, 그렇게 아낀 돈으로 한 끼를 더 잘 먹는 쪽을 고릅니다.',
    },
    high: {
      letter: 'L',
      label: '플렉스',
      note: '여행에서는 아끼지 않습니다. 전망 좋은 숙소와 이름난 식당에 돈을 쓰는 것이 이 여행의 목적 가운데 하나입니다.',
    },
  },
}

/** 0~100. 축에 속한 문항 점수의 평균. 문항이 없으면 중앙값 50. */
export function axisScores(
  questions: QuizQuestion[],
  answers: number[],
): Record<QuizAxis, number> {
  const sum = {} as Record<QuizAxis, { total: number; count: number }>
  for (const axis of AXIS_ORDER) sum[axis] = { total: 0, count: 0 }

  questions.forEach((question, i) => {
    const answer = answers[i]
    if (answer === undefined) return
    const bucket = sum[question.axis]
    bucket.total += answer
    bucket.count += 1
  })

  const scores = {} as Record<QuizAxis, number>
  for (const axis of AXIS_ORDER) {
    const { total, count } = sum[axis]
    scores[axis] = count === 0 ? 50 : Math.round(total / count)
  }
  return scores
}

/**
 * 축 점수 → 4글자 코드. 정확히 50이면 low 쪽으로 붙인다 —
 * 축마다 홀수 문항(3개)이라 실제로는 50이 나오지 않지만, 문항 수가 바뀌어도 결과는 하나여야 한다.
 */
export function toStyleCode(scores: Record<QuizAxis, number>): StyleCode {
  return AXIS_ORDER.map((axis) => {
    const meta = AXIS_META[axis]
    return scores[axis] > 50 ? meta.high.letter : meta.low.letter
  }).join('')
}

export function scoreQuiz(
  questions: QuizQuestion[],
  answers: number[],
): { code: StyleCode; scores: Record<QuizAxis, number> } {
  const scores = axisScores(questions, answers)
  return { code: toStyleCode(scores), scores }
}

/** 코드 두 개가 다른 축의 수. 0이면 같은 유형, 4면 정반대. */
export function codeDistance(a: StyleCode, b: StyleCode): number {
  return AXIS_ORDER.reduce((n, _axis, i) => (a[i] === b[i] ? n : n + 1), 0)
}

/**
 * 잘 맞는 유형 목록. seed가 지정한 궁합(matchCode)을 맨 앞에 두고,
 * 나머지는 축이 덜 어긋난 순으로 채운다. 자기 자신은 뺀다.
 */
export function nearestCodes(
  code: StyleCode,
  matchCode: StyleCode,
  all: StyleCode[],
  count: number,
): StyleCode[] {
  const rest = all
    .filter((c) => c !== code && c !== matchCode)
    .sort(
      (a, b) =>
        codeDistance(code, a) - codeDistance(code, b) || a.localeCompare(b),
    )
  return [matchCode, ...rest].slice(0, count)
}
