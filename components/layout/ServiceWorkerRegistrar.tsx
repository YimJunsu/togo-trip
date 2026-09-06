'use client'

import { useEffect } from 'react'

/**
 * /sw.js를 등록한다. 화면에 아무것도 그리지 않는다.
 *
 * 개발 모드에서는 등록하지 않는다. 서비스워커는 한 번 붙으면 페이지보다 오래 살아서,
 * HMR로 갈아끼운 스크립트와 워커가 어긋나면 "고쳤는데 안 바뀐다"는 착시를 만든다.
 *
 * load 이후로 미루는 이유는 등록이 첫 화면 그리기와 대역폭을 다투지 않게 하기 위해서다.
 * 설치 배너는 어차피 사용자가 한동안 머문 뒤에 뜬다.
 */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return
    if (!('serviceWorker' in navigator)) return

    const register = () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // 등록 실패는 조용히 넘긴다. 서비스워커가 없어도 사이트는 그대로 동작하고,
        // 사용자가 할 수 있는 일이 없어 알릴 것도 없다.
      })
    }

    if (document.readyState === 'complete') {
      register()
      return
    }
    window.addEventListener('load', register)
    return () => window.removeEventListener('load', register)
  }, [])

  return null
}
