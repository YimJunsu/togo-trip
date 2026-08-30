'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ActionButton } from '@/components/dashboard/ActionButton'
import { Avatar } from '@/components/ui/Avatar'
import type { Member } from '@/lib/data/types'
import type { SettleResult } from '@/lib/settle/settle'
import { previewSettlement, startSettlement } from '@/lib/settlements/actions'
import { formatWon } from '@/lib/utils/format'

export function StartSettleDialog({
  tripId,
  members,
  isDisabled,
  onPreviewOpenChange,
}: {
  tripId: string
  members: Member[]
  /** 지출이 없으면 정산할 게 없다. */
  isDisabled: boolean
  /** 미리보기가 열리고 닫힐 때 부모에 알린다. 부모가 이 동안 지출 편집 UI를 잠그기 위함이다. */
  onPreviewOpenChange?: (isOpen: boolean) => void
}) {
  const router = useRouter()
  const [preview, setPreview] = useState<SettleResult>()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string>()

  const nameOf = (id: string) =>
    members.find((m) => m.userId === id)?.displayName ?? '알 수 없음'

  function openPreview() {
    startTransition(async () => {
      try {
        setPreview(await previewSettlement(tripId))
        setError(undefined)
        // 미리보기가 보여준 숫자는 확정 버튼을 누를 때도 그대로여야 한다.
        // 부모가 이 동안 지출 추가/삭제 UI를 잠그도록 알린다.
        onPreviewOpenChange?.(true)
      } catch {
        setError('계산하지 못했습니다. 잠시 후 다시 시도해 주세요.')
      }
    })
  }

  function confirm() {
    startTransition(async () => {
      try {
        await startSettlement(tripId)
        // 확정되면 화면 전체가 잠긴 상태로 바뀐다. 서버 컴포넌트를 다시 실행해
        // 최신 props를 받는다 (MemberList가 정착시킨 패턴, 전체 리로드 대신).
        router.refresh()
      } catch {
        setError('정산을 확정하지 못했습니다.')
      }
    })
  }

  if (!preview) {
    return (
      <div className="flex flex-col gap-2">
        <ActionButton
          tone="ink"
          size="lg"
          onClick={openPreview}
          disabled={isDisabled || isPending}
        >
          {isPending ? '계산 중…' : '정산 시작'}
        </ActionButton>
        <p className="text-muted text-xs">
          누르면 결과를 먼저 보여드립니다. 거기서 확정할 수 있습니다.
        </p>
        {error ? <p className="text-danger text-sm">{error}</p> : null}
      </div>
    )
  }

  return (
    <div className="rounded-card border-line bg-surface shadow-soft animate-rise flex flex-col gap-5 border p-5">
      <div>
        <h3 className="font-display text-lg font-semibold tracking-tight">
          이렇게 나뉩니다
        </h3>
        <p className="text-muted mt-1 text-sm">
          확정하면 지출을 더 고칠 수 없습니다.
        </p>
      </div>

      <ul className="divide-line divide-y">
        {preview.shares.map((share) => (
          <li key={share.userId} className="flex items-center gap-3 py-3">
            <Avatar name={nameOf(share.userId)} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="font-medium">{nameOf(share.userId)}</p>
              <p className="text-muted text-xs">
                낸 돈 {formatWon(share.paid)} · 부담 {formatWon(share.owed)}
                {Math.round(share.adjustment) !== 0
                  ? share.adjustment < 0
                    ? ` · 할인 ${formatWon(share.adjustment)}`
                    : ` · 분담 +${formatWon(share.adjustment)}`
                  : ''}
              </p>
            </div>
            <p className="font-mono text-sm font-semibold">
              {share.net >= 0 ? '받을 ' : '보낼 '}
              {formatWon(Math.abs(share.net))}
            </p>
          </li>
        ))}
      </ul>

      <div>
        <p className="text-muted mb-2 text-sm font-medium">송금</p>
        <ul className="flex flex-col gap-1.5">
          {preview.transfers.map((t, i) => (
            <li key={`${t.from}-${t.to}-${i}`} className="text-sm">
              {nameOf(t.from)} → {nameOf(t.to)}{' '}
              <span className="font-mono font-semibold">
                {formatWon(t.amount)}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex gap-3">
        <ActionButton
          tone="accent"
          className="flex-1"
          onClick={confirm}
          disabled={isPending}
        >
          {isPending ? '확정 중…' : '확정하기'}
        </ActionButton>
        <ActionButton
          tone="quiet"
          onClick={() => {
            setPreview(undefined)
            onPreviewOpenChange?.(false)
          }}
          disabled={isPending}
        >
          취소
        </ActionButton>
      </div>

      {error ? <p className="text-danger text-sm">{error}</p> : null}
    </div>
  )
}
