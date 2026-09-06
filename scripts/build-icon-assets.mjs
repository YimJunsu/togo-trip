// 마스코트 원화 → 파비콘·앱 아이콘·PWA 아이콘 일괄 생성. 1회성 생성기(CONVENTIONS §9).
//
//   node scripts/build-icon-assets.mjs
//
// 원화는 public/baseModel/{broom,wave,mark}.webp 다. 원화 자체는
// scripts/generate-image.mjs + docs/image-prompts/ 로 만들었고, 그 프롬프트가
// "이 그림이 왜 이렇게 생겼는지"의 기록이다.
//
// 왜 모델이 뱉은 그림을 그대로 안 쓰나:
//  - 이미지 모델은 "프레임의 88%를 채워라"를 거의 지키지 않는다. 실제로는 55% 언저리로
//    나와서 아이콘으로 쓰면 가운데 점처럼 보인다. 여백은 여기서 잘라 낸다.
//  - 배경색도 지정한 값 그대로 나오지 않는다. 마크 배경이 #2f6b4f 대신 세이지로 나왔다.
//    브랜드 색은 눈대중으로 맞출 값이 아니라서 픽셀 단위로 바꿔 칠한다.
import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import sharp from 'sharp'

const ROOT = join(import.meta.dirname, '..')
const SRC = (name) => join(ROOT, 'public/baseModel', `${name}.webp`)

/** app/globals.css @theme의 값이다. 토큰이 바뀌면 여기도 바꾼다. (DESIGN_SYSTEM §1.1·§8) */
const CREAM = { r: 0xf8, g: 0xe7, b: 0xc9 }
const ACCENT = { r: 0x2f, g: 0x6b, b: 0x4f }
const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 }

const hex = ({ r, g, b }) =>
  `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`

async function write(pipeline, out) {
  const path = join(ROOT, out)
  mkdirSync(dirname(path), { recursive: true })
  await pipeline.toFile(path)
  console.log(`  ${out}`)
}

/**
 * 배경 여백을 잘라 내고 정사각형 안에 coverage 비율로 다시 앉힌다.
 *
 * 자르기 전에 배경색을 먼저 통일한다. 모델은 지정한 #f8e7c9 대신 #ead7bb 를 냈는데,
 * trim은 "이 색과 같은 테두리"를 찾는 방식이라 기준색이 어긋나면 한 픽셀도 못 자른다.
 * 실제로 그래서 아이콘이 가운데 점처럼 나왔다.
 */
async function framed(name, { size, coverage, background }) {
  const source = await recolored(name, background)
  const trimmed = await sharp(source)
    .trim({ background: hex(background), threshold: 12 })
    .toBuffer()

  const before = await sharp(source).metadata()
  const after = await sharp(trimmed).metadata()
  if (after.width === before.width && after.height === before.height) {
    throw new Error(
      `${name}: 여백이 하나도 잘리지 않았다 — 배경이 균일한지 확인할 것`,
    )
  }

  const inner = Math.round(size * coverage)
  const fitted = await sharp(trimmed)
    .resize(inner, inner, { fit: 'inside', withoutEnlargement: false })
    .toBuffer()
  const { width = inner, height = inner } = await sharp(fitted).metadata()

  return sharp(fitted).extend({
    top: Math.floor((size - height) / 2),
    bottom: Math.ceil((size - height) / 2),
    left: Math.floor((size - width) / 2),
    right: Math.ceil((size - width) / 2),
    background: { ...background, alpha: 1 },
  })
}

/**
 * 배경으로 쓰인 색을 정확한 브랜드 색으로 바꿔 칠하고 raw 버퍼를 돌려준다.
 *
 * 기준색은 왼쪽 위 한 점에서 읽는다 — 모델이 어떤 색을 냈든 그 값이 배경이다.
 * 지정한 색이 그대로 나오는 법이 없어서(마크는 #2f6b4f 대신 세이지, 원화는 #f8e7c9
 * 대신 #ead7bb) 눈대중 대신 픽셀에서 읽는다.
 *
 * 허용 오차는 배경만 잡고 그림자는 남기도록 좁게 잡았다. 넓히면 발밑 그림자까지
 * 배경색으로 지워져 피규어가 공중에 뜬 것처럼 보인다. 경계의 안티에일리어싱 픽셀도
 * 그대로 둔다 — 억지로 바꾸면 실루엣이 계단처럼 깨진다.
 */
async function recolored(name, target, tolerance = 30) {
  const { data, info } = await sharp(SRC(name))
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  const key = { r: data[0], g: data[1], b: data[2] }
  for (let i = 0; i < data.length; i += info.channels) {
    const d =
      Math.abs(data[i] - key.r) +
      Math.abs(data[i + 1] - key.g) +
      Math.abs(data[i + 2] - key.b)
    if (d > tolerance) continue
    data[i] = target.r
    data[i + 1] = target.g
    data[i + 2] = target.b
  }
  return sharp(data, { raw: { ...info } })
    .png()
    .toBuffer()
}

/**
 * 배경을 알파로 빼낸다. 화면 안에 얹는 마스코트용이다.
 *
 * 아이콘은 불투명해야 하지만(런처가 배경을 깔아 주지 않는다) 화면 속 마스코트는
 * 흰 카드 위에 놓인다. 크림 배경이 그대로 박혀 있으면 카드에 네모난 얼룩이 생긴다.
 *
 * 알파를 0/255로만 끊지 않고 t0~t1 사이를 비례로 준다. 딱 잘라내면 실루엣 가장자리가
 * 톱니처럼 서고, 그 자국은 축소해도 사라지지 않는다. 발밑 그림자는 배경보다 어두워
 * 자연히 반투명으로 남는다 — 그래서 마스코트가 바닥에 붙어 보인다.
 */
async function cutout(name, { t0 = 18, t1 = 60 } = {}) {
  const { data, info } = await sharp(SRC(name))
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  const key = { r: data[0], g: data[1], b: data[2] }
  for (let i = 0; i < data.length; i += info.channels) {
    const d =
      Math.abs(data[i] - key.r) +
      Math.abs(data[i + 1] - key.g) +
      Math.abs(data[i + 2] - key.b)
    if (d <= t0) data[i + 3] = 0
    else if (d < t1) data[i + 3] = Math.round((255 * (d - t0)) / (t1 - t0))
  }
  return sharp(data, { raw: { ...info } })
    .png()
    .toBuffer()
}

async function main() {
  console.log('아이콘 생성')

  // 브라우저 탭. 16~32px라 원화가 아니라 납작한 마크를 쓴다.
  const mark = await recolored('mark', ACCENT, 42)
  await write(sharp(mark).resize(64, 64).png(), 'app/icon.png')

  // iOS 홈 화면. 마스크를 씌우지 않으므로 여백을 넉넉히 둔다.
  await write(
    await framed('broom', { size: 180, coverage: 0.82, background: CREAM }),
    'app/apple-icon.png',
  )

  // PWA 설치 아이콘.
  for (const size of [192, 512]) {
    await write(
      await framed('broom', { size, coverage: 0.84, background: CREAM }),
      `public/icons/icon-${size}.png`,
    )
  }

  // maskable은 안드로이드가 원형·물방울로 잘라 낸다. 안전 영역은 가운데 80%뿐이라
  // 그보다 작게 앉혀야 모자챙과 빗자루가 잘리지 않는다.
  await write(
    await framed('broom', { size: 512, coverage: 0.62, background: CREAM }),
    'public/icons/icon-maskable-512.png',
  )

  // 화면에 쓰는 마스코트. 홈·소개·성향 랜딩과 JSON-LD가 같은 파일을 본다.
  // 배경은 투명이다 — 흰 카드 위에 놓이므로 크림 판이 깔리면 얼룩으로 보인다.
  const wave = await sharp(await cutout('wave'))
    .trim({ threshold: 1 })
    .toBuffer()
  await write(
    sharp(wave)
      .resize(512, 512, { fit: 'contain', background: TRANSPARENT })
      .webp({ quality: 90, alphaQuality: 100 }),
    'public/images/mascot.webp',
  )
}

main().catch((e) => {
  console.error(e.message)
  process.exit(1)
})
