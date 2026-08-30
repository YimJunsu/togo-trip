'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/**
 * 창으로 돌아왔을 때 서버 컴포넌트를 다시 돌린다.
 *
 * 여행방은 여러 명이 같이 본다. 남이 초대코드로 참여하거나 지출을 넣어도 내 화면은
 * 그대로라, 상대가 들어온 걸 보려면 매번 새로고침을 해야 했다.
 *
 * Supabase Realtime 구독 대신 이걸로 시작한다 — 새 의존성이 없고, mock 모드에서도
 * 똑같이 돌고, 전체 리로드가 아니라 서버 컴포넌트만 다시 실행해 조용히 갈아끼운다
 * (MemberList·SettledResult가 이미 쓰는 router.refresh()와 같은 방식).
 *
 * ponytail: 보는 시점은 "창으로 돌아올 때"뿐이다. 화면을 계속 띄워 둔 채로도 즉시
 * 반영돼야 하면 그때 Realtime 구독을 얹는다 — 이 컴포넌트는 그대로 두면 된다.
 *
 * 붙이는 화면은 서버가 준 props를 그대로 그리는 곳이어야 한다. props를 useState
 * 초기값으로 복사해 두면 서버가 새 값을 내려줘도 로컬 state가 이겨 절반만 갱신된다.
 */
export function RefreshOnFocus() {
  const router = useRouter()

  useEffect(() => {
    function refresh() {
      // 탭이 뒤에 숨어 있는 동안 온 focus 이벤트로 헛돌지 않게 한다.
      if (document.visibilityState === 'visible') router.refresh()
    }

    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', refresh)
    return () => {
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [router])

  return null
}
