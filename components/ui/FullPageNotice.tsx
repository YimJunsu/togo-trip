import type { ReactNode } from 'react'

/**
 * 앱 레이아웃 바깥에서 뜨는 안내 화면.
 *
 * 루트 404와 global-error는 (app) 레이아웃을 거치지 않아 헤더도 네비도 없다.
 * 그래서 브랜드 이름과 빠져나갈 버튼을 이 컴포넌트가 직접 들고 있어야 한다.
 * 버튼은 호출부가 넘긴다 — 404는 라우터가 멀쩡해 next/link를 쓰고,
 * global-error는 라우터를 믿을 수 없어 전체 새로고침(<a>)을 쓴다.
 */
export function FullPageNotice({
  code,
  title,
  description,
  children,
}: {
  /** 화면 위에 크게 뜨는 상태 코드. 숫자가 있으면 무슨 일인지 바로 읽힌다. */
  code: string
  title: string
  description: string
  /** 버튼 자리. */
  children: ReactNode
}) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-4 py-20 text-center">
      <p className="text-muted font-mono text-sm tracking-widest">{code}</p>
      <h1 className="font-display mt-3 text-3xl font-semibold tracking-tight">
        {title}
      </h1>
      <p className="text-muted mt-2 text-sm leading-relaxed">{description}</p>

      <div className="mt-8 flex w-full flex-col gap-2">{children}</div>

      <p className="text-muted mt-10 font-mono text-xs tracking-widest">
        TOGO TRIP
      </p>
    </main>
  )
}
