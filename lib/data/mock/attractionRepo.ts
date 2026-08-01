import seed from '@/mocks/attractions.json'
import type { AttractionRepository } from '../repositories'
import type { Attraction, RegionSummary } from '../types'

const data = seed as { regions: RegionSummary[]; attractions: Attraction[] }

export const mockAttractionRepo: AttractionRepository = {
  async listByRegion(code, opts) {
    const rows = data.attractions.filter(
      (a) => a.regionCode === code && (!opts?.type || a.contentTypeId === opts.type),
    )
    // limit이 0일 수도 있다. falsy 검사로 쓰면 0이 "제한 없음"이 돼 전부 돌려준다.
    return typeof opts?.limit === 'number' ? rows.slice(0, opts.limit) : rows
  },

  async getRegion(code) {
    return data.regions.find((r) => r.code === code) ?? null
  },

  async listIngestedRegions() {
    return data.regions.filter((r) => r.ingestedAt !== null)
  },
}
