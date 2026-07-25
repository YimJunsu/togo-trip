import type { NextConfig } from 'next'

/**
 * 보안 헤더. 검색 순위에 직접 영향은 없지만 서치콘솔의 HTTPS·사용성 항목과
 * 브라우저 경고를 깨끗하게 유지한다. CSP는 Tailwind 인라인 스타일·JSON-LD와
 * 충돌 여지가 있어 지금은 넣지 않는다.
 */
const securityHeaders = [
  // HTTPS로만 접속하게 고정한다. 도메인이 확정된 뒤에만 켤 수 있는 헤더다.
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  // 외부로 나갈 때 경로는 빼고 도메인만 넘긴다. 초대코드가 리퍼러로 새는 걸 막는다.
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), payment=()',
  },
]

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }]
  },

  /**
   * www와 apex가 둘 다 200으로 열리면 검색엔진에는 같은 내용의 사이트가 두 개로
   * 보인다. canonical로도 대개 정리되지만, 아예 한쪽으로 몰아주는 편이 확실하다.
   * apex(togo-trip.com)를 정식 주소로 삼는다.
   */
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'www.togo-trip.com' }],
        destination: 'https://togo-trip.com/:path*',
        permanent: true,
      },
    ]
  },
}

export default nextConfig
