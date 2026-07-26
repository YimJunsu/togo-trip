'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { SuitcaseRollingIcon } from '@phosphor-icons/react'
import { actionButtonClass } from '@/components/dashboard/ActionButton'
import { EmptyState } from '@/components/dashboard/EmptyState'
import { TripCard, type TripCardMember } from '@/components/dashboard/TripCard'
import type { Trip } from '@/lib/data/types'

type TripEntry = { trip: Trip; members: TripCardMember[] }

/**
 * 홈의 "내 여행방" 구역.
 *
 * 홈을 정적으로 만들기 위해 개인 데이터만 이 안으로 몰아넣었다. 페이지 본문(뽑기
 * 카드·성향 카드·FAQ)은 그대로 서버에서 렌더되고, 여기만 마운트 뒤에 채워진다.
 *
 * 서버 렌더 결과는 비회원 안내다. 크롤러가 보던 것과 같고 방문자 대부분에게도
 * 맞는 상태다. 로그인한 사람은 잠깐 이 안내를 본 뒤 자기 여행방으로 바뀐다.
 */
export function HomeTrips() {
  // null = 비로그인(또는 아직 확인 전), 배열 = 로그인 상태의 여행방 목록
  const [trips, setTrips] = useState<TripEntry[] | null>(null)

  useEffect(() => {
    let isMounted = true

    fetch('/api/trips', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : { trips: null }))
      .then((data: { trips: TripEntry[] | null }) => {
        if (isMounted) setTrips(data.trips)
      })
      // 실패하면 비회원 안내로 남긴다. 홈이 깨지는 것보다 낫다.
      .catch(() => {})

    return () => {
      isMounted = false
    }
  }, [])

  if (trips === null) return <GuestNotice />

  return (
    <section>
      <h2 className="font-display mb-3 text-lg font-semibold tracking-tight">
        내 여행방
      </h2>
      {trips.length === 0 ? (
        <EmptyState
          icon={SuitcaseRollingIcon}
          title="아직 여행방이 없습니다"
          description="방을 만들어 친구를 부르거나, 받은 초대코드로 들어가세요."
          action={
            <Link href="/trips/new" className={actionButtonClass({ size: 'sm' })}>
              여행방 만들기
            </Link>
          }
        />
      ) : (
        <ul className="flex flex-col gap-4">
          {trips.map(({ trip, members }, i) => (
            <TripCard
              key={trip.id}
              trip={trip}
              members={members}
              today={new Date()}
              index={i}
            />
          ))}
        </ul>
      )}
    </section>
  )
}

/** 비로그인 상태의 기본 화면. 서버 렌더 결과이자 크롤러가 보는 내용이다. */
function GuestNotice() {
  return (
    <section className="rounded-card border-line bg-surface shadow-soft border p-6">
      <p className="font-display text-lg font-semibold tracking-tight">
        여행방은 회원만 만들 수 있어요
      </p>
      <p className="text-muted mt-1 text-sm">
        가입하면 초대코드로 친구를 부르고 정산까지 한 번에 됩니다.
      </p>
      <Link
        href="/login"
        className={actionButtonClass({ tone: 'ink', className: 'mt-4 w-full' })}
      >
        로그인하고 여행방 만들기
      </Link>
    </section>
  )
}
