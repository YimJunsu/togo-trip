import type { ReactNode } from 'react'
import type { Icon } from '@phosphor-icons/react'

export function EmptyState({
  icon: Glyph,
  title,
  description,
  action,
}: {
  icon: Icon
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <div className="rounded-card border-line flex flex-col items-center gap-3 border border-dashed p-10 text-center">
      <span className="bg-accent-soft text-ink rounded-full p-3">
        <Glyph size={22} weight="regular" aria-hidden />
      </span>
      <h3 className="font-display text-lg font-semibold tracking-tight">
        {title}
      </h3>
      <p className="text-muted max-w-xs text-sm leading-relaxed">
        {description}
      </p>
      {action}
    </div>
  )
}
