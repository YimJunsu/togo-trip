'use client'

import { useEffect, useRef, useState } from 'react'
import { ArrowCounterClockwiseIcon, ShuffleIcon } from '@phosphor-icons/react'
import { ActionButton } from '@/components/dashboard/ActionButton'
import { DestinationCard } from '@/components/dashboard/DestinationCard'
import { DrawSlot } from '@/components/dashboard/DrawSlot'
import { drawDestination, listDestinations } from '@/lib/destinations/actions'
import type { Destination, DestinationFilter } from '@/lib/data/types'

const MIN_SPIN_MS = 1200

/** 부모의 조건 key가 바뀌면 진행 중 응답과 이전 결과를 함께 버린다. */
export function FilteredDestinationDraw({
  filter,
  initialCandidates,
}: {
  filter: DestinationFilter
  initialCandidates: Destination[]
}) {
  const isFiltered = Boolean(
    filter.themes?.length || filter.budget || filter.season,
  )
  const [candidates, setCandidates] = useState(
    isFiltered ? [] : initialCandidates,
  )
  const [loading, setLoading] = useState(isFiltered)
  const [loadError, setLoadError] = useState(false)
  const [reload, setReload] = useState(0)
  const [phase, setPhase] = useState<'idle' | 'spinning' | 'done' | 'error'>(
    'idle',
  )
  const [result, setResult] = useState<Destination | null>(null)
  const mountedRef = useRef(false)
  const drawingRef = useRef(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const resultRef = useRef<HTMLDivElement>(null)
  // 이 인스턴스의 조건은 부모의 key가 보장한다. 상태 변경마다 조회하지 않는다.
  const filterRef = useRef(filter)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  useEffect(() => {
    if (!isFiltered) return
    let stale = false
    listDestinations(filterRef.current)
      .then((items) => {
        if (!stale) {
          setCandidates(items)
          setLoading(false)
        }
      })
      .catch(() => {
        if (!stale) {
          setLoadError(true)
          setLoading(false)
        }
      })
    return () => {
      stale = true
    }
  }, [isFiltered, reload])

  useEffect(() => {
    if (
      phase === 'done' &&
      result &&
      !rootRef.current?.closest('[hidden]') &&
      rootRef.current?.contains(document.activeElement)
    ) {
      resultRef.current?.focus({ preventScroll: true })
      resultRef.current?.scrollIntoView({ block: 'nearest' })
    }
  }, [phase, result])

  async function draw() {
    if (drawingRef.current || loading || loadError || !candidates.length) return
    drawingRef.current = true
    setPhase('spinning')
    setResult(null)
    const delay = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      ? 0
      : MIN_SPIN_MS
    try {
      const [picked] = await Promise.all([
        drawDestination(filterRef.current),
        new Promise((resolve) => setTimeout(resolve, delay)),
      ])
      if (!mountedRef.current) return
      setResult(picked)
      setPhase('done')
    } catch {
      if (mountedRef.current) setPhase('error')
    } finally {
      drawingRef.current = false
    }
  }

  const isEmpty =
    !loading &&
    !loadError &&
    (candidates.length === 0 || (phase === 'done' && !result))

  return (
    <div ref={rootRef} className="border-line border-t pt-5">
      <p className="text-muted mb-4 text-sm" role="status">
        {loading
          ? '조건에 맞는 여행지를 찾고 있어요…'
          : loadError
            ? '후보를 불러오지 못했어요'
            : `지금 조건으로 떠날 수 있는 곳 ${candidates.length}곳`}
      </p>
      {loadError ? (
        <ActionButton
          tone="quiet"
          onClick={() => {
            setLoadError(false)
            setLoading(true)
            setReload((value) => value + 1)
          }}
        >
          <ArrowCounterClockwiseIcon size={18} aria-hidden />
          후보 다시 불러오기
        </ActionButton>
      ) : phase === 'spinning' ? (
        <DrawSlot names={candidates.map((item) => item.name)} />
      ) : result ? (
        <div
          ref={resultRef}
          tabIndex={-1}
          aria-label={`추천 여행지 ${result.name}`}
          className="scroll-mt-24 focus:outline-none"
        >
          <DestinationCard destination={result} />
        </div>
      ) : isEmpty ? (
        <p className="text-muted py-5 text-sm leading-relaxed">
          조건에 맞는 여행지가 없어요. 예산이나 계절을 해제하거나, 테마를 더
          골라 보세요.
        </p>
      ) : phase === 'error' ? (
        <p role="alert" className="text-danger py-4 text-sm">
          여행지를 뽑지 못했어요. 아래 버튼으로 다시 시도해 주세요.
        </p>
      ) : (
        <div className="bg-accent-soft/40 rounded-card p-5">
          <p className="font-display text-xl font-semibold">
            마음이 가는 조건만 골라요.
          </p>
          <p className="text-muted mt-2 text-sm leading-relaxed">
            바다도, 산도 좋아요. 테마는 하나라도 맞으면 후보가 되고, 예산과
            계절은 함께 맞춰 드려요.
          </p>
        </div>
      )}
      <ActionButton
        tone="accent"
        className="mt-5 min-h-12 w-full"
        disabled={
          loading || loadError || !candidates.length || phase === 'spinning'
        }
        onClick={draw}
      >
        <ShuffleIcon size={20} aria-hidden />
        {phase === 'spinning'
          ? '여행지 고르는 중…'
          : result
            ? '다른 여행지 뽑기'
            : phase === 'error'
              ? '다시 시도하기'
              : '이 조건으로 여행지 뽑기'}
      </ActionButton>
    </div>
  )
}
