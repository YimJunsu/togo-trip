import type { ButtonHTMLAttributes } from 'react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils/cn'

export type Tone = 'ink' | 'accent' | 'quiet'
type Size = 'sm' | 'md' | 'lg'

const TONE: Record<Tone, string> = {
  ink: 'bg-ink text-paper hover:bg-ink/90',
  accent: 'bg-accent text-surface hover:brightness-[0.97]',
  quiet: 'bg-surface text-ink border-line border hover:bg-paper',
}

const SIZE: Record<Size, string> = {
  sm: 'px-3.5 py-1.5 text-sm',
  md: 'px-5 py-2.5',
  lg: 'px-6 py-3.5 text-lg',
}

/**
 * 버튼 생김새만 뽑아낸 것. <Link>는 버튼을 자식으로 둘 수 없어서(a > button은 잘못된 마크업)
 * 링크에는 이 클래스를 직접 입힌다.
 * 누르면 살짝 눌리는 촉감. (DESIGN_SYSTEM §5)
 */
export function actionButtonClass({
  tone = 'ink',
  size = 'md',
  className,
}: {
  tone?: Tone
  size?: Size
  className?: string
} = {}): string {
  return cn(
    'font-display inline-flex items-center justify-center gap-2 rounded-full text-center font-semibold',
    'transition duration-200 ease-out active:scale-[0.98]',
    TONE[tone],
    SIZE[size],
    className,
  )
}

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: Tone
  size?: Size
}

export function ActionButton({ tone, size, className, ...rest }: Props) {
  return (
    <Button
      className={cn(
        actionButtonClass({ tone, size, className }),
        'disabled:active:scale-100',
      )}
      {...rest}
    />
  )
}
