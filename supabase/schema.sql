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
  -- cascade였다면 생성자가 계정을 지울 때 이 방 전체(멤버·지출·참여자·정산)가
  -- 같이 사라진다 — 다른 멤버들의 여행 기록까지 함께 날아가는 셈이다. restrict로
  -- 막아 "방이 남아있는 동안은 생성자 계정을 지울 수 없다"로 실패하게 한다.
  -- 이 사람이 속한 방이 하나라도 있으면 auth.users 삭제는 "Database error
  -- deleting user"로 실패하고, trips·trip_members엔 DELETE 정책이 없어 앱 안에서
  -- 방을 나가거나 지울 방법도 없다 — 지금은 DB에서 직접 방을 지우는 것 말고는
  -- 막힘을 풀 방법이 없다. 계정 삭제 기능 자체가 아직 없어 당장 영향은 없지만,
  -- 그 기능을 만들 때는 이 막힘부터 먼저 풀어야 한다.
  created_by           uuid not null references public.profiles(id) on delete restrict,
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
  -- cascade였다면 계정을 지울 때 이 trip_members 행이 사라지고, 그 연쇄로
  -- expenses(trip_id,payer_id)→trip_members cascade(아래 7번)가 이 사람이 결제한
  -- 지출까지 지운다. 그러면 남은 멤버들의 정산 총액이 조용히 바뀐다. restrict로
  -- 막아 "이 방의 멤버인 동안은 계정을 지울 수 없다"로 실패하게 한다.
  -- 계정 삭제 기능은 지금 없어 당장 영향은 없다.
  user_id      uuid not null references public.profiles(id) on delete restrict,
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
  -- 다른 profiles FK와 달리 원래 on delete 지정이 아예 없었다 — 남은 정산 행이
  -- 있는지 없는지에 따라 계정 삭제가 조용히 성공(파괴적)하거나 FK 위반으로
  -- 실패하거나가 갈렸다. restrict를 명시해 "정산 기록이 있는 동안은 계정을
  -- 지울 수 없다"로 항상 안전하게 실패하도록 통일한다.
  -- 계정 삭제 기능은 지금 없어 당장 영향은 없다.
  from_user_id uuid not null references public.profiles(id) on delete restrict,
  to_user_id   uuid not null references public.profiles(id) on delete restrict,
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
--
-- 단, SECURITY DEFINER는 함수가 무엇을 읽을 수 있는지를 정할 뿐 누가 부를 수 있는지는
-- 정하지 않는다. 정책의 using 절은 질의하는 역할(authenticated)로 평가되므로 EXECUTE
-- 권한이 필요하다. PUBLIC에서 걷어내되 authenticated에는 명시적으로 준다 — 안 주면
-- 모든 정책이 permission denied로 무너지고, 원인이 이 파일 200줄 위의 문장으로 보이지 않는다.
revoke execute on function public.is_trip_member(uuid)  from public;
revoke execute on function public.is_trip_host(uuid)    from public;
revoke execute on function public.is_trip_settled(uuid) from public;
revoke execute on function public.is_trip_creator(uuid) from public;

-- Supabase 기본 권한은 PUBLIC뿐 아니라 anon에도 직접 EXECUTE를 준다 — 위의
-- "from public" revoke로는 안 걷힌다. anon에서 따로 걷지 않으면, auth.uid()로
-- 걸러지지 않는 유일한 함수인 is_trip_settled를 로그인 없이 그대로 호출해
-- 존재하는 trip id인지 아닌지 알아내는 오라클로 쓸 수 있다. 나머지 세 함수는
-- auth.uid()가 걸러 anon 호출이 늘 false지만, 관례를 맞추고 방어를 겹쳐 둔다.
revoke execute on function public.is_trip_member(uuid)  from anon;
revoke execute on function public.is_trip_host(uuid)    from anon;
revoke execute on function public.is_trip_settled(uuid) from anon;
revoke execute on function public.is_trip_creator(uuid) from anon;

grant execute on function public.is_trip_member(uuid)  to authenticated;
grant execute on function public.is_trip_host(uuid)    to authenticated;
grant execute on function public.is_trip_settled(uuid) to authenticated;
grant execute on function public.is_trip_creator(uuid) to authenticated;

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

-- 확정된 방은 방장도 못 고친다. driver_discount_rate가 계산 입력이라서다 —
-- 확정 화면은 부담 내역을 저장하지 않고 매번 다시 계산하므로(설계 §3), 확정 뒤에
-- 할인율이 바뀌면 화면의 부담액과 그 아래 송금 리스트가 서로 어긋난다.
-- settle_trip/unsettle_trip은 security definer라 RLS를 우회하므로 영향받지 않는다.
create policy "방장만 여행방 수정" on public.trips
  for update using (public.is_trip_host(id) and not public.is_trip_settled(id))
  with check (public.is_trip_host(id) and not public.is_trip_settled(id));

-- settled_at과 invite_code는 RPC와 참여 흐름의 불변식이다. 방장이 직접 PATCH로
-- 뒤집으면 unsettle_trip이 막으려던 어긋난 상태가 그대로 생긴다.
-- RLS는 어느 행인지만 제한할 뿐 어느 컬럼인지는 제한하지 못해 정책만으로는 부족하다.
-- anon까지 거두는 건, 지금 정책이 auth.uid()로 걸러 준다는 사실에 기대지 않기 위해서다.
revoke update on public.trips from authenticated, anon;
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

-- is_driver도 계산 입력이다. 확정 뒤에 운전자를 바꾸면 위 trips와 같은 이유로
-- 부담 내역과 송금 리스트가 어긋난다. mock의 setDriver도 같은 조건에서 거절한다.
create policy "방장만 멤버 수정" on public.trip_members
  for update using (
    public.is_trip_host(trip_id) and not public.is_trip_settled(trip_id)
  ) with check (
    public.is_trip_host(trip_id) and not public.is_trip_settled(trip_id)
  );

-- RLS는 어느 행인지만 제한할 뿐 어느 컬럼인지는 제한하지 못한다. 위 정책만 두면
-- 방장이 멤버의 user_id나 role을 바꿔치기할 수 있다 — user_id를 바꾸면 방에
-- 들어온 적 없는 사람에게 몰래 빚을 지우는 셈이고, role을 host로 바꾸면 권한을
-- 스스로 넘겨줄 수 있다. 앱(TripRepository.setDriver)이 실제로 고치는 컬럼은
-- is_driver 하나뿐이라, 쓰기 권한도 거기에 맞춘다.
revoke update on public.trip_members from authenticated, anon;
grant  update (is_driver) on public.trip_members to authenticated;

-- expenses ------------------------------------------------------------------
-- INSERT 정책은 없다 = add_expense RPC(12번 섹션, security definer)로만 쓸 수 있다.
-- 지출과 expense_participants가 같은 트랜잭션으로 함께 생겨야 한다 — 둘을
-- 나눠서 클라이언트가 두 번 왕복하면(또는 REST로 expenses만 직접 찔러 넣으면)
-- 참여자가 하나도 없는 지출이 생긴다. 나눌 사람이 없으니 정산 계산이 그 지출을
-- 처리할 수 없고, 방이 잠긴 뒤라면(expenses DELETE는 not is_trip_settled 요구)
-- 그 유령 지출은 영영 지울 수도 없다. settlements에 INSERT 정책이 없는 것과
-- 같은 이유다.
-- UPDATE 정책도 없다. ExpenseRepository(lib/data/repositories.ts)에는 지출을
-- 고치는 메서드가 아예 없다 — 잘못 넣은 지출은 지우고 다시 넣는다(add_expense도
-- 트랜잭션 하나로 새로 만들 뿐 기존 행을 고치지 않는다). 만들어 둬 봐야 UI도
-- 서버 액션도 쓰지 않는 구멍만 남는다. 잠금은 아래 삭제 정책이 맡는다.
create policy "멤버만 지출 읽기" on public.expenses
  for select using (public.is_trip_member(trip_id));

create policy "미확정 방 지출만 삭제" on public.expenses
  for delete using (
    public.is_trip_member(trip_id) and not public.is_trip_settled(trip_id)
  );

-- expense_participants ------------------------------------------------------
-- INSERT 정책은 없다 = expenses와 같은 이유로 add_expense RPC로만 쓸 수 있다.
-- DELETE 정책도 없다. 참여자 행은 expenses(id, trip_id)를 가리키는 복합 FK에
-- on delete cascade가 걸려 있어(8번 섹션) 지출을 지우면(ExpenseRepository.remove)
-- 참여자도 함께 사라진다 — cascade는 RLS를 타지 않는다. 만약 이 표에만 DELETE
-- 정책을 열면, 지출은 남기고 참여자만 전부 지울 수 있게 된다. 그런데 이 표에
-- INSERT 정책이 없으니 add_expense를 다시 부르지 않는 한 아무도 되돌릴 수 없고,
-- 결과는 참여자 0명짜리 유령 지출이다 — add_expense가 막으려던 바로 그 상태다.
-- lib/settle/settle.ts도 참여자가 없는 지출은 rawOwed 분배를 건너뛰면서 결제자의
-- paid는 그대로 인정해, 정산 총액이 조용히 안 맞게 된다.
create policy "멤버만 참여자 읽기" on public.expense_participants
  for select using (public.is_trip_member(trip_id));

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
revoke update on public.settlements from authenticated, anon;
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

-- 지출 생성 + 참여자 등록을 한 트랜잭션으로 묶는다. expenses INSERT 정책을 없앤
-- 이유가 이 함수다 — 지출 따로, expense_participants 따로 두 번 왕복하면 그 사이
-- 연결이 끊기거나 REST로 expenses만 직접 찔러도 참여자 없는 유령 지출이 생긴다.
-- security definer라 RLS를 타지 않으므로, 정책이 하던 검사를 여기서 전부 다시 한다.
create or replace function public.add_expense(
  check_trip_id     uuid,
  check_payer_id    uuid,
  check_amount      integer,
  check_description text,
  check_category    text,
  participant_ids   uuid[]
)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  new_expense_id uuid;
  participant_id uuid;
begin
  if not public.is_trip_member(check_trip_id) then
    raise exception 'NOT_TRIP_MEMBER';
  end if;

  if public.is_trip_settled(check_trip_id) then
    raise exception 'TRIP_ALREADY_SETTLED';
  end if;

  -- 빈 배열의 array_length는 null이다(차원 정보가 없어서) — null 배열과 빈 배열을
  -- 한 조건으로 같이 잡는다.
  if participant_ids is null or array_length(participant_ids, 1) is null then
    raise exception 'NO_PARTICIPANTS';
  end if;

  insert into public.expenses (trip_id, payer_id, amount, description, category)
  values (check_trip_id, check_payer_id, check_amount, check_description, check_category)
  returning id into new_expense_id;

  -- 결제자·참여자가 이 방의 멤버인지는 위/아래 INSERT의 복합 FK
  -- (expenses: trip_id+payer_id → trip_members, expense_participants: trip_id+user_id
  -- → trip_members, 각각 7·8번 섹션)가 이미 보장한다. 여기서 다시 검사하면 같은
  -- 규칙을 두 곳에 두게 된다 — 위반 시 FK 오류로 트랜잭션 전체가 롤백된다.
  --
  -- participant_ids에 같은 uuid가 두 번 들어오면 expense_participants_pkey
  -- (expense_id, user_id)가 23505로 트랜잭션 전체를 롤백시킨다. mock 구현
  -- (lib/data/mock/expenseRepo.ts)은 중복을 그냥 받아들이므로, 두 구현이 같게
  -- 동작하도록(NEXT_PUBLIC_DATA_SOURCE 스위치가 의미를 유지하도록) distinct로
  -- 조용히 걸러낸다.
  for participant_id in select distinct unnest(participant_ids) loop
    insert into public.expense_participants (expense_id, trip_id, user_id)
    values (new_expense_id, check_trip_id, participant_id);
  end loop;

  return new_expense_id;
end;
$$;

-- 여행방 생성 + host 멤버 등록을 한 트랜잭션으로 묶는다. 이전엔 trips insert와
-- trip_members insert가 따로 두 번 왕복해서, 두 번째가 실패하면(네트워크 끊김 등)
-- 멤버 없는 trip 행이 남았다 — list()는 trip_members로 join해서 이 방을 보여주지
-- 못하고, trips엔 DELETE 정책이 없어 앱 안에서 지울 수도 없었다. add_expense와
-- 같은 이유로 RPC 하나로 묶는다.
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

-- 다섯 RPC 모두 auth.uid()로 이미 걸러지지만(NOT_AUTHENTICATED 예외, is_trip_host
-- 등), 위 helper 함수들과 같은 이유로 anon의 기본 직접 EXECUTE 권한도 걷어
-- 관례를 맞추고 방어를 겹쳐 둔다.
revoke execute on function public.join_trip_by_code(text, text)                    from anon;
revoke execute on function public.add_expense(uuid, uuid, integer, text, text, uuid[]) from anon;
revoke execute on function public.create_trip(text, text, date, date, text, text, text) from anon;
revoke execute on function public.settle_trip(uuid, jsonb)                         from anon;
revoke execute on function public.unsettle_trip(uuid)                              from anon;

grant execute on function public.join_trip_by_code(text, text) to authenticated;
grant execute on function public.add_expense(uuid, uuid, integer, text, text, uuid[])
  to authenticated;
grant execute on function public.create_trip(text, text, date, date, text, text, text)
  to authenticated;
grant execute on function public.settle_trip(uuid, jsonb)     to authenticated;
grant execute on function public.unsettle_trip(uuid)          to authenticated;
