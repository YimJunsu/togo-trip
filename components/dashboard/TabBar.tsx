'use client'

import { Button } from '@/components/ui/Button'
import { TabList } from '@/components/ui/TabList'
import { cn } from '@/lib/utils/cn'

/** 알약 안에서 선택된 탭만 밝아지는 세그먼트. 참고 이미지의 토글 계열. */
export function TabBar<T extends string>({
  idPrefix,
  tabs,
  current,
  onSelect,
}: {
  idPrefix: string
  tabs: readonly { value: T; label: string }[]
  current: T
  onSelect: (value: T) => void
}) {
  return (
    <TabList
      aria-label="여행방 정보"
      className="border-line bg-surface flex gap-1 rounded-full border p-1"
    >
      {tabs.map(({ value, label }) => (
        <Button
          key={value}
          role="tab"
          id={`${idPrefix}-tab-${value}`}
          aria-controls={`${idPrefix}-panel`}
          tabIndex={current === value ? 0 : -1}
          aria-selected={current === value}
          onClick={() => onSelect(value)}
          className={cn(
            'font-display flex-1 rounded-full py-2.5 text-sm font-medium transition duration-200 ease-out',
            current === value
              ? 'bg-ink text-paper'
              : 'text-muted hover:text-ink',
          )}
        >
          {label}
        </Button>
      ))}
    </TabList>
  )
}
