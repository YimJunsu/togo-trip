import Image from 'next/image'
import { SmileyMehIcon } from '@phosphor-icons/react/dist/ssr'
import { EmptyState } from '@/components/dashboard/EmptyState'
import { StyleDirectory } from '@/components/dashboard/StyleDirectory'
import { StyleQuiz } from '@/components/dashboard/StyleQuiz'
import { travelStyleRepo } from '@/lib/data'
import { pageMetadata } from '@/lib/seo/metadata'

export const metadata = pageMetadata({
  title: '여행 성향 분석',
  description:
    '12문항으로 내 여행 성향을 16유형 중 하나로 찾습니다. 가입도 로그인도 필요 없고, 결과는 친구에게 바로 공유할 수 있습니다.',
  path: '/style',
})

export default async function StylePage() {
  const [questions, styles] = await Promise.all([
    travelStyleRepo.questions(),
    travelStyleRepo.list(),
  ])

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-6">
        <header className="flex items-center gap-4">
        <Image
          src="/images/mascot.webp"
          alt=""
          width={72}
          height={72}
          className="shrink-0"
          priority
        />
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">
            여행 성향 분석
          </h1>
          <p className="text-muted mt-1 text-sm">
            {questions.length}문항이면 끝납니다. 결과는 {styles.length}가지,
            가입도 로그인도 필요 없어요.
          </p>
        </div>
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

      <StyleDirectory styles={styles} />
    </div>
  )
}
