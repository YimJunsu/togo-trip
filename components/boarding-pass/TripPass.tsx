import type { ReactNode } from 'react'
import { PassCard, PassTear } from '@/components/boarding-pass/PassCard'
import { Stamp } from '@/components/boarding-pass/Stamp'
import type { Trip } from '@/lib/data/types'
import { cn } from '@/lib/utils/cn'
import { formatDate, formatDday, formatNights } from '@/lib/utils/format'
import { THEME_LABEL } from '@/lib/utils/labels'

/** 여행권. 항공권 용어를 빌려 쓴다: FROM/TO, BOARDING, CODE. (DESIGN_SYSTEM §3) */
export function TripPass({
  trip,
  /**
   * 주면 D-DAY 칸이 생긴다. 참여 직후(/join)에는 남은 날짜가 관심사가 아니라 비워 둔다.
   * 값을 주입받는 이유는 `formatDday`와 같다 — 서버 렌더가 흔들리지 않게.
   */
  today,
  stampLabel,
  isStampAnimated = false,
  /**
   * 여행방 이름의 제목 레벨. 이 카드가 화면의 주제면 h1, 다른 제목 아래 놓이면 h2다.
   * /join은 "초대코드로 참여"가 h1이라 기본값이 h2고, 여행방 상세는 이 카드가 h1이다.
   */
  headingLevel = 2,
  /** 카드 하단 액션 자리. 보딩패스 톤 버튼만 넣는다 — 라임 버튼은 갈래가 다르다. */
  action,
}: {
  trip: Trip
  today?: Date
  stampLabel?: string
  isStampAnimated?: boolean
  headingLevel?: 1 | 2
  action?: ReactNode
}) {
  const Heading = headingLevel === 1 ? 'h1' : 'h2'

  return (
    <PassCard>
      <div className="flex justify-between gap-3 text-xs tracking-widest">
        <span>FROM · 서울</span>
        {/* 테마는 대시보드에선 라임 pill이지만 여기선 종이 톤 라벨로 읽힌다. */}
        <span className="text-right">
          TO · {trip.region} · {THEME_LABEL[trip.coverTheme]}
        </span>
      </div>

      <Heading className="mt-3 text-2xl">{trip.name}</Heading>

      <PassTear />

      <dl
        className={cn(
          'grid gap-4 text-xs tracking-widest',
          today ? 'grid-cols-3' : 'grid-cols-2',
        )}
      >
        <div>
          <dt className="opacity-70">BOARDING</dt>
          <dd className="mt-1 text-sm">{formatDate(trip.startDate)}</dd>
        </div>
        <div>
          <dt className="opacity-70">DURATION</dt>
          <dd className="mt-1 text-sm">
            {formatNights(trip.startDate, trip.endDate)}
          </dd>
        </div>
        {today ? (
          <div>
            <dt className="opacity-70">D-DAY</dt>
            <dd className="mt-1 text-sm">{formatDday(trip.startDate, today)}</dd>
          </div>
        ) : null}
      </dl>

      <div className="mt-5 flex items-end justify-between gap-4">
        <div>
          <p className="text-xs tracking-widest opacity-70">INVITE CODE</p>
          <p className="mt-1 text-3xl tracking-[0.3em]">{trip.inviteCode}</p>
        </div>
        {stampLabel ? (
          <Stamp label={stampLabel} isAnimated={isStampAnimated} />
        ) : null}
      </div>

      {action ? <div className="mt-5">{action}</div> : null}
    </PassCard>
  )
}
