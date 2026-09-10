import Link from 'next/link'
import { HeaderAuth } from '@/components/auth/HeaderAuth'
import { SessionProvider } from '@/components/auth/SessionProvider'
import { InstallPrompt } from '@/components/layout/InstallPrompt'
import { SiteFooter } from '@/components/layout/SiteFooter'
import { SiteNav } from '@/components/layout/SiteNav'
import { NoticeProvider } from '@/components/ui/Notice'

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
            {/* 데스크톱용 한 줄. 모바일에서는 display:none이고 아래 탭 바가 대신 선다. */}
            <SiteNav variant="inline" />
            <HeaderAuth />
          </div>
        </header>

        <main className="mx-auto w-full max-w-2xl flex-1 px-4 pt-8 pb-16">
          {children}
        </main>

        <SiteFooter />

        {/*
          모바일 탭 바. 헤더 밖에 두는 것이 핵심이다 — 헤더의 backdrop-blur가
          position:fixed의 기준 상자를 만들어, 안에 두면 화면 아래가 아니라
          헤더 아래쪽에 박힌다. (components/layout/SiteNav.tsx 주석)
        */}
        <SiteNav variant="bar" />

        {/*
          홈 화면 추가 안내. 화면 아래에 떠 있는 배너라 본문 흐름 밖이고, 조건이
          맞지 않으면(데스크톱·이미 추가함·닫은 적 있음) 아무것도 그리지 않는다.
        */}
        <InstallPrompt />
      </NoticeProvider>
    </SessionProvider>
  )
}
