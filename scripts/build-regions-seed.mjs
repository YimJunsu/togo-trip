// @ts-check
/**
 * regions 250건 seed SQL을 만든다.
 *
 * priority는 관광 수요가 높은 곳부터 채우도록 티어로 준다. 생성되는 지역 페이지의
 * 색인 가치가 높고, 다트가 꽂혔을 때 결과 만족도도 높기 때문이다.
 * 같은 티어 안에서는 코드 오름차순이라 순서가 결정론적이다.
 *
 * 실행: node scripts/build-regions-seed.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import korea from '../lib/geo/korea-sigungu.json' with { type: 'json' }
import tourAreaMap from '../lib/geo/tour-area-map.json' with { type: 'json' }

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

/** Tier 1 — 관광 수요 상위. 설계 §5의 순서를 그대로 쓴다. priority는 1부터. */
const TIER1 = [
  ['제주특별자치도', '제주시'],
  ['제주특별자치도', '서귀포시'],
  ['강원특별자치도', '강릉시'],
  ['강원특별자치도', '속초시'],
  ['강원특별자치도', '양양군'],
  ['강원특별자치도', '춘천시'],
  ['강원특별자치도', '평창군'],
  ['강원특별자치도', '정선군'],
  ['강원특별자치도', '고성군'],
  ['경상북도', '경주시'],
  ['경상북도', '안동시'],
  ['경상북도', '포항시 남구'],
  ['경상북도', '포항시 북구'],
  ['부산광역시', '해운대구'],
  ['부산광역시', '수영구'],
  ['부산광역시', '중구'],
  ['경상남도', '통영시'],
  ['경상남도', '거제시'],
  ['경상남도', '남해군'],
  ['전라남도', '여수시'],
  ['전라남도', '순천시'],
  ['전라남도', '담양군'],
  ['전북특별자치도', '전주시 완산구'],
  ['전북특별자치도', '전주시 덕진구'],
  ['충청남도', '태안군'],
  ['충청남도', '보령시'],
  ['경기도', '가평군'],
  ['충청북도', '단양군'],
  ['경상북도', '울릉군'],
  ['서울특별시', '종로구'],
  ['서울특별시', '중구'],
]

const METRO = new Set([
  '서울특별시',
  '부산광역시',
  '대구광역시',
  '인천광역시',
  '광주광역시',
  '대전광역시',
  '울산광역시',
])

/** 이름 표기가 "전주시 완산구"인지 "완산구"인지 둘 다 맞도록 정규화해 비교한다. */
const norm = (s) => s.replace(/\s+/g, '')
const tier1Index = new Map(
  TIER1.map(([province, name], i) => [`${province}/${norm(name)}`, i + 1]),
)

function priorityOf(region) {
  const t1 = tier1Index.get(`${region.province}/${norm(region.name)}`)
  if (t1) return t1
  if (region.name.endsWith('시') || region.province === '세종특별자치시') return 100
  if (region.name.endsWith('군')) return 200
  if (METRO.has(region.province)) return 300
  return 999
}

const missing = korea.regions.filter((r) => !tourAreaMap[r.code])
if (missing.length > 0) {
  console.error(`매핑 없는 시군구 ${missing.length}건. 먼저 build-tour-area-map.mjs를 돌린다.`)
  process.exit(1)
}

const unmatched = [...tier1Index.keys()].filter(
  (key) => !korea.regions.some((r) => `${r.province}/${norm(r.name)}` === key),
)
if (unmatched.length > 0) {
  console.error(`TIER1 이름이 korea-sigungu.json과 안 맞는다: ${unmatched.join(', ')}`)
  process.exit(1)
}

const esc = (s) => s.replace(/'/g, "''")

// 같은 티어 안에서는 코드 오름차순 — 순서가 결정론적이어야 재실행 결과가 같다.
const rows = korea.regions
  .map((r) => ({ ...r, priority: priorityOf(r), area: tourAreaMap[r.code] }))
  .sort((a, b) => a.priority - b.priority || a.code.localeCompare(b.code))
  .map(
    (r, i) =>
      `  ('${r.code}', '${esc(r.name)}', '${esc(r.province)}', ${r.area.areaCode}, ` +
      `${r.area.sigunguCode ?? 'null'}, ${r.priority < 100 ? r.priority : r.priority + i})`,
  )

const sql = `-- regions 250건 seed. scripts/build-regions-seed.mjs 가 생성한다 — 손으로 고치지 않는다.
-- 재실행 안전: 이미 있는 행은 마스터 정보만 갱신하고 적재 상태(ingested_at, 건수)는 건드리지 않는다.
insert into public.regions
  (code, name, province, tour_area_code, tour_sigungu_code, priority)
values
${rows.join(',\n')}
on conflict (code) do update set
  name              = excluded.name,
  province          = excluded.province,
  tour_area_code    = excluded.tour_area_code,
  tour_sigungu_code = excluded.tour_sigungu_code,
  priority          = excluded.priority;
`

mkdirSync(join(ROOT, 'supabase/seed'), { recursive: true })
writeFileSync(join(ROOT, 'supabase/seed/regions.sql'), sql, 'utf8')
console.log(`supabase/seed/regions.sql 에 ${rows.length}건 기록.`)
