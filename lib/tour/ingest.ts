// 이 파일은 ingest.test.ts가 직접 로드한다. @/ 는 타입으로만, 상대 경로는 .ts 확장자로.
// 실 의존성 조립은 ingestDeps.ts에 있다 — 여기서 값으로 끌어오면 pnpm test가 깨진다.
import type { Attraction } from '@/lib/data/types'
import type { TourClient } from './client.ts'
import { TourApiError } from './parse.ts'

/** 시군구 하나를 처리하는 데 잡는 예상 시간. 남은 예산이 이보다 적으면 멈춘다. */
export const REGION_BUDGET_MS = 12_000

/** Vercel Hobby의 함수 실행시간 상한(60초대)에서 안전 여유를 뺀 값. */
export const DEFAULT_BUDGET_MS = 45_000

/** overview는 건별 호출이라 비싸다. 관광지 상위 N건만 채운다. */
export const OVERVIEW_LIMIT = 5

export type IngestTarget = {
  code: string
  areaCode: number
  sigunguCode: number | null
}

/** 쓰기 경로. 테스트에서 가짜로 갈아끼운다. */
export interface IngestDb {
  upsertAttractions(rows: Attraction[]): Promise<void>
  markIngested(
    code: string,
    counts: { attractions: number; restaurants: number },
  ): Promise<void>
}

export type IngestDeps = {
  client: TourClient
  db: IngestDb
  /** 주입 가능한 시계. 테스트가 시간을 손으로 돌린다. */
  now: () => number
  budgetMs?: number
}

export type IngestResult = {
  processed: string[]
  skipped: string[]
  upserted: number
  limitExceeded: boolean
}

/**
 * 시군구 N개를 적재한다. cron과 read-through가 **같은 함수**를 쓴다 —
 * 경로가 둘인데 로직이 둘이면 반드시 갈라진다.
 *
 * 재실행 안전성이 이 설계의 핵심이다. 처리된 시군구만 ingested_at이 찍히므로
 * 타임아웃으로 프로세스가 죽어도 결과는 같다. 그래서 별도 재시도 큐를 두지 않는다.
 */
export async function ingestRegions(
  targets: IngestTarget[],
  deps: IngestDeps,
): Promise<IngestResult> {
  const { client, db, now } = deps
  const budgetMs = deps.budgetMs ?? DEFAULT_BUDGET_MS
  const startedAt = now()

  const processed: string[] = []
  const skipped: string[] = []
  let upserted = 0
  let limitExceeded = false

  for (const [index, target] of targets.entries()) {
    if (limitExceeded) {
      skipped.push(target.code)
      continue
    }

    // 첫 건은 무조건 시도한다 — 예산이 빠듯하다고 아무것도 안 하면 진도가 안 나간다.
    const elapsed = now() - startedAt
    if (index > 0 && budgetMs - elapsed < REGION_BUDGET_MS) {
      skipped.push(target.code)
      continue
    }

    try {
      const rows = await ingestOne(target, client)
      if (rows.length > 0) await db.upsertAttractions(rows)
      await db.markIngested(target.code, {
        attractions: rows.filter((r) => r.contentTypeId === 12).length,
        restaurants: rows.filter((r) => r.contentTypeId === 39).length,
      })
      processed.push(target.code)
      upserted += rows.length
    } catch (error) {
      // 한 시군구가 실패해도 나머지는 계속 처리한다. 실패한 지역만 ingested_at이
      // 비어 다음 실행 대상으로 남는다.
      skipped.push(target.code)
      if (error instanceof TourApiError && error.limitExceeded) {
        limitExceeded = true
      }
    }
  }

  return { processed, skipped, upserted, limitExceeded }
}

/** 한 시군구당 API 콜: 관광지 목록 1 + 음식점 목록 1 + overview 5 = 7콜. */
async function ingestOne(
  target: IngestTarget,
  client: TourClient,
): Promise<Attraction[]> {
  const area = { areaCode: target.areaCode, sigunguCode: target.sigunguCode }

  const [spots, restaurants] = await Promise.all([
    client.listByArea(area, 12, target.code),
    client.listByArea(area, 39, target.code),
  ])

  // overview는 지역 페이지 본문의 재료다. 건별 호출이라 관광지 상위 N건만 채운다.
  const withOverview = await Promise.all(
    spots.slice(0, OVERVIEW_LIMIT).map(async (spot) => ({
      ...spot,
      overview: await client.getOverview(spot.contentId).catch(() => null),
    })),
  )

  return [...withOverview, ...spots.slice(OVERVIEW_LIMIT), ...restaurants]
}
