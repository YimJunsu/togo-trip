import expenseSeed from '@/mocks/expenses.json'
import memberSeed from '@/mocks/members.json'
import settlementSeed from '@/mocks/settlements.json'
import tripSeed from '@/mocks/trips.json'
import type { Expense, Member, Settlement, Trip } from '../types'

/**
 * mock repo들이 공유하는 메모리 상태.
 *
 * 각 repo가 자기 seed를 따로 복사해 갖고 있었으나, 정산 확정이 trips(잠금)와
 * settlements(송금 리스트)를 한 번에 건드리게 되면서 공유가 필요해졌다.
 * Supabase 쪽에서는 이 역할을 트랜잭션이 한다.
 *
 * 프로세스 메모리라 서버가 재시작되면 seed로 돌아간다. mock의 한계이고,
 * 실서버 전환(NEXT_PUBLIC_DATA_SOURCE=supabase)이 이걸 해소한다.
 */
export const store = {
  trips: [...(tripSeed as Trip[])],
  members: [...(memberSeed as Member[])],
  expenses: [...(expenseSeed as Expense[])],
  settlements: [...(settlementSeed as Settlement[])],
}

export function findTrip(tripId: string): Trip | undefined {
  return store.trips.find((trip) => trip.id === tripId)
}
