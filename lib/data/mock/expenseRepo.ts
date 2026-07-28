import type { ExpenseRepository } from '../repositories'
import type { Expense } from '../types'
import { store } from './store'

export const mockExpenseRepo: ExpenseRepository = {
  async listByTrip(tripId) {
    return store.expenses.filter((e) => e.tripId === tripId)
  },

  async add(input) {
    const expense: Expense = {
      ...input,
      id: `exp-${Date.now()}`,
      createdAt: new Date().toISOString(),
    }
    store.expenses.push(expense)
    return expense
  },
}
