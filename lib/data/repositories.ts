import type {
  CompatResult,
  Destination,
  DestinationFilter,
  Expense,
  Member,
  Profile,
  Place,
  QuizQuestion,
  Settlement,
  StyleCode,
  TravelStyle,
  Trip,
} from './types'

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
  joinByCode(userId: string, displayName: string, code: string): Promise<Trip>
  listMembers(tripId: string): Promise<Member[]>
}

export interface ExpenseRepository {
  listByTrip(tripId: string): Promise<Expense[]>
  add(input: AddExpenseInput): Promise<Expense>
}

export interface SettlementRepository {
  /** 지금은 계산하지 않는다. seed에 미리 담긴 송금 리스트를 반환한다. */
  listByTrip(tripId: string): Promise<Settlement[]>
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
