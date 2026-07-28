-- togo-trip 회원 도메인 스키마. Supabase 대시보드 > SQL Editor에 붙여 실행한다.
-- lib/data/types.ts 의 Profile 타입을 테이블로 승격한 것. id는 auth.users.id와 1:1.
--
-- 사전 조건: Auth > Providers > Email 에서 "Confirm email"을 끈다.
--   (지금은 이메일 인증 플로우가 없어, 켜져 있으면 가입 직후 세션이 생기지 않는다.)

-- 1) profiles ---------------------------------------------------------------
create table if not exists public.profiles (
  id                   uuid primary key references auth.users(id) on delete cascade,
  name                 text not null,
  email                text not null,
  phone                text not null default '',
  birth_date           date,
  provider             text not null default 'email',
  completed_trip_count int  not null default 0,
  created_at           timestamptz not null default now()
);

-- 동의 항목은 저장하지 않는다. 이용약관·개인정보 동의는 가입의 전제라 행이 있다는 것
-- 자체가 동의를 뜻하고, 마케팅 수신은 보낼 계획이 없어 받지 않기로 했다.
-- 나중에 발송을 시작하려면 그때 컬럼과 동의 UI를 함께 되살린다.

-- 2) RLS --------------------------------------------------------------------
alter table public.profiles enable row level security;

-- 본인 프로필만 읽고 고칠 수 있다. insert는 아래 트리거(security definer)가 맡는다.
-- ponytail: 궁합 기능이 동행자의 프로필을 교차 조회해야 하나, 그건 trip이 실서버로
--   올라올 때 "같은 여행방 멤버면 읽기" 정책으로 추가한다. 지금은 본인만.
create policy "본인 프로필 읽기" on public.profiles
  for select using (auth.uid() = id);

create policy "본인 프로필 수정" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- 3) 가입 트리거 -------------------------------------------------------------
-- auth.users에 행이 생기면 profiles에 짝을 만든다. 부가정보는 가입 시
-- options.data(raw_user_meta_data)로 넘어온 값을 읽는다.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, name, email, phone, birth_date, provider)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', ''),
    new.email,
    coalesce(new.raw_user_meta_data->>'phone', ''),
    nullif(new.raw_user_meta_data->>'birthDate', '')::date,
    coalesce(new.raw_app_meta_data->>'provider', 'email')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 4) 이메일 중복 조회 -------------------------------------------------------
-- 가입 폼이 제출 전에 미리 알려주기 위한 것. RLS가 남의 profiles 행을 막으므로
-- boolean 하나만 돌려주는 security definer 함수로 좁게 연다 (행 내용은 못 본다).
-- 이 함수는 "그 이메일이 가입돼 있다"를 알려주지만, 제출 시 중복 에러가 이미
-- 같은 사실을 노출하므로 새로 생기는 노출은 없다.
create or replace function public.email_taken(check_email text)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1 from public.profiles where lower(email) = lower(check_email)
  );
$$;

grant execute on function public.email_taken(text) to anon, authenticated;

-- =============================================================================
-- 여행방 · 멤버 · 지출 · 정산
-- lib/data/types.ts 의 Trip / Member / Expense / Settlement 를 테이블로 승격한 것.
-- 설계: docs/superpowers/specs/2026-07-28-invite-and-settlement-design.md
-- =============================================================================

-- 5) trips ------------------------------------------------------------------
create table if not exists public.trips (
  id                   uuid primary key default gen_random_uuid(),
  name                 text not null,
  region               text not null,
  start_date           date not null,
  end_date             date not null,
  invite_code          text not null unique,
  created_by           uuid not null references public.profiles(id) on delete cascade,
  cover_theme          text not null default 'sea',
  -- 계산 입력이므로 확정 시 지출과 함께 잠긴다. 저장하지 않으면 기본값이 바뀔 때
  -- 과거 정산 금액이 소급해서 달라진다.
  driver_discount_rate numeric(4,3) not null default 0.20
    check (driver_discount_rate >= 0 and driver_discount_rate <= 0.5),
  -- null이면 진행 중. 값이 있으면 아래 RLS가 지출 쓰기를 전부 막는다.
  settled_at           timestamptz,
  created_at           timestamptz not null default now(),
  constraint trips_date_order check (end_date >= start_date)
);

-- 6) trip_members -----------------------------------------------------------
create table if not exists public.trip_members (
  trip_id      uuid not null references public.trips(id) on delete cascade,
  user_id      uuid not null references public.profiles(id) on delete cascade,
  display_name text not null,
  role         text not null default 'member' check (role in ('host','member')),
  is_driver    boolean not null default false,
  joined_at    timestamptz not null default now(),
  primary key (trip_id, user_id)
);

-- 7) expenses ---------------------------------------------------------------
create table if not exists public.expenses (
  id          uuid primary key default gen_random_uuid(),
  trip_id     uuid not null references public.trips(id) on delete cascade,
  payer_id    uuid not null,
  amount      integer not null check (amount > 0),
  description text not null check (length(btrim(description)) > 0),
  category    text not null,
  created_at  timestamptz not null default now(),
  -- 결제자는 이 방의 멤버여야 한다. 방 밖의 사람에게 결제를 떠넘길 수 없다.
  foreign key (trip_id, payer_id)
    references public.trip_members(trip_id, user_id) on delete cascade,
  -- expense_participants가 (expense_id, trip_id)로 이 표를 가리키기 위해 필요하다.
  unique (id, trip_id)
);

-- 8) expense_participants ---------------------------------------------------
-- participantIds 배열 대신 조인 테이블을 쓰는 이유가 아래 FK 두 줄이다.
-- 이게 걸리면 방 밖의 사람에게 빚을 지우는 일이 DB에서 불가능해진다.
-- 앱(lib/expenses/actions.ts)도 같은 검사를 하지만, 앱 검사는 액션을 우회한
-- 직접 호출에 뚫린다. 돈 계산의 입력이라 제약을 DB로 내린다.
create table if not exists public.expense_participants (
  expense_id uuid not null,
  trip_id    uuid not null,
  user_id    uuid not null,
  primary key (expense_id, user_id),
  foreign key (expense_id, trip_id)
    references public.expenses(id, trip_id) on delete cascade,
  foreign key (trip_id, user_id)
    references public.trip_members(trip_id, user_id) on delete cascade
);

-- 9) settlements ------------------------------------------------------------
-- 확정된 송금 리스트만 저장한다. 각자의 부담액·할인액은 저장하지 않고
-- lib/settle/settle.ts 가 매번 재계산한다 — 확정 시 계산 입력이 전부 잠기므로
-- 출력도 불변이고, 저장하면 같은 값을 두 곳에 두게 된다.
create table if not exists public.settlements (
  id           uuid primary key default gen_random_uuid(),
  trip_id      uuid not null references public.trips(id) on delete cascade,
  from_user_id uuid not null references public.profiles(id),
  to_user_id   uuid not null references public.profiles(id),
  amount       integer not null check (amount > 0),
  is_paid      boolean not null default false,
  paid_at      timestamptz,
  -- from = to 인 이체는 의미가 없다. settle_trip이 앞단에서 걸러도, 잠금의 핵심
  -- 불변식이라 DB 제약으로도 막아 둔다.
  check (from_user_id <> to_user_id)
);

create index if not exists trip_members_user_idx on public.trip_members(user_id);
create index if not exists expenses_trip_idx     on public.expenses(trip_id);
create index if not exists settlements_trip_idx  on public.settlements(trip_id);

-- expense_participants의 PK는 (expense_id, user_id)라 (trip_id, user_id) →
-- trip_members FK를 못 커버한다. trip_members를 지울 때마다 이 표를 seq-scan하게 되어
-- 인덱스를 따로 둔다.
create index if not exists expense_participants_member_idx
  on public.expense_participants(trip_id, user_id);

-- 조회는 upper()로 하는데 unique는 대소문자를 구분한다. 그대로 두면 'k7x9q2'로
-- 같은 코드를 하나 더 만들 수 있고, 조회가 둘 중 아무거나 집는다.
create unique index if not exists trips_invite_code_upper_idx
  on public.trips (upper(invite_code));

-- 10) 멤버십 판정 함수 -------------------------------------------------------
-- security definer 인 이유: 이 함수들은 RLS 정책 안에서 불린다. 정책이 다시
-- 정책이 걸린 표를 읽으면 무한 재귀가 된다. definer로 RLS를 우회해 끊는다.

create or replace function public.is_trip_member(check_trip_id uuid)
returns boolean language sql security definer set search_path = '' stable as $$
  select exists (
    select 1 from public.trip_members
     where trip_id = check_trip_id and user_id = auth.uid()
  );
$$;

create or replace function public.is_trip_host(check_trip_id uuid)
returns boolean language sql security definer set search_path = '' stable as $$
  select exists (
    select 1 from public.trip_members
     where trip_id = check_trip_id and user_id = auth.uid() and role = 'host'
  );
$$;

create or replace function public.is_trip_settled(check_trip_id uuid)
returns boolean language sql security definer set search_path = '' stable as $$
  select exists (
    select 1 from public.trips
     where id = check_trip_id and settled_at is not null
  );
$$;

-- 방을 막 만든 사람은 아직 멤버 행이 없다. host 행을 스스로 넣을 수 있어야 하는데
-- trips의 select 정책에 막혀 trips를 읽지 못하므로 이 함수가 필요하다.
create or replace function public.is_trip_creator(check_trip_id uuid)
returns boolean language sql security definer set search_path = '' stable as $$
  select exists (
    select 1 from public.trips
     where id = check_trip_id and created_by = auth.uid()
  );
$$;

-- CREATE FUNCTION은 PUBLIC에 EXECUTE를 준다. 정책 내부용 함수가 RPC 엔드포인트로
-- 열려 트립 존재 여부를 알려주는 걸 막는다.
-- 이 함수들은 정책 안에서 호출되고 정책은 definer로 실행되므로, 직접 EXECUTE를
-- 거둬도 정책 동작에는 영향이 없다.
revoke execute on function public.is_trip_member(uuid)  from public;
revoke execute on function public.is_trip_host(uuid)    from public;
revoke execute on function public.is_trip_settled(uuid) from public;
revoke execute on function public.is_trip_creator(uuid) from public;

-- 11) RLS -------------------------------------------------------------------
alter table public.trips                enable row level security;
alter table public.trip_members         enable row level security;
alter table public.expenses             enable row level security;
alter table public.expense_participants enable row level security;
alter table public.settlements          enable row level security;

-- trips ---------------------------------------------------------------------
-- created_by 를 함께 보는 이유: 방을 만든 직후엔 아직 멤버 행이 없어서
-- is_trip_member 만으로는 자기가 만든 방을 되읽지 못한다.
create policy "멤버 또는 생성자만 여행방 읽기" on public.trips
  for select using (public.is_trip_member(id) or created_by = auth.uid());

create policy "본인 명의로만 여행방 생성" on public.trips
  for insert with check (created_by = auth.uid());

create policy "방장만 여행방 수정" on public.trips
  for update using (public.is_trip_host(id))
  with check (public.is_trip_host(id));

-- settled_at과 invite_code는 RPC와 참여 흐름의 불변식이다. 방장이 직접 PATCH로
-- 뒤집으면 unsettle_trip이 막으려던 어긋난 상태가 그대로 생긴다.
revoke update on public.trips from authenticated;
grant  update (name, region, start_date, end_date, cover_theme, driver_discount_rate)
  on public.trips to authenticated;

-- trip_members --------------------------------------------------------------
create policy "같은 방 멤버만 멤버 목록 읽기" on public.trip_members
  for select using (public.is_trip_member(trip_id));

-- 참여(join)는 join_trip_by_code RPC가 맡는다. 여기서 여는 건 방 생성자가
-- 자기 host 행을 만드는 경우 하나뿐이다.
create policy "생성자가 자기 host 행 추가" on public.trip_members
  for insert with check (
    user_id = auth.uid() and public.is_trip_creator(trip_id) and role = 'host'
  );

create policy "방장만 멤버 수정" on public.trip_members
  for update using (public.is_trip_host(trip_id))
  with check (public.is_trip_host(trip_id));

-- expenses ------------------------------------------------------------------
-- 잠금이 여기서 완성된다. settled_at 이 채워지면 아래 세 정책이 전부 거짓이 되어
-- 서버 액션을 우회해도 지출을 건드릴 수 없다.
create policy "멤버만 지출 읽기" on public.expenses
  for select using (public.is_trip_member(trip_id));

create policy "미확정 방에만 지출 추가" on public.expenses
  for insert with check (
    public.is_trip_member(trip_id) and not public.is_trip_settled(trip_id)
  );

create policy "미확정 방 지출만 수정" on public.expenses
  for update using (
    public.is_trip_member(trip_id) and not public.is_trip_settled(trip_id)
  ) with check (
    public.is_trip_member(trip_id) and not public.is_trip_settled(trip_id)
  );

create policy "미확정 방 지출만 삭제" on public.expenses
  for delete using (
    public.is_trip_member(trip_id) and not public.is_trip_settled(trip_id)
  );

-- expense_participants ------------------------------------------------------
create policy "멤버만 참여자 읽기" on public.expense_participants
  for select using (public.is_trip_member(trip_id));

create policy "미확정 방에만 참여자 추가" on public.expense_participants
  for insert with check (
    public.is_trip_member(trip_id) and not public.is_trip_settled(trip_id)
  );

create policy "미확정 방 참여자만 삭제" on public.expense_participants
  for delete using (
    public.is_trip_member(trip_id) and not public.is_trip_settled(trip_id)
  );

-- settlements ---------------------------------------------------------------
-- insert/delete 정책이 없다 = 아래 RPC(security definer)로만 가능하다.
-- 확정·취소는 여러 문장이 한 트랜잭션이어야 해서 정책으로는 안 된다.
create policy "멤버만 정산 읽기" on public.settlements
  for select using (public.is_trip_member(trip_id));

create policy "당사자만 보냄 표시" on public.settlements
  for update using (
    from_user_id = auth.uid() or to_user_id = auth.uid()
  ) with check (
    from_user_id = auth.uid() or to_user_id = auth.uid()
  );

-- RLS는 어느 행인지만 제한할 뿐 어느 컬럼인지는 제한하지 못한다. 정책만 두면
-- 당사자가 자기 amount를 고쳐 확정된 금액을 뒤집을 수 있다. 잠금의 핵심 보장이라
-- 컬럼 권한으로 내린다.
revoke update on public.settlements from authenticated;
grant  update (is_paid, paid_at) on public.settlements to authenticated;

-- 12) RPC -------------------------------------------------------------------

-- 초대코드로 참여. 비멤버는 RLS 때문에 trips 를 읽을 수 없어 코드 대조 자체가
-- 불가능하다. profiles.email_taken 과 같은 이유로 좁게 뚫는다.
-- 없는 코드면 null 을 돌려준다 — 호출부가 InvalidInviteCodeError 로 바꾼다.
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

-- 정산 확정. 계산은 앱의 순수 함수(lib/settle/settle.ts)가 이미 했고,
-- 이 함수는 결과를 받아 트랜잭션으로 쓰기만 한다.
-- transfers 형식: [{"from":"<uuid>","to":"<uuid>","amount":12345}, ...]
create or replace function public.settle_trip(
  check_trip_id uuid,
  transfers     jsonb
)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  item              jsonb;
  locked_settled_at timestamptz;
begin
  if not public.is_trip_host(check_trip_id) then
    raise exception 'NOT_TRIP_HOST';
  end if;

  -- for update로 행을 잠그고 그 행에서 상태를 읽는다. is_trip_settled는 stable이라
  -- 스냅샷을 보고, 두 번 눌리면 둘 다 "미확정"으로 통과해 송금 리스트가 두 벌 생긴다.
  select settled_at into locked_settled_at
    from public.trips where id = check_trip_id for update;
  if not found then
    raise exception 'TRIP_NOT_FOUND';
  end if;
  if locked_settled_at is not null then
    raise exception 'TRIP_ALREADY_SETTLED';
  end if;

  -- transfers가 배열이 아니면(null 포함) jsonb_array_elements가 조용히 0행을
  -- 돌려줘 송금 하나 없이 방이 잠긴다. 배열 형식을 명시적으로 검사한다.
  if jsonb_typeof(transfers) <> 'array' then
    raise exception 'INVALID_TRANSFERS';
  end if;

  for item in select * from jsonb_array_elements(transfers) loop
    -- 방 밖의 사람에게 빚을 지우거나 돈을 받게 할 수 없다.
    if not exists (
      select 1 from public.trip_members
       where trip_id = check_trip_id and user_id = (item->>'from')::uuid
    ) or not exists (
      select 1 from public.trip_members
       where trip_id = check_trip_id and user_id = (item->>'to')::uuid
    ) then
      raise exception 'NOT_TRIP_MEMBER';
    end if;

    insert into public.settlements (trip_id, from_user_id, to_user_id, amount)
    values (
      check_trip_id,
      (item->>'from')::uuid,
      (item->>'to')::uuid,
      (item->>'amount')::int
    );
  end loop;

  update public.trips set settled_at = now() where id = check_trip_id;

  -- types.ts 의 "정산 완료 시 +1. 증가 로직은 아직 없다" 주석이 가리키던 자리다.
  update public.profiles set completed_trip_count = completed_trip_count + 1
   where id in (
     select user_id from public.trip_members where trip_id = check_trip_id
   );
end;
$$;

-- 정산 취소. 세 문장이 한 트랜잭션이어야 하므로 RLS 정책으로는 안 된다.
-- 중간에 실패하면 "송금 리스트는 지워졌는데 방은 여전히 잠긴" 상태가 남고,
-- 그러면 지출도 못 고치고 정산 결과도 없는 빠져나올 수 없는 방이 된다.
create or replace function public.unsettle_trip(check_trip_id uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  locked_settled_at timestamptz;
begin
  if not public.is_trip_host(check_trip_id) then
    raise exception 'NOT_TRIP_HOST';
  end if;

  -- for update로 행을 잠그고 그 행에서 상태를 읽는다. is_trip_settled는 stable이라
  -- 스냅샷을 보고, 두 번 눌리면 둘 다 "확정됨"으로 통과해 삭제·복원이 중복 실행된다.
  select settled_at into locked_settled_at
    from public.trips where id = check_trip_id for update;
  if not found then
    raise exception 'TRIP_NOT_FOUND';
  end if;
  if locked_settled_at is null then
    raise exception 'TRIP_NOT_SETTLED';
  end if;

  delete from public.settlements where trip_id = check_trip_id;
  update public.trips set settled_at = null where id = check_trip_id;
  update public.profiles
     set completed_trip_count = greatest(completed_trip_count - 1, 0)
   where id in (
     select user_id from public.trip_members where trip_id = check_trip_id
   );
end;
$$;

grant execute on function public.join_trip_by_code(text, text) to authenticated;
grant execute on function public.settle_trip(uuid, jsonb)     to authenticated;
grant execute on function public.unsettle_trip(uuid)          to authenticated;
