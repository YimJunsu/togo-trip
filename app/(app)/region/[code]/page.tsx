import Link from 'next/link'
import { notFound } from 'next/navigation'
import { AttractionList } from '@/components/dashboard/AttractionList'
import { attractionRepo, destinationRepo } from '@/lib/data'
import { JsonLd, breadcrumbGraph } from '@/lib/seo/JsonLd'
import { pageMetadata } from '@/lib/seo/metadata'
import { PROVINCE_TO_REGION } from '@/lib/utils/labels'

type Params = { params: Promise<{ code: string }> }

export async function generateMetadata({ params }: Params) {
  const { code } = await params
  const region = await attractionRepo.getRegion(code)
  if (!region) {
    return { title: '없는 지역', robots: { index: false } }
  }

  return pageMetadata({
    title: `${region.name} 가볼만한 곳`,
    description:
      `${region.province} ${region.name}의 관광지 ${region.attractionCount}곳과 ` +
      `맛집 ${region.restaurantCount}곳. 한국관광공사 공공데이터로 만든 목록입니다. 로그인 없이 바로 봅니다.`,
    path: `/region/${region.code}`,
    // 미적재 지역은 목록이 비어 있어 색인 가치가 없다. 적재되면 다음 배포에서 자동으로 열린다.
    // 내용이 없으면 색인에서 뺀다. ingestedAt은 "시도했다"만 알려줘서,
    // TourAPI가 0건을 준 지역이 빈 페이지로 색인될 수 있다.
    noIndex: region.attractionCount === 0,
  })
}

export default async function RegionPage({ params }: Params) {
  const { code } = await params
  const region = await attractionRepo.getRegion(code)
  if (!region) notFound()

  // 타입별로 두 번 부르면 둘 다 빈 결과를 받아 각자 read-through 적재를 돌린다.
  // 한 번만 받아 코드에서 나눈다 — 조회 수도 절반이 된다.
  const all = await attractionRepo.listByRegion(code)
  const spots = all.filter((a) => a.contentTypeId === 12).slice(0, 5)
  const restaurants = all.filter((a) => a.contentTypeId === 39).slice(0, 5)

  // 같은 시도의 큐레이션 여행지. /random으로 나가는 내부 링크를 만든다.
  const provinceKey = PROVINCE_TO_REGION[region.province]
  const nearby = provinceKey
    ? (await destinationRepo.list({ region: provinceKey })).slice(0, 4)
    : []

  return (
    <div className="flex flex-col gap-10">
      <JsonLd
        data={breadcrumbGraph([
          { name: '홈', path: '/' },
          { name: '여행지 뽑기', path: '/random' },
          { name: region.name, path: `/region/${region.code}` },
        ])}
      />

      <header>
        <p className="text-muted font-mono text-xs tracking-widest">
          {region.province}
        </p>
        <h1 className="font-display mt-1 text-3xl font-semibold tracking-tight">
          {region.name} 가볼만한 곳
        </h1>
        <p className="text-muted mt-3 text-sm leading-relaxed">
          {region.province} {region.name}에서 갈 만한 곳을 모았습니다. 한국관광공사가
          공개한 관광정보를 그대로 가져와 정리한 목록이라, 관광지 {region.attractionCount}곳과
          음식점 {region.restaurantCount}곳이 담겨 있습니다. 어디부터 볼지 못 정했다면
          위에서부터 훑어보세요. 로그인이나 가입 없이 바로 볼 수 있고, 여행지 뽑기에서
          다트가 이 지역에 꽂혔을 때도 같은 목록이 나옵니다.
        </p>
      </header>

      <section className="flex flex-col gap-4">
        <h2 className="font-display text-xl font-semibold tracking-tight">
          {region.name} 관광지
        </h2>
        <AttractionList
          items={spots}
          emptyText={`${region.name}의 관광지 정보는 아직 준비 중입니다. 곧 채워집니다.`}
        />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="font-display text-xl font-semibold tracking-tight">
          {region.name} 음식점
        </h2>
        <AttractionList
          items={restaurants}
          emptyText={`${region.name}의 음식점 정보는 아직 준비 중입니다.`}
        />
      </section>

      {nearby.length > 0 && (
        <section className="flex flex-col gap-4">
          <h2 className="font-display text-xl font-semibold tracking-tight">
            {region.province}의 다른 여행지
          </h2>
          <p className="text-muted text-sm leading-relaxed">
            {region.name} 말고도 {region.province}에는 갈 만한 곳이 더 있습니다.
            아래는 투고트립이 고른 목적지이고, 조건을 걸어 무작위로 뽑고 싶다면
            여행지 뽑기에서 슬롯을 돌리거나 지도에 다트를 던지면 됩니다.
          </p>
          <ul className="rounded-inner border-line divide-line divide-y border">
            {nearby.map((destination) => (
              <li key={destination.id} className="px-4 py-3">
                <p className="font-display text-sm font-semibold tracking-tight">
                  {destination.name}
                </p>
                <p className="text-muted mt-0.5 text-xs leading-relaxed">
                  {destination.summary}
                </p>
              </li>
            ))}
          </ul>
          <Link href="/random" className="text-ink text-sm font-semibold underline">
            여행지 뽑기로 이동
          </Link>
        </section>
      )}
    </div>
  )
}
