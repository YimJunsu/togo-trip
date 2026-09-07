'use client'

import { useMemo, useState } from 'react'
import { BoardTag } from '@/components/menu-board/BoardControls'
import { BoardDraw } from '@/components/menu-board/BoardDraw'
import { BoardRule } from '@/components/menu-board/MenuBoard'
import { filterFoods } from '@/lib/foods/filter'
import type { Food, FoodCategory, FoodCondition } from '@/lib/data/types'
import {
  FOOD_CATEGORY_LABEL,
  FOOD_CATEGORY_ORDER,
  FOOD_CONDITION_GROUPS,
  FOOD_CONDITION_LABEL,
} from '@/lib/utils/labels'

/**
 * 벽에 붙은 태그를 골라 차림표를 좁힌다.
 *
 * 컨디션 무리(날씨·몸 상태·상황)는 읽기 좋으라고 나눈 것이고 판정은 전체 OR이다.
 * 무리끼리 AND로 걸면 메뉴당 태그가 2~3개뿐이라 두 무리만 건드려도 후보가 0이 된다.
 * (lib/foods/filter.ts)
 */
export function BoardFilters({ foods }: { foods: Food[] }) {
  const [category, setCategory] = useState<FoodCategory | undefined>()
  const [conditions, setConditions] = useState<FoodCondition[]>([])

  // 후보 전체가 이미 손에 있으므로 좁히는 일은 브라우저에서 끝난다.
  // 서버에 다시 물으면 태그를 누를 때마다 왕복이 한 번씩 붙고, 그동안 후보가
  // 잘못된 값으로 보인다.
  const candidates = useMemo(
    () => filterFoods(foods, { category, conditions }),
    [foods, category, conditions],
  )

  function toggleCondition(condition: FoodCondition) {
    setConditions((prev) =>
      prev.includes(condition)
        ? prev.filter((c) => c !== condition)
        : [...prev, condition],
    )
  }

  return (
    <div>
      <TagRow label="종류">
        {FOOD_CATEGORY_ORDER.map((value) => (
          <BoardTag
            key={value}
            label={FOOD_CATEGORY_LABEL[value]}
            isSelected={category === value}
            onToggle={() => setCategory(category === value ? undefined : value)}
          />
        ))}
      </TagRow>

      {FOOD_CONDITION_GROUPS.map((group) => (
        <TagRow key={group.label} label={group.label}>
          {group.conditions.map((condition) => (
            <BoardTag
              key={condition}
              label={FOOD_CONDITION_LABEL[condition]}
              isSelected={conditions.includes(condition)}
              onToggle={() => toggleCondition(condition)}
            />
          ))}
        </TagRow>
      ))}

      <BoardRule isThin />

      <BoardDraw candidates={candidates} />
    </div>
  )
}

function TagRow({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <fieldset className="mb-3">
      <legend className="text-food-amber mb-1.5 font-mono text-[10px] tracking-[0.2em]">
        {label}
      </legend>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </fieldset>
  )
}
