'use client'

import { useState, useTransition } from 'react'
import { PlusIcon } from '@phosphor-icons/react'
import { ActionButton } from '@/components/dashboard/ActionButton'
import { AddExpenseForm } from '@/components/dashboard/AddExpenseForm'
import { DiscountRateField } from '@/components/dashboard/DiscountRateField'
import { ExpenseList } from '@/components/dashboard/ExpenseList'
import { SettledResult } from '@/components/dashboard/SettledResult'
import { StartSettleDialog } from '@/components/dashboard/StartSettleDialog'
import { AvatarStack } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import type { Expense, Member, Settlement, Trip } from '@/lib/data/types'
import type { SettleShare } from '@/lib/settle/settle'
import { removeExpense } from '@/lib/expenses/actions'
import { formatWon } from '@/lib/utils/format'

export function SettlePanel({
  trip,
  members,
  initialExpenses,
  settlements,
  shares,
  currentUserId,
  isHost,
}: {
  trip: Trip
  members: Member[]
  initialExpenses: Expense[]
  /** 확정된 방에서만 채워진다. */
  settlements: Settlement[]
  /** 확정된 방에서만 채워진다. 저장하지 않고 서버가 매번 계산한 값이다. */
  shares: SettleShare[]
  currentUserId: string
  isHost: boolean
}) {
  const [expenses, setExpenses] = useState(initialExpenses)
  const [isAdding, setIsAdding] = useState(false)
  // 미리보기가 열려 있는 동안 지출을 고치면, 확정할 때 서버가 다시 계산한 값이
  // 방금 본 미리보기와 달라질 수 있다. 미리보기의 숫자가 확정 시점까지 그대로
  // 유지되도록 이 동안은 지출 편집 UI 전체(추가/삭제)를 잠근다.
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [, startTransition] = useTransition()

  if (trip.settledAt) {
    return (
      <SettledResult
        tripId={trip.id}
        settledAt={trip.settledAt}
        shares={shares}
        members={members}
        initialSettlements={settlements}
        currentUserId={currentUserId}
        isHost={isHost}
      />
    )
  }

  const total = expenses.reduce((sum, e) => sum + e.amount, 0)
  const driverNames = members
    .filter((m) => m.isDriver)
    .map((m) => m.displayName)

  function remove(expenseId: string) {
    const previous = expenses
    setExpenses((prev) => prev.filter((e) => e.id !== expenseId))
    startTransition(async () => {
      try {
        await removeExpense(trip.id, expenseId)
      } catch {
        setExpenses(previous)
      }
    })
  }

  return (
    <div className="flex flex-col gap-8">
      <section className="rounded-card bg-lime shadow-soft p-7">
        <div className="flex items-start justify-between gap-4">
          <p className="font-mono text-xs tracking-widest opacity-60">
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
          <Badge className="bg-ink/8 text-ink">{expenses.length}건</Badge>
          <Badge className="bg-ink/8 text-ink">{members.length}명</Badge>
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
              onAdded={(expense) => {
                setExpenses((prev) => [...prev, expense])
                setIsAdding(false)
              }}
            />
          </div>
        ) : null}

        <ExpenseList
          expenses={expenses}
          members={members}
          onRemove={isPreviewOpen ? undefined : remove}
        />
      </section>

      {isHost ? (
        <section className="flex flex-col gap-6">
          <DiscountRateField
            tripId={trip.id}
            initialRate={trip.driverDiscountRate}
          />
          <StartSettleDialog
            tripId={trip.id}
            members={members}
            isDisabled={expenses.length === 0}
            onPreviewOpenChange={setIsPreviewOpen}
          />
        </section>
      ) : (
        <p className="text-muted text-sm">정산은 방장이 시작합니다.</p>
      )}
    </div>
  )
}
