const HANGUL_START = 0xac00
const HANGUL_END = 0xd7a3
const JONGSEONG_COUNT = 28

/** 조사 쌍. 앞이 받침 있을 때, 뒤가 받침 없을 때 붙는 쪽이다. */
const PAIRS = {
  '이/가': ['이', '가'],
  '은/는': ['은', '는'],
  '을/를': ['을', '를'],
  '과/와': ['과', '와'],
  '이나/나': ['이나', '나'],
} as const

export type JosaPair = keyof typeof PAIRS

/** 한글 음절이면 받침 유무를 본다. 한글이 아니면(영문·숫자) 받침 없는 쪽으로 붙인다. */
function hasJongseong(word: string): boolean {
  const last = word.trim().at(-1)
  if (!last) return false

  const code = last.charCodeAt(0)
  if (code < HANGUL_START || code > HANGUL_END) return false

  return (code - HANGUL_START) % JONGSEONG_COUNT !== 0
}

/**
 * 단어에 맞는 조사를 붙여 돌려준다.
 * seed의 축 이름이 바뀌어도 "올빼미이" 같은 문장이 나오지 않게 한다.
 */
export function withJosa(word: string, pair: JosaPair): string {
  const [withBatchim, withoutBatchim] = PAIRS[pair]
  return `${word}${hasJongseong(word) ? withBatchim : withoutBatchim}`
}
