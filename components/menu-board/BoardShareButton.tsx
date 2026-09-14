'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { BoardButton } from '@/components/menu-board/BoardControls'
import {
  shareMessage,
  SHARE_TONE_LABEL,
  SHARE_TONE_ORDER,
  type ShareTone,
} from '@/lib/foods/shareMessage'
import { SITE_NAME } from '@/lib/seo/site'
import { shareOrCopy, type ShareResult } from '@/lib/utils/share'

/** 복사 안내를 띄워 두는 시간. ShareButton과 같은 값을 쓴다. */
const COPIED_MS = 1800

/**
 * 뽑힌 메뉴를 공유한다. 메뉴판 갈래의 공유 버튼이다 —
 * 소프트 미니멀의 초록 ShareButton을 여기서 쓰면 종이 위에 그 버튼만 뜬다.
 * 공유 동작 자체는 lib/utils/share.ts가 갖는다. (DESIGN_SYSTEM §3)
 *
 * 말투를 먼저 고르게 하는 이유는 보낼 상대가 매번 다르기 때문이다.
 * 친구 단톡방과 회사 사람에게 같은 문장을 보낼 수는 없다.
 */
export function BoardShareButton({ name }: { name: string }) {
  const [isChoosing, setIsChoosing] = useState(false)
  const [state, setState] = useState<ShareResult | 'idle'>('idle')
  const [isSharing, setIsSharing] = useState(false)
  const resetRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const controlsId = useId()

  useEffect(() => () => clearTimeout(resetRef.current), [])

  async function share(tone: ShareTone) {
    clearTimeout(resetRef.current)
    setIsSharing(true)
    setIsChoosing(false)
    const result = await shareOrCopy({
      title: `${SITE_NAME} 음식 뽑기`,
      text: shareMessage(name, tone),
      path: '/food',
      copiesText: true,
    })
    setIsSharing(false)
    // 공유 시트로 넘어갔으면 이 화면이 알릴 건 없다.
    if (result === 'shared') return
    setState(result)
    if (result === 'copied')
      resetRef.current = setTimeout(() => setState('idle'), COPIED_MS)
  }

  return (
    <div>
      <BoardButton
        tone="outline"
        aria-expanded={isChoosing}
        aria-controls={controlsId}
        disabled={isSharing}
        onClick={() => {
          setIsChoosing((open) => !open)
          setState('idle')
        }}
      >
        {state === 'copied'
          ? '문구 복사됨'
          : isSharing
            ? '공유 준비 중…'
            : '이 메뉴 같이 먹자 · 공유하기'}
      </BoardButton>

      <div id={controlsId} hidden={!isChoosing} className="mt-3">
        <p className="text-food-amber mb-2 text-sm">
          함께 먹을 사람에게, 어떤 말투로 보낼까요?
        </p>
        <div className="border-food-roast/25 divide-food-roast/15 divide-y border-y">
          {SHARE_TONE_ORDER.map((tone) => (
            <button
              type="button"
              key={tone}
              onClick={() => share(tone)}
              className="hover:bg-food-roast/5 flex min-h-12 w-full items-start gap-3 py-3 text-left text-sm transition-colors"
            >
              <span className="text-food-amber shrink-0">
                {SHARE_TONE_LABEL[tone]}
              </span>
              <span className="min-w-0 leading-relaxed">
                {shareMessage(name, tone)}
              </span>
            </button>
          ))}
        </div>
      </div>

      <p aria-live="polite" className="sr-only">
        {state === 'copied' ? '공유 문구와 링크를 복사했습니다' : ''}
      </p>

      {state === 'failed' ? (
        <p className="text-danger mt-2 text-center text-sm">
          공유에 실패했습니다. 주소창을 복사해 주세요.
        </p>
      ) : null}
    </div>
  )
}
