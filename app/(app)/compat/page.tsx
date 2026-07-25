import { SmileyMehIcon } from '@phosphor-icons/react/dist/ssr'
import { CompatQuiz } from '@/components/dashboard/CompatQuiz'
import { EmptyState } from '@/components/dashboard/EmptyState'
import { compatRepo } from '@/lib/data'
import { pageMetadata } from '@/lib/seo/metadata'

export const metadata = pageMetadata({
  title: '여행 궁합',
  description:
    '같이 갈 사람과 여행 취향이 얼마나 맞는지 문항으로 확인합니다. 어디가 맞고 어디가 다른지 축별로 보여 줍니다.',
  path: '/compat',
})

export default async function CompatPage() {
  const questions = await compatRepo.questions()

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          여행 궁합
        </h1>
        <p className="text-muted mt-1 text-sm">
          {questions.length}문항. 같이 갈 사람과 얼마나 맞는지 봅니다.
        </p>
      </header>

      {questions.length === 0 ? (
        <EmptyState
          icon={SmileyMehIcon}
          title="문항이 없습니다"
          description="퀴즈를 불러오지 못했습니다. 잠시 후 다시 오세요."
        />
      ) : (
        <CompatQuiz questions={questions} />
      )}
    </div>
  )
}
