import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { tourClient } from './client'
import { createIngestDb } from './ingestDb'
import type { IngestDeps } from './ingest'

/** 실 의존성 묶음. cron 라우트와 read-through가 함께 쓴다. */
export function createIngestDeps(budgetMs?: number): IngestDeps {
  return {
    client: tourClient,
    db: createIngestDb(createSupabaseAdminClient()),
    now: () => Date.now(),
    budgetMs,
  }
}
