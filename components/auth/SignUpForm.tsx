'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import {
  CheckCircle,
  CircleNotch,
  Eye,
  EyeSlash,
  WarningCircle,
} from '@phosphor-icons/react'
import { ActionButton } from '@/components/dashboard/ActionButton'
import { TextField } from '@/components/dashboard/TextField'
import { BirthDateField } from '@/components/auth/BirthDateField'
import {
  checkEmailAction,
  signUpAction,
  type AuthFormState,
  type EmailCheck,
} from '@/lib/auth/actions'
import { isEmailShape, MIN_PASSWORD_LENGTH } from '@/lib/auth/validate'

const EMPTY: AuthFormState = {}

export function SignUpForm() {
  const [state, formAction, isPending] = useActionState(signUpAction, EMPTY)
  const errors = state.errors ?? {}

  const [email, setEmail] = useState('')
  const [emailCheck, setEmailCheck] = useState<EmailCheck>('idle')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  // 마지막 요청만 반영한다. 빨리 치면 이전 응답이 늦게 도착해 상태를 덮을 수 있다.
  const requestId = useRef(0)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => clearTimeout(timer.current ?? undefined), [])

  function handleEmailChange(value: string) {
    setEmail(value)
    clearTimeout(timer.current ?? undefined)

    if (!isEmailShape(value)) {
      setEmailCheck('idle')
      return
    }
    setEmailCheck('checking')
    const id = ++requestId.current
    // 타이핑이 멎고 나서 본다. 글자마다 서버를 부르지 않기 위해서다.
    timer.current = setTimeout(async () => {
      const result = await checkEmailAction(value)
      if (id === requestId.current) setEmailCheck(result)
    }, 450)
  }

  const emailError =
    errors.email ??
    (emailCheck === 'taken' ? '이미 가입된 이메일입니다.' : undefined)

  const confirmError =
    errors.passwordConfirm ??
    (confirm && password !== confirm
      ? '비밀번호가 일치하지 않습니다.'
      : undefined)

  return (
    <div className="flex flex-col gap-6">
      <form action={formAction} noValidate className="flex flex-col gap-5">
        <div className="bg-surface rounded-card border-line divide-line shadow-soft divide-y border">
          <div className="px-5 py-3.5">
            <TextField
              variant="row"
              label="이메일"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="togo@example.com"
              required
              value={email}
              onChange={(e) => handleEmailChange(e.target.value)}
              error={emailError}
              hint={
                emailCheck === 'available'
                  ? '사용할 수 있는 이메일입니다.'
                  : undefined
              }
              adornment={
                <EmailStatus state={emailCheck} hasError={!!errors.email} />
              }
            />
          </div>

          <div className="px-5 py-3.5">
            <TextField
              variant="row"
              label="비밀번호"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder={`${MIN_PASSWORD_LENGTH}자 이상`}
              required
              minLength={MIN_PASSWORD_LENGTH}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={errors.password}
              adornment={
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={
                    showPassword ? '비밀번호 숨기기' : '비밀번호 표시'
                  }
                  className="text-muted hover:text-ink shrink-0 transition duration-200"
                >
                  {showPassword ? <EyeSlash size={18} /> : <Eye size={18} />}
                </button>
              }
            />
          </div>

          <div className="px-5 py-3.5">
            <TextField
              variant="row"
              label="비밀번호 확인"
              name="passwordConfirm"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="한 번 더 입력하세요"
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              error={confirmError}
              adornment={
                confirm && password === confirm ? (
                  <CheckCircle
                    size={18}
                    weight="fill"
                    className="text-ink/40 shrink-0"
                  />
                ) : null
              }
            />
          </div>

          <div className="px-5 py-3.5">
            <TextField
              variant="row"
              label="이름"
              name="name"
              autoComplete="name"
              placeholder="실명을 입력하세요"
              required
              error={errors.name}
            />
          </div>

          <div className="px-5 py-3.5">
            <BirthDateField error={errors.birthDate} />
          </div>

          <div className="px-5 py-3.5">
            <TextField
              variant="row"
              label="전화번호"
              name="phone"
              type="tel"
              inputMode="numeric"
              autoComplete="tel"
              placeholder="010-1234-5678"
              required
              error={errors.phone}
            />
          </div>
        </div>

        <ActionButton
          type="submit"
          tone="ink"
          size="lg"
          disabled={isPending}
          className="w-full"
        >
          {isPending ? '가입 중…' : '가입하고 시작하기'}
        </ActionButton>
      </form>

      <p className="text-muted text-center text-sm">
        이미 회원이라면{' '}
        <Link href="/login" className="text-ink font-medium underline">
          로그인
        </Link>
      </p>
    </div>
  )
}

/** 이메일 칸 오른쪽의 조회 상태. 확인 버튼을 누르지 않아도 여기서 결과가 보인다. */
function EmailStatus({
  state,
  hasError,
}: {
  state: EmailCheck
  hasError: boolean
}) {
  if (hasError || state === 'idle') return null
  if (state === 'checking') {
    return (
      <CircleNotch
        size={18}
        className="text-muted shrink-0 motion-safe:animate-spin"
        aria-label="확인 중"
      />
    )
  }
  if (state === 'available') {
    return (
      <CheckCircle
        size={18}
        weight="fill"
        className="text-ink shrink-0"
        aria-label="사용 가능"
      />
    )
  }
  return (
    <WarningCircle
      size={18}
      weight="fill"
      className="text-danger shrink-0"
      aria-label="이미 가입됨"
    />
  )
}
