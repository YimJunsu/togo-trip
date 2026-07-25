import { redirect } from 'next/navigation'
import { SignUpForm } from '@/components/auth/SignUpForm'
import { getUser } from '@/lib/auth/session'
import { pageMetadata } from '@/lib/seo/metadata'

export const metadata = pageMetadata({
  title: '회원가입',
  description:
    '무료로 가입하고 여행방을 만들어 보세요. 초대코드로 친구를 부르고 엔빵 정산까지 한 번에 됩니다.',
  path: '/signup',
})

export default async function SignUpPage() {
  if (await getUser()) redirect('/')

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col gap-6">
      <header>
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          회원가입
        </h1>
        <p className="text-muted mt-1 text-sm">
          여행방 이름은 방마다 따로 정할 수 있습니다.
        </p>
      </header>

      <SignUpForm />
    </div>
  )
}
