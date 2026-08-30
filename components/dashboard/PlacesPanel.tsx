'use client'

import { useState } from 'react'
import { ForkKnifeIcon, HeartIcon, SmileyMehIcon } from '@phosphor-icons/react'
import { ActionButton } from '@/components/dashboard/ActionButton'
import { EmptyState } from '@/components/dashboard/EmptyState'
import { FilterChip } from '@/components/dashboard/FilterChip'
import { MapPlaceholder } from '@/components/dashboard/MapPlaceholder'
import { Badge } from '@/components/ui/Badge'
import { toggleSavedPlace } from '@/lib/places/actions'
import type { Place } from '@/lib/data/types'

export function PlacesPanel({
  tripId,
  initialPlaces,
}: {
  tripId: string
  initialPlaces: Place[]
}) {
  const [places, setPlaces] = useState(initialPlaces)
  const [isChakanOnly, setIsChakanOnly] = useState(false)
  const [error, setError] = useState<string>()

  const shown = isChakanOnly ? places.filter((p) => p.isChakan) : places
  const savedCount = places.filter((p) => p.savedToTripId === tripId).length

  async function toggleSave(placeId: string) {
    try {
      const updated = await toggleSavedPlace(placeId, tripId)
      setError(undefined)
      setPlaces((prev) =>
        prev.map((p) => (p.id === updated.id ? { ...updated } : p)),
      )
    } catch {
      // 서버 액션의 멤버십 가드가 막았거나 알 수 없는 오류다. 찜 버튼이 조용히
      // 아무 반응 없는 상태로 남지 않도록 메시지를 띄운다.
      setError('찜하지 못했습니다. 잠시 후 다시 시도해 주세요.')
    }
  }

  if (places.length === 0) {
    return (
      <EmptyState
        icon={ForkKnifeIcon}
        title="주변에 뜬 곳이 없습니다"
        description="여행 지역이 정해지면 근처 맛집과 착한식당이 여기 나옵니다."
      />
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <MapPlaceholder places={shown} />

      {error ? (
        <p role="alert" className="text-danger text-sm">
          {error}
        </p>
      ) : null}

      <div className="flex items-center justify-between gap-3">
        <FilterChip
          label="착한식당만"
          isSelected={isChakanOnly}
          onToggle={() => setIsChakanOnly((v) => !v)}
        />
        <p className="text-muted font-mono text-xs tracking-widest">
          찜 {savedCount}곳
        </p>
      </div>

      {shown.length === 0 ? (
        <EmptyState
          icon={SmileyMehIcon}
          title="착한식당이 없습니다"
          description="이 근처는 아직 등록된 착한가격업소가 없습니다."
        />
      ) : (
        <ul className="divide-line border-line bg-surface rounded-card divide-y border px-5">
          {shown.map((place) => {
            const isSaved = place.savedToTripId === tripId
            return (
              <li key={place.id} className="flex items-center gap-3 py-4">
                <div className="min-w-0 flex-1">
                  <p className="font-display truncate font-medium">
                    {place.name}
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    <Badge className="bg-ink/5 text-muted">
                      {place.category}
                    </Badge>
                    {place.isChakan ? (
                      <Badge className="bg-accent text-surface">착한가격업소</Badge>
                    ) : null}
                  </div>
                </div>
                <ActionButton
                  size="sm"
                  tone={isSaved ? 'accent' : 'quiet'}
                  aria-pressed={isSaved}
                  onClick={() => toggleSave(place.id)}
                >
                  <HeartIcon
                    size={14}
                    weight={isSaved ? 'fill' : 'bold'}
                    aria-hidden
                  />
                  {isSaved ? '찜함' : '찜'}
                </ActionButton>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
