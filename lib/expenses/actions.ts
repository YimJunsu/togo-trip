'use server'

// 클라이언트 컴포넌트는 데이터 계층을 직접 import하면 안 된다 — '@/lib/data' 배럴은
// mockAuthRepo(→ node:crypto, seed 계정)까지 함께 물고 있어 그대로 import하면 브라우저
// 번들에 실려 나간다. 여기서 한 겹 감싸 서버에서만 repo를 불러 쓰게 한다.
import { requireMember } from '@/lib/auth/session'
import { expenseRepo, tripRepo } from '@/lib/data'
import type { AddExpenseInput } from '@/lib/data/repositories'
import type { Expense } from '@/lib/data/types'

export async function addExpense(input: AddExpenseInput): Promise<Expense> {
  await requireMember(input.tripId)

  // payerId도 이 방의 멤버여야 한다 — 방 밖의 사람에게 결제를 떠넘기지 못하게 막는다.
  const members = await tripRepo.listMembers(input.tripId)
  if (!members.some((m) => m.userId === input.payerId)) {
    throw new Error('결제자는 이 여행방의 멤버여야 합니다.')
  }

  // 참여자 중복을 여기서 한 번만 걷어낸다. mock(lib/data/mock/expenseRepo.ts)은
  // 중복을 그대로 받아들여 인원수를 부풀리고(['A','A','B']를 3인분으로 나눔),
  // Supabase는 add_expense RPC 안에서 distinct로 걸러 2인분으로 나눈다 — 같은
  // 입력에 데이터소스마다 다른 금액이 나오는 걸 막으려면 두 구현이 아니라
  // 이 경계 하나에서 정규화해야 한다.
  const participantIds = [...new Set(input.participantIds)]

  // 나눠 낼 사람도 전부 이 방의 멤버여야 한다 — 방 밖의 사람에게 빚을 지울 수 없게 막는다.
  if (
    participantIds.length === 0 ||
    !participantIds.every((id) => members.some((m) => m.userId === id))
  ) {
    throw new Error('나눠 낼 사람은 모두 이 여행방의 멤버여야 합니다.')
  }

  // 통화는 원(₩) 정수다. 음수·소수는 정산액을 뒤집거나 어긋나게 만든다.
  if (!Number.isInteger(input.amount) || input.amount <= 0) {
    throw new Error('금액은 0보다 큰 정수(원)여야 합니다.')
  }

  if (!input.description.trim()) {
    throw new Error('뭘 샀는지 적어야 합니다.')
  }

  return expenseRepo.add({ ...input, participantIds })
}

/**
 * tripId를 따로 받는 이유는 멤버십을 먼저 확인하기 위해서다. expenseId만으로는
 * 어느 방의 지출인지 알기 전에 게이트를 통과시킬 수 없다.
 */
export async function removeExpense(
  tripId: string,
  expenseId: string,
): Promise<void> {
  await requireMember(tripId)

  const expenses = await expenseRepo.listByTrip(tripId)
  if (!expenses.some((e) => e.id === expenseId)) {
    throw new Error('이 여행방의 지출이 아닙니다.')
  }

  await expenseRepo.remove(expenseId)
}
