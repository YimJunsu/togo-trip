// 상대 경로로 받는다. '@/' 별칭은 pnpm test(순수 node)가 풀지 못해
// 이 모듈을 로드하는 테스트가 ERR_MODULE_NOT_FOUND로 죽는다.
import seed from '../../../mocks/attractions.json' with { type: 'json' }
import type { AttractionRepository } from '../repositories'
import type { Attraction, RegionSummary } from '../types'

const data = seed as { regions: RegionSummary[]; attractions: Attraction[] }

export const mockAttractionRepo: AttractionRepository = {
  async listByRegion(code, opts) {
    const rows = data.attractions.filter(
      (a) => a.regionCode === code && (!opts?.type || a.contentTypeId === opts.type),
    )
    // Supabase 구현(has_overview desc, title)과 순서를 맞춘다. overview 유무가
    // 1순위, title이 2순위다 — overview 본문 자체로 정렬하면 한국어 문단
    // 사전순이 되어 의미가 없고, mock이 Postgres collation을 재현할 수도 없다.
    // 지역 페이지 본문이 overview로 채워지므로 두 백엔드가 다른 순서를 주면
    // UI가 mock인지 실서버인지 구분돼 버린다 — 원본 배열은 건드리지 않고 복사본을 정렬한다.
    const sorted = [...rows].sort((a, b) => {
      if ((a.overview !== null) !== (b.overview !== null)) {
        return a.overview !== null ? -1 : 1
      }
      return a.title.localeCompare(b.title, 'ko')
    })
    // limit이 0일 수도 있다. falsy 검사로 쓰면 0이 "제한 없음"이 돼 전부 돌려준다.
    return typeof opts?.limit === 'number' ? sorted.slice(0, opts.limit) : sorted
  },

  async getRegion(code) {
    return data.regions.find((r) => r.code === code) ?? null
  },

  async listIngestedRegions() {
    return data.regions.filter((r) => r.ingestedAt !== null)
  },
}
