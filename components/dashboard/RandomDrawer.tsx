'use client'

import { useState } from 'react'
import { FilterChip } from '@/components/dashboard/FilterChip'
import { FilteredDestinationDraw } from '@/components/dashboard/FilteredDestinationDraw'
import type {
  BudgetLevel,
  Destination,
  DestinationTheme,
  Season,
} from '@/lib/data/types'
import {
  BUDGET_LABEL,
  BUDGET_ORDER,
  SEASON_LABEL,
  SEASON_ORDER,
  THEME_LABEL,
  THEME_ORDER,
} from '@/lib/utils/labels'

export function RandomDrawer({
  initialCandidates,
}: {
  initialCandidates: Destination[]
}) {
  const [themes, setThemes] = useState<DestinationTheme[]>([])
  const [budget, setBudget] = useState<BudgetLevel | undefined>()
  const [season, setSeason] = useState<Season | undefined>()
  const hasFilter = Boolean(themes.length || budget || season)
  const filterKey = `${[...themes].sort().join(',')}:${budget ?? 'all'}:${season ?? 'all'}`

  function toggleTheme(theme: DestinationTheme) {
    setThemes((previous) =>
      previous.includes(theme)
        ? previous.filter((item) => item !== theme)
        : [...previous, theme],
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-muted text-sm">
          테마는 여러 개, 예산과 계절은 하나씩.
        </p>
        {hasFilter && (
          <button
            type="button"
            className="text-accent min-h-10 shrink-0 text-sm underline underline-offset-4"
            onClick={() => {
              setThemes([])
              setBudget(undefined)
              setSeason(undefined)
            }}
          >
            초기화
          </button>
        )}
      </div>
      <FilterGroup label="어떤 풍경이 좋아요?">
        {THEME_ORDER.map((theme) => (
          <FilterChip
            key={theme}
            label={THEME_LABEL[theme]}
            isSelected={themes.includes(theme)}
            onToggle={() => toggleTheme(theme)}
          />
        ))}
      </FilterGroup>
      <FilterGroup label="예산은 어느 정도로?">
        {BUDGET_ORDER.map((level) => (
          <FilterChip
            key={level}
            label={BUDGET_LABEL[level]}
            isSelected={budget === level}
            onToggle={() => setBudget(budget === level ? undefined : level)}
          />
        ))}
      </FilterGroup>
      <FilterGroup label="언제 떠날까요?">
        {SEASON_ORDER.map((value) => (
          <FilterChip
            key={value}
            label={SEASON_LABEL[value]}
            isSelected={season === value}
            onToggle={() => setSeason(season === value ? undefined : value)}
          />
        ))}
      </FilterGroup>
      <FilteredDestinationDraw
        key={filterKey}
        filter={{ themes, budget, season }}
        initialCandidates={initialCandidates}
      />
    </div>
  )
}

function FilterGroup({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-semibold">{label}</legend>
      <div className="flex flex-wrap gap-2">{children}</div>
    </fieldset>
  )
}
