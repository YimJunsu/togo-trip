import Link from 'next/link'
import Image from 'next/image'
import { destinationRepo, travelStyleRepo } from '@/lib/data'
import { OPERATOR } from '@/lib/legal/policy'
import { pageMetadata } from '@/lib/seo/metadata'
import { SITE_NAME, SITE_NAME_EN } from '@/lib/seo/site'

export const metadata = pageMetadata({
  title: '서비스 소개',
  description: `${SITE_NAME}은 친구들과 국내여행을 계획하고 정산까지 한 곳에서 끝내는 무료 웹 서비스입니다. 여행지 뽑기, 초대코드 여행방, 엔빵 정산, 여행 성향 분석을 제공합니다.`,
  path: '/about',
})

export default async function AboutPage() {
  const [destinations, styles] = await Promise.all([
    destinationRepo.list(),
    travelStyleRepo.list(),
  ])

  return (
    <div className="flex flex-col gap-10">
      <header className="flex items-center gap-4">
        <Image
          src="/images/mascot.webp"
          alt=""
          width={72}
          height={72}
          className="shrink-0"
          priority
        />
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">
            {SITE_NAME} 소개
          </h1>
          <p className="text-muted mt-1 text-sm leading-relaxed">
            친구들과 떠나는 국내여행을 한 곳에서. {SITE_NAME_EN}
          </p>
        </div>
      </header>

      <section>
        <h2 className="font-display text-lg font-semibold tracking-tight">
          왜 만들었나
        </h2>
        <div className="mt-2 flex flex-col gap-2 text-sm leading-relaxed">
          <p className="text-muted">
            친구들과 여행을 가기로 하면 늘 같은 자리에서 막힙니다. 어디 갈지 아무도
            먼저 정하지 못하고, 단톡방에서 링크만 오가다 흐지부지됩니다. 겨우
            다녀와도 이번엔 누가 얼마를 냈는지 계산하다 어색해집니다.
          </p>
          <p className="text-muted">
            {SITE_NAME}은 그 두 지점만 해결하려고 만들었습니다. 못 정하겠으면 뽑아
            주고, 다녀와서는 누가 누구에게 얼마를 보내면 되는지 계산해 줍니다.
            그 사이를 여행방 하나로 잇습니다.
          </p>
        </div>
      </section>

      <section>
        <h2 className="font-display text-lg font-semibold tracking-tight">
          할 수 있는 것
        </h2>
        <ul className="divide-line border-line mt-3 divide-y border-t border-b">
          <Feature
            title="여행지 뽑기"
            href="/random"
            body={`지도에 다트를 던지거나 조건을 걸어 국내 여행지 ${destinations.length}곳 중에서 무작위로 정합니다. 로그인 없이 바로 됩니다.`}
          />
          <Feature
            title="여행 성향 분석"
            href="/style"
            body={`12문항으로 내 여행 성향을 ${styles.length}가지 중 하나로 찾습니다. 결과는 링크 하나로 친구에게 넘길 수 있습니다.`}
          />
          <Feature
            title="여행 궁합"
            href="/compat"
            body="같이 갈 사람과 취향이 얼마나 맞는지, 어디가 어긋나는지 축별로 확인합니다."
          />
          <Feature
            title="여행방과 엔빵 정산"
            href="/trips/new"
            body="방을 만들면 6자리 초대코드가 나옵니다. 친구가 코드를 넣으면 같은 방에 들어오고, 여행 중 쓴 돈을 적으면 송금 횟수가 가장 적게 나오도록 정산해 줍니다. 이 기능만 로그인이 필요합니다."
          />
        </ul>
      </section>

      <section>
        <h2 className="font-display text-lg font-semibold tracking-tight">
          알아 두실 것
        </h2>
        <div className="mt-2 flex flex-col gap-2 text-sm leading-relaxed">
          <p className="text-muted">
            모든 기능은 무료입니다. 여행지 뽑기와 성향 분석, 궁합은 가입하지 않아도
            쓸 수 있고, 여행방과 정산만 로그인이 필요합니다.
          </p>
          <p className="text-muted">
            다루는 범위는 대한민국 국내여행입니다. 해외여행은 지원하지 않습니다.
          </p>
          <p className="text-muted">
            정산 기능은 계산만 해 주는 도구이고 실제 송금을 대행하지 않습니다. 성향
            분석과 궁합은 재미를 위한 것이라 전문적인 진단이 아닙니다.
          </p>
        </div>
      </section>

      <section>
        <h2 className="font-display text-lg font-semibold tracking-tight">
          문의
        </h2>
        <p className="text-muted mt-2 text-sm leading-relaxed">
          기능 제안이나 오류 신고는 {OPERATOR.email} 으로 보내 주세요.{' '}
          <Link href="/terms" className="text-ink font-medium underline">
            이용약관
          </Link>
          과{' '}
          <Link href="/privacy" className="text-ink font-medium underline">
            개인정보처리방침
          </Link>
          도 확인하실 수 있습니다.
        </p>
      </section>
    </div>
  )
}

function Feature({
  title,
  href,
  body,
}: {
  title: string
  href: string
  body: string
}) {
  return (
    <li className="py-4">
      <Link
        href={href}
        className="text-ink font-display font-semibold tracking-tight underline underline-offset-4"
      >
        {title}
      </Link>
      <p className="text-muted mt-1 text-sm leading-relaxed">{body}</p>
    </li>
  )
}
