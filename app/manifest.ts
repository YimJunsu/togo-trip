import type { MetadataRoute } from 'next'
import { SITE_DESCRIPTION, SITE_NAME, SITE_TAGLINE } from '@/lib/seo/site'

/**
 * PWA 설치 정보. Next가 이 파일을 /manifest.webmanifest로 내고 <link>까지 붙인다.
 *
 * 색은 app/globals.css @theme의 paper와 같은 값이다. @theme는 CSS 변수라 여기서
 * 읽을 수 없어 복사해 둔다 — app/layout.tsx의 themeColor, apple-icon과 같은 사정이다.
 * (DESIGN_SYSTEM §1)
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: `${SITE_NAME} — ${SITE_TAGLINE}`,
    short_name: SITE_NAME,
    description: SITE_DESCRIPTION,
    lang: 'ko',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#f1f1ef',
    theme_color: '#f1f1ef',
    categories: ['travel', 'lifestyle'],
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      /**
       * 안드로이드는 아이콘을 원형·물방울 등으로 잘라 낸다. maskable을 따로 주지 않으면
       * 런처가 정사각 아이콘 둘레에 흰 테두리를 덧대 브랜드가 아니라 스티커처럼 보인다.
       * 안전 영역은 가운데 80%뿐이라 그림도 그만큼 작게 앉혀 뒀다.
       */
      {
        src: '/icons/icon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
}
