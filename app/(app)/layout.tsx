import Link from 'next/link'
import { HeaderAuth } from '@/components/auth/HeaderAuth'
import { SessionProvider } from '@/components/auth/SessionProvider'
import { AuthNavLink } from '@/components/layout/AuthNavLink'
import { InstallPrompt } from '@/components/layout/InstallPrompt'
import { SiteFooter } from '@/components/layout/SiteFooter'
import { NoticeProvider } from '@/components/ui/Notice'

/** 로그인 여부와 무관하게 보이는 항목. 서버에서 그려져 크롤러가 사이트 구조를 읽는다. */
const NAV = [
  { href: '/', label: '홈' },
  { href: '/random', label: '뽑기' },
  { href: '/food', label: '음식' },
  { href: '/style', label: '성향' },
  { href: '/compat', label: '궁합' },
]

/** 내비 항목의 생김새. 서버가 그리는 것과 클라이언트가 그리는 것이 같아야 한다. */
const NAV_LINK_CLASS =
  'text-muted hover:text-ink block rounded-full px-2 py-1.5 text-sm font-medium whitespace-nowrap transition duration-200 sm:px-3'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    // 세션은 여기서 한 번만 조회해 헤더와 홈 인사말이 나눠 쓴다.
    // children은 서버에서 렌더된 그대로 통과하므로 본문은 계속 정적이다.
    <SessionProvider>
      <NoticeProvider>
        <header className="border-line bg-paper/80 sticky top-0 z-30 border-b backdrop-blur-md">
          <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 px-4 py-3">
            <Link
              href="/"
              className="font-display shrink-0 text-lg font-semibold tracking-tight"
            >
              투고트립
            </Link>
            {/*
            좁은 화면에서 메뉴가 글자 단위로 줄바꿈되지 않게 한다.
            항목이 더 늘어 폭이 모자라면 줄을 늘리는 대신 가로로 밀어서 본다.
          */}
            <div className="flex min-w-0 items-center gap-1">
              <nav className="min-w-0 [scrollbar-width:none] overflow-x-auto [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                <ul className="flex gap-0.5 sm:gap-1">
                  {NAV.map(({ href, label }) => (
                    <li key={href}>
                      <Link href={href} className={NAV_LINK_CLASS}>
                        {label}
                      </Link>
                    </li>
                  ))}
                  {/*
                    초대코드 참여는 로그인해야 쓸 수 있다. 비로그인에게 보여 주면
                    눌러도 로그인 화면으로 튕기기만 한다. /join은 색인 대상도 아니라
                    서버 HTML에서 빠져도 잃을 것이 없다. (docs/SEO.md §4)
                  */}
                  <AuthNavLink
                    href="/join"
                    label="참여"
                    className={NAV_LINK_CLASS}
                  />
                </ul>
              </nav>
              <HeaderAuth />
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-2xl flex-1 px-4 pt-8 pb-16">
          {children}
        </main>

        <SiteFooter />
        {/*
          홈 화면 추가 안내. 화면 아래에 떠 있는 배너라 본문 흐름 밖이고, 조건이
          맞지 않으면(데스크톱·이미 추가함·닫은 적 있음) 아무것도 그리지 않는다.
        */}
        <InstallPrompt />
      </NoticeProvider>
    </SessionProvider>
  )
}
