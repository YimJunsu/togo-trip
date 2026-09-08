'use client'

import Link from 'next/link'
import { useSession } from '@/components/auth/SessionProvider'

/**
 * 로그인한 사람에게만 보이는 내비 항목.
 *
 * 내비 전체를 클라이언트 컴포넌트로 돌리지 않는다. 그러면 공개 링크(뽑기·음식·성향·궁합)가
 * 서버 HTML에서 사라져 크롤러가 사이트 구조를 못 읽는다. 가려야 하는 항목 하나만
 * 여기서 감싼다.
 *
 * 세션 확인이 끝나기 전에는 아무것도 그리지 않는다. 먼저 보여 놓고 지우면 항목이
 * 한 번 깜빡였다가 사라져, 눌러 보려던 사람의 손가락 아래에서 내비가 움직인다.
 */
export function AuthNavLink({
  href,
  label,
  className,
}: {
  href: string
  label: string
  className?: string
}) {
  const { name, isLoaded } = useSession()
  if (!isLoaded || !name) return null

  return (
    <li>
      <Link href={href} className={className}>
        {label}
      </Link>
    </li>
  )
}
