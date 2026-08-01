/**
 * TourAPI가 주는 원본 필드. 전부 문자열로 온다 (숫자도 문자열이다).
 * 이 타입은 lib/tour/ 밖으로 나가지 않는다 — 바깥은 Attraction만 안다.
 */
export type TourItem = {
  contentid?: string
  contenttypeid?: string
  title?: string
  addr1?: string
  addr2?: string
  /** 경도 */
  mapx?: string
  /** 위도 */
  mapy?: string
  firstimage?: string
  firstimage2?: string
  cat1?: string
  cat2?: string
  cat3?: string
  tel?: string
  overview?: string
}

export type TourResponse = {
  response?: {
    header?: { resultCode?: string; resultMsg?: string }
    body?: {
      items?: { item?: TourItem | TourItem[] } | ''
      totalCount?: number
    }
  }
}
