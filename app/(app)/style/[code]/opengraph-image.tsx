import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { ImageResponse } from 'next/og'
import { travelStyleRepo } from '@/lib/data'
import { loadKoreanFont } from '@/lib/seo/ogFont'
import { SITE_NAME } from '@/lib/seo/site'

/**
 * 성향 결과 공유 카드 1200×630. 카카오톡·X에 결과 링크를 붙였을 때 뜨는 카드다.
 *
 * 예전에는 유형 일러스트(768×768 정사각형)를 그대로 og:image로 줬다. 큰 카드
 * (summary_large_image)는 1.91:1이라 정사각형이 위아래로 잘려 얼굴만 남거나,
 * 카카오톡에서는 작은 썸네일로 떨어져 무슨 결과인지 글자가 하나도 안 보였다.
 * 이제 그림 옆에 유형 이름을 함께 박는다 — 링크만 보고도 «나는 ○○ 여행이다»가 읽혀야
 * 누르고 싶어진다.
 *
 * 극장 배치 갈래(DESIGN_SYSTEM §3)의 색을 쓴다. satori는 CSS 변수를 못 읽으므로
 * globals.css의 cine-* 값을 손으로 맞춘다 — 토큰이 바뀌면 같이 바꾼다.
 */
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const alt = '투고트립 여행 성향 결과'

const CINE_BASE = '#101410'
const CINE_INK = '#eceae4'
const CINE_ACCENT = '#d9a45b'

export async function generateStaticParams() {
  const styles = await travelStyleRepo.list()
  return styles.map((style) => ({ code: style.code }))
}

/**
 * satori는 webp를 못 그려서 jpeg를 미리 만들어 둔다(scripts/build-style-og-images.mjs).
 * 라우트에서 sharp로 바로 바꾸면 Next가 번들한 libvips와 겹쳐 빌드가 깨진다.
 * 파일이 없으면 그림 없이 글자만 있는 카드로 떨어진다 — 카드가 아예 안 나오는 것보다 낫다.
 */
async function loadIllustration(code: string): Promise<string | null> {
  try {
    const file = await readFile(
      path.join(process.cwd(), 'public/images/style/og', `${code}.jpg`),
    )
    return `data:image/jpeg;base64,${file.toString('base64')}`
  } catch {
    return null
  }
}

export default async function StyleOpengraphImage({
  params,
}: {
  params: Promise<{ code: string }>
}) {
  const { code } = await params
  const style = await travelStyleRepo.get(code)
  const name = style?.name ?? '여행 성향'
  const tagline = style?.tagline ?? '12문항으로 알아보는 내 여행 유형'
  const headline = `나는 ${name} 여행이다`

  const [font, illustration] = await Promise.all([
    loadKoreanFont(`${headline}${tagline}${SITE_NAME}여행 성향 분석`),
    style ? loadIllustration(style.code) : Promise.resolve(null),
  ])

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        background: CINE_BASE,
        fontFamily: font ? 'Noto Sans KR' : 'sans-serif',
      }}
    >
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '64px 56px 64px 72px',
        }}
      >
        <div style={{ display: 'flex', fontSize: 28, letterSpacing: 6, color: CINE_ACCENT }}>
          {style?.code ?? 'TOGO TRIP'}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div
            style={{
              display: 'flex',
              fontSize: font ? 64 : 56,
              fontWeight: 700,
              lineHeight: 1.15,
              letterSpacing: -2,
              color: CINE_INK,
              // 한글은 기본값이면 음절 단위로 끊긴다("완/주형"). 어절 단위로 끊는다.
              wordBreak: 'keep-all',
            }}
          >
            {font ? headline : 'My travel style'}
          </div>
          {font ? (
            <div style={{ display: 'flex', fontSize: 30, lineHeight: 1.4, color: CINE_INK, opacity: 0.8, wordBreak: 'keep-all' }}>
              {tagline}
            </div>
          ) : null}
        </div>
        <div style={{ display: 'flex', fontSize: 24, color: CINE_INK, opacity: 0.7 }}>
          {font ? `${SITE_NAME} 여행 성향 분석 · togo-trip.com` : 'togo-trip.com'}
        </div>
      </div>
      {illustration ? (
        // eslint-disable-next-line @next/next/no-img-element -- satori는 next/image를 그리지 못한다
        <img src={illustration} width={630} height={630} alt="" style={{ objectFit: 'cover' }} />
      ) : null}
    </div>,
    {
      ...size,
      ...(font && {
        fonts: [{ name: 'Noto Sans KR', data: font, weight: 700, style: 'normal' }],
      }),
    },
  )
}
