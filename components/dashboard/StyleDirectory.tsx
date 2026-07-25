import Link from 'next/link'
import type { TravelStyle } from '@/lib/data/types'

/**
 * 16유형 전체 목록.
 *
 * 두 가지를 동시에 푼다.
 * 1) /style 페이지의 본문. 원래 문항이 클라이언트 컴포넌트 안에만 있어서 크롤러에겐
 *    160자짜리 빈 페이지였다.
 * 2) 내부 링크. 결과 페이지 16개는 퀴즈를 풀어야만 도달할 수 있어서 크롤러가 걸어갈
 *    경로가 아예 없었다. 사이트맵에만 있고 링크가 없는 페이지는 색인 우선순위가 낮다.
 */
export function StyleDirectory({ styles }: { styles: TravelStyle[] }) {
  return (
    <section aria-labelledby="styles-heading">
      <h2
        id="styles-heading"
        className="font-display text-lg font-semibold tracking-tight"
      >
        {styles.length}가지 여행 성향
      </h2>
      <p className="text-muted mt-1 text-sm leading-relaxed">
        계획형인지 즉흥형인지, 아침형인지 밤형인지, 많이 도는 편인지 한 곳에 머무는
        편인지, 아끼는 편인지 쓰는 편인지. 네 가지 축이 엇갈려 {styles.length}가지가
        나옵니다. 문항을 풀지 않아도 유형 설명은 먼저 볼 수 있어요.
      </p>

      <ul className="mt-6 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {styles.map((style) => (
          <li key={style.code}>
            <Link
              href={`/style/${style.code}`}
              className="rounded-inner border-line bg-surface hover:shadow-soft flex h-full items-start gap-3 border p-4 transition duration-200 ease-out hover:-translate-y-[2px]"
            >
              <span className="shrink-0 text-2xl leading-none" aria-hidden>
                {style.emoji}
              </span>
              <span className="min-w-0">
                <span className="text-muted block font-mono text-xs tracking-widest">
                  {style.code}
                </span>
                <span className="mt-0.5 block text-sm font-medium">
                  {style.name}
                </span>
                <span className="text-muted mt-1 block text-sm leading-relaxed">
                  {style.tagline}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
