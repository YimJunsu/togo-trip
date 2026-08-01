import { mockAttractionRepo } from './mock/attractionRepo'
import { mockAuthRepo } from './mock/authRepo'
import { supabaseAuthRepo } from './supabase/authRepo'
import { mockCompatRepo } from './mock/compatRepo'
import { mockDestinationRepo } from './mock/destinationRepo'
import { mockExpenseRepo } from './mock/expenseRepo'
import { mockPlaceRepo } from './mock/placeRepo'
import { mockSettlementRepo } from './mock/settlementRepo'
import { mockTravelStyleRepo } from './mock/travelStyleRepo'
import { mockTripRepo } from './mock/tripRepo'
import type {
  AttractionRepository,
  AuthRepository,
  CompatRepository,
  DestinationRepository,
  ExpenseRepository,
  PlaceRepository,
  SettlementRepository,
  TravelStyleRepository,
  TripRepository,
} from './repositories'

/**
 * 데이터 소스 스위치. 화면은 여기서 export한 repo만 import한다. (CONVENTIONS.md §4)
 *
 * 지금은 mock 구현만 있다. Supabase를 붙일 땐 lib/data/supabase/를 같은 인터페이스로
 * 채우고 이 파일에서만 갈아끼운다. 화면은 건드리지 않는다:
 *
 *   export const tripRepo: TripRepository =
 *     process.env.NEXT_PUBLIC_DATA_SOURCE === 'supabase' ? supabaseTripRepo : mockTripRepo
 *
 * 회원 도메인만 먼저 전환했다. 나머지는 각자 supabase 구현이 생길 때 같은 방식으로 켠다.
 */
const useSupabase = process.env.NEXT_PUBLIC_DATA_SOURCE === 'supabase'

export const authRepo: AuthRepository = useSupabase ? supabaseAuthRepo : mockAuthRepo
export const tripRepo: TripRepository = mockTripRepo
export const expenseRepo: ExpenseRepository = mockExpenseRepo
export const settlementRepo: SettlementRepository = mockSettlementRepo
export const destinationRepo: DestinationRepository = mockDestinationRepo
export const placeRepo: PlaceRepository = mockPlaceRepo
export const compatRepo: CompatRepository = mockCompatRepo
export const travelStyleRepo: TravelStyleRepository = mockTravelStyleRepo
export const attractionRepo: AttractionRepository = mockAttractionRepo

export {
  DuplicateEmailError,
  InvalidCredentialsError,
  InvalidInviteCodeError,
} from './repositories'
