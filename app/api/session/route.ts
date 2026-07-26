import { NextResponse } from 'next/server'
import { getUser } from '@/lib/auth/session'

/**
 * 헤더가 로그인 상태를 물어보는 자리.
 *
 * 이 엔드포인트가 있는 이유는 성능이다. 예전에는 헤더가 서버 컴포넌트로 세션을 직접
 * 읽었는데, 그 cookies() 한 번 때문에 **모든 페이지**가 동적으로 바뀌어 약관·소개처럼
 * 로그인과 무관한 화면까지 매 요청 함수가 돌았다. 세션 조회를 여기로 떼어 내면
 * 페이지들이 정적으로 만들어져 엣지 캐시에서 바로 나간다.
 *
 * 반환은 이름 하나뿐이다. 헤더에 필요한 건 그것뿐이고, Profile을 통째로 넘기면
 * 이메일·전화번호·생년월일이 브라우저까지 따라간다.
 */
export const dynamic = 'force-dynamic'

export async function GET() {
  const user = await getUser()

  return NextResponse.json(
    { name: user?.name ?? null },
    // 사용자마다 다른 값이다. 중간 캐시가 남의 응답을 물려주면 안 된다.
    { headers: { 'Cache-Control': 'private, no-store' } },
  )
}
