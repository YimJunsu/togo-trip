'use client'

import { useState } from 'react'
import { CheckIcon, ShareNetworkIcon } from '@phosphor-icons/react'
import { ActionButton } from '@/components/dashboard/ActionButton'
import { shareOrCopy, type ShareResult } from '@/lib/utils/share'

/**
 * 결과 공유. 소프트 미니멀 갈래의 라임 버튼이다.
 * 초대·여행권처럼 보딩패스 갈래에 놓이는 자리는 `boarding-pass/PassShareButton`을 쓴다.
 * 공유 동작 자체는 `lib/utils/share.ts`가 갖는다.
 */
export function ShareButton({
  title,
  text,
  path,
  /** 결과가 아니라 테스트 자체를 공유하는 자리도 있어 문구를 열어 둔다. */
  label = '결과 공유하기',
}: {
  title: string
  text: string
  /**
   * 공유할 주소. 상대 경로면 지금 origin 기준으로 푼다. 없으면 보고 있는 주소 그대로.
   * 여행방 초대처럼 "지금 화면"이 아니라 다른 곳(/join)으로 보내야 하는 자리가 있다 —
   * 여행방 주소는 멤버가 아니면 404라 그대로 넘겨 봐야 상대가 열 수 없다.
   */
  path?: string
  label?: string
}) {
  const [state, setState] = useState<ShareResult | 'idle'>('idle')

  async function share() {
    const result = await shareOrCopy({ title, text, path })
    // 공유 시트로 넘어갔으면 이 화면이 알릴 건 없다.
    if (result === 'shared') return
    setState(result)
    if (result === 'copied') setTimeout(() => setState('idle'), 1800)
  }

  return (
    <div>
      <ActionButton
        tone="accent"
        size="lg"
        className="w-full"
        onClick={share}
        aria-live="polite"
      >
        {state === 'copied' ? (
          <CheckIcon size={20} weight="bold" aria-hidden />
        ) : (
          <ShareNetworkIcon size={20} weight="bold" aria-hidden />
        )}
        {state === 'copied' ? '링크 복사됨' : label}
      </ActionButton>
      {state === 'failed' && (
        <p className="text-danger mt-2 text-center text-sm">
          공유에 실패했습니다. 주소창을 복사해 주세요.
        </p>
      )}
    </div>
  )
}
