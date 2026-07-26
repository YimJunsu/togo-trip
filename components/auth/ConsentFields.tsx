'use client'

import { useRef } from 'react'
import Link from 'next/link'
import { XIcon } from '@phosphor-icons/react'
import { ActionButton } from '@/components/dashboard/ActionButton'
import { PrivacySummary } from '@/components/legal/PrivacySummary'

type Props = {
  errors: { agreeTerms?: string; agreePrivacy?: string }
}

/**
 * 가입 동의 항목.
 *
 * 필수 동의를 하나로 묶지 않고 약관·개인정보로 나눈다. 개인정보 보호법은 필수 동의를
 * 항목별로 구분해 받도록 하고, 묶어 받으면 동의 자체가 무효가 될 수 있다.
 *
 * 개인정보 항목은 링크만 걸지 않고 그 자리에서 내용을 띄운다 — 무엇을 왜 얼마나
 * 가져가는지가 동의 버튼 옆에 있어야 실질적인 동의가 된다.
 */
export function ConsentFields({ errors }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  return (
    <>
      <div className="bg-surface rounded-card border-line divide-line shadow-soft divide-y border">
        <ConsentRow
          name="agreeTerms"
          label="이용약관 동의"
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

        <ConsentRow
          name="agreePrivacy"
          label="개인정보 수집·이용 동의"
          error={errors.agreePrivacy}
          aside={
            <button
              type="button"
              onClick={() => dialogRef.current?.showModal()}
              className="text-muted hover:text-ink shrink-0 text-xs underline underline-offset-2"
            >
              내용 보기
            </button>
          }
        />
      </div>

      <PrivacyDialog dialogRef={dialogRef} />
    </>
  )
}

/**
 * 네이티브 <dialog>를 쓴다. ESC 닫기, 포커스 가두기, 배경 비활성화를 브라우저가
 * 처리해 주므로 직접 만들 이유가 없다.
 *
 * 이 요소는 가입 <form> 안에 있다. 안쪽 버튼에 type="button"을 반드시 붙인다 —
 * 빠뜨리면 submit으로 동작해 다이얼로그를 열다가 가입이 제출된다.
 *
 * prop 이름은 ref가 아니라 dialogRef다. React 19는 ref도 평범한 prop으로 넘겨 주지만,
 * 그 이름은 버전에 따라 취급이 달라 온 자리라 헷갈릴 여지를 남기지 않는다.
 */
function PrivacyDialog({
  dialogRef,
}: {
  dialogRef: React.Ref<HTMLDialogElement>
}) {
  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="privacy-dialog-title"
      onClick={(e) => {
        // 배경을 누르면 닫는다. 내용 영역 클릭은 안쪽 div가 받으므로 여기 오지 않는다.
        if (e.target === e.currentTarget) e.currentTarget.close()
      }}
      className="rounded-card bg-surface backdrop:bg-ink/50 m-auto w-[calc(100%-2rem)] max-w-md p-0 backdrop:backdrop-blur-sm"
    >
      <div className="flex max-h-[80vh] flex-col">
        <header className="border-line flex items-center justify-between gap-3 border-b px-5 py-4">
          <h2
            id="privacy-dialog-title"
            className="font-display text-base font-semibold tracking-tight"
          >
            개인정보 수집·이용 안내
          </h2>
          <button
            type="button"
            aria-label="닫기"
            onClick={(e) => e.currentTarget.closest('dialog')?.close()}
            className="text-muted hover:text-ink shrink-0 transition duration-200"
          >
            <XIcon size={18} weight="bold" aria-hidden />
          </button>
        </header>

        <div className="overflow-y-auto px-5 py-4">
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

        <footer className="border-line border-t px-5 py-4">
          <ActionButton
            tone="ink"
            className="w-full"
            onClick={(e) => e.currentTarget.closest('dialog')?.close()}
          >
            확인
          </ActionButton>
        </footer>
      </div>
    </dialog>
  )
}

function ConsentRow({
  name,
  label,
  error,
  aside,
}: {
  name: string
  label: string
  error?: string
  aside?: React.ReactNode
}) {
  const errorId = error ? `${name}-error` : undefined

  return (
    <div className="px-5 py-3.5">
      <div className="flex items-center gap-3">
        <label className="flex min-w-0 flex-1 items-center gap-2.5">
          <input
            type="checkbox"
            name={name}
            aria-describedby={errorId}
            aria-invalid={error ? true : undefined}
            className="accent-ink size-4 shrink-0"
          />
          <span className="text-sm font-medium">
            {label}
            <span className="text-danger ml-1">(필수)</span>
          </span>
        </label>
        {aside}
      </div>

      {error && (
        <p id={errorId} className="text-danger mt-1.5 text-xs">
          {error}
        </p>
      )}
    </div>
  )
}
