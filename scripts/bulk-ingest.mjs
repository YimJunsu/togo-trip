// @ts-check
/**
 * 전량 선적재. Vercel 60초 제한 밖에서 돈다.
 *
 * 실행:
 *   node --env-file=.env.local --experimental-strip-types scripts/bulk-ingest.mjs
 *   node --env-file=.env.local --experimental-strip-types scripts/bulk-ingest.mjs --no-overview
 *   node --env-file=.env.local --experimental-strip-types scripts/bulk-ingest.mjs --budget 500
 *
 * 재실행 안전하다 — 처리된 지역만 ingested_at이 찍히므로 다시 돌리면 안 된
 * 것부터 이어간다. 어디까지 했는지 기억할 필요가 없다.
 */
import { createClient } from '@supabase/supabase-js'
import { ingestRegions, OVERVIEW_LIMIT } from '../lib/tour/ingest.ts'
import { groupTargets } from '../lib/tour/group.ts'
import { tourClient } from '../lib/tour/client.ts'

// lib/tour/ingestDeps.ts 를 import하지 않는다 — 그 파일은 @/lib/supabase/admin 을
// 값으로 끌어와서 순수 node가 @/ 별칭을 못 푼다 (ERR_MODULE_NOT_FOUND).
// 여기서 같은 모양의 IngestDb를 직접 조립한다.

const args = process.argv.slice(2)
const noOverview = args.includes('--no-overview')
const budgetIndex = args.indexOf('--budget')
/** TourAPI 개발계정 일일 한도. 넘기지 않도록 콜 수를 세면서 진행한다. */
const CALL_BUDGET = budgetIndex >= 0 ? Number(args[budgetIndex + 1]) : 950

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error('NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 가 없다.')
  console.error('--env-file=.env.local 을 붙였는지 확인한다.')
  process.exit(1)
}

const admin = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const { data: pending, error } = await admin
  .from('regions')
  .select('code, tour_area_code, tour_sigungu_code')
  .is('ingested_at', null)
  .order('priority')
  .order('code')

if (error) {
  console.error('regions 조회 실패:', error.message)
  process.exit(1)
}

const targets = (pending ?? []).map((r) => ({
  code: r.code,
  areaCode: r.tour_area_code,
  sigunguCode: r.tour_sigungu_code,
}))

if (targets.length === 0) {
  console.log('미적재 지역이 없다. 전부 끝났다.')
  process.exit(0)
}

const groups = groupTargets(targets)
// 그룹당 목록 2콜 + overview 5콜. --no-overview면 2콜.
const callsPerGroup = noOverview ? 2 : 2 + OVERVIEW_LIMIT
const affordable = Math.floor(CALL_BUDGET / callsPerGroup)
const plannedGroups = groups.slice(0, affordable)
const plannedCodes = plannedGroups.flatMap((g) => g.codes)

console.log(`미적재 시군구 ${targets.length}개 → ${groups.length}개 그룹`)
console.log(`그룹당 ${callsPerGroup}콜, 예산 ${CALL_BUDGET}콜`)
console.log(`이번 실행: ${plannedGroups.length}개 그룹 / 시군구 ${plannedCodes.length}개`)
if (plannedGroups.length < groups.length) {
  console.log(`남는 그룹 ${groups.length - plannedGroups.length}개는 다음 실행에서 이어간다.`)
}
console.log('')

/** ingestDeps.ts와 같은 쓰기 구현. 저쪽을 import할 수 없어 여기 한 벌 둔다. */
const db = {
  async upsertAttractions(rows) {
    const { error: upsertError } = await admin.from('attractions').upsert(
      rows.map((r) => ({
        content_id: r.contentId,
        content_type_id: r.contentTypeId,
        region_code: r.regionCode,
        title: r.title,
        addr: r.addr,
        lat: r.coords?.[0] ?? null,
        lng: r.coords?.[1] ?? null,
        image_url: r.imageUrl,
        overview: r.overview,
        updated_at: new Date().toISOString(),
      })),
      { onConflict: 'content_id,region_code' },
    )
    if (upsertError) throw new Error(`attractions upsert 실패: ${upsertError.message}`)
  },
  async markIngested(code, counts) {
    const nowIso = new Date().toISOString()
    const { error: updateError } = await admin
      .from('regions')
      .update({
        ingested_at: nowIso,
        refreshed_at: nowIso,
        attraction_count: counts.attractions,
        restaurant_count: counts.restaurants,
        overview_count: counts.overviews,
        attempt_count: 0,
        last_error: null,
      })
      .eq('code', code)
    if (updateError) throw new Error(`regions 갱신 실패(${code}): ${updateError.message}`)
  },
}

const deps = {
  // overview를 건너뛰면 250개 페이지를 하루에 먼저 살릴 수 있다. 본문은 약 980자로
  // 800자 기준을 넘고, 나머지는 cron 2순위가 채운다.
  client: noOverview ? { ...tourClient, getOverview: async () => null } : tourClient,
  db,
  now: () => Date.now(),
  budgetMs: Number.MAX_SAFE_INTEGER,
}

const startedAt = Date.now()
const result = await ingestRegions(
  plannedGroups.flatMap((g) =>
    g.codes.map((code) => ({
      code,
      areaCode: g.areaCode,
      sigunguCode: g.sigunguCode,
    })),
  ),
  deps,
)
const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1)

console.log(`완료 ${elapsed}초`)
console.log(`  적재  ${result.processed.length}개 시군구 / ${result.upserted}행`)
console.log(`  0건   ${result.empty.length}개`)
console.log(`  실패  ${result.failures.length}개`)
for (const f of result.failures.slice(0, 10)) {
  console.log(`    ${f.code}: ${f.message}`)
}
if (result.limitExceeded) {
  console.log('')
  console.log('TourAPI 일일 한도를 넘었다. 내일 같은 명령을 다시 돌리면 이어서 간다.')
}
