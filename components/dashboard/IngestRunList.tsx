import type { IngestRun } from '@/lib/data/types'
import { formatDateTime } from '@/lib/utils/format'

const STATUS_LABEL: Record<IngestRun['status'], string> = {
  running: '진행중',
  ok: '성공',
  failed: '실패',
}

const TRIGGER_LABEL: Record<IngestRun['trigger'], string> = {
  cron: '정기',
  read_through: '즉석',
}

/**
 * 적재 실행 이력. 카드를 쌓지 않고 하나의 카드 안에서 구분선으로 나눈다 (DESIGN_SYSTEM §2).
 * 상태는 색만으로 전달하지 않는다 — 텍스트 배지를 쓰고 실패에만 danger를 더한다 (§4).
 */
export function IngestRunList({ runs }: { runs: IngestRun[] }) {
  if (runs.length === 0) {
    return (
      <p className="text-muted text-sm">
        아직 적재 기록이 없습니다. cron이 처음 도는 새벽 3시 이후에 채워집니다.
      </p>
    )
  }

  return (
    <div className="bg-surface rounded-card border-line shadow-soft divide-line divide-y border">
      {runs.map((run) => (
        <div key={run.id} className="px-5 py-4">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="text-muted font-mono text-xs tracking-widest">
              {formatDateTime(run.startedAt)}
            </span>
            <span
              className={
                run.status === 'failed'
                  ? 'text-danger font-display text-xs font-semibold'
                  : 'text-muted font-display text-xs font-semibold'
              }
            >
              {STATUS_LABEL[run.status]}
            </span>
            <span className="bg-ink/5 text-ink rounded-full px-2 py-0.5 text-xs">
              {TRIGGER_LABEL[run.trigger]}
            </span>
            <span className="text-muted text-xs">{run.upserted}건 적재</span>
            <span className="text-muted text-xs">{duration(run)}</span>
          </div>

          <p className="text-muted mt-1 text-xs">
            대상 {run.regionCodes.length}곳
            {run.regionCodes.length > 0 && ` · ${run.regionCodes.join(', ')}`}
          </p>

          {run.error && (
            <details className="mt-2">
              <summary className="text-danger cursor-pointer text-xs font-semibold">
                오류 내용 보기
              </summary>
              <pre className="text-muted rounded-inner bg-paper mt-1.5 overflow-x-auto p-3 font-mono text-xs whitespace-pre-wrap">
                {run.error}
              </pre>
            </details>
          )}
        </div>
      ))}
    </div>
  )
}

function duration(run: IngestRun): string {
  if (!run.finishedAt) return '—'
  const ms = new Date(run.finishedAt).getTime() - new Date(run.startedAt).getTime()
  return `${(ms / 1000).toFixed(1)}초`
}
