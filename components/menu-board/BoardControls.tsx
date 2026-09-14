'use client'

import type { ButtonHTMLAttributes } from 'react'
import {
  ShuffleIcon,
  SlidersHorizontalIcon,
} from '@phosphor-icons/react/dist/ssr'
import { Button } from '@/components/ui/Button'
import { TabList } from '@/components/ui/TabList'
import { cn } from '@/lib/utils/cn'

/**
 * 메뉴판 갈래의 주 버튼. 작게 둥근 모서리에 chili 바탕이다. (DESIGN_SYSTEM §3)
 * 알약도 초록도 아니다 — 보딩패스가 navy 버튼을 갖는 것과 같은 이유로,
 * 갈래 안에서는 그 갈래의 색이 이긴다.
 */
const BOARD_BUTTON_TONE = {
  /** 주 동작. 한 화면에 하나만 둔다. */
  solid: 'bg-food-chili text-surface hover:bg-food-chili/90',
  /** 곁들이는 동작. 선만 얹어 주 버튼과 위계를 만든다. */
  outline:
    'border-food-roast/20 text-food-roast border bg-transparent hover:bg-food-soft/50',
} as const

export function BoardButton({
  className,
  tone = 'solid',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: keyof typeof BOARD_BUTTON_TONE
}) {
  return (
    <Button
      className={cn(
        'rounded-inner flex min-h-13 w-full items-center justify-center gap-2 px-5 py-3.5 text-base font-semibold',
        'transition duration-200 ease-out active:scale-[0.98] disabled:opacity-60 disabled:active:scale-100',
        BOARD_BUTTON_TONE[tone],
        className,
      )}
      {...rest}
    />
  )
}

/** 종이 태그의 생김새. 토글(BoardTag)과 동작 버튼(BoardTagAction)이 나눠 쓴다. */
const TAG_BASE =
  'rounded-sm min-h-10 px-3 py-2 text-sm transition duration-200 ease-out active:scale-[0.96]'
const TAG_OFF =
  'border-food-roast/20 text-food-roast border bg-surface/40 hover:bg-food-soft/50'
const TAG_ON = 'bg-food-soft text-food-chili border-food-chili border'

/**
 * 벽에 붙은 종이 태그. 알약(FilterChip)을 쓰지 않는 이유는 그게 소프트 미니멀의
 * 물건이기 때문이다. 선택 상태는 색과 함께 aria-pressed로도 알린다. (DESIGN_SYSTEM §4)
 */
export function BoardTag({
  label,
  isSelected,
  onToggle,
}: {
  label: string
  isSelected: boolean
  onToggle: () => void
}) {
  return (
    <Button
      aria-pressed={isSelected}
      onClick={onToggle}
      className={cn(TAG_BASE, isSelected ? TAG_ON : TAG_OFF)}
    >
      {label}
    </Button>
  )
}

/**
 * 같은 생김새지만 누르면 그 자리에서 끝나는 동작 버튼이다.
 * BoardTag를 isSelected={false}로 돌려쓰지 않는다 — 누른 뒤에도 눌리지 않은 상태로
 * 남는 aria-pressed는 스크린리더에게 "이 토글은 꺼져 있다"는 거짓말이 된다.
 */
export function BoardTagAction({
  label,
  onSelect,
}: {
  label: string
  onSelect: () => void
}) {
  return (
    <Button onClick={onSelect} className={cn(TAG_BASE, TAG_OFF)}>
      {label}
    </Button>
  )
}

/**
 * 밑줄 탭. 알약 탭을 쓰지 않는다 — 종이 위에 회색 알약이 뜨면 그 부분만
 * 대시보드에서 떨어져 나온 것처럼 보인다.
 */
export function BoardTabs({
  idPrefix,
  tabs,
  current,
  onSelect,
}: {
  idPrefix: string
  tabs: { id: string; label: string }[]
  current: string
  onSelect: (id: string) => void
}) {
  return (
    <TabList
      aria-label="메뉴 뽑는 방법"
      className="border-food-roast/15 grid grid-cols-2 border-b"
    >
      {tabs.map((tab) => (
        <Button
          key={tab.id}
          role="tab"
          id={`${idPrefix}-tab-${tab.id}`}
          aria-controls={`${idPrefix}-panel-${tab.id}`}
          tabIndex={current === tab.id ? 0 : -1}
          aria-selected={current === tab.id}
          onClick={() => onSelect(tab.id)}
          className={cn(
            'font-display -mb-px flex min-h-12 items-center justify-center gap-2 border-b-2 pb-3 text-base font-semibold tracking-tight transition duration-200',
            current === tab.id
              ? 'border-food-chili text-food-chili'
              : 'text-food-amber hover:text-food-roast border-transparent',
          )}
        >
          {tab.id === 'any' ? (
            <ShuffleIcon size={19} aria-hidden />
          ) : (
            <SlidersHorizontalIcon size={19} aria-hidden />
          )}
          {tab.label}
        </Button>
      ))}
    </TabList>
  )
}
