import Link from 'next/link'
import { SITE_NAME_EN } from '@/lib/seo/site'

/**
 * 모든 화면 아래에 붙는 푸터.
 *
 * 약관·방침으로 가는 통로는 법적으로도 "찾기 쉬운 곳"에 있어야 하고, 검색엔진에도
 * 전 페이지에서 걸리는 내부 링크가 된다. 링크는 가운데 한 줄로만 둔다 — 항목이
 * 셋뿐이라 열을 나누면 오히려 비어 보인다.
 */
const LINKS = [
  // 방침을 맨 앞에 두고 강조한다. 셋 중 법적으로 가장 중요하고 자주 찾는 문서다.
  { href: '/privacy', label: '개인정보처리방침', emphasized: true },
  { href: '/about', label: '서비스 소개' },
  { href: '/terms', label: '이용약관' },
] as const

export function SiteFooter() {
  return (
    <footer className="border-line mt-auto border-t">
      <div className="mx-auto w-full max-w-2xl px-4 py-10">
        <nav aria-label="약관 및 정책">
          <ul className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
            {LINKS.map(({ href, label, ...rest }) => (
              <li key={href}>
                <Link
                  href={href}
                  className={
                    'emphasized' in rest && rest.emphasized
                      ? 'text-ink hover:text-ink text-sm font-semibold transition duration-200'
                      : 'text-muted hover:text-ink text-sm transition duration-200'
                  }
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <p className="text-muted mt-6 text-center font-mono text-xs tracking-widest">
          © {new Date().getFullYear()} {SITE_NAME_EN}. ALL RIGHTS RESERVED.
        </p>
        <p className="text-muted mt-2 text-center text-xs leading-relaxed">
          국내여행 계획·정산 서비스. 여행 성향 분석과 궁합 결과는 재미를 위한
          것이며 전문적인 진단이 아닙니다.
        </p>
      </div>
    </footer>
  )
}
