/** 국내 포맷 고정. 통화는 정수 원, 날짜는 YYYY.MM.DD. (CLAUDE.md) */

export function formatWon(amount: number): string {
  return `${Math.round(amount).toLocaleString('ko-KR')}원`
}

export function formatDate(iso: string): string {
  const [year, month, day] = iso.split('-')
  return `${year}.${month}.${day}`
}

/**
 * 적재 이력처럼 시각까지 필요한 자리. YYYY.MM.DD HH:mm
 *
 * 유일한 소비처인 /admin/ingest는 KST 03:00에 도는 cron이 실제로 언제
 * 돌았는지 보여주는 게 목적이다. Vercel 서버리스는 TZ를 지정하지 않으면
 * UTC로 실행되므로 getHours()/getDate() 같은 로컬 타임존 API를 쓰면
 * 프로덕션에서 9시간 — 자정 근처면 날짜까지 — 어긋난다. formatDday가
 * `+09:00`을 명시하는 것과 같은 이유로 Asia/Seoul을 코드에 못박는다.
 */
export function formatDateTime(iso: string): string {
  const d = new Date(iso)
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(d)
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? ''
  return `${get('year')}.${get('month')}.${get('day')} ${get('hour')}:${get('minute')}`
}

/** 같은 해·같은 달이면 뒤쪽을 줄인다. 2026.08.14 – 16 */
export function formatDateRange(startIso: string, endIso: string): string {
  const [sy, sm, sd] = startIso.split('-')
  const [ey, em, ed] = endIso.split('-')
  if (sy === ey && sm === em) return `${sy}.${sm}.${sd} – ${ed}`
  if (sy === ey) return `${sy}.${sm}.${sd} – ${em}.${ed}`
  return `${formatDate(startIso)} – ${formatDate(endIso)}`
}

export function formatNights(startIso: string, endIso: string): string {
  const start = new Date(startIso)
  const end = new Date(endIso)
  const nights = Math.round((end.getTime() - start.getTime()) / 86_400_000)
  return nights <= 0 ? '당일치기' : `${nights}박 ${nights + 1}일`
}

/** D-14 / D-DAY / 지난 여행. today는 테스트·서버 렌더 안정성을 위해 주입받는다. */
export function formatDday(startIso: string, today: Date): string {
  const start = new Date(`${startIso}T00:00:00+09:00`)
  const midnight = new Date(today)
  midnight.setHours(0, 0, 0, 0)
  const days = Math.ceil((start.getTime() - midnight.getTime()) / 86_400_000)
  if (days === 0) return 'D-DAY'
  if (days < 0) return '지난 여행'
  return `D-${days}`
}
