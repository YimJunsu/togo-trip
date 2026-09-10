'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  CompassIcon,
  ForkKnifeIcon,
  HeartIcon,
  HouseIcon,
  TargetIcon,
  TicketIcon,
} from '@phosphor-icons/react/dist/ssr'
import type { Icon } from '@phosphor-icons/react'
import { useSession } from '@/components/auth/SessionProvider'
import { cn } from '@/lib/utils/cn'

type NavItem = { href: string; label: string; icon: Icon }

/** 로그인 여부와 무관하게 보이는 항목. */
const PUBLIC_NAV: NavItem[] = [
  { href: '/', label: '홈', icon: HouseIcon },
  { href: '/random', label: '뽑기', icon: TargetIcon },
  { href: '/food', label: '음식', icon: ForkKnifeIcon },
  { href: '/style', label: '성향', icon: CompassIcon },
  { href: '/compat', label: '궁합', icon: HeartIcon },
]

/**
 * 초대코드 참여는 로그인해야 쓸 수 있다. 비로그인에게 보여 주면 눌러도 로그인
 * 화면으로 튕기기만 한다. /join은 색인 대상도 아니라 서버 HTML에서 빠져도
 * 잃을 것이 없다. (docs/SEO.md §4)
 */
const JOIN: NavItem = { href: '/join', label: '참여', icon: TicketIcon }

function isCurrent(pathname: string, href: string): boolean {
  // 홈은 접두사로 보면 모든 경로에 걸린다.
  return href === '/' ? pathname === '/' : pathname.startsWith(href)
}

function NavLink({ item, current }: { item: NavItem; current: boolean }) {
  const Icon = item.icon
  return (
    <Link
      href={item.href}
      aria-current={current ? 'page' : undefined}
      className={cn(
        'rounded-btn flex flex-col items-center gap-1 px-2 py-1 whitespace-nowrap transition duration-200 sm:px-2.5',
        current
          ? 'text-accent bg-accent-soft'
          : 'text-muted hover:text-ink hover:bg-ink/5',
      )}
    >
      {/*
        현재 위치는 색만으로 알리지 않는다. 아이콘이 속을 채우고 aria-current가
        붙어, 색을 못 보는 사람도 어디에 있는지 안다. (DESIGN_SYSTEM §4)
      */}
      <Icon size={20} weight={current ? 'fill' : 'regular'} aria-hidden />
      <span className="text-[11px] leading-none font-medium">{item.label}</span>
    </Link>
  )
}

/**
 * 헤더의 내비게이션.
 *
 * 클라이언트 컴포넌트지만 서버에서도 렌더된다 — 공개 링크 다섯은 첫 HTML에
 * 그대로 들어가므로 크롤러가 사이트 구조를 읽는 데 문제가 없다. 클라이언트로
 * 만든 이유는 두 가지뿐이다: 지금 어느 화면인지(usePathname)와, 로그인해야
 * 의미가 있는 항목을 가리는 것(useSession).
 *
 * 세션 확인이 끝나기 전에는 «참여»를 그리지 않는다. 먼저 보여 놓고 지우면 항목이
 * 한 번 깜빡였다가 사라져, 눌러 보려던 사람의 손가락 아래에서 내비가 움직인다.
 */
export function SiteNav() {
  const pathname = usePathname()
  const { name, isLoaded } = useSession()

  return (
    // 좁은 화면에서 항목이 글자 단위로 줄바꿈되지 않게 한다. 폭이 모자라면 줄을
    // 늘리는 대신 가로로 밀어서 본다.
    <nav className="min-w-0 [scrollbar-width:none] overflow-x-auto [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
      <ul className="flex items-center justify-between gap-0.5 sm:justify-start sm:gap-2">
        {PUBLIC_NAV.map((item) => (
          <li key={item.href}>
            <NavLink item={item} current={isCurrent(pathname, item.href)} />
          </li>
        ))}
        {isLoaded && name ? (
          <li>
            <NavLink item={JOIN} current={isCurrent(pathname, JOIN.href)} />
          </li>
        ) : null}
      </ul>
    </nav>
  )
}
