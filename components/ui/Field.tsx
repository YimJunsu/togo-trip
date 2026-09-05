'use client'

import { useId } from 'react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils/cn'

/**
 * 라벨·입력·힌트를 묶는 중립 래퍼. 라벨과 입력의 연결(htmlFor/id), 힌트·에러의 aria 연결만 책임진다.
 * 시각 언어는 호출부가 준다 — 세 갈래(소프트 미니멀/보딩패스/극장 배치)가 같은 구조를 다르게 입기 때문이다.
 */
export function Field({
  label,
  hint,
  error,
  className,
  labelClassName,
  hintClassName,
  errorClassName,
  children,
}: {
  label: string
  hint?: string
  error?: string
  /** 라벨·입력·힌트를 감싸는 바깥 래퍼. 간격을 호출부가 조정할 때 쓴다. */
  className?: string
  labelClassName?: string
  hintClassName?: string
  errorClassName?: string
  children: (props: {
    id: string
    'aria-describedby': string | undefined
    'aria-invalid': boolean | undefined
  }) => ReactNode
}) {
  const id = useId()
  const describedById = error ? `${id}-error` : hint ? `${id}-hint` : undefined

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className={cn('text-sm font-bold', labelClassName)}>
        {label}
      </label>
      {children({
        id,
        'aria-describedby': describedById,
        'aria-invalid': error ? true : undefined,
      })}
      {error ? (
        <p
          id={`${id}-error`}
          className={cn('text-sm font-bold', errorClassName)}
        >
          {error}
        </p>
      ) : hint ? (
        <p
          id={`${id}-hint`}
          className={cn('text-sm opacity-70', hintClassName)}
        >
          {hint}
        </p>
      ) : null}
    </div>
  )
}
