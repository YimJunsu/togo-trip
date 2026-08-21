'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { LockIcon, SteeringWheelIcon } from '@phosphor-icons/react'
import { ActionButton } from '@/components/dashboard/ActionButton'
import { SettlementList } from '@/components/dashboard/SettlementList'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import type { Member, Settlement } from '@/lib/data/types'
import type { SettleShare } from '@/lib/settle/settle'
import { cancelSettlement } from '@/lib/settlements/actions'
import { formatDate, formatWon } from '@/lib/utils/format'

/** 한국만 쓰는 서비스라 고정 +09:00로 KST 날짜를 뽑는다 (CLAUDE.md 국내 한정). */
const KST_OFFSET_MS = 9 * 60 * 60 * 1000

/** settledAt은 UTC ISO 타임스탬프다. slice(0, 10)으로 그냥 자르면 자정 근처
 * 확정 건이 KST로는 다음 날인데 전날로 보인다 — KST로 옮긴 뒤 날짜만 뽑는다. */
function formatSettledDate(settledAt: string): string {
  const kst = new Date(new Date(settledAt).getTime() + KST_OFFSET_MS)
  return formatDate(kst.toISOString().slice(0, 10))
}

export function SettledResult({
  tripId,
  settledAt,
  shares,
  members,
  settlements,
  currentUserId,
  isHost,
}: {
  tripId: string
  settledAt: string
  /** 저장하지 않고 매번 계산한 값. 서버 컴포넌트가 넘긴다. */
  shares: SettleShare[]
  members: Member[]
  /**
   * 서버가 준 값을 그대로 그린다. useState로 복사해 두면 서버 컴포넌트가 다시 돌아도
   * 로컬 state가 이겨, 상대가 "보냄"을 체크해도 내 화면엔 영영 반영되지 않는다.
   */
  settlements: Settlement[]
  currentUserId: string
  isHost: boolean
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string>()

  const nameOf = (id: string) =>
    members.find((m) => m.userId === id)?.displayName ?? '알 수 없음'
  const isDriver = (id: string) =>
    members.find((m) => m.userId === id)?.isDriver ?? false

  const allPaid =
    settlements.length > 0 && settlements.every((s) => s.isPaid)

  function cancel() {
    startTransition(async () => {
      try {
        await cancelSettlement(tripId)
        // 잠금이 풀리면 화면 전체가 진행 중 상태로 바뀌어야 한다. 서버 컴포넌트를
        // 다시 실행해 최신 props를 받는다 (MemberList가 정착시킨 패턴, 전체 리로드 대신).
        router.refresh()
      } catch {
        setError('정산을 취소하지 못했습니다.')
      }
    })
  }

  return (
    <div className="flex flex-col gap-8">
      <section className="rounded-card bg-accent text-surface shadow-soft p-7">
        <div className="flex items-start justify-between gap-4">
          <p className="flex items-center gap-1.5 font-mono text-xs tracking-widest opacity-75">
            <LockIcon size={13} weight="bold" aria-hidden />
            정산 확정됨
          </p>
          {allPaid ? (
            <Badge className="bg-ink text-paper">정산 끝</Badge>
          ) : null}
        </div>
        <p className="font-display mt-2 text-2xl font-semibold tracking-tight">
          {formatSettledDate(settledAt)}
        </p>
        <p className="mt-1 text-sm opacity-80">
          지출은 더 고칠 수 없습니다. 고치려면 방장이 정산을 취소해야 합니다.
        </p>
      </section>

      <section>
        <h2 className="font-display mb-3 text-lg font-semibold tracking-tight">
          누가 얼마
        </h2>
        <ul className="divide-line border-line bg-surface rounded-card divide-y border px-5">
          {shares.map((share) => (
            <li key={share.userId} className="flex items-center gap-3 py-4">
              <Avatar name={nameOf(share.userId)} size="lg" />
              <div className="min-w-0 flex-1">
                <p className="font-display flex items-center gap-1.5 font-medium">
                  {nameOf(share.userId)}
                  {isDriver(share.userId) ? (
                    <SteeringWheelIcon
                      size={14}
                      weight="bold"
                      aria-label="운전자"
                    />
                  ) : null}
                </p>
                <p className="text-muted mt-0.5 text-xs">
                  낸 돈 {formatWon(share.paid)} · 부담{' '}
                  {formatWon(share.owed)}
                </p>
                {Math.round(share.adjustment) !== 0 ? (
                  <p className="text-muted mt-0.5 text-xs">
                    {share.adjustment < 0
                      ? `운전자 할인 ${formatWon(share.adjustment)}`
                      : `할인 분담 +${formatWon(share.adjustment)}`}
                  </p>
                ) : null}
              </div>
              <p
                className={
                  share.net >= 0
                    ? 'font-mono font-semibold'
                    : 'text-muted font-mono font-semibold'
                }
              >
                {share.net >= 0 ? '받을 ' : '보낼 '}
                {formatWon(Math.abs(share.net))}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="font-display mb-3 text-lg font-semibold tracking-tight">
          누가 누구에게
        </h2>
        <SettlementList
          settlements={settlements}
          members={members}
          currentUserId={currentUserId}
          onToggled={() => router.refresh()}
          tripId={tripId}
        />
      </section>

      {isHost ? (
        <section className="flex flex-col gap-2">
          <ActionButton tone="quiet" onClick={cancel} disabled={isPending}>
            정산 취소
          </ActionButton>
          <p className="text-muted text-xs">
            송금 기록이 지워지고 지출을 다시 고칠 수 있게 됩니다.
          </p>
          {error ? <p className="text-danger text-sm">{error}</p> : null}
        </section>
      ) : null}
    </div>
  )
}
