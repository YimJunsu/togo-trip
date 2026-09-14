'use client'

import type { HTMLAttributes, KeyboardEvent } from 'react'

/** 방향키로 선택과 포커스를 함께 옮긴다. 패널 상태는 각 화면이 계속 소유한다. */
export function TabList(props: HTMLAttributes<HTMLDivElement>) {
  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
    const tabs = Array.from(
      event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]'),
    )
    const index = tabs.indexOf(event.target as HTMLButtonElement)
    if (index < 0) return
    event.preventDefault()
    const next =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? tabs.length - 1
          : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) %
            tabs.length
    tabs[next]?.focus()
    tabs[next]?.click()
  }
  return <div {...props} role="tablist" onKeyDown={onKeyDown} />
}
