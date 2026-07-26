'use client'

import { useSession } from '@/components/auth/SessionProvider'

/**
 * 홈 맨 위의 인사말.
 *
 * 이름을 모르는 동안에는 아무것도 그리지 않는다. 빈 줄을 자리만 잡아 두면 비로그인
 * 방문자(대부분이자 크롤러가 보는 상태)에게 없던 여백이 생긴다. 반대로 로그인한
 * 사람은 인사말이 붙으면서 제목이 한 번 밀리는데, 그쪽을 감수하는 편이 낫다.
 */
export function HomeGreeting() {
  const { name } = useSession()

  if (!name) return null

  return (
    <p className="text-muted font-mono text-xs tracking-widest">안녕 {name}</p>
  )
}
