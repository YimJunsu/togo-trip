import type { Metadata } from 'next'
import Link from 'next/link'
import { actionButtonClass } from '@/components/dashboard/ActionButton'
import { FullPageNotice } from '@/components/ui/FullPageNotice'

/**
 * 루트 404. 어떤 라우트에도 걸리지 않은 주소가 여기로 온다.
 * (app) 그룹 밖이라 헤더·네비가 없다 — 검색 결과에서 죽은 링크로 들어온 사람이
 * 빠져나갈 길은 이 화면의 버튼뿐이다.
 */
export const metadata: Metadata = {
  title: '없는 페이지',
  robots: { index: false, follow: true },
}

export default function NotFound() {
  return (
    <FullPageNotice
      code="404"
      title="없는 페이지입니다"
      description="주소가 바뀌었거나 지워진 페이지예요. 오타가 아닌지도 한 번 봐 주세요."
    >
      <Link href="/" className={actionButtonClass({ tone: 'ink' })}>
        홈으로 가기
      </Link>
      <Link href="/random" className={actionButtonClass({ tone: 'quiet' })}>
        여행지 뽑으러 가기
      </Link>
    </FullPageNotice>
  )
}
