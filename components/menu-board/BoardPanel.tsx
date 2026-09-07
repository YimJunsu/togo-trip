'use client'

import { useState } from 'react'
import { BoardTabs } from '@/components/menu-board/BoardControls'
import { BoardDraw } from '@/components/menu-board/BoardDraw'
import { BoardFilters } from '@/components/menu-board/BoardFilters'
import { BoardRule } from '@/components/menu-board/MenuBoard'
import type { Food } from '@/lib/data/types'

const TABS = [
  { id: 'any', label: '아무거나' },
  { id: 'pick', label: '골라서' },
]

/**
 * 차림표의 두 갈래. 패널을 언마운트하지 않고 hidden으로 숨겨
 * 탭을 오가도 필터·결과가 남아 있게 한다.
 *
 * ModeTabs(알약 탭)를 쓰지 않는다 — 종이 위에 회색 알약이 뜨면 그 부분만
 * 대시보드에서 떨어져 나온 것처럼 보인다. (DESIGN_SYSTEM §3)
 */
export function BoardPanel({ foods }: { foods: Food[] }) {
  const [current, setCurrent] = useState('any')

  return (
    <div>
      <BoardTabs tabs={TABS} current={current} onSelect={setCurrent} />
      <BoardRule isThin />

      <div hidden={current !== 'any'}>
        <BoardDraw candidates={foods} />
      </div>
      <div hidden={current !== 'pick'}>
        <BoardFilters foods={foods} />
      </div>
    </div>
  )
}
