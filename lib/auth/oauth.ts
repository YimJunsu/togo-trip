'use server'

import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createSupabaseServerClient } from '@/lib/supabase/server'

/**
 * 구글 로그인 시작. Supabase가 만들어 준 구글 동의 화면 주소로 보낸다.
 *
 * redirectTo는 요청의 origin에서 만든다 — localhost와 운영이 같은 코드로 돌아야 하고,
 * 하드코딩하면 로컬에서 운영으로 튕긴다. 이 주소는 Supabase의 Redirect URLs에
 * 등록돼 있어야 한다(설계 §13).
 */
export async function signInWithGoogle(): Promise<void> {
  const headerList = await headers()
  const origin = headerList.get('origin') ?? `https://${headerList.get('host')}`

  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${origin}/auth/callback` },
  })

  if (error || !data.url) {
    // 사유를 화면에 그대로 내보내지 않는다. 설정 오류가 드러날 수 있다.
    console.error('구글 로그인 시작 실패:', error?.message)
    redirect('/login?error=oauth')
  }

  redirect(data.url)
}
