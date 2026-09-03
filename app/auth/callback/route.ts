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

  // 인증은 됐는데 profiles 행이 없다. on_auth_user_created 트리거가 실패했거나
  // 행이 지워진 경우다.
  //
  // 이걸 온보딩으로 흘려보내면 조용한 무한 루프가 된다 — /onboarding은
  // getPendingUser()로 같은 행을 찾고, 못 찾으면 /login으로 되돌린다. 사용자는
  // 구글 버튼을 눌러 인증을 마쳐도 매번 로그인 화면으로 돌아오고, 아무 설명도 없다.
  //
  // 세션까지 지운다. 남겨 두면 다른 화면에서도 "인증은 됐지만 행이 없는" 상태로
  // 돌아다니게 되고, 그 조합을 가정하지 않은 코드가 어디서 깨질지 알 수 없다.
  if (!profile) {
    console.error('인증 후 profiles 행을 찾지 못했다:', user.id)
    await supabase.auth.signOut()
    return NextResponse.redirect(new URL('/login?error=profile', url.origin))
  }

  const destination = profile.onboardedAt ? '/' : '/onboarding'
  return NextResponse.redirect(new URL(destination, url.origin))
}
