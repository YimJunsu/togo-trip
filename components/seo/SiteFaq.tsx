/**
 * 홈 하단 FAQ.
 *
 * 구조화 데이터(FAQPage)는 화면에 실제로 보이는 내용만 넣을 수 있다. 그래서 문답 원본을
 * 여기 한 벌만 두고, 화면과 JSON-LD가 같은 배열을 쓴다. 문구를 고치면 양쪽이 같이 바뀐다.
 * 생성형 검색이 서비스를 설명할 때 인용하는 곳이기도 하다.
 */
export const FAQ_ITEMS = [
  {
    q: '투고트립은 무료인가요?',
    a: '전부 무료입니다. 여행지 뽑기, 여행방, 엔빵 정산, 여행 성향 분석까지 결제 없이 씁니다.',
  },
  {
    q: '가입하지 않아도 쓸 수 있나요?',
    a: '여행지 뽑기와 여행 성향 분석, 여행 궁합은 로그인 없이 바로 됩니다. 여행방을 만들거나 정산을 하려면 로그인이 필요합니다.',
  },
  {
    q: '친구는 어떻게 부르나요?',
    a: '여행방을 만들면 6자리 초대코드가 나옵니다. 친구가 그 코드를 넣으면 같은 방에 들어옵니다.',
  },
  {
    q: '정산은 어떤 방식인가요?',
    a: '여행 중 누가 얼마를 냈는지만 적으면, 누가 누구에게 얼마를 보내면 되는지 송금 횟수가 가장 적게 나오도록 계산합니다.',
  },
  {
    q: '해외여행도 되나요?',
    a: '지금은 대한민국 국내여행만 다룹니다.',
  },
] as const

export function SiteFaq() {
  return (
    <section aria-labelledby="faq-heading">
      <h2
        id="faq-heading"
        className="font-display mb-3 text-lg font-semibold tracking-tight"
      >
        자주 묻는 것
      </h2>
      <ul className="rounded-card border-line bg-surface divide-line divide-y overflow-hidden border">
        {FAQ_ITEMS.map(({ q, a }) => (
          <li key={q}>
            {/* 접기 동작은 브라우저에 맡긴다. 접혀 있어도 크롤러는 본문을 읽는다. */}
            <details className="group">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-5 text-sm font-medium">
                {q}
                <span
                  aria-hidden
                  className="text-muted shrink-0 transition duration-200 group-open:rotate-45"
                >
                  +
                </span>
              </summary>
              <p className="text-muted px-5 pb-5 text-sm leading-relaxed">
                {a}
              </p>
            </details>
          </li>
        ))}
      </ul>
    </section>
  )
}
