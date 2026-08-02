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
        { onConflict: 'content_id' },
      )
      if (error) throw new Error(`attractions upsert 실패: ${error.message}`)
    },

    async markIngested(code, counts) {
      const { error } = await admin
        .from('regions')
        .update({
          ingested_at: new Date().toISOString(),
          attraction_count: counts.attractions,
          restaurant_count: counts.restaurants,
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
