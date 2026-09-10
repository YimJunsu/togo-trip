import type { Trip } from '@/lib/data/types'

/**
 * 홈 맨 위에 세울 여행방 하나를 고른다.
 *
 * 규칙은 "지금 신경 써야 하는 방"이다. 아직 안 지난 여행 중 가장 가까운 것,
 * 그런 게 없으면 가장 최근에 다녀온 것. 다녀온 방을 그래도 하나 세우는 이유는
 * 정산이 여행이 끝난 뒤에 일어나기 때문이다 — 여행이 끝나자마자 홈에서 사라지면
 * 정작 돈 계산이 필요한 순간에 들어갈 문이 없다.
 *
 * API와 화면이 각자 고르면 언젠가 서로 다른 방을 가리킨다. 그래서 순수 함수로
 * 하나만 두고 양쪽이 같은 것을 부른다.
 *
 * today는 주입받는다. 서버와 브라우저의 시계가 다를 수 있고, 테스트가 오늘
 * 날짜에 따라 결과가 달라지면 안 된다.
 */
export function pickFeaturedTrip<T extends Trip>(
  trips: readonly T[],
  today: Date,
): T | null {
  if (trips.length === 0) return null

  // KST 자정 기준. 시작일이 오늘이면 "지난 여행"이 아니다.
  const todayKey = kstDateKey(today)

  const upcoming = trips
    .filter((trip) => trip.endDate >= todayKey)
    .sort((a, b) => a.startDate.localeCompare(b.startDate))
  if (upcoming.length > 0) return upcoming[0]

  const past = [...trips].sort((a, b) => b.endDate.localeCompare(a.endDate))
  return past[0]
}

/**
 * YYYY-MM-DD (Asia/Seoul). 날짜 문자열끼리 비교하므로 시간대만 맞추면 된다.
 * 서버가 UTC로 도는데 로컬 시각으로 자르면 한국의 오전 9시 전이 전날로 읽힌다.
 */
function kstDateKey(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}
