import Link from 'next/link'
import type { RegionSummary } from '@/lib/data/types'

/**
 * 적재 완료 지역 목록. 서버 렌더 본문이자 /region/[code]로 걸어 들어가는 내부 링크다.
 * 사이트맵에만 있고 인바운드 링크가 없는 URL은 색인 우선순위가 바닥이다.
 */
export function RegionDirectory({ regions }: { regions: RegionSummary[] }) {
  if (regions.length === 0) return null

  const byProvince = new Map<string, RegionSummary[]>()
  for (const region of regions) {
    const list = byProvince.get(region.province) ?? []
    list.push(region)
    byProvince.set(region.province, list)
  }

  return (
    <section className="flex flex-col gap-4">
      <header>
        <h2 className="font-display text-xl font-semibold tracking-tight">
          지역별 가볼만한 곳
        </h2>
        <p className="text-muted mt-1 text-sm leading-relaxed">
          한국관광공사 공공데이터로 만든 지역별 관광지·맛집 목록입니다. 지금까지{' '}
          {regions.length}개 시군구가 준비돼 있고, 매일 조금씩 늘어납니다. 다트가
          꽂힌 지역이 여기 없더라도 결과 화면에서 바로 불러옵니다.
        </p>
      </header>

      <div className="bg-surface rounded-card border-line shadow-soft divide-line divide-y border">
        {[...byProvince.entries()].map(([province, list]) => (
          <div key={province} className="px-5 py-4">
            <p className="text-muted font-mono text-xs tracking-widest">
              {province}
            </p>
            <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5">
              {list.map((region) => (
                <li key={region.code}>
                  <Link
                    href={`/region/${region.code}`}
                    className="text-ink text-sm font-semibold underline-offset-4 hover:underline"
                  >
                    {region.name}
                  </Link>
                  <span className="text-muted ml-1 text-xs">
                    {region.attractionCount + region.restaurantCount}곳
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  )
}
