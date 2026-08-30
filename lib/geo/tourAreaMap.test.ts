import { test } from 'node:test'
import assert from 'node:assert/strict'
import korea from '../geo/korea-sigungu.json' with { type: 'json' }
import { TOUR_AREA_MAP, getTourArea } from './tourAreaMap.ts'

const REGIONS = (korea as { regions: { code: string; name: string; province: string }[] }).regions

test('시군구 250건이 전부 매핑을 갖는다', () => {
  const missing = REGIONS.filter((r) => !getTourArea(r.code))
  assert.equal(
    missing.length,
    0,
    `매핑 없음 ${missing.length}건: ${missing.map((r) => `${r.province} ${r.name}(${r.code})`).join(', ')}`,
  )
})

test('매핑 개수가 시군구 개수와 같다 — 유령 키가 없다', () => {
  assert.equal(Object.keys(TOUR_AREA_MAP).length, REGIONS.length)
})

test('areaCode는 항상 양수다', () => {
  for (const [code, area] of Object.entries(TOUR_AREA_MAP)) {
    assert.ok(area.areaCode > 0, `${code}의 areaCode가 ${area.areaCode}`)
  }
})

test('sigunguCode는 null이 아니면 양의 정수다', () => {
  for (const [code, area] of Object.entries(TOUR_AREA_MAP)) {
    if (area.sigunguCode === null) continue
    assert.ok(
      Number.isInteger(area.sigunguCode) && area.sigunguCode > 0,
      `${code}의 sigunguCode가 ${area.sigunguCode}`,
    )
  }
})

test('세종특별자치시는 sigunguCode가 null이다 — 시군구가 없다', () => {
  const sejong = REGIONS.find((r) => r.province === '세종특별자치시')
  assert.ok(sejong, '세종이 korea-sigungu.json에 없다')
  assert.equal(getTourArea(sejong.code)?.sigunguCode, null)
})

test('세종 외에는 sigunguCode가 채워져 있다', () => {
  for (const region of REGIONS) {
    if (region.province === '세종특별자치시') continue
    const area = getTourArea(region.code)
    assert.notEqual(
      area?.sigunguCode,
      null,
      `${region.province} ${region.name}의 sigunguCode가 null`,
    )
  }
})

test('없는 코드는 null을 준다', () => {
  assert.equal(getTourArea('99999'), null)
})
