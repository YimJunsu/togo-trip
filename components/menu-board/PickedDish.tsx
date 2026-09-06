import { LeaderLine } from '@/components/menu-board/LeaderLine'
import type { Food } from '@/lib/data/types'
import { dailyValuePercent, NUTRIENT_ORDER } from '@/lib/foods/nutrition'
import {
  FOOD_CATEGORY_LABEL,
  FOOD_CONDITION_LABEL,
  NUTRIENT_LABEL,
} from '@/lib/utils/labels'

/**
 * 뽑힌 한 그릇. 메뉴판 갈래의 결과 표현이다. (DESIGN_SYSTEM §3)
 *
 * 도장이 아니라 붓펜 동그라미를 친다 — 도장은 보딩패스 갈래의 표시라서
 * 여기서 쓰면 여행권과 같은 물건으로 보인다. 동그라미는 노포에서 "이거 주세요" 하고
 * 긋는 표시고, 등장은 기존 animate-stamp를 그대로 쓴다 (새 키프레임 없음, §5).
 *
 * 영양정보는 표가 아니라 차림표의 뒷장처럼 점선 리더로 낸다. 나트륨은 기준치를
 * 넘는 메뉴가 흔한데, 그 숫자를 깎지 않고 그대로 적는다. 넘었다고 경고색을 쓰지도
 * 않는다 — danger는 오류 상태 전달용이고 짠 음식은 오류가 아니다.
 */
export function PickedDish({ food }: { food: Food }) {
  return (
    <div className="animate-rise">
      <div className="pt-2 text-center">
        <span className="block text-6xl leading-none" aria-hidden>
          {food.emoji}
        </span>

        {/*
          붓펜 동그라미. 이름만 감싼다 — 이모지까지 물면 획이 그림을 뚫고 지나가
          "그어 놓은 표시"가 아니라 사고처럼 보인다.
          손으로 그은 자국이라 완전한 타원이 아니고 한쪽이 열려 있다.
          장식이므로 aria-hidden — 뽑혔다는 사실은 아래 문구와 aria-live가 전한다.
        */}
        <span className="relative mt-4 inline-block px-7 py-1">
          <p className="font-display relative text-4xl font-bold tracking-tight">
            {food.name}
          </p>
          <svg
            viewBox="0 0 240 96"
            preserveAspectRatio="none"
            className="animate-stamp text-food-roast pointer-events-none absolute inset-0 h-full w-full opacity-0"
            fill="none"
            aria-hidden
          >
            <path
              d="M188 30C170 14 132 8 104 10 62 13 22 28 14 50c-8 22 34 38 82 39 44 1 96-10 108-28 8-12-6-24-26-31"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
        </span>
      </div>

      <p className="text-food-amber mt-5 text-center font-mono text-[11px] tracking-[0.16em]">
        {FOOD_CATEGORY_LABEL[food.category]} ·{' '}
        {food.conditions.map((c) => FOOD_CONDITION_LABEL[c]).join(' · ')}
      </p>

      <div className="border-food-roast/35 mt-6 border-t pt-3">
        <p className="text-food-amber mb-1 font-mono text-[10px] tracking-[0.2em]">
          한 그릇 기준
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
        <p className="mt-3 text-xs leading-relaxed opacity-70">
          오른쪽 수치는 1일 영양성분 기준치 대비 비율입니다. 표기용 공통
          기준이라 개인에게 필요한 양과는 다르고, 가게와 조리법에 따라 실제 값도
          달라집니다.
        </p>
      </div>
    </div>
  )
}
