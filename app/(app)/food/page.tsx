import Link from 'next/link'
import { BoardPanel } from '@/components/menu-board/BoardPanel'
import {
  BoardHeading,
  BoardRule,
  MenuBoard,
} from '@/components/menu-board/MenuBoard'
import { foodRepo } from '@/lib/data'
import { pageMetadata } from '@/lib/seo/metadata'

export const metadata = pageMetadata({
  title: '음식 뽑기',
  description:
    '오늘 뭐 먹지. 아무거나 뽑거나 종류·컨디션을 걸어 메뉴를 정합니다. 뽑힌 메뉴의 열량·탄단지·나트륨을 1일 기준치와 함께 보여 줍니다.',
  path: '/food',
})

/** 차림표 아래에 세우는 다음 걸음. 링크인 카드라 호버에 반응한다. (DESIGN_SYSTEM §2) */
const NEXT_STEPS = [
  {
    href: '/random',
    emoji: '🎯',
    title: '여행지 뽑기',
    description: '지도에 다트를 던져 국내 여행지를 정합니다.',
  },
  {
    href: '/style',
    emoji: '🧭',
    title: '여행 성향 테스트',
    description: '12문항으로 16유형 중 내 유형을 찾습니다.',
  },
]

export default async function FoodPage() {
  const foods = await foodRepo.list()

  return (
    <div className="flex flex-col gap-10">
      <MenuBoard>
        <BoardHeading lines={['오늘의', '차림표']} caption="TODAY'S MENU" />
        <BoardRule />
        <BoardPanel foods={foods} />
      </MenuBoard>

      {/*
        서버에서 렌더되는 본문. 후보 목록을 걷어냈으므로 이 글이 이 페이지의 유일한
        본문이다 — 상호작용 컴포넌트만 있고 서버 렌더 텍스트가 없는 페이지는 크롤러에게
        빈 껍데기다(/random이 여행지 37건을 받고도 본문 263자였던 그 사고).
        메뉴를 나열하는 대신 "이 화면을 어떻게 쓰는가"를 적는다. (docs/SEO.md §6-3)
      */}
      <section aria-labelledby="food-guide-heading">
        <h2
          id="food-guide-heading"
          className="font-display text-lg font-semibold tracking-tight"
        >
          오늘 뭐 먹지, 3초 만에 정하기
        </h2>
        <div className="text-muted mt-2 flex flex-col gap-3 text-sm leading-relaxed">
          <p>
            메뉴 고르다 시간을 다 쓰는 날이 있습니다. 투고트립 음식 뽑기는{' '}
            {/* 가운뎃점으로 이은 긴 나열은 표현식으로 감싼다 — JSX 텍스트로 두면
                포매터가 중간에서 줄을 바꾸며 그 자리에 공백을 하나 만든다. */}
            {'한식·중식·일식·양식·분식·패스트푸드·아시안·샐러드·디저트·음료'}를
            모아 두고 그중 하나를 무작위로 정해 줍니다. 회원가입도, 로그인도
            필요 없고 전부 무료입니다.
          </p>
          <p>
            뽑는 방법은 두 가지입니다.{' '}
            <strong className="text-ink">아무거나</strong>는 조건 없이 전체에서
            하나를 고릅니다. 정말 아무 생각이 없을 때 쓰세요.{' '}
            <strong className="text-ink">골라서</strong>는 종류와 컨디션을 걸고
            그 안에서만 뽑습니다.
          </p>
          <p>
            컨디션 태그는 {'날씨(추운 날·더운 날)'},{' '}
            {'몸 상태(피곤할 때·스트레스 받을 때·숙취 해소·몸이 아플 때)'},{' '}
            {'상황(술 한잔·가성비·다이어트 중·특별한 날)'} 세 무리로 나뉩니다.
            여러 개를 골라도{' '}
            <strong className="text-ink">하나라도 걸리면 후보</strong>가 되므로,
            고를수록 후보가 좁아지는 게 아니라 넓어집니다. 반대로 종류는 한 번에
            하나만 고릅니다. 어제 술을 마셨고 밖이 춥다면 숙취 해소와 추운 날을
            함께 눌러 두면 됩니다.
          </p>
          <p>
            메뉴가 정해지면 한 그릇 기준 열량·탄수화물·단백질·지방·나트륨이 함께
            나옵니다. 오른쪽의 백분율은 식품의약품안전처가 정한 1일 영양성분
            기준치{' '}
            {
              '(에너지 2,000kcal · 탄수화물 324g · 단백질 55g · 지방 54g · 나트륨 2,000mg)'
            }{' '}
            대비 비율입니다. 표기용 공통 기준이라 개인에게 필요한 양과는 다르고,
            값도 일반적인 1인분을 기준으로 한 참고치라 가게와 조리법에 따라
            달라집니다. 특히 국물 요리는 나트륨이 기준치를 넘는 경우가 흔한데,
            그 숫자를 깎지 않고 그대로 적어 둡니다.
          </p>
        </div>
      </section>

      <section aria-labelledby="food-next-heading">
        <h2
          id="food-next-heading"
          className="font-display text-lg font-semibold tracking-tight"
        >
          정하는 김에
        </h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {NEXT_STEPS.map((step, i) => (
            <li key={step.href}>
              <Link
                href={step.href}
                className="rounded-card border-line bg-surface shadow-soft animate-rise hover:shadow-lift flex h-full items-start gap-3 border p-5 transition duration-300 ease-out hover:-translate-y-[3px]"
                style={{ animationDelay: `${i * 70}ms` }}
              >
                <span className="shrink-0 text-2xl leading-none" aria-hidden>
                  {step.emoji}
                </span>
                <span className="min-w-0">
                  <span className="font-display block font-semibold tracking-tight">
                    {step.title}
                  </span>
                  <span className="text-muted mt-1 block text-sm leading-relaxed">
                    {step.description}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
