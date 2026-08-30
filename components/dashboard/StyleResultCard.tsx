import Image from 'next/image'
import type { Icon } from '@phosphor-icons/react'
import {
  ListChecksIcon,
  SunHorizonIcon,
  LightningIcon,
  WalletIcon,
} from '@phosphor-icons/react/dist/ssr'
import { Badge } from '@/components/ui/Badge'
import type { QuizAxis, TravelStyle } from '@/lib/data/types'
import { AXIS_META, AXIS_ORDER } from '@/lib/style/score'

const AXIS_ICON: Record<QuizAxis, Icon> = {
  plan: ListChecksIcon,
  morning: SunHorizonIcon,
  activity: LightningIcon,
  budget: WalletIcon,
}

/** 코드 i번째 글자로 그 축에서 어느 쪽에 섰는지 고른다. */
function sideOf(code: string, axis: QuizAxis, i: number) {
  const meta = AXIS_META[axis]
  return code[i] === meta.high.letter ? meta.high : meta.low
}

/**
 * 결과의 얼굴. 극장 배치다 (DESIGN_SYSTEM §3) — 그림이 카드를 끝까지 채우고
 * 글자가 그 위에 얹힌다. 이 화면은 그림 한 장이 곧 메시지라 테두리를 두지 않는다.
 *
 * 어두운 건 테마가 아니라 사진에 덮은 막이다. 그래서 cine-* 토큰은 이 블록 밖으로
 * 나가지 않고, 아래의 축 그리드·설명 패널은 그대로 밝은 기본 언어다.
 */
export function StyleResultHero({ style }: { style: TravelStyle }) {
  return (
    <section className="rounded-card bg-cine-base text-cine-ink shadow-soft animate-rise overflow-hidden">
      <div className="relative aspect-square w-full sm:aspect-[5/4]">
        <Image
          src={`/images/style/${style.code}.webp`}
          alt={`${style.name} 여행 유형을 표현한 쿼카 일러스트`}
          fill
          sizes="(max-width: 640px) 100vw, 640px"
          className="object-cover"
          priority
        />
        {/* 위를 살짝 눌러 상단이 뜨게 하고, 아래는 본문 색으로 완전히 잠근다. */}
        <div className="from-cine-base/45 absolute inset-x-0 top-0 h-1/4 bg-gradient-to-b to-transparent" />
        <div className="to-cine-base absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-b from-transparent" />

        <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8">
          <p className="text-cine-accent font-mono text-xs font-bold tracking-widest">
            {style.code}
          </p>
          <h1 className="font-display mt-1.5 text-3xl leading-tight font-semibold tracking-tight text-balance sm:text-4xl">
            {style.name} 여행
          </h1>
        </div>
      </div>

      <div className="px-6 pb-6 sm:px-8 sm:pb-8">
        <p className="text-cine-ink/75 text-sm leading-relaxed">
          {style.tagline}
        </p>

        <ul className="mt-4 flex flex-wrap gap-1.5">
          {AXIS_ORDER.map((axis, i) => (
            <li key={axis}>
              <Badge className="bg-cine-ink/15 text-cine-ink">
                {sideOf(style.code, axis, i).label}
              </Badge>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

/** 네 축 요약. 어느 쪽에 섰는지만 보여 준다. */
export function StyleAxisGrid({ style }: { style: TravelStyle }) {
  return (
    <section>
      <h2 className="font-display mb-3 text-lg font-semibold tracking-tight">
        성향 네 가지
      </h2>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {AXIS_ORDER.map((axis, i) => {
          const Glyph = AXIS_ICON[axis]
          const side = sideOf(style.code, axis, i)
          return (
            <li
              key={axis}
              className="rounded-inner border-line bg-surface flex flex-col items-center gap-1.5 border p-4 text-center"
            >
              <Glyph
                size={20}
                weight="regular"
                aria-hidden
                className="text-muted"
              />
              <span className="text-muted text-xs">
                {AXIS_META[axis].label}
              </span>
              <span className="font-display font-semibold tracking-tight">
                {side.label}
              </span>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

/** 읽는 부분. 결과 설명과 성격 분석, 동행 궁합을 나눠 담는다. */
export function StyleNotes({ style }: { style: TravelStyle }) {
  return (
    <section className="flex flex-col gap-3">
      <Panel title="이 결과가 나온 이유">
        <p className="text-sm leading-relaxed">{style.description}</p>
      </Panel>

      <Panel title="성격 분석">
        <dl className="flex flex-col gap-3">
          <div>
            <dt className="text-muted text-xs">이래서 좋다</dt>
            <dd className="mt-1 text-sm leading-relaxed">{style.strength}</dd>
          </div>
          <div>
            <dt className="text-muted text-xs">이건 조심</dt>
            <dd className="mt-1 text-sm leading-relaxed">{style.caution}</dd>
          </div>
        </dl>
      </Panel>

      <Panel title="함께 여행가기 좋은 유형">
        <p className="text-sm leading-relaxed">{style.matchReason}</p>
      </Panel>
    </section>
  )
}

function Panel({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-card border-line bg-surface border p-5">
      <h3 className="font-display text-sm font-semibold tracking-tight">
        {title}
      </h3>
      <div className="text-muted mt-2">{children}</div>
    </div>
  )
}
