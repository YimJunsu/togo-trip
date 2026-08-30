'use client'

import { useEffect, useState } from 'react'
import { ShuffleIcon, SmileyMehIcon } from '@phosphor-icons/react'
import { ActionButton } from '@/components/dashboard/ActionButton'
import { DestinationCard } from '@/components/dashboard/DestinationCard'
import { DrawSlot } from '@/components/dashboard/DrawSlot'
import { EmptyState } from '@/components/dashboard/EmptyState'
import { FilterChip } from '@/components/dashboard/FilterChip'
import { drawDestination, listDestinations } from '@/lib/destinations/actions'
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

type Phase = 'idle' | 'spinning' | 'done' | 'error'

/** 슬롯이 최소 이만큼은 돌아야 "뽑았다"는 느낌이 난다. */
const MIN_SPIN_MS = 1200

export function RandomDrawer({
  initialCandidates,
}: {
  /** 필터가 없을 때의 후보. 서버에서 받아 두어야 "후보 0곳"이 깜빡이지 않는다. */
  initialCandidates: Destination[]
}) {
  const [themes, setThemes] = useState<DestinationTheme[]>([])
  const [budget, setBudget] = useState<BudgetLevel | undefined>()
  const [season, setSeason] = useState<Season | undefined>()

  const [candidates, setCandidates] = useState<Destination[]>(initialCandidates)
  const [phase, setPhase] = useState<Phase>('idle')
  const [result, setResult] = useState<Destination | null>(null)

  const filter = { themes, budget, season }

  useEffect(() => {
    let isStale = false
    listDestinations({ themes, budget, season })
      .then((found) => {
        if (!isStale) setCandidates(found)
      })
      .catch(() => {
        if (!isStale) setCandidates([])
      })
    return () => {
      isStale = true
    }
  }, [themes, budget, season])

  function toggleTheme(theme: DestinationTheme) {
    setThemes((prev) =>
      prev.includes(theme) ? prev.filter((t) => t !== theme) : [...prev, theme],
    )
  }

  async function draw() {
    setPhase('spinning')
    setResult(null)
    const spun = new Promise((r) => setTimeout(r, MIN_SPIN_MS))
    try {
      const [picked] = await Promise.all([drawDestination(filter), spun])
      setResult(picked)
      setPhase('done')
    } catch {
      setPhase('error')
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <FilterGroup label="테마">
        {THEME_ORDER.map((theme) => (
          <FilterChip
            key={theme}
            label={THEME_LABEL[theme]}
            isSelected={themes.includes(theme)}
            onToggle={() => toggleTheme(theme)}
          />
        ))}
      </FilterGroup>

      <FilterGroup label="예산">
        {BUDGET_ORDER.map((level) => (
          <FilterChip
            key={level}
            label={BUDGET_LABEL[level]}
            isSelected={budget === level}
            onToggle={() => setBudget(budget === level ? undefined : level)}
          />
        ))}
      </FilterGroup>

      <FilterGroup label="계절">
        {SEASON_ORDER.map((s) => (
          <FilterChip
            key={s}
            label={SEASON_LABEL[s]}
            isSelected={season === s}
            onToggle={() => setSeason(season === s ? undefined : s)}
          />
        ))}
      </FilterGroup>

      <div className="border-line border-t pt-6">
        <p className="text-muted mb-3 font-mono text-xs tracking-widest">
          후보 {candidates.length}곳
        </p>

        {phase === 'spinning' ? (
          <DrawSlot names={candidates.map((c) => c.name)} />
        ) : phase === 'done' && result ? (
          <DestinationCard destination={result} />
        ) : phase === 'done' ? (
          <EmptyState
            icon={SmileyMehIcon}
            title="조건에 맞는 곳이 없습니다"
            description="필터를 좀 풀어 보세요. 욕심이 과했을 수 있습니다."
          />
        ) : phase === 'error' ? (
          <div className="rounded-card border-danger/25 bg-danger/5 border p-8 text-center">
            <p className="font-display text-danger text-lg font-semibold">
              뽑기 실패
            </p>
            <p className="text-muted mt-1 text-sm">다시 한 번 눌러 주세요.</p>
          </div>
        ) : (
          <EmptyState
            icon={ShuffleIcon}
            title="아직 안 뽑았습니다"
            description="위에서 원하는 조건을 고르고 뽑기를 누르세요. 안 골라도 됩니다."
          />
        )}

        <ActionButton
          tone="accent"
          size="lg"
          className="mt-5 w-full"
          disabled={phase === 'spinning'}
          onClick={draw}
        >
          <ShuffleIcon size={20} weight="bold" aria-hidden />
          {phase === 'spinning'
            ? '뽑는 중…'
            : phase === 'done'
              ? '다시 뽑기'
              : '여행지 뽑기'}
        </ActionButton>
      </div>
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
      <legend className="text-muted mb-2 text-sm font-medium">{label}</legend>
      <div className="flex flex-wrap gap-2">{children}</div>
    </fieldset>
  )
}
