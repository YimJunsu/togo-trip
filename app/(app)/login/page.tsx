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

      {/*
        oauth와 나눠 둔 이유는 안내가 달라야 해서다. 이쪽은 다시 눌러도 같은 결과가
        나온다 — 인증은 되는데 계정 행이 없는 상태라 재시도로 풀리지 않는다.
        구체적인 사유는 서버 로그에만 남긴다.
      */}
      {error === 'profile' && (
        <p className="text-danger text-sm">
          계정 준비를 마치지 못했습니다. 다시 시도해도 같다면 문의해 주세요.
        </p>
      )}

      <LoginForm />
    </div>
  )
}
