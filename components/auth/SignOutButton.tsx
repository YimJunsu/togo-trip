'use client'

import { useSession } from '@/components/auth/SessionProvider'
import { signOutAction } from '@/lib/auth/actions'

/**
 * 로그아웃 버튼. 헤더와 내 정보 두 곳이 이걸 쓴다.
 *
 * 두 곳이 각자 form을 들고 있으면 한쪽만 고쳐져 동작이 갈린다. 실제로 헤더에만
 * 세션 초기화가 붙어 있었고 내 정보 쪽은 빠져 있었다. 버튼 모양은 호출부가 정하고,
 * 누른 뒤에 벌어지는 일은 여기 한 곳이 갖는다.
 *
 * 메인으로 보내는 건 signOutAction의 redirect('/')다. 여기서 하지 않는다.
 */
export function SignOutButton({
  className,
  children,
}: {
  className: string
  children: React.ReactNode
}) {
  const { clear } = useSession()

  return (
    <form
      action={signOutAction}
      onSubmit={() => {
        // 화면을 먼저 비로그인으로 되돌린다. redirect 목적지가 지금 경로와 같으면
        // (예: 홈에서 로그아웃) SessionProvider의 재조회가 돌지 않아 버튼이 그대로 남는다.
        clear()
        // 서버 응답을 기다리지 않고 알린다. signOutAction은 redirect로 끝나서
        // 그 뒤에 클라이언트 코드가 돌 자리가 없고, 바로 위 clear()도 이미 같은
        // 낙관을 하고 있다. 틀리는 방향은 안전한 쪽이다 — 실패하면 다음 이동에서
        // 다시 로그인 상태로 돌아온다.
        window.alert('로그아웃되었습니다.')
      }}
    >
      <button type="submit" className={className}>
        {children}
      </button>
    </form>
  )
}
