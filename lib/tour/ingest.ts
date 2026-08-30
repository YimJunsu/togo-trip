// 이 파일은 ingest.test.ts가 직접 로드한다. @/ 는 타입으로만, 상대 경로는 .ts 확장자로.
// 실 의존성 조립은 ingestDeps.ts에 있다 — 여기서 값으로 끌어오면 pnpm test가 깨진다.
import type { Attraction } from '@/lib/data/types'
import type { TourClient } from './client.ts'
import { groupTargets, type IngestGroup } from './group.ts'
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
    counts: { attractions: number; restaurants: number; overviews: number },
  ): Promise<void>
}

export type IngestDeps = {
  client: TourClient
  db: IngestDb
  /** 주입 가능한 시계. 테스트가 시간을 손으로 돌린다. */
  now: () => number
  budgetMs?: number
}

/** 예외로 실패한 시군구. 예산이 모자라 건너뛴 지역은 여기 들어가지 않는다. */
export type IngestFailure = { code: string; message: string }

export type IngestResult = {
  processed: string[]
  /** 미처리 지역 전부 — 예외로 실패한 것과 예산이 모자라 건너뛴 것을 함께 담는다. */
  skipped: string[]
  /**
   * 실패 사유. 이게 없으면 upsert 컬럼 오타 같은 구조적 버그가 "전 지역 skipped"로만
   * 보여서, 일시적 장애와 구분이 안 된 채 매일 조용히 반복된다.
   */
  failures: IngestFailure[]
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
  const failures: IngestFailure[] = []
  let upserted = 0
  let limitExceeded = false

  const groups = groupTargets(targets)

  for (const [index, group] of groups.entries()) {
    if (limitExceeded) {
      skipped.push(...group.codes)
      continue
    }

    // 첫 건은 무조건 시도한다 — 예산이 빠듯하다고 아무것도 안 하면 진도가 안 나간다.
    const elapsed = now() - startedAt
    if (index > 0 && budgetMs - elapsed < REGION_BUDGET_MS) {
      skipped.push(...group.codes)
      continue
    }

    try {
      const rows = await ingestGroup(group, client)
      if (rows.length > 0) await db.upsertAttractions(rows)

      // 한 번 받은 결과를 그룹의 모든 시군구에 쓴다. 건수는 코드마다 같으므로
      // 복제분을 코드 수로 나눠 원래 건수를 되돌린다.
      const perCode = group.codes.length
      const attractions = rows.filter((r) => r.contentTypeId === 12).length / perCode
      const restaurants = rows.filter((r) => r.contentTypeId === 39).length / perCode
      const overviews = rows.filter((r) => r.overview !== null).length / perCode
      for (const code of group.codes) {
        await db.markIngested(code, { attractions, restaurants, overviews })
        processed.push(code)
      }
      upserted += rows.length
    } catch (error) {
      // 한 그룹이 실패해도 나머지는 계속 처리한다. 실패한 지역만 ingested_at이
      // 비어 다음 실행 대상으로 남는다.
      const message = error instanceof Error ? error.message : String(error)
      for (const code of group.codes) {
        skipped.push(code)
        // 사유를 남기지 않으면 구조적 버그와 일시적 장애가 구분되지 않는다.
        failures.push({ code, message })
      }
      if (error instanceof TourApiError && error.limitExceeded) {
        limitExceeded = true
      }
    }
  }

  return { processed, skipped, failures, upserted, limitExceeded }
}

/**
 * 한 그룹당 API 콜: 관광지 목록 1 + 음식점 목록 1 + overview 5 = 7콜.
 * 그룹에 시군구가 여럿이면 같은 결과를 코드별로 복제해 각자 행을 갖게 한다 —
 * attractions 기본키가 (content_id, region_code)라 서로 덮어쓰지 않는다.
 */
async function ingestGroup(
  group: IngestGroup,
  client: TourClient,
): Promise<Attraction[]> {
  const area = { areaCode: group.areaCode, sigunguCode: group.sigunguCode }
  const primary = group.codes[0]

  const [spots, restaurants] = await Promise.all([
    client.listByArea(area, 12, primary),
    client.listByArea(area, 39, primary),
  ])

  // overview는 지역 페이지 본문의 재료다. 건별 호출이라 관광지 상위 N건만 채운다.
  const withOverview = await Promise.all(
    spots.slice(0, OVERVIEW_LIMIT).map(async (spot) => ({
      ...spot,
      overview: await client.getOverview(spot.contentId).catch(() => null),
    })),
  )

  const fetched = [...withOverview, ...spots.slice(OVERVIEW_LIMIT), ...restaurants]

  // 그룹에 코드가 하나면 복제할 것이 없다.
  if (group.codes.length === 1) return fetched

  return group.codes.flatMap((code) =>
    fetched.map((row) => ({ ...row, regionCode: code })),
  )
}
