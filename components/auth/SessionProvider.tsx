'use client'

import { createContext, useContext, useEffect, useState } from 'react'

type Session = {
  /** 비로그인이거나 아직 확인 전이면 null. */
  name: string | null
  /** 확인이 끝났는지. "아직 모름"과 "비로그인"을 구분해야 하는 화면이 있다. */
  isLoaded: boolean
}

const SessionContext = createContext<Session>({ name: null, isLoaded: false })

export function useSession(): Session {
  return useContext(SessionContext)
}

/**
 * 로그인 상태를 한 번만 물어보고 화면 전체가 나눠 쓴다.
 *
 * 세션을 서버 컴포넌트에서 읽으면 cookies() 한 번 때문에 사이트 전체가 동적
 * 렌더링으로 떨어진다. 그래서 마운트 뒤에 클라이언트가 물어보는 방식으로 바꿨고,
 * 헤더와 홈 인사말이 각각 요청을 보내지 않도록 여기 한 곳에 모았다.
 */
export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session>({
    name: null,
    isLoaded: false,
  })

  useEffect(() => {
    // 응답이 늦게 도착했을 때 이미 사라진 트리를 건드리지 않게 한다.
    let isMounted = true

    function settle(name: string | null) {
      if (isMounted) setSession({ name, isLoaded: true })
    }

    fetch('/api/session', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : { name: null }))
      .then((data: { name: string | null }) => settle(data.name))
      // 조회가 실패해도 화면을 막지 않는다. 비로그인으로 보고 넘어간다.
      .catch(() => settle(null))

    return () => {
      isMounted = false
    }
  }, [])

  return (
    <SessionContext.Provider value={session}>
      {children}
    </SessionContext.Provider>
  )
}
