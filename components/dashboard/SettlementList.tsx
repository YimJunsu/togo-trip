'use client'

import { useState, useTransition } from 'react'
import {
  ArrowRightIcon,
  CalculatorIcon,
  CheckIcon,
} from '@phosphor-icons/react'
import { EmptyState } from '@/components/dashboard/EmptyState'
import { Avatar } from '@/components/ui/Avatar'
import type { Member, Settlement } from '@/lib/data/types'
import { toggleSettlementPaid } from '@/lib/settlements/actions'
import { cn } from '@/lib/utils/cn'
import { formatWon } from '@/lib/utils/format'

/** "누가 누구에게 얼마". 계산은 여기서 하지 않는다 — 이미 계산된 목록을 받아 그린다. */
export function SettlementList({
  settlements,
  members,
  tripId,
  currentUserId,
  onToggled,
}: {
  settlements: Settlement[]
  members: Member[]
  /** 셋이 다 있을 때만 보냄 체크박스가 뜬다. 요약 자리(TripDetailTabs)는 넘기지 않는다. */
  tripId?: string
  currentUserId?: string
  onToggled?: (updated: Settlement) => void
}) {
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState<string>()
  const canToggle = Boolean(tripId && currentUserId && onToggled)

  if (settlements.length === 0) {
    return (
      <EmptyState
        icon={CalculatorIcon}
        title="정산할 게 없습니다"
        description="지출을 넣으면 누가 누구에게 얼마를 보낼지 여기 나옵니다."
      />
    )
  }

  const nameOf = (id: string) =>
    members.find((m) => m.userId === id)?.displayName ?? '알 수 없음'

  function toggle(settlement: Settlement) {
    if (!tripId || !onToggled) return
    startTransition(async () => {
      try {
        onToggled(
          await toggleSettlementPaid(tripId, settlement.id, !settlement.isPaid),
        )
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
              key={s.id}
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
              {canToggle ? (
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
