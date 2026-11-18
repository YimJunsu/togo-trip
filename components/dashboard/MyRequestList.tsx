import { Badge } from '@/components/ui/Badge'
import type { UserRequest } from '@/lib/data/types'
import { REQUEST_KIND_LABEL } from '@/lib/requests/limits'
import { formatDateTime } from '@/lib/utils/format'

/**
 * 설정 화면의 «내가 보낸 요청». 보낸 뒤 아무 소식이 없으면 사람은 같은 요청을
 * 또 보낸다 — 접수됐는지, 처리됐는지를 본인이 확인할 자리가 있어야 한다.
 * 상태는 색만으로 알리지 않고 라벨로 적는다 (DESIGN_SYSTEM §4).
 */
export function MyRequestList({ requests }: { requests: UserRequest[] }) {
  if (requests.length === 0) {
    return (
      <p className="text-muted text-sm">
        아직 보낸 요청이 없습니다. 홈 맨 아래에서 보낼 수 있어요.
      </p>
    )
  }

  return (
    <ul className="divide-line border-line bg-surface rounded-card divide-y border px-5">
      {requests.map((request) => {
        const isDone = request.status === 'done'
        return (
          <li key={request.id} className="py-4">
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge className="bg-ink/5 text-muted">
                {REQUEST_KIND_LABEL[request.kind]}
              </Badge>
              <Badge
                className={isDone ? 'bg-accent-soft text-accent' : 'bg-paper text-muted'}
              >
                {isDone ? '처리 완료' : '접수'}
              </Badge>
              <span className="text-muted ml-auto font-mono text-xs">
                {formatDateTime(request.createdAt)}
              </span>
            </div>
            <p className="mt-2 line-clamp-3 text-sm leading-relaxed break-words whitespace-pre-line">
              {request.content}
            </p>
          </li>
        )
      })}
    </ul>
  )
}
