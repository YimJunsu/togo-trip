'use client'

import { useState } from 'react'
import Link from 'next/link'
import { CaretDownIcon } from '@phosphor-icons/react'
import { PrivacySummary } from '@/components/legal/PrivacySummary'

type Props = {
  errors: { agreeTerms?: string; agreePrivacy?: string }
}

/**
 * 가입 동의 항목.
 *
 * 필수 동의를 하나로 묶지 않고 약관·개인정보로 나눈다. 개인정보 보호법은 필수 동의를
 * 항목별로 구분해 받도록 하고, 묶어 받으면 동의 자체가 무효가 될 수 있다.
 * 마케팅 수신은 거절해도 가입되는 선택 항목이라 시각적으로도 아래에 떼어 놓는다.
 *
 * 개인정보 항목은 링크만 걸지 않고 요약표를 그 자리에서 펼쳐 볼 수 있게 한다 —
 * 무엇을 왜 얼마나 가져가는지가 동의 버튼 옆에 있어야 실질적인 동의가 된다.
 */
export function ConsentFields({ errors }: Props) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="bg-surface rounded-card border-line divide-line shadow-soft divide-y border">
      <ConsentRow
        name="agreeTerms"
        label="이용약관 동의"
        required
        error={errors.agreeTerms}
        aside={
          <Link
            href="/terms"
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted hover:text-ink shrink-0 text-xs underline underline-offset-2"
          >
            전문 보기
          </Link>
        }
      />

      <div>
        <ConsentRow
          name="agreePrivacy"
          label="개인정보 수집·이용 동의"
          required
          error={errors.agreePrivacy}
          aside={
            <button
              type="button"
              onClick={() => setIsOpen((v) => !v)}
              aria-expanded={isOpen}
              className="text-muted hover:text-ink flex shrink-0 items-center gap-0.5 text-xs underline underline-offset-2"
            >
              내용 보기
              <CaretDownIcon
                size={12}
                weight="bold"
                aria-hidden
                className={`transition duration-200 ${isOpen ? 'rotate-180' : ''}`}
              />
            </button>
          }
        />
        {isOpen && (
          <div className="border-line bg-paper animate-rise border-t px-5 py-4">
            <PrivacySummary />
            <Link
              href="/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted hover:text-ink mt-3 inline-block text-xs underline underline-offset-2"
            >
              개인정보처리방침 전문 보기
            </Link>
          </div>
        )}
      </div>

      <ConsentRow
        name="agreeMarketing"
        label="마케팅 정보 수신 동의"
        hint="새 기능·이벤트 소식을 이메일로 받습니다. 동의하지 않아도 가입됩니다."
      />
    </div>
  )
}

function ConsentRow({
  name,
  label,
  required = false,
  hint,
  error,
  aside,
}: {
  name: string
  label: string
  required?: boolean
  hint?: string
  error?: string
  aside?: React.ReactNode
}) {
  const hintId = hint ? `${name}-hint` : undefined
  const errorId = error ? `${name}-error` : undefined

  return (
    <div className="px-5 py-3.5">
      <div className="flex items-center gap-3">
        <label className="flex min-w-0 flex-1 items-center gap-2.5">
          <input
            type="checkbox"
            name={name}
            aria-describedby={errorId ?? hintId}
            aria-invalid={error ? true : undefined}
            className="accent-ink size-4 shrink-0"
          />
          <span className="text-sm font-medium">
            {label}
            <span
              className={required ? 'text-danger ml-1' : 'text-muted ml-1'}
            >
              {required ? '(필수)' : '(선택)'}
            </span>
          </span>
        </label>
        {aside}
      </div>

      {hint && !error && (
        <p id={hintId} className="text-muted mt-1.5 text-xs leading-relaxed">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-danger mt-1.5 text-xs">
          {error}
        </p>
      )}
    </div>
  )
}
