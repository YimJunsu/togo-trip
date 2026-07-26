import seed from '@/mocks/accounts.json'
import {
  hashPassword,
  hashPasswordSync,
  verifyPassword,
} from '@/lib/auth/password'
import {
  DuplicateEmailError,
  InvalidCredentialsError,
  type AuthRepository,
  type SignUpInput,
} from '../repositories'
import type { Account, Profile } from '../types'

/**
 * mock 회원 저장소. seed의 평문 비밀번호를 모듈 로드 시 해싱한다 —
 * seed는 실제 데이터가 아니므로 평문으로 두는 편이 읽기 쉽다.
 * Supabase 전환 시 이 파일과 accounts.json은 함께 사라진다.
 */

type SeedAccount = Omit<Account, 'passwordHash'> & { password: string }

/**
 * 동기로 채운다. 비동기로 채우면 findProfile()이 첫 호출에서 빈 배열을 보게 된다.
 * 5건이라 로드 시 한 번 드는 비용이 무시할 만하다.
 */
const accounts: Account[] = (seed as SeedAccount[]).map(
  ({ password, ...rest }) => ({ ...rest, passwordHash: hashPasswordSync(password) }),
)

/** 자격증명을 뗀 공개 프로필. 밖으로 나가는 건 항상 이것뿐이다. */
function toProfile({ passwordHash: _, ...profile }: Account): Profile {
  return profile
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

export const mockAuthRepo: AuthRepository = {
  async signUp(input: SignUpInput) {
    const email = normalizeEmail(input.email)
    if (accounts.some((a) => normalizeEmail(a.email) === email)) {
      throw new DuplicateEmailError()
    }
    const account: Account = {
      id: `usr-${Date.now()}`,
      name: input.name.trim(),
      email,
      phone: input.phone,
      birthDate: input.birthDate,
      provider: 'email',
      completedTripCount: 0,
      createdAt: new Date().toISOString(),
      passwordHash: await hashPassword(input.password),
    }
    accounts.push(account)
    return toProfile(account)
  },

  async signIn(email, password) {
    const found = accounts.find(
      (a) => normalizeEmail(a.email) === normalizeEmail(email),
    )
    if (!found || !(await verifyPassword(password, found.passwordHash))) {
      throw new InvalidCredentialsError()
    }
    return toProfile(found)
  },

  async findById(id) {
    const found = accounts.find((a) => a.id === id)
    return found ? toProfile(found) : null
  },

  async isEmailTaken(email) {
    const target = normalizeEmail(email)
    return accounts.some((a) => normalizeEmail(a.email) === target)
  },
}

/** 궁합 결과가 두 사람의 프로필을 동기적으로 필요로 한다. */
export function findProfile(id: string): Profile | undefined {
  const found = accounts.find((a) => a.id === id)
  return found ? toProfile(found) : undefined
}
