import raw from './tour-area-map.json' with { type: 'json' }

/**
 * TourAPI 지역코드. 통계청 코드와 다른 체계라 별도 매핑이 필요하다.
 * 표는 scripts/build-tour-area-map.mjs가 만들고 커밋한다 — 런타임 조회를 하지 않는다.
 */
export type TourArea = {
  areaCode: number
  /** 세종특별자치시는 시군구가 없어 null. 이때는 시도 단위로 조회한다. */
  sigunguCode: number | null
}

export const TOUR_AREA_MAP = raw as Record<string, TourArea>

/** 없는 통계청 코드면 null. 공유 URL로 아무 값이나 들어올 수 있다. */
export function getTourArea(code: string): TourArea | null {
  return TOUR_AREA_MAP[code] ?? null
}
