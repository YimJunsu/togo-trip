import { MIN_SIGNUP_AGE } from '../auth/validate.ts'

/**
 * 생년월일 휠의 계산만 모아 둔다. DOM도 React도 모른다 — node --test가 직접 부른다.
 *
 * 상대경로에 .ts를 붙이는 건 노드가 확장자 없는 지정자를 풀지 못하기 때문이다.
 * 빼면 pnpm typecheck는 통과하는데 pnpm test가 ERR_MODULE_NOT_FOUND로 죽는다.
 */

/** 고를 수 있는 연도 개수. 가장 어린 해에서 아래로 이만큼. */
const YEAR_SPAN = 107

/**
 * 해당 월의 일수. 0일은 이전 달의 마지막 날이라 윤년 규칙이 저절로 맞는다
 * (4년마다, 100년마다는 예외, 400년마다는 다시 윤년).
 */
export function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}

/**
 * 달을 옮겨 사라진 날짜를 그 달의 마지막 날로 당긴다. 3월 31일에서 2월로 가면 28일.
 *
 * 예전 select 방식은 이럴 때 일을 빈 값으로 만들어 "생년월일을 정확히 입력하세요"를
 * 띄웠다. 휠은 늘 무언가를 가리키고 있어서 빈 값이 될 자리가 없고, 당기는 쪽이
 * 유효하지 않은 날짜를 아예 못 만들게 한다.
 */
export function clampDay(year: number, month: number, day: number): number {
  const last = daysInMonth(year, month)
  return day > last ? last : day
}

/**
 * 스크롤 위치를 항목 인덱스로 바꾼다.
 *
 * 컨테이너 위아래에 여백이 있어 첫 항목과 마지막 항목도 가운데에 설 수 있다는 전제다.
 * 그 여백 덕분에 "가운데 항목의 인덱스 = scrollTop / 항목높이"가 그대로 성립한다.
 */
export function indexFromScroll(
  scrollTop: number,
  itemHeight: number,
  count: number,
): number {
  if (itemHeight <= 0 || count <= 0) return 0
  const raw = Math.round(scrollTop / itemHeight)
  return Math.min(Math.max(raw, 0), count - 1)
}

/** 서버로 나가는 유일한 형태. */
export function toIso(year: number, month: number, day: number): string {
  const mm = String(month).padStart(2, '0')
  const dd = String(day).padStart(2, '0')
  return `${year}-${mm}-${dd}`
}

/**
 * 고를 수 있는 연도를 최신순으로. 만 14세 미만이 되는 연도는 목록에 아예 없다 —
 * 검증에 걸리게 두는 것보다 못 고르게 하는 편이 낫다.
 *
 * 완전한 방어는 아니다. 상한 연도(예: 2026년의 2012년)라도 생일이 아직 안 지났으면
 * 만 13세다. 그건 validateSignUp / validateOnboarding이 마지막에 한 번 더 본다.
 */
export function selectableYears(today: Date): number[] {
  const newest = today.getFullYear() - MIN_SIGNUP_AGE
  return Array.from({ length: YEAR_SPAN }, (_, i) => newest - i)
}
