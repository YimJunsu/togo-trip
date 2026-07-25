import Link from 'next/link'
import { MapPinSimpleAreaIcon } from '@phosphor-icons/react/dist/ssr'
import { actionButtonClass } from '@/components/dashboard/ActionButton'
import { EmptyState } from '@/components/dashboard/EmptyState'

/**
 * 앱 안에서 notFound()가 불릴 때(없는 여행 성향 코드, 없는 여행방 등).
 * 루트 404와 달리 헤더·네비가 살아 있어서, 사용자가 버튼 없이도 빠져나갈 수 있다.
 */
export default function AppNotFound() {
  return (
    <EmptyState
      icon={MapPinSimpleAreaIcon}
      title="여기엔 아무것도 없습니다"
      description="주소가 바뀌었거나 지워진 페이지예요. 위 메뉴로 다른 곳에 갈 수 있어요."
      action={
        <Link href="/" className={actionButtonClass({ size: 'sm' })}>
          홈으로 가기
        </Link>
      }
    />
  )
}
