import { test } from 'node:test'
import assert from 'node:assert/strict'
import { groupTargets } from './group.ts'

const t = (code: string, areaCode: number, sigunguCode: number | null) => ({
  code,
  areaCode,
  sigunguCode,
})

test('같은 areaCode/sigunguCode를 한 그룹으로 묶는다', () => {
  const groups = groupTargets([
    t('31011', 31, 13),
    t('31012', 31, 13),
    t('31013', 31, 13),
    t('39010', 39, 4),
  ])

  assert.equal(groups.length, 2)
  const suwon = groups.find((g) => g.sigunguCode === 13)
  assert.deepEqual(suwon?.codes, ['31011', '31012', '31013'])
})

test('sigunguCode가 null인 세종은 areaCode로만 묶인다', () => {
  const groups = groupTargets([t('29010', 8, null)])
  assert.equal(groups.length, 1)
  assert.equal(groups[0].sigunguCode, null)
})

test('areaCode가 같아도 sigunguCode가 다르면 다른 그룹이다', () => {
  // 창원시는 TourAPI에서 두 그룹으로 쪼개져 있다.
  const groups = groupTargets([t('38111', 36, 16), t('38113', 36, 6)])
  assert.equal(groups.length, 2)
})

test('입력 순서를 그룹 순서와 그룹 내 순서 모두에 보존한다', () => {
  // cron이 priority 순으로 넘기므로 순서가 뒤집히면 우선순위가 무너진다.
  const groups = groupTargets([
    t('39010', 39, 4),
    t('31011', 31, 13),
    t('31012', 31, 13),
  ])
  assert.deepEqual(
    groups.map((g) => g.codes),
    [['39010'], ['31011', '31012']],
  )
})

test('빈 입력은 빈 배열이다', () => {
  assert.deepEqual(groupTargets([]), [])
})
