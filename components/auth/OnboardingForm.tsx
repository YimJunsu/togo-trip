'use client'

import { useActionState } from 'react'
import { BirthDateField } from '@/components/auth/BirthDateField'
import { ConsentFields } from '@/components/auth/ConsentFields'
import { ActionButton } from '@/components/dashboard/ActionButton'
import { TextField } from '@/components/dashboard/TextField'
import {
  submitOnboarding,
  type OnboardingState,
} from '@/lib/auth/onboardingActions'

const EMPTY: OnboardingState = { errors: {} }

/**
 * 구글로 들어온 사람에게 닉네임·생년월일·동의를 받는 폼.
 * 입력·검증·동의 UI 모두 가입 폼이 쓰던 것을 그대로 쓴다 — 로그인 수단이
 * 달라도 만 14세 기준과 동의 항목은 같아야 한다.
 *
 * 닉네임 칸은 구글 표시명으로 미리 채워 둔다. 대부분은 그대로 두고 지나가고,
 * 구글 이름이 실명이라 내걸기 싫은 사람만 고친다.
 */
export function OnboardingForm({ initialName }: { initialName: string }) {
  const [state, action, isPending] = useActionState(submitOnboarding, EMPTY)

  return (
    <form action={action} className="flex flex-col gap-6">
      <TextField
        label="닉네임"
        name="name"
        defaultValue={initialName}
        autoComplete="nickname"
        placeholder="여행방에서 보일 이름"
        hint="실명이 아니어도 됩니다. 나중에 설정에서 바꿀 수 있어요."
        maxLength={20}
        required
        error={state.errors.name}
      />

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
