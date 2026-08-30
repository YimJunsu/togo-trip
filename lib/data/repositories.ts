import type {
  Attraction,
  CompatResult,
  Destination,
  DestinationFilter,
  Expense,
  ItineraryItem,
  Member,
  Profile,
  Place,
  QuizQuestion,
  RegionSummary,
  Settlement,
  StyleCode,
  TravelStyle,
  Trip,
} from './types'
import type { SettleTransfer } from '@/lib/settle/settle'

/**
 * 데이터 접근 계약. UI는 이 인터페이스만 알고, mock인지 실서버인지 몰라야 한다.
 * 구현 교체 시 화면은 건드리지 않는다. (CONVENTIONS.md §4)
 */

export type CreateTripInput = {
  name: string
  region: string
  startDate: string
  endDate: string
  coverTheme: Trip['coverTheme']
}

export type AddExpenseInput = {
  tripId: string
  payerId: string
  amount: number
  description: string
  category: string
  participantIds: string[]
}

export type SignUpInput = {
  name: string
  email: string
  password: string
  phone: string
  birthDate: string
}

export class DuplicateEmailError extends Error {
  constructor() {
    super('이미 가입된 이메일입니다.')
    this.name = 'DuplicateEmailError'
  }
}

/**
 * 이메일이 없는 것과 비밀번호가 틀린 것을 구분하지 않는다.
 * 구분하면 어떤 이메일이 가입돼 있는지 알려주는 셈이 된다.
 */
export class InvalidCredentialsError extends Error {
  constructor() {
    super('이메일 또는 비밀번호가 맞지 않습니다.')
    this.name = 'InvalidCredentialsError'
  }
}

/** 존재하지 않는 초대코드. 액션에서 이 타입만 잡아야 다른 오류(repo 버그 등)가 묻히지 않는다. */
export class InvalidInviteCodeError extends Error {
  constructor() {
    super('그런 초대코드는 없습니다.')
    this.name = 'InvalidInviteCodeError'
  }
}

/**
 * 확정된 여행방에 쓰기를 시도했다. 액션이 이 타입만 잡아야 다른 오류(repo 버그 등)가
 * 묻히지 않는다. Supabase 쪽에서는 RLS 정책이 같은 상황을 막는다.
 */
export class TripAlreadySettledError extends Error {
  constructor() {
    super('이미 정산이 끝난 여행방입니다.')
    this.name = 'TripAlreadySettledError'
  }
}

/**
 * 지출에 얽힌 사람을 방에서 빼려 했다. 결제자든 참여자든 같은 오류다 —
 * 사용자가 할 일("지출부터 정리하기")이 같아서다.
 * 이 사람을 그냥 빼면 expenses·expense_participants가 cascade로 함께 지워져
 * 남은 사람들의 정산 총액이 조용히 바뀐다 (supabase/schema.sql 7·8번 섹션).
 */
export class MemberHasExpensesError extends Error {
  constructor() {
    super('지출 내역이 있어 여행방에서 뺄 수 없습니다.')
    this.name = 'MemberHasExpensesError'
  }
}

/** 방장은 나가지도, 쫓겨나지도 않는다. 방을 정리하는 것은 '방 삭제'라는 별개 기능이다. */
export class HostCannotLeaveError extends Error {
  constructor() {
    super('방장은 여행방을 나갈 수 없습니다.')
    this.name = 'HostCannotLeaveError'
  }
}

/**
 * 인증. 자격증명(Account)은 이 인터페이스 밖으로 나가지 않는다 —
 * 모든 메서드가 Profile만 반환한다.
 */
export interface AuthRepository {
  /** 이미 쓰는 이메일이면 DuplicateEmailError를 던진다. */
  signUp(input: SignUpInput): Promise<Profile>
  /** 이메일·비밀번호가 맞지 않으면 InvalidCredentialsError를 던진다. */
  signIn(email: string, password: string): Promise<Profile>
  findById(id: string): Promise<Profile | null>
  /**
   * 가입 폼에서 제출 전에 미리 알려주기 위한 조회.
   * 이 값은 "그 이메일이 가입돼 있다"를 알려주므로 열거 수단이 되지만,
   * 제출 시 DuplicateEmailError가 이미 같은 사실을 노출하므로 새로 생기는 노출은 없다.
   */
  isEmailTaken(email: string): Promise<boolean>
  /**
   * 온보딩 완료. birthDate를 쓰고 onboardedAt을 찍는다.
   * 이미 완료한 사용자를 다시 부르면 시각을 덮어쓰지 않는다 —
   * 덮어쓰면 "언제 동의했나"의 답이 바뀐다.
   */
  completeOnboarding(userId: string, birthDate: string): Promise<Profile>
  /**
   * 현재 비밀번호가 맞을 때만 바꾼다. 틀리면 InvalidCredentialsError를 던진다.
   * 세션만으로 바꾸게 두면 자리를 비운 사이 남이 비밀번호를 갈아 계정을 통째로
   * 가져갈 수 있다 — 로그인 상태여도 본인 확인을 다시 받는다.
   */
  changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void>
}

export interface TripRepository {
  /** userId가 속한 여행방만 돌려준다. */
  list(userId: string): Promise<Trip[]>
  get(id: string): Promise<Trip | null>
  /** displayName은 이 방에서 쓸 이름. 기본값은 호출부가 Profile.name으로 채운다. */
  create(
    userId: string,
    displayName: string,
    input: CreateTripInput,
  ): Promise<Trip>
  /** 확정된 방이면 TripAlreadySettledError를 던진다. */
  joinByCode(userId: string, displayName: string, code: string): Promise<Trip>
  listMembers(tripId: string): Promise<Member[]>
  /** 방장만. 운전자는 여러 명일 수 있다. 갱신된 멤버 목록을 돌려준다. */
  setDriver(
    tripId: string,
    userId: string,
    isDriver: boolean,
  ): Promise<Member[]>
  /** 방장만. rate는 0 ~ 0.5. 확정된 방이면 TripAlreadySettledError. */
  setDiscountRate(tripId: string, rate: number): Promise<Trip>
  /**
   * 한 사람을 방에서 뺀다. 본인이 나가는 경우와 방장이 내보내는 경우가 같은
   * 메서드다 — DB가 하는 일이 같고, 갈리는 건 누가 부를 수 있는가뿐이라
   * 그 판단은 호출부(lib/trips/actions.ts)와 RLS/RPC가 한다.
   *
   * 지출에 얽혀 있으면 MemberHasExpensesError, 확정된 방이면
   * TripAlreadySettledError, 대상이 방장이면 HostCannotLeaveError.
   * 이 방에 없는 사람이면 조용히 넘어간다 (ExpenseRepository.remove와 같은 규칙).
   */
  leaveTrip(tripId: string, userId: string): Promise<void>
}

export interface ExpenseRepository {
  listByTrip(tripId: string): Promise<Expense[]>
  add(input: AddExpenseInput): Promise<Expense>
  /** 확정된 방의 지출이면 TripAlreadySettledError. */
  remove(expenseId: string): Promise<void>
}

export type AddItineraryItemInput = {
  tripId: string
  /** YYYY-MM-DD. 여행 기간 안인지는 호출부(lib/itinerary/actions.ts)가 본다. */
  day: string
  /** HH:MM. 시간을 안 정했으면 null. */
  at: string | null
  title: string
  memo: string
}

/**
 * 날짜별 일정. 정산 확정과 무관하다 — 돈 계산의 입력이 아니라서 확정된 방에서도
 * 계속 넣고 지울 수 있다. 그래서 다른 repo에 있는 TripAlreadySettledError가 없다.
 */
export interface ItineraryRepository {
  /** 날짜 오름차순, 같은 날은 시간 오름차순. 시간을 안 정한 일정은 그날 맨 뒤로 간다. */
  listByTrip(tripId: string): Promise<ItineraryItem[]>
  add(input: AddItineraryItemInput): Promise<ItineraryItem>
  remove(itemId: string): Promise<void>
}

export interface SettlementRepository {
  listByTrip(tripId: string): Promise<Settlement[]>
  /**
   * 확정 + 잠금. 방장만. transfers는 settleTrip()의 출력을 그대로 받는다.
   * 계산은 여기서 하지 않는다 — lib/settle/의 순수 함수가 이미 한 결과다.
   * 반환값은 없다 — 두 구현이 서로 다른 순서(삽입 순 vs amount desc)를 돌려주고
   * 호출부(startSettlement)도 결과를 쓰지 않아, 반환값이 있으면 구현이 갈리는데
   * 아무도 알아채지 못하는 채로 남는다.
   */
  settle(tripId: string, transfers: SettleTransfer[]): Promise<void>
  /** 정산 취소. 방장만. 송금 리스트를 지우고 잠금을 푼다. */
  unsettle(tripId: string): Promise<void>
  /** 확정 잠금의 예외다 — 송금을 보냈다는 표시는 확정 "이후"에 일어나야 하는 유일한 쓰기라 잠그지 않는다. */
  markPaid(settlementId: string, isPaid: boolean): Promise<Settlement>
}

export interface DestinationRepository {
  list(filter?: DestinationFilter): Promise<Destination[]>
  draw(filter?: DestinationFilter): Promise<Destination | null>
}

export interface PlaceRepository {
  listByTrip(tripId: string): Promise<Place[]>
  toggleSave(placeId: string, tripId: string): Promise<Place>
}

export interface CompatRepository {
  questions(): Promise<QuizQuestion[]>
  /** 점수 산출 로직은 아직 없다. answers는 받되 결과는 seed 고정값이다. */
  result(answers: number[]): Promise<CompatResult>
}

/** 여행 성향 테스트. 비회원도 쓰는 콘텐츠라 userId를 받지 않는다. */
export interface TravelStyleRepository {
  questions(): Promise<QuizQuestion[]>
  list(): Promise<TravelStyle[]>
  /** 없는 코드면 null. 공유 URL로 아무 값이나 들어올 수 있다. */
  get(code: StyleCode): Promise<TravelStyle | null>
}

/**
 * 공공데이터(TourAPI)에서 온 지역별 관광지·맛집. 비회원도 보는 콘텐츠라 userId를 받지 않는다.
 *
 * 미적재 지역을 즉석 적재하는 read-through는 supabase 구현 안에 있다.
 * 화면은 그 존재를 모르고, 느릴 수 있다는 것만 안다.
 */
export interface AttractionRepository {
  listByRegion(
    code: string,
    opts?: { type?: 12 | 39; limit?: number },
  ): Promise<Attraction[]>
  /** 없는 시군구 코드면 null. 공유 URL로 아무 값이나 들어올 수 있다. */
  getRegion(code: string): Promise<RegionSummary | null>
  /** sitemap과 지역 디렉터리용. 적재 완료된 지역만 반환한다. */
  listIngestedRegions(): Promise<RegionSummary[]>
}
