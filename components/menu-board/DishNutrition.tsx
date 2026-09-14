import { CaretDownIcon } from '@phosphor-icons/react/dist/ssr'
import { LeaderLine } from '@/components/menu-board/LeaderLine'
import type { Food } from '@/lib/data/types'
import { dailyValuePercent, NUTRIENT_ORDER } from '@/lib/foods/nutrition'
import { NUTRIENT_LABEL } from '@/lib/utils/labels'

export function DishNutrition({ food }: { food: Food }) {
  return (
    <details className="group border-food-roast/25 mt-5 border-y">
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 py-3 text-sm font-semibold [&::-webkit-details-marker]:hidden">
        영양정보 자세히 보기
        <CaretDownIcon
          size={18}
          aria-hidden
          className="shrink-0 transition-transform group-open:rotate-180"
        />
      </summary>
      <div className="pb-4">
        <p className="text-food-amber mb-2 flex justify-between gap-3 text-xs">
          <span>일반적인 1인분 기준</span>
          <span>1일 기준치 대비</span>
        </p>
        {NUTRIENT_ORDER.map((key) => {
          const { name, unit } = NUTRIENT_LABEL[key]
          return (
            <LeaderLine
              key={key}
              label={name}
              value={`${food.nutrition[key].toLocaleString('ko-KR')}${unit}`}
              note={`${dailyValuePercent(key, food.nutrition[key])}%`}
            />
          )
        })}
        <p className="text-food-amber mt-3 text-xs leading-relaxed">
          개인별 필요량과는 다른 표기용 공통 기준입니다. 가게와 조리법에 따라
          실제 값은 달라질 수 있어요.
        </p>
      </div>
    </details>
  )
}
