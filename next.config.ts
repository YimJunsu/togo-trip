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
   *
   * Vercel이 주는 togo-trip.vercel.app도 같은 이유로 몰아준다. 이 도메인은
   * 대시보드에서 지우거나 리다이렉트로 바꿀 수 없어서 여기서 처리한다.
   */
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'www.togo-trip.com' }],
        destination: 'https://togo-trip.com/:path*',
        permanent: true,
      },
      {
        source: '/:path*',
        // 운영 별칭 하나만 정확히 지목한다. *.vercel.app을 통째로 잡으면
        // 프리뷰 배포(togo-trip-git-<브랜치>-*.vercel.app)까지 운영으로 튕겨
        // 배포 전 확인이 불가능해진다. lib/seo/site.ts가 프리뷰를 자기 주소로
        // 두는 것과도 어긋난다.
        has: [{ type: 'host', value: 'togo-trip.vercel.app' }],
        destination: 'https://togo-trip.com/:path*',
        permanent: true,
      },
      /**
       * 여행 궁합(/compat)은 걷어냈다. 답과 무관하게 seed 고정값(78%, seed 계정
       * 두 명 이름)을 돌려주던 화면이라 실사용자에게는 남의 이름이 박힌 가짜
       * 결과였고, 흐름상 답하는 사람이 한 명뿐이라 비교할 상대 자체가 없었다.
       * 사이트맵에 올라가 색인된 주소라 404 대신 성향 분석으로 영구 이동시킨다 —
       * «같이 갈 사람과 맞는지»의 답은 성향 결과의 «잘 맞는 유형»이 대신한다.
       */
      {
        source: '/compat/:path*',
        destination: '/style',
        permanent: true,
      },
    ]
  },
}

export default nextConfig
