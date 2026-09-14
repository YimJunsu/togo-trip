import type { Food } from '@/lib/data/types'

const PREVIEW_ROWS = 4

export function DishPreview({ candidates }: { candidates: Food[] }) {
  const firstOfEach = candidates.filter(
    (food, index) =>
      candidates.findIndex((item) => item.category === food.category) === index,
  )
  const preview = [
    ...firstOfEach,
    ...candidates.filter((food) => !firstOfEach.includes(food)),
  ].slice(0, PREVIEW_ROWS)

  if (candidates.length === 0)
    return (
      <div className="py-4">
        <h2 className="font-display text-xl font-semibold">
          이 조건에는 준비된 메뉴가 없어요
        </h2>
        <p className="text-food-amber mt-2 text-sm leading-relaxed">
          종류를 해제하거나 컨디션을 추가해 보세요. 초기화하면 모든 메뉴를 다시
          볼 수 있어요.
        </p>
      </div>
    )

  return (
    <div className="py-1">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-semibold tracking-tight">
            메뉴 고민, 여기서 끝.
          </h2>
          <p className="text-food-amber mt-2 text-sm">
            {candidates.length === 1
              ? '조건에 꼭 맞는 한 가지를 준비했어요.'
              : '차림표를 넘기듯, 오늘의 한 끼를 골라요.'}
          </p>
        </div>
        <p className="text-food-chili shrink-0 text-right">
          <span className="font-display block text-3xl leading-none font-semibold tabular-nums">
            {candidates.length}
          </span>
          <span className="mt-1 block text-xs">가지 메뉴</span>
        </p>
      </div>
      <ul
        aria-label="추천 후보 예시"
        className="text-food-amber mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs"
      >
        {preview.map((food) => (
          <li key={food.id} className="flex items-center gap-1.5">
            <span aria-hidden className="text-base">
              {food.emoji}
            </span>
            {food.name}
          </li>
        ))}
      </ul>
    </div>
  )
}
