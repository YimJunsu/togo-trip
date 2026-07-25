// 여행 성향 16유형 결과 이미지 생성.
// mocks/travelStyles.json 의 scene 을 프롬프트로, public/baseModel/img.png(쿼카 마스코트)를
// 스타일 레퍼런스로 넘겨 public/images/style/{CODE}.webp 를 만든다.
//
// 사용법:
//   node scripts/generate-style-assets.mjs --key <sa.json>          # dry-run (계획·비용만)
//   node scripts/generate-style-assets.mjs --key <sa.json> --go     # 실제 생성
//   옵션: --only <CODE> · --force · --aspect 1:1 · --retry 4 · --delay 20
//        --width 768 · --quality 80  (webp 변환 설정)
//
// 모델이 주는 원본 PNG는 1MB가 넘는다. 화면에서 쓰는 크기(최대 320px)를 생각하면 과하므로
// 임시 폴더에 받아 webp로 줄여 넣는다. public/ 에는 webp만 남는다.
//
// 이미 있는 파일은 건너뛴다. 한 장 실패해도 나머지는 계속 간다.
// 이 모델은 분당 요청 수 제한이 빡빡해 429(RESOURCE_EXHAUSTED)가 잘 난다 —
// 그래서 장마다 쉬고, 실패하면 대기 시간을 늘려 가며 다시 던진다.
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  rmSync,
} from 'node:fs'
import { execFileSync } from 'node:child_process'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

const ROOT = join(import.meta.dirname, '..')
const STYLES = join(ROOT, 'mocks', 'travelStyles.json')
const MASCOT = join(ROOT, 'public', 'baseModel', 'img.png')
const OUT_DIR = join(ROOT, 'public', 'images', 'style')
const COST_PER_IMAGE = 0.24 // gemini-3-pro-image-preview 상한

// 16장이 한 세트로 보여야 하므로 연출 지시는 여기 한 곳에만 둔다.
// 애니메이션 제작 방식 그대로 간다: 캐릭터는 평면 셀 애니(baseModel 마스코트와 동일한 결),
// 배경만 페인팅. 캐릭터까지 페인터리로 칠하면 3D CG처럼 보여 마스코트와 따로 논다.
const PREFIX = `A 2D anime/webtoon style illustration of a scene.

[CHARACTER INSTRUCTION - CRITICAL]
The character in this scene MUST be the exact same mascot character provided in the reference image.
- DO NOT change the character's facial features, proportions, or art style.
- KEEP the thick bold black outlines and simple cel-shaded flat colors exactly like the reference.
- KEEP the huge head, small chubby body, short arms/legs, and NO long tail.
- CHANGE the character's pose, expression, and clothing to fit the scene naturally.

[COMPOSITION INSTRUCTION - CRITICAL]
- Create a WIDE SHOT or LONG SHOT.
- The character must be relatively SMALL in the frame (taking up less than 30% of the image area).
- DO NOT draw a close-up. DO NOT make the character fill the frame.
- The background environment should be expansive and beautiful, painted in a Studio Ghibli anime style.
- The character must be placed naturally within this environment, blending into the scene.

SCENE: {{scene}}

Rules:
- NO humans and no other characters. The quokka mascot is alone.
- NO text, no letters, no numbers, no words.
- NO real brands or logos.`

/** 동기 대기. 이 스크립트는 순차 실행이라 Atomics.wait 한 줄이면 충분하다. */
function sleep(sec) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, sec * 1000)
}

function parseArgs(argv) {
  // 이 프로젝트(test-pr-499510)에서 접근 가능한 이미지 모델은 gemini-3-pro-image(global)뿐이다.
  // generate-image.mjs 의 기본값(-preview)은 404가 난다.
  const args = {
    aspect: '1:1',
    model: 'gemini-3-pro-image',
    retry: '4',
    delay: '20',
    width: '768',
    quality: '80',
  }
  let cur = null
  for (const a of argv) {
    if (a.startsWith('--')) {
      cur = a.slice(2)
      args[cur] ??= true
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

function main() {
  const args = parseArgs(process.argv.slice(2))
  if (!existsSync(MASCOT)) {
    console.error(`마스코트 원본 없음: ${MASCOT}`)
    process.exit(1)
  }

  const styles = JSON.parse(readFileSync(STYLES, 'utf8'))
  const jobs = styles
    .filter((s) => (args.only ? s.code === args.only : true))
    .filter(
      (s) =>
        args.force === true || !existsSync(join(OUT_DIR, `${s.code}.webp`)),
    )

  console.log(
    `유형 ${styles.length}개 · 생성 대상 ${jobs.length}장 · 예상 비용 ~$${(jobs.length * COST_PER_IMAGE).toFixed(2)}`,
  )
  if (!jobs.length) {
    console.log('생성할 것 없음.')
    return
  }
  if (args.go !== true) {
    for (const j of jobs) console.log(`  ${j.code} — ${j.name}`)
    console.log('\ndry-run. 실제 생성하려면 --go 추가.')
    return
  }

  mkdirSync(OUT_DIR, { recursive: true })
  const tmp = join(tmpdir(), 'togo-style-prompts')
  mkdirSync(tmp, { recursive: true })

  const maxRetry = Number(args.retry)
  const delaySec = Number(args.delay)
  const failed = []

  for (const [i, style] of jobs.entries()) {
    const promptFile = join(tmp, `${style.code}.txt`)
    writeFileSync(promptFile, PREFIX.replace('{{scene}}', style.scene))
    const rawPng = join(tmp, `${style.code}.png`)
    const out = join(OUT_DIR, `${style.code}.webp`)
    console.log(`\n[${i + 1}/${jobs.length}] ${style.code} — ${style.name}`)

    let ok = false
    for (let attempt = 0; attempt <= maxRetry && !ok; attempt += 1) {
      if (attempt > 0) {
        // 429는 시간이 지나야 풀린다. 30s → 60s → 90s … 로 늘려 가며 기다린다.
        const wait = 30 * attempt
        console.log(`  재시도 ${attempt}/${maxRetry} — ${wait}초 대기`)
        sleep(wait)
      }
      try {
        execFileSync(
          'node',
          [
            join(ROOT, 'scripts', 'generate-image.mjs'),
            '--key',
            args.key,
            '--prompt',
            promptFile,
            '--ref',
            MASCOT,
            '--out',
            rawPng,
            '--aspect',
            args.aspect,
            '--model',
            args.model,
          ],
          { stdio: 'inherit' },
        )
        // 변환은 동기로 끝내야 다음 장으로 넘어가는 순서가 지켜진다.
        execFileSync(
          'node',
          [
            join(ROOT, 'scripts', 'to-webp.mjs'),
            rawPng,
            out,
            args.width,
            args.quality,
          ],
          { stdio: 'inherit' },
        )
        ok = true
      } catch {
        /* 아래에서 재시도한다 */
      }
    }

    // 16장 중 한 장이 끝내 안 나와도 나머지는 뽑는다. 실패분은 --only 로 다시 돌린다.
    if (!ok) {
      console.error(
        `  실패: ${style.code} (나중에 --only ${style.code} 로 재시도)`,
      )
      failed.push(style.code)
    } else if (i < jobs.length - 1) {
      sleep(delaySec)
    }
  }

  rmSync(tmp, { recursive: true, force: true })
  console.log(
    `\n완료. 성공 ${jobs.length - failed.length}장${failed.length ? ` · 실패 ${failed.join(', ')}` : ''}`,
  )
}

main()
