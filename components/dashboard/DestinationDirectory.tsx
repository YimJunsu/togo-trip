import type { Destination } from '@/lib/data/types'
import { THEME_LABEL } from '@/lib/utils/labels'

/**
 * 뽑기 후보 전체를 지역별로 펼쳐 보여 준다.
 *
 * 화면상으로는 "뭐가 들어 있는지 미리 본다"는 역할이고, 동시에 이 페이지가 가진
 * 유일한 본문이기도 하다. 후보 목록은 원래 클라이언트 컴포넌트 안에만 있어서
 * 크롤러에겐 페이지가 260자짜리 빈 껍데기로 보였다. 서버에서 한 번 더 텍스트로
 * 내보내야 "국내 여행지"·"강릉 안목해변" 같은 검색어에 걸린다.
 */
export function DestinationDirectory({
  destinations,
}: {
  destinations: Destination[]
}) {
  // 데이터 순서가 곧 지역 순서다(부산→강원→제주→…). 별도 정렬 규칙을 두지 않는다.
  const byRegion = new Map<string, Destination[]>()
  for (const destination of destinations) {
    const bucket = byRegion.get(destination.region)
    if (bucket) bucket.push(destination)
    else byRegion.set(destination.region, [destination])
  }

  return (
    <section aria-labelledby="directory-heading">
      <h2
        id="directory-heading"
        className="font-display text-lg font-semibold tracking-tight"
      >
        뽑기에 들어 있는 국내 여행지 {destinations.length}곳
      </h2>
      <p className="text-muted mt-1 text-sm leading-relaxed">
        {byRegion.size}개 지역, 바다부터 산·도시·힐링·액티비티까지. 조건을 걸면 그
        안에서만 뽑고, 아무것도 안 고르면 {destinations.length}곳 전부가 후보가
        됩니다.
      </p>

      <div className="mt-6 flex flex-col gap-6">
        {[...byRegion].map(([region, items]) => (
          <div key={region}>
            <h3 className="text-muted font-mono text-xs tracking-widest">
              {region}
            </h3>
            <ul className="divide-line mt-2 divide-y">
              {items.map((destination) => (
                <li key={destination.id} className="flex gap-3 py-3">
                  <span className="shrink-0 text-xl leading-tight" aria-hidden>
                    {destination.emoji}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium">
                      {destination.name}
                      <span className="text-muted ml-2 text-xs font-normal">
                        {destination.themes
                          .map((theme) => THEME_LABEL[theme])
                          .join('·')}
                      </span>
                    </p>
                    <p className="text-muted mt-0.5 text-sm leading-relaxed">
                      {destination.summary}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  )
}
