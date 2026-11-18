import type { NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

/**
 * Supabase Auth 세션 갱신만 한다. mock 단계에서는 updateSession이 그냥 통과시킨다.
 * (Next.js 16에서 middleware 파일 규약이 proxy로 바뀌었다.)
 */
export async function proxy(request: NextRequest) {
  return updateSession(request)
}

export const config = {
  // 정적 자산·이미지 최적화 경로는 제외한다. 세션과 무관한 텍스트 파일(robots.txt·
  // sitemap.xml·llms.txt·매니페스트·서비스 워커)도 뺀다 — 이 요청들까지 proxy를 거치면
  // CDN 캐시에 맞아도 매번 함수가 한 번 더 돈다.
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml|webmanifest|js|woff2?)$).*)',
  ],
}
