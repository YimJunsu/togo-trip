import { DartGame } from '@/components/dashboard/DartGame'
import { RandomDrawer } from '@/components/dashboard/RandomDrawer'
import { RandomModeTabs } from '@/components/dashboard/RandomModeTabs'
import { destinationRepo } from '@/lib/data'
import { rollWind } from '@/lib/geo/dart'
import { pageMetadata } from '@/lib/seo/metadata'

export const metadata = pageMetadata({
  title: '여행지 뽑기',
  description:
    '어디 갈지 못 정했을 때. 지도에 다트를 던지거나 조건을 걸어 국내 여행지를 무작위로 정합니다. 로그인 없이 바로 됩니다.',
  path: '/random',
})

export default async function RandomPage() {
  const candidates = await destinationRepo.list()

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          여행지 뽑기
        </h1>
        <p className="text-muted mt-1 text-sm">
          다트를 던지거나, 조건 걸고 운에 맡기세요. 국내 한정입니다.
        </p>
      </header>

      <RandomModeTabs
        dartPanel={<DartGame initialWind={rollWind()} />}
        slotPanel={<RandomDrawer initialCandidates={candidates} />}
      />
    </div>
  )
}
