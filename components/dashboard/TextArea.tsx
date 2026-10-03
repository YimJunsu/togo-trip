'use client'

import type { TextareaHTMLAttributes } from 'react'
import { Field } from '@/components/ui/Field'
import { cn } from '@/lib/utils/cn'

type Props = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'id'> & {
  label: string
  hint?: string
  error?: string
}

/**
 * TextField의 boxed 변형과 같은 생김새를 여러 줄 입력에 입힌 것. 한 줄짜리와 같은
 * 테두리·반경·포커스 규칙을 쓴다 — 폼 안에서 둘이 나란히 서도 다른 물건으로 보이지 않는다.
 * row 변형은 없다. 여러 줄 입력이 구분선 행 안에 들어갈 자리가 아직 없다.
 */
export function TextArea({ label, hint, error, className, ...rest }: Props) {
  return (
    <Field
      label={label}
      hint={hint}
      error={error}
      labelClassName="font-display font-medium"
      errorClassName="text-danger font-normal"
    >
      {(props) => (
        <textarea
          {...props}
          {...rest}
          className={cn(
            'rounded-inner bg-surface placeholder:text-muted/50 focus:border-ink w-full resize-y border px-4 py-3 transition duration-200 ease-out outline-none',
            error ? 'border-danger' : 'border-line',
            className,
          )}
        />
      )}
    </Field>
  )
}
