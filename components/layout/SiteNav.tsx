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

/**
 * 모바일 탭 바의 높이. 본문(main)·푸터·설치 배너가 이만큼 아래를 비워 둔다 —
 * 그쪽은 Tailwind 클래스라 값을 공유할 수 없으니, 여기를 바꾸면 세 곳을 같이 본다.
 */
const NAV_BAR_HEIGHT = 'h-14'

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

/** 화면 아래 탭 바(모바일)인지, 헤더 안의 한 줄(데스크톱)인지. */
type Variant = 'bar' | 'inline'

function isCurrent(pathname: string, href: string): boolean {
  // 홈은 접두사로 보면 모든 경로에 걸린다.
  return href === '/' ? pathname === '/' : pathname.startsWith(href)
}

function NavLink({
  item,
  current,
  variant,
}: {
  item: NavItem
  current: boolean
  variant: Variant
}) {
  const Icon = item.icon
  return (
    <Link
      href={item.href}
      aria-current={current ? 'page' : undefined}
      className={cn(
        'flex items-center justify-center whitespace-nowrap transition duration-200',
        variant === 'bar'
          ? `${NAV_BAR_HEIGHT} flex-col gap-1`
          : 'rounded-btn gap-1.5 px-2.5 py-1.5',
        current
          ? // 탭 바에서는 알약을 두지 않는다. 칸이 이미 나뉘어 있어 배경까지
            // 칠하면 버튼 여섯 개가 늘어선 것처럼 보인다.
            variant === 'bar'
            ? 'text-accent'
            : 'text-accent bg-accent-soft'
          : 'text-muted hover:text-ink',
      )}
    >
      {/*
        현재 위치는 색만으로 알리지 않는다. 아이콘이 속을 채우고 aria-current가
        붙어, 색을 못 보는 사람도 어디에 있는지 안다. (DESIGN_SYSTEM §4)
      */}
      <Icon size={22} weight={current ? 'fill' : 'regular'} aria-hidden />
      <span
        className={cn(
          'leading-none font-medium',
          variant === 'bar' ? 'text-[11px]' : 'text-sm',
        )}
      >
        {item.label}
      </span>
    </Link>
  )
}

/**
 * 사이트 내비게이션. 모바일에서는 화면 아래 탭 바, 데스크톱에서는 헤더 안의 한 줄.
 *
 * 아이콘+라벨 묶음은 원래 화면 아래에 사는 물건이다. 그걸 헤더에 올려 뒀더니
 * 툴바도 탭 바도 아닌 것이 되어 어색했고, 로그인하면 로고·6항목·이름·로그아웃이
 * 한 줄을 다퉈 375px에서 「참여」가 이름 뒤로 숨었다. 아래로 내리면 폭을 통째로
 * 쓰고, 엄지도 닿고, 홈 화면에 추가했을 때 진짜 앱처럼 보인다.
 *
 * **두 벌을 그리는 데는 이유가 있다.** 한 벌로 두고 `fixed` ↔ `static`을
 * 미디어쿼리로 갈아 끼우려 했는데, 헤더의 `backdrop-blur-md`가 `position: fixed`
 * 자손의 기준 상자가 되어(backdrop-filter는 filter·transform처럼 containing block을
 * 만든다) 탭 바가 화면 아래가 아니라 헤더 안쪽 아래에 박혔다. 헤더 밖으로 빼면
 * 데스크톱에서 로고 옆으로 돌아갈 수가 없다. 그래서 자리마다 한 벌씩 두고, 보이지
 * 않는 쪽은 `display:none`이라 접근성 트리에도 들어가지 않는다 — 스크린리더에
 * 내비가 두 번 읽히지 않는다. **헤더의 블러를 지우기 전에는 한 벌로 합치지 말 것.**
 *
 * 클라이언트 컴포넌트지만 서버에서도 렌더된다 — 공개 링크 다섯은 첫 HTML에
 * 그대로 들어가므로 크롤러가 사이트 구조를 읽는 데 문제가 없다. 클라이언트로
 * 만든 이유는 두 가지뿐이다: 지금 어느 화면인지(usePathname)와, 로그인해야
 * 의미가 있는 항목을 가리는 것(useSession).
 *
 * 세션 확인이 끝나기 전에는 «참여»를 그리지 않는다. 먼저 보여 놓고 지우면 항목이
 * 한 번 깜빡였다가 사라져, 눌러 보려던 사람의 손가락 아래에서 내비가 움직인다.
 */
export function SiteNav({ variant }: { variant: Variant }) {
  const pathname = usePathname()
  const { name, isLoaded } = useSession()

  const items = isLoaded && name ? [...PUBLIC_NAV, JOIN] : PUBLIC_NAV
  const isBar = variant === 'bar'

  return (
    <nav
      aria-label="주요 메뉴"
      className={
        isBar
          ? 'border-line bg-paper/95 fixed inset-x-0 bottom-0 z-20 border-t backdrop-blur-md sm:hidden'
          : 'hidden min-w-0 sm:block'
      }
      // iOS의 홈 인디케이터에 탭이 가리지 않게 안전 영역만큼 아래를 띄운다.
      // 토큰으로 표현할 수 없는 값이라 여기서만 env()를 쓴다.
      style={
        isBar ? { paddingBottom: 'env(safe-area-inset-bottom)' } : undefined
      }
    >
      <ul
        className={cn(
          'flex items-center',
          isBar ? 'mx-auto max-w-2xl px-2' : 'gap-1',
        )}
      >
        {items.map((item) => (
          <li key={item.href} className={isBar ? 'flex-1' : undefined}>
            <NavLink
              item={item}
              current={isCurrent(pathname, item.href)}
              variant={variant}
            />
          </li>
        ))}
      </ul>
    </nav>
  )
}
