'use client'

import { useState } from 'react'
import Link from 'next/link'
import { actionButtonClass } from '@/components/dashboard/ActionButton'
import { DayPlanList } from '@/components/dashboard/DayPlanList'
import { MemberList } from '@/components/dashboard/MemberList'
import {
  SettlementList,
  type SettlementRow,
} from '@/components/dashboard/SettlementList'
import { TabBar } from '@/components/dashboard/TabBar'
import type { ItineraryItem, Member, Trip } from '@/lib/data/types'

type Tab = 'members' | 'plan' | 'settle'

const TABS = [
  { value: 'members', label: '멤버' },
  { value: 'plan', label: '일정' },
  { value: 'settle', label: '정산' },
] as const satisfies readonly { value: Tab; label: string }[]

export function TripDetailTabs({
  trip,
  members,
  itineraryItems,
  settlements,
  canEditMembers,
  meId,
  canLeave,
}: {
  trip: Trip
  members: Member[]
  itineraryItems: ItineraryItem[]
  /** 확정 후엔 저장된 송금, 확정 전엔 지금 지출 기준으로 계산한 예상 송금. */
  settlements: SettlementRow[]
  canEditMembers: boolean
  meId: string
  canLeave: boolean
}) {
  const [tab, setTab] = useState<Tab>('members')

  return (
    <div className="flex flex-col gap-4">
      <TabBar tabs={TABS} current={tab} onSelect={setTab} />

      <div role="tabpanel">
        {tab === 'members' ? (
          <MemberList
            members={members}
            tripId={trip.id}
            canEdit={canEditMembers}
            meId={meId}
            canLeave={canLeave}
          />
        ) : tab === 'plan' ? (
          <DayPlanList trip={trip} items={itineraryItems} />
        ) : (
          <div className="flex flex-col gap-4">
            {/*
              확정 전 금액은 지출이 바뀌면 같이 바뀐다. 확정된 송금과 같은 모양으로
              보여주면서 아무 말도 안 하면 이미 정해진 금액으로 읽힌다.
            */}
            {!trip.settledAt && settlements.length > 0 ? (
              <p className="text-muted text-sm">
                아직 확정 전입니다. 지금 지출 기준 예상 송금이라 지출이 바뀌면
                금액도 바뀝니다.
              </p>
            ) : null}
            <SettlementList settlements={settlements} members={members} />
            <Link
              href={`/trips/${trip.id}/settle`}
              className={actionButtonClass({
                tone: 'quiet',
                className: 'w-full',
              })}
            >
              정산 자세히 보기
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
