/**
 * 도메인 타입의 단일 출처. PROJECT_SPEC.md §3이 원본이다.
 * Destination / QuizQuestion / CompatResult는 SPEC에 타입 정의가 없어 화면 요구에 맞춰 여기서 정의한다.
 */

export type DestinationTheme =
  'sea' | 'mountain' | 'city' | 'healing' | 'activity'
export type BudgetLevel = 'low' | 'mid' | 'high'
export type Season = 'spring' | 'summer' | 'autumn' | 'winter'
export type QuizAxis = 'plan' | 'morning' | 'activity' | 'budget'

export type AuthProvider = 'email' | 'kakao' | 'google'

export type Profile = {
  id: string
  /** 실명. 가입 시 1회 입력한다. 여행방 안의 표시 이름은 Member.displayName이다. */
  name: string
  email: string
  /** 숫자만. 하이픈은 저장하지 않는다. */
  phone: string
  birthDate: string
  provider: AuthProvider
  /**
   * 정산 완료 시 +1, 취소 시 -1(0 미만으로는 내려가지 않는다). Supabase에서는
   * settle_trip/unsettle_trip(schema.sql)이 트랜잭션 안에서 증감시킨다.
   * mock(lib/data/mock)은 이 값을 건드리지 않는다 — 아직 어느 화면도 렌더링하지
   * 않는 값이라 지금은 두 구현이 갈려도 눈에 띄지 않는다는 걸 알려 둔다.
   */
  completedTripCount: number
  createdAt: string
  travelStyle?: QuizResult
}

/**
 * 자격증명이 붙은 회원. authRepo 안에서만 존재한다.
 * AuthRepository의 어떤 메서드도 이 타입을 반환하지 않는다 —
 * Profile이 서버 컴포넌트에서 클라이언트 prop으로 넘어가면 HTML에 직렬화되기 때문이다.
 */
export type Account = Profile & { passwordHash: string }

export type Trip = {
  id: string
  name: string
  region: string
  startDate: string
  endDate: string
  inviteCode: string
  createdBy: string
  coverTheme: DestinationTheme
  /** 운전자 할인율. 0 ~ 0.5. 계산 입력이므로 확정 시 지출과 함께 잠긴다. */
  driverDiscountRate: number
  /** null이면 진행 중. 값이 있으면 잠겨서 지출을 고칠 수 없다. */
  settledAt: string | null
}

export type Member = {
  tripId: string
  userId: string
  /** 이 여행방에서 쓰는 이름. 참여 시 기본값은 Profile.name이다. */
  displayName: string
  role: 'host' | 'member'
  isDriver: boolean
}

export type Expense = {
  id: string
  tripId: string
  payerId: string
  amount: number
  description: string
  category: string
  participantIds: string[]
  createdAt: string
}

/**
 * 날짜별 일정 한 줄. 돈 계산에 들어가지 않아 정산 확정과 무관하다 —
 * 확정된 방에서도 계속 넣고 지울 수 있다.
 */
export type ItineraryItem = {
  id: string
  tripId: string
  /** YYYY-MM-DD. 여행 기간 안이어야 한다 (lib/itinerary/actions.ts가 본다). */
  day: string
  /** HH:MM. 시간을 안 정한 일정도 있어 비어 있을 수 있다. */
  at: string | null
  title: string
  memo: string
  createdAt: string
}

export type Place = {
  id: string
  name: string
  category: string
  lat: number
  lng: number
  isChakan: boolean
  savedToTripId?: string
}

export type QuizResult = {
  userId: string
  answers: number[]
  scores: Record<QuizAxis, number>
}

/**
 * 확정된 송금 리스트. 이것만 저장한다 — 각자의 부담액·할인액(SettleShare)은
 * 저장하지 않고 lib/settle/로 매번 재계산한다. 확정 시 계산 입력이 전부 잠기므로
 * 출력도 불변이고, 저장하면 같은 값을 두 곳에 두게 된다.
 */
export type Settlement = {
  id: string
  tripId: string
  from: string
  to: string
  amount: number
  /** 실제로 송금했는지. 계산으로 알 수 없는 유일한 값이라 저장이 필요하다. */
  isPaid: boolean
}

export type Destination = {
  id: string
  name: string
  region: string
  themes: DestinationTheme[]
  budget: BudgetLevel
  seasons: Season[]
  summary: string
  emoji: string
}

export type DestinationFilter = {
  /** 시도 단위 키('강원', '부산' …). PROVINCE_TO_REGION이 만든다. */
  region?: string
  themes?: DestinationTheme[]
  budget?: BudgetLevel
  season?: Season
}

export type QuizQuestion = {
  id: string
  axis: QuizAxis
  text: string
  options: [QuizOption, QuizOption]
}

export type QuizOption = {
  label: string
  /** 축의 어느 쪽으로 기우는지. 낮을수록 축 이름 쪽(예: plan=계획형), 높을수록 반대쪽(즉흥형). */
  score: number
}

/**
 * 여행 성향 코드. 축마다 글자 하나씩, 순서는 plan·morning·activity·budget으로 고정한다.
 * 이 순서가 곧 공유 URL(/style/PMAS)이라 한 번 나간 뒤에는 바꿀 수 없다.
 */
export type StyleLetter = {
  plan: 'P' | 'F'
  morning: 'M' | 'N'
  activity: 'A' | 'R'
  budget: 'S' | 'L'
}
export type StyleCode = string

export type TravelStyle = {
  code: StyleCode
  /** "나는 ○○ 여행이다"의 ○○. */
  name: string
  tagline: string
  emoji: string
  description: string
  strength: string
  caution: string
  /** 잘 맞는 동행 유형. 같은 파일 안의 다른 code를 가리킨다. */
  matchCode: StyleCode
  matchReason: string
  /** 결과 이미지 생성용 장면 묘사. 화면에는 쓰지 않는다. (scripts/generate-style-assets.mjs) */
  scene: string
}

export type CompatAxisBreakdown = {
  axis: QuizAxis
  label: string
  leftLabel: string
  rightLabel: string
  /** 0~100. 두 사람의 위치. */
  left: number
  right: number
}

/** 궁합 카드는 이름만 쓴다. Profile 전체를 실어 보내면 이메일·전화번호가 브라우저로 나간다. */
export type CompatMember = { id: string; name: string }

export type CompatResult = {
  percent: number
  headline: string
  description: string
  members: [CompatMember, CompatMember]
  breakdown: CompatAxisBreakdown[]
}

/** TourAPI에서 온 개별 스팟. Destination(큐레이션된 시도 단위 목적지)과 층위가 다르다. */
export type Attraction = {
  contentId: string
  /** 12 관광지 · 39 음식점 */
  contentTypeId: 12 | 39
  /** 통계청 시군구 5자리 */
  regionCode: string
  title: string
  addr: string | null
  /** 좌표가 없는 건이 있다. 목록 표시에는 지장이 없어 버리지 않는다. */
  coords: [number, number] | null
  imageUrl: string | null
  /** 음식점은 항상 null. detailCommon 호출 비용 때문에 관광지만 채운다. */
  overview: string | null
}

export type RegionSummary = {
  code: string
  name: string
  province: string
  /** null이면 미적재. 지역 페이지의 색인 여부를 이 값이 정한다. */
  ingestedAt: string | null
  attractionCount: number
  restaurantCount: number
}

/** 적재 이력 한 줄. 실패 원인을 확인하는 유일한 창구다. */
export type IngestRun = {
  id: number
  startedAt: string
  finishedAt: string | null
  regionCodes: string[]
  upserted: number
  trigger: 'cron' | 'read_through'
  status: 'running' | 'ok' | 'failed'
  error: string | null
}
