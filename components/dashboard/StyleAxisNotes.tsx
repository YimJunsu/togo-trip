import type { TravelStyle } from '@/lib/data/types'
import { AXIS_META, AXIS_ORDER } from '@/lib/style/score'

/**
 * 코드 네 글자를 문장으로 푼다. 결과 화면에서 «성향 네 가지»(StyleAxisGrid)가
 * 어느 쪽에 섰는지를 라벨 하나로 보여 준다면, 여기는 그쪽에 선 사람이 여행에서
 * 실제로 어떻게 움직이는지를 적는다.
 *
 * 이 블록이 생긴 이유는 검색이다. 결과 페이지 16개는 seed 설명·강점·주의만으로
 * 본문이 661자에 그쳐 800자 기준에 못 미쳤다. 유형마다 글을 따로 쓰는 대신
 * 축의 양쪽 설명 8개(AXIS_META의 note)를 코드에 따라 4개씩 골라 잇는다 —
 * 16유형이 서로 다른 조합을 갖고, 채점 기준이 바뀌면 여기도 같이 바뀐다.
 */
export function StyleAxisNotes({ style }: { style: TravelStyle }) {
  return (
    <section aria-labelledby="axis-notes-heading">
      <h2
        id="axis-notes-heading"
        className="font-display mb-3 text-lg font-semibold tracking-tight"
      >
        {style.code}, 글자 하나씩 풀어 보면
      </h2>
      <div className="rounded-card border-line bg-surface border p-5">
        <p className="text-muted text-sm leading-relaxed">
          글자 하나가 축 하나입니다. 같이 가는 사람과 부딪히는 자리는 대개
          여행지가 아니라 아래 네 가지라서, 상대의 코드와 어느 글자가 다른지만
          보면 어디서 맞춰야 하는지가 보입니다.
        </p>
        <dl className="divide-line mt-4 divide-y">
          {AXIS_ORDER.map((axis, i) => {
            const meta = AXIS_META[axis]
            const side =
              style.code[i] === meta.high.letter ? meta.high : meta.low
            const other = side === meta.high ? meta.low : meta.high
            return (
              <div
                key={axis}
                className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0"
              >
                <dt className="flex items-baseline gap-2">
                  <span className="text-muted font-mono text-[0.65rem] tracking-widest">
                    {side.letter}
                  </span>
                  <span className="text-sm font-semibold">
                    {meta.label} · {side.label}
                  </span>
                  <span className="text-muted text-xs">
                    반대편은 {other.label}
                  </span>
                </dt>
                <dd className="text-muted text-sm leading-relaxed">
                  {side.note}
                </dd>
              </div>
            )
          })}
        </dl>
      </div>
    </section>
  )
}
