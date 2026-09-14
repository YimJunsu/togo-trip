import Image from 'next/image'
import Link from 'next/link'
import { actionButtonClass } from '@/components/dashboard/ActionButton'
import { ShareButton } from '@/components/dashboard/ShareButton'
import { StyleAxisIntro } from '@/components/dashboard/StyleAxisIntro'
import { StyleDirectory } from '@/components/dashboard/StyleDirectory'
import { travelStyleRepo } from '@/lib/data'
import { pageMetadata } from '@/lib/seo/metadata'
import { QUIZ_LENGTH } from '@/lib/style/pick'
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
      <div className="rounded-card border-line bg-surface flex flex-col gap-6 border p-6 sm:p-8">
        <p className="text-accent text-xs font-semibold">여행 성향 테스트</p>
        <header className="flex items-center gap-4">
          <Image
            src="/images/mascot.webp"
            alt=""
            width={96}
            height={96}
            className="order-last size-20 shrink-0 sm:size-24"
            preload
          />
          <div>
            <h1 className="font-display text-3xl font-semibold tracking-tight">
              같은 여행,
              <br />
              다른 우리 취향
            </h1>
            <p className="text-muted mt-3 text-sm leading-relaxed">
              빼곡한 일정이 좋아요, 발길 닿는 대로가 좋아요? 나다운 여행 방식을
              찾아보세요.
            </p>
          </div>
        </header>

        <dl className="border-line grid grid-cols-3 border-y py-4 text-center">
          <div>
            <dt className="text-muted text-xs">가벼운 질문</dt>
            <dd className="mt-1 text-lg font-semibold">{QUIZ_LENGTH}문항</dd>
          </div>
          <div className="border-line border-x">
            <dt className="text-muted text-xs">여행 취향</dt>
            <dd className="mt-1 text-lg font-semibold">{styles.length}유형</dd>
          </div>
          <div>
            <dt className="text-muted text-xs">회원가입</dt>
            <dd className="mt-1 text-lg font-semibold">없이 바로</dd>
          </div>
        </dl>

        <div>
          {canStart ? (
            <Link
              href="/style/quiz"
              className={actionButtonClass({
                tone: 'accent',
                size: 'lg',
                className: 'w-full',
              })}
            >
              내 여행 성향 알아보기
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

          <p className="text-muted mt-4 text-center text-xs leading-relaxed">
            정답은 없어요. 가볍게 즐기고, 결과를 친구와 나눠보세요.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-10">
        <StyleAxisIntro />
        <StyleDirectory styles={styles} />
      </div>

      <hr className="border-line" />

      <div className="flex flex-col items-center justify-center gap-4 pt-2">
        <h2 className="text-lg font-semibold tracking-tight">
          같이 여행 갈 친구가 있나요?
        </h2>
        <div className="w-full">
          <ShareButton
            title="투고트립 여행 성향 분석"
            text={`${QUIZ_LENGTH}문항으로 알아보는 우리 여행 취향. 같이 떠나기 전에 해볼래?`}
            label="친구의 성향 물어보기"
          />
        </div>
        <p className="text-muted mt-1 text-center text-xs leading-relaxed">
          서로의 취향을 알고 떠나면, 함께 정하기가 더 쉬워져요.
        </p>
      </div>
    </div>
  )
}
