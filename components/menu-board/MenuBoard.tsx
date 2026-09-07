import type { ReactNode } from 'react'

/**
 * 메뉴판 갈래의 종이 한 장. (DESIGN_SYSTEM §3)
 *
 * 카드가 아니라 화면 한 장이 통째로 종이다. 모바일에서는 -mx-4로 레이아웃 패딩을
 * 밀어내 화면 끝까지 종이가 닿게 한다 — 종이 둘레에 스톤 여백이 남으면 그 순간
 * "카드 하나"로 읽혀서 소프트 미니멀과 구분이 사라진다.
 *
 * 질감은 1px 도트 하나뿐이다. 그 이상 얹으면 지저분해진다.
 */
export function MenuBoard({ children }: { children: ReactNode }) {
  return (
    <section
      className="bg-food-cream text-food-roast sm:rounded-card relative -mx-4 px-5 pt-8 pb-10 sm:mx-0 sm:px-8"
      style={{
        backgroundImage:
          'radial-gradient(rgba(74,53,36,0.055) 1px, transparent 1px)',
        backgroundSize: '4px 4px',
      }}
    >
      {children}
    </section>
  )
}

/**
 * 이중 괘선. 위가 굵고 아래가 얇다 — 차림표 제목 아래 긋는 그 선이다.
 * 보딩패스의 절취선(border-dashed)과 헷갈리지 않도록 실선만 쓴다.
 */
export function BoardRule({ isThin = false }: { isThin?: boolean }) {
  if (isThin) {
    return <hr className="border-food-roast/35 my-5 border-t" />
  }
  return <div className="border-food-roast my-5 h-[5px] border-t-2 border-b" />
}

/** 차림표 제목. 두 줄로 끊어 굵게 세운다. */
export function BoardHeading({
  lines,
  caption,
}: {
  lines: [string, string]
  caption: string
}) {
  return (
    <header>
      <h1 className="font-display text-4xl leading-[0.98] font-bold tracking-tight">
        {lines[0]}
        <br />
        {lines[1]}
      </h1>
      <p className="text-food-amber mt-2 font-mono text-[10px] tracking-[0.24em]">
        {caption}
      </p>
    </header>
  )
}
