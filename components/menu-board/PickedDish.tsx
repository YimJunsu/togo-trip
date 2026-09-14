import { ForkKnifeIcon } from '@phosphor-icons/react/dist/ssr'
import type { Food } from '@/lib/data/types'
import { FOOD_CATEGORY_LABEL, FOOD_CONDITION_LABEL } from '@/lib/utils/labels'

/** 개별 음식 사진 대신 실제 메뉴명을 주인공으로 삼는다. 붓펜 선택 표시만 더한다. */
export function PickedDish({ food }: { food: Food }) {
  return (
    <div className="animate-rise">
      <div className="text-food-chili flex items-center justify-between gap-3 text-xs font-semibold">
        <p className="flex items-center gap-2">
          <ForkKnifeIcon size={18} aria-hidden />
          오늘의 선택
        </p>
        <span className="text-food-amber font-normal">
          {FOOD_CATEGORY_LABEL[food.category]}
        </span>
      </div>
      <p className="text-food-amber mt-6 text-sm">오늘은 이걸로 먹어요.</p>
      <div className="relative my-3 inline-block max-w-full px-2 py-1">
        <h2 className="font-display relative text-4xl leading-tight font-bold tracking-tight sm:text-5xl">
          {food.name}
        </h2>
        <svg
          viewBox="0 0 240 96"
          preserveAspectRatio="none"
          className="animate-stamp text-food-chili pointer-events-none absolute inset-0 h-full w-full opacity-0"
          fill="none"
          aria-hidden
        >
          <path
            d="M218 28C178 7 101 5 48 19 10 29 4 50 20 66c22 23 116 31 179 9 29-10 37-31 18-44"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-2">
        {food.conditions.map((condition) => (
          <span
            key={condition}
            className="bg-food-soft text-food-amber rounded-sm px-2 py-1 text-xs"
          >
            {FOOD_CONDITION_LABEL[condition]}
          </span>
        ))}
      </div>
      <div className="border-food-roast/15 mt-5 flex items-baseline justify-between gap-3 border-t pt-3 text-xs">
        <span className="text-food-amber">일반적인 1인분 기준</span>
        <p>
          <span className="font-mono text-base font-semibold">
            {food.nutrition.kcal.toLocaleString('ko-KR')}
          </span>{' '}
          kcal
        </p>
      </div>
    </div>
  )
}
