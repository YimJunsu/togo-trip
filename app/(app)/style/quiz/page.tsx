import { SmileyMehIcon } from '@phosphor-icons/react/dist/ssr'
import { EmptyState } from '@/components/dashboard/EmptyState'
import { StyleQuiz } from '@/components/dashboard/StyleQuiz'
import { travelStyleRepo } from '@/lib/data'
import { pageMetadata } from '@/lib/seo/metadata'

/**
 * 문항만 있는 얕은 페이지라 색인하지 않는다. /style 랜딩과 다루는 주제가 같아
 * 둘 다 색인되면 서로 순위를 갉아먹는다.
 *
 * robots.ts로는 막지 않는다 — 크롤러가 랜딩의 CTA 링크를 따라올 수 있어야
 * 링크 그래프가 끊기지 않는다. noindex는 하되 follow는 살린다.
 */
export const metadata = pageMetadata({
  title: '여행 성향 테스트',
  description:
    '문항에 답하면 내 여행 성향 유형이 나옵니다. 가입도 로그인도 필요 없습니다.',
  path: '/style/quiz',
  noIndex: true,
})

export default async function StyleQuizPage() {
  const questions = await travelStyleRepo.questions()

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          여행 성향 분석
        </h1>
        <p className="text-muted mt-1 text-sm">
          {questions.length}문항이면 끝납니다. 답을 고르면 다음으로 넘어가요.
        </p>
      </header>

      {questions.length === 0 ? (
        <EmptyState
          icon={SmileyMehIcon}
          title="문항이 없습니다"
          description="테스트를 불러오지 못했습니다. 잠시 후 다시 오세요."
        />
      ) : (
        <StyleQuiz questions={questions} />
      )}
    </div>
  )
}
