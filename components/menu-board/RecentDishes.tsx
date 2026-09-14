import { ArrowUpRightIcon } from '@phosphor-icons/react/dist/ssr'
import type { Food } from '@/lib/data/types'

export function RecentDishes({
  foods,
  currentId,
  disabled,
  onSelect,
}: {
  foods: Food[]
  currentId?: string
  disabled: boolean
  onSelect: (food: Food) => void
}) {
  if (foods.length < 2) return null
  return (
    <section aria-label="최근 뽑은 메뉴" className="mt-6">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold">아까 그 메뉴도 괜찮았는데</h3>
        <p className="text-food-amber text-xs">이번 조건에서 뽑은 최근 메뉴</p>
      </div>
      <ul className="divide-food-roast/15 divide-y">
        {foods.map((food) => (
          <li key={food.id}>
            <button
              type="button"
              disabled={disabled}
              aria-pressed={food.id === currentId}
              onClick={() => onSelect(food)}
              className="hover:bg-surface/30 flex min-h-12 w-full items-center gap-3 py-3 text-left text-sm transition-colors disabled:opacity-50"
            >
              <span aria-hidden className="text-2xl">
                {food.emoji}
              </span>
              <span className="min-w-0 flex-1 font-medium break-words">
                {food.name}
              </span>
              {food.id === currentId ? (
                <span className="text-food-amber shrink-0 text-xs">
                  보고 있어요
                </span>
              ) : (
                <ArrowUpRightIcon size={16} aria-hidden className="shrink-0" />
              )}
            </button>
          </li>
        ))}
      </ul>
      <p className="text-food-amber mt-2 text-xs">
        새로고침하거나 조건을 바꾸면 기록이 사라져요.
      </p>
    </section>
  )
}
