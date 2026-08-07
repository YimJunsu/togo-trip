import Link from 'next/link'
import { SignOutIcon } from '@phosphor-icons/react/dist/ssr'
import { PasswordForm } from '@/components/auth/PasswordForm'
import { actionButtonClass } from '@/components/dashboard/ActionButton'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { requireUser } from '@/lib/auth/session'
import { signOutAction } from '@/lib/auth/actions'
import { tripRepo } from '@/lib/data'
import { pageMetadata } from '@/lib/seo/metadata'
import { formatDateRange } from '@/lib/utils/format'

// 로그인해야 열리는 화면이라 크롤러에겐 로그인 리다이렉트만 보인다. 색인에서 뺀다.
export const metadata = pageMetadata({
  title: '내 정보',
  description: '비밀번호를 바꾸고 참여 중인 여행방을 봅니다.',
  path: '/settings',
  noIndex: true,
})

export default async function SettingsPage() {
  const me = await requireUser()
  const trips = await tripRepo.list(me.id)

  return (
    <div className="flex flex-col gap-8">
      <header className="rounded-card border-line bg-surface shadow-soft flex items-center gap-4 border p-6">
        <Avatar name={me.name} size="lg" />
        <div className="min-w-0">
          <h1 className="font-display truncate text-2xl font-semibold tracking-tight">
            {me.name}
          </h1>
          <p className="text-muted mt-0.5 truncate text-sm">{me.email}</p>
        </div>
      </header>

      <Section title="내 여행방">
        {trips.length === 0 ? (
          <p className="text-muted text-sm">아직 참여 중인 여행방이 없습니다.</p>
        ) : (
          <ul className="divide-line border-line bg-surface rounded-card divide-y border px-5">
            {trips.map((trip) => (
              <li key={trip.id}>
                <Link
                  href={`/trips/${trip.id}`}
                  className="flex items-center gap-3 py-4"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-display truncate font-medium">
                      {trip.name}
                    </p>
                    <p className="text-muted mt-0.5 font-mono text-xs">
                      {formatDateRange(trip.startDate, trip.endDate)} ·{' '}
                      {trip.region}
                    </p>
                  </div>
                  {trip.settledAt ? (
                    <Badge className="bg-ink text-paper font-mono">
                      정산 완료
                    </Badge>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="비밀번호 변경">
        <PasswordForm />
      </Section>

      <Section title="계정">
        <form action={signOutAction}>
          <button
            type="submit"
            className={actionButtonClass({
              tone: 'quiet',
              className: 'w-full',
            })}
          >
            <SignOutIcon size={16} weight="bold" aria-hidden />
            로그아웃
          </button>
        </form>

        {/*
          계정 삭제는 아직 못 만든다. 막힌 곳이 둘이었는데 하나가 풀렸다:
          1) (풀림) 일반 멤버는 leave_trip RPC로 여행방을 나갈 수 있다. 다만 방장은
             여전히 못 나가고, 방 자체를 지우는 기능도 없다 — 방장으로 만든 방이
             하나라도 남아 있으면 trips.created_by의 on delete restrict가 막는다.
          2) auth.users 삭제는 service_role 키가 있어야 하는데, 이 앱은 anon 키만 쓴다
             (lib/supabase/server.ts).
          버튼을 눌러 놓고 실패하게 두는 대신, 소셜 로그인과 같은 방식으로 표시만 해 둔다.
          문구는 "여행방을 나가면 열린다"고 약속하지 않는다 — 나가기가 생긴 지금도
          2번이 남아 있어 지킬 수 없는 약속이 된다.
        */}
        <div className="border-line mt-3 rounded-inner border border-dashed p-4">
          <p className="flex items-center gap-2 text-sm font-medium">
            계정 삭제
            <Badge className="bg-ink/5 text-muted">준비 중</Badge>
          </p>
          <p className="text-muted mt-1 text-sm">
            아직 앱에서 계정을 지울 수 없습니다. 필요하시면 문의해 주세요.
          </p>
        </div>
      </Section>
    </div>
  )
}

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section>
      <h2 className="font-display mb-3 text-lg font-semibold tracking-tight">
        {title}
      </h2>
      {children}
    </section>
  )
}
