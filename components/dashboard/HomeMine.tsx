'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowUpRightIcon, CaretRightIcon } from '@phosphor-icons/react'
import { AvatarStack } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import type { Trip } from '@/lib/data/types'
import { pickFeaturedTrip } from '@/lib/trips/next'
import {
  formatDateRange,
  formatDday,
  formatNights,
  formatWon,
} from '@/lib/utils/format'

type TripEntry = {
  trip: Trip
  members: { userId: string; displayName: string }[]
}

/** 홈 카드가 쓰는 돈 요약. 방 하나 분량이고, 계산은 서버가 끝내서 보낸다. */
type TripSummary = {
  tripId: string
  spent: number
  myOwed: number
  /** paid - owed. 양수면 받을 돈, 음수면 보낼 돈 */
  myNet: number
}

type Payload = { trips: TripEntry[] | null; summary: TripSummary | null }

/**
 * 홈 맨 위의 내 여행.
 *
 * 로그인한 사람에게 홈의 첫 줄은 "다음에 어디 가지"가 아니라 "지금 걸려 있는 여행방"이다.
 * 그래서 이 블록만 지도 위로 올라간다.
 *
 * 비로그인이면 아무것도 그리지 않는다. 예전에는 여기 자리에 "여행방은 회원만
 * 만들 수 있어요" 안내가 서버 렌더로 있었는데, 그 안내가 홈의 첫 카드라 방문자
 * 대부분(비회원)이 로그인 요구부터 보게 됐다. 같은 내용은 지도·뽑기 아래의
 * 여행방 구역이 이미 말한다.
 *
 * 홈을 정적으로 유지하려고 개인 데이터는 전부 이 안으로 몰아넣었다. 페이지가
 * 서버에서 이걸 그리면 cookies()를 읽어야 하고 홈 전체가 매 요청 함수 실행이 된다.
 */
export function HomeMine() {
  const [data, setData] = useState<Payload | null>(null)

  useEffect(() => {
    let isMounted = true

    fetch('/api/trips', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : { trips: null, summary: null }))
      .then((payload: Payload) => {
        if (isMounted) setData(payload)
      })
      // 실패하면 아무것도 그리지 않는다. 홈이 깨지는 것보다 낫다.
      .catch(() => {})

    return () => {
      isMounted = false
    }
  }, [])

  const trips = data?.trips
  if (!trips || trips.length === 0) return null

  const today = new Date()
  const featured = pickFeaturedTrip(
    trips.map((entry) => entry.trip),
    today,
  )
  if (!featured) return null

  const dday = formatDday(featured.startDate, today)
  const featuredEntry = trips.find((entry) => entry.trip.id === featured.id)
  const others = trips.filter((entry) => entry.trip.id !== featured.id)
  // 요약이 다른 방 것이면 붙이지 않는다. 서버와 화면이 같은 함수로 고르므로
  // 보통은 일치하지만, 어긋난 숫자를 보여 주느니 안 보여 주는 편이 낫다.
  const summary = data?.summary?.tripId === featured.id ? data.summary : null

  return (
    <section className="animate-rise flex flex-col gap-3">
      {/* 지도 카드의 h1보다 앞에 오므로 제목 태그를 쓰지 않는다. 이건 구역 이름표다. */}
      <p className="text-muted font-mono text-xs tracking-widest">내 여행</p>

      <Link
        href={`/trips/${featured.id}`}
        className="rounded-card border-line bg-surface shadow-soft hover:shadow-lift block border p-5 transition duration-300 ease-out hover:-translate-y-[3px]"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-display truncate text-xl font-semibold tracking-tight">
              {featured.name}
            </p>
            <p className="text-muted mt-1 font-mono text-sm">
              {formatDateRange(featured.startDate, featured.endDate)} ·{' '}
              {formatNights(featured.startDate, featured.endDate)}
            </p>
          </div>
          <span className="flex shrink-0 items-center gap-1.5">
            {featured.settledAt ? (
              <Badge className="bg-ink text-paper font-mono">정산 완료</Badge>
            ) : null}
            {/* 지난 여행에 강조색을 쓰지 않는다. 끝난 일정이 다가오는 일정만큼
                소리 내면 무엇이 급한지 알 수 없다. */}
            <Badge
              className={
                dday === '지난 여행'
                  ? 'bg-ink/5 text-muted font-mono'
                  : 'bg-accent text-surface font-mono'
              }
            >
              {dday}
            </Badge>
          </span>
        </div>

        {summary ? <MoneyRow summary={summary} /> : null}

        {featuredEntry && featuredEntry.members.length > 0 ? (
          <div className="border-line mt-4 flex items-center justify-between gap-3 border-t pt-4">
            <AvatarStack
              people={featuredEntry.members.map((m) => ({
                id: m.userId,
                name: m.displayName,
              }))}
              label="멤버"
            />
            <ArrowUpRightIcon size={18} weight="bold" className="text-muted" />
          </div>
        ) : null}
      </Link>

      {others.length > 0 ? (
        <ul className="rounded-card border-line bg-surface divide-line divide-y overflow-hidden border">
          {others.map((entry) => (
            <li key={entry.trip.id}>
              <Link
                href={`/trips/${entry.trip.id}`}
                className="hover:bg-paper flex items-center justify-between gap-3 px-5 py-3.5 transition duration-200"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold">
                    {entry.trip.name}
                  </span>
                  <span className="text-muted mt-0.5 block font-mono text-xs">
                    {formatDateRange(entry.trip.startDate, entry.trip.endDate)}
                  </span>
                </span>
                <span className="text-muted flex shrink-0 items-center gap-2 font-mono text-xs">
                  {formatDday(entry.trip.startDate, today)}
                  <CaretRightIcon size={14} weight="bold" aria-hidden />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  )
}

/**
 * 쓴 돈 · 내 몫 · 주고받을 돈.
 *
 * "받을 돈"과 "보낼 돈"을 색으로만 가르지 않는다 — 라벨 자체가 바뀐다.
 * (DESIGN_SYSTEM §4)
 */
function MoneyRow({ summary }: { summary: TripSummary }) {
  const { spent, myOwed, myNet } = summary

  if (spent === 0) {
    return (
      <p className="bg-paper rounded-inner text-muted mt-4 px-4 py-3 text-sm">
        아직 적은 지출이 없어요. 들어가서 첫 지출을 넣어 보세요.
      </p>
    )
  }

  const isReceiving = myNet >= 0

  return (
    <dl className="bg-paper rounded-inner divide-line mt-4 flex divide-x">
      <Cell label="쓴 돈" value={formatWon(spent)} />
      <Cell label="내 몫" value={formatWon(myOwed)} />
      <Cell
        label={isReceiving ? '받을 돈' : '보낼 돈'}
        value={formatWon(Math.abs(myNet))}
        strong
      />
    </dl>
  )
}

function Cell({
  label,
  value,
  strong = false,
}: {
  label: string
  value: string
  strong?: boolean
}) {
  // 375px에서 세 칸이 나란히 서므로 한 칸에 70px 남짓뿐이다. text-sm에 truncate로
  // 뒀더니 «514,40…»처럼 금액이 잘려 나갔다 — 잘린 돈은 안 보여 준 것만 못하다.
  // 글자를 한 단계 줄이고 truncate를 뺐다. 자릿수가 더 늘면 줄이 바뀔 뿐 값은 다 보인다.
  return (
    <div className="min-w-0 flex-1 px-3 py-3">
      <dt className="text-muted text-[11px]">{label}</dt>
      <dd
        className={
          strong
            ? 'text-ink mt-0.5 font-mono text-xs font-semibold'
            : 'text-ink mt-0.5 font-mono text-xs'
        }
      >
        {value}
      </dd>
    </div>
  )
}
