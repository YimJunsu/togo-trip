-- togo-trip 전체 스키마. Supabase 대시보드 > SQL Editor에 통째로 붙여 실행한다.
-- 회원(profiles) · 여행방 · 멤버 · 지출 · 참여자 · 정산 · 일정 · 지역 콘텐츠까지
-- 표 열한 개가 전부 이 파일 하나에 들어 있다. lib/data/types.ts 의 타입들을
-- 테이블로 승격한 것이다.
--
-- 새 환경(DR·이관)을 세우는 절차:
--   1. 이 파일을 통째로 실행한다.
--   2. supabase/seed/regions.sql 로 시군구 250건을 채운다.
--   3. Authentication > Providers 에서 Email(Confirm email 끔) · Google 을 켜고,
--      URL Configuration > Redirect URLs 에 <origin>/auth/callback 을 등록한다.
--   4. 환경변수를 채운다 (.env.local.example 참고).
-- supabase/migrations/ 는 이 절차에 필요 없다 — 아래 참고를 볼 것.
--
-- 사전 조건: Auth > Providers > Email 에서 "Confirm email"을 끈다.
--   (지금은 이메일 인증 플로우가 없어, 켜져 있으면 가입 직후 세션이 생기지 않는다.)
--
-- 몇 번을 실행해도 안전하다. 표는 if not exists, 함수는 create or replace,
-- 정책·트리거는 drop if exists를 앞세워 다시 만든다. 이미 들어 있는 데이터는
-- 지워지지 않는다 — drop 되는 건 정책과 트리거 정의뿐이다.
--   (drop 없이 create policy만 두면 두 번째 실행이 42710 "already exists"로 죽는다.
--    한 번 겪으면 "어디까지 들어갔지?"를 손으로 되짚어야 해서, 재실행 가능하게 둔다.)
--
-- supabase/migrations/ 는 **이미 돌아가는 DB에 얹은 변경분의 기록**이지 설치
-- 스크립트가 아니다. 빈 DB에서 순서대로 돌리면 0001이 아직 없는 expenses 표의
-- 정책을 고치려다 즉시 죽는다. 새 환경에는 이 파일만 쓴다.
--
-- 두 곳의 내용이 어긋나면 이 파일이 원본이다. 스키마를 바꾸면 새 마이그레이션
-- 파일과 이 파일을 **함께** 고친다. 한동안 그 규칙이 지켜지지 않아 지역 콘텐츠
-- 표 네 개(regions·attractions·ingest_runs·heartbeats)와 profiles.is_admin 이
-- 마이그레이션에만 있었다 — 이 파일로 세운 환경에는 지역 페이지가 통째로
-- 없었다는 뜻이다. 2026-09-05에 §13으로 되찾았다.

-- 1) profiles ---------------------------------------------------------------
create table if not exists public.profiles (
  id                   uuid primary key references auth.users(id) on delete cascade,
  name                 text not null,
  email                text not null,
  phone                text not null default '',
  birth_date           date,
  provider             text not null default 'email',
  -- 약관·개인정보에 동의한 시각. null이면 온보딩 미완료다.
  -- OAuth는 인증 직후 아래 트리거가 행을 만들어 버려서, 행이 있는 것만으로는
  -- 동의 여부를 알 수 없다. 이 값이 그 구분을 맡는다.
  onboarded_at         timestamptz,
  completed_trip_count int  not null default 0,
  -- 관리자 플래그. /admin/** 접근 판정의 원본이고 적재 이력 읽기 정책이 이걸 본다(§13).
  -- 사용자가 스스로 켤 수 없도록 아래 컬럼 잠금에서 제외돼 있다.
  is_admin             boolean not null default false,
  created_at           timestamptz not null default now()
);

-- 이미 만들어진 표에 나중에 추가된 컬럼들. create table은 표가 있으면 통째로 건너뛰므로
-- 여기서 따로 보강한다. 새 환경에서는 위 정의에 이미 들어 있어 아무 일도 하지 않는다.
alter table public.profiles
  add column if not exists onboarded_at timestamptz,
  add column if not exists is_admin     boolean not null default false;

-- 이메일은 auth.users에서 복사해 온 사본이라 그쪽 유일성이 여기까지 따라오지 않는다.
-- 같은 이메일의 OAuth 계정이 기존 계정에 붙지 못하면 profiles에 두 번째 행이 생기고,
-- 한 사람의 여행방·정산·동의 기록이 두 계정으로 갈라진다. 대소문자는 무시한다 —
-- 이메일 가입은 소문자로 내려 저장하지만 OAuth가 주는 값은 그렇지 않을 수 있다.
create unique index if not exists profiles_email_unique
  on public.profiles (lower(email));

-- 동의 항목 자체는 저장하지 않고 동의한 "시각"만 onboarded_at에 남긴다.
-- 예전에는 "행이 있다는 것 자체가 동의를 뜻한다"고 봤지만, OAuth가 그 전제를 깼다 —
-- 트리거가 인증 직후 행을 만들어서 동의 화면을 본 적 없는 행이 생긴다.
-- 마케팅 수신은 보낼 계획이 없어 받지 않기로 했다.
-- 나중에 발송을 시작하려면 그때 컬럼과 동의 UI를 함께 되살린다.

-- 2) RLS --------------------------------------------------------------------
alter table public.profiles enable row level security;

-- 본인 프로필만 읽고 고칠 수 있다. insert는 아래 트리거(security definer)가 맡는다.
-- ponytail: 궁합 기능이 동행자의 프로필을 교차 조회해야 하나, 그건 trip이 실서버로
--   올라올 때 "같은 여행방 멤버면 읽기" 정책으로 추가한다. 지금은 본인만.
drop   policy if exists "본인 프로필 읽기" on public.profiles;
create policy "본인 프로필 읽기" on public.profiles
  for select using (auth.uid() = id);

drop   policy if exists "본인 프로필 수정" on public.profiles;
create policy "본인 프로필 수정" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- RLS는 어느 행인지만 제한할 뿐 어느 컬럼인지는 제한하지 못한다. 위 정책은 본인
-- 행 전체를 열어 두므로, 잠그지 않으면 로그인한 사용자가 공개 anon 키로 PostgREST를
-- 직접 불러 자기 onboarded_at을 찍고 동의 게이트를 스스로 열 수 있다. is_admin도
-- 마찬가지다. 사용자가 직접 쓸 수 있는 타임스탬프는 동의 기록으로서 값이 없다.
revoke update on public.profiles from authenticated, anon;
grant  update (name, phone) on public.profiles to authenticated;

-- 온보딩 여부. 앱의 세션 게이트는 Next.js를 거치는 요청에만 적용되고,
-- PostgREST는 두 번째 정문이라 DB 쪽에서도 같은 판정이 필요하다.
create or replace function public.is_onboarded()
returns boolean
language sql security definer stable set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
     where id = auth.uid() and onboarded_at is not null
  );
$$;

grant execute on function public.is_onboarded() to authenticated, anon;

-- 온보딩 저장. birth_date·onboarded_at이 컬럼 grant에서 빠져 있으므로 이 함수로만
-- 쓴다. 만 14세 검증을 여기서 한 번 더 하는 이유는, 이 함수가 화면을 거치지 않고
-- 네트워크에서 직접 불릴 수 있기 때문이다.
create or replace function public.complete_onboarding(birth_date_input date)
returns void
language plpgsql security definer set search_path = ''
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

  if birth_date_input > (current_date - interval '14 years') then
    raise exception '만 14세 미만은 가입할 수 없습니다.';
  end if;

  update public.profiles
     set birth_date = birth_date_input,
         -- 이미 동의한 사람의 시각은 덮어쓰지 않는다.
         onboarded_at = coalesce(onboarded_at, now())
   where id = target;
end;
$$;

grant execute on function public.complete_onboarding(date) to authenticated;

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
  insert into public.profiles (id, name, email, phone, birth_date, provider, onboarded_at)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'name',
      -- 구글은 name 대신 full_name으로 주기도 한다.
      new.raw_user_meta_data->>'full_name',
      ''
    ),
    new.email,
    coalesce(new.raw_user_meta_data->>'phone', ''),
    nullif(new.raw_user_meta_data->>'birthDate', '')::date,
    coalesce(new.raw_app_meta_data->>'provider', 'email'),
    -- 이메일 가입은 동의 화면을 이미 거쳤으므로 바로 찍는다.
    -- OAuth는 비워 두고 앱의 온보딩 화면이 채운다.
    case
      when coalesce(new.raw_app_meta_data->>'provider', 'email') = 'email'
      then now()
      else null
    end
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
  -- 이 사람이 만든 방이 하나라도 있으면 auth.users 삭제는 "Database error
  -- deleting user"로 실패한다. 일반 멤버로 참여한 방은 leave_trip RPC(12번 섹션)로
  -- 나갈 수 있지만, 방장은 나갈 수 없고 방을 지우는 기능도 없다 — 방장으로 만든
  -- 방은 DB에서 직접 지우는 것 말고는 막힘을 풀 방법이 없다. 계정 삭제 기능 자체가
  -- 아직 없어 당장 영향은 없지만, 그 기능을 만들 때는 이 막힘부터 먼저 풀어야 한다.
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
  --
  -- 같은 연쇄가 "방 나가기"에도 그대로 걸린다. 그래서 이 표에는 DELETE 정책을
  -- 두지 않고 leave_trip RPC(12번 섹션)로만 지운다 — 지우기 전에 지출 흔적을
  -- 검사해야 하고, 검사에 걸린 이유를 사용자에게 돌려줘야 하기 때문이다.
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

-- 9-1) itinerary_items -------------------------------------------------------
-- 날짜별 일정. 돈 계산에 들어가지 않으므로 expenses처럼 무거운 제약이 없다 —
-- 잘못 넣어도 지우고 다시 넣으면 그만이고, 정산 확정과도 무관하다(확정된 방에서도
-- 일정은 계속 고칠 수 있다. 잠기는 건 계산 입력뿐이다).
--
-- 누가 넣었는지는 저장하지 않는다. 화면에 쓰지 않고, profiles를 가리키는 FK가
-- 하나 더 생기면 계정 삭제를 막는 on delete restrict가 또 하나 늘어난다.
--
-- day가 여행 기간 안인지는 여기서 못 막는다 — check 제약은 다른 표(trips)를
-- 참조할 수 없다. lib/itinerary/actions.ts가 그 검사를 한다.
create table if not exists public.itinerary_items (
  id         uuid primary key default gen_random_uuid(),
  trip_id    uuid not null references public.trips(id) on delete cascade,
  day        date not null,
  -- 시간을 안 정한 일정("첫날 저녁 어디든")도 담아야 해서 null을 받는다.
  -- 정렬은 null을 뒤로 보낸다 (ItineraryRepository).
  at         time,
  title      text not null check (char_length(btrim(title)) between 1 and 60),
  memo       text not null default '' check (char_length(memo) <= 500),
  created_at timestamptz not null default now()
);

create index if not exists trip_members_user_idx on public.trip_members(user_id);
create index if not exists expenses_trip_idx     on public.expenses(trip_id);
create index if not exists settlements_trip_idx  on public.settlements(trip_id);

-- 목록은 항상 한 여행방의 것을 날짜순으로 읽는다.
create index if not exists itinerary_items_trip_day_idx
  on public.itinerary_items(trip_id, day);

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

-- create_trip이 trips insert와 host 멤버 insert를 클라이언트 두 왕복으로 나눠 하던
-- 시절에 쓰던 함수다. 지금은 create_trip이 security definer RPC 하나로 두 insert를
-- 한 트랜잭션에 묶어 RLS를 우회하므로 이 함수를 거칠 일이 없다. 그 시절 의존하던
-- "생성자가 자기 host 행 추가" 정책과 trips SELECT 정책의 or 절이 아직 이 함수를
-- 참조하고 있어 지우면 정책이 깨진다 — 무해하므로 남겨 둔다.
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
alter table public.itinerary_items      enable row level security;

-- trips ---------------------------------------------------------------------
-- created_by 를 함께 보는 조건은 create_trip이 trips insert와 host 멤버 insert를
-- 따로 왕복하던 시절, "방을 만든 직후엔 아직 멤버 행이 없어 is_trip_member만으로는
-- 자기가 만든 방을 되읽지 못하는" 순간을 메우려던 것이다. 지금은 create_trip이
-- 한 트랜잭션의 security definer RPC라 그 순간 자체가 없다 — 이 or 절이 없어도
-- 되읽기는 항상 성공한다. 그래도 무해하고 지우는 게 더 위험해 보여 남겨 둔다.
drop   policy if exists "멤버 또는 생성자만 여행방 읽기" on public.trips;
create policy "멤버 또는 생성자만 여행방 읽기" on public.trips
  for select using (public.is_trip_member(id) or created_by = auth.uid());

drop   policy if exists "본인 명의로만 여행방 생성" on public.trips;
create policy "본인 명의로만 여행방 생성" on public.trips
  for insert with check (created_by = auth.uid() and public.is_onboarded());

-- 확정된 방은 방장도 못 고친다. driver_discount_rate가 계산 입력이라서다 —
-- 확정 화면은 부담 내역을 저장하지 않고 매번 다시 계산하므로(설계 §3), 확정 뒤에
-- 할인율이 바뀌면 화면의 부담액과 그 아래 송금 리스트가 서로 어긋난다.
-- settle_trip/unsettle_trip은 security definer라 RLS를 우회하므로 영향받지 않는다.
drop   policy if exists "방장만 여행방 수정" on public.trips;
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
drop   policy if exists "같은 방 멤버만 멤버 목록 읽기" on public.trip_members;
create policy "같은 방 멤버만 멤버 목록 읽기" on public.trip_members
  for select using (public.is_trip_member(trip_id));

-- 참여(join)는 join_trip_by_code RPC가 맡는다. 이 정책은 create_trip이 trips
-- insert와 host 멤버 insert를 클라이언트 두 왕복으로 나눠 하던 시절, 방 생성자가
-- 자기 host 행을 직접 넣던 경로다. 지금은 create_trip 하나가 security definer로
-- 두 insert를 다 하므로 이 정책을 타는 실제 호출은 없다 — 무해해 남겨 둔다.
drop   policy if exists "생성자가 자기 host 행 추가" on public.trip_members;
create policy "생성자가 자기 host 행 추가" on public.trip_members
  for insert with check (
    user_id = auth.uid() and public.is_trip_creator(trip_id) and role = 'host'
  );

-- is_driver도 계산 입력이다. 확정 뒤에 운전자를 바꾸면 위 trips와 같은 이유로
-- 부담 내역과 송금 리스트가 어긋난다. mock의 setDriver도 같은 조건에서 거절한다.
drop   policy if exists "방장만 멤버 수정" on public.trip_members;
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
-- 처리할 수 없고, 방이 잠긴 뒤라면(remove_expense도 미확정만 허용) 그 유령 지출은
-- 영영 지울 수도 없다. settlements에 INSERT 정책이 없는 것과 같은 이유다.
-- UPDATE 정책도 없다. ExpenseRepository(lib/data/repositories.ts)에는 지출을
-- 고치는 메서드가 아예 없다 — 잘못 넣은 지출은 지우고 다시 넣는다(add_expense도
-- 트랜잭션 하나로 새로 만들 뿐 기존 행을 고치지 않는다). 만들어 둬 봐야 UI도
-- 서버 액션도 쓰지 않는 구멍만 남는다. 잠금은 remove_expense RPC가 맡는다.
--
-- DELETE 정책도 없다 = remove_expense RPC(12번 섹션, security definer)로만 지운다.
-- 한때 "멤버 且 미확정" 정책으로 열려 있었으나, 정책이 부르는 is_trip_settled가
-- stable이라 스냅샷을 본다 — READ COMMITTED에서 settle_trip의 `for update` 커밋과
-- 겹치면 삭제가 "미확정"으로 통과해, 이미 저장된 송금 리스트에 몫이 반영된 지출이
-- 사라진다. 확정된 방엔 INSERT 경로가 없어(add_expense가 TRIP_ALREADY_SETTLED로
-- 거절) 그 지출을 되살릴 수도 없고, 정산을 취소하고 다시 확정하는 것 말고는
-- 빠져나올 길이 없다. add_expense가 `for share`로 막은 실패의 대칭형이라 해법도
-- 같다 — 정책을 걷고 trips 행을 잠그는 RPC로 옮긴다.
-- 걷어낸 "미확정 방 지출만 삭제" 정책도 함께 지운다. 이 파일을 이미 옛 버전으로
-- 실행한 DB에 다시 부어도 정책이 남지 않게 하려는 것이다(재실행 안전성).
drop   policy if exists "미확정 방 지출만 삭제" on public.expenses;
drop   policy if exists "멤버만 지출 읽기" on public.expenses;
create policy "멤버만 지출 읽기" on public.expenses
  for select using (public.is_trip_member(trip_id));

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
drop   policy if exists "멤버만 참여자 읽기" on public.expense_participants;
create policy "멤버만 참여자 읽기" on public.expense_participants
  for select using (public.is_trip_member(trip_id));

-- settlements ---------------------------------------------------------------
-- insert/delete 정책이 없다 = 아래 RPC(security definer)로만 가능하다.
-- 확정·취소는 여러 문장이 한 트랜잭션이어야 해서 정책으로는 안 된다.
drop   policy if exists "멤버만 정산 읽기" on public.settlements;
create policy "멤버만 정산 읽기" on public.settlements
  for select using (public.is_trip_member(trip_id));

drop   policy if exists "당사자만 보냄 표시" on public.settlements;
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

-- itinerary_items -----------------------------------------------------------
-- 지출·정산과 달리 RPC를 거치지 않고 정책만으로 연다. 한 행이 곧 한 일정이라
-- 함께 만들어져야 할 짝이 없고(expenses↔expense_participants 같은 관계가 없다),
-- 돈이 걸리지 않아 확정 잠금과 얽히지도 않는다. RPC로 감쌀 이유가 없다.
--
-- UPDATE 정책은 없다. 지금 화면은 추가·삭제만 한다 — 고칠 일이 생기면 지우고
-- 다시 넣는다(expenses와 같은 판단). 쓰지 않는 구멍을 미리 뚫지 않는다.
drop   policy if exists "멤버만 일정 읽기" on public.itinerary_items;
create policy "멤버만 일정 읽기" on public.itinerary_items
  for select using (public.is_trip_member(trip_id));

drop   policy if exists "멤버만 일정 추가" on public.itinerary_items;
create policy "멤버만 일정 추가" on public.itinerary_items
  for insert with check (public.is_trip_member(trip_id) and public.is_onboarded());

-- 넣은 사람만이 아니라 멤버면 지울 수 있다. 일정은 같이 짜는 것이고, 넣은 사람이
-- 자리에 없다고 잘못 들어간 줄을 아무도 못 지우면 그게 더 불편하다.
drop   policy if exists "멤버만 일정 삭제" on public.itinerary_items;
create policy "멤버만 일정 삭제" on public.itinerary_items
  for delete using (public.is_trip_member(trip_id) and public.is_onboarded());

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

  -- 동의하지 않은 사람이 멤버가 되면 그 순간부터 개인데이터가 쌓인다.
  -- 나머지 쓰기 RPC는 전부 멤버십을 요구하므로, 이 두 입구만 막으면 된다.
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
  new_expense_id     uuid;
  participant_id     uuid;
  locked_settled_at  timestamptz;
begin
  if not public.is_trip_member(check_trip_id) then
    raise exception 'NOT_TRIP_MEMBER';
  end if;

  -- is_trip_settled는 stable이라 스냅샷을 본다. READ COMMITTED에서는 settle_trip의
  -- `for update` 커밋 이후에도 이 지출이 뒤이어 끼어들 수 있다 — 그러면 지출은
  -- 존재하는데 이미 저장된 송금 리스트엔 그 몫이 반영되지 않고, 확정 화면은
  -- shares를 매번 재계산하므로 화면과 송금 리스트가 영구히 어긋난다. 게다가
  -- remove_expense도 미확정만 허용해 이 지출은 지울 수도 없다 — 정산을
  -- 취소하고 다시 확정하는 것 말고는 빠져나올 길이 없다. `for share`로 trips 행을
  -- 잠가 settle_trip의 `for update`와 순서를 강제한다 — 다른 지출 삽입끼리는
  -- 잠그지 않으므로 동시 삽입은 그대로 허용된다.
  select settled_at into locked_settled_at
    from public.trips where id = check_trip_id for share;
  if locked_settled_at is not null then
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

-- 지출 삭제. expenses DELETE 정책을 걷은 이유가 이 함수다(11번 섹션 주석) —
-- 정책의 `not is_trip_settled`는 stable 스냅샷이라 settle_trip 커밋과 겹치면
-- 확정된 송금 리스트에 반영된 지출이 사라지고, 되살릴 경로가 없다.
-- security definer라 RLS를 타지 않으므로, 정책이 하던 검사를 여기서 전부 다시 한다.
-- expense_participants는 복합 FK의 on delete cascade(8번 섹션)가 함께 지운다.
create or replace function public.remove_expense(check_expense_id uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  target_trip_id    uuid;
  locked_settled_at timestamptz;
begin
  select trip_id into target_trip_id
    from public.expenses where id = check_expense_id;
  -- 없는 지출은 조용히 넘어간다. mock(lib/data/mock/expenseRepo.ts)의 remove가
  -- 같은 입력에 같게 동작해야 NEXT_PUBLIC_DATA_SOURCE 스위치가 의미를 유지한다.
  -- 걷어낸 DELETE 정책도 결과적으로 이랬다 — RLS는 안 맞는 행을 조용히 걸러낸다.
  if not found then
    return;
  end if;

  -- add_expense와 같이 named 예외로 시끄럽게 실패한다. 정책 시절엔 비멤버의 삭제가
  -- 0행으로 조용히 통과했는데, 그건 앱(lib/expenses/actions.ts:removeExpense)의
  -- 멤버 검사가 회귀해도 아무 소리가 안 난다는 뜻이었다. 이 예외는 "그 uuid가 내가
  -- 속하지 않은 방의 지출"이라는 사실을 알려주지만, uuid를 이미 알고 있는 호출자에게
  -- add_expense의 NOT_TRIP_MEMBER가 이미 같은 것을 알려주므로 새로 생기는 노출은 없다.
  if not public.is_trip_member(target_trip_id) then
    raise exception 'NOT_TRIP_MEMBER';
  end if;

  -- `for share`로 trips 행을 잠가 settle_trip의 `for update`와 순서를 강제한다.
  -- 확정이 먼저 커밋됐다면 여기서 잠금을 기다린 뒤 settled_at을 보고 거절한다.
  -- 다른 삭제·삽입끼리는 잠그지 않으므로 동시 편집은 그대로 허용된다.
  select settled_at into locked_settled_at
    from public.trips where id = target_trip_id for share;
  if locked_settled_at is not null then
    raise exception 'TRIP_ALREADY_SETTLED';
  end if;

  delete from public.expenses where id = check_expense_id;
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

  -- 동의하지 않은 사람이 멤버가 되면 그 순간부터 개인데이터가 쌓인다.
  -- 나머지 쓰기 RPC는 전부 멤버십을 요구하므로, 이 두 입구만 막으면 된다.
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

-- 여행방 나가기 / 방장이 멤버 내보내기.
--
-- trip_members에 DELETE 정책을 두지 않는 이유가 이 함수다. expenses(7번 섹션)와
-- expense_participants(8번 섹션)가 trip_members를 on delete cascade로 참조하므로,
-- 정책으로 열어 두면 멤버 한 줄을 지우는 순간 그 사람이 결제한 지출과 참여 행이
-- 함께 사라지고 남은 사람들의 정산 총액이 조용히 바뀐다. 지우기 전에 검사해야
-- 하고, 검사에 걸렸을 때 "왜 안 되는지"를 돌려줘야 한다 — 정책은 안 맞는 행을
-- 조용히 0행으로 거를 뿐이라 둘 다 못 한다.
--
-- 범위: 일반 멤버만. 방장은 나가지도, 쫓겨나지도 않는다. 방을 정리하는 것은
-- '방 삭제'라는 별개 기능이고 아직 없다.
create or replace function public.leave_trip(
  check_trip_id uuid,
  -- 본인이 나가면 auth.uid()와 같고, 방장이 내보내면 다르다.
  check_user_id uuid
)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  target_role       text;
  locked_settled_at timestamptz;
begin
  -- auth.uid()가 null이면 아래 `check_user_id <> auth.uid()`가 NULL이 되고,
  -- `NULL and ...`도 NULL이라 if가 거짓으로 떨어져 권한 검사를 통과해 버린다.
  -- 다른 RPC와 같이 맨 앞에서 막는다.
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  -- 본인이거나, 이 방의 방장이거나.
  if check_user_id <> auth.uid() and not public.is_trip_host(check_trip_id) then
    raise exception 'NOT_ALLOWED';
  end if;

  select role into target_role
    from public.trip_members
    where trip_id = check_trip_id and user_id = check_user_id;
  -- 없는 멤버는 조용히 넘어간다. remove_expense와 같은 규칙이고, mock 구현
  -- (lib/data/mock/tripRepo.ts)이 같게 동작해야 NEXT_PUBLIC_DATA_SOURCE
  -- 스위치가 의미를 유지한다.
  if not found then
    return;
  end if;

  if target_role = 'host' then
    raise exception 'HOST_CANNOT_LEAVE';
  end if;

  -- 확정 후에는 멤버 구성도 계산의 전제라 지출·운전자·할인율과 함께 잠긴다.
  -- add_expense와 같은 이유로 `for share`를 건다 — 이게 없으면 settle_trip이
  -- 커밋하는 순간과 겹쳐, 이미 저장된 송금 리스트의 전제와 실제 멤버가 어긋난다.
  select settled_at into locked_settled_at
    from public.trips where id = check_trip_id for share;
  if locked_settled_at is not null then
    raise exception 'TRIP_ALREADY_SETTLED';
  end if;

  -- 이 함수의 존재 이유. payer와 participant를 둘 다 본다.
  -- payer만 검사하면 남의 지출에 참여자로만 들어간 사람이 통과하고, 그 행이
  -- cascade로 사라지면서 그 지출의 분담 인원이 줄어 남은 사람 부담이 늘어난다.
  -- 사용자가 할 일("지출부터 정리하세요")이 같아서 예외는 하나로 묶는다.
  if exists (
    select 1 from public.expenses
     where trip_id = check_trip_id and payer_id = check_user_id
  ) then
    raise exception 'HAS_EXPENSES';
  end if;

  if exists (
    select 1 from public.expense_participants
     where trip_id = check_trip_id and user_id = check_user_id
  ) then
    raise exception 'HAS_EXPENSES';
  end if;

  delete from public.trip_members
   where trip_id = check_trip_id and user_id = check_user_id;
end;
$$;

-- 일곱 RPC 모두 auth.uid()로 이미 걸러지지만(NOT_AUTHENTICATED 예외, is_trip_host
-- 등), 위 helper 함수들과 같은 이유로 anon의 기본 직접 EXECUTE 권한도 걷어
-- 관례를 맞추고 방어를 겹쳐 둔다.
revoke execute on function public.join_trip_by_code(text, text)                    from anon;
revoke execute on function public.add_expense(uuid, uuid, integer, text, text, uuid[]) from anon;
revoke execute on function public.remove_expense(uuid)                             from anon;
revoke execute on function public.create_trip(text, text, date, date, text, text, text) from anon;
revoke execute on function public.settle_trip(uuid, jsonb)                         from anon;
revoke execute on function public.unsettle_trip(uuid)                              from anon;
revoke execute on function public.leave_trip(uuid, uuid)                           from public;
revoke execute on function public.leave_trip(uuid, uuid)                           from anon;

grant execute on function public.join_trip_by_code(text, text) to authenticated;
grant execute on function public.add_expense(uuid, uuid, integer, text, text, uuid[])
  to authenticated;
grant execute on function public.remove_expense(uuid)         to authenticated;
grant execute on function public.create_trip(text, text, date, date, text, text, text)
  to authenticated;
grant execute on function public.settle_trip(uuid, jsonb)     to authenticated;
grant execute on function public.unsettle_trip(uuid)          to authenticated;
grant execute on function public.leave_trip(uuid, uuid)       to authenticated;

-- 13) 공공데이터 지역 콘텐츠 ---------------------------------------------------
--
-- 공공데이터포털 TourAPI에서 시군구 단위로 받아 온 관광지·음식점.
-- 이 절이 오랫동안 이 파일에 없었다 — 표 네 개가 supabase/migrations/에만 있어서
-- "이 파일 하나면 새 환경이 선다"는 위 머리말이 사실이 아니었다. DR·이관 때
-- 지역 페이지가 통째로 빠진 DB가 만들어진다.

-- 시군구 마스터 250건. seed(supabase/seed/regions.sql)로 한 번 채우고 이후엔 상태만 바뀐다.
create table if not exists public.regions (
  code               text primary key,          -- korea-sigungu.json의 5자리
  name               text not null,
  province           text not null,
  tour_area_code     int  not null,
  tour_sigungu_code  int,                       -- 세종은 null
  priority           int  not null default 999, -- 적재 순서. 낮을수록 먼저
  ingested_at        timestamptz,               -- null이면 미적재
  refreshed_at       timestamptz,
  attraction_count   int  not null default 0,
  restaurant_count   int  not null default 0,
  -- cron 2순위(overview 부족한 지역)가 이 값만 보면 되게 한다. attractions를 조인해
  -- 세면 PostgREST 임베디드 쿼리가 되어 취약하다.
  overview_count     int  not null default 0,
  attempt_count      int  not null default 0,
  last_error         text
);

alter table public.regions
  add column if not exists refreshed_at   timestamptz,
  add column if not exists attempt_count  int not null default 0,
  add column if not exists last_error     text,
  add column if not exists overview_count int not null default 0;

-- cron 1순위(미적재)가 이 인덱스를 탄다.
create index if not exists regions_pending_idx
  on public.regions (priority, code) where ingested_at is null;
-- cron 3순위(가장 오래 갱신 안 된 지역).
create index if not exists regions_refresh_idx
  on public.regions (attempt_count, refreshed_at nulls first, priority);

-- 관광지(contentTypeId 12)와 음식점(39)을 한 표에 담는다. TourAPI 공통 필드가 같고
-- 지역 페이지가 둘을 함께 읽기 때문이다.
--
-- 기본키가 (content_id, region_code) 복합인 것이 중요하다. TourAPI는 수원·성남·안양·
-- 안산·고양·용인·청주·천안·전주·포항·창원을 통째로 하나로 보는데, 시군구 30개가 그
-- 12개 지역을 공유한다. content_id 단독 기본키로는 같은 그룹의 뒤에 적재된 구가 앞선
-- 구의 행을 가져가, 약 17개 지역 페이지가 건수만 표시하고 빈 목록을 렌더한다.
create table if not exists public.attractions (
  content_id       text not null,               -- TourAPI contentid
  content_type_id  int  not null,
  region_code      text not null references public.regions(code),
  title            text not null,
  addr             text,
  lat              double precision,
  lng              double precision,
  image_url        text,
  cat1 text, cat2 text, cat3 text,
  overview         text,                        -- 지역 페이지 본문의 재료. 음식점은 항상 null
  -- overview 유무를 정렬 키로 쓴다. overview 본문으로 정렬하면 한국어 문단 사전순이
  -- 되어 버려 의미가 없고, mock 구현이 같은 순서를 재현할 수도 없다.
  has_overview     boolean generated always as (overview is not null) stored,
  tel              text,
  updated_at       timestamptz not null default now(),
  constraint attractions_pkey primary key (content_id, region_code)
);

create index if not exists attractions_region_type_idx
  on public.attractions (region_code, content_type_id, has_overview desc, title);

-- 적재 이력. 실패 원인을 나중에 확인할 유일한 창구다.
create table if not exists public.ingest_runs (
  id           bigserial primary key,
  started_at   timestamptz not null default now(),
  finished_at  timestamptz,
  region_codes text[],
  upserted     int not null default 0,
  trigger      text not null default 'cron',    -- cron | read_through
  status       text not null default 'running', -- running | ok | failed
  error        text
);

-- read-through 일일 상한을 세는 쿼리가 이 인덱스를 탄다.
create index if not exists ingest_runs_trigger_started_idx
  on public.ingest_runs (trigger, started_at desc);

-- 무료 플랜 정지 방지용 keepalive.
--
-- 적재 cron도 쓰기를 만들지만 그쪽은 TourAPI에 의존한다. 외부 API 장애나 한도 소진이
-- 일주일 이어지면 쓰기가 0이 되어 프로젝트가 정지한다. 이 표는 Postgres만 건드리므로
-- 그 실패 경로를 끊는다. 중복이 아니라 보험이다.
create table if not exists public.heartbeats (
  id      smallint primary key default 1,
  beat_at timestamptz not null default now(),
  constraint heartbeats_single_row check (id = 1)
);

insert into public.heartbeats (id) values (1) on conflict (id) do nothing;

-- ── RLS ─────────────────────────────────────────────────────────────────────
alter table public.regions     enable row level security;
alter table public.attractions enable row level security;
alter table public.ingest_runs enable row level security;
alter table public.heartbeats  enable row level security;

-- 공개 콘텐츠. 읽기만 연다.
drop policy if exists "지역 공개 읽기" on public.regions;
create policy "지역 공개 읽기" on public.regions
  for select using (true);

drop policy if exists "관광지 공개 읽기" on public.attractions;
create policy "관광지 공개 읽기" on public.attractions
  for select using (true);

-- 적재 이력은 관리자만. 권한 판정의 원본이 여기다 — 페이지의 notFound()는 두 번째 방어선.
drop policy if exists "관리자만 적재 이력 읽기" on public.ingest_runs;
create policy "관리자만 적재 이력 읽기" on public.ingest_runs
  for select using (
    exists (select 1 from public.profiles p
            where p.id = auth.uid() and p.is_admin)
  );

-- heartbeats에는 읽기 정책도 두지 않는다 — 어느 화면도 쓰지 않는다.
--
-- 네 표 모두 insert/update 정책이 없다. 쓰기는 RLS를 우회하는 service role 키로만
-- 가능하고, 그 키는 lib/supabase/admin.ts 한 파일에 갇힌다.

-- 14) RLS 안전망 (이벤트 트리거) ----------------------------------------------
--
-- public 스키마에 표가 새로 생기면 RLS를 자동으로 켠다.
--
-- 위 절들이 표마다 enable row level security를 명시하고 있으므로 이건 이중 방어다.
-- 막는 것은 "나중에 표를 추가하는 사람이 그 한 줄을 잊는 경우"이고, 그때 그 표는
-- anon 키로 전부 읽히는 상태로 열린다. 사람이 기억해야 하는 규칙을 DB가 대신 지킨다.
--
-- 이 함수와 트리거는 오랫동안 어느 파일에도 없이 운영 DB에만 있었다(SQL Editor에서
-- 직접 만든 것으로 보인다). 이 파일로 세운 환경에는 그물이 없다는 뜻이라 옮겨 둔다.
-- 로직은 운영에 있는 것을 그대로 옮겼고 들여쓰기만 이 파일 형식에 맞췄다.
--
-- 주의: 이벤트 트리거 생성에는 보통 상위 권한이 필요하다. Supabase의 SQL Editor가
-- 쓰는 postgres 역할에는 허용돼 있지만, 권한이 없는 환경에서는 이 절만 실패한다.
-- 그래서 파일 맨 뒤에 둔다 — 앞의 표·정책·함수는 이미 다 만들어진 뒤다.

create or replace function public.rls_auto_enable()
returns event_trigger
language plpgsql
security definer
set search_path to 'pg_catalog'
as $function$
declare
  cmd record;
begin
  for cmd in
    select *
      from pg_event_trigger_ddl_commands()
     where command_tag in ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
       and object_type in ('table', 'partitioned table')
  loop
    -- public만 대상으로 한다. 뒤의 세 조건은 앞의 IN ('public')에 이미 걸러지지만
    -- 원본 그대로 둔다 — 나중에 대상 스키마를 늘릴 때 그 방어가 살아 있어야 한다.
    if cmd.schema_name is not null
       and cmd.schema_name in ('public')
       and cmd.schema_name not in ('pg_catalog', 'information_schema')
       and cmd.schema_name not like 'pg_toast%'
       and cmd.schema_name not like 'pg_temp%' then
      begin
        execute format('alter table if exists %s enable row level security', cmd.object_identity);
        raise log 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      exception
        -- 삼킨다. RLS를 못 켰다고 표 생성 자체를 실패시키지 않는다 —
        -- 마이그레이션 한복판에서 DDL이 죽는 편이 더 나쁘다. 로그로만 알린다.
        when others then
          raise log 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      end;
    else
      raise log 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)',
        cmd.object_identity, cmd.schema_name;
    end if;
  end loop;
end;
$function$;

-- create event trigger에는 if not exists가 없다. 재실행 가능하게 drop을 앞세운다.
drop event trigger if exists ensure_rls;
create event trigger ensure_rls
  on ddl_command_end
  when tag in ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
  execute function public.rls_auto_enable();
