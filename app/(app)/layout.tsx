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
          {/*
            로고와 내비를 두 줄로 나눈다. 한 줄에 다 넣으면 로그인한 사람의 헤더가
            «로고 + 6항목 + 이름 + 로그아웃»이 되어 375px에서 내비가 잘린 채
            가로로 밀리게 된다 — 실제로 «참여»가 이름 뒤로 숨었다. 줄을 나누면
            내비가 폭을 다 쓰고, 아이콘이 고르게 놓여 탭 바처럼 읽힌다.
          */}
          <div className="mx-auto flex max-w-2xl flex-col gap-1 px-4 py-2">
            <div className="flex items-center justify-between gap-3">
              <Link
                href="/"
                className="font-display shrink-0 text-lg font-semibold tracking-tight"
              >
                투고트립
              </Link>
              <HeaderAuth />
            </div>
            <SiteNav />
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
