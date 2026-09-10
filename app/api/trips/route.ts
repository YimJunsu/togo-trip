import { NextResponse } from 'next/server'
import { getUser } from '@/lib/auth/session'
import { expenseRepo, tripRepo } from '@/lib/data'
import { settleTrip } from '@/lib/settle/settle'
import { pickFeaturedTrip } from '@/lib/trips/next'

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

  const featured = pickFeaturedTrip(trips, new Date())
  const summary = featured
    ? await summarize(
        featured.id,
        featured.driverDiscountRate,
        membersByTrip[trips.indexOf(featured)],
        user.id,
      )
    : null

  return NextResponse.json(
    {
      trips: trips.map((trip, i) => ({
        trip,
        members: membersByTrip[i].map(({ userId, displayName }) => ({
          userId,
          displayName,
        })),
      })),
      summary,
    },
    { headers },
  )
}

/**
 * 홈 맨 위 카드가 쓰는 돈 요약. 방 하나만 계산한다 — 전부 돌리면 방 수만큼
 * 지출 조회가 붙고, 홈은 로그인한 사람이 가장 자주 여는 화면이다.
 *
 * 나가는 값은 숫자 셋뿐이다. 다른 사람이 얼마를 냈고 누구에게 보내야 하는지는
 * 여행방 안에서 볼 일이고, 홈 요약을 위해 브라우저까지 내보낼 이유가 없다.
 */
async function summarize(
  tripId: string,
  driverDiscountRate: number,
  members: { userId: string; isDriver: boolean }[],
  userId: string,
) {
  const expenses = await expenseRepo.listByTrip(tripId)
  const spent = expenses.reduce((sum, expense) => sum + expense.amount, 0)

  // 지출이 없으면 계산할 것이 없다. settleTrip은 참여자 없는 지출을 오류로 던지므로
  // 빈 입력을 굳이 통과시키지 않는다.
  if (expenses.length === 0) {
    return { tripId, spent: 0, myOwed: 0, myNet: 0 }
  }

  const { shares } = settleTrip({
    members: members.map(({ userId: id, isDriver }) => ({
      userId: id,
      isDriver,
    })),
    expenses: expenses.map(({ payerId, amount, participantIds }) => ({
      payerId,
      amount,
      participantIds,
    })),
    driverDiscountRate,
  })

  const mine = shares.find((share) => share.userId === userId)

  // 반올림은 화면에 나가기 직전 한 번만 한다 (CONVENTIONS §6).
  return {
    tripId,
    spent,
    myOwed: Math.round(mine?.owed ?? 0),
    myNet: Math.round(mine?.net ?? 0),
  }
}
