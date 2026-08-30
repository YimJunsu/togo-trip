import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mockAttractionRepo as repo } from './attractionRepo.ts'

test('limit 0은 빈 배열이다 — 제한 없음이 아니다', async () => {
  // falsy 검사로 쓰면 0이 "제한 없음"이 되어 전부 돌려준다. 실제로 났던 버그다.
  assert.deepEqual(await repo.listByRegion('32030', { limit: 0 }), [])
})

test('타입 필터가 동작한다', async () => {
  const spots = await repo.listByRegion('32030', { type: 12 })
  const restaurants = await repo.listByRegion('32030', { type: 39 })
  assert.ok(spots.every((a) => a.contentTypeId === 12))
  assert.ok(restaurants.every((a) => a.contentTypeId === 39))
  assert.equal(spots.length + restaurants.length, 5)
})

test('overview가 있는 건이 앞으로 온다 — Supabase 정렬과 같아야 한다', async () => {
  // 두 구현이 다르게 정렬하면 UI가 mock인지 실서버인지 구분할 수 있게 된다.
  const spots = await repo.listByRegion('32030', { type: 12 })
  const firstNull = spots.findIndex((a) => a.overview === null)
  if (firstNull === -1) return
  assert.ok(
    spots.slice(firstNull).every((a) => a.overview === null),
    'overview 있는 건이 null 뒤에 섞여 있다',
  )
})

test('정렬이 limit보다 먼저 걸린다', async () => {
  // limit이 정렬 전에 걸리면 상위 N이 뒤바뀐다.
  const top2 = await repo.listByRegion('32030', { type: 12, limit: 2 })
  assert.equal(top2.length, 2)
  assert.ok(top2.every((a) => a.overview !== null))
})

test('없는 시군구는 빈 배열이다', async () => {
  assert.deepEqual(await repo.listByRegion('99999'), [])
})

test('getRegion은 없는 코드에 null을 준다', async () => {
  assert.equal(await repo.getRegion('99999'), null)
})
