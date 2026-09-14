'use client'

import { useEffect, useRef, useState } from 'react'
import { ShuffleIcon } from '@phosphor-icons/react/dist/ssr'
import { BoardButton } from '@/components/menu-board/BoardControls'
import { BoardShareButton } from '@/components/menu-board/BoardShareButton'
import { DishNutrition } from '@/components/menu-board/DishNutrition'
import { DishPreview } from '@/components/menu-board/DishPreview'
import { DishShuffle } from '@/components/menu-board/DishShuffle'
import { PickedDish } from '@/components/menu-board/PickedDish'
import { RecentDishes } from '@/components/menu-board/RecentDishes'
import { pickNextFood } from '@/lib/foods/draw'
import type { Food } from '@/lib/data/types'

type Phase = 'idle' | 'spinning' | 'done'
const MIN_SPIN_MS = 1200
const TICK_MS = 80
const HISTORY_LIMIT = 3

/** repository에서 받은 후보로 브라우저에서 추첨한다. 조건 변경 시 key로 기록도 초기화한다. */
export function BoardDraw({
  candidates,
  onDraw,
}: {
  candidates: Food[]
  onDraw?: () => void
}) {
  const [phase, setPhase] = useState<Phase>('idle')
  const [result, setResult] = useState<Food | null>(null)
  const [history, setHistory] = useState<Food[]>([])
  const [tick, setTick] = useState(0)
  const rootRef = useRef<HTMLDivElement>(null)
  const resultRef = useRef<HTMLDivElement>(null)
  const spinRef = useRef<ReturnType<typeof setInterval>>(undefined)
  const finishRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const isDrawingRef = useRef(false)

  useEffect(
    () => () => {
      clearInterval(spinRef.current)
      clearTimeout(finishRef.current)
    },
    [],
  )

  useEffect(() => {
    // 탭을 옮기거나 다른 곳을 조작한 사용자의 초점을 빼앗지 않는다.
    if (
      phase === 'done' &&
      !rootRef.current?.closest('[hidden]') &&
      rootRef.current?.contains(document.activeElement)
    ) {
      resultRef.current?.focus({ preventScroll: true })
      resultRef.current?.scrollIntoView({
        block: 'nearest',
        behavior: 'instant',
      })
    }
  }, [phase, result])

  function draw() {
    if (
      isDrawingRef.current ||
      candidates.length === 0 ||
      (result && candidates.length === 1)
    )
      return
    const picked = pickNextFood(candidates, result?.id)
    if (!picked) return
    const nextFood = picked
    isDrawingRef.current = true
    onDraw?.()
    function finish() {
      clearInterval(spinRef.current)
      isDrawingRef.current = false
      setResult(nextFood)
      setHistory((previous) =>
        [nextFood, ...previous.filter((food) => food.id !== nextFood.id)].slice(
          0,
          HISTORY_LIMIT,
        ),
      )
      setPhase('done')
    }
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      finish()
      return
    }
    setPhase('spinning')
    spinRef.current = setInterval(() => setTick((value) => value + 1), TICK_MS)
    finishRef.current = setTimeout(finish, MIN_SPIN_MS)
  }

  const isDone = phase === 'done' && result
  const hasNoAlternative = Boolean(isDone && candidates.length === 1)

  return (
    <div ref={rootRef}>
      <p className="sr-only" role="status">
        {phase === 'spinning'
          ? '오늘의 메뉴를 고르고 있어요'
          : isDone
            ? `오늘의 메뉴는 ${result.name}입니다`
            : ''}
      </p>
      {phase === 'spinning' ? (
        <DishShuffle candidates={candidates} tick={tick} />
      ) : isDone ? (
        <div
          ref={resultRef}
          tabIndex={-1}
          className="scroll-mt-24 focus:outline-none"
          aria-label={`추천 메뉴: ${result.name}`}
        >
          <PickedDish key={result.id} food={result} />
        </div>
      ) : (
        <DishPreview candidates={candidates} />
      )}

      <div className="mt-5 flex flex-col gap-3">
        <BoardButton
          disabled={
            phase === 'spinning' || candidates.length === 0 || hasNoAlternative
          }
          onClick={draw}
        >
          <ShuffleIcon size={20} aria-hidden />
          {phase === 'spinning'
            ? '고르는 중…'
            : hasNoAlternative
              ? '다른 후보가 없어요'
              : isDone
                ? '다른 메뉴 뽑기'
                : '오늘의 메뉴 뽑기'}
        </BoardButton>
        {hasNoAlternative && (
          <p className="text-food-amber text-center text-sm">
            조건을 바꾸면 더 많은 메뉴를 만날 수 있어요.
          </p>
        )}
        {isDone && <BoardShareButton key={result.id} name={result.name} />}
      </div>
      {isDone && <DishNutrition key={result.id} food={result} />}
      <RecentDishes
        foods={history}
        currentId={result?.id}
        disabled={phase === 'spinning'}
        onSelect={(food) => {
          setResult(food)
          setPhase('done')
        }}
      />
    </div>
  )
}
