export type ShareResult = 'shared' | 'copied' | 'failed'

/**
 * 카카오톡·메시지로 바로 넘기는 건 브라우저의 공유 시트(Web Share)에 맡기고,
 * 그게 없는 데스크톱에서는 링크 복사로 떨어진다.
 *
 * 버튼 생김새는 여기서 정하지 않는다. 같은 공유 동작을 소프트 미니멀(대시보드)과
 * 보딩패스 두 갈래가 나눠 쓰는데, 컴포넌트를 공유하면 한쪽 색이 다른 갈래로 새기
 * 때문이다. 동작만 여기 두고 시각 언어는 각 폴더가 갖는다. (DESIGN_SYSTEM §4)
 */
export async function shareOrCopy({
  title,
  text,
  /** 상대 경로면 지금 origin 기준으로 푼다. 없으면 보고 있는 주소 그대로. */
  path,
  /**
   * 복사로 떨어졌을 때 text까지 함께 담을지. 기본은 주소만이다.
   *
   * Web Share 시트는 text와 url을 둘 다 넘겨받지만 클립보드는 문자열 하나뿐이라,
   * 문구가 공유의 핵심인 자리(음식 뽑기의 말투)에서는 주소만 복사하면 정작 하고 싶은
   * 말이 사라진다. 반대로 초대 링크처럼 주소가 전부인 자리는 문구가 붙으면 거추장스럽다.
   */
  copiesText = false,
}: {
  title: string
  text: string
  path?: string
  copiesText?: boolean
}): Promise<ShareResult> {
  const url = new URL(path ?? window.location.href, window.location.href).href

  if (navigator.share) {
    try {
      await navigator.share({ title, text, url })
      return 'shared'
    } catch {
      // 사용자가 공유 시트를 닫은 경우도 여기로 온다. 복사로 넘어간다.
    }
  }

  try {
    await navigator.clipboard.writeText(
      copiesText
        ? `${text}
${url}`
        : url,
    )
    return 'copied'
  } catch {
    return 'failed'
  }
}
