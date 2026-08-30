'use client'

import { useActionState, useEffect, useRef } from 'react'
import { ActionButton } from '@/components/dashboard/ActionButton'
import { TextField } from '@/components/dashboard/TextField'
import {
  changePasswordAction,
  type PasswordFormState,
} from '@/lib/auth/actions'

const EMPTY: PasswordFormState = {}

export function PasswordForm() {
  const [state, formAction, isPending] = useActionState(
    changePasswordAction,
    EMPTY,
  )
  const formRef = useRef<HTMLFormElement>(null)

  // 성공하면 입력칸을 비운다. 바꾼 비밀번호가 화면에 남아 있을 이유가 없고,
  // 남겨 두면 폼이 그대로라 정말 바뀐 건지 알기 어렵다.
  useEffect(() => {
    if (state.done) formRef.current?.reset()
  }, [state.done])

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-5">
      <TextField
        label="현재 비밀번호"
        name="currentPassword"
        type="password"
        required
      />
      <TextField
        label="새 비밀번호"
        name="password"
        type="password"
        placeholder="8자 이상"
        error={state.errors?.password}
        required
      />
      <TextField
        label="새 비밀번호 확인"
        name="passwordConfirm"
        type="password"
        error={state.errors?.passwordConfirm}
        required
      />

      {state.message ? (
        <p role="alert" className="text-danger text-sm">
          {state.message}
        </p>
      ) : null}
      {state.done ? (
        <p role="status" className="text-sm font-medium">
          비밀번호를 바꿨습니다.
        </p>
      ) : null}

      <ActionButton type="submit" tone="ink" disabled={isPending}>
        {isPending ? '바꾸는 중…' : '비밀번호 바꾸기'}
      </ActionButton>
    </form>
  )
}
