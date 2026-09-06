import { mockAttractionRepo } from './mock/attractionRepo'
import { mockAuthRepo } from './mock/authRepo'
import { supabaseAuthRepo } from './supabase/authRepo'
import { supabaseAttractionRepo } from './supabase/attractionRepo'
import { mockCompatRepo } from './mock/compatRepo'
import { mockDestinationRepo } from './mock/destinationRepo'
import { mockFoodRepo } from './mock/foodRepo'
import { mockExpenseRepo } from './mock/expenseRepo'
import { supabaseExpenseRepo } from './supabase/expenseRepo'
import { mockItineraryRepo } from './mock/itineraryRepo'
import { supabaseItineraryRepo } from './supabase/itineraryRepo'
import { mockPlaceRepo } from './mock/placeRepo'
import { mockSettlementRepo } from './mock/settlementRepo'
import { supabaseSettlementRepo } from './supabase/settlementRepo'
import { mockTravelStyleRepo } from './mock/travelStyleRepo'
import { mockTripRepo } from './mock/tripRepo'
import { supabaseTripRepo } from './supabase/tripRepo'
import type {
  AttractionRepository,
  AuthRepository,
  CompatRepository,
  DestinationRepository,
  ExpenseRepository,
  FoodRepository,
  ItineraryRepository,
  PlaceRepository,
  SettlementRepository,
  TravelStyleRepository,
  TripRepository,
} from './repositories'

/**
 * 데이터 소스 스위치. 화면은 여기서 export한 repo만 import한다. (CONVENTIONS.md §4)
 *
 * 도메인을 새로 Supabase로 옮길 땐 lib/data/supabase/를 같은 인터페이스로
 * 채우고 이 파일에서만 갈아끼운다. 화면은 건드리지 않는다:
 *
 *   export const tripRepo: TripRepository =
 *     process.env.NEXT_PUBLIC_DATA_SOURCE === 'supabase' ? supabaseTripRepo : mockTripRepo
 *
 * 회원·여행방·지출·정산 도메인이 실서버로 올라갔다. place·compat·destination은
 * 아직 mock이다. 각자 supabase 구현이 생길 때 같은 방식으로 켠다.
 */
const useSupabase = process.env.NEXT_PUBLIC_DATA_SOURCE === 'supabase'

export const authRepo: AuthRepository = useSupabase
  ? supabaseAuthRepo
  : mockAuthRepo
export const tripRepo: TripRepository = useSupabase
  ? supabaseTripRepo
  : mockTripRepo
export const expenseRepo: ExpenseRepository = useSupabase
  ? supabaseExpenseRepo
  : mockExpenseRepo
export const settlementRepo: SettlementRepository = useSupabase
  ? supabaseSettlementRepo
  : mockSettlementRepo
export const itineraryRepo: ItineraryRepository = useSupabase
  ? supabaseItineraryRepo
  : mockItineraryRepo
export const destinationRepo: DestinationRepository = mockDestinationRepo
export const foodRepo: FoodRepository = mockFoodRepo
export const placeRepo: PlaceRepository = mockPlaceRepo
export const compatRepo: CompatRepository = mockCompatRepo
export const travelStyleRepo: TravelStyleRepository = mockTravelStyleRepo
export const attractionRepo: AttractionRepository = useSupabase
  ? supabaseAttractionRepo
  : mockAttractionRepo

export {
  DuplicateEmailError,
  HostCannotLeaveError,
  InvalidCredentialsError,
  InvalidInviteCodeError,
  MemberHasExpensesError,
  TripAlreadySettledError,
} from './repositories'
