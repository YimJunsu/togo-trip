import { createSupabaseServerClient } from '@/lib/supabase/server'
import {
  DuplicateEmailError,
  InvalidCredentialsError,
  type AuthRepository,
  type SignUpInput,
} from '../repositories'
import type { AuthProvider, Profile } from '../types'

/**
 * Supabase Auth 구현. signUp/signIn은 Supabase 인증 클라이언트를 거치므로
 * 세션 쿠키가 여기서 심긴다 — actions.ts의 createSession(userId)는 supabase 모드에서
 * 무동작이 된다(lib/auth/session.ts). 밖으로는 mock과 똑같이 Profile만 나간다.
 *
 * profiles 행은 auth.users insert 트리거(supabase/schema.sql)가 만든다.
 */

/** DB(snake_case) → 도메인(camelCase). Profile 타입의 단일 매핑 지점. */
type ProfileRow = {
  id: string
  name: string
  email: string
  phone: string
  birth_date: string | null
  provider: string
  completed_trip_count: number
  created_at: string
}

function toProfile(row: ProfileRow): Profile {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    birthDate: row.birth_date ?? '',
    provider: row.provider as AuthProvider,
    completedTripCount: row.completed_trip_count,
    createdAt: row.created_at,
  }
}

async function fetchProfile(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  id: string,
): Promise<Profile | null> {
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .maybeSingle<ProfileRow>()
  return data ? toProfile(data) : null
}

export const supabaseAuthRepo: AuthRepository = {
  async signUp(input: SignUpInput): Promise<Profile> {
    const supabase = await createSupabaseServerClient()
    const { data, error } = await supabase.auth.signUp({
      email: input.email.trim().toLowerCase(),
      password: input.password,
      options: {
        data: {
          name: input.name.trim(),
          phone: input.phone,
          birthDate: input.birthDate,
        },
      },
    })
    // 중복 이메일을 Supabase가 알리는 방식이 설정에 따라 둘로 갈린다:
    //   Confirm email 꺼짐 → 422 user_already_exists 에러
    //   Confirm email 켜짐 → 에러 없이 identities가 빈 user (이메일 열거 방지 난독화)
    // 어느 쪽이든 사용자에겐 같은 뜻이므로 함께 잡는다.
    if (error) {
      if (error.code === 'user_already_exists') throw new DuplicateEmailError()
      throw error
    }
    if (data.user && data.user.identities?.length === 0) {
      throw new DuplicateEmailError()
    }
    if (!data.user) throw new Error('가입에 실패했습니다.')

    const profile = await fetchProfile(supabase, data.user.id)
    if (!profile) throw new Error('프로필 생성에 실패했습니다.')
    return profile
  },

  async signIn(email: string, password: string): Promise<Profile> {
    const supabase = await createSupabaseServerClient()
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    })
    // 어느 쪽이 틀렸는지 구분해 알리지 않는다 (mock과 동일).
    if (error || !data.user) throw new InvalidCredentialsError()

    const profile = await fetchProfile(supabase, data.user.id)
    if (!profile) throw new InvalidCredentialsError()
    return profile
  },

  async findById(id: string): Promise<Profile | null> {
    const supabase = await createSupabaseServerClient()
    return fetchProfile(supabase, id)
  },

  async isEmailTaken(email: string): Promise<boolean> {
    // RLS가 남의 profiles 행 조회를 막으므로 직접 select할 수 없다.
    // boolean 하나만 돌려주는 security definer 함수를 거친다. (supabase/schema.sql)
    const supabase = await createSupabaseServerClient()
    const { data, error } = await supabase.rpc('email_taken', {
      check_email: email.trim().toLowerCase(),
    })
    // 실패를 "사용 가능"으로 삼키면 안 된다 — 그러면 이미 있는 이메일에도
    // "사용할 수 있다"고 단언하게 된다. 모르면 모른다고 던지고, 호출부가 침묵한다.
    if (error) throw error
    return data === true
  },
}
