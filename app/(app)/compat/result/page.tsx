import Link from 'next/link'
import { ArrowClockwiseIcon } from '@phosphor-icons/react/dist/ssr'
import { actionButtonClass } from '@/components/dashboard/ActionButton'
import { CompatAxisChart } from '@/components/dashboard/CompatAxisChart'
import {
  CompatNotes,
  CompatResultHero,
} from '@/components/dashboard/CompatResultCard'
import { ShareButton } from '@/components/dashboard/ShareButton'
import { compatRepo } from '@/lib/data'
import { pageMetadata } from '@/lib/seo/metadata'

/**
 * 결과는 사람마다 달라야 하는데 지금은 seed 하나뿐이라, 색인되면 얕은 중복 페이지가 된다.
 * 공유 링크로는 계속 열리되(follow) 검색 결과에는 올리지 않는다.
 */
export const metadata = pageMetadata({
  title: '여행 궁합 결과',
  description: '같이 갈 사람과 어디가 맞고 어디가 다른지 봅니다.',
  path: '/compat/result',
  type: 'article',
  noIndex: true,
  image: {
    url: '/images/mascot.webp',
    width: 256,
    height: 256,
    alt: '투고트립',
  },
})

export default async function CompatResultPage() {
  // 점수 산출 로직이 아직 없어 answers는 빈 배열이다. repo가 seed 결과를 돌려준다.
  const result = await compatRepo.result([])

  return (
    <div className="flex flex-col gap-8">
      <CompatResultHero result={result} />

      <div className="flex flex-col gap-3">
        <ShareButton
          title={`우리 여행 궁합 ${result.percent}%`}
          text={`${result.headline}. 너도 해 봐.`}
        />
        <Link
          href="/compat"
          className={actionButtonClass({ tone: 'quiet', className: 'w-full' })}
        >
          <ArrowClockwiseIcon size={16} weight="bold" aria-hidden />
          다시 해보기
        </Link>
      </div>

      <CompatAxisChart breakdown={result.breakdown} members={result.members} />
      <CompatNotes result={result} />
    </div>
  )
}
