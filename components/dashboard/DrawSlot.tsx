'use client'

import { useEffect, useState } from 'react'

const TICK_MS = 80

/**
 * 뽑는 동안 후보 이름이 빠르게 지나가는 슬롯 창.
 * 실제 추첨은 repository가 한다 — 여기서 보이는 이름은 연출일 뿐이다.
 */
export function DrawSlot({ names }: { names: string[] }) {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (names.length === 0) return
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % names.length)
    }, TICK_MS)
    return () => clearInterval(id)
  }, [names.length])

  return (
    <div
      className="rounded-card bg-accent text-surface flex h-44 items-center justify-center overflow-hidden"
      role="status"
      aria-live="polite"
    >
      <span className="sr-only">뽑는 중</span>
      <span
        className="font-display text-3xl font-semibold tracking-tight opacity-70"
        aria-hidden
      >
        {names[index] ?? '…'}
      </span>
    </div>
  )
}
