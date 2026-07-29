/**
 * mock repository 계약 테스트.
 *
 * Task 3 리뷰어가 제안하고 최종 리뷰까지 보류됐던 세 묶음이다 —
 * 정산 왕복(settle → unsettle → settle), 확정된 방의 쓰기 거부, 할인율 경계값.
 * 셋 다 "조용히 어긋나는" 종류다. 잠금이 한 경로에서 빠져도 화면은 정상으로
 * 보이고, 어긋난 건 돈이 오간 뒤에야 드러난다.
 *
 * 여기서 검증하는 건 mock 구현이지만, 같은 계약을 Supabase 쪽에서는 RLS 정책과
 * RPC가 맡는다(supabase/schema.sql). 두 구현이 갈리면 NEXT_PUBLIC_DATA_SOURCE
 * 스위치가 화면을 바꾸게 된다.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { TripAlreadySettledError } from '../repositories.ts'
import { mockExpenseRepo } from './expenseRepo.ts'
import { mockSettlementRepo } from './settlementRepo.ts'
import { findTrip, store } from './store.ts'
import { mockTripRepo } from './tripRepo.ts'

/** seed에서 유일하게 확정되지 않은 방(mocks/trips.json). 멤버는 usr-1(방장)·usr-3. */
const TRIP = 'trp-gyeongju'
const INVITE_CODE = 'R5T2W8'
const HOST = 'usr-1'
const GUEST = 'usr-3'

/** 다른 방의 정산. unsettle이 이걸 건드리면 안 된다. */
const OTHER_TRIP = 'trp-gangneung'

const transfers = [{ from: GUEST, to: HOST, amount: 30_000 }]

/**
 * store는 프로세스 전역이고 테스트가 그걸 변형한다. 각 테스트가 같은 지점에서
 * 시작하도록 TRIP에 남은 흔적만 되돌린다 — 다른 방은 손대지 않는다.
 */
async function reset() {
  await mockSettlementRepo.unsettle(TRIP)
  store.expenses = store.expenses.filter((e) => e.tripId !== TRIP)
  store.members = store.members.filter(
    (m) => m.tripId !== TRIP || m.userId === HOST || m.userId === GUEST,
  )
  findTrip(TRIP)!.driverDiscountRate = 0.2
}

/** 확정 상태로 만들고 그 방의 trip을 돌려준다. */
async function settled() {
  await reset()
  await mockSettlementRepo.settle(TRIP, transfers)
  return findTrip(TRIP)!
}

// ── 1. settle → unsettle → settle 왕복 ───────────────────────────────────────

test('settle은 송금 리스트를 저장하고 방을 잠근다', async () => {
  await reset()
  await mockSettlementRepo.settle(TRIP, transfers)

  const trip = findTrip(TRIP)!
  assert.ok(trip.settledAt, 'settledAt이 채워져야 잠긴 것으로 취급된다')
  const saved = await mockSettlementRepo.listByTrip(TRIP)
  assert.equal(saved.length, 1)
  assert.equal(saved[0]!.amount, 30_000)
  assert.equal(saved[0]!.isPaid, false, '확정 직후엔 아무도 보내지 않았다')
})

test('unsettle은 송금 리스트를 지우고 잠금을 푼다', async () => {
  await settled()
  await mockSettlementRepo.unsettle(TRIP)

  assert.equal(findTrip(TRIP)!.settledAt, null)
  assert.deepEqual(await mockSettlementRepo.listByTrip(TRIP), [])
})

test('unsettle은 다른 방의 정산을 건드리지 않는다', async () => {
  await settled()
  const before = await mockSettlementRepo.listByTrip(OTHER_TRIP)
  assert.ok(
    before.length > 0,
    'seed에 다른 방의 정산이 있어야 이 테스트가 의미 있다',
  )

  await mockSettlementRepo.unsettle(TRIP)

  assert.deepEqual(await mockSettlementRepo.listByTrip(OTHER_TRIP), before)
})

test('취소 후 다시 확정하면 송금이 겹쳐 쌓이지 않는다', async () => {
  await settled()
  await mockSettlementRepo.unsettle(TRIP)
  await mockSettlementRepo.settle(TRIP, transfers)

  const saved = await mockSettlementRepo.listByTrip(TRIP)
  assert.equal(saved.length, 1, '이전 확정분이 남아 있으면 2건이 된다')
})

test('취소 후 다시 확정할 때 금액이 바뀌면 새 금액이 남는다', async () => {
  await settled()
  await mockSettlementRepo.unsettle(TRIP)
  await mockSettlementRepo.settle(TRIP, [
    { from: GUEST, to: HOST, amount: 12_345 },
  ])

  const saved = await mockSettlementRepo.listByTrip(TRIP)
  assert.deepEqual(
    saved.map((s) => s.amount),
    [12_345],
  )
})

test('없는 방을 취소하면 던진다', async () => {
  await assert.rejects(() => mockSettlementRepo.unsettle('trp-없음'))
})

test('방 밖의 사람에게 송금시킬 수 없다', async () => {
  await reset()
  await assert.rejects(
    () =>
      mockSettlementRepo.settle(TRIP, [
        { from: GUEST, to: 'usr-외부인', amount: 1_000 },
      ]),
    /멤버/,
  )
  assert.equal(
    findTrip(TRIP)!.settledAt,
    null,
    '거부됐으면 잠기지도 않아야 한다',
  )
})

// ── 2. 확정된 방의 쓰기 경로 ─────────────────────────────────────────────────
//
// 계산 입력(지출·멤버·운전자·할인율)이 전부 잠겨야 "확정된 송금 리스트는 불변"이
// 성립한다. 한 경로라도 열려 있으면 저장된 송금과 화면이 재계산하는 shares가
// 영구히 어긋난다.

test('확정된 방에는 지출을 넣을 수 없다', async () => {
  await settled()
  await assert.rejects(
    () =>
      mockExpenseRepo.add({
        tripId: TRIP,
        payerId: HOST,
        amount: 10_000,
        description: '뒤늦은 커피',
        category: 'food',
        participantIds: [HOST, GUEST],
      }),
    TripAlreadySettledError,
  )
})

test('확정된 방의 지출은 지울 수 없다', async () => {
  await reset()
  const expense = await mockExpenseRepo.add({
    tripId: TRIP,
    payerId: HOST,
    amount: 10_000,
    description: '숙소',
    category: 'stay',
    participantIds: [HOST, GUEST],
  })
  await mockSettlementRepo.settle(TRIP, transfers)

  await assert.rejects(
    () => mockExpenseRepo.remove(expense.id),
    TripAlreadySettledError,
  )
})

test('확정된 방의 운전자는 바꿀 수 없다', async () => {
  await settled()
  await assert.rejects(
    () => mockTripRepo.setDriver(TRIP, GUEST, true),
    TripAlreadySettledError,
  )
})

test('확정된 방의 할인율은 바꿀 수 없다', async () => {
  await settled()
  await assert.rejects(
    () => mockTripRepo.setDiscountRate(TRIP, 0.5),
    TripAlreadySettledError,
  )
})

test('확정된 방에는 새로 참여할 수 없다', async () => {
  await settled()
  await assert.rejects(
    () => mockTripRepo.joinByCode('usr-신규', '늦은 사람', INVITE_CODE),
    TripAlreadySettledError,
  )
})

test('이미 확정된 방을 다시 확정할 수 없다', async () => {
  await settled()
  await assert.rejects(
    () => mockSettlementRepo.settle(TRIP, transfers),
    TripAlreadySettledError,
  )
})

test('보냄 표시는 확정 잠금의 예외다 — 확정 이후에만 의미가 있다', async () => {
  await settled()
  const [target] = await mockSettlementRepo.listByTrip(TRIP)

  const marked = await mockSettlementRepo.markPaid(target!.id, true)
  assert.equal(marked.isPaid, true)

  const unmarked = await mockSettlementRepo.markPaid(target!.id, false)
  assert.equal(unmarked.isPaid, false, '실수로 눌렀으면 되돌릴 수 있어야 한다')
})

// ── 3. 할인율 경계값 ─────────────────────────────────────────────────────────
//
// 0 ~ 0.5(0% ~ 50%)가 계약이다. 경계 자체는 통과해야 하고 그 밖은 막아야 한다.
// UI(DiscountRateField)는 정해진 5개 값만 보내지만, 서버 액션은 폼 값을 받으므로
// 이 검사가 마지막 방어선이다.

test('할인율 0%와 50%는 경계 안이다', async () => {
  await reset()
  assert.equal(
    (await mockTripRepo.setDiscountRate(TRIP, 0)).driverDiscountRate,
    0,
  )
  assert.equal(
    (await mockTripRepo.setDiscountRate(TRIP, 0.5)).driverDiscountRate,
    0.5,
  )
})

test('0 미만과 50% 초과는 막는다', async () => {
  await reset()
  for (const rate of [-0.01, -1, 0.51, 1]) {
    await assert.rejects(
      () => mockTripRepo.setDiscountRate(TRIP, rate),
      /할인율/,
      `${rate}이 통과했다`,
    )
  }
})

test('숫자가 아닌 할인율은 막는다', async () => {
  await reset()
  for (const rate of [
    Number.NaN,
    Number.POSITIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
  ]) {
    await assert.rejects(
      () => mockTripRepo.setDiscountRate(TRIP, rate),
      /할인율/,
    )
  }
})

test('거부된 할인율은 기존 값을 덮어쓰지 않는다', async () => {
  await reset()
  await mockTripRepo.setDiscountRate(TRIP, 0.3)
  await assert.rejects(() => mockTripRepo.setDiscountRate(TRIP, 0.9))
  assert.equal(findTrip(TRIP)!.driverDiscountRate, 0.3)
})
