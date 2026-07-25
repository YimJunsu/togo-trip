import { AXIS_META, AXIS_ORDER } from '@/lib/style/score'

/**
 * 테스트가 무엇을 재는지 미리 알려 준다. (결과 화면의 StyleAxisGrid와 다른 역할이다 —
 * 저쪽은 "당신이 어느 쪽이었나"를 보여 주고, 여기는 "무엇을 묻나"를 보여 준다.)
 *
 * 축과 라벨은 전부 AXIS_META에서 온다. 여기에 문자열을 다시 적으면 채점 기준이
 * 바뀔 때 화면만 옛말을 하게 된다.
 */
export function StyleAxisIntro() {
  return (
    <section aria-labelledby="axis-heading">
      <h2
        id="axis-heading"
        className="font-display text-lg font-semibold tracking-tight"
      >
        무엇을 보나요
      </h2>
      <p className="text-muted mt-1 text-sm leading-relaxed">
        네 가지를 봅니다. 각 축에서 어느 쪽에 섰는지가 글자 하나가 되고, 그 넷을
        이으면 결과 코드가 됩니다.
      </p>
      <p className="text-muted mt-2 text-sm leading-relaxed">
        같이 가는 사람과 부딪히는 지점은 대개 여행지 취향이 아니라 이 네 가지입니다.
        몇 시에 나갈지, 하루에 몇 군데를 돌지, 어디에 돈을 쓸지, 계획을 어디까지
        세워 둘지. 그래서 이 넷만 봅니다.
      </p>

      <ul className="rounded-card border-line bg-surface divide-line mt-4 divide-y border">
        {AXIS_ORDER.map((axis) => {
          const { label, low, high } = AXIS_META[axis]

          return (
            <li
              key={axis}
              className="flex items-center justify-between gap-3 p-4"
            >
              <span className="text-muted shrink-0 font-mono text-xs tracking-widest">
                {label}
              </span>
              <span className="flex items-center gap-1.5 text-sm font-medium">
                <Side letter={low.letter} label={low.label} />
                <span className="text-muted" aria-hidden>
                  ↔
                </span>
                <Side letter={high.letter} label={high.label} />
              </span>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

function Side({ letter, label }: { letter: string; label: string }) {
  return (
    <span className="flex items-baseline gap-1">
      {label}
      <span className="text-muted font-mono text-[0.65rem] tracking-widest">
        {letter}
      </span>
    </span>
  )
}
