'use client'

import { useState } from 'react'
import { ReceiptIcon, TrashIcon } from '@phosphor-icons/react'
import { EmptyState } from '@/components/dashboard/EmptyState'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import type { Expense, Member } from '@/lib/data/types'
import { formatWon } from '@/lib/utils/format'

export function ExpenseList({
  expenses,
  members,
  onRemove,
  canRemove,
}: {
  expenses: Expense[]
  members: Member[]
  /** 없으면 삭제 버튼이 뜨지 않는다. 확정된 방에서는 넘기지 않는다. */
  onRemove?: (expenseId: string) => void
  /**
   * 이 지출을 지울 수 있는지. 결제자 본인과 방장만 된다 (lib/expenses/validate.ts).
   * 서버도 같은 규칙으로 막으므로 이건 누를 수 없는 버튼을 숨기는 용도다.
   */
  canRemove?: (expense: Expense) => boolean
}) {
  // 휴지통을 한 번 누르면 바로 지웠다. 되돌릴 길이 없는데 행 끝의 작은 아이콘이라
  // 스크롤하다 잘못 눌리기 쉬웠다. 한 번 더 확인받는다.
  const [confirmingId, setConfirmingId] = useState<string>()

  if (expenses.length === 0) {
    return (
      <EmptyState
        icon={ReceiptIcon}
        title="지출이 없습니다"
        description="누가 뭘 결제했는지 넣으면 정산이 시작됩니다."
      />
    )
  }

  return (
    <ul className="divide-line border-line bg-surface rounded-card divide-y border px-5">
      {expenses.map((expense) => {
        const payer = members.find((m) => m.userId === expense.payerId)
        const isRemovable = onRemove && (canRemove?.(expense) ?? true)
        const isConfirming = confirmingId === expense.id
        return (
          <li key={expense.id} className="flex flex-col py-4">
            <div className="flex items-center gap-3">
              <Avatar name={payer?.displayName ?? '?'} />
              <div className="min-w-0 flex-1">
                <p className="font-display truncate font-medium">
                  {expense.description}
                </p>
                <p className="text-muted mt-0.5 text-xs">
                  {payer?.displayName ?? '나간 멤버'} 결제 ·{' '}
                  {expense.participantIds.length}명 부담
                </p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <p className="font-mono font-semibold tabular-nums">
                  {formatWon(expense.amount)}
                </p>
                <Badge className="bg-ink/5 text-muted">{expense.category}</Badge>
              </div>
              {isRemovable ? (
                <button
                  type="button"
                  onClick={() =>
                    setConfirmingId(isConfirming ? undefined : expense.id)
                  }
                  aria-label={`${expense.description} 삭제`}
                  aria-expanded={isConfirming}
                  className="text-muted hover:text-ink -mr-2 flex size-11 shrink-0 items-center justify-center rounded-full transition duration-200 ease-out active:scale-[0.96]"
                >
                  <TrashIcon size={18} weight="bold" aria-hidden />
                </button>
              ) : null}
            </div>
            {isRemovable && isConfirming ? (
              <div
                role="group"
                aria-label="삭제 확인"
                className="bg-paper rounded-inner animate-rise mt-3 flex items-center justify-between gap-3 px-4 py-2.5"
              >
                <p className="text-sm">이 지출을 지울까요?</p>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => setConfirmingId(undefined)}
                    className="text-muted min-h-10 rounded-full px-3 text-sm font-medium"
                  >
                    취소
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setConfirmingId(undefined)
                      onRemove(expense.id)
                    }}
                    className="text-danger min-h-10 rounded-full px-3 text-sm font-semibold"
                  >
                    지우기
                  </button>
                </div>
              </div>
            ) : null}
          </li>
        )
      })}
    </ul>
  )
}
