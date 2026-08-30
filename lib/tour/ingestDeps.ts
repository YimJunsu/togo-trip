import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { tourClient } from './client'
import type { IngestDb, IngestDeps } from './ingest'

/** 실 Supabase 쓰기 구현. service role 키를 쓰므로 서버에서만 호출한다. */
export function createIngestDb(): IngestDb {
  const admin = createSupabaseAdminClient()

  return {
    async upsertAttractions(rows) {
      const { error } = await admin.from('attractions').upsert(
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
  }
}

/** 실 의존성 묶음. cron 라우트와 read-through가 함께 쓴다. */
export function createIngestDeps(budgetMs?: number): IngestDeps {
  return {
    client: tourClient,
    db: createIngestDb(),
    now: () => Date.now(),
    budgetMs,
  }
}
