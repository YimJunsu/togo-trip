'use client'

import { useState, useTransition } from 'react'
import { SteeringWheelIcon } from '@phosphor-icons/react'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import type { Member } from '@/lib/data/types'
import { setDriverAction } from '@/lib/trips/actions'
import { cn } from '@/lib/utils/cn'

/** 카드 대신 구분선으로 묶는다. 한 줄에 한 사람이면 상자는 과하다. */
export function MemberList({
  members: initialMembers,
  tripId,
  canEdit = false,
}: {
  members: Member[]
  tripId?: string
  /** 방장이고 아직 정산 전일 때만 참. 운전자는 할인 계산의 입력이라 확정 후엔 못 바꾼다. */
  canEdit?: boolean
}) {
  const [members, setMembers] = useState(initialMembers)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string>()

  function toggleDriver(userId: string, next: boolean) {
    if (!tripId) return
    startTransition(async () => {
      try {
        setMembers(await setDriverAction(tripId, userId, next))
        setError(undefined)
      } catch {
        // 서버 게이트(방장 여부·잠금)가 막았거나 알 수 없는 오류다.
        // 버튼이 조용히 반응 없는 상태로 남지 않게 한다.
        setError('운전자를 바꾸지 못했습니다.')
      }
    })
  }

  return (
    <div className="flex flex-col gap-2">
      <ul className="divide-line border-line bg-surface rounded-card divide-y border px-5">
        {members.map((member) => (
          <li key={member.userId} className="flex items-center gap-3 py-4">
            <Avatar name={member.displayName} size="lg" />
            <span className="font-display flex-1 font-medium">
              {member.displayName}
            </span>
            <span className="flex items-center gap-1.5">
              {member.role === 'host' ? (
                <Badge className="bg-ink/5 text-ink">방장</Badge>
              ) : null}

              {canEdit ? (
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => toggleDriver(member.userId, !member.isDriver)}
                  aria-pressed={member.isDriver}
                  className={cn(
                    'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold',
                    'transition duration-200 ease-out active:scale-[0.98] disabled:opacity-50',
                    member.isDriver
                      ? 'bg-lime text-ink'
                      : 'border-line text-muted hover:text-ink border',
                  )}
                >
                  <SteeringWheelIcon size={13} weight="bold" aria-hidden />
                  운전자
                </button>
              ) : member.isDriver ? (
                <Badge className="bg-lime text-ink">
                  <SteeringWheelIcon size={13} weight="bold" aria-hidden />
                  운전자
                </Badge>
              ) : null}
            </span>
          </li>
        ))}
      </ul>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  )
}
