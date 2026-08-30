'use server'

import { redirect } from 'next/navigation'
import {
  authRepo,
  DuplicateEmailError,
  InvalidCredentialsError,
} from '@/lib/data'
import { createSession, destroySession, requireUser } from './session'
import {
  isEmailShape,
  normalizePhone,
  validateSignUp,
  MIN_PASSWORD_LENGTH,
  type FieldErrors,
} from './validate'

export type AuthFormState = { errors?: FieldErrors; message?: string }

function field(formData: FormData, key: string): string {
  const value = formData.get(key)
  return typeof value === 'string' ? value : ''
}

/** 체크박스는 켜졌을 때만 폼에 실린다. 값이 무엇이든 존재 자체가 동의다. */
function checked(formData: FormData, key: string): boolean {
  return formData.get(key) !== null
}

export async function signUpAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const fields = {
    name: field(formData, 'name'),
    email: field(formData, 'email'),
    password: field(formData, 'password'),
    passwordConfirm: field(formData, 'passwordConfirm'),
    phone: field(formData, 'phone'),
    birthDate: field(formData, 'birthDate'),
    agreeTerms: checked(formData, 'agreeTerms'),
    agreePrivacy: checked(formData, 'agreePrivacy'),
  }

  // 브라우저 검증은 우회 가능하므로 여기서 다시 본다.
  const errors = validateSignUp(fields, new Date())
  if (Object.keys(errors).length > 0) return { errors }

  let userId: string
  try {
    // 화면 전용 값과 동의 여부는 저장소로 넘기지 않는다.
    // 필수 동의는 가입의 전제라 따로 기록할 것이 없다 — 가입했으면 동의한 것이다.
    const {
      passwordConfirm: _confirm,
      agreeTerms: _terms,
      agreePrivacy: _privacy,
      ...input
    } = fields
    const profile = await authRepo.signUp({
      ...input,
      phone: normalizePhone(input.phone),
    })
    userId = profile.id
  } catch (error) {
    if (error instanceof DuplicateEmailError) {
      return { errors: { email: error.message } }
    }
    throw error
  }

  await createSession(userId)
  redirect('/')
}

export async function signInAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  let userId: string
  try {
    const profile = await authRepo.signIn(
      field(formData, 'email'),
      field(formData, 'password'),
    )
    userId = profile.id
  } catch (error) {
    // 어느 쪽이 틀렸는지 구분해 알리지 않는다.
    if (error instanceof InvalidCredentialsError) return { message: error.message }
    throw error
  }

  await createSession(userId)
  redirect('/')
}

export async function signOutAction(): Promise<void> {
  await destroySession()
  redirect('/')
}

export type PasswordFormState = AuthFormState & {
  /** 성공 문구는 따로 둔다. message는 실패를 알리는 자리로 이미 쓰고 있다. */
  done?: boolean
}

export async function changePasswordAction(
  _prev: PasswordFormState,
  formData: FormData,
): Promise<PasswordFormState> {
  // 로그인 여부는 화면 게이트에 맡기지 않는다 — Server Action은 직접 호출될 수 있다.
  const user = await requireUser()

  const current = field(formData, 'currentPassword')
  const next = field(formData, 'password')
  const confirm = field(formData, 'passwordConfirm')

  // 규칙은 가입과 같은 곳(validate.ts)에서 온다. 두 화면이 갈리지 않게 한다.
  const errors: FieldErrors = {}
  if (next.length < MIN_PASSWORD_LENGTH) {
    errors.password = `비밀번호는 ${MIN_PASSWORD_LENGTH}자 이상이어야 합니다.`
  }
  if (next !== confirm) {
    errors.passwordConfirm = '비밀번호가 일치하지 않습니다.'
  }
  if (Object.keys(errors).length > 0) return { errors }

  try {
    await authRepo.changePassword(user.id, current, next)
  } catch (error) {
    if (error instanceof InvalidCredentialsError) {
      return { message: '현재 비밀번호가 맞지 않습니다.' }
    }
    throw error
  }

  return { done: true }
}

export type EmailCheck = 'idle' | 'checking' | 'available' | 'taken'

/**
 * 가입 폼이 이메일 입력을 끝냈을 때 부른다. 제출까지 기다리지 않고 바로 알려주기 위한 것.
 * 형식이 틀리면 조회하지 않는다 — 그건 validateSignUp이 볼 일이다.
 */
export async function checkEmailAction(email: string): Promise<EmailCheck> {
  const trimmed = email.trim()
  if (!isEmailShape(trimmed)) return 'idle'
  try {
    return (await authRepo.isEmailTaken(trimmed)) ? 'taken' : 'available'
  } catch (error) {
    // 미리 알려주는 편의 기능이라 실패해도 가입을 막지 않는다. 다만 아무 말도
    // 하지 않는다 — 틀린 "사용 가능"을 보여 주는 것보다 침묵이 낫다.
    // 최종 판정은 signUp의 DuplicateEmailError가 한다.
    console.error('이메일 중복 조회 실패:', error)
    return 'idle'
  }
}
