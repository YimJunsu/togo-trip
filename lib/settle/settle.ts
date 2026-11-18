/**
 * 정산 계산. React·데이터 계층에 의존하지 않는다. (CONVENTIONS.md §5)
 * 규칙의 원본은 PROJECT_SPEC.md §1.3 — 균등 분배 → 운전자 할인 → 송금 최소화.
 */

export type SettleMember = { userId: string; isDriver: boolean }

export type SettleExpense = {
  payerId: string
  amount: number
  participantIds: string[]
}

export type SettleInput = {
  members: SettleMember[]
  expenses: SettleExpense[]
  /** 0 ~ 0.5. trips.driver_discount_rate */
  driverDiscountRate: number
}

export type SettleShare = {
  userId: string
  /** 이 사람이 실제로 낸 돈 */
  paid: number
  /** 할인 전 부담 */
  rawOwed: number
  /** 운전자는 음수(감면), 비운전자는 양수(분담) */
  adjustment: number
  owed: number
  /** paid - owed. 양수면 받을 사람 */
  net: number
}

export type SettleTransfer = { from: string; to: string; amount: number }

export type SettleResult = {
  shares: SettleShare[]
  transfers: SettleTransfer[]
}

/**
 * 원 단위 미만은 송금하지 않는다. 소수 잔액을 그대로 두면 부동소수점 잔재로
 * 0.0000001원짜리 송금 행이 생긴다.
 */
const EPSILON = 0.5

export function settleTrip({
  members,
  expenses,
  driverDiscountRate,
}: SettleInput): SettleResult {
  const paid = new Map<string, number>()
  const rawOwed = new Map<string, number>()
  for (const member of members) {
    paid.set(member.userId, 0)
    rawOwed.set(member.userId, 0)
  }

  // 1) 균등 분배
  //
  // 아래 두 경우를 조용히 넘기지 않고 던진다. payerId가 members에 없으면 paid만
  // 늘고 그 몫을 나눠 가질 사람(owed)이 아예 없어 Σnet ≠ 0이 되고, 결과적으로
  // 누군가는 실제보다 적게 받는다. 참여자 없는 지출도 (paid는 늘고 owed는 그대로라)
  // 같은 방식으로 돈이 샌다. 지금은 lib/expenses/actions.ts와 add_expense RPC가
  // 둘 다 이 상황을 막고 있지만, 그 가드 중 하나가 회귀하면 여기서 조용히
  // 잘못 나뉜 정산이 아니라 시끄러운 오류로 드러나야 한다.
  //
  // 참여자 쪽도 같다. members에 없는 참여자의 몫은 rawOwed에만 쌓이고 shares로는
  // 나가지 않아 그만큼 돈이 사라진다. 같은 사람이 두 번 들어 있으면 그 사람만
  // 두 몫을 낸다. 금액·할인율이 범위를 벗어나면 NaN이 결과 전체로 번진다.
  if (!(driverDiscountRate >= 0 && driverDiscountRate <= 0.5)) {
    throw new Error(`driverDiscountRate(${driverDiscountRate})는 0 ~ 0.5여야 합니다.`)
  }
  const memberIds = new Set(members.map((member) => member.userId))
  for (const expense of expenses) {
    if (!memberIds.has(expense.payerId)) {
      throw new Error(
        `payerId(${expense.payerId})가 members에 없습니다 — 이 지출의 paid를 아무도 나눠 부담하지 못합니다.`,
      )
    }
    if (!Number.isFinite(expense.amount) || expense.amount <= 0) {
      throw new Error(`지출 금액(${expense.amount})은 0보다 큰 수여야 합니다.`)
    }
    if (expense.participantIds.length === 0) {
      throw new Error('participantIds가 빈 지출입니다 — paid만 늘고 나눠 낼 사람이 없습니다.')
    }
    if (new Set(expense.participantIds).size !== expense.participantIds.length) {
      throw new Error('participantIds에 같은 사람이 두 번 들어 있습니다.')
    }
    const stranger = expense.participantIds.find((id) => !memberIds.has(id))
    if (stranger !== undefined) {
      throw new Error(
        `참여자(${stranger})가 members에 없습니다 — 그 몫을 아무도 부담하지 않게 됩니다.`,
      )
    }
    paid.set(expense.payerId, (paid.get(expense.payerId) ?? 0) + expense.amount)
    const each = expense.amount / expense.participantIds.length
    for (const id of expense.participantIds) {
      rawOwed.set(id, (rawOwed.get(id) ?? 0) + each)
    }
  }

  // 2) 운전자 할인
  const drivers = members.filter((member) => member.isDriver)
  // 감면분은 지출에 한 번이라도 참여한 비운전자만 나눠 진다. 방에만 들어와 있고
  // 여행에는 안 간 사람(참여한 지출이 없는 사람)이 운전자 몫을 떠안던 것을 고쳤다 —
  // 예전에는 쓴 돈 0원인 멤버가 남에게 송금해야 하는 결과가 나왔다.
  const others = members.filter(
    (member) => !member.isDriver && (rawOwed.get(member.userId) ?? 0) > 0,
  )

  // 전원이 운전자면 감면분을 떠안을 사람이 없어 0으로 나뉜다. 전원에게 같은 비율을
  // 깎는 건 아무것도 안 한 것과 결과가 같으므로 건너뛴다.
  const rate = others.length > 0 ? driverDiscountRate : 0
  const discountTotal = drivers.reduce(
    (sum, driver) => sum + (rawOwed.get(driver.userId) ?? 0) * rate,
    0,
  )
  const perOther = others.length > 0 ? discountTotal / others.length : 0

  const shares: SettleShare[] = members.map((member) => {
    const memberPaid = paid.get(member.userId) ?? 0
    const raw = rawOwed.get(member.userId) ?? 0
    // rate가 0이면 -raw * 0은 부호가 음수인 -0이 된다. -0 + 0은 IEEE754 규칙상
    // 항상 +0이므로, 이 +0으로 부호를 정규화해 strict assert.equal(0)이 깨지지 않게 한다.
    const bearsDiscount = !member.isDriver && raw > 0
    const adjustment = (member.isDriver ? -raw * rate : bearsDiscount ? perOther : 0) + 0
    const owed = raw + adjustment
    return {
      userId: member.userId,
      paid: memberPaid,
      rawOwed: raw,
      adjustment,
      owed,
      net: memberPaid - owed,
    }
  })

  return { shares, transfers: minimizeTransfers(shares) }
}

/**
 * 채무자·채권자를 큰 순으로 맞물려 송금 건수를 줄인다(그리디). n명이면 최대 n-1건.
 * 잔액은 소수로 유지하고, 반올림은 각 송금액을 만들 때 한 번만 한다 (CONVENTIONS §5).
 * 순서를 뒤집어 부담액을 먼저 반올림하면 결과 금액이 달라진다.
 */
function minimizeTransfers(shares: SettleShare[]): SettleTransfer[] {
  const debtors = shares
    .filter((share) => share.net < -EPSILON)
    .map((share) => ({ userId: share.userId, amount: -share.net }))
    .sort((a, b) => b.amount - a.amount)
  const creditors = shares
    .filter((share) => share.net > EPSILON)
    .map((share) => ({ userId: share.userId, amount: share.net }))
    .sort((a, b) => b.amount - a.amount)

  const transfers: SettleTransfer[] = []
  let d = 0
  let c = 0

  while (d < debtors.length && c < creditors.length) {
    const debtor = debtors[d]!
    const creditor = creditors[c]!
    const amount = Math.min(debtor.amount, creditor.amount)

    const won = Math.round(amount)
    if (won > 0) {
      transfers.push({ from: debtor.userId, to: creditor.userId, amount: won })
    }

    debtor.amount -= amount
    creditor.amount -= amount
    if (debtor.amount < EPSILON) d += 1
    if (creditor.amount < EPSILON) c += 1
  }

  return transfers
}

/**
 * 저장된 송금 리스트와 지금 다시 계산한 리스트가 같은지. 순서는 보지 않는다.
 *
 * 확정된 방은 송금 리스트만 저장하고 부담 내역(shares)은 화면을 열 때마다 다시
 * 계산한다. 입력이 잠겨 있으니 보통은 같지만, 계산 규칙이 바뀌면(2026-11-18 운전자
 * 감면분 분담 대상 변경) 예전에 확정한 방의 부담 내역이 송금 리스트와 어긋날 수 있다.
 * 그걸 조용히 보여 주지 않고 화면이 알릴 수 있게 판정만 해 준다.
 */
export function transfersMatch(
  a: readonly SettleTransfer[],
  b: readonly SettleTransfer[],
): boolean {
  if (a.length !== b.length) return false
  const key = (t: SettleTransfer) => `${t.from}>${t.to}:${t.amount}`
  const left = a.map(key).sort()
  const right = b.map(key).sort()
  return left.every((k, i) => k === right[i])
}
