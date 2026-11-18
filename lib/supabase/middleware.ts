import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Supabase Auth 세션 토큰을 요청마다 갱신한다. App Router에서 SSR 세션이
 * 만료되지 않게 하려면 middleware가 필요하다 (@supabase/ssr 공식 패턴).
 *
 * 환경변수가 없으면(=mock 단계) 아무것도 하지 않고 통과시킨다.
 */
export async function updateSession(request: NextRequest): Promise<NextResponse> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const enabled = process.env.NEXT_PUBLIC_DATA_SOURCE === 'supabase' && url && key
  if (!enabled) return NextResponse.next({ request })

  // 세션 쿠키가 없으면 갱신할 세션도 없다. 처음 온 사람·크롤러가 전부 여기에 해당하는데,
  // 예전에는 이들에게도 매 요청 Supabase 클라이언트를 만들고 getUser()를 불렀다.
  // @supabase/ssr의 쿠키 이름은 storageKey 기본값 `sb-<ref>-auth-token`(분할되면 `.0`…)이다.
  // storageKey를 바꾸면 이 검사도 같이 바꿔야 한다.
  if (!request.cookies.getAll().some(({ name }) => name.startsWith('sb-'))) {
    return NextResponse.next({ request })
  }

  let response = NextResponse.next({ request })

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value)
        }
        response = NextResponse.next({ request })
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options)
        }
      },
    },
  })

  // getUser()가 토큰을 검증하고, 필요하면 위 setAll을 통해 갱신 쿠키를 심는다.
  await supabase.auth.getUser()

  return response
}
