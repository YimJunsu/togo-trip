'use client'

import { useState } from 'react'
import { BoardButton } from '@/components/menu-board/BoardControls'
import { BoardShareButton } from '@/components/menu-board/BoardShareButton'
import { LeaderLine } from '@/components/menu-board/LeaderLine'
import { PickedDish } from '@/components/menu-board/PickedDish'
import { pickRandom } from '@/lib/foods/filter'
import type { Food } from '@/lib/data/types'

type Phase = 'idle' | 'spinning' | 'done'

/** 이름이 이만큼은 굴러야 "뽑았다"는 느낌이 난다. */
const MIN_SPIN_MS = 1200
const TICK_MS = 80
/** 뽑기 전 차림표에 미리 걸어 두는 후보 줄 수. */
const PREVIEW_ROWS = 7

/**
 * 뽑기 버튼과 결과 자리. 필터는 갖지 않는다 —
 * 아무거나 탭은 이것만 쓰고, 골라서 탭은 BoardFilters가 자기 후보를 여기로 넘긴다.
 *
 * 추첨은 브라우저에서 끝낸다. 후보 전체가 이미 prop으로 내려와 있어 서버에 물어볼
 * 것이 없고, 서버 액션을 부르면 왕복 한 번이 그냥 지연으로 남는다. 데이터를 가져오는
 * 일(foodRepo.list)은 여전히 서버 컴포넌트가 하고, 여기서는 받아 둔 배열에 순수
 * 함수를 돌릴 뿐이다. (CONVENTIONS §4)
 *
 * 빈 상태에 점선 박스를 두지 않는다. 대신 차림표답게 후보 몇 줄을 흐리게 걸어 둔다 —
 * 화면이 비어 있지 않으면서 "아직 안 정했다"가 그대로 읽힌다.
 */
export function BoardDraw({ candidates }: { candidates: Food[] }) {
  const [phase, setPhase] = useState<Phase>('idle')
  const [result, setResult] = useState<Food | null>(null)
  const [tick, setTick] = useState(0)

  function draw() {
    // 추첨은 즉시 끝난다. 이름이 구르는 1.2초는 결과를 기다리는 시간이 아니라
    // "뽑는 중"이라는 연출이라 그대로 둔다.
    const picked = pickRandom(candidates)
    setPhase('spinning')
    setResult(null)

    const spin = setInterval(() => setTick((t) => t + 1), TICK_MS)
    setTimeout(() => {
      clearInterval(spin)
      setResult(picked)
      setPhase('done')
    }, MIN_SPIN_MS)
  }

  const preview = candidates.slice(0, PREVIEW_ROWS)

  return (
    <div>
      <div className="min-h-[17rem]">
        {phase === 'spinning' ? (
          <div
            className="flex min-h-[17rem] flex-col items-center justify-center"
            role="status"
            aria-live="polite"
          >
            <span className="sr-only">뽑는 중</span>
            <p
              className="font-display text-4xl font-bold tracking-tight opacity-45"
              aria-hidden
            >
              {candidates[tick % Math.max(candidates.length, 1)]?.name ?? '…'}
            </p>
          </div>
        ) : phase === 'done' && result ? (
          <PickedDish food={result} />
        ) : phase === 'done' ? (
          <div className="flex min-h-[17rem] flex-col justify-center text-center">
            <p className="font-display text-2xl font-bold tracking-tight">
              오늘은 내어 드릴 게 없습니다
            </p>
            <p className="mt-2 text-sm opacity-70">
              태그를 하나 더 고르거나 종류를 풀어 주세요. 고를수록 후보가
              늘어납니다.
            </p>
          </div>
        ) : (
          <div>
            <p className="text-food-amber mb-1 font-mono text-[10px] tracking-[0.2em]">
              오늘 걸린 것 중에서
            </p>
            {preview.map((food) => (
              <LeaderLine
                key={food.id}
                label={`${food.emoji} ${food.name}`}
                value={`${food.nutrition.kcal.toLocaleString('ko-KR')}kcal`}
                isDim
              />
            ))}
            {candidates.length > PREVIEW_ROWS ? (
              <p className="mt-2 font-mono text-[11px] opacity-45">
                … 그 밖에도 여럿
              </p>
            ) : null}
            {candidates.length === 0 ? (
              <p className="text-sm opacity-60">
                조건에 맞는 메뉴가 없습니다. 태그를 하나 풀어 주세요.
              </p>
            ) : null}
          </div>
        )}
      </div>

      <div className="mt-6 flex flex-col gap-3">
        {phase === 'done' && result ? (
          <BoardShareButton name={result.name} />
        ) : null}
        <BoardButton disabled={phase === 'spinning'} onClick={draw}>
          {phase === 'spinning'
            ? '고르는 중…'
            : phase === 'done'
              ? '다시 정해 주세요'
              : '한 그릇 정해 주세요'}
        </BoardButton>
      </div>
    </div>
  )
}
