import { JoinForm } from '@/components/boarding-pass/JoinForm'
import { requireUser } from '@/lib/auth/session'
import { pageMetadata } from '@/lib/seo/metadata'
import type { PageProps } from '@/lib/types/page'

// 로그인해야 열리는 화면이라 크롤러에겐 로그인 리다이렉트만 보인다. 색인에서 뺀다.
export const metadata = pageMetadata({
  title: '초대코드로 참여',
  description: '친구가 알려준 6자리 초대코드를 넣고 여행방에 들어갑니다.',
  path: '/join',
  noIndex: true,
})

export default async function JoinPage({ searchParams }: PageProps) {
  await requireUser()

  // 초대 링크로 들어오면 코드가 주소에 실려 있다. 손으로 옮겨 적지 않게 미리 채운다.
  const { code } = await searchParams

  return (
    <div className="flex flex-col gap-6">
      <header className="text-pass-navy">
        <p className="font-mono text-xs tracking-widest opacity-70">
          BOARDING PASS
        </p>
        <h1 className="mt-1 font-mono text-2xl tracking-widest">
          초대코드로 참여
        </h1>
        <p className="mt-2 text-sm opacity-80">
          친구가 알려준 6자리를 넣으면 여행권이 나옵니다.
        </p>
      </header>

      <JoinForm initialCode={typeof code === 'string' ? code : ''} />
    </div>
  )
}
