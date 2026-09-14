'use client'

import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils/cn'

/** 선택 상태를 색만으로 알리지 않도록 aria-pressed를 함께 준다. (DESIGN_SYSTEM §4) */
export function FilterChip({
  label,
  isSelected,
  onToggle,
}: {
  label: string
  isSelected: boolean
  onToggle: () => void
}) {
  return (
    <Button
      aria-pressed={isSelected}
      onClick={onToggle}
      className={cn(
        'font-display min-h-10 rounded-full px-3.5 py-2 text-sm font-medium',
        'transition duration-200 ease-out active:scale-[0.96]',
        isSelected
          ? 'bg-ink text-paper'
          : 'border-line text-muted hover:border-ink/25 hover:text-ink border bg-transparent',
      )}
    >
      {label}
    </Button>
  )
}
