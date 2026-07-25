import Image from 'next/image'
import Link from 'next/link'
import type { TravelStyle } from '@/lib/data/types'

/** 지연이 무한정 길어지지 않게. 16장이라 끝 카드가 1초 뒤에 뜨면 고장처럼 보인다. */
const MAX_STAGGER_STEPS = 7

/**
 * 나올 수 있는 유형 전체를 이미지 카드로 펼친다.
 *
 * 두 가지를 동시에 푼다.
 * 1) /style 랜딩의 본문. 테스트를 시작하기 전에 "뭐가 나오는지"를 보여 준다.
 * 2) 내부 링크. 결과 페이지 16개는 퀴즈를 끝까지 풀어야만 닿을 수 있어서 크롤러가
 *    걸어갈 경로가 아예 없었다. 사이트맵에만 있고 링크가 없는 페이지는 색인
 *    우선순위가 낮다.
 *
 * 2열인 이유: 3열 이상으로 좁히면 tagline이 안 들어간다. 유형 16개의 tagline은
 * 이 페이지 본문의 3분의 1이라 모양보다 우선한다.
 */
export function StyleDirectory({ styles }: { styles: TravelStyle[] }) {
  return (
    <section aria-labelledby="styles-heading">
      <h2
        id="styles-heading"
        className="font-display text-lg font-semibold tracking-tight"
      >
        나올 수 있는 {styles.length}가지
      </h2>
      <p className="text-muted mt-1 text-sm leading-relaxed">
        네 축이 엇갈려 {styles.length}가지가 됩니다. 눌러 보면 유형별 설명을 미리
        읽을 수 있어요.
      </p>

      {/* 이름·한 줄 소개 길이가 제각각이라 높이를 맞춰 둔다. 안 그러면 아래가 들쭉날쭉해진다. */}
      <ul className="mt-6 grid grid-cols-2 items-stretch gap-3">
        {styles.map((style, i) => (
          <li
            key={style.code}
            style={{
              animationDelay: `${Math.min(i, MAX_STAGGER_STEPS) * 70}ms`,
            }}
            className="animate-rise flex"
          >
            <Link
              href={`/style/${style.code}`}
              className="rounded-inner border-line bg-surface hover:shadow-soft flex w-full flex-col overflow-hidden border transition duration-300 ease-out hover:-translate-y-[3px]"
            >
              <span className="bg-paper relative block aspect-square">
                <Image
                  src={`/images/style/${style.code}.webp`}
                  alt={`${style.name} 여행 유형을 표현한 쿼카 일러스트`}
                  fill
                  sizes="(max-width: 640px) 45vw, 320px"
                  className="object-cover"
                />
              </span>
              <span className="flex flex-1 flex-col p-3">
                <span className="text-muted block font-mono text-[0.65rem] tracking-widest">
                  {style.code}
                </span>
                <span className="mt-0.5 block text-sm leading-snug font-semibold text-balance">
                  {style.name}
                </span>
                <span className="text-muted mt-1 block text-xs leading-relaxed">
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
