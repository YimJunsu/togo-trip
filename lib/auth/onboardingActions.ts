'use server'

import { redirect } from 'next/navigation'
import { authRepo } from '@/lib/data'
import { getPendingUser } from '@/lib/auth/session'
import { validateOnboarding, type OnboardingErrors } from '@/lib/auth/validate'

export type OnboardingState = { errors: OnboardingErrors }

function field(formData: FormData, name: string): string {
  const value = formData.get(name)
  return typeof value === 'string' ? value : ''
}

/**
 * 온보딩 제출.
 *
 * getUser()가 아니라 getPendingUser()를 쓴다 — 미완료 사용자는 getUser()에게
 * 로그인하지 않은 것으로 보이므로, 그걸 쓰면 자기 자신을 통과시키지 못한다.
 */
export async function submitOnboarding(
  _prev: OnboardingState,
  formData: FormData,
): Promise<OnboardingState> {
  const user = await getPendingUser()
  if (!user) redirect('/login')

  const fields = {
    birthDate: field(formData, 'birthDate'),
    agreeTerms: formData.get('agreeTerms') === 'on',
    agreePrivacy: formData.get('agreePrivacy') === 'on',
  }

  // 화면에서 막지만 그 검증은 우회할 수 있어 서버에서 다시 본다.
  const errors = validateOnboarding(fields, new Date())
  if (Object.keys(errors).length > 0) return { errors }

  try {
    await authRepo.completeOnboarding(user.id, fields.birthDate)
  } catch (error) {
    // 사유를 화면에 그대로 내보내지 않는다. 저장소 오류가 드러날 수 있다.
    console.error('온보딩 저장 실패:', error)
    return { errors: { birthDate: '저장하지 못했습니다. 다시 시도해 주세요.' } }
  }

  redirect('/')
}
