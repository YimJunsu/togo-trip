import { notFound } from 'next/navigation'
import { PassShareButton } from '@/components/boarding-pass/PassShareButton'
import { TripPass } from '@/components/boarding-pass/TripPass'
import { RefreshOnFocus } from '@/components/dashboard/RefreshOnFocus'
import { TripDetailTabs } from '@/components/dashboard/TripDetailTabs'
import { itineraryRepo, settlementRepo, tripRepo } from '@/lib/data'
import { requireMemberPage } from '@/lib/auth/session'
import { previewSettlement } from '@/lib/settlements/actions'
import type { PageProps } from '@/lib/types/page'

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

  const meMember = members.find((m) => m.userId === me.id)

  // 방장이면서 아직 확정 전일 때만 참. 확정 후 운전자를 바꾸면 이미 확정된 금액의 전제가 깨진다.
  const canEditMembers = !trip.settledAt && meMember?.role === 'host'

  // 방장은 못 나간다 — 방을 정리하는 건 '방 삭제'라는 별개 기능이다.
  // 확정 후엔 멤버 구성도 계산의 전제라 지출·운전자와 함께 잠근다.
  const canLeave = !trip.settledAt && meMember?.role === 'member'

  return (
    <div className="flex flex-col gap-6">
      {/* 남이 참여하거나 지출을 넣은 걸 새로고침 없이 본다. */}
      <RefreshOnFocus />

      {/*
        초대코드와 공유는 "여행을 떠나는/공유하는 순간"이라 보딩패스 갈래다
        (DESIGN_SYSTEM §1 경계 규칙). 헤더 전체를 여행권 하나로 두는 이유는,
        코드 칸만 티켓으로 바꾸면 카드 하나 안에 두 언어가 섞이기 때문이다 (§4).
        탭 아래는 앱을 "쓰는" 영역이라 소프트 미니멀 그대로 둔다.

        공유 주소가 여행방이 아니라 /join인 이유: 여행방은 멤버가 아니면 404라
        코드만 넘기면 받는 쪽이 /join을 찾아 손으로 옮겨 적어야 한다.
      */}
      <TripPass
        trip={trip}
        today={new Date()}
        headingLevel={1}
        stampLabel={trip.settledAt ? 'SETTLED' : undefined}
        action={
          <PassShareButton
            title={`${trip.name} 여행 초대`}
            text={`'${trip.name}' 여행에 초대합니다. 초대코드 ${trip.inviteCode}`}
            path={`/join?code=${trip.inviteCode}`}
          />
        }
      />

      <TripDetailTabs
        trip={trip}
        members={members}
        itineraryItems={itineraryItems}
        settlements={settlements}
        canEditMembers={canEditMembers}
        meId={me.id}
        canLeave={canLeave}
      />
    </div>
  )
}
