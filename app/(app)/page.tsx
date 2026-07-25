import Image from 'next/image'
import Link from 'next/link'
import {
  ArrowRightIcon,
  ShuffleIcon,
  SuitcaseRollingIcon,
} from '@phosphor-icons/react/dist/ssr'
import { actionButtonClass } from '@/components/dashboard/ActionButton'
import { EmptyState } from '@/components/dashboard/EmptyState'
import { TripCard } from '@/components/dashboard/TripCard'
import { FAQ_ITEMS, SiteFaq } from '@/components/seo/SiteFaq'
import { getUser } from '@/lib/auth/session'
import { tripRepo } from '@/lib/data'
import { JsonLd, faqGraph } from '@/lib/seo/JsonLd'

export default async function HomePage() {
  const user = await getUser()

  const trips = user ? await tripRepo.list(user.id) : []
  const membersByTrip = await Promise.all(
    trips.map((trip) => tripRepo.listMembers(trip.id)),
  )
  const today = new Date()

  return (
    <div className="flex flex-col gap-8">
      <section>
        {user && (
          <p className="text-muted font-mono text-xs tracking-widest">
            안녕 {user.name}
          </p>
        )}
        <h1 className="font-display mt-1 text-3xl font-semibold tracking-tight">
          어디 갈지 못 정했으면
        </h1>
        <Link
          href="/random"
          className="rounded-card bg-lime shadow-soft hover:shadow-lift mt-4 flex items-center justify-between p-6 transition duration-300 ease-out hover:-translate-y-[3px]"
        >
          <span>
            <span className="font-display block text-2xl font-semibold tracking-tight">
              여행지 뽑기
            </span>
            <span className="mt-1 block text-sm opacity-70">
              다트 던지거나, 태그 고르고 운에 맡기기
            </span>
          </span>
          <span className="bg-ink text-paper rounded-full p-3">
            <ShuffleIcon size={22} weight="bold" aria-hidden />
          </span>
        </Link>
      </section>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Link href="/trips/new" className={actionButtonClass({ tone: 'ink' })}>
          여행방 만들기
        </Link>
        <Link href="/join" className={actionButtonClass({ tone: 'quiet' })}>
          초대코드로 참여
          <ArrowRightIcon size={16} weight="bold" aria-hidden />
        </Link>
      </section>

      <section>
        <Link
          href="/style"
          className="rounded-card border-line bg-surface shadow-soft hover:shadow-lift flex items-center gap-4 border p-5 transition duration-300 ease-out hover:-translate-y-[3px]"
        >
          <Image
            src="/images/mascot.webp"
            alt=""
            width={64}
            height={64}
            className="shrink-0"
          />
          <span className="flex-1">
            <span className="font-display block text-lg font-semibold tracking-tight">
              내 여행 성향은?
            </span>
            <span className="text-muted mt-1 block text-sm">
              12문항 · 16유형 · 로그인 없이 바로. 결과는 친구에게 공유하세요.
            </span>
          </span>
          <ArrowRightIcon
            size={18}
            weight="bold"
            aria-hidden
            className="text-muted shrink-0"
          />
        </Link>
      </section>

      {user ? (
        <section>
          <h2 className="font-display mb-3 text-lg font-semibold tracking-tight">
            내 여행방
          </h2>
          {trips.length === 0 ? (
            <EmptyState
              icon={SuitcaseRollingIcon}
              title="아직 여행방이 없습니다"
              description="방을 만들어 친구를 부르거나, 받은 초대코드로 들어가세요."
              action={
                <Link
                  href="/trips/new"
                  className={actionButtonClass({ size: 'sm' })}
                >
                  여행방 만들기
                </Link>
              }
            />
          ) : (
            <ul className="flex flex-col gap-4">
              {trips.map((trip, i) => (
                <TripCard
                  key={trip.id}
                  trip={trip}
                  members={membersByTrip[i]}
                  today={today}
                  index={i}
                />
              ))}
            </ul>
          )}
        </section>
      ) : (
        <section className="rounded-card border-line bg-surface shadow-soft border p-6">
          <p className="font-display text-lg font-semibold tracking-tight">
            여행방은 회원만 만들 수 있어요
          </p>
          <p className="text-muted mt-1 text-sm">
            가입하면 초대코드로 친구를 부르고 정산까지 한 번에 됩니다.
          </p>
          <Link
            href="/login"
            className={actionButtonClass({
              tone: 'ink',
              className: 'mt-4 w-full',
            })}
          >
            로그인하고 여행방 만들기
          </Link>
        </section>
      )}

      <SiteFaq />
      <JsonLd data={faqGraph([...FAQ_ITEMS])} />
    </div>
  )
}
