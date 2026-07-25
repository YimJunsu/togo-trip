'use client'

import { actionButtonClass } from '@/components/dashboard/ActionButton'
import { FullPageNotice } from '@/components/ui/FullPageNotice'
import './globals.css'

/**
 * 최후의 방어선(500). 루트 레이아웃 자체가 터졌을 때만 뜬다.
 *
 * 이때는 루트 레이아웃이 렌더되지 않으므로 html·body를 직접 그려야 하고,
 * globals.css도 여기서 따로 불러와야 한다 — 안 그러면 스타일 없는 맨 HTML이 뜬다.
 * 폰트 변수는 루트 레이아웃이 붙이던 것이라 여기선 기본 폰트로 떨어진다.
 * 마지막 화면이라 그 정도는 감수한다.
 *
 * 개발 모드에서는 Next의 에러 오버레이가 먼저 뜨므로 운영 빌드에서만 보인다.
 */
export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="ko" className="h-full">
      <body className="bg-paper text-ink flex min-h-full flex-col antialiased">
        <FullPageNotice
          code="500"
          title="문제가 생겼습니다"
          description="일시적인 오류일 수 있어요. 다시 시도해도 같으면 잠시 후에 와 주세요."
        >
          <button
            type="button"
            onClick={reset}
            className={actionButtonClass({ tone: 'ink' })}
          >
            다시 시도
          </button>
          {/*
            next/link를 쓰지 않는다. 루트 레이아웃이 터진 상태라 클라이언트 라우터를
            믿을 수 없고, 클라이언트 전환은 같은 깨진 트리로 되돌아갈 수 있다.
            전체 새로고침이 유일하게 확실한 탈출구다.
          */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a href="/" className={actionButtonClass({ tone: 'quiet' })}>
            홈으로 가기
          </a>
        </FullPageNotice>
      </body>
    </html>
  )
}
