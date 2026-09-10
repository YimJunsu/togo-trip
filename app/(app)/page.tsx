import Image from 'next/image'
import Link from 'next/link'
import { ArrowRightIcon } from '@phosphor-icons/react/dist/ssr'
import { actionButtonClass } from '@/components/dashboard/ActionButton'
import { HomeMapCard } from '@/components/dashboard/HomeMapCard'
import { HomeMine } from '@/components/dashboard/HomeMine'
import { HomeTiles } from '@/components/dashboard/HomeTiles'
import { FAQ_ITEMS, SiteFaq } from '@/components/seo/SiteFaq'
import { JsonLd, faqGraph } from '@/lib/seo/JsonLd'

/**
 * 홈은 정적으로 만들어진다.
 *
 * 예전에는 여기서 getUser()로 내 여행방을 그렸는데, 그 cookies() 한 번 때문에 홈이
 * 매 요청 서버 함수 실행으로 떨어졌다. 홈은 첫 진입 지점이라 무료 플랜의 콜드 스타트가
 * 그대로 체감 지연이 됐다. 개인 데이터는 HomeMine 안으로 몰아넣고, 본문은 전부
 * 서버 렌더로 남겨 엣지 캐시에서 나가게 한다.
 *
 * 순서에도 이유가 있다. 로그인한 사람은 자기 여행방이 첫 줄이고(HomeMine), 나머지
 * 모두에게는 지도가 첫 줄이다 — HomeMine은 비로그인이면 아무것도 그리지 않으므로
 * 한 벌의 마크업이 두 상태를 다 낸다.
 */
export default function HomePage() {
  return (
    <div className="flex flex-col gap-8">
      <HomeMine />

      <HomeMapCard />

      <HomeTiles />

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

      {/*
        여행방은 로그인이 필요한 유일한 기능이다. 그래서 첫 화면이 아니라 여기,
        무료로 되는 것들을 다 보여 준 뒤에 선다. 로그인한 사람에게도 자주 쓰는
        동작이라 상태와 무관하게 서버 렌더로 둔다.
      */}
      <section>
        <h2 className="font-display text-lg font-semibold tracking-tight">
          친구들과 갈 거라면
        </h2>
        <p className="text-muted mt-1 text-sm leading-relaxed">
          여행방을 만들면 6자리 초대코드가 나옵니다. 친구가 코드를 넣으면 같은
          방에 들어오고, 여행 중 쓴 돈을 적어 두면 누가 누구에게 얼마를 보낼지
          송금 횟수가 가장 적게 계산됩니다. 여행방과 정산은 로그인이 필요합니다.
        </p>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Link
            href="/trips/new"
            className={actionButtonClass({ tone: 'ink' })}
          >
            여행방 만들기
          </Link>
          <Link href="/join" className={actionButtonClass({ tone: 'quiet' })}>
            초대코드로 참여
            <ArrowRightIcon size={16} weight="bold" aria-hidden />
          </Link>
        </div>
      </section>

      <SiteFaq />
      <JsonLd data={faqGraph([...FAQ_ITEMS])} />
    </div>
  )
}
