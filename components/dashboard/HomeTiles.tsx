import Link from 'next/link'
import {
  ArrowUpRightIcon,
  ForkKnifeIcon,
  TargetIcon,
} from '@phosphor-icons/react/dist/ssr'

/**
 * 지도 아래의 두 갈래. 뽑기 화면 둘을 나란히 세운다.
 *
 * 예전 홈은 같은 모양의 카드가 세로로 쌓여 있어 무엇이 중요한지 위계가 없었다.
 * 여기서는 색으로 갈라 둔다 — 여행지 뽑기가 이 서비스의 본체라 강조색 면을
 * 가져가고(한 화면에 하나), 음식 뽑기는 흰 카드에 산호 아이콘 칩만 얹는다.
 * 산호는 면으로만, 작게 쓴다 (DESIGN_SYSTEM §1.1).
 */
export function HomeTiles() {
  return (
    <section className="grid grid-cols-2 gap-3">
      <Link
        href="/random"
        className="rounded-card bg-accent text-surface shadow-soft hover:shadow-lift flex flex-col justify-between gap-6 p-5 transition duration-300 ease-out hover:-translate-y-[3px]"
      >
        <span className="bg-surface text-accent flex size-10 items-center justify-center rounded-full">
          <TargetIcon size={22} weight="bold" aria-hidden />
        </span>
        <span>
          <span className="font-display flex items-center gap-1 text-lg font-semibold tracking-tight">
            여행지 뽑기
            <ArrowUpRightIcon size={16} weight="bold" aria-hidden />
          </span>
          {/*
            강조색 면 위의 흰 글자는 opacity-70이면 4.1:1로 AA에 못 미친다. 80이 기준선.
          */}
          <span className="mt-1 block text-sm leading-relaxed opacity-80">
            다트를 던지거나 조건을 걸어 정합니다
          </span>
        </span>
      </Link>

      <Link
        href="/food"
        className="rounded-card border-line bg-surface shadow-soft hover:shadow-lift flex flex-col justify-between gap-6 border p-5 transition duration-300 ease-out hover:-translate-y-[3px]"
      >
        <span className="bg-signal text-ink flex size-10 items-center justify-center rounded-full">
          <ForkKnifeIcon size={22} weight="bold" aria-hidden />
        </span>
        <span>
          <span className="font-display flex items-center gap-1 text-lg font-semibold tracking-tight">
            음식 뽑기
            <ArrowUpRightIcon size={16} weight="bold" aria-hidden />
          </span>
          <span className="text-muted mt-1 block text-sm leading-relaxed">
            오늘 뭐 먹지. 영양정보까지 같이
          </span>
        </span>
      </Link>
    </section>
  )
}
