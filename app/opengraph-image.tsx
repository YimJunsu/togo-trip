import { ImageResponse } from 'next/og'
import { loadKoreanFont } from '@/lib/seo/ogFont'
import { SITE_NAME, SITE_TAGLINE } from '@/lib/seo/site'

/**
 * 사이트 기본 공유 카드. 개별 og:image를 지정하지 않은 모든 화면이 이걸 쓴다.
 * (여행 성향 결과 화면은 유형별 일러스트를 따로 지정하므로 여기 해당 없음.)
 *
 * 디자인 토큰은 globals.css @theme와 같은 값을 손으로 맞춘다 —
 * satori는 CSS 변수를 못 읽는다.
 */
export const alt = `${SITE_NAME} — ${SITE_TAGLINE}`
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

const INK = '#101010'
const PAPER = '#f4f4ef'
const LIME = '#dcfb53'
const MUTED = '#6f6f68'

const FEATURES = '여행지 뽑기 · 여행방 · 엔빵 정산 · 성향 분석'
const KOREAN_TEXT = `${SITE_NAME}${SITE_TAGLINE}${FEATURES}`

export default async function OpengraphImage() {
  const font = await loadKoreanFont(KOREAN_TEXT)

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        background: PAPER,
        padding: 72,
        fontFamily: font ? 'Noto Sans KR' : 'sans-serif',
      }}
    >
      {/* 라임 한 덩어리가 브랜드의 유일한 강조색이다. (DESIGN_SYSTEM §1) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 999,
            background: LIME,
            display: 'flex',
          }}
        />
        <div
          style={{
            fontSize: 30,
            letterSpacing: 8,
            color: MUTED,
            display: 'flex',
          }}
        >
          TOGO TRIP
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div
          style={{
            fontSize: 116,
            fontWeight: 700,
            color: INK,
            letterSpacing: -4,
            lineHeight: 1,
            display: 'flex',
          }}
        >
          {/* 한글 폰트를 못 받았을 때만 로마자 표기로 떨어진다. */}
          {font ? SITE_NAME : 'Togo Trip'}
        </div>
        <div
          style={{
            fontSize: 46,
            color: INK,
            display: 'flex',
          }}
        >
          {font ? SITE_TAGLINE : 'Plan domestic trips with friends'}
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 32,
        }}
      >
        {font && (
          <div style={{ fontSize: 30, color: MUTED, display: 'flex' }}>
            {FEATURES}
          </div>
        )}
        <div
          style={{
            background: INK,
            color: PAPER,
            fontSize: 28,
            letterSpacing: 1,
            padding: '16px 30px',
            borderRadius: 999,
            display: 'flex',
          }}
        >
          togo-trip.com
        </div>
      </div>
    </div>,
    {
      ...size,
      ...(font && {
        fonts: [
          { name: 'Noto Sans KR', data: font, weight: 700, style: 'normal' },
        ],
      }),
    },
  )
}
