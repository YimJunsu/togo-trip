import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { StyleAxisNotes } from '@/components/dashboard/StyleAxisNotes'
import { StyleMatchGrid } from '@/components/dashboard/StyleMatchGrid'
import { StyleResultActions } from '@/components/dashboard/StyleResultActions'
import {
  StyleAxisGrid,
  StyleNotes,
  StyleResultHero,
} from '@/components/dashboard/StyleResultCard'
import { travelStyleRepo } from '@/lib/data'
import { JsonLd, breadcrumbGraph } from '@/lib/seo/JsonLd'
import { pageMetadata } from '@/lib/seo/metadata'
import { nearestCodes } from '@/lib/style/score'
import type { PageProps } from '@/lib/types/page'

type Params = { code: string }

const MATCH_COUNT = 3

/**
 * 16유형을 빌드 시 미리 만들어 둔다. 공유 링크가 처음 열릴 때 og:image가 비어 보이는
 * 일이 없어야 하고, 크롤러도 정적 HTML을 바로 받는다.
 */
export async function generateStaticParams() {
  const styles = await travelStyleRepo.list()
  return styles.map((style) => ({ code: style.code }))
}

export async function generateMetadata({
  params,
}: PageProps<Params>): Promise<Metadata> {
  const { code } = await params
  const style = await travelStyleRepo.get(code)
  if (!style) return { title: '없는 결과', robots: { index: false } }

  // 공유 카드 이미지는 같은 폴더의 opengraph-image.tsx가 붙인다(1200×630, 유형 이름 포함).
  // 여기서 image를 따로 주면 정사각형 일러스트와 두 장이 경합한다.
  return pageMetadata({
    title: `나는 ${style.name} 여행이다 (${style.code})`,
    description: `${style.tagline} — 투고트립 여행 성향 분석 16유형 중 ${style.code}. 12문항이면 내 유형도 나옵니다.`,
    path: `/style/${style.code}`,
    type: 'article',
  })
}

export default async function StyleResultPage({ params }: PageProps<Params>) {
  const { code } = await params
  const style = await travelStyleRepo.get(code)
  if (!style) notFound()

  const all = await travelStyleRepo.list()
  const matchCodes = nearestCodes(
    style.code,
    style.matchCode,
    all.map((s) => s.code),
    MATCH_COUNT,
  )
  const matches = matchCodes
    .map((c) => all.find((s) => s.code === c))
    .filter((s): s is NonNullable<typeof s> => Boolean(s))

  return (
    <div className="flex flex-col gap-8">
      <StyleResultHero style={style} />

      <StyleResultActions
        code={style.code}
        name={style.name}
        tagline={style.tagline}
      />

      <StyleAxisGrid style={style} />
      <StyleNotes style={style} match={matches[0] ?? null} />
      <StyleAxisNotes style={style} />
      <StyleMatchGrid styles={matches} />

      <JsonLd
        data={breadcrumbGraph([
          { name: '홈', path: '/' },
          { name: '여행 성향 분석', path: '/style' },
          { name: style.name, path: `/style/${style.code}` },
        ])}
      />
    </div>
  )
}
