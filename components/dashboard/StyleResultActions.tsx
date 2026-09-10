'use client'

import { useSyncExternalStore } from 'react'
import Link from 'next/link'
import { ArrowClockwiseIcon, SparkleIcon } from '@phosphor-icons/react'
import { actionButtonClass } from '@/components/dashboard/ActionButton'
import { ShareButton } from '@/components/dashboard/ShareButton'
import { readMyStyleCode } from '@/lib/style/storage'

/**
 * 성향 결과 화면의 다음 걸음.
 *
 * 이 페이지는 두 가지 방식으로 열린다 — 테스트를 끝내고 도착하거나, 16유형
 * 목록에서 눌러 들어오거나 친구가 보낸 링크로 오거나. 예전에는 셋 다 «결과
 * 공유하기»와 «다시 해보기»를 봤는데, 뒤의 둘에게는 하지도 않은 것을 공유하고
 * 다시 하라는 말이라 앞뒤가 맞지 않았다.
 *
 * 서버가 그리는 기본값은 «테스트 안 한 사람»이다. 방문자 대부분이 그렇고,
 * 크롤러도 그 상태로 본다 — 덕분에 /style/quiz로 걸어 들어가는 내부 링크가
 * 16개 결과 페이지 모두의 서버 HTML에 남는다.
 *
 * effect로 읽지 않고 useSyncExternalStore를 쓴다. 서버 스냅숏과 클라이언트
 * 스냅숏을 따로 주는 것이 이 훅의 일이라 hydration 불일치가 나지 않고, 테스트를
 * 막 끝낸 사람은 클라이언트 이동으로 들어오므로 첫 렌더부터 자기 결과를 본다 —
 * effect로 읽으면 그 사람에게 버튼이 한 번 바뀌어 보인다.
 */
export function StyleResultActions({
  code,
  name,
  tagline,
}: {
  code: string
  name: string
  tagline: string
}) {
  const myCode = useSyncExternalStore(
    subscribeToStorage,
    readMyStyleCode,
    // 서버에는 브라우저 저장소가 없다. "아직 안 했음"으로 그린다.
    () => null,
  )
  const isMine = myCode === code

  if (!isMine) {
    return (
      <Link
        href="/style/quiz"
        className={actionButtonClass({ tone: 'accent', className: 'w-full' })}
      >
        <SparkleIcon size={16} weight="bold" aria-hidden />
        나는 어떤 유형일까, 테스트 해보기
      </Link>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <ShareButton
        title={`나는 ${name} 여행이다`}
        text={`${tagline} · 내 여행 성향은 ${code}. 너도 해 봐.`}
      />
      {/* 재시도이므로 소개 랜딩(/style)이 아니라 문항으로 바로 보낸다. */}
      <Link
        href="/style/quiz"
        className={actionButtonClass({ tone: 'quiet', className: 'w-full' })}
      >
        <ArrowClockwiseIcon size={16} weight="bold" aria-hidden />
        다시 해보기
      </Link>
    </div>
  )
}

/**
 * 다른 탭에서 테스트를 끝내면 이 탭도 따라 바뀐다. storage 이벤트는 같은 탭에서는
 * 안 오지만, 같은 탭은 어차피 이동하면서 다시 읽는다.
 */
function subscribeToStorage(onChange: () => void) {
  window.addEventListener('storage', onChange)
  return () => window.removeEventListener('storage', onChange)
}
