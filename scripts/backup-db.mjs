// @ts-check
/**
 * 운영 DB 전체 백업. `pg_dump`를 Docker로 돌려 로컬에 .sql 한 장으로 떨어뜨린다.
 *
 * 실행:
 *   pnpm backup
 *   node --env-file=.env.local scripts/backup-db.mjs
 *
 * 왜 있나: 2026-09-12에 운영 Supabase 프로젝트가 통째로 삭제됐다. 무료 플랜은
 * 자동 백업이 없고 지원팀 복구도 안 됐다. 스키마·지역 seed·관광지는 저장소에서
 * 되살렸지만 회원·여행방·정산은 영구 손실이었다. 이 스크립트가 있었다면
 * 그 셋도 돌아왔다.
 *
 * 왜 pg_dump인가: PostgREST로 표를 JSON으로 뽑는 방식은 auth.users(비밀번호 해시·
 * OAuth 연결)가 안 나온다. 회원을 되살리려면 auth 스키마까지 담는 pg_dump뿐이다.
 * 로컬에 psql이 없어 postgres 이미지의 pg_dump를 빌려 쓴다 — 설치가 필요 없다.
 *
 * 복원: 새 프로젝트를 만든 뒤 같은 이미지의 psql로 붓는다.
 *   docker run --rm -i postgres:17 psql "<새 SUPABASE_DB_URL>" < backups/<파일>.sql
 *   (auth·storage 스키마는 Supabase가 미리 만들어 두므로 "already exists"
 *    경고는 무시한다. 이후 supabase/schema.sql을 한 번 더 돌려 정책·grant를 맞춘다.)
 *
 * 연결 문자열은 Supabase 대시보드 > Connect > **Session pooler** 의 URI다. DB 비밀번호가
 * 들어 있으니 .env.local에만 둔다. Direct connection은 IPv6 전용이라 로컬에서 안
 * 붙는 경우가 많고, Transaction pooler는 pg_dump가 쓰는 세션 기능을 막는다.
 */
import { spawnSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const url = process.env.SUPABASE_DB_URL
if (!url) {
  console.error(
    'SUPABASE_DB_URL 이 없다. .env.local 에 Session pooler URI를 넣고',
  )
  console.error('--env-file=.env.local 을 붙였는지 확인한다.')
  process.exit(1)
}

/** 백업 디렉터리. .gitignore 에 있다 — 회원 데이터라 저장소에 올라가면 안 된다. */
const dir = join(process.cwd(), 'backups')
mkdirSync(dir, { recursive: true })

// KST 시각을 파일명에. 같은 날 두 번 떠도 덮어쓰지 않는다.
const stamp = new Intl.DateTimeFormat('sv-SE', {
  timeZone: 'Asia/Seoul',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})
  .format(new Date())
  .replace(/[-: ]/g, '')
  .slice(0, 12)
const file = join(dir, `togo-trip-${stamp}.sql`)

// 컨테이너 안에서 파일을 쓰면 볼륨 마운트가 필요하다. 대신 stdout을 그대로 받아
// 노드가 파일에 쓴다. Windows에서 경로 마운트로 겪는 문제를 피하는 길이기도 하다.
const result = spawnSync(
  'docker',
  [
    'run',
    '--rm',
    'postgres:17',
    'pg_dump',
    // 소유자·권한 구문을 빼야 다른 프로젝트(다른 role 이름)에 그대로 부을 수 있다.
    '--no-owner',
    '--no-privileges',
    // supabase가 관리하는 확장·내부 스키마는 새 프로젝트에 이미 있다.
    '--exclude-schema=extensions',
    '--exclude-schema=graphql*',
    '--exclude-schema=realtime',
    '--exclude-schema=supabase_*',
    '--exclude-schema=vault',
    '--exclude-schema=pgsodium*',
    '--exclude-schema=storage',
    '--exclude-schema=net',
    '--exclude-schema=cron',
    url,
  ],
  { encoding: 'utf8', maxBuffer: 1024 * 1024 * 512 },
)

if (result.error) {
  console.error('docker 를 실행하지 못했다. Docker Desktop이 켜져 있는지 본다.')
  console.error(result.error.message)
  process.exit(1)
}
if (result.status !== 0) {
  // 연결 문자열이 그대로 stderr에 찍힐 수 있다 — 비밀번호를 가리고 낸다.
  console.error(result.stderr.replace(/:\/\/[^@\s]+@/g, '://***@'))
  process.exit(result.status ?? 1)
}

writeFileSync(file, result.stdout)

const tables = (result.stdout.match(/^CREATE TABLE /gm) ?? []).length
const rows = (result.stdout.match(/^COPY /gm) ?? []).length
console.log(`백업 완료 → ${file}`)
console.log(
  `  표 ${tables}개 · COPY 블록 ${rows}개 · ${(result.stdout.length / 1024 / 1024).toFixed(1)} MB`,
)
