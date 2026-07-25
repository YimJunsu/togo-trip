/**
 * OG 이미지용 한글 폰트 로더.
 *
 * next/og(satori)는 시스템 폰트를 못 쓰기 때문에 폰트 바이너리를 직접 넘겨야 하고,
 * 안 넘기면 한글이 전부 두부(□)로 나온다. 구글 폰트의 text= 서브셋 API를 쓰면
 * 실제로 그릴 글자만 담긴 수 KB짜리 ttf가 와서 이미지 생성이 가볍다.
 *
 * OG 이미지 라우트는 빌드 시 정적으로 만들어지므로 이 fetch는 배포 때 한 번만 돈다.
 */
const GOOGLE_FONTS_CSS = 'https://fonts.googleapis.com/css2'

export async function loadKoreanFont(
  text: string,
  weight: 400 | 700 = 700,
): Promise<ArrayBuffer | null> {
  try {
    const url = `${GOOGLE_FONTS_CSS}?family=Noto+Sans+KR:wght@${weight}&text=${encodeURIComponent(text)}`
    // User-Agent를 비워 두면 woff2 대신 satori가 읽을 수 있는 truetype을 준다.
    const css = await fetch(url).then((res) => res.text())

    const src = css.match(/src: url\(([^)]+)\) format\('truetype'\)/)?.[1]
    if (!src) return null

    return await fetch(src).then((res) => res.arrayBuffer())
  } catch {
    // 빌드 환경에 네트워크가 없을 수 있다. 이미지를 못 만드는 것보다
    // 한글 줄만 빠진 이미지가 낫다 — 호출부에서 null을 보고 분기한다.
    return null
  }
}
