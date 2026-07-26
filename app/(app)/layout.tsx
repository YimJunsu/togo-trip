import Link from 'next/link'
import { HeaderAuth } from '@/components/auth/HeaderAuth'
import { SessionProvider } from '@/components/auth/SessionProvider'
import { SiteFooter } from '@/components/layout/SiteFooter'

const NAV = [
  { href: '/', label: '홈' },
  { href: '/random', label: '뽑기' },
  { href: '/style', label: '성향' },
  { href: '/join', label: '참여' },
  { href: '/compat', label: '궁합' },
]

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    // 세션은 여기서 한 번만 조회해 헤더와 홈 인사말이 나눠 쓴다.
    // children은 서버에서 렌더된 그대로 통과하므로 본문은 계속 정적이다.
    <SessionProvider>
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
                    <Link
                      href={href}
                      className="text-muted hover:text-ink block rounded-full px-2 py-1.5 text-sm font-medium whitespace-nowrap transition duration-200 sm:px-3"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
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
    </SessionProvider>
  )
}
