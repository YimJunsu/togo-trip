import Script from 'next/script'
import { GA_MEASUREMENT_ID } from '@/lib/seo/site'

/**
 * Google Analytics(GA4) 태그. 화면에 아무것도 그리지 않는다.
 *
 * 운영 빌드에서만 붙인다. 개발 서버의 새로고침이 전부 방문으로 잡히면 통계가
 * 오염되고, 그걸 걸러내려면 GA 쪽 필터를 따로 관리해야 한다.
 *
 * afterInteractive는 하이드레이션 뒤에 받는다는 뜻이다. 태그가 첫 화면 그리기와
 * 대역폭을 다투지 않게 하려는 것이고, 페이지뷰는 그 뒤에 보내도 늦지 않다.
 * GA4는 History API 변화를 스스로 감지하므로(향상된 측정) App Router의
 * 클라이언트 전환도 별도 코드 없이 페이지뷰로 잡힌다.
 *
 * 수집 사실은 개인정보처리방침(lib/legal/policy.ts)에 적혀 있다. 이 컴포넌트를
 * 떼거나 다른 도구로 바꾸면 방침도 같이 고친다.
 */
export function GoogleAnalytics() {
  if (process.env.NODE_ENV !== 'production') return null

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        strategy="afterInteractive"
      />
      <Script id="gtag-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_MEASUREMENT_ID}');
        `}
      </Script>
    </>
  )
}
