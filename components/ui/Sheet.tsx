'use client'

import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'

/**
 * 아래에서 올라오는 시트.
 *
 * 네이티브 <dialog>의 showModal()을 쓴다 — 포커스 트랩, Esc로 닫기, 백드롭,
 * 최상위 레이어를 브라우저가 이미 갖고 있다. 이 프로젝트의 첫 오버레이인데,
 * 그것들을 직접 만들면 포털·포커스 관리 코드가 통째로 따라온다.
 *
 * 안에 무엇이 들어오는지는 모른다. 껍데기만 맡는다.
 */
export function Sheet({
  isOpen,
  onClose,
  label,
  children,
}: {
  isOpen: boolean
  /** Esc·백드롭 클릭으로도 불린다. 호출부가 isOpen을 내려야 실제로 닫힌다. */
  onClose: () => void
  /** 스크린리더가 읽을 시트 이름. */
  label: string
  children: ReactNode
}) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (isOpen && !el.open) el.showModal()
    if (!isOpen && el.open) el.close()
  }, [isOpen])

  return (
    <dialog
      ref={ref}
      aria-label={label}
      // Esc는 cancel 다음 close를 부른다. close 하나만 들으면 둘 다 잡힌다.
      onClose={onClose}
      // ::backdrop 클릭은 dialog 자신을 target으로 온다. 내용은 자식이라 걸리지 않는다.
      onClick={(event) => {
        if (event.target === ref.current) onClose()
      }}
      className="rounded-t-card border-line bg-surface shadow-lift animate-rise mx-auto mt-auto mb-0 w-full max-w-lg border p-0 backdrop:bg-ink/40"
    >
      {/*
        열려 있을 때만 그린다. 닫힌 dialog 안은 display:none이라 자식이 크기를
        잴 수 없고, 스크롤 위치를 맞춰야 하는 휠이 0에서 시작해 버린다.
      */}
      {isOpen ? children : null}
    </dialog>
  )
}
