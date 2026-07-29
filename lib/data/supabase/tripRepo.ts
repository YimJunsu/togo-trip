import { createSupabaseServerClient } from '@/lib/supabase/server'
import {
  InvalidInviteCodeError,
  TripAlreadySettledError,
  type TripRepository,
} from '../repositories'
import type { DestinationTheme, Member, Trip } from '../types'

/** DB(snake_case) → 도메인(camelCase). Trip 타입의 단일 매핑 지점. */
type TripRow = {
  id: string
  name: string
  region: string
  start_date: string
  end_date: string
  invite_code: string
  created_by: string
  cover_theme: string
  driver_discount_rate: number
  settled_at: string | null
}

type MemberRow = {
  trip_id: string
  user_id: string
  display_name: string
  role: string
  is_driver: boolean
}

/** postgrest가 unique violation일 때 주는 SQLSTATE. invite_code 재시도 판단에 쓴다. */
const UNIQUE_VIOLATION = '23505'
const CREATE_MAX_ATTEMPTS = 5

function toTrip(row: TripRow): Trip {
  return {
    id: row.id,
    name: row.name,
    region: row.region,
    startDate: row.start_date,
    endDate: row.end_date,
    inviteCode: row.invite_code,
    createdBy: row.created_by,
    coverTheme: row.cover_theme as DestinationTheme,
    // numeric은 postgres-js가 문자열로 줄 수 있다. 계산에 쓰이므로 반드시 수로 만든다.
    driverDiscountRate: Number(row.driver_discount_rate),
    settledAt: row.settled_at,
  }
}

function toMember(row: MemberRow): Member {
  return {
    tripId: row.trip_id,
    userId: row.user_id,
    displayName: row.display_name,
    role: row.role as Member['role'],
    isDriver: row.is_driver,
  }
}

const INVITE_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const INVITE_CODE_LENGTH = 6

/** 헷갈리는 글자(0/O, 1/I)를 뺀 6자리. 입 밖으로 불러줄 수 있어야 한다. */
function generateInviteCode(): string {
  return Array.from(
    { length: INVITE_CODE_LENGTH },
    () =>
      INVITE_CODE_ALPHABET[
        Math.floor(Math.random() * INVITE_CODE_ALPHABET.length)
      ],
  ).join('')
}

export const supabaseTripRepo: TripRepository = {
  async list(userId) {
    const supabase = await createSupabaseServerClient()
    // RLS가 이미 남의 방을 가리지만, 명시적으로 걸어 두면 정책이 느슨해져도 안전하다.
    const { data, error } = await supabase
      .from('trips')
      .select('*, trip_members!inner(user_id)')
      .eq('trip_members.user_id', userId)
      .order('start_date', { ascending: false })
      .returns<TripRow[]>()
    if (error) throw error
    return data.map(toTrip)
  },

  async get(id) {
    const supabase = await createSupabaseServerClient()
    const { data } = await supabase
      .from('trips')
      .select('*')
      .eq('id', id)
      .maybeSingle<TripRow>()
    return data ? toTrip(data) : null
  },

  async create(userId, displayName, input) {
    const supabase = await createSupabaseServerClient()

    // invite_code는 upper() 유니크 인덱스가 걸려 있다(schema.sql). 충돌은 흔치 않지만
    // 6자리 32진수라 방 수가 늘수록 실제로 일어난다 — 실패로 끝내지 않고 새 코드로 다시 쓴다.
    let tripRow: TripRow | null = null
    let lastError: { code?: string; message: string } | null = null
    for (let attempt = 0; attempt < CREATE_MAX_ATTEMPTS; attempt++) {
      const { data, error } = await supabase
        .from('trips')
        .insert({
          name: input.name,
          region: input.region,
          start_date: input.startDate,
          end_date: input.endDate,
          cover_theme: input.coverTheme,
          invite_code: generateInviteCode(),
          created_by: userId,
        })
        .select('*')
        .single<TripRow>()
      if (!error) {
        tripRow = data
        break
      }
      lastError = error
      // 초대코드 충돌이 아닌 오류(권한, 필수값 등)는 재시도해도 똑같이 실패하니 즉시 던진다.
      if (error.code !== UNIQUE_VIOLATION) throw error
    }
    if (!tripRow) {
      throw (lastError ?? new Error('여행방 생성에 실패했습니다.'))
    }

    // host 행은 별도 insert다. trips의 select 정책이 created_by도 보게 되어 있어
    // 멤버 행이 아직 없는 이 시점에도 위 select가 통과한다. (supabase/schema.sql)
    // role은 반드시 'host'를 명시한다 — 컬럼 기본값은 'member'이고, insert 정책은
    // role = 'host'인 행만 허용해 기본값에 맡기면 정책 위반으로 거절당한다.
    const { error: memberError } = await supabase.from('trip_members').insert({
      trip_id: tripRow.id,
      user_id: userId,
      display_name: displayName,
      role: 'host',
    })
    if (memberError) throw memberError

    return toTrip(tripRow)
  },

  async joinByCode(_userId, displayName, code) {
    const supabase = await createSupabaseServerClient()

    // 비멤버는 RLS 때문에 trips를 읽을 수 없어 코드 대조가 불가능하다.
    // security definer 함수로 좁게 뚫었다. (supabase/schema.sql)
    const { data, error } = await supabase.rpc('join_trip_by_code', {
      check_code: code,
      member_name: displayName,
    })
    if (error) {
      if (error.message.includes('TRIP_ALREADY_SETTLED')) {
        throw new TripAlreadySettledError()
      }
      throw error
    }
    if (!data) throw new InvalidInviteCodeError()

    const trip = await this.get(data as string)
    if (!trip) throw new InvalidInviteCodeError()
    return trip
  },

  async listMembers(tripId) {
    const supabase = await createSupabaseServerClient()
    const { data, error } = await supabase
      .from('trip_members')
      .select('*')
      .eq('trip_id', tripId)
      .order('joined_at')
      .returns<MemberRow[]>()
    if (error) throw error
    return data.map(toMember)
  },

  async setDriver(tripId, userId, isDriver) {
    const supabase = await createSupabaseServerClient()
    // update 정책은 "방장 + 미확정"만 통과시킨다(schema.sql). RLS는 조건에 안 맞는
    // 행을 걸러낼 뿐 오류를 던지지 않으므로, select로 실제 갱신된 행을 돌려받아
    // 0행이면 원인을 직접 되짚는다 — 그래야 mock처럼 TripAlreadySettledError를 던질 수 있다.
    const { data, error } = await supabase
      .from('trip_members')
      .update({ is_driver: isDriver })
      .eq('trip_id', tripId)
      .eq('user_id', userId)
      .select('*')
      .returns<MemberRow[]>()
    if (error) throw error
    if (data.length === 0) {
      const trip = await this.get(tripId)
      if (!trip) throw new InvalidInviteCodeError()
      if (trip.settledAt) throw new TripAlreadySettledError()
      throw new Error('이 여행방의 멤버가 아닙니다.')
    }
    return this.listMembers(tripId)
  },

  async setDiscountRate(tripId, rate) {
    if (!Number.isFinite(rate) || rate < 0 || rate > 0.5) {
      throw new Error('할인율은 0% ~ 50% 사이여야 합니다.')
    }
    const supabase = await createSupabaseServerClient()
    // setDriver와 같은 이유로 select해서 실제 갱신 행 수를 직접 확인한다.
    const { data, error } = await supabase
      .from('trips')
      .update({ driver_discount_rate: rate })
      .eq('id', tripId)
      .select('*')
      .returns<TripRow[]>()
    if (error) throw error
    if (data.length === 0) {
      const trip = await this.get(tripId)
      if (!trip) throw new InvalidInviteCodeError()
      if (trip.settledAt) throw new TripAlreadySettledError()
      // requireHost가 이미 방장인지 확인한 뒤라 여기 도달할 일은 정상 흐름에는 없다.
      throw new Error('여행방을 수정할 권한이 없습니다.')
    }
    return toTrip(data[0])
  },
}
