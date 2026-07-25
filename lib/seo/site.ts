/**
 * 사이트 정체성의 원본. 메타데이터·사이트맵·OG·구조화 데이터가 전부 여기를 본다.
 * 문구나 도메인을 바꿀 일이 생기면 이 파일만 고친다.
 */

/** 운영 도메인. 이 값이 최종 기준이고, 환경변수는 로컬·프리뷰용 예외일 뿐이다. */
const PRODUCTION_URL = 'https://togo-trip.com'

const LOCAL_HOST = /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:|$|\/)/

/**
 * 배포 도메인을 정한다.
 *
 * 로컬 .env에는 NEXT_PUBLIC_SITE_URL=http://localhost:3000 이 들어 있다. 그 값이
 * 실수로 운영 환경변수에 복사되면 canonical·og:image·sitemap이 전부 localhost를
 * 가리켜 공유 카드와 색인이 통째로 깨진다. 되돌리기도 어렵고(캐시) 눈에도 잘
 * 안 띄는 사고라, 운영 빌드에서는 로컬 주소를 아예 무시한다.
 */
function resolveSiteUrl() {
  const isProduction = process.env.VERCEL_ENV === 'production'
  const override = process.env.NEXT_PUBLIC_SITE_URL?.trim()

  if (override && !(isProduction && LOCAL_HOST.test(override))) {
    return override.replace(/\/$/, '')
  }
  // 프리뷰 배포는 매번 주소가 달라서 환경변수로 못 박는다. Vercel이 주는 값을 쓴다.
  if (!isProduction && process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`
  }
  return PRODUCTION_URL
}

export const SITE_URL = resolveSiteUrl()

/**
 * 검색엔진 소유확인 토큰.
 *
 * 페이지 소스에 meta 태그로 그대로 노출되는 공개 값이라 비밀이 아니다. 환경변수로
 * 두면 "Vercel에 넣는 걸 잊어서 소유확인이 풀리는" 사고만 생기므로 코드에 박는다.
 * 서치콘솔에서 속성을 다시 만들면 값이 바뀌니 그때 여기를 고친다.
 */
export const GOOGLE_SITE_VERIFICATION =
  'lE-YtKcqPEyI3etWcYDM-P37DOUZ79YM_FU6XzejO5Y'
export const NAVER_SITE_VERIFICATION =
  '1a1d3ad10a8151f7e9dbdf764e642ffdfb33a8cc'

export const SITE_NAME = '투고트립'
export const SITE_NAME_EN = 'Togo Trip'
export const SITE_TAGLINE = '친구들과 떠나는 국내여행'

/** 검색 결과 스니펫으로 그대로 노출되는 문장. 155자 안쪽으로 유지한다. */
export const SITE_DESCRIPTION =
  '어디 갈지 못 정했을 때 여행지를 뽑고, 초대코드로 친구를 모아 여행방을 만들고, 엔빵 정산까지 한 번에. 여행 성향 분석과 여행 궁합도 로그인 없이 바로 해볼 수 있습니다.'

/**
 * 검색엔진은 keywords를 거의 무시하지만, 생성형 검색(AI 답변)은 페이지의 주제어를
 * 요약 근거로 쓴다. 그래서 실제로 쓰는 표현만 남기고 어뷰징성 나열은 하지 않는다.
 */
export const SITE_KEYWORDS = [
  '국내여행',
  '여행지 추천',
  '랜덤 여행지',
  '여행 계획',
  '여행 정산',
  '엔빵 정산',
  '여행 성향 테스트',
  '여행 궁합',
  '친구 여행',
  '투고트립',
]

export const SITE_LOCALE = 'ko_KR'
export const TWITTER_CARD = 'summary_large_image' as const

/** 상대 경로를 절대 URL로. OG·JSON-LD·사이트맵은 절대 URL만 받는다. */
export function absoluteUrl(path = '/') {
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`
}
