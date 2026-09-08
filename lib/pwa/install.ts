export type MobilePlatform = 'ios' | 'android' | 'other'

/** 배너를 닫은 기록. 닫은 사람에게 매번 다시 띄우지 않는다. */
export const INSTALL_DISMISSED_KEY = 'togo:install-dismissed'

/**
 * 홈 화면 추가 안내를 띄울 대상인지 판정한다.
 *
 * iPadOS는 사파리가 데스크톱 UA를 보내므로 'iPad' 문자열이 없다. 그래서 Macintosh인데
 * 터치가 되면 아이패드로 본다 — 터치 지원 여부는 UA에 없어 호출부가 넘겨 준다.
 *
 * 데스크톱은 'other'다. 크롬 데스크톱도 설치가 되지만 안내 문구("홈 화면에 추가")가
 * 맞지 않고, 요청도 모바일 기준이다.
 */
export function detectPlatform(
  userAgent: string,
  hasTouch = false,
): MobilePlatform {
  if (/android/i.test(userAgent)) return 'android'
  if (/iphone|ipad|ipod/i.test(userAgent)) return 'ios'
  if (hasTouch && /macintosh/i.test(userAgent)) return 'ios'
  return 'other'
}

/**
 * 이미 홈 화면에서 열었는지.
 *
 * 표준은 display-mode 미디어 쿼리인데, iOS 사파리는 오래도록 이걸 지원하지 않고
 * navigator.standalone이라는 자기만의 값을 쓴다. 둘 중 하나라도 참이면 설치된 것으로 본다.
 * 이걸 빼먹으면 이미 추가한 사람에게 "추가하세요" 배너가 계속 뜬다.
 */
export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false
  const byMediaQuery = window.matchMedia?.('(display-mode: standalone)').matches
  const byLegacy = (window.navigator as Navigator & { standalone?: boolean })
    .standalone
  return Boolean(byMediaQuery || byLegacy)
}
