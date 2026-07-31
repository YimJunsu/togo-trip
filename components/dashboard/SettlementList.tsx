'use client'

import { useState, useTransition } from 'react'
import {
  ArrowRightIcon,
  CalculatorIcon,
  CheckIcon,
} from '@phosphor-icons/react'
import { EmptyState } from '@/components/dashboard/EmptyState'
import { Avatar } from '@/components/ui/Avatar'
import type { Member } from '@/lib/data/types'
import { toggleSettlementPaid } from '@/lib/settlements/actions'
import { cn } from '@/lib/utils/cn'
import { formatWon } from '@/lib/utils/format'

/**
 * 이 목록이 실제로 그리는 것. 확정된 송금(Settlement)은 이 모양을 만족한다.
 * 확정 **전** 미리보기(SettleTransfer)는 아직 저장된 적이 없어 id·isPaid가 없다 —
 * 그래서 둘 다 여기로 들어올 수 있게 두 필드를 선택으로 둔다. id가 없는 행은
 * 보냄 체크를 걸 대상 자체가 없으므로 토글도 자연히 잠긴다.
 */
export type SettlementRow = {
  id?: string
  from: string
  to: string
  amount: number
  isPaid?: boolean
}

/** "누가 누구에게 얼마". 계산은 여기서 하지 않는다 — 이미 계산된 목록을 받아 그린다. */
export function SettlementList({
  settlements,
  members,
  tripId,
  currentUserId,
  onToggled,
}: {
  settlements: SettlementRow[]
  members: Member[]
  /** 셋이 다 있을 때만 보냄 체크박스가 뜬다. 요약 자리(TripDetailTabs)는 넘기지 않는다. */
  tripId?: string
  currentUserId?: string
  /** 바뀐 행을 넘기지 않는다. 목록은 부모가 서버에서 다시 받는다. */
  onToggled?: () => void
}) {
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState<string>()
  const canToggle = Boolean(tripId && currentUserId && onToggled)

  if (settlements.length === 0) {
    // 확정된 방(tripId·currentUserId가 있는 자리)에서 송금이 0건인 건 지출을 안
    // 넣어서가 아니라, 다 같이 정확히 엔빵이 맞아 주고받을 게 없는 경우다.
    // "지출을 넣으라"는 안내는 이미 지출도 있고 확정도 끝난 사람에게는 실행할
    // 수 없는 조언이라 잠긴 방에는 다른 문구를 쓴다.
    const isSettled = canToggle
    return (
      <EmptyState
        icon={CalculatorIcon}
        title="정산할 게 없습니다"
        description={
          isSettled
            ? '다 같이 정확히 나눠 냈습니다. 주고받을 돈이 없습니다.'
            : '지출을 넣으면 누가 누구에게 얼마를 보낼지 여기 나옵니다.'
        }
      />
    )
  }

  const nameOf = (id: string) =>
    members.find((m) => m.userId === id)?.displayName ?? '알 수 없음'

  function toggle(settlement: SettlementRow) {
    // id가 없으면 아직 저장되지 않은 미리보기 행이다. 서버에 바꿀 대상이 없다.
    if (!tripId || !onToggled || !settlement.id) return
    const settlementId = settlement.id
    startTransition(async () => {
      try {
        await toggleSettlementPaid(tripId, settlementId, !settlement.isPaid)
        onToggled()
        setMessage(undefined)
      } catch {
        // 당사자가 아니거나, 일시적 오류거나, 그 사이 행이 사라졌을 수도 있다.
        // 원인을 가리지 말고 실패했다는 사실만이라도 사용자에게 알린다.
        setMessage('상태를 바꾸지 못했습니다. 잠시 후 다시 시도해 주세요.')
      }
    })
  }

  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col gap-3">
        {settlements.map((s, i) => {
          // 남의 송금을 "보냈다"고 표시할 수 없다. 서버도 같은 검사를 한다.
          const isParty = s.from === currentUserId || s.to === currentUserId
          return (
            <li
              // 미리보기 행에는 id가 없다. 한 사람이 같은 사람에게 두 번 보내는 일은
              // 송금 최소화(minimizeTransfers)가 만들지 않으므로 from→to로 충분하다.
              key={s.id ?? `${s.from}-${s.to}`}
              style={{ animationDelay: `${i * 70}ms` }}
              className={cn(
                'rounded-card border-line bg-surface animate-rise flex items-center gap-3 border p-4',
                s.isPaid && 'opacity-60',
              )}
            >
              <Person name={nameOf(s.from)} />
              <ArrowRightIcon
                size={16}
                weight="bold"
                className="text-muted shrink-0"
                aria-label="에게 보냄"
              />
              <Person name={nameOf(s.to)} />
              <span
                className={cn(
                  'ml-auto font-mono font-semibold',
                  s.isPaid && 'line-through',
                )}
              >
                {formatWon(s.amount)}
              </span>
              {canToggle && s.id ? (
                <button
                  type="button"
                  disabled={!isParty || isPending}
                  onClick={() => toggle(s)}
                  aria-pressed={s.isPaid}
                  aria-label={`${nameOf(s.from)}이 ${nameOf(s.to)}에게 보냄`}
                  title={
                    isParty
                      ? undefined
                      : '본인이 주고받는 송금만 표시할 수 있습니다'
                  }
                  className={cn(
                    'inline-flex size-7 shrink-0 items-center justify-center rounded-full',
                    'transition duration-200 ease-out active:scale-[0.98]',
                    'disabled:cursor-not-allowed disabled:opacity-40',
                    s.isPaid
                      ? 'bg-lime text-ink'
                      : 'border-line text-muted border',
                  )}
                >
                  <CheckIcon size={14} weight="bold" aria-hidden />
                </button>
              ) : null}
            </li>
          )
        })}
      </ul>

      {message ? (
        <p role="alert" className="text-danger text-sm">
          {message}
        </p>
      ) : null}
    </div>
  )
}

function Person({ name }: { name: string }) {
  return (
    <span className="flex items-center gap-2">
      <Avatar name={name} size="sm" />
      <span className="font-medium">{name}</span>
    </span>
  )
}
