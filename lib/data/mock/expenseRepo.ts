import { TripAlreadySettledError, type ExpenseRepository } from '../repositories'
import type { Expense } from '../types'
import { findTrip, store } from './store'

export const mockExpenseRepo: ExpenseRepository = {
  async listByTrip(tripId) {
    return store.expenses.filter((e) => e.tripId === tripId)
  },

  async add(input) {
    // Supabase 쪽에서는 RLS 정책이 같은 일을 한다. 두 구현이 같게 동작해야
    // NEXT_PUBLIC_DATA_SOURCE 스위치가 의미를 유지한다.
    if (findTrip(input.tripId)?.settledAt) throw new TripAlreadySettledError()

    const expense: Expense = {
      ...input,
      id: `exp-${Date.now()}`,
      createdAt: new Date().toISOString(),
    }
    store.expenses.push(expense)
    return expense
  },

  async remove(expenseId) {
    const index = store.expenses.findIndex((e) => e.id === expenseId)
    if (index === -1) return

    if (findTrip(store.expenses[index]!.tripId)?.settledAt) {
      throw new TripAlreadySettledError()
    }
    store.expenses.splice(index, 1)
  },
}
