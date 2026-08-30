import type { Attraction } from '@/lib/data/types'
import type { TourArea } from '@/lib/geo/tourAreaMap'
import { TourApiError, readOverview, readTourBody, toAttraction } from './parse.ts'

const BASE = 'https://apis.data.go.kr/B551011/KorService2'

/** 한 시군구에서 가져올 최대 건수. 지역 페이지가 5건씩 쓰므로 여유 있게 잡는다. */
const ROWS = 30

/**
 * TourAPI HTTP 호출. 이 파일이 이 기능의 유일한 I/O 경계다 —
 * 나머지는 순수함수이거나 주입으로 대체되므로 네트워크를 타는 테스트가 필요 없다.
 */
export interface TourClient {
  listByArea(
    area: TourArea,
    contentTypeId: 12 | 39,
    regionCode: string,
  ): Promise<Attraction[]>
  getOverview(contentId: string): Promise<string | null>
}

function url(operation: string, params: Record<string, string>): URL {
  const key = process.env.TOUR_API_KEY
  if (!key) {
    throw new TourApiError('TOUR_API_KEY가 없다. 환경변수를 확인한다.')
  }
  const u = new URL(`${BASE}/${operation}`)
  u.searchParams.set('serviceKey', key)
  u.searchParams.set('MobileOS', 'ETC')
  u.searchParams.set('MobileApp', 'togo-trip')
  u.searchParams.set('_type', 'json')
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v)
  return u
}

async function get(u: URL): Promise<string> {
  // 적재는 항상 최신을 원한다. Next의 기본 캐시가 붙으면 재실행이 같은 응답을 본다.
  const res = await fetch(u, { cache: 'no-store' })
  const text = await res.text()
  if (!res.ok) {
    throw new TourApiError(`TourAPI HTTP ${res.status}:\n${text.slice(0, 500)}`)
  }
  return text
}

export const tourClient: TourClient = {
  async listByArea(area, contentTypeId, regionCode) {
    const params: Record<string, string> = {
      areaCode: String(area.areaCode),
      contentTypeId: String(contentTypeId),
      numOfRows: String(ROWS),
      pageNo: '1',
      // 인기순. 관광지가 많은 지역에서 30건만 가져오므로 정렬이 품질을 좌우한다.
      arrange: 'P',
    }
    // 세종은 시군구가 없다. sigunguCode를 빼고 시도 단위로 조회한다.
    if (area.sigunguCode !== null) {
      params.sigunguCode = String(area.sigunguCode)
    }

    const raw = await get(url('areaBasedList2', params))
    return readTourBody(raw)
      .map((item) => toAttraction(item, regionCode))
      .filter((a): a is Attraction => a !== null)
  },

  async getOverview(contentId) {
    const raw = await get(
      url('detailCommon2', { contentId, numOfRows: '1', pageNo: '1' }),
    )
    return readOverview(raw)
  },
}
