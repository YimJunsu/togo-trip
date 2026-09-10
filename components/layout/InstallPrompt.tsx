'use client'

import { useEffect, useRef, useState } from 'react'
import { XIcon } from '@phosphor-icons/react'
import { InstallGuide } from '@/components/layout/InstallGuide'
import { Sheet } from '@/components/ui/Sheet'
import {
  detectPlatform,
  INSTALL_DISMISSED_KEY,
  isStandalone,
  type MobilePlatform,
} from '@/lib/pwa/install'

/** 첫 화면이 그려진 뒤에 올린다. 같이 뜨면 읽기도 전에 눈에 걸리기만 한다. */
const APPEAR_DELAY_MS = 2000
/** 이만큼 아래로 끌면 닫는다. 짧게 잡으면 스크롤하다 실수로 닫힌다. */
const SWIPE_CLOSE_PX = 56

/**
 * 홈 화면 추가 안내 배너.
 *
 * 화면 아래에 떠 있는 막대다. 푸터가 아니라 fixed라서 본문 스크롤과 무관하게 자리를
 * 지키고, 사용자가 무시하고 스크롤해도 방해하지 않는다.
 *
 * 띄우는 조건이 셋 다 맞아야 한다: 모바일이고, 아직 홈 화면에서 열지 않았고,
 * 예전에 닫은 적이 없다. 하나라도 어긋나면 아무것도 그리지 않는다 —
 * 이미 추가한 사람에게 추가하라고 하는 것이 이 배너가 할 수 있는 최악의 일이다.
 */
export function InstallPrompt() {
  const [platform, setPlatform] = useState<MobilePlatform>('other')
  const [isVisible, setIsVisible] = useState(false)
  const [isGuideOpen, setIsGuideOpen] = useState(false)
  /** 아래로 끄는 중의 이동량. 손가락을 따라 배너가 내려간다. */
  const [dragY, setDragY] = useState(0)
  const startYRef = useRef<number | null>(null)
  /** 손을 뗄 때 읽을 최신 이동량. 상태는 이벤트 핸들러 안에서 아직 옛 값일 수 있다. */
  const dragYRef = useRef(0)

  useEffect(() => {
    if (isStandalone()) return

    const found = detectPlatform(
      window.navigator.userAgent,
      window.navigator.maxTouchPoints > 1,
    )
    if (found === 'other') return

    try {
      if (localStorage.getItem(INSTALL_DISMISSED_KEY)) return
    } catch {
      // 시크릿 모드 등에서 막힐 수 있다. 읽지 못하면 "닫은 적 없음"으로 보고 띄운다.
    }

    // 상태는 타이머 안에서만 바꾼다. 이펙트 본문에서 바로 바꾸면 렌더가 연쇄된다.
    const id = setTimeout(() => {
      setPlatform(found)
      setIsVisible(true)
    }, APPEAR_DELAY_MS)
    return () => clearTimeout(id)
  }, [])

  function dismiss() {
    setIsVisible(false)
    try {
      localStorage.setItem(INSTALL_DISMISSED_KEY, '1')
    } catch {
      // 저장에 실패하면 다음 방문에 다시 뜬다. 그것뿐이라 사용자에게 알릴 것이 없다.
    }
  }

  if (!isVisible) return null

  return (
    <>
      <div
        // 헤더가 z-30, 토스트가 z-40이다. 그 사이에 두면 토스트가 배너를 덮는다.
        // 탭 바(z-20)보다는 위에 있어야 배너가 탭에 잘리지 않는다.
        className="fixed inset-x-0 bottom-0 z-30 px-4 pt-2"
        style={{
          /*
           * 아래 여백은 두 몫이다 — 모바일 탭 바(h-14 = 3.5rem)와, iOS 사파리의
           * 하단 바·홈 인디케이터를 위한 안전 영역. 탭 바 몫을 빼먹으면 배너가
           * 탭 위에 겹쳐 앉아 「홈」과 「뽑기」를 못 누른다. 이 배너는 모바일에서만
           * 뜨므로 탭 바가 항상 있다고 봐도 된다.
           * 토큰으로 표현할 수 없는 값이라 여기서만 env()를 쓴다.
           */
          paddingBottom:
            'calc(3.5rem + max(1rem, env(safe-area-inset-bottom)))',
          transform: dragY ? `translateY(${dragY}px)` : undefined,
          // 끄는 동안에는 전이를 끊어 손가락을 그대로 따라가고, 손을 떼 dragY가 0으로
          // 돌아갈 때만 전이를 켜서 제자리로 미끄러지게 한다.
          transition: dragY === 0 ? 'transform 200ms ease-out' : undefined,
          /*
           * 이게 없으면 세로 제스처를 브라우저가 페이지 스크롤로 먼저 가져가 버려
           * touchmove가 우리에게 오지 않는다 — 실제 폰에서 스와이프가 통째로 먹히지
           * 않았던 원인이다. none으로 두면 이 배너 위에서 시작한 제스처만 우리가 받고,
           * 배너 밖에서 시작한 스크롤은 그대로 동작한다.
           */
          touchAction: 'none',
        }}
        onTouchStart={(e) => {
          startYRef.current = e.touches[0]?.clientY ?? null
        }}
        onTouchMove={(e) => {
          const start = startYRef.current
          const y = e.touches[0]?.clientY
          if (start === null || y === undefined) return
          // 위로 끄는 건 무시한다. 아래로만 따라간다.
          const moved = Math.max(0, y - start)
          dragYRef.current = moved
          setDragY(moved)
        }}
        onTouchEnd={() => {
          startYRef.current = null
          if (dragYRef.current > SWIPE_CLOSE_PX) dismiss()
          dragYRef.current = 0
          setDragY(0)
        }}
      >
        <div className="rounded-card border-line bg-surface shadow-lift animate-rise mx-auto flex max-w-2xl items-center gap-3 border p-3">
          <button
            type="button"
            onClick={() => setIsGuideOpen(true)}
            className="flex min-w-0 flex-1 items-center gap-3 text-left"
          >
            <span className="shrink-0 text-2xl leading-none" aria-hidden>
              📲
            </span>
            <span className="min-w-0">
              <span className="font-display block text-sm font-semibold tracking-tight">
                홈 화면에 추가하면 더 편해요
              </span>
              <span className="text-muted mt-0.5 block text-xs leading-relaxed">
                앱 설치가 아니라 바로가기예요. 방법 보기
              </span>
            </span>
          </button>

          <button
            type="button"
            onClick={dismiss}
            aria-label="안내 닫기"
            className="text-muted hover:text-ink hover:bg-paper shrink-0 rounded-full p-2 transition duration-200"
          >
            <XIcon size={16} weight="bold" aria-hidden />
          </button>
        </div>
      </div>

      <Sheet
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
        label="홈 화면에 추가하는 방법"
      >
        <InstallGuide
          platform={platform}
          onClose={() => {
            setIsGuideOpen(false)
            // 방법을 다 본 사람에게 배너를 계속 띄울 이유가 없다.
            dismiss()
          }}
        />
      </Sheet>
    </>
  )
}
