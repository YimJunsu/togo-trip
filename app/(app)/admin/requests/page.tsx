import { RequestList } from '@/components/dashboard/RequestList'
import { requireAdmin } from '@/lib/auth/session'
import { requestRepo } from '@/lib/data'
import { pageMetadata } from '@/lib/seo/metadata'

export const metadata = pageMetadata({
  title: '요청사항',
  description: '회원이 보낸 요청사항 목록.',
  path: '/admin/requests',
  noIndex: true,
})

export const dynamic = 'force-dynamic'

export default async function AdminRequestsPage() {
  // 관리자가 아니면 404. Supabase에서는 RLS가 한 번 더 막아 빈 목록이 온다.
  await requireAdmin()
  const requests = await requestRepo.listAll()
  const openCount = requests.filter((r) => r.status === 'open').length

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          요청사항
        </h1>
        <p className="text-muted mt-1 text-sm">
          회원이 홈에서 보낸 요청입니다. 접수 {openCount}건 · 전체{' '}
          {requests.length}건
        </p>
      </header>

      <RequestList requests={requests} />
    </div>
  )
}
