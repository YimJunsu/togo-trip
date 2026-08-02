import { test } from 'node:test'
import assert from 'node:assert/strict'
import type { Attraction } from '@/lib/data/types'
import { TourApiError } from './parse.ts'
import { REGION_BUDGET_MS, ingestRegions, type IngestDb, type IngestDeps } from './ingest.ts'

const TARGETS = [
  { code: '42150', areaCode: 32, sigunguCode: 1 },
  { code: '42210', areaCode: 32, sigunguCode: 2 },
  { code: '42230', areaCode: 32, sigunguCode: 3 },
]

function attraction(id: string, type: 12 | 39, regionCode: string): Attraction {
  return {
    contentId: id,
    contentTypeId: type,
    regionCode,
    title: `스팟 ${id}`,
    addr: null,
    coords: null,
    imageUrl: null,
    overview: null,
  }
}

/** 호출 기록을 남기는 가짜 DB. */
function fakeDb() {
  const upserted: Attraction[] = []
  const marked: { code: string; attractions: number; restaurants: number }[] = []
  const db: IngestDb = {
    async upsertAttractions(rows) {
      upserted.push(...rows)
    },
    async markIngested(code, counts) {
      marked.push({ code, ...counts })
    },
  }
  return { db, upserted, marked }
}

/** 시각을 손으로 돌리는 시계. 시군구를 하나 끝낼 때마다 step만큼 흐른다. */
function fakeClock(step: number) {
  let t = 0
  return {
    now: () => t,
    tick: () => {
      t += step
    },
  }
}

function deps(overrides: Partial<IngestDeps> & { onRegion?: () => void }): IngestDeps {
  const { db } = fakeDb()
  return {
    client: {
      async listByArea(_area, type, regionCode) {
        overrides.onRegion?.()
        return [attraction(`${regionCode}-${type}`, type, regionCode)]
      },
      async getOverview() {
        return '설명'
      },
    },
    db,
    now: () => 0,
    ...overrides,
  }
}

test('대상 시군구를 전부 처리한다', async () => {
  const { db, upserted, marked } = fakeDb()
  const result = await ingestRegions(TARGETS, {
    ...deps({}),
    db,
  })

  assert.deepEqual(result.processed, ['42150', '42210', '42230'])
  assert.deepEqual(result.skipped, [])
  // 시군구마다 관광지 1 + 음식점 1
  assert.equal(upserted.length, 6)
  assert.equal(result.upserted, 6)
  assert.equal(marked.length, 3)
})

test('관광지 건수와 음식점 건수를 따로 센다', async () => {
  const { db, marked } = fakeDb()
  await ingestRegions([TARGETS[0]], { ...deps({}), db })

  assert.deepEqual(marked[0], { code: '42150', attractions: 1, restaurants: 1 })
})

test('관광지에만 overview를 채운다 — 음식점은 detailCommon을 부르지 않는다', async () => {
  const { db, upserted } = fakeDb()
  let overviewCalls = 0
  await ingestRegions([TARGETS[0]], {
    ...deps({}),
    db,
    client: {
      async listByArea(_area, type, regionCode) {
        return [attraction(`${regionCode}-${type}`, type, regionCode)]
      },
      async getOverview() {
        overviewCalls += 1
        return '조선 왕조 제일의 법궁.'
      },
    },
  })

  assert.equal(overviewCalls, 1)
  assert.equal(upserted.find((a) => a.contentTypeId === 12)?.overview, '조선 왕조 제일의 법궁.')
  assert.equal(upserted.find((a) => a.contentTypeId === 39)?.overview, null)
})

test('시간 예산을 넘으면 남은 지역을 미처리로 남긴다', async () => {
  const { db, marked } = fakeDb()
  // 시군구 하나에 예산의 절반이 든다 → 두 번째까지 하면 남은 예산이 한 건치보다 적다.
  const clock = fakeClock(REGION_BUDGET_MS)
  const result = await ingestRegions(TARGETS, {
    ...deps({ onRegion: () => clock.tick() }),
    db,
    now: clock.now,
    budgetMs: REGION_BUDGET_MS * 2,
  })

  assert.ok(result.processed.length < TARGETS.length, '전부 처리해 버렸다')
  assert.deepEqual(
    [...result.processed, ...result.skipped].sort(),
    TARGETS.map((t) => t.code).sort(),
    '처리 + 미처리가 대상 전체와 같아야 한다',
  )
  // 미처리 지역은 markIngested를 부르지 않는다 — 그래야 다음 실행이 다시 집는다.
  assert.equal(marked.length, result.processed.length)
})

test('한 시군구가 실패해도 나머지는 계속 처리한다', async () => {
  const { db, marked } = fakeDb()
  const result = await ingestRegions(TARGETS, {
    ...deps({}),
    db,
    client: {
      async listByArea(_area, type, regionCode) {
        if (regionCode === '42210') throw new TourApiError('일시 오류', '0001')
        return [attraction(`${regionCode}-${type}`, type, regionCode)]
      },
      async getOverview() {
        return null
      },
    },
  })

  assert.deepEqual(result.processed, ['42150', '42230'])
  assert.deepEqual(result.skipped, ['42210'])
  assert.equal(marked.length, 2)
})

test('한도 초과는 즉시 중단한다 — 재시도해도 소용없는 오류다', async () => {
  const { db } = fakeDb()
  const result = await ingestRegions(TARGETS, {
    ...deps({}),
    db,
    client: {
      async listByArea() {
        throw new TourApiError('한도 초과', '22', true)
      },
      async getOverview() {
        return null
      },
    },
  })

  assert.equal(result.limitExceeded, true)
  assert.deepEqual(result.processed, [])
  assert.deepEqual(result.skipped, ['42150', '42210', '42230'])
})

test('대상이 없으면 아무것도 하지 않는다', async () => {
  const { db, upserted } = fakeDb()
  const result = await ingestRegions([], { ...deps({}), db })

  assert.deepEqual(result.processed, [])
  assert.equal(upserted.length, 0)
})
