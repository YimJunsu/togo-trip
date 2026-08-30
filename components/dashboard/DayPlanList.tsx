'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ForkKnifeIcon, PlusIcon, TrashIcon } from '@phosphor-icons/react'
import { ActionButton, actionButtonClass } from '@/components/dashboard/ActionButton'
import { AddItineraryForm } from '@/components/dashboard/AddItineraryForm'
import type { ItineraryItem, Trip } from '@/lib/data/types'
import { removeItineraryItem } from '@/lib/itinerary/actions'
import { listTripDays } from '@/lib/utils/days'
import { formatDate } from '@/lib/utils/format'

/**
 * 날짜별 일정. 정산과 달리 확정 잠금이 없다 — 일정은 돈 계산의 입력이 아니라
 * 정산이 끝난 뒤에도 계속 고칠 수 있다.
 *
 * 목록은 서버가 준 props를 그대로 그린다. useState 초기값으로 복사해 두면 서버가
 * 새 값을 내려줘도 로컬 state가 이겨, 같이 짜는 방에서 남이 넣은 일정이 보이지
 * 않는다 (SettlePanel에서 겪은 것과 같은 문제).
 */
export function DayPlanList({
  trip,
  items,
}: {
  trip: Trip
  items: ItineraryItem[]
}) {
  const router = useRouter()
  const days = listTripDays(trip.startDate, trip.endDate)
  // 어느 DAY의 추가 폼이 열려 있는지. 한 번에 하나만 연다.
  const [addingDay, setAddingDay] = useState<string>()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string>()

  function remove(itemId: string) {
    // 지우는 동안에도 줄이 그대로 보인다(서버 응답을 기다리므로).
    // 같은 줄을 두 번 눌러 이미 사라진 일정을 다시 지우려다 실패하지 않게 막는다.
    if (isPending) return
    startTransition(async () => {
      try {
        await removeItineraryItem(trip.id, itemId)
        setError(undefined)
        router.refresh()
      } catch {
        setError('일정을 지우지 못했습니다. 잠시 후 다시 시도해 주세요.')
      }
    })
  }

  return (
    <div className="flex flex-col gap-4">
      {/*
        노선 배치 (DESIGN_SYSTEM §2). 하루가 선 위의 정거장 하나다.
        정거장 안을 채우는 기준은 "그날 일정이 있는가"라서, 노드만 봐도
        어느 날이 비었는지 읽힌다. 장식이 아니라 상태 표시다.
      */}
      <ol className="relative pl-[30px]">
        <span
          aria-hidden
          className="bg-accent absolute top-2 bottom-2 left-[7px] w-0.5 opacity-25"
        />
        {days.map((day, i) => {
          const ofDay = items.filter((item) => item.day === day)
          const isLast = i === days.length - 1
          return (
            <li
              key={day}
              style={{ animationDelay: `${i * 70}ms` }}
              className={`animate-rise relative ${isLast ? '' : 'pb-7'}`}
            >
              <span
                aria-hidden
                className={`border-accent absolute top-1 -left-[30px] size-4 rounded-full border-2 ${
                  ofDay.length > 0 ? 'bg-accent' : 'bg-paper'
                }`}
              />
              <div className="flex items-baseline justify-between gap-3">
                <span className="font-display font-semibold tracking-tight">
                  DAY {i + 1}
                </span>
                <span className="text-muted font-mono text-xs">
                  {formatDate(day)}
                </span>
              </div>

              {ofDay.length === 0 ? (
                <p className="text-muted mt-2 text-sm">
                  아직 담은 곳이 없습니다
                </p>
              ) : (
                <ul className="divide-line mt-2 divide-y">
                  {ofDay.map((item) => (
                    <li key={item.id} className="flex items-start gap-3 py-3">
                      <span className="text-muted w-11 shrink-0 pt-0.5 font-mono text-xs">
                        {item.at ?? '미정'}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-display font-medium">{item.title}</p>
                        {item.memo ? (
                          <p className="text-muted mt-0.5 text-xs">
                            {item.memo}
                          </p>
                        ) : null}
                      </div>
                      <button
                        type="button"
                        onClick={() => remove(item.id)}
                        aria-label={`${item.title} 삭제`}
                        className="text-muted hover:text-ink shrink-0 p-1 transition duration-200 ease-out active:scale-[0.98]"
                      >
                        <TrashIcon size={16} weight="bold" aria-hidden />
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {addingDay === day ? (
                <AddItineraryForm
                  tripId={trip.id}
                  day={day}
                  onCancel={() => setAddingDay(undefined)}
                  onAdded={() => {
                    setAddingDay(undefined)
                    router.refresh()
                  }}
                />
              ) : (
                <div className="mt-3">
                  <ActionButton
                    size="sm"
                    tone="quiet"
                    onClick={() => setAddingDay(day)}
                  >
                    <PlusIcon size={14} weight="bold" aria-hidden />
                    일정 넣기
                  </ActionButton>
                </div>
              )}
            </li>
          )
        })}
      </ol>

      {error ? (
        <p role="alert" className="text-danger text-sm">
          {error}
        </p>
      ) : null}

      <Link
        href={`/trips/${trip.id}/places`}
        className={actionButtonClass({ tone: 'quiet', className: 'w-full' })}
      >
        <ForkKnifeIcon size={16} weight="bold" aria-hidden />
        근처 맛집 보러가기
      </Link>
    </div>
  )
}
