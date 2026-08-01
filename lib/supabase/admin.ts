import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * service role 클라이언트. **RLS를 우회한다.**
 *
 * 이 키를 읽는 파일은 여기 하나뿐이다. 다른 곳에서 process.env로 직접 읽기 시작하면
 * "어디서 쓰기가 일어나는가"를 파일 목록으로 답할 수 없게 된다.
 *
 * 서버에서만 호출한다. 클라이언트 컴포넌트에서 import하면 빌드는 통과하지만
 * 런타임에 키가 undefined라 던진다 — NEXT_PUBLIC_이 아니기 때문이다.
 */
export function createSupabaseAdminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error(
      'Supabase 관리자 클라이언트를 만들 수 없다: NEXT_PUBLIC_SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY가 없다.',
    )
  }

  return createClient(url, key, {
    // 서버 전용이라 세션을 들고 있을 이유가 없다. 토큰 갱신 타이머도 만들지 않는다.
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
