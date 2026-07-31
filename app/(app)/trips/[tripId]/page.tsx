import { notFound } from 'next/navigation'
import { RefreshOnFocus } from '@/components/dashboard/RefreshOnFocus'
import { ShareButton } from '@/components/dashboard/ShareButton'
import { ThemeBadge } from '@/components/dashboard/ThemeBadge'
import { TripDetailTabs } from '@/components/dashboard/TripDetailTabs'
import { Badge } from '@/components/ui/Badge'
import { itineraryRepo, settlementRepo, tripRepo } from '@/lib/data'
import { requireMemberPage } from '@/lib/auth/session'
import { previewSettlement } from '@/lib/settlements/actions'
import type { PageProps } from '@/lib/types/page'
import { formatDateRange, formatDday, formatNights } from '@/lib/utils/format'

export default async function TripDetailPage({
  params,
}: PageProps<{ tripId: string }>) {
  const { tripId } = await params
  const me = await requireMemberPage(tripId)

  const trip = await tripRepo.get(tripId)
  if (!trip) notFound()

  const [members, itineraryItems, settlements] = await Promise.all([
    tripRepo.listMembers(tripId),
    itineraryRepo.listByTrip(tripId),
    // 송금은 확정할 때 저장된다. 확정 전에 저장된 걸 물으면 늘 빈 목록이라, 지출을
    // 넣어 둔 방에서도 정산 탭이 "정산할 게 없습니다"만 보여 줬다. 확정 전에는 같은
    // 자리에 지금 지출 기준 예상 송금을 계산해 넣는다 (저장하지 않는다).
    //
    // ponytail: previewSettlement가 trip·members·expenses를 다시 조회한다 — 위
    // listMembers와 겹친다. 이 페이지가 느려지면 settleTrip 순수 함수를 여기서
    // 직접 부르고 조회를 한 번으로 합치면 된다.
    trip.settledAt
      ? settlementRepo.listByTrip(tripId)
      : previewSettlement(tripId).then((result) => result.transfers),
  ])

  // 방장이면서 아직 확정 전일 때만 참. 확정 후 운전자를 바꾸면 이미 확정된 금액의 전제가 깨진다.
  const canEditMembers =
    !trip.settledAt &&
    members.some((m) => m.userId === me.id && m.role === 'host')

  return (
    <div className="flex flex-col gap-6">
      {/* 남이 참여하거나 지출을 넣은 걸 새로고침 없이 본다. */}
      <RefreshOnFocus />

      <header className="rounded-card border-line bg-surface shadow-soft border p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-muted font-mono text-xs tracking-widest">
              {trip.region}
            </p>
            <h1 className="font-display mt-1 text-3xl font-semibold tracking-tight">
              {trip.name}
            </h1>
          </div>
          <span className="flex shrink-0 items-center gap-1.5">
            {trip.settledAt ? (
              <Badge className="bg-ink text-paper font-mono">정산 완료</Badge>
            ) : null}
            <ThemeBadge theme={trip.coverTheme} />
          </span>
        </div>

        <p className="text-muted mt-3 font-mono text-sm">
          {formatDateRange(trip.startDate, trip.endDate)} ·{' '}
          {formatNights(trip.startDate, trip.endDate)} ·{' '}
          {formatDday(trip.startDate, new Date())}
        </p>

        <div className="rounded-inner bg-paper mt-5 flex items-center gap-3 p-3 pl-4">
          <span className="text-muted font-mono text-xs tracking-widest">
            코드
          </span>
          <span className="font-display flex-1 font-semibold tracking-[0.2em]">
            {trip.inviteCode}
          </span>
        </div>

        {/*
          코드만 복사해 주면 받는 쪽이 /join을 찾아 들어가 손으로 옮겨 적어야 했다.
          코드가 박힌 참여 주소를 통째로 넘긴다 — 열면 코드가 미리 채워져 있다.
          여행방 주소가 아니라 /join인 이유는, 여행방은 멤버가 아니면 404라서다.
        */}
        <div className="mt-3">
          <ShareButton
            title={`${trip.name} 여행 초대`}
            text={`'${trip.name}' 여행에 초대합니다. 초대코드 ${trip.inviteCode}`}
            path={`/join?code=${trip.inviteCode}`}
            label="초대 링크 보내기"
          />
        </div>
      </header>

      <TripDetailTabs
        trip={trip}
        members={members}
        itineraryItems={itineraryItems}
        settlements={settlements}
        canEditMembers={canEditMembers}
      />
    </div>
  )
}
