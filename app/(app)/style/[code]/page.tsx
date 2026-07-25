import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowClockwiseIcon } from '@phosphor-icons/react/dist/ssr'
import { actionButtonClass } from '@/components/dashboard/ActionButton'
import { ShareButton } from '@/components/dashboard/ShareButton'
import { StyleMatchGrid } from '@/components/dashboard/StyleMatchGrid'
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

  // 공유 링크를 카카오톡·메시지에 붙였을 때 카드가 뜨도록 og·twitter를 함께 채운다.
  return pageMetadata({
    title: `나는 ${style.name} 여행이다 (${style.code})`,
    description: `${style.tagline} — 투고트립 여행 성향 분석 16유형 중 ${style.code}. 12문항이면 내 유형도 나옵니다.`,
    path: `/style/${style.code}`,
    type: 'article',
    image: {
      url: `/images/style/${style.code}.webp`,
      width: 768,
      height: 768,
      alt: style.name,
    },
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

      <div className="flex flex-col gap-3">
        <ShareButton
          title={`나는 ${style.name} 여행이다`}
          text={`${style.tagline} · 내 여행 성향은 ${style.code}. 너도 해 봐.`}
        />
        {/* 재시도이므로 소개 랜딩(/style)이 아니라 문항으로 바로 보낸다. */}
        <Link
          href="/style/quiz"
          className={actionButtonClass({ tone: 'quiet', className: 'w-full' })}
        >
          <ArrowClockwiseIcon size={16} weight="bold" aria-hidden />
          다시 해보기
        </Link>
      </div>

      <StyleAxisGrid style={style} />
      <StyleNotes style={style} />
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
