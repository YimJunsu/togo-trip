import type { Metadata, Viewport } from 'next'
import { Outfit, Space_Mono } from 'next/font/google'
import { JsonLd, siteGraph } from '@/lib/seo/JsonLd'
import {
  GOOGLE_SITE_VERIFICATION,
  NAVER_SITE_VERIFICATION,
  SITE_DESCRIPTION,
  SITE_KEYWORDS,
  SITE_LOCALE,
  SITE_NAME,
  SITE_NAME_EN,
  SITE_TAGLINE,
  SITE_URL,
  TWITTER_CARD,
} from '@/lib/seo/site'
import './globals.css'

const outfit = Outfit({
  variable: '--font-outfit',
  subsets: ['latin'],
  weight: ['500', '600', '700'],
})

const spaceMono = Space_Mono({
  variable: '--font-space-mono',
  subsets: ['latin'],
  weight: ['400', '700'],
})

export const metadata: Metadata = {
  // 공유 링크의 og:image가 절대 URL이어야 카카오톡·메시지에서 카드가 뜬다.
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — ${SITE_TAGLINE}`,
    // 하위 페이지는 title만 주면 뒤에 브랜드가 자동으로 붙는다.
    template: `%s · ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  keywords: SITE_KEYWORDS,
  applicationName: SITE_NAME,
  category: 'travel',
  alternates: { canonical: '/' },
  // 날짜·금액이 전화번호로 오인돼 자동 링크가 걸리는 걸 막는다.
  formatDetection: { telephone: false, address: false, email: false },
  openGraph: {
    type: 'website',
    locale: SITE_LOCALE,
    url: SITE_URL,
    siteName: SITE_NAME,
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: TWITTER_CARD,
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      // 큰 썸네일·긴 스니펫을 허용해야 AI 요약이 본문을 충분히 인용한다.
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
  // 소유확인 토큰. 공개 값이라 lib/seo/site.ts에 상수로 둔다.
  verification: {
    google: GOOGLE_SITE_VERIFICATION,
    other: { 'naver-site-verification': NAVER_SITE_VERIFICATION },
  },
  other: {
    // 서비스 범위가 한국 국내여행이라는 걸 크롤러에 명시한다.
    'geo.region': 'KR',
    'geo.placename': 'South Korea',
  },
}

export const viewport: Viewport = {
  themeColor: '#f4f4ef',
  colorScheme: 'light',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="ko"
      className={`${outfit.variable} ${spaceMono.variable} h-full antialiased`}
    >
      <head>
        {/*
          본문 폰트(Pretendard). globals.css의 @import에서 여기로 옮겼다 —
          CSS 안에 두면 우리 CSS를 다 받은 뒤에야 존재를 알게 되는 직렬 체인이 되고,
          그동안 첫 글자가 그려지지 않는다. HTML에 두면 파싱 즉시 병렬로 받는다.
          폰트 파일 자체는 Pretendard CSS가 font-display: swap을 쓰므로 렌더를 막지 않는다.
        */}
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
        <JsonLd data={siteGraph} />
      </head>
      <body className="flex min-h-full flex-col">
        {/* 크롤러가 로고 텍스트 대신 정식 명칭을 집도록 화면 밖에 한 번 더 둔다. */}
        <span className="sr-only">
          {SITE_NAME} ({SITE_NAME_EN})
        </span>
        {children}
      </body>
    </html>
  )
}
