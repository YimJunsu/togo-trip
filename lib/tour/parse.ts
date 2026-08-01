import type { Attraction } from '@/lib/data/types'
import type { TourItem, TourResponse } from './types.ts'

/**
 * TourAPI가 규약을 어기는 세 지점을 여기서 막는다. 셋 다 조용히 잘못된 데이터를
 * 적재하게 만드는 종류라, 상태코드만 보고 넘어가면 빈 응답이 정상 적재가 된다.
 */
export class TourApiError extends Error {
  readonly code: string | null
  /** 한도 초과는 재시도해도 소용없다. 호출부가 즉시 중단하는 근거로 쓴다. */
  readonly limitExceeded: boolean

  constructor(message: string, code: string | null = null, limitExceeded = false) {
    super(message)
    this.name = 'TourApiError'
    this.code = code
    this.limitExceeded = limitExceeded
  }
}

const OK = '0000'
const LIMIT_MSG = 'LIMITED_NUMBER_OF_SERVICE_REQUESTS_EXCEEDS_ERROR'

/** 키 오류·한도 초과 시 _type=json 지정이 무시되고 XML이 온다. 파싱 전에 가른다. */
function parseBody(raw: string): TourResponse {
  if (raw.trimStart().startsWith('<')) {
    throw new TourApiError(
      `TourAPI가 XML로 응답했다 (키 오류이거나 한도 초과):\n${raw.slice(0, 500)}`,
      null,
      raw.includes(LIMIT_MSG),
    )
  }

  let json: unknown
  try {
    json = JSON.parse(raw)
  } catch {
    throw new TourApiError(`TourAPI 응답이 JSON이 아니다:\n${raw.slice(0, 500)}`)
  }

  const body = json as TourResponse
  const header = body.response?.header
  if (header?.resultCode !== OK) {
    const msg = header?.resultMsg ?? '(메시지 없음)'
    throw new TourApiError(
      `TourAPI 오류 ${header?.resultCode ?? '(코드 없음)'}: ${msg}`,
      header?.resultCode ?? null,
      msg.includes(LIMIT_MSG),
    )
  }
  return body
}

/** 정상 응답에서 item 배열을 꺼낸다. 결과 0건은 예외가 아니라 빈 배열이다. */
export function readTourBody(raw: string): TourItem[] {
  const items = parseBody(raw).response?.body?.items
  if (!items || typeof items !== 'object') return []

  // items는 보통 { item: ... } 형태로 온다. items 자체가 item(들)인 경우까지 방어한다.
  let item: TourItem | TourItem[] | undefined
  if (Array.isArray(items)) {
    item = items
  } else if ('item' in items) {
    item = items.item
  } else {
    // 위 두 분기에서 배열과 { item } 래핑을 걸렀으니 남은 건 item 자체다.
    item = items as TourItem
  }

  if (!item) return []
  // 결과가 1건이면 배열이 아니라 객체로 온다.
  return Array.isArray(item) ? item : [item]
}

/** detailCommon 응답에서 overview 한 건. 없으면 null. */
export function readOverview(raw: string): string | null {
  const [item] = readTourBody(raw)
  return clean(item?.overview)
}

function clean(value: string | undefined): string | null {
  if (!value) return null
  // overview는 <br>과 개행이 섞여 온다. 지역 페이지 본문에 그대로 나가는 값이다.
  const text = value
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return text || null
}

function coord(value: string | undefined): number | null {
  if (!value) return null
  const n = Number(value)
  // TourAPI는 좌표 미상을 0으로 준다. 실제 국내 좌표에 0은 없다.
  return Number.isFinite(n) && n !== 0 ? n : null
}

/**
 * TourAPI item → Attraction. 적재 대상이 아니거나 기본키가 없으면 null.
 * 좌표·이미지가 없다고 버리지 않는다 — 이름과 주소만으로도 목록에 쓸모가 있다.
 */
export function toAttraction(item: TourItem, regionCode: string): Attraction | null {
  const contentId = item.contentid?.trim()
  const title = item.title?.trim()
  if (!contentId || !title) return null

  const typeId = Number(item.contenttypeid)
  if (typeId !== 12 && typeId !== 39) return null

  const lat = coord(item.mapy)
  const lng = coord(item.mapx)

  return {
    contentId,
    contentTypeId: typeId,
    regionCode,
    title,
    addr: clean(item.addr1),
    coords: lat !== null && lng !== null ? [lat, lng] : null,
    imageUrl: item.firstimage?.trim() || null,
    overview: null,
  }
}
