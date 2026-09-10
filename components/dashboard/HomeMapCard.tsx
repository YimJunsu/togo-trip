import { KoreaMapLayer } from '@/components/dashboard/KoreaMapLayer'
import { koreaMap } from '@/lib/geo/koreaMap'

/**
 * 홈의 주인공. 대한민국 지도를 통째로 세우고 시군구 250곳을 각자의 지역 페이지로 건다.
 *
 * 홈이 메뉴 목록처럼 읽히던 것이 이 화면의 문제였다. 여행 서비스인데 화면에
 * "여행"이 하나도 없고 글자만 쌓여 있었다. 지도는 그 자체로 어디를 갈지 고르는
 * 도구이고, 지형색(§6)이 유일하게 화면에 색을 들이는 자리이기도 하다.
 *
 * 데이터는 lib/geo의 로컬 JSON뿐이다. 여기서 적재 지역 목록을 DB로 조회하면
 * 홈이 매 요청 서버 함수로 떨어진다 — 홈을 정적으로 유지하려고 개인 데이터를
 * 전부 클라이언트로 몰아낸 것이 무의미해진다.
 *
 * 부수효과로 홈이 지역 페이지 250개의 인바운드 링크가 된다. 사이트맵에만 있고
 * 걸어 들어오는 링크가 없는 URL은 색인 우선순위가 바닥이다 (docs/SEO.md §6-4).
 */
export function HomeMapCard() {
  // 지도 데이터의 height에는 다트가 대기하는 바다(dock)가 붙어 있다. 여기서는
  // 던지지 않으므로 그만큼 잘라 낸다 — 안 자르면 카드 아래가 빈 바다로 남는다.
  const height = koreaMap.height - koreaMap.dock

  return (
    <section className="rounded-card border-line bg-surface shadow-soft overflow-hidden border">
      <header className="px-5 pt-5 pb-4">
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          어디로 갈까
        </h1>
        <p className="text-muted mt-1 text-sm leading-relaxed">
          지도에서 지역을 누르면 그곳의 관광지와 맛집이 나옵니다. 전국 250개
          시군구가 모두 열려 있어요.
        </p>
      </header>

      <svg
        viewBox={`0 0 ${koreaMap.width} ${height}`}
        className="block w-full"
        role="group"
        aria-label="대한민국 시군구 지도. 지역을 누르면 그 지역의 가볼만한 곳으로 갑니다."
      >
        <KoreaMapLayer linkRegions />
      </svg>
    </section>
  )
}
