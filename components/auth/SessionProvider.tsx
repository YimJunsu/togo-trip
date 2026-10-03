'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react'
import { usePathname } from 'next/navigation'

type Session = {
  /** 비로그인이거나 아직 확인 전이면 null. */
  name: string | null
  /** 헤더의 «관리» 링크만 본다. 접근 판정은 서버가 따로 한다. */
  isAdmin: boolean
  /** 확인이 끝났는지. "아직 모름"과 "비로그인"을 구분해야 하는 화면이 있다. */
  isLoaded: boolean
}

type SessionValue = Session & {
  /** 서버에 다시 묻기 전에 화면을 먼저 비로그인으로 되돌린다. 아래 clear 주석 참고. */
  clear: () => void
  /** 경로가 바뀌지 않은 채 세션 내용이 바뀌었을 때(닉네임 변경) 다시 묻는다. */
  reload: () => void
}

const SessionContext = createContext<SessionValue>({
  name: null,
  isAdmin: false,
  isLoaded: false,
  clear: () => {},
  reload: () => {},
})

export function useSession(): SessionValue {
  return useContext(SessionContext)
}

/**
 * 로그인 상태를 물어보고 화면 전체가 나눠 쓴다.
 *
 * 세션을 서버 컴포넌트에서 읽으면 cookies() 한 번 때문에 사이트 전체가 동적
 * 렌더링으로 떨어진다. 그래서 마운트 뒤에 클라이언트가 물어보는 방식으로 바꿨고,
 * 헤더와 홈 인사말이 각각 요청을 보내지 않도록 여기 한 곳에 모았다.
 *
 * 조회는 **경로가 바뀔 때마다** 다시 한다. 예전엔 마운트 시 한 번뿐이었는데,
 * 로그인·가입 서버 액션의 redirect가 클라이언트 사이드 내비게이션이라 이 Provider가
 * 리마운트되지 않았다. 그래서 세션이 null로 굳어, 가입·로그인을 마치고 홈에 와도
 * 헤더에 "로그인" 버튼이 남고 로그아웃 버튼은 영영 나타나지 않았다 —
 * 전체 새로고침을 해야만 풀렸다.
 *
 * 늘어나는 비용은 화면을 옮길 때마다 나가는 작은 JSON 요청 하나다. 원래 피하려던
 * 것은 "모든 페이지가 동적 렌더링으로 떨어지는 것"이었고, 그건 그대로 막혀 있다.
 */
export function SessionProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [session, setSession] = useState<Session>({
    name: null,
    isAdmin: false,
    isLoaded: false,
  })
  // 설정 화면에서 닉네임을 바꾸면 경로는 그대로다. 이 값을 올려 아래 effect를 다시 돌린다.
  const [version, setVersion] = useState(0)
  // 함수 정체성을 고정한다. 인라인으로 두면 version이 바뀔 때마다 새 함수가 되고,
  // 그걸 의존성으로 가진 호출부 effect(NicknameForm)가 다시 돌아 reload → 재렌더 →
  // 새 reload → 다시 effect… 로 /api/session 요청이 무한히 나갔다. 실제로 그랬다.
  const reload = useCallback(() => setVersion((v) => v + 1), [])
  const clear = useCallback(
    () => setSession({ name: null, isAdmin: false, isLoaded: true }),
    [],
  )

  useEffect(() => {
    // 응답이 늦게 도착했을 때 이미 사라진 트리를 건드리지 않게 한다.
    let isMounted = true

    function settle(name: string | null, isAdmin = false) {
      if (isMounted) setSession({ name, isAdmin, isLoaded: true })
    }

    fetch('/api/session', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : { name: null, isAdmin: false }))
      .then((data: { name: string | null; isAdmin?: boolean }) =>
        settle(data.name, data.isAdmin === true),
      )
      // 조회가 실패해도 화면을 막지 않는다. 비로그인으로 보고 넘어간다.
      .catch(() => settle(null))

    return () => {
      isMounted = false
    }
  }, [pathname, version])

  return (
    <SessionContext.Provider
      value={{
        ...session,
        // 로그아웃은 지금 보고 있는 경로로 redirect될 수 있어(예: 홈에서 로그아웃)
        // 위 재조회가 돌지 않을 수 있다. 눌린 즉시 비로그인으로 되돌린다.
        // 틀리는 방향도 안전한 쪽이다 — 실패하면 다음 이동에서 다시 로그인 상태가 된다.
        clear,
        reload,
      }}
    >
      {children}
    </SessionContext.Provider>
  )
}
