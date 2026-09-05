/**
 * 약관·개인정보처리방침이 쓰는 사실관계의 단일 원본.
 *
 * 여기 적힌 수집 항목은 실제 코드와 반드시 일치해야 한다. 방침에만 있고 코드에 없거나
 * 그 반대이면 그 자체로 법 위반이다. 지금 기준은 lib/auth/validate.ts의 SignUpFields와
 * supabase/schema.sql의 profiles 테이블이다. 둘 중 하나를 고치면 여기도 고친다.
 */

/**
 * 방침 변경 시 이 날짜를 올린다. 내용을 고치고 날짜를 그대로 두면
 * 이용자가 무엇이 언제 바뀌었는지 알 수 없다.
 */
export const POLICY_EFFECTIVE_DATE = '2026.09.04'

/**
 * 운영자 정보. 개인정보 보호법은 개인정보처리자와 보호책임자를 밝히도록 한다.
 * 이름과 연락처는 생략할 수 없다 — 없으면 이용자가 열람·삭제를 요구할 통로가 사라진다.
 *
 * 사업자등록을 하게 되면 type을 상호로 바꾸고 등록번호·주소 항목을 추가한다.
 * 유료 기능을 열 때는 통신판매업 신고번호도 함께 표시해야 한다.
 */
export const OPERATOR = {
  type: '개인',
  name: '임준수',
  /** 문의·열람·삭제 요청을 실제로 받는 주소. */
  email: 'yimjunsu@gmail.com',
} as const

/** 가입 시 이용자가 직접 입력하는 항목. SignUpFields와 1:1이다. */
export const COLLECTED_FIELDS = [
  {
    item: '이름',
    purpose: '회원 식별, 여행방 안에서의 표시 이름 기본값',
    required: true,
  },
  {
    item: '이메일',
    purpose: '회원 식별, 로그인, 공지·문의 응대',
    required: true,
  },
  {
    item: '비밀번호',
    purpose: '본인 확인. 복호화할 수 없는 형태로 암호화해 저장',
    required: true,
  },
  {
    item: '전화번호',
    purpose: '본인 확인, 계정 분실 시 확인 수단',
    required: true,
  },
  {
    item: '생년월일',
    purpose: '만 14세 미만 가입 제한 확인',
    required: true,
  },
] as const

/** 이용자가 입력하지 않아도 서비스 이용 과정에서 쌓이는 정보. */
export const AUTO_COLLECTED = [
  '가입 경로(이메일·소셜) 및 가입 일시',
  '서비스 이용 기록, 접속 로그, 접속 IP',
  '로그인 상태 유지를 위한 쿠키',
  '광고 식별자 및 광고 노출·클릭 기록 (광고 도입 시)',
] as const

/**
 * 처리위탁 현황.
 *
 * 데이터베이스는 Seoul(ap-northeast-2) 리전에 있어 개인정보는 국내에 저장된다.
 * 다만 수탁사 자체는 해외 법인이라 그 사실을 숨기지 않고 적는다.
 */
export const PROCESSORS = [
  {
    name: 'Supabase Inc.',
    task: '회원 데이터베이스 운영 및 인증',
    note: '국내(서울) 리전에 저장. 사업자는 미국 법인',
  },
  {
    name: 'Vercel Inc.',
    task: '웹사이트 호스팅 및 서비스 제공',
    note: '접속 로그가 해외 서버에서 처리될 수 있음',
  },
  {
    name: 'Google LLC',
    task: '광고 게재 및 성과 측정',
    note: '광고 도입 시. 쿠키 기반 맞춤형 광고 포함',
  },
] as const

/**
 * 만 14세 미만은 법정대리인 동의가 필요해, 대신 가입 자체를 막는다.
 * 실제 검증이 이 값을 쓰므로 원본은 검증 쪽에 두고 여기서는 다시 내보내기만 한다 —
 * 방침에 적힌 나이와 코드가 막는 나이가 갈라지면 방침이 거짓말이 된다.
 */
export { MIN_SIGNUP_AGE } from '@/lib/auth/validate'

/**
 * 온보딩을 마치지 않은 계정의 보관 기간.
 *
 * 소셜 로그인은 인증이 끝나는 순간 프로필 행이 생긴다 — 우리 동의 화면을 보여주기
 * 전이다. 그래서 "동의를 받지 않았는데 이름·이메일은 갖고 있는" 상태가 존재하고,
 * 방침 §3·§8이 그 상태를 언제 끝내는지 말해야 한다.
 *
 * 실제로 지우는 코드는 app/api/cron/cleanup-pending이고 같은 상수를 쓴다.
 * 여기서 다시 내보내기만 하는 이유는 MIN_SIGNUP_AGE와 같다 — 방침에 적은 기간과
 * 실제로 지우는 기간이 갈라지면 방침이 거짓말이 된다.
 */
export {
  PENDING_ACCOUNT_RETENTION_HOURS,
  PENDING_ACCOUNT_RETENTION_TEXT,
} from '@/lib/auth/retention'
