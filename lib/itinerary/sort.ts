/**
 * 일정 정렬 규칙. React·데이터 계층에 의존하지 않는다. (CONVENTIONS.md §5)
 *
 * mock과 Supabase가 각자 정렬하면 두 구현이 조용히 갈린다 —
 * NEXT_PUBLIC_DATA_SOURCE 스위치는 화면이 차이를 못 느껴야 의미가 있다.
 * 특히 "시간 미정"은 SQL과 JS의 기본 null 취급이 서로 달라 갈리기 쉬운 자리다.
 */

import type { ItineraryItem } from '@/lib/data/types'

/** 정렬에 실제로 쓰는 것만. ItineraryItem은 이 모양을 만족한다. */
type Sortable = Pick<ItineraryItem, 'day' | 'at' | 'createdAt'>

/**
 * 날짜 오름차순 → 같은 날은 시간 오름차순.
 * 시간을 안 정한 일정은 그날 맨 뒤로 보낸다 — 시간이 정해진 일정 사이에 끼면
 * 어디에 넣어도 근거가 없고, 뒤에 모아 두면 "아직 안 정한 것들"로 읽힌다.
 * 같은 날 같은 시간이면 먼저 넣은 것이 앞이다.
 */
export function sortItinerary<T extends Sortable>(items: T[]): T[] {
  return [...items].sort(
    (a, b) =>
      a.day.localeCompare(b.day) ||
      // 여기를 지나면 둘 다 시간이 있거나 둘 다 없다. 없으면 ''끼리 비교라 0이 되고
      // 다음 줄(넣은 순)이 가른다.
      timeRank(a.at) - timeRank(b.at) ||
      (a.at ?? '').localeCompare(b.at ?? '') ||
      a.createdAt.localeCompare(b.createdAt),
  )
}

/** 시간 미정을 뒤로 보내기 위한 1차 키. 정해진 시간끼리는 2차 키가 가른다. */
function timeRank(at: string | null): number {
  return at === null ? 1 : 0
}
