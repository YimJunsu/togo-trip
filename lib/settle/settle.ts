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
  for (const expense of expenses) {
    paid.set(expense.payerId, (paid.get(expense.payerId) ?? 0) + expense.amount)
    if (expense.participantIds.length === 0) continue
    const each = expense.amount / expense.participantIds.length
    for (const id of expense.participantIds) {
      rawOwed.set(id, (rawOwed.get(id) ?? 0) + each)
    }
  }

  // 2) 운전자 할인
  const drivers = members.filter((member) => member.isDriver)
  const others = members.filter((member) => !member.isDriver)

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
    const adjustment = (member.isDriver ? -raw * rate : perOther) + 0
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
