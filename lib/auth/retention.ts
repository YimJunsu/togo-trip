/**
 * 온보딩을 마치지 않은 계정의 보관 규칙.
 *
 * 구글 인증이 끝나는 순간 트리거가 profiles 행을 만든다. 우리 동의 화면을 보여주기
 * 전이다 — 구글 동의 화면에서 "계속"만 누르고 뒤로 가도 이름과 이메일이 남는다.
 * 그 상태로 두면 동의 없이 수집한 개인정보를 무기한 보관하게 된다.
 *
 * 만 14세 미만은 더 무겁다. 법정대리인 동의 없이는 수집 자체가 안 되는데,
 * 검증에 막혀 온보딩을 마칠 수 없으므로 이 상태에 영영 머문다.
 *
 * 값의 원본은 여기 하나다. lib/legal/policy.ts가 이걸 다시 내보내 방침 화면이
 * 같은 숫자를 쓴다 — 방침에 적은 기간과 실제로 지우는 기간이 갈라지면 방침이
 * 거짓말이 된다. (MIN_SIGNUP_AGE가 쓰는 것과 같은 방식이다.)
 */

/**
 * 온보딩 미완료 계정을 두는 시간.
 *
 * 짧게 잡아도 잃는 것이 없다. 온보딩은 저장되는 중간 상태가 없어서, 지워진 뒤
 * 다시 구글로 로그인하면 처음부터 똑같이 진행된다.
 */
export const PENDING_ACCOUNT_RETENTION_HOURS = 24

/** 방침 화면이 그대로 찍는 문구. 숫자를 두 번 적지 않기 위해 여기서 만든다. */
export const PENDING_ACCOUNT_RETENTION_TEXT = `${PENDING_ACCOUNT_RETENTION_HOURS}시간`

const HOUR_MS = 60 * 60 * 1000

/**
 * 이 시각보다 먼저 만들어진 미완료 계정이 삭제 대상이다.
 *
 * UTC 밀리초로만 계산한다. 로컬 시간대를 거치면 서머타임이 있는 지역에서 하루가
 * 23시간이나 25시간이 되어 경계가 흔들린다.
 */
export function pendingCutoff(now: Date): string {
  return new Date(
    now.getTime() - PENDING_ACCOUNT_RETENTION_HOURS * HOUR_MS,
  ).toISOString()
}
