/**
 * 대한민국 시군구 경계(TopoJSON)를 다트 맵용 컴팩트 JSON으로 변환한다.
 *
 * 입력: southkorea/southkorea-maps kostat 2018 simplified TopoJSON (CC BY)
 *   https://raw.githubusercontent.com/southkorea/southkorea-maps/master/kostat/2018/json/skorea-municipalities-2018-topo-simple.json
 * 출력: lib/geo/korea-sigungu.json — 지역별 SVG path + 중심좌표(위경도)
 *
 * 실행: node scripts/build-korea-map.mjs [입력파일경로]
 * (입력 경로 생략 시 위 URL에서 내려받는다. 결과물은 커밋하므로 평소엔 재실행 불필요.)
 *
 * 주의: 2018년 경계라 이후 개편(군위군 대구 편입 등)은 반영되지 않았다.
 * 목데이터 단계에선 충분하고, 실서버 붙일 때 최신 경계로 교체한다.
 */
import { writeFileSync, readFileSync } from 'node:fs'
import { mkdirSync } from 'node:fs'
import path from 'node:path'

const SOURCE_URL =
  'https://raw.githubusercontent.com/southkorea/southkorea-maps/master/kostat/2018/json/skorea-municipalities-2018-topo-simple.json'
const OUT = path.join(process.cwd(), 'lib', 'geo', 'korea-sigungu.json')

/** 통계청 행정구역 코드 앞 두 자리 → 시도 이름(현행 명칭) */
const PROVINCE = {
  11: '서울특별시',
  21: '부산광역시',
  22: '대구광역시',
  23: '인천광역시',
  24: '광주광역시',
  25: '대전광역시',
  26: '울산광역시',
  29: '세종특별자치시',
  31: '경기도',
  32: '강원특별자치도',
  33: '충청북도',
  34: '충청남도',
  35: '전북특별자치도',
  36: '전라남도',
  37: '경상북도',
  38: '경상남도',
  39: '제주특별자치도',
}

// ── 투영: 단순 정거원통(위도 중앙 기준 경도 보정). 국내 범위에선 충분히 정확하다.
const K = 200 // 위도 1도당 px
const MID_LAT = (33.11 + 38.61) / 2

async function loadTopology() {
  const local = process.argv[2]
  if (local) return JSON.parse(readFileSync(local, 'utf8'))
  const res = await fetch(SOURCE_URL)
  if (!res.ok) throw new Error(`download failed: ${res.status}`)
  return res.json()
}

function decodeArcs(topo) {
  const { scale, translate } = topo.transform
  return topo.arcs.map((arc) => {
    let x = 0
    let y = 0
    return arc.map(([dx, dy]) => {
      x += dx
      y += dy
      return [x * scale[0] + translate[0], y * scale[1] + translate[1]]
    })
  })
}

/** Douglas-Peucker. 공유 경계가 어긋나지 않도록 링이 아니라 "아크" 단위로 단순화한다. */
function simplify(points, epsilon) {
  if (points.length <= 2) return points
  let maxDist = 0
  let index = 0
  const [x1, y1] = points[0]
  const [x2, y2] = points[points.length - 1]
  if (x1 === x2 && y1 === y2) {
    // 닫힌 링(독립 섬). 양 끝점이 같으면 거리식이 0으로 죽어 섬 전체가 사라진다.
    // 시작점에서 가장 먼 점을 축으로 반씩 나눠 단순화한다.
    let far = 1
    let farDist = -1
    for (let i = 1; i < points.length - 1; i++) {
      const d = Math.hypot(points[i][0] - x1, points[i][1] - y1)
      if (d > farDist) {
        farDist = d
        far = i
      }
    }
    return [
      ...simplify(points.slice(0, far + 1), epsilon).slice(0, -1),
      ...simplify(points.slice(far), epsilon),
    ]
  }
  const dx = x2 - x1
  const dy = y2 - y1
  const len = Math.hypot(dx, dy) || 1e-12
  for (let i = 1; i < points.length - 1; i++) {
    const [px, py] = points[i]
    const dist = Math.abs(dy * px - dx * py + x2 * y1 - y2 * x1) / len
    if (dist > maxDist) {
      maxDist = dist
      index = i
    }
  }
  if (maxDist <= epsilon) return [points[0], points[points.length - 1]]
  return [
    ...simplify(points.slice(0, index + 1), epsilon).slice(0, -1),
    ...simplify(points.slice(index), epsilon),
  ]
}

function assembleRing(arcIndexes, arcs) {
  const pts = []
  for (const i of arcIndexes) {
    let arc = arcs[i < 0 ? ~i : i]
    if (i < 0) arc = [...arc].reverse()
    if (pts.length) pts.pop() // 이전 아크 끝점 == 다음 아크 시작점
    pts.push(...arc)
  }
  return pts
}

function ringArea(ring) {
  let sum = 0
  for (let i = 0; i < ring.length - 1; i++) {
    sum += ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i][1]
  }
  return sum / 2
}

function ringCentroid(ring) {
  const area = ringArea(ring)
  let cx = 0
  let cy = 0
  for (let i = 0; i < ring.length - 1; i++) {
    const cross = ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i][1]
    cx += (ring[i][0] + ring[i + 1][0]) * cross
    cy += (ring[i][1] + ring[i + 1][1]) * cross
  }
  return [cx / (6 * area), cy / (6 * area)]
}

const r1 = (n) => Math.round(n * 10) / 10

/** 이보다 작은 링(작은 섬)은 0.1 단위로 남긴다. 정수로 깎으면 점 몇 개짜리 섬이 뭉개진다. */
const SMALL_RING = 12

const signed = (n) => (n < 0 ? `${n}` : ` ${n}`)

/**
 * 링 → SVG path. 첫 점만 절대좌표, 나머지는 상대좌표(`l`)이고 정수다.
 *
 * 예전에는 0.1 단위 절대좌표(`M415.2 231.1L406 233…`)였다. 이 path가 홈 지도 카드에
 * 250개 그대로 들어가는데, 서버 컴포넌트라 HTML 본문과 RSC 페이로드에 **두 번** 실려
 * 홈 HTML이 707KB였다. 지도는 855 너비를 384px 안팎으로 줄여 그리므로 1단위가 0.5px도
 * 안 된다 — 0.1 정밀도는 아무도 못 보는 바이트였다.
 *
 * 델타는 반올림한 절대좌표끼리 뺀다. 델타를 따로 반올림하면 오차가 누적돼, 같은 경계를
 * 공유하는 이웃 지역끼리 선이 어긋난다.
 */
function toPath(rings) {
  return rings
    .map((ring) => {
      const k = ringSpan(ring) < SMALL_RING ? 10 : 1
      const pts = ring.map(([x, y]) => [Math.round(x * k), Math.round(y * k)])
      // 닫힌 링의 마지막 점은 첫 점과 같다. z가 닫아 주므로 뺀다.
      const last = pts.at(-1)
      if (pts.length > 1 && last[0] === pts[0][0] && last[1] === pts[0][1]) pts.pop()
      let [px, py] = pts[0]
      let body = ''
      for (const [x, y] of pts.slice(1)) {
        if (x === px && y === py) continue
        body += `${signed((x - px) / k)}${signed((y - py) / k)}`
        px = x
        py = y
      }
      // 반올림으로 점 하나로 접힌 링. 인자 없는 `l`은 path 전체를 무효로 만든다.
      if (!body) return ''
      return `M${pts[0][0] / k}${signed(pts[0][1] / k)}l${body.trimStart()}z`
    })
    .join('')
}

function ringSpan(ring) {
  const { minX, minY, maxX, maxY } = bounds([ring])
  return Math.max(maxX - minX, maxY - minY)
}

function bounds(rings) {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const ring of rings) {
    for (const [x, y] of ring) {
      if (x < minX) minX = x
      if (y < minY) minY = y
      if (x > maxX) maxX = x
      if (y > maxY) maxY = y
    }
  }
  return { minX, minY, maxX, maxY }
}

/** "수원시장안구" → "수원시 장안구" */
function spaceName(name) {
  const m = name.match(/^(.{2,}?시)(.+[구군])$/)
  return m ? `${m[1]} ${m[2]}` : name
}

const topo = await loadTopology()
const object = Object.values(topo.objects)[0]
const geoArcs = decodeArcs(topo)

const minLon = topo.bbox[0]
const maxLat = topo.bbox[3]
const kx = K * Math.cos((MID_LAT * Math.PI) / 180)
const ky = K
const project = ([lon, lat]) => [(lon - minLon) * kx, (maxLat - lat) * ky]
// 짧은 아크(작은 섬)는 그대로 둔다. 독도처럼 픽셀 미만 지형이 단순화에 뭉개진다.
const projArcs = geoArcs.map((arc) => {
  const projected = arc.map(project)
  return arc.length <= 8 ? projected : simplify(projected, 0.55)
})

const regions = []
for (const geom of object.geometries) {
  const { name, code } = geom.properties
  const polygons =
    geom.type === 'Polygon' ? [geom.arcs] : geom.arcs
  const rings = []
  const geoRings = []
  for (const polygon of polygons) {
    for (const arcIndexes of polygon) {
      rings.push(assembleRing(arcIndexes, projArcs))
      geoRings.push(assembleRing(arcIndexes, geoArcs))
    }
  }
  // 좁쌀만 한 부속 섬 링은 버리되, 지역 자체가 사라지진 않게 최대 링은 남긴다.
  // 울릉군만 예외: 독도가 이 필터에 걸려 사라지면 안 된다(인셋으로 확대해 보여준다).
  const biggest = Math.max(...rings.map((r) => Math.abs(ringArea(r))))
  const threshold = name === '울릉군' ? 0.05 : Math.min(2.5, biggest)
  const kept = rings.filter((r) => Math.abs(ringArea(r)) >= threshold)
  const mainGeoRing = geoRings.reduce((a, b) =>
    Math.abs(ringArea(a)) >= Math.abs(ringArea(b)) ? a : b,
  )
  const [lon, lat] = ringCentroid(mainGeoRing)
  regions.push({
    code,
    name: spaceName(name),
    province: PROVINCE[Number(code.slice(0, 2))],
    rings: kept,
    centroid: [Math.round(lat * 1000) / 1000, Math.round(lon * 1000) / 1000],
  })
}

// ── 울릉군은 본토에서 멀어 지도가 옆으로 퍼진다. 참고 레퍼런스처럼 우상단 인셋 박스로 옮긴다.
const ulleung = regions.find((r) => r.name === '울릉군')
const mainland = regions.filter((r) => r !== ulleung)
const mb = bounds(mainland.flatMap((r) => r.rings))

const PAD = 24
const DOCK = 150 // 다트가 대기하는 하단 바다 여백
const width = Math.ceil(mb.maxX - mb.minX + PAD * 2)
const height = Math.ceil(mb.maxY - mb.minY + PAD * 2 + DOCK)
const shift = ([x, y]) => [x - mb.minX + PAD, y - mb.minY + PAD]
for (const region of mainland) {
  region.rings = region.rings.map((ring) => ring.map(shift))
}

// 울릉도(서쪽 클러스터)와 독도(동쪽)를 나눠 각각 박스에 맞춰 넣는다.
const insets = []
if (ulleung) {
  const clusters = [
    { label: '울릉도', rings: [], box: 96 },
    { label: '독도', rings: [], box: 60 },
  ]
  for (const ring of ulleung.rings) {
    const isDokdo = ring[0][0] > (131.2 - minLon) * kx
    clusters[isDokdo ? 1 : 0].rings.push(ring)
  }
  let boxX = width - PAD
  ulleung.rings = []
  for (const cluster of clusters.reverse()) {
    if (!cluster.rings.length) continue
    const size = cluster.box
    boxX -= size
    const boxY = PAD
    const cb = bounds(cluster.rings)
    const span = Math.max(cb.maxX - cb.minX, cb.maxY - cb.minY, 1e-6)
    const scale = Math.min((size - 28) / span, 16)
    const fit = ([x, y]) => [
      boxX + size / 2 + (x - (cb.minX + cb.maxX) / 2) * scale,
      boxY + size / 2 + (y - (cb.minY + cb.maxY) / 2) * scale,
    ]
    ulleung.rings.push(...cluster.rings.map((ring) => ring.map(fit)))
    insets.push({ label: cluster.label, x: boxX, y: boxY, w: size, h: size })
    boxX -= 12
  }
}

const out = {
  width,
  height,
  dock: DOCK,
  // 위경도 ↔ svg 좌표 변환 계수 (착지점 좌표 표시용)
  proj: {
    minLon,
    maxLat,
    kx,
    ky,
    offsetX: -mb.minX + PAD,
    offsetY: -mb.minY + PAD,
  },
  insets,
  regions: regions.map((region) => {
    const anchorRing = region.rings.reduce((a, b) =>
      Math.abs(ringArea(a)) >= Math.abs(ringArea(b)) ? a : b,
    )
    let [ax, ay] = ringCentroid(anchorRing)
    if (!Number.isFinite(ax) || !Number.isFinite(ay)) {
      const rb = bounds([anchorRing])
      ax = (rb.minX + rb.maxX) / 2
      ay = (rb.minY + rb.maxY) / 2
    }
    return {
      code: region.code,
      name: region.name,
      province: region.province,
      path: toPath(region.rings),
      centroid: region.centroid,
      anchor: [r1(ax), r1(ay)],
    }
  }),
}

mkdirSync(path.dirname(OUT), { recursive: true })
writeFileSync(OUT, JSON.stringify(out))
const kb = Math.round(JSON.stringify(out).length / 1024)
console.log(`ok: ${out.regions.length} regions, ${kb}KB → ${OUT}`)
