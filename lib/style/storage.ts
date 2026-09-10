/**
 * 내가 받은 성향 코드를 브라우저에 남긴다.
 *
 * 성향 테스트는 비회원도 쓰는 콘텐츠라 채점이 전부 브라우저에서 끝나고 서버에
 * 남길 것이 없다. 결과 주소(`/style/PMAS`)가 곧 저장소이지만, 주소만으로는
 * **그 주소를 연 사람이 테스트를 한 사람인지** 알 수 없다 — 목록에서 눌러 들어온
 * 사람과 친구가 보낸 링크를 연 사람에게 «결과 공유하기»·«다시 해보기»를 내밀면
 * 하지도 않은 것을 다시 하라는 말이 된다. 그 구분을 여기 한 줄이 만든다.
 *
 * 쿼리 파라미터(`?from=quiz`)로 하지 않은 이유는 그것이 공유 주소에 그대로
 * 따라붙기 때문이다. 친구가 받은 링크에 붙어 있으면 판정이 뒤집힌다.
 */
const MY_STYLE_KEY = 'togo:my-style'

/**
 * 시크릿 모드·사이트 데이터 차단에서는 localStorage 접근 자체가 던진다.
 * 그때는 "테스트한 적 없음"으로 본다 — 화면이 하나 덜 보일 뿐 깨지지 않는다.
 */
export function saveMyStyleCode(code: string): void {
  try {
    localStorage.setItem(MY_STYLE_KEY, code)
  } catch {
    // 저장 못 해도 결과 화면은 그대로 나온다.
  }
}

export function readMyStyleCode(): string | null {
  try {
    return localStorage.getItem(MY_STYLE_KEY)
  } catch {
    return null
  }
}
