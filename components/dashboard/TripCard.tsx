import Link from 'next/link'
import { ArrowUpRightIcon } from '@phosphor-icons/react/dist/ssr'
import { ThemeBadge } from '@/components/dashboard/ThemeBadge'
import { AvatarStack } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import type { Trip } from '@/lib/data/types'
import { formatDateRange, formatDday, formatNights } from '@/lib/utils/format'

/**
 * 아바타를 그리는 데 필요한 것만. Member에는 role·isDriver도 있지만 이 카드가 쓰지
 * 않으므로 받지 않는다 — 이 값은 API를 타고 브라우저까지 나가므로 좁을수록 좋다.
 */
export type TripCardMember = { userId: string; displayName: string }

export function TripCard({
  trip,
  members,
  today,
  index = 0,
}: {
  trip: Trip
  members: TripCardMember[]
  today: Date
  /** 목록이 순서대로 올라오게 하는 지연값. */
  index?: number
}) {
  const dday = formatDday(trip.startDate, today)
  const isPast = dday === '지난 여행'

  return (
    <li style={{ animationDelay: `${index * 70}ms` }} className="animate-rise">
      <Link
        href={`/trips/${trip.id}`}
        className="rounded-card border-line bg-surface shadow-soft hover:shadow-lift block border p-6 transition duration-300 ease-out hover:-translate-y-[3px]"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-display text-xl font-semibold tracking-tight">
              {trip.name}
            </h3>
            <p className="text-muted mt-1 text-sm">{trip.region}</p>
          </div>
          <span className="flex shrink-0 items-center gap-1.5">
            {/* 정산이 끝난 방인지는 목록에서 바로 보여야 한다 — 들어가 봐야 아는 값이었다. */}
            {trip.settledAt ? (
              <Badge className="bg-ink text-paper font-mono">정산 완료</Badge>
            ) : null}
            <Badge
              className={
                isPast
                  ? 'bg-ink/5 text-muted font-mono'
                  : 'bg-accent text-surface font-mono'
              }
            >
              {dday}
            </Badge>
          </span>
        </div>

        <p className="text-muted mt-5 font-mono text-sm">
          {formatDateRange(trip.startDate, trip.endDate)} ·{' '}
          {formatNights(trip.startDate, trip.endDate)}
        </p>

        <div className="border-line mt-5 flex items-center justify-between gap-3 border-t pt-4">
          <AvatarStack
            people={members.map((m) => ({ id: m.userId, name: m.displayName }))}
            label="멤버"
          />
          <span className="flex items-center gap-2">
            <ThemeBadge theme={trip.coverTheme} />
            <ArrowUpRightIcon size={18} weight="bold" className="text-muted" />
          </span>
        </div>
      </Link>
    </li>
  )
}
