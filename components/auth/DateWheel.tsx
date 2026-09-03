'use client'

import { useEffect, useRef } from 'react'
import { indexFromScroll } from '@/lib/utils/birthDate'
import { cn } from '@/lib/utils/cn'

/**
 * iOS 날짜 선택기의 열 하나.
 *
 * 굴리는 물리를 직접 짜지 않는다 — 그냥 스크롤 컨테이너이고, scroll-snap이
 * 항목을 가운데에 물린다. 관성 스크롤·트랙패드·마우스 휠이 전부 브라우저
 * 기본 동작으로 따라온다.
 *
 * 이 컴포넌트는 표현일 뿐이라 aria-hidden이다. 진짜 폼 컨트롤은 호출부가
 * sr-only로 두는 <select>다. 둘 다 읽히면 같은 값을 두 번 듣게 된다.
 */

/** 항목 높이(px). 아래 h-10과 반드시 같아야 한다 — 스크롤 위치를 이걸로 나눈다. */
const ITEM_HEIGHT = 40
/** 보이는 줄 수. 홀수여야 가운데 한 줄이 생긴다. */
const VISIBLE = 5
/** 첫 항목과 마지막 항목도 가운데에 설 수 있게 위아래를 비운다. */
const PAD = ((VISIBLE - 1) / 2) * ITEM_HEIGHT

/** 스크롤이 멎었다고 볼 시간(ms). scrollend가 없는 브라우저가 아직 있어 직접 잰다. */
const SETTLE_MS = 120

export function DateWheel({
  items,
  value,
  onChange,
  format,
}: {
  items: number[]
  value: number
  onChange: (next: number) => void
  /** 화면에 찍을 글자. 값 자체는 숫자로 다룬다. */
  format: (item: number) => string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const settle = useRef<ReturnType<typeof setTimeout> | null>(null)
  /** 사용자가 굴리는 중인지. 그동안은 스크롤 위치를 되돌려 쓰지 않는다. */
  const isScrolling = useRef(false)

  // 값 → 스크롤.
  //
  // 이 effect가 도는 시점엔 dialog가 아직 닫혀 있다. 자식의 effect가 부모(Sheet)의
  // showModal()보다 먼저 돌기 때문이다. 닫힌 dialog 안은 display:none이라 그때 준
  // scrollTop은 0으로 잘린다.
  //
  // requestAnimationFrame으로는 안 된다 — React의 effect 플러시와 rAF는 순서가
  // 보장되지 않아 실제로 rAF가 먼저 터졌고, 연도 휠이 2000이 아니라 목록 맨 위인
  // 2012에 서 있었다. setTimeout은 매크로태스크라 플러시가 끝난 뒤에 실행된다.
  useEffect(() => {
    const el = ref.current
    if (!el || isScrolling.current) return

    const index = items.indexOf(value)
    if (index < 0) return

    const id = setTimeout(() => {
      el.scrollTop = index * ITEM_HEIGHT
    }, 0)
    return () => clearTimeout(id)
  }, [value, items])

  useEffect(() => () => clearTimeout(settle.current ?? undefined), [])

  function handleScroll() {
    const el = ref.current
    if (!el) return

    isScrolling.current = true
    clearTimeout(settle.current ?? undefined)

    settle.current = setTimeout(() => {
      isScrolling.current = false
      const next = items[indexFromScroll(el.scrollTop, ITEM_HEIGHT, items.length)]
      if (next !== undefined && next !== value) onChange(next)
    }, SETTLE_MS)
  }

  return (
    <div
      ref={ref}
      onScroll={handleScroll}
      aria-hidden
      style={{ paddingTop: PAD, paddingBottom: PAD }}
      className={cn(
        'h-50 flex-1 snap-y snap-mandatory overflow-y-scroll',
        // 위아래로 갈수록 흐려져 원통처럼 보인다.
        '[mask-image:linear-gradient(to_bottom,transparent,black_30%,black_70%,transparent)]',
        // 스크롤바가 보이면 세 열의 폭이 서로 달라진다.
        '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
      )}
    >
      {items.map((item) => (
        <div
          key={item}
          className={cn(
            'flex h-10 snap-center items-center justify-center text-[17px] tabular-nums',
            // 색만으로 알리지 않는다 — 굵기와 명도가 함께 바뀐다. (DESIGN_SYSTEM §4)
            item === value ? 'text-ink font-semibold' : 'text-muted',
          )}
        >
          {format(item)}
        </div>
      ))}
    </div>
  )
}
