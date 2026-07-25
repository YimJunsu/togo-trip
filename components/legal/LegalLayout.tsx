import type { ReactNode } from 'react'

/**
 * 약관·방침 공통 골격. 두 문서가 같은 리듬으로 읽히게 한다.
 * 본문은 길지만 카드를 쌓지 않고 제목과 여백으로만 나눈다 (DESIGN_SYSTEM §2).
 */
export function LegalLayout({
  title,
  effectiveDate,
  intro,
  children,
}: {
  title: string
  effectiveDate: string
  intro: string
  children: ReactNode
}) {
  return (
    <article className="flex flex-col gap-6">
      <header>
        <p className="text-muted font-mono text-xs tracking-widest">
          시행일 {effectiveDate}
        </p>
        <h1 className="font-display mt-2 text-3xl font-semibold tracking-tight">
          {title}
        </h1>
        <p className="text-muted mt-2 text-sm leading-relaxed">{intro}</p>
      </header>

      <div className="flex flex-col gap-8">{children}</div>
    </article>
  )
}

export function LegalSection({
  heading,
  children,
}: {
  heading: string
  children: ReactNode
}) {
  return (
    <section>
      <h2 className="font-display text-lg font-semibold tracking-tight">
        {heading}
      </h2>
      <div className="mt-2 flex flex-col gap-2 text-sm leading-relaxed">
        {children}
      </div>
    </section>
  )
}

/** 항목 나열. 문단 안에 쉼표로 늘어놓는 것보다 읽고 확인하기 쉽다. */
export function LegalList({ items }: { items: readonly string[] }) {
  return (
    <ul className="text-muted flex list-disc flex-col gap-1 pl-5">
      {items.map((item) => (
        <li key={item} className="leading-relaxed">
          {item}
        </li>
      ))}
    </ul>
  )
}
