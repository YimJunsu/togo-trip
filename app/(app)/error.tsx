'use client'

import Link from 'next/link'
import { WarningIcon } from '@phosphor-icons/react'
import {
  ActionButton,
  actionButtonClass,
} from '@/components/dashboard/ActionButton'

export default function AppError({
  reset,
}: {
  error: Error
  reset: () => void
}) {
  return (
    <div className="rounded-card border-danger/20 bg-danger/5 border p-10 text-center">
      <span className="bg-danger/10 text-danger inline-flex rounded-full p-3">
        <WarningIcon size={24} weight="regular" aria-hidden />
      </span>
      <h2 className="font-display mt-4 text-xl font-semibold tracking-tight">
        불러오지 못했습니다
      </h2>
      <p className="text-muted mt-2 text-sm">
        잠시 후 다시 시도해 주세요. 계속 이러면 방장에게 물어보세요.
      </p>
      {/* 다시 시도해도 안 되는 경우가 있어 빠져나갈 길을 함께 둔다. */}
      <div className="mt-6 flex flex-col items-center justify-center gap-2 sm:flex-row">
        <ActionButton tone="ink" onClick={reset}>
          다시 시도
        </ActionButton>
        <Link href="/" className={actionButtonClass({ tone: 'quiet' })}>
          홈으로 가기
        </Link>
      </div>
    </div>
  )
}
