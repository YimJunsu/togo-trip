'use server'

// 클라이언트 컴포넌트는 데이터 계층을 직접 import하면 안 된다 — '@/lib/data' 배럴은
// mockAuthRepo(→ node:crypto, seed 계정)까지 함께 물고 있어 그대로 import하면 브라우저
// 번들에 실려 나간다. 여기서 한 겹 감싸 서버에서만 repo를 불러 쓰게 한다.
import { requireAdmin, requireUser } from '@/lib/auth/session'
import { requestRepo } from '@/lib/data'
import type { RequestStatus } from '@/lib/data/types'
import { isRequestKind, validateRequestContent } from '@/lib/requests/validate'

export async function submitRequest(input: {
  kind: string
  content: string
}): Promise<void> {
  // 로그인한 회원만. 화면이 비로그인에게 폼을 숨기지만 액션은 직접 불릴 수 있다.
  const user = await requireUser()

  if (!isRequestKind(input.kind)) throw new Error('요청 종류를 골라 주세요.')

  const checked = validateRequestContent(input.content)
  if (!checked.ok) throw new Error(checked.error)

  await requestRepo.create({
    author: { id: user.id, name: user.name, email: user.email },
    kind: input.kind,
    content: checked.content,
  })
}

export async function setRequestStatus(
  id: string,
  status: RequestStatus,
): Promise<void> {
  // 관리자만. Supabase는 RLS가 한 번 더 막지만 mock은 이 줄이 전부다.
  await requireAdmin()
  if (status !== 'open' && status !== 'done')
    throw new Error('알 수 없는 상태입니다.')
  await requestRepo.setStatus(id, status)
}
