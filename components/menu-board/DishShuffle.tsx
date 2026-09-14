import { ArrowLeftIcon } from '@phosphor-icons/react/dist/ssr'
import type { Food } from '@/lib/data/types'
import { cn } from '@/lib/utils/cn'

/** 실제 후보만 넘겨 보여 주는 메뉴판. 결과 판정은 BoardDraw가 이미 끝낸 상태다. */
export function DishShuffle({
  candidates,
  tick,
}: {
  candidates: Food[]
  tick: number
}) {
  return (
    <div aria-hidden className="py-2">
      <p className="text-food-amber mb-4 text-center text-sm">
        메뉴판을 넘기고 있어요
      </p>
      <div className="border-food-roast/15 border-y py-2">
        {[-1, 0, 1].map((offset) => {
          const food =
            candidates[(tick + offset + candidates.length) % candidates.length]
          return (
            <div
              key={offset}
              className={cn(
                'flex min-h-12 items-center justify-between gap-3 px-4 py-2',
                offset === 0
                  ? 'bg-food-soft text-food-chili'
                  : 'text-food-amber opacity-40',
              )}
            >
              <span className="font-display text-xl font-semibold tracking-tight">
                {food?.name}
              </span>
              {offset === 0 && <ArrowLeftIcon size={22} className="shrink-0" />}
            </div>
          )
        })}
      </div>
      <p className="text-food-amber mt-4 text-center text-xs">
        맛있는 우연을 만나는 중…
      </p>
    </div>
  )
}
