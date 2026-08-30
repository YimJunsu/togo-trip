import { redirect } from 'next/navigation'
import { LoginForm } from '@/components/auth/LoginForm'
import { getUser } from '@/lib/auth/session'
import { pageMetadata } from '@/lib/seo/metadata'

export const metadata = pageMetadata({
  title: '로그인',
  description:
    '투고트립에 로그인하고 여행방을 만들거나 초대코드로 친구 여행에 참여하세요.',
  path: '/login',
})

type Props = { searchParams: Promise<{ error?: string }> }

export default async function LoginPage({ searchParams }: Props) {
  if (await getUser()) redirect('/')

  const { error } = await searchParams

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col gap-6">
      <header>
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          로그인
        </h1>
        <p className="text-muted mt-1 text-sm">
          여행방을 만들거나 참여하려면 로그인이 필요합니다.
        </p>
      </header>

      {error === 'oauth' && (
        <p className="text-danger text-sm">
          구글 로그인을 마치지 못했습니다. 다시 시도해 주세요.
        </p>
      )}

      <LoginForm />
    </div>
  )
}
