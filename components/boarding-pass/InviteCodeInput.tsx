'use client'

import { Field } from '@/components/ui/Field'

export const INVITE_CODE_LENGTH = 6

/**
 * 입력 규칙의 단일 출처: 대문자 영문·숫자만, 6자리까지.
 * 손으로 치는 경우와 초대 링크(/join?code=)로 받아 온 값에 같은 규칙을 적용한다.
 */
export function normalizeInviteCode(raw: string): string {
  return raw
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, INVITE_CODE_LENGTH)
}

/** 좌석번호처럼 넓은 자간의 모노스페이스 대문자. 입력은 항상 대문자로 정규화한다. */
export function InviteCodeInput({
  value,
  onChange,
  error,
}: {
  value: string
  onChange: (next: string) => void
  error?: string
}) {
  return (
    <Field
      label="INVITE CODE"
      hint={`영문·숫자 ${INVITE_CODE_LENGTH}자리`}
      error={error}
      labelClassName="font-mono text-xs tracking-widest text-pass-navy"
      hintClassName="font-mono text-xs tracking-widest text-pass-navy"
      errorClassName="font-mono text-xs tracking-widest text-pass-stamp"
    >
      {(props) => (
        <input
          {...props}
          value={value}
          onChange={(e) => onChange(normalizeInviteCode(e.target.value))}
          inputMode="text"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          placeholder="——————"
          className="border-pass-line bg-paper text-pass-navy placeholder:text-pass-line/60 rounded-pass w-full border px-4 py-3 text-center font-mono text-2xl tracking-[0.4em]"
        />
      )}
    </Field>
  )
}
