import Link from 'next/link'
import { DartGame } from '@/components/dashboard/DartGame'
import { ModeTabs } from '@/components/dashboard/ModeTabs'
import { DestinationDirectory } from '@/components/dashboard/DestinationDirectory'
import { RandomDrawer } from '@/components/dashboard/RandomDrawer'
import { RegionDirectory } from '@/components/dashboard/RegionDirectory'
import { attractionRepo, destinationRepo } from '@/lib/data'
import { rollWind } from '@/lib/geo/dart'
import { pageMetadata } from '@/lib/seo/metadata'

export const metadata = pageMetadata({
  title: '여행지 뽑기',
  description:
    '어디 갈지 못 정했을 때. 지도에 다트를 던지거나 조건을 걸어 국내 여행지를 무작위로 정합니다. 로그인 없이 바로 됩니다.',
  path: '/random',
})

export default async function RandomPage() {
  const [candidates, regions] = await Promise.all([
    destinationRepo.list(),
    attractionRepo.listIngestedRegions(),
  ])

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-6">
        <header>
          <h1 className="font-display text-3xl font-semibold tracking-tight">
            여행지 뽑기
          </h1>
          <p className="text-muted mt-1 text-sm">
            다트를 던지거나, 조건 걸고 운에 맡기세요. 국내 한정입니다.
          </p>
        </header>

        <ModeTabs
          modes={[
            {
              id: 'dart',
              label: '다트 던지기',
              panel: <DartGame initialWind={rollWind()} />,
            },
            {
              id: 'slot',
              label: '조건으로 뽑기',
              panel: <RandomDrawer initialCandidates={candidates} />,
            },
          ]}
        />
      </div>

      <DestinationDirectory destinations={candidates} />
      <RegionDirectory regions={regions} />

      <section aria-labelledby="random-more-heading">
        <h2
          id="random-more-heading"
          className="font-display text-lg font-semibold tracking-tight"
        >
          먹을 것도 못 정했다면
        </h2>
        <p className="text-muted mt-1 text-sm leading-relaxed">
          여행지를 정하고 나면 다음 고민은 늘 끼니입니다.{' '}
          <Link href="/food" className="text-ink underline underline-offset-4">
            음식 뽑기
          </Link>
          에서 종류와 컨디션을 걸어 메뉴를 뽑고, 열량·탄단지·나트륨까지 함께 볼
          수 있습니다.
        </p>
      </section>
    </div>
  )
}
