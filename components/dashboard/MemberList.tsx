'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { SteeringWheelIcon } from '@phosphor-icons/react'
import { ActionButton } from '@/components/dashboard/ActionButton'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import type { Member } from '@/lib/data/types'
import {
  leaveTripAction,
  removeMemberAction,
  setDriverAction,
} from '@/lib/trips/actions'
import { cn } from '@/lib/utils/cn'

/**
 * 서버가 던진 오류를 문구로 옮긴다. 전부 한 문장으로 뭉개면 "지출이 있어서
 * 못 뺀다"는 사실이 사라져 사용자가 할 일을 알 수 없다.
 * 타입 자체는 서버 전용이라 클라이언트로 넘어오면서 이름만 남는다 — 이름으로 본다.
 */
function messageFor(error: unknown, fallback: string): string {
  const name = error instanceof Error ? error.name : ''
  if (name === 'MemberHasExpensesError') {
    return '지출 내역이 있어 뺄 수 없습니다. 먼저 지출을 정리해 주세요.'
  }
  if (name === 'HostCannotLeaveError') return '방장은 나갈 수 없습니다.'
  if (name === 'TripAlreadySettledError') {
    return '정산이 끝난 여행방이라 멤버를 바꿀 수 없습니다.'
  }
  return fallback
}

/** 카드 대신 구분선으로 묶는다. 한 줄에 한 사람이면 상자는 과하다. */
export function MemberList({
  members,
  tripId,
  canEdit = false,
  meId,
  canLeave = false,
}: {
  members: Member[]
  tripId?: string
  /** 방장이고 아직 정산 전일 때만 참. 운전자는 할인 계산의 입력이라 확정 후엔 못 바꾼다. */
  canEdit?: boolean
  /** 내 행에는 내보내기를 달지 않는다. 방장이 자기를 빼는 일은 없다. */
  meId?: string
  /** 내가 일반 멤버이고 아직 정산 전일 때만 참. */
  canLeave?: boolean
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string>()
  /** 확인 대기 중인 대상. userId면 내보내기, 'me'면 나가기. */
  const [confirming, setConfirming] = useState<string>()

  function toggleDriver(userId: string, next: boolean) {
    if (!tripId) return
    startTransition(async () => {
      try {
        await setDriverAction(tripId, userId, next)
        setError(undefined)
        // 로컬 상태를 두면 탭 전환으로 컴포넌트가 언마운트될 때 서버가 반영한 값과
        // 어긋날 수 있다. 서버 컴포넌트를 다시 실행해 props를 최신 상태로 받는다.
        router.refresh()
      } catch (e) {
        setError(messageFor(e, '운전자를 바꾸지 못했습니다.'))
      }
    })
  }

  function removeMember(userId: string) {
    if (!tripId) return
    startTransition(async () => {
      try {
        await removeMemberAction(tripId, userId)
        setError(undefined)
        setConfirming(undefined)
        router.refresh()
      } catch (e) {
        setConfirming(undefined)
        setError(messageFor(e, '멤버를 빼지 못했습니다.'))
      }
    })
  }

  function leave() {
    if (!tripId) return
    startTransition(async () => {
      try {
        // 성공하면 액션이 redirect한다 — 이 아래로는 돌아오지 않는다.
        await leaveTripAction(tripId)
      } catch (e) {
        // Next의 redirect는 예외로 흐름을 끊는다. 그건 실패가 아니므로 다시 던진다.
        if (e instanceof Error && e.message === 'NEXT_REDIRECT') throw e
        setConfirming(undefined)
        setError(messageFor(e, '여행방을 나가지 못했습니다.'))
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

              {/* 방장은 못 뺀다. 내 행에도 달지 않는다(내가 방장일 때만 보이는 버튼이다). */}
              {canEdit &&
              member.role !== 'host' &&
              member.userId !== meId ? (
                confirming === member.userId ? (
                  <span className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => removeMember(member.userId)}
                      className="text-danger rounded-full px-2.5 py-1 text-xs font-semibold disabled:opacity-50"
                    >
                      내보내기
                    </button>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => setConfirming(undefined)}
                      className="text-muted rounded-full px-2.5 py-1 text-xs font-semibold"
                    >
                      취소
                    </button>
                  </span>
                ) : (
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => {
                      setError(undefined)
                      setConfirming(member.userId)
                    }}
                    aria-label={`${member.displayName} 내보내기`}
                    className="border-line text-muted hover:text-ink rounded-full border px-2.5 py-1 text-xs font-semibold disabled:opacity-50"
                  >
                    내보내기
                  </button>
                )
              ) : null}
            </span>
          </li>
        ))}
      </ul>

      {canLeave ? (
        confirming === 'me' ? (
          <div className="border-line rounded-card flex flex-col gap-2 border border-dashed p-4">
            <p className="text-sm">
              이 여행방에서 나갑니다. 다시 들어오려면 초대코드가 필요합니다.
            </p>
            <div className="flex gap-2">
              <ActionButton
                tone="quiet"
                size="sm"
                disabled={isPending}
                onClick={leave}
                className="text-danger"
              >
                나가기
              </ActionButton>
              <ActionButton
                tone="quiet"
                size="sm"
                disabled={isPending}
                onClick={() => setConfirming(undefined)}
              >
                취소
              </ActionButton>
            </div>
          </div>
        ) : (
          <ActionButton
            tone="quiet"
            size="sm"
            disabled={isPending}
            onClick={() => {
              setError(undefined)
              setConfirming('me')
            }}
            className="self-start"
          >
            여행방 나가기
          </ActionButton>
        )
      ) : null}

      {error ? (
        <p role="alert" className="text-danger text-sm">
          {error}
        </p>
      ) : null}
    </div>
  )
}
