'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChatTeardropTextIcon } from '@phosphor-icons/react'
import { ActionButton } from '@/components/dashboard/ActionButton'
import { EmptyState } from '@/components/dashboard/EmptyState'
import type { UserRequest } from '@/lib/data/types'
import { setRequestStatus } from '@/lib/requests/actions'
import { REQUEST_KIND_LABEL } from '@/lib/requests/limits'
import { formatDateTime } from '@/lib/utils/format'

/**
 * 관리자용 요청 목록. 카드를 쌓지 않고 하나의 카드 안에서 구분선으로 나눈다
 * (DESIGN_SYSTEM §2). 처리 여부는 색이 아니라 라벨과 버튼 문구로 알린다 (§4).
 */
export function RequestList({ requests }: { requests: UserRequest[] }) {
  const router = useRouter()
  const [pendingId, setPendingId] = useState<string>()

  if (requests.length === 0) {
    return (
      <EmptyState
        icon={ChatTeardropTextIcon}
        title="아직 요청이 없어요"
        description="회원이 홈 아래에서 보낸 요청이 여기 최신순으로 쌓여요."
      />
    )
  }

  async function toggle(request: UserRequest) {
    setPendingId(request.id)
    try {
      await setRequestStatus(
        request.id,
        request.status === 'done' ? 'open' : 'done',
      )
      // 목록은 서버에서 다시 받는다. 여기서 상태를 손으로 맞추면 두 곳이 어긋난다.
      router.refresh()
    } finally {
      setPendingId(undefined)
    }
  }

  return (
    <ul className="bg-surface rounded-card border-line shadow-soft divide-line divide-y border">
      {requests.map((request) => {
        const isDone = request.status === 'done'
        return (
          <li key={request.id} className="px-5 py-4">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="bg-ink/5 text-ink rounded-full px-2 py-0.5 text-xs">
                {REQUEST_KIND_LABEL[request.kind]}
              </span>
              <span className="text-muted font-mono text-xs tracking-widest">
                {formatDateTime(request.createdAt)}
              </span>
              <span
                className={
                  isDone
                    ? 'text-muted font-display text-xs font-semibold'
                    : 'text-ink font-display text-xs font-semibold'
                }
              >
                {isDone ? '처리 완료' : '접수'}
              </span>
            </div>

            <p className="mt-2 text-sm leading-relaxed whitespace-pre-wrap">
              {request.content}
            </p>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-muted text-xs">
                {request.authorName} ·{' '}
                <a
                  href={`mailto:${request.authorEmail}`}
                  className="underline-offset-2 hover:underline"
                >
                  {request.authorEmail}
                </a>
                {request.resolvedAt &&
                  ` · 처리 ${formatDateTime(request.resolvedAt)}`}
              </p>
              <ActionButton
                tone="quiet"
                size="sm"
                disabled={pendingId === request.id}
                onClick={() => toggle(request)}
              >
                {isDone ? '접수로 되돌리기' : '처리 완료로 표시'}
              </ActionButton>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
