import { redirect } from 'next/navigation'
import { OnboardingForm } from '@/components/auth/OnboardingForm'
import { getPendingUser } from '@/lib/auth/session'
import { pageMetadata } from '@/lib/seo/metadata'

export const metadata = pageMetadata({
  title: '가입 마무리',
  description: '투고트립을 시작하기 전에 몇 가지만 확인합니다.',
  path: '/onboarding',
  // 개인 절차라 색인 대상이 아니다.
  noIndex: true,
})

export const dynamic = 'force-dynamic'

export default async function OnboardingPage() {
  // getUser()가 아니라 getPendingUser()다 — getUser()는 미완료 사용자를
  // 로그인하지 않은 것으로 보므로, 여기서 쓰면 /login으로 튕겨 무한 루프가 된다.
  const user = await getPendingUser()
  if (!user) redirect('/login')
  // 이미 마친 사람이 주소로 직접 들어오는 경우.
  if (user.onboardedAt) redirect('/')

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          거의 다 됐어요
        </h1>
        <p className="text-muted mt-2 text-sm leading-relaxed">
          {user.name ? `${user.name}님, ` : ''}시작하기 전에 두 가지만 확인할게요.
          생년월일은 만 14세 이상인지 보는 데만 쓰고, 다른 곳에 쓰지 않습니다.
        </p>
      </header>

      <OnboardingForm />
    </div>
  )
}
