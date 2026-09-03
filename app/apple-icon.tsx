import { ImageResponse } from 'next/og'

/**
 * iOS 홈 화면·공유 시트에 뜨는 아이콘. favicon.ico는 16~32px라 여기서 쓰면 뭉갠다.
 * 색은 globals.css @theme의 accent/paper와 같은 값이다. 토큰이 바뀌면 여기도 바꾼다 —
 * @theme는 CSS 변수라 ImageResponse가 읽지 못해 값을 복사해 둘 수밖에 없다.
 */
export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#2f6b4f',
        color: '#f1f1ef',
        fontSize: 104,
        fontWeight: 700,
        letterSpacing: -4,
      }}
    >
      T
    </div>,
    size,
  )
}
