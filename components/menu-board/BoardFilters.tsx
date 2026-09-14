'use client'

import { useId, useMemo, useState } from 'react'
import { CaretDownIcon } from '@phosphor-icons/react/dist/ssr'
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
  const [isOpen, setIsOpen] = useState(true)
  const controlsId = useId()
  const selection = [
    category ? FOOD_CATEGORY_LABEL[category] : '모든 종류',
    ...conditions.map((condition) => FOOD_CONDITION_LABEL[condition]),
  ].join(' · ')

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
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold">{selection}</p>
          <p className="text-food-amber mt-1 text-xs" role="status">
            지금 조건에 맞는 메뉴 {candidates.length}가지
          </p>
        </div>
        <button
          type="button"
          aria-expanded={isOpen}
          aria-controls={controlsId}
          onClick={() => setIsOpen((open) => !open)}
          className="flex min-h-10 shrink-0 items-center gap-1 text-sm underline underline-offset-4"
        >
          {isOpen ? '조건 접기' : '조건 바꾸기'}
          <CaretDownIcon
            size={16}
            aria-hidden
            className={isOpen ? 'rotate-180' : ''}
          />
        </button>
      </div>
      <div id={controlsId} hidden={!isOpen}>
        <div className="mb-5 flex items-start justify-between gap-3">
          <p className="text-food-amber text-sm leading-relaxed">
            종류는 하나, 컨디션은 여러 개 골라도 좋아요.
            <br />
            컨디션은 하나라도 맞으면 후보에 들어가요.
          </p>
          {(category || conditions.length > 0) && (
            <button
              type="button"
              className="min-h-10 shrink-0 text-sm underline underline-offset-4"
              onClick={() => {
                setCategory(undefined)
                setConditions([])
              }}
            >
              초기화
            </button>
          )}
        </div>
        <TagRow label="종류">
          {FOOD_CATEGORY_ORDER.map((value) => (
            <BoardTag
              key={value}
              label={FOOD_CATEGORY_LABEL[value]}
              isSelected={category === value}
              onToggle={() =>
                setCategory(category === value ? undefined : value)
              }
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
      </div>

      <BoardRule isThin />

      <BoardDraw
        key={`${category ?? 'all'}:${[...conditions].sort().join(',')}`}
        candidates={candidates}
        onDraw={() => setIsOpen(false)}
      />
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
      <legend className="text-food-amber mb-2 text-xs font-semibold">
        {label}
      </legend>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </fieldset>
  )
}
