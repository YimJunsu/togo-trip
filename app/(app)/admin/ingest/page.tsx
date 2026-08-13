import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowClockwiseIcon } from '@phosphor-icons/react/dist/ssr'
import { actionButtonClass } from '@/components/dashboard/ActionButton'
import { IngestRunList } from '@/components/dashboard/IngestRunList'
import type { IngestRun } from '@/lib/data/types'
import { pageMetadata } from '@/lib/seo/metadata'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { formatDateTime } from '@/lib/utils/format'

export const metadata = pageMetadata({
  title: '적재 이력',
  description: '공공데이터 관광정보 적재 실행 이력.',
  path: '/admin/ingest',
  noIndex: true,
})

export const dynamic = 'force-dynamic'

type RunRow = {
  id: number
  started_at: string
  finished_at: string | null
  region_codes: string[] | null
  upserted: number
  trigger: string
  status: string
  error: string | null
}

export default async function AdminIngestPage() {
  const supabase = await createSupabaseServerClient()

  // 권한 판정의 원본은 RLS다. 관리자가 아닌 세션은 이 쿼리가 빈 결과를 받는다.
  // 아래 notFound()는 두 번째 방어선이고, 403이 아니라 404로 떨어뜨린다 —
  // 403은 "여기 무언가 있다"를 알려준다.
  const [{ data: profile }, { data: runRows }, { data: regionRows }] = await Promise.all([
    supabase.from('profiles').select('is_admin').maybeSingle(),
    supabase
      .from('ingest_runs')
      .select('id, started_at, finished_at, region_codes, upserted, trigger, status, error')
      .order('id', { ascending: false })
      .limit(50),
    supabase.from('regions').select('ingested_at'),
  ])

  if (!profile?.is_admin) notFound()

  const runs: IngestRun[] = (runRows ?? []).map((row: RunRow) => ({
    id: row.id,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    regionCodes: row.region_codes ?? [],
    upserted: row.upserted,
    trigger: row.trigger === 'read_through' ? 'read_through' : 'cron',
    status: row.status === 'ok' ? 'ok' : row.status === 'failed' ? 'failed' : 'running',
    error: row.error,
  }))

  const total = regionRows?.length ?? 0
  const done = (regionRows ?? []).filter((r) => r.ingested_at !== null).length
  const lastRun = runs[0]

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">
            적재 이력
          </h1>
          <p className="text-muted mt-1 text-sm">
            공공데이터 관광정보 적재 실행 기록입니다.
          </p>
        </div>
        {/* 라임은 이 화면에서 여기 하나뿐이다 (DESIGN_SYSTEM §1). */}
        <Link href="/admin/ingest" className={actionButtonClass({ tone: 'lime' })}>
          <ArrowClockwiseIcon size={18} weight="bold" aria-hidden />
          새로고침
        </Link>
      </header>

      <dl className="bg-surface rounded-card border-line shadow-soft divide-line grid grid-cols-1 divide-y border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        <div className="px-5 py-4">
          <dt className="text-muted text-xs">적재 완료</dt>
          <dd className="font-display mt-1 text-2xl font-semibold tracking-tight">
            {done}
            <span className="text-muted ml-1 text-sm font-normal">시군구</span>
          </dd>
        </div>
        <div className="px-5 py-4">
          <dt className="text-muted text-xs">남은 지역</dt>
          <dd className="font-display mt-1 text-2xl font-semibold tracking-tight">
            {total - done}
            <span className="text-muted ml-1 text-sm font-normal">시군구</span>
          </dd>
        </div>
        <div className="px-5 py-4">
          <dt className="text-muted text-xs">마지막 실행</dt>
          <dd className="font-display mt-1 font-mono text-sm tracking-widest">
            {lastRun ? formatDateTime(lastRun.startedAt) : '—'}
          </dd>
        </div>
      </dl>

      <IngestRunList runs={runs} />
    </div>
  )
}
