import Link from 'next/link'
import { notFound } from 'next/navigation'
import { CaretLeftIcon } from '@phosphor-icons/react/dist/ssr'
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

      <SettlePanel
        trip={trip}
        members={members}
        initialExpenses={expenses}
        settlements={settlements}
        shares={shares}
        currentUserId={me.id}
        isHost={isHost}
      />
    </div>
  )
}
