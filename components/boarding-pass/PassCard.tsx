import type { ReactNode } from 'react'
import { cn } from '@/lib/utils/cn'

/** 카드 안쪽 여백. 절취 노치가 카드 밖으로 걸치는 거리를 여기서 되짚어 계산한다. */
const PAD = 'p-6'

/**
 * 티켓 본체. 브루탈리즘 요소(원색 블록·하드 섀도)를 여기에 섞지 않는다. (DESIGN_SYSTEM §3)
 * 여백을 컴포넌트가 직접 갖는 이유는 `PassTear`의 노치 위치가 이 값에 묶여 있어서다 —
 * 부르는 쪽이 여백을 바꾸면 노치가 카드 모서리에서 어긋난다.
 */
export function PassCard({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'border-pass-line bg-pass-cream text-pass-navy rounded-pass relative overflow-hidden border font-mono',
        PAD,
        className,
      )}
    >
      {children}
    </div>
  )
}

/**
 * 절취선. 점선 양 끝에 노치(구멍)를 달아 뜯긴 자리를 만든다.
 * 노치를 카드가 아니라 절취선이 갖는 이유: 카드에 붙이면 카드 높이의 절반에 고정돼,
 * 카드가 길어질 때 점선과 따로 논다. 둘은 같은 하나의 자국이라 항상 같은 높이여야 한다.
 *
 * 가로 위치 -36px = 카드 여백 24px(p-6)을 되돌리고 12px 더 밀어 노치를 반만 걸친 값.
 * 나머지 반은 카드의 overflow-hidden이 잘라내 구멍처럼 보인다.
 */
export function PassTear() {
  return (
    <div className="relative my-4">
      <div className="border-pass-line border-t border-dashed" />
      <Notch className="-left-9" />
      <Notch className="-right-9" />
    </div>
  )
}

function Notch({ className }: { className: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        'bg-paper border-pass-line absolute top-1/2 h-6 w-6 -translate-y-1/2 rounded-full border',
        className,
      )}
    />
  )
}
