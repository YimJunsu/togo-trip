import { ImageResponse } from 'next/og'

/**
 * iOS 홈 화면·공유 시트에 뜨는 아이콘. favicon.ico는 16~32px라 여기서 쓰면 뭉갠다.
 * 색은 globals.css @theme의 accent/ink와 같은 값이다.
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
        background: '#dcfb53',
        color: '#101010',
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
