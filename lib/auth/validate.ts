/**
 * 가입 입력 검증. 브라우저의 required·type 검증은 우회 가능하므로
 * Server Action이 같은 함수를 다시 호출한다. 규칙은 여기 한 곳에만 둔다.
 */

export type SignUpFields = {
  name: string
  email: string
  password: string
  /** 화면 전용 확인 입력. 저장소로는 넘어가지 않는다. */
  passwordConfirm: string
  phone: string
  birthDate: string
  /** 이용약관 동의 (필수). 체크 여부만 넘어오고 저장하지 않는다. */
  agreeTerms: boolean
  /** 개인정보 수집·이용 동의 (필수). */
  agreePrivacy: boolean
}

export type FieldErrors = Partial<Record<keyof SignUpFields, string>>

export const MIN_PASSWORD_LENGTH = 8

/**
 * 가입 하한 연령. 만 14세 미만은 법정대리인 동의가 있어야 개인정보를 수집할 수 있어,
 * 그 절차를 갖출 때까지 가입 자체를 막는다.
 *
 * 성격상 lib/legal/policy.ts에 있어야 할 값이지만 여기 둔다 — 이 파일은 테스트가
 * 노드에서 직접 불러오는데, 노드는 `@/` 별칭을 풀지 못해 값 import가 깨진다.
 * (기존 import들이 멀쩡한 건 전부 타입 전용이라 컴파일 때 지워지기 때문이다.)
 * 방침 쪽에서 이 값을 다시 export하므로 문서와 검증은 같은 숫자를 본다.
 */
export const MIN_SIGNUP_AGE = 14

/** 공백 없는 로컬@도메인.최상위. 실제 도달 여부는 이메일 인증이 볼 일이다. */
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** 형식만 본다. 중복 조회를 걸기 전에 호출부가 이걸로 거른다. */
export function isEmailShape(value: string): boolean {
  return EMAIL.test(value.trim())
}

/** 하이픈·공백을 걷어내고 숫자만 남긴다. 저장 형식은 숫자열이다. */
export function normalizePhone(raw: string): string {
  return raw.replace(/\D/g, '')
}

/**
 * `Date.parse`는 '1995-02-30'을 3월 2일로 넘겨 준다.
 * 되돌려 찍어 보고 입력과 같을 때만 실재하는 날짜로 본다.
 */
function isRealDate(iso: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false
  const t = Date.parse(`${iso}T00:00:00Z`)
  if (Number.isNaN(t)) return false
  return new Date(t).toISOString().slice(0, 10) === iso
}

/**
 * 생일이 지났는지까지 따진 만 나이.
 * 연도만 빼면 생일 전인 사람을 한 살 많게 세어 만 14세 경계에서 틀린다.
 */
export function ageOn(birthDate: string, today: Date): number {
  const [y, m, d] = birthDate.split('-').map(Number)
  let age = today.getUTCFullYear() - y
  const month = today.getUTCMonth() + 1
  const day = today.getUTCDate()
  if (month < m || (month === m && day < d)) age -= 1
  return age
}

export function validateSignUp(
  fields: SignUpFields,
  today: Date,
): FieldErrors {
  const errors: FieldErrors = {}

  if (!fields.name.trim()) errors.name = '이름을 입력하세요.'

  if (!EMAIL.test(fields.email.trim())) {
    errors.email = '이메일 형식이 아닙니다.'
  }

  if (fields.password.length < MIN_PASSWORD_LENGTH) {
    errors.password = `비밀번호는 ${MIN_PASSWORD_LENGTH}자 이상이어야 합니다.`
  }

  if (fields.password !== fields.passwordConfirm) {
    errors.passwordConfirm = '비밀번호가 일치하지 않습니다.'
  }

  const phone = normalizePhone(fields.phone)
  if (phone.length < 10 || phone.length > 11) {
    errors.phone = '전화번호는 숫자 10~11자리입니다.'
  }

  if (!isRealDate(fields.birthDate)) {
    errors.birthDate = '생년월일을 정확히 입력하세요.'
  } else if (fields.birthDate > today.toISOString().slice(0, 10)) {
    errors.birthDate = '생년월일이 오늘보다 뒤입니다.'
  } else if (ageOn(fields.birthDate, today) < MIN_SIGNUP_AGE) {
    // 만 14세 미만은 법정대리인 동의가 있어야 개인정보를 수집할 수 있다.
    // 그 절차를 갖출 때까지는 가입 자체를 막는다.
    errors.birthDate = `만 ${MIN_SIGNUP_AGE}세 미만은 가입할 수 없습니다.`
  }

  // 필수 동의는 화면에서 막지만, 그 검증은 우회할 수 있어 여기서 다시 본다.
  if (!fields.agreeTerms) {
    errors.agreeTerms = '이용약관에 동의해야 가입할 수 있습니다.'
  }
  if (!fields.agreePrivacy) {
    errors.agreePrivacy = '개인정보 수집·이용에 동의해야 가입할 수 있습니다.'
  }

  return errors
}
