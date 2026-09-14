import Link from 'next/link'
import {
  ArrowCounterClockwiseIcon,
  ArrowRightIcon,
  MapPinIcon,
  UsersIcon,
} from '@phosphor-icons/react'
import {
  ActionButton,
  actionButtonClass,
} from '@/components/dashboard/ActionButton'
import { AttractionList } from '@/components/dashboard/AttractionList'
import { DartLocationMark } from '@/components/dashboard/DartLocationMark'
import type { Attraction } from '@/lib/data/types'
import type { SigunguRegion } from '@/lib/geo/koreaMap'

/** 다트가 꽂힌 결과. 레퍼런스처럼 지역명 + 위경도 좌표를 보여준다. */
export function DartResultCard({
  region,
  coords,
  attractions,
  onRetry,
}: {
  region: SigunguRegion
  coords: [number, number]
  /** 'pending'이면 조회 중. 빈 배열은 "적재됐지만 결과가 없다"와 같다. */
  attractions: Attraction[] | 'pending'
  onRetry: () => void
}) {
  const [lat, lng] = coords
  return (
    <article className="bg-surface rounded-card border-line shadow-soft animate-rise overflow-hidden border">
      <div className="bg-accent-soft/50 flex items-center justify-between gap-4 px-5 py-6 sm:px-7">
        <div className="min-w-0">
          <span className="text-accent inline-flex items-center gap-1.5 text-xs font-semibold">
            <MapPinIcon size={14} weight="fill" aria-hidden />
            다트가 고른 다음 여행
          </span>
          <p className="text-muted mt-5 text-sm">{region.province}</p>
          <h2 className="font-display mt-1 text-4xl font-bold tracking-tight sm:text-5xl">
            {region.name}
          </h2>
          <p className="text-muted mt-4 font-mono text-xs leading-relaxed">
            북위 {lat.toFixed(3)}° · 동경 {lng.toFixed(3)}°
          </p>
        </div>
        <DartLocationMark region={region} />
      </div>

      <div className="p-5 sm:p-7">
        <Link
          href={`/region/${region.code}`}
          className={actionButtonClass({
            tone: 'accent',
            className: 'min-h-12 w-full',
          })}
        >
          {region.name} 둘러보기
          <ArrowRightIcon size={18} aria-hidden />
        </Link>
        <p className="text-muted mt-2 text-center text-xs">
          관광지와 맛집을 보고 여행의 첫 코스를 정해요.
        </p>
        <div className="mt-6">
          <h3 className="mb-3 text-sm font-semibold">여기서 시작해 볼까요?</h3>
          {attractions === 'pending' ? (
            <p role="status" aria-live="polite" className="text-muted text-sm">
              <span className="sr-only">관광지를 불러오는 중입니다.</span>
              가볼 만한 곳을 찾는 중…
            </p>
          ) : (
            <AttractionList
              items={attractions}
              emptyText="이 지역은 아직 준비된 관광지 정보가 없습니다."
            />
          )}
        </div>

        <div className="border-line mt-5 flex flex-col gap-2 border-t pt-5 sm:flex-row">
          <Link
            href="/trips/new"
            className={actionButtonClass({
              tone: 'quiet',
              className: 'min-h-12 flex-1 text-sm',
            })}
          >
            <UsersIcon size={18} aria-hidden />
            친구들과 여행방 만들기
          </Link>
          <ActionButton
            tone="quiet"
            className="min-h-12 text-sm"
            onClick={onRetry}
          >
            <ArrowCounterClockwiseIcon size={18} weight="bold" aria-hidden />
            다시 던지기
          </ActionButton>
        </div>
      </div>
    </article>
  )
}

/** 바다·지도 밖에 떨어진 경우. 벌칙 없이 다시 던지게 한다. */
export function DartMissCard({ onRetry }: { onRetry: () => void }) {
  return (
    <DartRetryCard
      title="바다에 빠졌습니다"
      description="국내 한정입니다. 육지에 꽂힐 때까지 다시 던지세요."
      onRetry={onRetry}
    />
  )
}

/** 휴전선 이북에 떨어진 경우. 바다와 구분해 왜 안 되는지를 알려 준다. */
export function DartNorthCard({ onRetry }: { onRetry: () => void }) {
  return (
    <DartRetryCard
      title="북한에는 갈 수 없습니다"
      description="아직은 국내 한정입니다. 휴전선 아래로 다시 던지세요."
      onRetry={onRetry}
    />
  )
}

function DartRetryCard({
  title,
  description,
  onRetry,
}: {
  title: string
  description: string
  onRetry: () => void
}) {
  return (
    <div className="bg-surface rounded-card border-line shadow-soft animate-rise border p-6 text-center">
      <h2 className="font-display text-2xl font-semibold tracking-tight">
        {title}
      </h2>
      <p className="text-muted mt-1 text-sm">{description}</p>
      <ActionButton tone="ink" className="mt-5" onClick={onRetry}>
        <ArrowCounterClockwiseIcon size={18} weight="bold" aria-hidden />
        다시 던지기
      </ActionButton>
    </div>
  )
}
