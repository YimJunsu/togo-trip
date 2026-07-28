'use client'

import { useState, useTransition } from 'react'
import { SteeringWheelIcon } from '@phosphor-icons/react'
import { FilterChip } from '@/components/dashboard/FilterChip'
import { setDiscountRateAction } from '@/lib/trips/actions'

/** 흔히 쓰는 값만 칩으로. 자유 입력은 소수점 검증과 오타 정산을 부른다. */
const RATES = [0, 0.1, 0.2, 0.3, 0.5] as const

export function DiscountRateField({
  tripId,
  initialRate,
}: {
  tripId: string
  initialRate: number
}) {
  const [rate, setRate] = useState(initialRate)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string>()

  function pick(next: number) {
    const previous = rate
    setRate(next)
    startTransition(async () => {
      try {
        await setDiscountRateAction(tripId, next)
        setError(undefined)
      } catch {
        setRate(previous)
        setError('할인율을 바꾸지 못했습니다.')
      }
    })
  }

  return (
    <fieldset disabled={isPending}>
      <legend className="text-muted mb-2 flex items-center gap-1.5 text-sm font-medium">
        <SteeringWheelIcon size={15} weight="bold" aria-hidden />
        운전자 할인
      </legend>
      <div className="flex flex-wrap gap-2">
        {RATES.map((value) => (
          <FilterChip
            key={value}
            label={value === 0 ? '없음' : `${Math.round(value * 100)}%`}
            isSelected={Math.abs(rate - value) < 0.001}
            onToggle={() => pick(value)}
          />
        ))}
      </div>
      <p className="text-muted mt-2 text-xs">
        운전자가 부담할 몫에서 깎고, 깎인 만큼을 나머지가 나눠 냅니다.
      </p>
      {error ? <p className="text-danger mt-1 text-sm">{error}</p> : null}
    </fieldset>
  )
}
