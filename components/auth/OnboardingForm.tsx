'use client'

import { useActionState } from 'react'
import { BirthDateField } from '@/components/auth/BirthDateField'
import { ConsentFields } from '@/components/auth/ConsentFields'
import { ActionButton } from '@/components/dashboard/ActionButton'
import {
  submitOnboarding,
  type OnboardingState,
} from '@/lib/auth/onboardingActions'

const EMPTY: OnboardingState = { errors: {} }

/**
 * 구글로 들어온 사람에게 생년월일과 동의를 받는 폼.
 * 입력·검증·동의 UI 모두 가입 폼이 쓰던 것을 그대로 쓴다 — 로그인 수단이
 * 달라도 만 14세 기준과 동의 항목은 같아야 한다.
 */
export function OnboardingForm() {
  const [state, action, isPending] = useActionState(submitOnboarding, EMPTY)

  return (
    <form action={action} className="flex flex-col gap-6">
      <BirthDateField error={state.errors.birthDate} />

      <ConsentFields
        errors={{
          agreeTerms: state.errors.agreeTerms,
          agreePrivacy: state.errors.agreePrivacy,
        }}
      />

      <ActionButton
        type="submit"
        tone="ink"
        size="lg"
        disabled={isPending}
        className="w-full"
      >
        {isPending ? '시작하는 중…' : '시작하기'}
      </ActionButton>
    </form>
  )
}
