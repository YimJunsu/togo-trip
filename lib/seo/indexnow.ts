import { absoluteUrl, SITE_URL } from '@/lib/seo/site'

/**
 * IndexNow 키. 공개 값이다 — 프로토콜이 키 파일을 사이트 루트에 두고 대조하는 방식이라
 * 숨길 수가 없다. 그래서 환경변수가 아니라 코드에 둔다. 시크릿으로 오해해 .env로 옮기면
 * public/의 키 파일과 어긋나 핑이 조용히 거부된다.
 *
 * 값을 바꾸려면 public/<키>.txt 파일명과 내용도 함께 바꾼다. 둘은 반드시 같아야 한다.
 */
export const INDEXNOW_KEY = 'a7f3c91d84b2456e9d0f5c8b3a1e7642'

const ENDPOINT = 'https://api.indexnow.org/indexnow'
/** 프로토콜 상한. 한 번에 이보다 많이 보내면 요청 전체가 거부된다. */
const MAX_URLS = 10_000

/**
 * 새로 만들었거나 내용이 바뀐 URL을 검색엔진에 알린다.
 *
 * Bing·네이버·Yandex 계열이 IndexNow를 직접 소비한다. 구글은 지원하지 않으므로
 * 구글 쪽은 사이트맵 lastmod 정확성으로 간다 — 이 함수가 구글까지 커버한다고 착각하면 안 된다.
 *
 * 지역 페이지는 cron이 매일 10개씩 갱신하는데, 사이트맵만으로는 크롤러가 다시 올 때까지
 * 며칠이 걸린다. 갱신 직후 핑하면 그 시차가 사라진다.
 *
 * 실패해도 던지지 않는다. 색인 힌트는 부가 기능이고, 이것 때문에 적재 cron이 실패로
 * 기록되면 진짜 실패를 못 알아본다.
 */
export async function pingIndexNow(paths: string[]): Promise<number> {
  if (paths.length === 0) return 0

  // 로컬·프리뷰에서 운영 도메인의 색인을 건드리지 않는다.
  const host = new URL(SITE_URL).host
  if (host.includes('localhost') || host.includes('127.0.0.1')) return 0

  const urlList = paths.slice(0, MAX_URLS).map((path) => absoluteUrl(path))

  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({
        host,
        key: INDEXNOW_KEY,
        keyLocation: absoluteUrl(`/${INDEXNOW_KEY}.txt`),
        urlList,
      }),
    })

    if (!res.ok) {
      // 본문은 남기지 않는다. 상태 코드만으로 원인이 갈린다 —
      // 403은 키 파일 불일치, 422는 host와 urlList 도메인 불일치다.
      console.error(`IndexNow 핑 실패 ${res.status} (${urlList.length}건)`)
      return 0
    }
    return urlList.length
  } catch (error) {
    console.error(
      'IndexNow 핑 실패:',
      error instanceof Error ? error.message : String(error),
    )
    return 0
  }
}
