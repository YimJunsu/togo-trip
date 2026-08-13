// @ts-check
/**
 * 통계청 시군구 코드 ↔ TourAPI 지역코드 매핑을 만든다.
 *
 * TourAPI의 areaCode는 시도 단위 자체 번호, sigunguCode는 시도별 일련번호라
 * 통계청 코드와 아무 관계가 없다. 런타임에 매번 조회하면 적재 한 번에 API 콜이
 * 두 배가 되므로 빌드타임에 한 번 만들어 커밋한다.
 *
 * 실행: node --env-file=.env.local scripts/build-tour-area-map.mjs
 */
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import korea from '../lib/geo/korea-sigungu.json' with { type: 'json' }

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const BASE = 'https://apis.data.go.kr/B551011/KorService2'
const KEY = process.env.TOUR_API_KEY

if (!KEY) {
  console.error('TOUR_API_KEY가 없다. --env-file=.env.local 을 붙였는지 확인한다.')
  process.exit(1)
}

/**
 * TourAPI가 옛 행정구역명을 주거나, 통합시가 한쪽만 구 단위로 쪼개져 있어
 * 이름 대조가 실패하는 건들. 스크립트를 돌려 콘솔에 남은 실패 건을 여기 채운다.
 *
 * 키는 통계청 5자리 코드, 값은 [areaCode, sigunguCode].
 */
const MANUAL_OVERRIDES = {
  // 인천 남구 — 2018년 미추홀구로 개칭. TourAPI는 개칭 후 이름만 갖고 있다.
  '23030': [2, 3], // 인천광역시 남구 → 미추홀구

  // 세종 — TourAPI는 시도 자체를 시군구 1건("세종특별자치시", sigunguCode=1)으로
  // 돌려준다. 그래도 진짜 하위 시군구 구분은 없으므로, 타입 주석(§sigunguCode)과
  // 테스트가 요구하는 대로 시도 단위 조회를 쓰도록 null로 둔다.
  '29010': [8, null], // 세종특별자치시 세종시

  // 수원시 4개 구 — TourAPI는 수원시를 구로 나누지 않는다.
  '31011': [31, 13], // 수원시 장안구
  '31012': [31, 13], // 수원시 권선구
  '31013': [31, 13], // 수원시 팔달구
  '31014': [31, 13], // 수원시 영통구

  // 성남시 3개 구 — TourAPI는 나누지 않는다.
  '31021': [31, 12], // 성남시 수정구
  '31022': [31, 12], // 성남시 중원구
  '31023': [31, 12], // 성남시 분당구

  // 안양시 2개 구 — TourAPI는 나누지 않는다.
  '31041': [31, 17], // 안양시 만안구
  '31042': [31, 17], // 안양시 동안구

  // 안산시 2개 구 — TourAPI는 나누지 않는다.
  '31091': [31, 15], // 안산시 상록구
  '31092': [31, 15], // 안산시 단원구

  // 고양시 3개 구 — TourAPI는 나누지 않는다.
  '31101': [31, 2], // 고양시 덕양구
  '31103': [31, 2], // 고양시 일산동구
  '31104': [31, 2], // 고양시 일산서구

  // 용인시 3개 구 — TourAPI는 나누지 않는다.
  '31191': [31, 23], // 용인시 처인구
  '31192': [31, 23], // 용인시 기흥구
  '31193': [31, 23], // 용인시 수지구

  // 청주시 4개 구 — 청원구는 2014년 청주시에 편입된 옛 청원군 지역이라
  // TourAPI가 아직 남겨 둔 '청원군'(9) 코드로 보낸다. 나머지 3구(상당·서원·흥덕)는
  // 통합 이전부터 있던 '청주시'(10) 코드를 그대로 쓴다 — TourAPI가 나누지 않는다.
  '33041': [33, 10], // 청주시 상당구
  '33042': [33, 10], // 청주시 서원구
  '33043': [33, 10], // 청주시 흥덕구
  '33044': [33, 9], // 청주시 청원구 → 옛 청원군

  // 천안시 2개 구 — TourAPI는 나누지 않는다.
  '34011': [34, 12], // 천안시 동남구
  '34012': [34, 12], // 천안시 서북구

  // 전주시 2개 구 — TourAPI는 나누지 않는다. (전주시는 TourAPI areaCode=37 전북 소속)
  '35011': [37, 12], // 전주시 완산구
  '35012': [37, 12], // 전주시 덕진구

  // 포항시 2개 구 — TourAPI는 나누지 않는다. (포항시는 TourAPI areaCode=35 경북 소속)
  '37011': [35, 23], // 포항시 남구
  '37012': [35, 23], // 포항시 북구

  // 군위군 — 2023년 7월 대구광역시로 편입됐다. korea-sigungu.json은 아직
  // province를 "경상북도"로 두지만, TourAPI 목록에는 경북(35) 쪽엔 없고
  // 대구(areaCode=4)의 시군구 목록에 코드 9로 들어가 있다.
  '37310': [4, 9], // 군위군 → 대구광역시 편입

  // 창원시 5개 구 — 2010년 마산시·진해시와 통합했지만 TourAPI는 통합 전
  // 3개 시(창원시·마산시·진해시) 코드를 그대로 유지하고 있다.
  '38111': [36, 16], // 창원시 의창구 → 창원시(옛)
  '38112': [36, 16], // 창원시 성산구 → 창원시(옛)
  '38113': [36, 6], // 창원시 마산합포구 → 옛 마산시
  '38114': [36, 6], // 창원시 마산회원구 → 옛 마산시
  '38115': [36, 14], // 창원시 진해구 → 옛 진해시
}

/** TourAPI가 주는 시도명을 korea-sigungu.json의 province 표기로 옮긴다. */
const PROVINCE_ALIAS = {
  서울: '서울특별시',
  인천: '인천광역시',
  대전: '대전광역시',
  대구: '대구광역시',
  광주: '광주광역시',
  부산: '부산광역시',
  울산: '울산광역시',
  세종특별자치시: '세종특별자치시',
  경기도: '경기도',
  강원도: '강원특별자치도',
  강원특별자치도: '강원특별자치도',
  충청북도: '충청북도',
  충청남도: '충청남도',
  전라북도: '전북특별자치도',
  전북특별자치도: '전북특별자치도',
  전라남도: '전라남도',
  경상북도: '경상북도',
  경상남도: '경상남도',
  제주도: '제주특별자치도',
  제주특별자치도: '제주특별자치도',
}

async function fetchAreaCodes(areaCode) {
  const url = new URL(`${BASE}/areaCode2`)
  url.searchParams.set('serviceKey', KEY)
  url.searchParams.set('MobileOS', 'ETC')
  url.searchParams.set('MobileApp', 'togo-trip')
  url.searchParams.set('_type', 'json')
  url.searchParams.set('numOfRows', '100')
  if (areaCode) url.searchParams.set('areaCode', String(areaCode))

  const res = await fetch(url)
  const text = await res.text()
  if (text.trimStart().startsWith('<')) {
    throw new Error(`XML 응답 — 키가 잘못됐거나 한도를 넘었다:\n${text.slice(0, 400)}`)
  }
  const json = JSON.parse(text)
  const header = json?.response?.header
  if (header?.resultCode !== '0000') {
    throw new Error(`TourAPI 오류 ${header?.resultCode}: ${header?.resultMsg}`)
  }
  const items = json?.response?.body?.items?.item
  if (!items) return []
  return Array.isArray(items) ? items : [items]
}

/** "청주시 상당구" 같은 표기와 "상당구"를 같은 것으로 보게 만든다. */
function normalize(name) {
  return name.replace(/\s+/g, '')
}

const provinces = await fetchAreaCodes(null)
console.log(`시도 ${provinces.length}건`)

/** province 표기 → { [정규화된 시군구명]: { areaCode, sigunguCode } } */
const byProvince = new Map()

for (const p of provinces) {
  const province = PROVINCE_ALIAS[p.name]
  if (!province) {
    console.warn(`알 수 없는 시도명: ${p.name} (areaCode=${p.code})`)
    continue
  }
  const sigungus = await fetchAreaCodes(p.code)
  const table = new Map()
  for (const s of sigungus) {
    table.set(normalize(s.name), {
      areaCode: Number(p.code),
      sigunguCode: Number(s.code),
    })
  }
  // 세종은 시군구 목록이 비어 있다. 시도 단위로 조회하도록 null을 둔다.
  if (sigungus.length === 0) {
    table.set('__PROVINCE_ONLY__', { areaCode: Number(p.code), sigunguCode: null })
  }
  byProvince.set(province, table)
  console.log(`  ${province} (areaCode=${p.code}) 시군구 ${sigungus.length}건`)
}

const map = {}
const failed = []

for (const region of korea.regions) {
  const override = MANUAL_OVERRIDES[region.code]
  if (override) {
    map[region.code] = { areaCode: override[0], sigunguCode: override[1] }
    continue
  }

  const table = byProvince.get(region.province)
  if (!table) {
    failed.push(`${region.province} ${region.name} (${region.code}) — 시도 없음`)
    continue
  }

  const provinceOnly = table.get('__PROVINCE_ONLY__')
  if (provinceOnly) {
    map[region.code] = provinceOnly
    continue
  }

  const key = normalize(region.name)
  // 정확 일치를 먼저 본다.
  const exact = table.get(key)
  if (exact) {
    map[region.code] = exact
    continue
  }

  // 접미 일치("청주시상당구"가 "상당구"를 포함) 후보를 전부 모은다 — 하나만
  // 골라 놓고 넘어가면, 나중에 후보가 둘로 늘어나도 어느 걸 골랐는지 알 길이
  // 없어진다. 정확히 하나일 때만 채택한다.
  const candidates = [...table.entries()].filter(([k]) => k.endsWith(key) || key.endsWith(k))

  if (candidates.length === 1) {
    map[region.code] = candidates[0][1]
    continue
  }

  if (candidates.length === 0) {
    failed.push(`${region.province} ${region.name} (${region.code}) — 후보 없음`)
    continue
  }

  // 후보가 둘 이상이면 어느 쪽이 맞는지 스크립트가 추측하지 않는다. 잘못
  // 고르면 다른 시군구의 관광지·맛집을 이 시군구 이름으로 조용히 적재하게
  // 되고, 어떤 테스트도 그 오류를 잡지 못한다. MANUAL_OVERRIDES에 명시적으로
  // 채우도록 후보 이름을 그대로 실패 메시지에 남긴다.
  failed.push(
    `${region.province} ${region.name} (${region.code}) — 후보 ${candidates.length}건 중 택일 불가: ${candidates
      .map(([k]) => k)
      .join(', ')}`,
  )
}

// 실패가 하나라도 있으면 JSON 파일을 건드리지 않는다. 여기서 그냥 쓰고 나서
// exit 1을 하면, 실패한 이번 실행이 이전에 검증된 정상 매핑을 부분적인
// 결과로 덮어써 버린다 — exit code를 안 보는 사람이나 다음 실행이 그걸
// 완료된 매핑으로 착각할 수 있다.
if (failed.length > 0) {
  console.error(`\n대조 실패 ${failed.length}건 — MANUAL_OVERRIDES에 채운 뒤 다시 돌린다:`)
  for (const f of failed) console.error(`  ${f}`)
  process.exit(1)
}

const sorted = Object.fromEntries(Object.entries(map).sort(([a], [b]) => a.localeCompare(b)))
writeFileSync(
  join(ROOT, 'lib/geo/tour-area-map.json'),
  JSON.stringify(sorted, null, 2) + '\n',
  'utf8',
)
console.log(`\nlib/geo/tour-area-map.json 에 ${Object.keys(sorted).length}건 기록.`)
