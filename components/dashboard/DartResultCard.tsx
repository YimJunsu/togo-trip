import Link from 'next/link'
import { ArrowCounterClockwiseIcon, MapPinIcon } from '@phosphor-icons/react'
import {
  ActionButton,
  actionButtonClass,
} from '@/components/dashboard/ActionButton'
import type { SigunguRegion } from '@/lib/geo/koreaMap'

/** 다트가 꽂힌 결과. 레퍼런스처럼 지역명 + 위경도 좌표를 보여준다. */
export function DartResultCard({
  region,
  coords,
  onRetry,
}: {
  region: SigunguRegion
  coords: [number, number]
  onRetry: () => void
}) {
  const [lat, lng] = coords
  return (
    <div className="bg-surface rounded-card border-line shadow-soft animate-rise border p-6 text-center">
      <span className="bg-accent-soft font-display inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold">
        <MapPinIcon size={14} weight="fill" aria-hidden />
        여행지 당첨
      </span>
      <h2 className="font-display mt-3 text-4xl font-semibold tracking-tight">
        {region.name}
      </h2>
      <p className="text-muted mt-1 text-sm">{region.province}</p>
      <p className="text-muted mt-3 font-mono text-xs tracking-widest">
        북위 {lat.toFixed(3)}° · 동경 {lng.toFixed(3)}°
      </p>

      <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
        <ActionButton tone="accent" onClick={onRetry}>
          <ArrowCounterClockwiseIcon size={18} weight="bold" aria-hidden />
          다시 던지기
        </ActionButton>
        <Link
          href="/trips/new"
          className={actionButtonClass({ tone: 'quiet' })}
        >
          이 지역으로 여행방 만들기
        </Link>
      </div>
    </div>
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
