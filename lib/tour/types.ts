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
      /**
       * 실제 TourAPI는 items.item에 담아 보낸다. items 자체가 item(들)인 경우는
       * 없지만, 방어적으로 같이 받아 둔다 — parse.ts의 readTourBody 주석 참고.
       */
      items?: { item?: TourItem | TourItem[] } | TourItem | TourItem[] | ''
      totalCount?: number
    }
  }
}
