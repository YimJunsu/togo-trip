import type { ReactNode } from 'react'
import Image from 'next/image'

/**
 * 메뉴판 갈래의 종이 한 장. (DESIGN_SYSTEM §3)
 *
 * 카드가 아니라 화면 한 장이 통째로 종이다. 모바일에서는 -mx-4로 레이아웃 패딩을
 * 밀어내 화면 끝까지 종이가 닿게 한다 — 종이 둘레에 스톤 여백이 남으면 그 순간
 * "카드 하나"로 읽혀서 소프트 미니멀과 구분이 사라진다.
 *
 * 표지는 음식 사진, 본문은 밝은 아이보리. 누런 종이 질감은 제거한다.
 */
export function MenuBoard({ children }: { children: ReactNode }) {
  return (
    <section className="bg-food-cream text-food-roast sm:rounded-card border-food-roast/10 relative -mx-4 overflow-clip border-y sm:mx-0 sm:border">
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
    return <hr className="border-food-roast/15 my-5 border-t" />
  }
  return <div className="border-food-roast my-5 h-1.5 border-t-2 border-b" />
}

/** 사진은 메뉴판의 표지이며 추첨된 개별 음식의 사진이 아니다. */
export function BoardHeading() {
  return (
    <header className="border-food-roast/10 relative isolate flex min-h-60 items-center overflow-hidden border-b sm:min-h-72">
      <Image
        src="/images/food/todays-table.webp"
        alt=""
        width={1536}
        height={1024}
        preload
        sizes="(max-width: 639px) 100vw, 640px"
        className="absolute inset-0 -z-10 size-full object-cover"
      />
      <div className="px-6 py-8 sm:px-8">
        <p className="text-food-chili mb-4 text-xs font-semibold tracking-wider">
          오늘의 차림표
        </p>
        <h1 className="font-display text-3xl leading-tight font-bold tracking-tight sm:text-5xl">
          오늘 뭐
          <br />
          먹을까요?
        </h1>
        <p className="text-food-amber mt-4 max-w-36 text-xs leading-relaxed sm:max-w-60 sm:text-sm">
          고르는 건 가볍게.
          <br />한 끼는 맛있게.
        </p>
      </div>
    </header>
  )
}
