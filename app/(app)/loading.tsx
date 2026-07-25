import { SkeletonList } from '@/components/dashboard/Skeleton'

/**
 * 로딩 스켈레톤만 담당하는 것처럼 보이지만 **상태 코드에도 영향을 준다.**
 *
 * Suspense 경계가 생기면서 셸이 200으로 먼저 나가고, 그 뒤에 본문이 notFound()를
 * 던진다. 그래서 앱 안의 없는 주소(예: /style/ZZZZ)는 커스텀 404 화면이 뜨긴 해도
 * HTTP 상태는 200이다(soft 404). 이 파일을 지우면 404가 정상적으로 나간다 —
 * 실제로 지워 보고 확인했다.
 *
 * 그럼에도 남겨 둔 이유:
 * - 없는 코드는 generateMetadata가 robots를 noindex로 주고 /trips/**도 noindex라
 *   색인 피해는 이미 막혀 있다. 남는 손해는 크롤링 예산뿐인데, 그 URL들은 어디에서도
 *   링크되지 않아 크롤러가 찾아올 일 자체가 드물다.
 * - 지금은 mock이라 즉시 렌더되지만 Supabase로 넘어가면 스켈레톤이 실제로 필요해진다.
 *
 * 서치콘솔에 soft 404 경고가 쌓이기 시작하면 그때 다시 판단한다.
 */
export default function AppLoading() {
  return <SkeletonList />
}
