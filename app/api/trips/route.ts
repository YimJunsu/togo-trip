import { NextResponse } from 'next/server'
import { getUser } from '@/lib/auth/session'
import { tripRepo } from '@/lib/data'

/**
 * 홈의 "내 여행방" 목록.
 *
 * 홈을 정적으로 만들기 위해 떼어 낸 조각이다. 페이지가 서버에서 이 데이터를 그리면
 * cookies()를 읽어야 하고, 그러면 홈 전체가 매 요청 함수 실행으로 떨어진다.
 *
 * 돌려주는 건 카드가 그리는 데 필요한 값뿐이다. Member에는 role·isDriver·tripId도
 * 있지만 화면이 쓰지 않으므로 보내지 않는다 — 브라우저로 나간 데이터는 되돌릴 수 없다.
 */
export const dynamic = 'force-dynamic'

export async function GET() {
  const user = await getUser()

  const headers = { 'Cache-Control': 'private, no-store' }

  // 비로그인은 오류가 아니라 정상 상태다. 화면이 "손님"과 "여행방 0개"를 구분할 수
  // 있도록 null과 빈 배열을 다르게 준다.
  if (!user) return NextResponse.json({ trips: null }, { headers })

  // list(user.id)가 본인이 속한 방으로 이미 좁힌다.
  const trips = await tripRepo.list(user.id)
  const membersByTrip = await Promise.all(
    trips.map((trip) => tripRepo.listMembers(trip.id)),
  )

  return NextResponse.json(
    {
      trips: trips.map((trip, i) => ({
        trip,
        members: membersByTrip[i].map(({ userId, displayName }) => ({
          userId,
          displayName,
        })),
      })),
    },
    { headers },
  )
}
