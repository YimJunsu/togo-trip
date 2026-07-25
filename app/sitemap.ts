import type { MetadataRoute } from 'next'
import { travelStyleRepo } from '@/lib/data'
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
  { path: '/style', priority: 0.9, changeFrequency: 'weekly' },
  { path: '/compat', priority: 0.8, changeFrequency: 'weekly' },
  { path: '/login', priority: 0.3, changeFrequency: 'yearly' },
  { path: '/signup', priority: 0.3, changeFrequency: 'yearly' },
]

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const lastModified = new Date()

  // 성향 결과 16개는 각자 고유한 본문·이미지를 가진 공유용 랜딩이라 개별로 올린다.
  const styles = await travelStyleRepo.list()

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
  ]
}
