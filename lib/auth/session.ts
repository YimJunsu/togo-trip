import { cookies } from 'next/headers'
import { notFound, redirect } from 'next/navigation'
import { authRepo, tripRepo } from '@/lib/data'
import type { Profile } from '@/lib/data/types'
import { createSupabaseServerClient } from '@/lib/supabase/server'

/**
 * 세션 seam. 화면은 이 파일의 함수만 쓰고 mock인지 Supabase인지 몰라야 한다.
 *
 * mock: 서명 없는 userId를 담은 httpOnly 쿠키. 브라우저에서 고치면 사칭되는 게 한계다.
 * supabase: Supabase Auth가 서명된 JWT를 자기 쿠키에 심고 검증한다 — createSession은
 *   인증 클라이언트가 이미 세션을 세웠으므로 무동작이 된다.
 */

const useSupabase = process.env.NEXT_PUBLIC_DATA_SOURCE === 'supabase'

const SESSION_COOKIE = 'togo_session'
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30

export async function createSession(userId: string): Promise<void> {
  // supabase 모드: signUp/signInWithPassword가 이미 세션 쿠키를 심었다. 할 일 없음.
  if (useSupabase) return

  const store = await cookies()
  store.set(SESSION_COOKIE, userId, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: MAX_AGE_SECONDS,
  })
}

export async function destroySession(): Promise<void> {
  if (useSupabase) {
    const supabase = await createSupabaseServerClient()
    await supabase.auth.signOut()
    return
  }

  const store = await cookies()
  store.delete(SESSION_COOKIE)
}

/**
 * 로그인한 사용자. 온보딩을 마치지 않았으면 null이다 — 앱 전체가 그 사람을
 * 로그인하지 않은 것으로 본다.
 *
 * 구글은 생년월일도 동의도 주지 않으므로 인증만으로는 서비스를 쓸 수 없다.
 * 여기서 한 번 거르면 화면마다 온보딩 여부를 따질 필요가 없다.
 *
 * 온보딩 페이지 자신은 이 함수를 쓰면 안 된다 — /login으로 튕겨 무한 루프가 된다.
 * 그 페이지는 getPendingUser()를 쓴다.
 */
export async function getUser(): Promise<Profile | null> {
  const user = await getPendingUser()
  if (!user) return null
  return user.onboardedAt ? user : null
}

/**
 * 인증은 됐지만 온보딩은 아직일 수 있는 사용자. 온보딩 페이지와 그 액션만 쓴다.
 * 다른 곳에서 쓰면 동의하지 않은 사람에게 서비스를 열어 주게 된다 — getUser()를 쓸 것.
 */
export async function getPendingUser(): Promise<Profile | null> {
  if (useSupabase) {
    const supabase = await createSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return null
    return authRepo.findById(user.id)
  }

  const store = await cookies()
  const userId = store.get(SESSION_COOKIE)?.value
  if (!userId) return null
  return authRepo.findById(userId)
}

/** 보호할 페이지 첫 줄에 둔다. 로그인하지 않았으면 여기서 멈춘다. */
export async function requireUser(): Promise<Profile> {
  const user = await getUser()
  if (!user) redirect('/login')
  return user
}

/** requireMember/requireMemberPage가 공유하는 멤버십 조회. 실패 시 반응은 호출부가 정한다. */
async function checkMembership(
  tripId: string,
): Promise<{ user: Profile; isMember: boolean }> {
  const user = await requireUser()
  const members = await tripRepo.listMembers(tripId)
  return { user, isMember: members.some((m) => m.userId === user.id) }
}

/**
 * Server Action은 페이지 게이트를 거치지 않고 id로 바로 호출될 수 있다(네트워크 레벨).
 * 로그인만으로는 부족하다 — tripId에 속한 멤버인지까지 여기서 다시 확인해야
 * 다른 사람의 여행방에 데이터를 쓰는 걸 막는다. 여행방 데이터를 바꾸는 모든 액션의
 * 첫 줄에 둔다.
 */
export async function requireMember(tripId: string): Promise<Profile> {
  const { user, isMember } = await checkMembership(tripId)
  if (!isMember) throw new Error('이 여행방의 멤버가 아닙니다.')
  return user
}

/**
 * 여행방 읽기 페이지(상세/정산/장소) 첫 줄에 둔다. 멤버가 아니라는 사실을 그대로 던지면
 * "여행방이 없다"와 "내 것이 아니다"를 구분할 수 있게 돼, 초대코드를 몰라도 남의 방이
 * 존재한다는 것 자체를 알아낼 수 있다 — 그래서 404로 감춰 구분이 안 되게 한다.
 */
export async function requireMemberPage(tripId: string): Promise<Profile> {
  const { user, isMember } = await checkMembership(tripId)
  if (!isMember) notFound()
  return user
}

/**
 * 방장 전용 액션(운전자 지정·할인율·정산 확정·취소)의 첫 줄에 둔다.
 * requireMember와 같은 이유다 — Server Action은 페이지 게이트를 거치지 않고
 * 네트워크 레벨에서 직접 호출될 수 있다.
 */
export async function requireHost(tripId: string): Promise<Profile> {
  const user = await requireUser()
  const members = await tripRepo.listMembers(tripId)
  const me = members.find((m) => m.userId === user.id)
  if (me?.role !== 'host') throw new Error('방장만 할 수 있습니다.')
  return user
}
