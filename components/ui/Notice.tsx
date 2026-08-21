'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react'
import { usePathname } from 'next/navigation'

/** 같은 문구를 연달아 띄워도 다시 보이게 하려면 상태가 실제로 달라져야 한다. */
type Notice = { text: string; key: number }

const NotifyContext = createContext<(text: string) => void>(() => {})

/** 지금 화면에서 바로 알림을 띄운다. */
export function useNotify() {
  return useContext(NotifyContext)
}

const QUEUE_KEY = 'togo:notice'
const VISIBLE_MS = 3500

/**
 * 화면을 옮긴 다음에 띄울 알림을 예약한다.
 *
 * 서버 액션의 redirect를 건너야 하는 알림은 useNotify로 띄울 수 없다. 상태가
 * 넘어가지 않아 도착한 화면에서 사라진다(로그아웃에서 실제로 겪었다). 그래서
 * 문구를 sessionStorage에 맡겨 두고 도착한 쪽이 꺼내 쓴다.
 *
 * localStorage가 아닌 이유는 탭을 닫으면 같이 지워져야 해서다. 남아 있으면
 * 다음에 열었을 때 지난 알림이 뜬다.
 */
export function queueNotice(text: string) {
  try {
    sessionStorage.setItem(QUEUE_KEY, text)
  } catch {
    // 사파리 프라이빗 모드 등에서 막힐 수 있다. 알림 하나 못 띄우는 것뿐이라 넘어간다.
  }
}

/**
 * 앱 전역 알림.
 *
 * 예약된 알림은 경로가 바뀔 때마다 확인한다. redirect가 이 Provider를
 * 리마운트시키는지 여부에 기대지 않기 위해서다 — 마운트 시 한 번만 보면
 * 리마운트되지 않는 경로에서 알림을 놓친다.
 */
export function NoticeProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [notice, setNotice] = useState<Notice>()
  const pendingRef = useRef<string | null>(null)

  const notify = useCallback((text: string) => {
    setNotice({ text, key: Date.now() })
  }, [])

  useEffect(() => {
    // 꺼낸 문구를 ref에 붙들어 둔다. StrictMode가 개발에서 이펙트를 두 번 돌리는데,
    // 첫 실행이 sessionStorage를 비우고 cleanup이 예약된 프레임을 취소해 버리면
    // 두 번째 실행에는 꺼낼 값이 남아 있지 않아 알림이 통째로 사라진다.
    if (pendingRef.current === null) {
      try {
        const queued = sessionStorage.getItem(QUEUE_KEY)
        // 읽는 즉시 지운다. 남겨 두면 다음 이동에서 같은 알림이 또 뜬다.
        if (queued) {
          sessionStorage.removeItem(QUEUE_KEY)
          pendingRef.current = queued
        }
      } catch {
        return
      }
    }

    const text = pendingRef.current
    if (!text) return

    // 도착한 화면이 그려진 다음에 올린다. 같은 프레임에 띄우면 페이지 전환과
    // 알림 등장이 겹쳐 어디서 온 알림인지 읽히지 않는다.
    const id = requestAnimationFrame(() => {
      pendingRef.current = null
      setNotice({ text, key: Date.now() })
    })
    return () => cancelAnimationFrame(id)
  }, [pathname])

  useEffect(() => {
    if (!notice) return
    const id = setTimeout(() => setNotice(undefined), VISIBLE_MS)
    // 알림이 연달아 오면 앞의 타이머를 버린다. 안 그러면 뒤엣것이 일찍 사라진다.
    return () => clearTimeout(id)
  }, [notice])

  return (
    <NotifyContext.Provider value={notify}>
      {children}
      {notice ? (
        <div
          // 헤더가 z-30이라 그 위에 얹는다.
          className="pointer-events-none fixed inset-x-0 bottom-6 z-40 flex justify-center px-4"
          role="status"
          aria-live="polite"
        >
          <p
            key={notice.key}
            className="bg-ink text-paper rounded-btn shadow-lift animate-rise max-w-full px-4 py-3 text-sm font-medium"
          >
            {notice.text}
          </p>
        </div>
      ) : null}
    </NotifyContext.Provider>
  )
}
