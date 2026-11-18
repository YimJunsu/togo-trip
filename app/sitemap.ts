import type { MetadataRoute } from 'next'
import { attractionRepo, travelStyleRepo } from '@/lib/data'
import { absoluteUrl } from '@/lib/seo/site'

/**
 * 색인시킬 화면만 넣는다. 로그인·개인 데이터 화면(/trips, /join)은 robots.ts에서
 * 막았으므로 여기에도 넣지 않는다 — 사이트맵과 robots가 어긋나면 서치콘솔이 경고한다.
 */
const STATIC_ROUTES: {
  path: string
  priority: number
  changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency']
}[] = [
  { path: '/', priority: 1, changeFrequency: 'daily' },
  { path: '/random', priority: 0.9, changeFrequency: 'weekly' },
  { path: '/food', priority: 0.9, changeFrequency: 'weekly' },
  { path: '/style', priority: 0.9, changeFrequency: 'weekly' },
  { path: '/about', priority: 0.6, changeFrequency: 'monthly' },
  { path: '/login', priority: 0.3, changeFrequency: 'yearly' },
  { path: '/signup', priority: 0.3, changeFrequency: 'yearly' },
  // 약관·방침은 검색 유입을 노리는 문서가 아니지만, 실재하고 공개돼 있다는 사실
  // 자체가 신뢰 신호라 색인은 열어 둔다. 우선순위만 가장 낮게.
  { path: '/terms', priority: 0.2, changeFrequency: 'yearly' },
  { path: '/privacy', priority: 0.2, changeFrequency: 'yearly' },
]

/**
 * 지역 목록은 쿠키 없는 공개 클라이언트로 읽는다(`lib/supabase/public.ts`). 그러면 이
 * 라우트는 빌드 때 한 번 그려지고 다음 배포까지 굳는다 — 예전에는 서버 클라이언트가
 * cookies()를 불러 우연히 매 요청 새로 그려지고 있었다. 하루 단위로 다시 그려
 * 적재 cron이 연 지역이 배포 없이도 사이트맵에 올라오게 한다.
 */
export const revalidate = 86400

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const lastModified = new Date()

  // 성향 결과 16개는 각자 고유한 본문·이미지를 가진 공유용 랜딩이라 개별로 올린다.
  // 지역 페이지는 적재된 것만 넣는다 — 미적재 페이지는 목록이 비어 색인 가치가 없고,
  // 적재가 진행되면 사이트맵이 매주 스스로 자란다.
  const [styles, regions] = await Promise.all([
    travelStyleRepo.list(),
    attractionRepo.listIngestedRegions(),
  ])

  return [
    ...STATIC_ROUTES.map(({ path, priority, changeFrequency }) => ({
      url: absoluteUrl(path),
      lastModified,
      changeFrequency,
      priority,
    })),
    ...styles.map((style) => ({
      url: absoluteUrl(`/style/${style.code}`),
      lastModified,
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    })),
    ...regions.map((region) => ({
      url: absoluteUrl(`/region/${region.code}`),
      lastModified,
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    })),
  ]
}
