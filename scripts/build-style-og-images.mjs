// 성향 일러스트(webp) → 공유 카드용 jpeg. 1회성 생성기(CONVENTIONS §9).
//
//   node scripts/build-style-og-images.mjs
//
// 결과물 public/images/style/og/{CODE}.jpg 는 커밋한다.
//
// 왜 OG 라우트 안에서 바로 변환하지 않나: satori(next/og)는 webp를 못 그린다. 라우트에서
// sharp를 import하면 Next가 번들한 libvips와 두 벌이 겹쳐 빌드 중 GLib CRITICAL 경고가
// 나고, 그 경고가 prerender 오류로 승격돼 빌드가 실패했다(2026-11-18). 미리 만들어 두고
// 라우트는 파일만 읽는다.
import { mkdirSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import sharp from 'sharp'

const ROOT = join(import.meta.dirname, '..')
const SRC_DIR = join(ROOT, 'public/images/style')
const OUT_DIR = join(SRC_DIR, 'og')
/** 카드 높이(630)와 같다. 카드 오른쪽에 정사각형으로 들어간다. */
const SIZE = 630

mkdirSync(OUT_DIR, { recursive: true })
const files = readdirSync(SRC_DIR).filter((f) => /^[A-Z]{4}\.webp$/.test(f))
for (const file of files) {
  const out = join(OUT_DIR, file.replace('.webp', '.jpg'))
  await sharp(join(SRC_DIR, file))
    .resize(SIZE, SIZE, { fit: 'cover' })
    .jpeg({ quality: 82, mozjpeg: true })
    .toFile(out)
}
console.log(`${files.length}개 → ${OUT_DIR}`)
