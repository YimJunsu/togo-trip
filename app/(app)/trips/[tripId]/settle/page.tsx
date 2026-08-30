import Link from 'next/link'
import { notFound } from 'next/navigation'
import { CaretLeftIcon } from '@phosphor-icons/react/dist/ssr'
import { RefreshOnFocus } from '@/components/dashboard/RefreshOnFocus'
import { SettledResult } from '@/components/dashboard/SettledResult'
import { SettlePanel } from '@/components/dashboard/SettlePanel'
import { expenseRepo, settlementRepo, tripRepo } from '@/lib/data'
import { requireMemberPage } from '@/lib/auth/session'
import { previewSettlement } from '@/lib/settlements/actions'
import type { SettleShare } from '@/lib/settle/settle'
import type { PageProps } from '@/lib/types/page'

export default async function SettlePage({
  params,
}: PageProps<{ tripId: string }>) {
  const { tripId } = await params
  const me = await requireMemberPage(tripId)

  const trip = await tripRepo.get(tripId)
  if (!trip) notFound()

  const [expenses, settlements, members] = await Promise.all([
    expenseRepo.listByTrip(tripId),
    settlementRepo.listByTrip(tripId),
    tripRepo.listMembers(tripId),
  ])

  // 부담 내역은 저장하지 않는다. 확정된 방은 입력이 잠겨 있어 매번 같은 값이 나온다.
  const shares: SettleShare[] = trip.settledAt
    ? (await previewSettlement(tripId)).shares
    : []

  const isHost = members.some((m) => m.userId === me.id && m.role === 'host')

  return (
    <div className="flex flex-col gap-6">
      {/* 남이 넣은 지출·보냄 체크를 새로고침 없이 본다. */}
      <RefreshOnFocus />

      <header>
        <Link
          href={`/trips/${tripId}`}
          className="text-muted hover:text-ink inline-flex items-center gap-1 font-mono text-xs tracking-widest"
        >
          <CaretLeftIcon size={12} weight="bold" aria-hidden />
          {trip.name}
        </Link>
        <h1 className="font-display mt-1 text-3xl font-semibold tracking-tight">
          정산
        </h1>
      </header>

      {/*
        확정 여부로 화면을 여기서 가른다. 한쪽이 다른 쪽을 대신 반환하게 두면
        확정해도 진행 중 화면의 로컬 state(미리보기 잠금)가 살아남아,
        확정 뒤 취소했을 때 지출을 다시 넣을 수 없는 상태로 남는다.
      */}
      {trip.settledAt ? (
        <SettledResult
          tripId={tripId}
          settledAt={trip.settledAt}
          shares={shares}
          members={members}
          settlements={settlements}
          currentUserId={me.id}
          isHost={isHost}
        />
      ) : (
        <SettlePanel
          trip={trip}
          members={members}
          expenses={expenses}
          isHost={isHost}
        />
      )}
    </div>
  )
}
