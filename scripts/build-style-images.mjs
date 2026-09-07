// 성향 유형 16개의 결과 이미지 생성. 1회성 생성기(CONVENTIONS §9).
//
//   node scripts/build-style-images.mjs --key <sa.json>                 # 계획만 출력
//   node scripts/build-style-images.mjs --key <sa.json> --go            # 실제 생성
//   node scripts/build-style-images.mjs --key <sa.json> --go --only PMAS,FNRL
//   옵션: --force (이미 있는 파일도 다시 뽑기)
//
// 장면 문장은 mocks/travelStyles.json의 scene 필드다. 유형 설명 바로 옆에 두어야
// 문구와 그림이 따로 놀지 않는다 — 실제로 예전 그림들은 설명과 어긋나 있었다.
//
// 프롬프트는 세 겹으로 쌓는다:
//   _mascot-identity.txt  캐릭터가 누구인가 (16장이 같은 애여야 한다)
//   _toy-photo.txt        어떤 종류의 사진인가
//   scene                 이 유형은 무엇을 하고 있는가
// 앞의 두 겹이 공통이라 유형마다 그림체가 흩어지지 않는다.
import { execFileSync } from 'node:child_process'
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import sharp from 'sharp'

const ROOT = join(import.meta.dirname, '..')
const PROMPTS = join(ROOT, 'docs/image-prompts')
const OUT_DIR = join(ROOT, 'public/images/style')

/** 지금 이 프로젝트에서 쓸 수 있는 이미지 모델. 기본값인 3-pro는 권한이 없다. */
const MODEL = 'gemini-2.5-flash-image'
/**
 * 요청 사이 간격과 재시도. 연달아 던지면 429(RESOURCE_EXHAUSTED)가 난다 —
 * 16장을 한 번에 돌리다 중간에 끊기면 어디까지 됐는지 세어야 하므로 여기서 견딘다.
 */
const GAP_MS = 8000
const RETRIES = 4

/** 화면이 쓰는 규격. StyleResultCard·StyleDirectory·StyleMatchGrid가 같은 파일을 본다. */
const SIZE = 768

/**
 * 캐릭터를 붙잡아 두는 레퍼런스. 아이콘에 쓴 원화를 그대로 넘긴다 —
 * 글로만 묘사하면 장마다 얼굴이 조금씩 달라지고, 그게 예전 16장이 무너진 이유다.
 */
const REFS = ['public/baseModel/wave.webp', 'public/baseModel/broom.webp']

function parseArgs(argv) {
  const args = {}
  let cur = null
  for (const a of argv) {
    if (a.startsWith('--')) {
      cur = a.slice(2)
      args[cur] = true
      continue
    }
    if (cur) args[cur] = a
  }
  if (!args.key) {
    console.error('필수: --key <서비스계정.json>')
    process.exit(1)
  }
  return args
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const styles = JSON.parse(
    readFileSync(join(ROOT, 'mocks/travelStyles.json'), 'utf8'),
  )

  const only = typeof args.only === 'string' ? args.only.split(',') : null
  const targets = styles.filter((s) => !only || only.includes(s.code))
  if (only && targets.length !== only.length) {
    console.error(`--only에 없는 코드가 있다: ${only.join(',')}`)
    process.exit(1)
  }

  const todo = targets.filter(
    (s) => args.force || !existsSync(join(OUT_DIR, `${s.code}.webp`)),
  )

  console.log(`대상 ${targets.length}개 · 생성할 것 ${todo.length}개`)
  for (const s of todo) console.log(`  ${s.code} ${s.name}`)
  if (!args.go) {
    console.log('\n계획만 출력했다. 실제로 뽑으려면 --go 를 붙인다.')
    return
  }

  const work = join(tmpdir(), `style-images-${process.pid}`)
  mkdirSync(work, { recursive: true })
  mkdirSync(OUT_DIR, { recursive: true })

  try {
    for (const style of todo) {
      const scenePath = join(work, `${style.code}.txt`)
      writeFileSync(scenePath, `SCENE — ${style.scene}.\n`, 'utf8')
      const raw = join(work, `${style.code}.png`)

      const argv = [
        join(ROOT, 'scripts/generate-image.mjs'),
        '--key',
        args.key,
        '--model',
        MODEL,
        '--aspect',
        '1:1',
        '--prompt',
        join(PROMPTS, '_mascot-identity.txt'),
        join(PROMPTS, '_toy-photo.txt'),
        scenePath,
        '--ref',
        ...REFS.map((p) => join(ROOT, p)),
        '--out',
        raw,
      ]

      for (let attempt = 1; ; attempt++) {
        try {
          execFileSync(process.execPath, argv, { stdio: 'inherit' })
          break
        } catch (e) {
          if (attempt > RETRIES) throw e
          // 429는 잠깐 기다리면 풀린다. 기다리는 시간을 늘려 가며 다시 던진다.
          const wait = GAP_MS * attempt
          console.log(
            `  실패 — ${wait / 1000}초 뒤 재시도 (${attempt}/${RETRIES})`,
          )
          await sleep(wait)
        }
      }

      const out = join(OUT_DIR, `${style.code}.webp`)
      // 모델이 늘 정사각을 주지는 않아서 화면 규격으로 맞춰 둔다.
      await sharp(raw)
        .resize(SIZE, SIZE, { fit: 'cover' })
        .webp({ quality: 88 })
        .toFile(out)
      console.log(`  → public/images/style/${style.code}.webp`)
      await sleep(GAP_MS)
    }
  } finally {
    rmSync(work, { recursive: true, force: true })
  }
}

main().catch((e) => {
  console.error(e.message)
  process.exit(1)
})
