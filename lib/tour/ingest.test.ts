import { test } from 'node:test'
import assert from 'node:assert/strict'
import type { Attraction } from '@/lib/data/types'
import { TourApiError } from './parse.ts'
import {
  REGION_BUDGET_MS,
  OVERVIEW_LIMIT,
  ingestRegions,
  type IngestDb,
  type IngestDeps,
} from './ingest.ts'

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
  const marked: {
    code: string
    attractions: number
    restaurants: number
    overviews: number
  }[] = []
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

  assert.deepEqual(marked[0], { code: '42150', attractions: 1, restaurants: 1, overviews: 1 })
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

test('overview는 상위 OVERVIEW_LIMIT건까지만 부른다 — 건별 API 콜이라 비용이 직결된다', async () => {
  const { db } = fakeDb()
  let overviewCalls = 0
  await ingestRegions([TARGETS[0]], {
    ...deps({}),
    db,
    client: {
      async listByArea(_area, type, regionCode) {
        // 관광지 8건. slice(0, OVERVIEW_LIMIT)이 사라지면 8번 부르게 된다.
        return type === 12
          ? Array.from({ length: 8 }, (_, i) =>
              attraction(`${regionCode}-12-${i}`, 12, regionCode),
            )
          : []
      },
      async getOverview() {
        overviewCalls += 1
        return '설명'
      },
    },
  })

  assert.equal(overviewCalls, OVERVIEW_LIMIT)
})

test('실패한 지역은 사유를 남긴다 — 구조적 버그와 일시적 장애를 구분해야 한다', async () => {
  const { db } = fakeDb()
  const result = await ingestRegions(TARGETS, {
    ...deps({}),
    db,
    client: {
      async listByArea(_area, type, regionCode) {
        if (regionCode === '42210') throw new Error('column "titel" does not exist')
        return [attraction(`${regionCode}-${type}`, type, regionCode)]
      },
      async getOverview() {
        return null
      },
    },
  })

  assert.deepEqual(result.failures, [
    { code: '42210', message: 'column "titel" does not exist' },
  ])
})

test('예산이 모자라 건너뛴 지역은 실패가 아니다', async () => {
  const { db } = fakeDb()
  const clock = fakeClock(REGION_BUDGET_MS)
  const result = await ingestRegions(TARGETS, {
    ...deps({ onRegion: () => clock.tick() }),
    db,
    now: clock.now,
    budgetMs: REGION_BUDGET_MS,
  })

  assert.ok(result.skipped.length > 0, '건너뛴 지역이 없다')
  assert.deepEqual(result.failures, [], '예산 초과는 failures에 들어가면 안 된다')
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

test('같은 TourAPI 지역을 공유하는 시군구는 한 번만 호출하고 결과를 전부에 쓴다', async () => {
  const { db, upserted, marked } = fakeDb()
  let listCalls = 0
  const result = await ingestRegions(
    [
      { code: '31011', areaCode: 31, sigunguCode: 13 },
      { code: '31012', areaCode: 31, sigunguCode: 13 },
      { code: '31013', areaCode: 31, sigunguCode: 13 },
    ],
    {
      ...deps({}),
      db,
      client: {
        async listByArea(_area, type, regionCode) {
          listCalls += 1
          return [attraction(`${regionCode}-${type}`, type, regionCode)]
        },
        async getOverview() {
          return null
        },
      },
    },
  )

  // 관광지 목록 1 + 음식점 목록 1 = 2콜. 시군구 수와 무관하다.
  assert.equal(listCalls, 2)
  assert.deepEqual(result.processed, ['31011', '31012', '31013'])
  // 관광지 1 + 맛집 1 을 시군구 3개에 복제 = 6행
  assert.equal(upserted.length, 6)
  assert.deepEqual([...new Set(upserted.map((a) => a.regionCode))].sort(), [
    '31011',
    '31012',
    '31013',
  ])
  // 건수는 코드마다 같아야 한다 — 복제분을 그대로 세면 3배가 된다.
  assert.deepEqual(marked, [
    { code: '31011', attractions: 1, restaurants: 1, overviews: 0 },
    { code: '31012', attractions: 1, restaurants: 1, overviews: 0 },
    { code: '31013', attractions: 1, restaurants: 1, overviews: 0 },
  ])
})

test('그룹이 실패하면 소속 시군구 전부가 사유와 함께 남는다', async () => {
  const { db, marked } = fakeDb()
  const result = await ingestRegions(
    [
      { code: '31011', areaCode: 31, sigunguCode: 13 },
      { code: '31012', areaCode: 31, sigunguCode: 13 },
    ],
    {
      ...deps({}),
      db,
      client: {
        async listByArea() {
          throw new Error('수원 그룹 실패')
        },
        async getOverview() {
          return null
        },
      },
    },
  )

  assert.deepEqual(result.skipped, ['31011', '31012'])
  assert.deepEqual(result.failures, [
    { code: '31011', message: '수원 그룹 실패' },
    { code: '31012', message: '수원 그룹 실패' },
  ])
  assert.equal(marked.length, 0)
})

test('그룹 중간에 markIngested가 실패해도 성공한 코드는 실패로 되돌리지 않는다', async () => {
  const upserted: Attraction[] = []
  const marked: string[] = []
  const db: IngestDb = {
    async upsertAttractions(rows) {
      upserted.push(...rows)
    },
    async markIngested(code) {
      // 두 번째 코드에서만 터진다.
      if (code === '31012') throw new Error('regions 갱신 실패(31012)')
      marked.push(code)
    },
  }

  const result = await ingestRegions(
    [
      { code: '31011', areaCode: 31, sigunguCode: 13 },
      { code: '31012', areaCode: 31, sigunguCode: 13 },
      { code: '31013', areaCode: 31, sigunguCode: 13 },
    ],
    {
      ...deps({}),
      db,
      client: {
        async listByArea(_area, type, regionCode) {
          return [attraction(`${regionCode}-${type}`, type, regionCode)]
        },
        async getOverview() {
          return null
        },
      },
    },
  )

  // 성공한 둘은 processed에만, 실패한 하나는 skipped에만 있어야 한다.
  assert.deepEqual(result.processed, ['31011', '31013'])
  assert.deepEqual(result.skipped, ['31012'])
  assert.deepEqual(marked, ['31011', '31013'])
  assert.equal(result.failures.length, 1)
  assert.equal(result.failures[0].code, '31012')

  // 같은 코드가 양쪽에 들어가면 이력이 거짓말을 한다.
  const both = result.processed.filter((c) => result.skipped.includes(c))
  assert.deepEqual(both, [], 'processed와 skipped에 같은 코드가 있다')

  // upsert는 이미 성공했다. markIngested 실패로 건수를 깎으면 실제보다 적게 보고된다.
  assert.equal(result.upserted, upserted.length)
})
