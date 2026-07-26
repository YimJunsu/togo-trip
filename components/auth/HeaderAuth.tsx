'use client'

import Link from 'next/link'
import { useSession } from '@/components/auth/SessionProvider'
import { signOutAction } from '@/lib/auth/actions'

const LINK_CLASS =
  'text-muted hover:text-ink block shrink-0 rounded-full px-3 py-1.5 text-sm font-medium whitespace-nowrap transition duration-200'

/**
 * 헤더 오른쪽의 로그인/로그아웃.
 *
 * 세션을 서버에서 직접 읽지 않는다. 이 컴포넌트는 모든 페이지의 레이아웃에 들어가는데,
 * 여기서 cookies()를 건드리면 **사이트 전체**가 동적 렌더링으로 떨어진다. 실제로
 * 약관·소개처럼 로그인과 무관한 화면까지 매 요청 서버 함수가 돌았고, 무료 플랜의
 * 콜드 스타트가 그대로 첫 진입 지연이 됐다.
 *
 * 서버 렌더 결과는 비로그인 상태다 — 크롤러가 보던 것과 같고, 방문자 대부분도
 * 비로그인이라 눈에 띄는 변화가 없다. 로그인한 사람만 이름이 한 박자 늦게 붙는다.
 */
export function HeaderAuth() {
  const { name } = useSession()

  if (!name) {
    return (
      <Link href="/login" className={LINK_CLASS}>
        로그인
      </Link>
    )
  }

  return (
    <form action={signOutAction} className="flex shrink-0 items-center gap-1">
      <span className="text-muted hidden px-2 text-sm font-medium sm:block">
        {name}
      </span>
      <button type="submit" className={LINK_CLASS}>
        로그아웃
      </button>
    </form>
  )
}
