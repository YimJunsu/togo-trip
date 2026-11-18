import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * 쿠키를 읽지 않는 anon 클라이언트. **누구에게나 같은 공개 데이터**를 읽을 때만 쓴다.
 *
 * 서버 클라이언트(`server.ts`)는 `cookies()`를 부르는데, 그 순간 Next가 페이지를
 * 요청마다 새로 렌더하는 동적 라우트로 바꾼다. 지역 페이지(`/region/[code]`)가 그래서
 * 첫 방문마다 함수를 깨우고 DB를 두 번 조회했다 — 로그인과 무관한 공개 목록인데도.
 * 이 클라이언트로 읽으면 페이지를 ISR로 캐시해 둘 수 있다.
 *
 * RLS가 anon에게 열어 둔 테이블(`regions`·`attractions`)에만 쓴다. 로그인한 사람의
 * 권한이 필요한 읽기에 쓰면 RLS가 빈 결과를 돌려주고, 오류 없이 조용히 비어 보인다.
 */
export function createSupabasePublicClient(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    // 세션이 없는 클라이언트다. 토큰 갱신 타이머도 만들지 않는다.
    { auth: { persistSession: false, autoRefreshToken: false } },
  )
}
