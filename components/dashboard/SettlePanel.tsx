'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { PlusIcon } from '@phosphor-icons/react'
import { ActionButton } from '@/components/dashboard/ActionButton'
import { AddExpenseForm } from '@/components/dashboard/AddExpenseForm'
import { DiscountRateField } from '@/components/dashboard/DiscountRateField'
import { ExpenseList } from '@/components/dashboard/ExpenseList'
import { StartSettleDialog } from '@/components/dashboard/StartSettleDialog'
import { AvatarStack } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import type { Expense, Member, Trip } from '@/lib/data/types'
import { removeExpense } from '@/lib/expenses/actions'
import { formatWon } from '@/lib/utils/format'

/**
 * 아직 확정 전인 방의 정산 화면. 확정된 방은 SettledResult가 맡는다 —
 * 예전엔 이 컴포넌트가 확정 여부를 보고 SettledResult를 대신 반환했는데, 그러면
 * 확정해도 이 컴포넌트가 살아남아 isPreviewOpen 같은 로컬 state가 그대로 남았다.
 * 실제로 확정 뒤 취소하면 미리보기 잠금이 풀리지 않아 "지출 넣기"가 사라진 채였다.
 * 둘을 페이지에서 갈라 두면 확정할 때 이 컴포넌트가 언마운트되며 상태도 함께 사라진다.
 */
export function SettlePanel({
  trip,
  members,
  expenses,
  isHost,
}: {
  trip: Trip
  members: Member[]
  /**
   * 서버가 준 값을 그대로 그린다. 예전엔 useState 초기값으로 복사해 뒀는데, 그러면
   * 서버 컴포넌트가 다시 돌아 새 목록을 내려줘도 로컬 state가 이겨 화면이 안 바뀌었다 —
   * 같이 쓰는 방에서 남이 넣은 지출이 끝내 보이지 않는 원인이었다.
   * 내 조작 결과는 router.refresh()로 서버에서 다시 받는다 (MemberList와 같은 방식).
   */
  expenses: Expense[]
  isHost: boolean
}) {
  const router = useRouter()
  const [isAdding, setIsAdding] = useState(false)
  // 미리보기가 열려 있는 동안 지출·할인율을 고치면, 확정할 때 서버가 다시 계산한
  // 값이 방금 본 미리보기와 달라질 수 있다. 미리보기의 숫자가 확정 시점까지 그대로
  // 유지되도록 이 동안은 지출 편집 UI 전체(추가/삭제)와 할인율 컨트롤을 잠근다.
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [removeError, setRemoveError] = useState<string>()

  // 미리보기가 열리는 순간, 이미 열려 있던 추가 폼은 더 이상 조작할 수 없어야 한다
  // (위 잠금과 같은 이유). 닫아 두지 않으면 미리보기 취소 후 사용자가 연 적 없는
  // 빈 추가 폼이 그대로 남아 있는 것처럼 보인다.
  function handlePreviewOpenChange(open: boolean) {
    setIsPreviewOpen(open)
    if (open) setIsAdding(false)
  }

  const total = expenses.reduce((sum, e) => sum + e.amount, 0)
  const driverNames = members
    .filter((m) => m.isDriver)
    .map((m) => m.displayName)

  function remove(expenseId: string) {
    // 지우는 동안에도 행이 그대로 보인다(서버 응답을 기다리므로). 같은 행을 두 번
    // 눌러 이미 사라진 지출을 다시 지우려다 실패로 끝나지 않게 막는다.
    if (isPending) return
    startTransition(async () => {
      try {
        await removeExpense(trip.id, expenseId)
        setRemoveError(undefined)
        router.refresh()
      } catch {
        setRemoveError('지출을 지우지 못했습니다. 잠시 후 다시 시도해 주세요.')
      }
    })
  }

  return (
    <div className="flex flex-col gap-8">
      <section className="rounded-card bg-accent text-surface shadow-soft p-7">
        <div className="flex items-start justify-between gap-4">
          <p className="font-mono text-xs tracking-widest opacity-75">
            총 지출
          </p>
          <AvatarStack
            people={members.map((m) => ({ id: m.userId, name: m.displayName }))}
            label="함께 쓴 사람"
          />
        </div>
        <p className="font-display mt-2 text-4xl font-semibold tracking-tight">
          {formatWon(total)}
        </p>
        <div className="mt-4 flex flex-wrap gap-1.5">
          <Badge className="bg-surface/20 text-surface">{expenses.length}건</Badge>
          <Badge className="bg-surface/20 text-surface">{members.length}명</Badge>
          {driverNames.length > 0 ? (
            <Badge className="bg-ink text-paper">
              운전자 {driverNames.join('·')}{' '}
              {Math.round(trip.driverDiscountRate * 100)}% 할인
            </Badge>
          ) : null}
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold tracking-tight">
            지출
          </h2>
          {!isAdding && !isPreviewOpen ? (
            <ActionButton size="sm" onClick={() => setIsAdding(true)}>
              <PlusIcon size={14} weight="bold" aria-hidden />
              지출 넣기
            </ActionButton>
          ) : null}
        </div>

        {isAdding && !isPreviewOpen ? (
          <div className="mb-4">
            <AddExpenseForm
              tripId={trip.id}
              members={members}
              onCancel={() => setIsAdding(false)}
              onAdded={() => {
                setIsAdding(false)
                router.refresh()
              }}
            />
          </div>
        ) : null}

        <ExpenseList
          expenses={expenses}
          members={members}
          onRemove={isPreviewOpen ? undefined : remove}
        />
        {removeError ? (
          <p role="alert" className="text-danger mt-2 text-sm">
            {removeError}
          </p>
        ) : null}
      </section>

      {isHost ? (
        <section className="flex flex-col gap-6">
          <DiscountRateField
            tripId={trip.id}
            initialRate={trip.driverDiscountRate}
            disabled={isPreviewOpen}
          />
          <StartSettleDialog
            tripId={trip.id}
            members={members}
            isDisabled={expenses.length === 0}
            onPreviewOpenChange={handlePreviewOpenChange}
          />
        </section>
      ) : (
        <p className="text-muted text-sm">정산은 방장이 시작합니다.</p>
      )}
    </div>
  )
}
