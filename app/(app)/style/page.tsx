import Image from 'next/image'
import Link from 'next/link'
import { actionButtonClass } from '@/components/dashboard/ActionButton'
import { ShareButton } from '@/components/dashboard/ShareButton'
import { StyleAxisIntro } from '@/components/dashboard/StyleAxisIntro'
import { StyleDirectory } from '@/components/dashboard/StyleDirectory'
import { travelStyleRepo } from '@/lib/data'
import { pageMetadata } from '@/lib/seo/metadata'
import { cn } from '@/lib/utils/cn'

export const metadata = pageMetadata({
  title: '여행 성향 분석',
  description:
    '12문항으로 내 여행 성향을 16유형 중 하나로 찾습니다. 가입도 로그인도 필요 없고, 결과는 친구에게 바로 공유할 수 있습니다.',
  path: '/style',
})

/**
 * 테스트 소개 랜딩. 문항은 /style/quiz에 있다.
 */
export default async function StylePage() {
  const [questions, styles] = await Promise.all([
    travelStyleRepo.questions(),
    travelStyleRepo.list(),
  ])

  // 문항을 못 불러온 상태에서 버튼을 열어 두면 빈 화면으로 보내게 된다.
  const canStart = questions.length > 0

  return (
    <div className="flex flex-col gap-10 pb-8">
      <div className="flex flex-col gap-7">
        {/* 기존 H1과 타이틀 영역 완벽 유지 */}
        <header className="flex items-center gap-4">
          <Image
            src="/images/mascot.webp"
            alt=""
            width={72}
            height={72}
            className="shrink-0 drop-shadow-sm"
            priority
          />
          <div>
            <h1 className="font-display text-3xl font-semibold tracking-tight">
              여행 성향 분석
            </h1>
            <p className="text-muted mt-1 text-sm leading-relaxed">
              당신의 여행 성향을 분석해보세요!<br />
              분석이 끝나면 친구들과 공유해 볼 수도 있어요!
            </p>
          </div>
        </header>

        {/* 기존 텍스트 감성을 유지하되, 박스와 볼드 처리로 가독성(스캐닝) 향상 */}
        <div className="rounded-card border-line bg-surface border p-5">
          <p className="text-muted text-sm leading-relaxed">
            <strong className="text-ink">{questions.length}문항</strong>이면 네
            축이 엇갈려{' '}
            <strong className="text-ink">{styles.length}가지</strong> 중 하나의
            결과가 나옵니다. <br className="hidden sm:block" />
            가입도 로그인도 필요 없고, 결과는 링크 하나로 친구에게 바로 넘길 수
            있어요.
          </p>
        </div>

        <div>
          {canStart ? (
            <Link
              href="/style/quiz"
              className={actionButtonClass({
                tone: 'ink',
                size: 'lg',
                className: 'w-full shadow-sm',
              })}
            >
              여행 성향 분석하기
            </Link>
          ) : (
            <span
              aria-disabled="true"
              className={cn(
                actionButtonClass({
                  tone: 'ink',
                  size: 'lg',
                  className: 'w-full',
                }),
                'pointer-events-none opacity-40',
              )}
            >
              준비 중입니다
            </span>
          )}

          {/* 면책 조항을 조금 더 부드럽고 긍정적인 UX 라이팅으로 수정 */}
          <p className="text-muted mt-4 text-center text-xs leading-relaxed">
            투고트립에서 가벼운 마음으로 즐길 수 있게 만든 테스트입니다!
          </p>
        </div>
      </div>

      {/* 섹션 구분을 위한 은은한 가로선 */}
      <hr className="border-line" />

      <div className="flex flex-col gap-10">
        <StyleAxisIntro />
        <StyleDirectory styles={styles} />
      </div>

      <hr className="border-line" />

      {/* 공유하기 영역: 목적성을 부여하여 클릭률을 높이는 배치 */}
      <div className="flex flex-col gap-4 items-center justify-center pt-2">
        <h2 className="text-lg font-semibold tracking-tight">
          같이 여행 갈 친구가 있나요?
        </h2>
        <div className="w-full">
          <ShareButton
            title="투고트립 여행 성향 분석"
            text={`MBTI보다 중요한 게 바로 여행 궁합! ${questions.length}문제 풀고 나랑 찰떡인지 확인해 봐 ✈️`}
            label="친구의 성향 물어보기"
          />
        </div>
        <p className="text-muted mt-1 text-center text-xs leading-relaxed">
          미리 성향을 맞춰보면 여행 중의 갈등을 줄일 수 있어요!
        </p>
      </div>
    </div>
  )
}