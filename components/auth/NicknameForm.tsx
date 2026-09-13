'use client'

import { useActionState, useEffect } from 'react'
import { useSession } from '@/components/auth/SessionProvider'
import { ActionButton } from '@/components/dashboard/ActionButton'
import { TextField } from '@/components/dashboard/TextField'
import {
  updateNicknameAction,
  type NicknameFormState,
} from '@/lib/auth/actions'

const EMPTY: NicknameFormState = {}

/**
 * 설정 화면의 닉네임 변경. 구글 로그인은 구글 표시명이 그대로 들어오는데, 그게
 * 실명인 사람은 여행방에 그 이름을 내걸고 싶지 않다 — 그래서 여기서 바꾼다.
 *
 * 저장되면 헤더의 이름도 바뀌어야 하는데, 경로가 그대로라 SessionProvider가
 * 다시 묻지 않는다. reload로 한 번 더 묻게 한다.
 */
export function NicknameForm({ currentName }: { currentName: string }) {
  const [state, formAction, isPending] = useActionState(
    updateNicknameAction,
    EMPTY,
  )
  const { reload } = useSession()

  useEffect(() => {
    if (state.done) reload()
  }, [state.done, reload])

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <TextField
        label="닉네임"
        name="name"
        defaultValue={currentName}
        autoComplete="nickname"
        maxLength={20}
        hint="여행방·화면에 보이는 이름입니다. 이미 참여한 여행방의 표시 이름은 바뀌지 않습니다."
        error={state.errors?.name}
        required
      />
      {state.done && (
        <p role="status" className="text-sm font-medium">
          닉네임을 바꿨습니다.
        </p>
      )}
      <ActionButton type="submit" tone="ink" disabled={isPending}>
        {isPending ? '저장하는 중…' : '닉네임 저장'}
      </ActionButton>
    </form>
  )
}
