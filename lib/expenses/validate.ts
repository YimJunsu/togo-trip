/**
 * 지출 입력 규칙. 화면(AddExpenseForm)과 서버 액션(lib/expenses/actions.ts)이 같은
 * 함수를 부른다 — 규칙을 두 곳에 적으면 반드시 갈라진다 (CONVENTIONS §5).
 */

/**
 * 한 건 상한. DB 컬럼이 int4라 21억을 넘으면 RPC가 숫자 범위 오류로 죽는데, 그 전에
 * "0을 하나 더 친" 입력이 정산 전체를 뒤집는 쪽이 훨씬 흔하다. 친구 여행 한 건에
 * 1억을 넘을 일은 없다고 보고 그 자리에서 막는다. add_expense RPC도 같은 값을 본다.
 */
export const MAX_EXPENSE_AMOUNT = 100_000_000

export const MAX_EXPENSE_DESCRIPTION = 60

export type ParsedWon = { ok: true; won: number } | { ok: false; message: string }

/**
 * 사람이 적은 금액 문자열 → 정수 원. 쉼표·공백·`원`·`₩`은 허용한다(휴대폰에서
 * "152,000원"을 그대로 붙여 넣는 경우가 많다). 소수점은 받지 않는다 — 조용히
 * 반올림하면 적은 값과 저장된 값이 달라진다.
 */
export function parseWon(input: string): ParsedWon {
  const cleaned = input.replace(/[\s,원₩]/g, '')
  if (cleaned === '') return { ok: false, message: '금액을 넣어 주세요.' }
  if (!/^\d+$/.test(cleaned)) {
    return { ok: false, message: '금액은 숫자로만 넣어 주세요. 소수점은 받지 않아요.' }
  }
  const won = Number(cleaned)
  if (won <= 0) return { ok: false, message: '0원보다 커야 해요.' }
  if (won > MAX_EXPENSE_AMOUNT) {
    return { ok: false, message: '한 건에 1억 원까지 넣을 수 있어요.' }
  }
  return { ok: true, won }
}

/** 서버 경계용. 이미 숫자로 넘어온 값을 같은 규칙으로 본다. */
export function isValidAmount(amount: number): boolean {
  return Number.isInteger(amount) && amount > 0 && amount <= MAX_EXPENSE_AMOUNT
}

/**
 * 지출을 지울 수 있는 사람은 결제자 본인과 방장뿐이다.
 *
 * 예전에는 멤버 누구나 남의 지출을 지울 수 있었다. 자기가 나눠 내야 하는 지출을
 * 슬쩍 지우면 송금액이 줄어드는데, 그걸 막을 길도 기록도 없었다. 결제자는 자기가
 * 잘못 넣은 것을 고칠 수 있어야 하고, 방장은 나간 사람 대신 정리할 수 있어야 한다.
 * remove_expense RPC(0011)도 같은 규칙을 본다.
 */
export function canRemoveExpense(
  expense: { payerId: string },
  userId: string,
  isHost: boolean,
): boolean {
  return isHost || expense.payerId === userId
}
