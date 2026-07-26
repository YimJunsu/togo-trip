import Image from 'next/image'
import Link from 'next/link'
import { ArrowRightIcon, ShuffleIcon } from '@phosphor-icons/react/dist/ssr'
import { HomeGreeting } from '@/components/dashboard/HomeGreeting'
import { HomeTrips } from '@/components/dashboard/HomeTrips'
import { actionButtonClass } from '@/components/dashboard/ActionButton'
import { FAQ_ITEMS, SiteFaq } from '@/components/seo/SiteFaq'
import { JsonLd, faqGraph } from '@/lib/seo/JsonLd'

/**
 * 홈은 정적으로 만들어진다.
 *
 * 예전에는 여기서 getUser()로 내 여행방을 그렸는데, 그 cookies() 한 번 때문에 홈이
 * 매 요청 서버 함수 실행으로 떨어졌다. 홈은 첫 진입 지점이라 무료 플랜의 콜드 스타트가
 * 그대로 체감 지연이 됐다. 개인 데이터는 HomeGreeting·HomeTrips 안으로 몰아넣고,
 * 본문은 전부 서버 렌더로 남겨 엣지 캐시에서 나가게 한다.
 */
export default function HomePage() {
  return (
    <div className="flex flex-col gap-8">
      <section>
        <HomeGreeting />
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

      <HomeTrips />

      <SiteFaq />
      <JsonLd data={faqGraph([...FAQ_ITEMS])} />
    </div>
  )
}
