-- 온보딩 게이트를 DB까지 내린다 (2026-08-30)
-- 최종 리뷰 Critical 1·2 대응.
--
-- 0003이 onboarded_at을 만들면서 profiles 컬럼 하나가 처음으로 "보안 경계"가 됐다.
-- 그전까지는 어떤 보안 판정도 profiles를 읽지 않아 행 단위 RLS만으로 충분했다.
-- 이제는 두 구멍이 생겼다.

-- ── 1. 컬럼 잠금 ────────────────────────────────────────────────────────────
-- RLS는 어느 행인지만 제한할 뿐 어느 컬럼인지는 제한하지 못한다.
-- "본인 프로필 수정" 정책은 본인 행 전체를 열어 두므로, 로그인한 사용자가
-- 공개 anon 키와 자기 토큰으로 PostgREST를 직접 불러
--   PATCH /rest/v1/profiles?id=eq.<본인> {"onboarded_at": "..."}
-- 라고 쓰면 동의 화면을 거치지 않고 게이트를 스스로 연다. is_admin도 같은 방법으로
-- 켤 수 있다. 사용자가 직접 쓸 수 있는 타임스탬프는 동의 기록으로서 값이 없다.
--
-- trips·trip_members·settlements가 이미 같은 이유로 이렇게 잠겨 있다.
revoke update on public.profiles from authenticated, anon;

-- 사용자가 직접 고쳐도 되는 것만 연다. birth_date·onboarded_at·provider·
-- completed_trip_count·is_admin은 앱과 트리거만 쓴다.
grant update (name, phone) on public.profiles to authenticated;

-- 온보딩 저장은 앱이 anon 키로 하므로 위 grant만으로는 막힌다.
-- security definer 함수로 좁게 연다 — 나이 검증까지 여기서 한 번 더 본다.
-- 화면과 서버 액션이 이미 검증하지만, 이 함수는 네트워크에서 직접 불릴 수 있다.
create or replace function public.complete_onboarding(birth_date_input date)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target uuid := auth.uid();
begin
  if target is null then
    raise exception '로그인이 필요합니다.';
  end if;

  if birth_date_input is null or birth_date_input > current_date then
    raise exception '생년월일이 올바르지 않습니다.';
  end if;

  -- 만 14세 미만은 법정대리인 동의가 있어야 개인정보를 수집할 수 있다.
  -- 화면·서버 액션과 같은 기준이며, 여기가 마지막 방어선이다.
  if birth_date_input > (current_date - interval '14 years') then
    raise exception '만 14세 미만은 가입할 수 없습니다.';
  end if;

  update public.profiles
     set birth_date = birth_date_input,
         -- 이미 동의한 사람의 시각은 덮어쓰지 않는다.
         -- 덮어쓰면 "언제 동의했나"의 답이 바뀐다.
         onboarded_at = coalesce(onboarded_at, now())
   where id = target;
end;
$$;

grant execute on function public.complete_onboarding(date) to authenticated;

-- ── 2. 쓰기 경로에 온보딩 확인 ──────────────────────────────────────────────
-- 앱의 세션 게이트(lib/auth/session.ts)는 Next.js를 거치는 요청에만 적용된다.
-- Supabase PostgREST는 두 번째 정문이고, 지금까지 모든 정책·RPC가 auth.uid()만
-- 보고 onboarded_at을 보지 않았다 — 동의하지 않은 사용자가 브라우저에서 직접
-- 여행방을 만들거나 참여할 수 있었다.
create or replace function public.is_onboarded()
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
     where id = auth.uid() and onboarded_at is not null
  );
$$;

grant execute on function public.is_onboarded() to authenticated, anon;

-- 쓰기 정책에 건다. 읽기 경로는 후속으로 남긴다 — 동의 없이 데이터가 쌓이는
-- 것부터 막는다.
-- 이름은 기존 정책과 정확히 같아야 한다. 다르면 옛 정책이 그대로 남아
-- 온보딩 확인 없는 경로가 살아 있게 된다.
drop   policy if exists "본인 명의로만 여행방 생성" on public.trips;
create policy "본인 명의로만 여행방 생성" on public.trips
  for insert with check (created_by = auth.uid() and public.is_onboarded());

drop   policy if exists "멤버만 일정 추가" on public.itinerary_items;
create policy "멤버만 일정 추가" on public.itinerary_items
  for insert with check (public.is_trip_member(trip_id) and public.is_onboarded());

drop   policy if exists "멤버만 일정 삭제" on public.itinerary_items;
create policy "멤버만 일정 삭제" on public.itinerary_items
  for delete using (public.is_trip_member(trip_id) and public.is_onboarded());

-- ── 3. 멤버가 되는 두 입구를 막는다 ────────────────────────────────────────
-- 쓰기 RPC는 전부 security definer라 위 정책을 타지 않는다. 그렇다고 일곱 개를
-- 다 고칠 필요는 없다 — add_expense·remove_expense·settle_trip·unsettle_trip·
-- leave_trip은 모두 "그 방의 멤버인가"를 먼저 보고, 멤버가 되는 길은
-- create_trip(방을 만들며 host로 들어감)과 join_trip_by_code 둘뿐이다.
-- 이 둘만 막으면 온보딩하지 않은 사람은 어떤 방의 멤버도 될 수 없고,
-- 나머지 RPC는 그에게 도달 불가능해진다.
--
-- 아래 두 함수는 schema.sql의 본문을 그대로 옮기고 온보딩 확인 한 줄만 더했다.

create or replace function public.join_trip_by_code(
  check_code  text,
  member_name text
)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  target public.trips%rowtype;
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  -- 동의하지 않은 사람이 방에 들어오면 그 순간부터 개인데이터가 쌓인다.
  if not public.is_onboarded() then
    raise exception 'NOT_ONBOARDED';
  end if;

  -- unique 인덱스는 대소문자를 구분해 동일 코드가 두 벌 있을 수 있다. order by +
  -- limit 1로 어느 쪽이든 결정적으로 하나만 고른다.
  select * into target from public.trips
   where upper(invite_code) = upper(btrim(check_code))
   order by created_at limit 1;
  if not found then
    return null;
  end if;

  -- 정산이 끝난 방에 새 사람이 들어오면 확정된 금액의 전제가 깨진다.
  if target.settled_at is not null then
    raise exception 'TRIP_ALREADY_SETTLED';
  end if;

  -- 두 번 눌러도 멤버가 겹치지 않는다.
  insert into public.trip_members (trip_id, user_id, display_name, role)
  values (target.id, auth.uid(), member_name, 'member')
  on conflict (trip_id, user_id) do nothing;

  return target.id;
end;
$$;

create or replace function public.create_trip(
  check_name         text,
  check_region       text,
  check_start_date   date,
  check_end_date     date,
  check_cover_theme  text,
  check_invite_code  text,
  check_display_name text
)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  new_trip_id uuid;
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  -- 동의하지 않은 사람이 방을 만들면 그 순간부터 개인데이터가 쌓인다.
  if not public.is_onboarded() then
    raise exception 'NOT_ONBOARDED';
  end if;

  -- trips_date_order 체크와 upper(invite_code) 유니크 인덱스는 표 자체의 제약이라
  -- 여기서 다시 검사하지 않는다. invite_code 충돌은 23505로 그대로 올라가야
  -- 호출부(supabaseTripRepo.create)의 재시도 루프가 계속 동작한다 — 여기서
  -- 잡아버리면 호출부가 재시도할 신호를 잃는다.
  insert into public.trips (
    name, region, start_date, end_date, cover_theme, invite_code, created_by
  )
  values (
    check_name, check_region, check_start_date, check_end_date,
    check_cover_theme, check_invite_code, auth.uid()
  )
  returning id into new_trip_id;

  insert into public.trip_members (trip_id, user_id, display_name, role, is_driver)
  values (new_trip_id, auth.uid(), check_display_name, 'host', false);

  return new_trip_id;
end;
$$;
