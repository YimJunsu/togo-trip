import { NextResponse } from 'next/server'
import { authRepo } from '@/lib/data'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * OAuth 콜백. Supabase가 인증을 마치고 code를 붙여 여기로 돌려보낸다.
 * 그 code를 세션으로 바꿔야 서버 렌더가 세션을 읽을 수 있다(PKCE).
 *
 * 온보딩을 마쳤으면 홈, 아니면 온보딩으로 보낸다. 판정은 profiles.onboarded_at이다.
 */
export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')

  // 사용자가 구글 동의 화면에서 취소하면 code 없이 error를 달고 돌아온다.
  if (!code) {
    const reason = url.searchParams.get('error')
    console.error('OAuth 콜백에 code가 없다:', reason)
    return NextResponse.redirect(new URL('/login?error=oauth', url.origin))
  }

  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) {
    console.error('세션 교환 실패:', error.message)
    return NextResponse.redirect(new URL('/login?error=oauth', url.origin))
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.redirect(new URL('/login?error=oauth', url.origin))
  }

  const profile = await authRepo.findById(user.id)
  const destination = profile?.onboardedAt ? '/' : '/onboarding'
  return NextResponse.redirect(new URL(destination, url.origin))
}
