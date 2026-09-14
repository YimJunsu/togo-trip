'use client'

import { useId, useState, type ReactNode } from 'react'
import { TabList } from '@/components/ui/TabList'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils/cn'

export type Mode = {
  id: string
  label: string
  panel: ReactNode
}

/**
 * 뽑기 방식 전환. 패널을 언마운트하지 않고 hidden으로 숨겨
 * 탭을 오가도 필터·결과 상태가 남아 있게 한다.
 *
 * /random과 /food가 같이 쓴다. 탭 라벨을 하드코딩해 두면 두 화면 중
 * 한쪽을 고칠 때 다른 쪽이 조용히 따라 바뀐다.
 */
export function ModeTabs({ modes }: { modes: Mode[] }) {
  const [current, setCurrent] = useState(modes[0]?.id ?? '')
  const id = useId()

  return (
    <div className="flex flex-col gap-6">
      <TabList
        aria-label="여행지 뽑는 방법"
        className="bg-ink/5 flex rounded-full p-1"
      >
        {modes.map((mode) => (
          <Button
            key={mode.id}
            role="tab"
            id={`${id}-tab-${mode.id}`}
            aria-controls={`${id}-panel-${mode.id}`}
            tabIndex={current === mode.id ? 0 : -1}
            aria-selected={current === mode.id}
            onClick={() => setCurrent(mode.id)}
            className={cn(
              'font-display min-h-11 flex-1 rounded-full py-2 text-sm font-semibold transition duration-200 ease-out',
              current === mode.id
                ? 'bg-surface text-accent shadow-soft'
                : 'text-muted hover:text-ink',
            )}
          >
            {mode.label}
          </Button>
        ))}
      </TabList>

      {modes.map((mode) => (
        <div
          key={mode.id}
          role="tabpanel"
          id={`${id}-panel-${mode.id}`}
          aria-labelledby={`${id}-tab-${mode.id}`}
          tabIndex={0}
          hidden={current !== mode.id}
        >
          {mode.panel}
        </div>
      ))}
    </div>
  )
}
