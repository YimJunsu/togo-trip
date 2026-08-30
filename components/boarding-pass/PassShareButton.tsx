'use client'

import { useState } from 'react'
import { CheckIcon, ShareNetworkIcon } from '@phosphor-icons/react'
import { PassButton } from '@/components/boarding-pass/PassButton'
import { shareOrCopy, type ShareResult } from '@/lib/utils/share'

/**
 * 여행권 안에 놓이는 공유 버튼. 동작은 `ShareButton`과 같고 톤만 보딩패스다 —
 * 라임 버튼을 종이 티켓 위에 올리면 두 갈래가 섞인다. (DESIGN_SYSTEM §3, §4)
 */
export function PassShareButton({
  title,
  text,
  path,
  label = '초대 링크 보내기',
}: {
  title: string
  text: string
  path?: string
  label?: string
}) {
  const [state, setState] = useState<ShareResult | 'idle'>('idle')

  async function share() {
    const result = await shareOrCopy({ title, text, path })
    if (result === 'shared') return
    setState(result)
    if (result === 'copied') setTimeout(() => setState('idle'), 1800)
  }

  return (
    <div>
      <PassButton
        className="flex w-full items-center justify-center gap-2"
        onClick={share}
        aria-live="polite"
      >
        {state === 'copied' ? (
          <CheckIcon size={18} weight="bold" aria-hidden />
        ) : (
          <ShareNetworkIcon size={18} weight="bold" aria-hidden />
        )}
        {state === 'copied' ? '링크 복사됨' : label}
      </PassButton>
      {state === 'failed' && (
        <p className="text-pass-stamp mt-2 text-center font-mono text-xs tracking-widest">
          공유에 실패했습니다. 주소창을 복사해 주세요.
        </p>
      )}
    </div>
  )
}
