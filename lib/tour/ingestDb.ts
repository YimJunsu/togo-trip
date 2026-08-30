import type { SupabaseClient } from '@supabase/supabase-js'
import type { IngestDb } from './ingest.ts'

/**
 * 실 Supabase 쓰기 구현. 클라이언트를 주입받는다 — `@/lib/supabase/admin`을 값으로
 * 끌어오면 순수 node(`pnpm test`, `scripts/bulk-ingest.mjs`)가 `@/` 별칭을 풀지 못해
 * ERR_MODULE_NOT_FOUND로 죽는다. 주입으로 바꿔 두면 구현이 한 벌로 유지되고
 * tsconfig의 타입 검사도 받는다.
 */
export function createIngestDb(admin: SupabaseClient): IngestDb {
  return {
    async upsertAttractions(rows) {
      // 같은 (content_id, region_code)가 한 배치에 두 번 들어오면 Postgres가
      // "ON CONFLICT DO UPDATE command cannot affect row a second time"로
      // 배치 전체를 거부한다. 마지막 것만 남긴다.
      const unique = new Map(
        rows.map((r) => [`${r.contentId}/${r.regionCode}`, r] as const),
      )

      const { error } = await admin.from('attractions').upsert(
        [...unique.values()].map((r) => ({
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
        // 복합키다. content_id만 쓰면 같은 TourAPI 지역을 공유하는 구들이
        // 서로의 행을 덮어쓴다.
        { onConflict: 'content_id,region_code' },
      )
      if (error) throw new Error(`attractions upsert 실패: ${error.message}`)
    },

    async markIngested(code, counts) {
      const nowIso = new Date().toISOString()
      const { error } = await admin
        .from('regions')
        .update({
          ingested_at: nowIso,
          // 갱신 주기 계산의 기준. 최초 적재와 재적재를 구분하지 않고 매번 찍는다 —
          // cron 3순위가 "가장 오래 안 건드린 지역"을 고르는 데 쓴다.
          refreshed_at: nowIso,
          attraction_count: counts.attractions,
          restaurant_count: counts.restaurants,
          // cron 2순위가 이 값만 보고 overview 부족한 지역을 고른다.
          overview_count: counts.overviews,
          // 성공했으므로 실패 이력을 지운다.
          attempt_count: 0,
          last_error: null,
        })
        .eq('code', code)
      if (error) throw new Error(`regions 갱신 실패(${code}): ${error.message}`)
    },

    async markEmpty(code, message) {
      // TourAPI가 0건을 준 지역. ingested_at은 찍지 않는다 — 내용이 없으므로
      // sitemap에 올라가면 안 된다.
      //
      // 하지만 refreshed_at은 찍고 attempt_count는 올린다. 안 그러면 이 지역이
      // 큐 맨 앞에 영원히 눌러앉아 매일 같은 0건을 다시 받는다. 그런 지역이
      // BATCH만큼 쌓이면 2·3순위가 영영 실행되지 않아 갱신이 통째로 멈춘다.
      const { data: row } = await admin
        .from('regions')
        .select('attempt_count')
        .eq('code', code)
        .maybeSingle()

      const { error } = await admin
        .from('regions')
        .update({
          refreshed_at: new Date().toISOString(),
          attempt_count: (row?.attempt_count ?? 0) + 1,
          last_error: message,
        })
        .eq('code', code)
      if (error) throw new Error(`regions 0건 기록 실패(${code}): ${error.message}`)
    },
  }
}
