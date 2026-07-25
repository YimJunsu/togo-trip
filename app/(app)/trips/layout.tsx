import type { Metadata } from 'next'

/**
 * /trips 하위는 전부 개인 여행 데이터다. 크롤러에겐 로그인 리다이렉트만 보이므로
 * 색인에서 뺀다. (robots.ts에서도 같은 경로를 막아 두었다.)
 * 개별 페이지가 metadata를 따로 내보내지 않는 한 이 설정이 그대로 상속된다.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default function TripsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
