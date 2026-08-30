import type { MetadataRoute } from 'next'
import { SITE_URL, absoluteUrl } from '@/lib/seo/site'

/**
 * 로그인이 필요한 화면과 개인 데이터가 뜨는 화면은 크롤러가 아예 들어오지 않게 한다.
 * (로그인 리다이렉트만 계속 긁어 크롤링 예산이 낭비되는 걸 막는 목적도 있다.)
 */
const PRIVATE_PATHS = ['/trips/', '/join', '/compat/result', '/admin', '/api/']

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: PRIVATE_PATHS,
      },
      /**
       * 생성형 검색 크롤러를 명시적으로 허용한다.
       * 기본 규칙으로도 통과하지만, 이름을 적어 둬야 나중에 정책을 바꿀 때
       * "어떤 AI에게 열어 뒀는가"가 이 파일 하나로 드러난다.
       */
      {
        userAgent: [
          'GPTBot',
          'OAI-SearchBot',
          'ChatGPT-User',
          'ClaudeBot',
          'Claude-User',
          'PerplexityBot',
          'Google-Extended',
        ],
        allow: '/',
        disallow: PRIVATE_PATHS,
      },
    ],
    sitemap: absoluteUrl('/sitemap.xml'),
    host: SITE_URL,
  }
}
