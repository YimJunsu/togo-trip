import {
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_NAME_EN,
  SITE_URL,
  absoluteUrl,
} from './site'

/**
 * 구조화 데이터(JSON-LD) 출력.
 *
 * 검색엔진은 리치 결과를 만들 때, 생성형 검색(AI 답변)은 "이 사이트가 뭘 하는 곳인가"를
 * 판단할 때 이걸 먼저 읽는다. 본문에 실제로 있는 내용만 넣는다 — 화면에 없는 걸 적으면
 * 구조화 데이터 스팸으로 취급돼 리치 결과에서 통째로 빠진다.
 */
export function JsonLd({ data }: { data: object | object[] }) {
  return (
    <script
      type="application/ld+json"
      // 값은 전부 우리가 만든 상수·목 데이터라 사용자 입력이 섞이지 않는다.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  )
}

const ORGANIZATION_ID = `${SITE_URL}/#organization`
const WEBSITE_ID = `${SITE_URL}/#website`

/** 사이트 전역 그래프. 루트 레이아웃에서 한 번만 심는다. */
export const siteGraph = [
  {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': ORGANIZATION_ID,
    name: SITE_NAME,
    alternateName: SITE_NAME_EN,
    url: SITE_URL,
    logo: {
      '@type': 'ImageObject',
      url: absoluteUrl('/images/mascot.webp'),
      width: 256,
      height: 256,
    },
  },
  {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': WEBSITE_ID,
    name: SITE_NAME,
    alternateName: SITE_NAME_EN,
    url: SITE_URL,
    description: SITE_DESCRIPTION,
    inLanguage: 'ko-KR',
    publisher: { '@id': ORGANIZATION_ID },
  },
  {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: SITE_NAME,
    url: SITE_URL,
    applicationCategory: 'TravelApplication',
    operatingSystem: 'Web',
    inLanguage: 'ko-KR',
    description: SITE_DESCRIPTION,
    publisher: { '@id': ORGANIZATION_ID },
    // 무료 서비스임을 명시해야 AI 답변이 "유료인지"를 지어내지 않는다.
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      '랜덤 여행지 뽑기',
      '초대코드 여행방',
      '엔빵 정산',
      '여행 성향 분석 16유형',
      '여행 궁합 테스트',
    ],
  },
]

/** 홈에 실제로 렌더링되는 FAQ와 1:1로 맞춘다. 문구가 바뀌면 양쪽을 같이 고친다. */
export function faqGraph(items: { q: string; a: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map(({ q, a }) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: { '@type': 'Answer', text: a },
    })),
  }
}

/** 계층이 있는 화면에서 검색 결과에 경로를 보여 준다. */
export function breadcrumbGraph(trail: { name: string; path: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: trail.map(({ name, path }, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name,
      item: absoluteUrl(path),
    })),
  }
}
