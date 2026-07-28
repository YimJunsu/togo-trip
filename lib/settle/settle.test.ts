import { test } from 'node:test'
import assert from 'node:assert/strict'
import { settleTrip, type SettleInput, type SettleResult } from './settle.ts'

/** 짧게 쓰기 위한 헬퍼. isDriver 기본값은 false다. */
const m = (userId: string, isDriver = false) => ({ userId, isDriver })
const e = (payerId: string, amount: number, participantIds: string[]) => ({
  payerId,
  amount,
  participantIds,
})

/**
 * 돈이 새지 않는지 본다. 개별 금액이 아니라 성질을 검사하므로 규칙을 바꿔도 유효하다.
 * 송금액은 건마다 반올림되므로, 한 사람의 오차는 그가 관여한 송금 건수 × 0.5원까지 허용된다.
 */
function assertConserved(result: SettleResult) {
  for (const share of result.shares) {
    const sent = result.transfers
      .filter((t) => t.from === share.userId)
      .reduce((sum, t) => sum + t.amount, 0)
    const received = result.transfers
      .filter((t) => t.to === share.userId)
      .reduce((sum, t) => sum + t.amount, 0)
    const involved = result.transfers.filter(
      (t) => t.from === share.userId || t.to === share.userId,
    ).length
    const tolerance = Math.max(involved, 1) * 0.5
    assert.ok(
      Math.abs(received - sent - share.net) <= tolerance,
      `${share.userId}: 순액 ${share.net}인데 송금 합계는 ${received - sent}`,
    )
  }
}

// ── 1. PROJECT_SPEC §1.3 예시 ────────────────────────────────────────────────
test('SPEC 예시 — 4명, A가 운전자, A가 40,000 결제', () => {
  const result = settleTrip({
    members: [m('A', true), m('B'), m('C'), m('D')],
    expenses: [e('A', 40_000, ['A', 'B', 'C', 'D'])],
    driverDiscountRate: 0.2,
  })

  const a = result.shares.find((s) => s.userId === 'A')!
  assert.equal(a.rawOwed, 10_000)
  assert.equal(a.adjustment, -2_000)
  assert.equal(a.owed, 8_000)

  const b = result.shares.find((s) => s.userId === 'B')!
  assert.ok(Math.abs(b.owed - 10_666.667) < 0.01, `B 부담 ${b.owed}`)

  // B·C·D가 A에게 각 10,667원 (10,666.67 반올림)
  assert.equal(result.transfers.length, 3)
  for (const t of result.transfers) {
    assert.equal(t.to, 'A')
    assert.equal(t.amount, 10_667)
  }
  assertConserved(result)
})

// ── 2. trp-gangneung 전체 (설계 문서 §4.3에서 검증한 값) ─────────────────────
const GANGNEUNG: SettleInput = {
  members: [m('usr-1', true), m('usr-2'), m('usr-3'), m('usr-4')],
  expenses: [
    e('usr-1', 80_000, ['usr-1', 'usr-2', 'usr-3', 'usr-4']),
    e('usr-2', 240_000, ['usr-1', 'usr-2', 'usr-3', 'usr-4']),
    e('usr-3', 152_000, ['usr-1', 'usr-2', 'usr-3', 'usr-4']),
    e('usr-1', 24_000, ['usr-1', 'usr-3']),
    e('usr-4', 18_400, ['usr-1', 'usr-2', 'usr-3', 'usr-4']),
  ],
  driverDiscountRate: 0.2,
}

test('강릉 — 부담 내역', () => {
  const { shares } = settleTrip(GANGNEUNG)
  const by = (id: string) => shares.find((s) => s.userId === id)!

  assert.equal(by('usr-1').paid, 104_000)
  assert.equal(by('usr-1').rawOwed, 134_600)
  assert.equal(by('usr-1').adjustment, -26_920)
  assert.equal(by('usr-1').owed, 107_680)

  assert.equal(by('usr-2').paid, 240_000)
  assert.equal(by('usr-2').rawOwed, 122_600)
  assert.ok(Math.abs(by('usr-2').adjustment - 8_973.333) < 0.01)
})

test('강릉 — 송금 리스트 (금액도 순서도)', () => {
  const { transfers } = settleTrip(GANGNEUNG)
  assert.deepEqual(transfers, [
    { from: 'usr-4', to: 'usr-2', amount: 108_427 },
    { from: 'usr-4', to: 'usr-3', amount: 4_747 },
    { from: 'usr-1', to: 'usr-3', amount: 3_680 },
  ])
})

// ── 3. trp-jeju (seed 정정본) ────────────────────────────────────────────────
test('제주 — 운전자 1명, 3인 균등 96,000', () => {
  const result = settleTrip({
    members: [m('usr-2'), m('usr-1'), m('usr-5', true)],
    expenses: [e('usr-5', 96_000, ['usr-1', 'usr-2', 'usr-5'])],
    driverDiscountRate: 0.2,
  })
  assert.deepEqual(result.transfers, [
    { from: 'usr-2', to: 'usr-5', amount: 35_200 },
    { from: 'usr-1', to: 'usr-5', amount: 35_200 },
  ])
  assertConserved(result)
})

// ── 4·5·9. 할인이 적용되지 않는 세 경우는 결과가 같아야 한다 ─────────────────
const NO_DISCOUNT_EXPENSES = [
  e('A', 30_000, ['A', 'B', 'C']),
  e('B', 15_000, ['A', 'B', 'C']),
]

test('운전자가 없으면 순수 엔빵이다', () => {
  const { shares } = settleTrip({
    members: [m('A'), m('B'), m('C')],
    expenses: NO_DISCOUNT_EXPENSES,
    driverDiscountRate: 0.2,
  })
  for (const s of shares) {
    assert.equal(s.adjustment, 0)
    assert.equal(s.owed, 15_000)
  }
})

test('전원이 운전자면 할인을 적용하지 않는다 — 감면분을 떠안을 사람이 없다', () => {
  const { shares } = settleTrip({
    members: [m('A', true), m('B', true), m('C', true)],
    expenses: NO_DISCOUNT_EXPENSES,
    driverDiscountRate: 0.2,
  })
  for (const s of shares) {
    assert.equal(s.adjustment, 0)
    assert.equal(s.owed, 15_000)
  }
})

test('할인율 0이면 운전자가 있어도 순수 엔빵이다', () => {
  const { shares } = settleTrip({
    members: [m('A', true), m('B'), m('C')],
    expenses: NO_DISCOUNT_EXPENSES,
    driverDiscountRate: 0,
  })
  for (const s of shares) {
    assert.equal(s.adjustment, 0)
    assert.equal(s.owed, 15_000)
  }
})

// ── 6. 복수 운전자 ───────────────────────────────────────────────────────────
test('운전자 2명 — 각자 자기 부담분에서 감면받고, 총액을 비운전자 2명이 나눈다', () => {
  const result = settleTrip({
    members: [m('A', true), m('B', true), m('C'), m('D')],
    expenses: [e('A', 40_000, ['A', 'B', 'C', 'D'])],
    driverDiscountRate: 0.2,
  })
  const by = (id: string) => result.shares.find((s) => s.userId === id)!

  // 각 10,000 부담 → 운전자 A·B는 8,000씩 (감면 2,000 × 2 = 4,000)
  assert.equal(by('A').owed, 8_000)
  assert.equal(by('B').owed, 8_000)
  // 감면 총액 4,000을 C·D가 2,000씩 떠안는다
  assert.equal(by('C').owed, 12_000)
  assert.equal(by('D').owed, 12_000)
  assertConserved(result)
})

// ── 7. 일부만 참여한 지출 ────────────────────────────────────────────────────
test('참여자 목록에 없으면 그 지출은 부담하지 않는다', () => {
  const { shares } = settleTrip({
    members: [m('A'), m('B'), m('C')],
    expenses: [e('A', 10_000, ['A', 'B'])],
    driverDiscountRate: 0.2,
  })
  assert.equal(shares.find((s) => s.userId === 'C')!.rawOwed, 0)
  assert.equal(shares.find((s) => s.userId === 'A')!.rawOwed, 5_000)
})

// ── 8. 빈 상태 ───────────────────────────────────────────────────────────────
test('지출이 없으면 송금도 없다', () => {
  const result = settleTrip({
    members: [m('A', true), m('B')],
    expenses: [],
    driverDiscountRate: 0.2,
  })
  assert.deepEqual(result.transfers, [])
  for (const s of result.shares) assert.equal(s.net, 0)
})

// ── 10. 나누어떨어지지 않는 금액 ─────────────────────────────────────────────
test('3인 균등 10,000원 — 최종 송금액만 반올림한다', () => {
  const result = settleTrip({
    members: [m('A'), m('B'), m('C')],
    expenses: [e('A', 10_000, ['A', 'B', 'C'])],
    driverDiscountRate: 0.2,
  })
  // 각 3,333.33 부담. B·C가 A에게 3,333원씩.
  assert.deepEqual(result.transfers, [
    { from: 'B', to: 'A', amount: 3_333 },
    { from: 'C', to: 'A', amount: 3_333 },
  ])
  // 내부 부담액은 소수를 유지한다 — 반올림하지 않는다
  assert.ok(Math.abs(result.shares[0]!.rawOwed - 3_333.333) < 0.01)
  assertConserved(result)
})

// ── 11. 불변식 ───────────────────────────────────────────────────────────────
test('모든 케이스에서 돈이 새지 않는다', () => {
  assertConserved(settleTrip(GANGNEUNG))
  assertConserved(
    settleTrip({
      members: [m('A', true), m('B'), m('C'), m('D'), m('E')],
      expenses: [
        e('A', 77_777, ['A', 'B', 'C', 'D', 'E']),
        e('C', 13_331, ['B', 'C']),
        e('E', 9_999, ['A', 'E']),
      ],
      driverDiscountRate: 0.35,
    }),
  )
})
