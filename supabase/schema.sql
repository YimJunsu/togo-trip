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
  -- 마케팅 수신 동의(선택). 필수 동의는 가입의 전제라 따로 남기지 않는다.
  -- 기본값은 반드시 false다 — 동의하지 않은 사람에게 보내면 정보통신망법 위반이다.
  marketing_opt_in     boolean not null default false,
  created_at           timestamptz not null default now()
);

-- 1-a) 기존 프로젝트용 마이그레이션 ------------------------------------------
-- profiles를 이미 만들어 둔 프로젝트라면 위 create가 건너뛰어지므로 컬럼이 없다.
-- 이 줄이 그 경우를 메운다. 이미 있으면 아무 일도 하지 않는다.
alter table public.profiles
  add column if not exists marketing_opt_in boolean not null default false;

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
  insert into public.profiles (
    id, name, email, phone, birth_date, provider, marketing_opt_in
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', ''),
    new.email,
    coalesce(new.raw_user_meta_data->>'phone', ''),
    nullif(new.raw_user_meta_data->>'birthDate', '')::date,
    coalesce(new.raw_app_meta_data->>'provider', 'email'),
    -- 값이 없거나 'true'가 아니면 미동의로 떨어뜨린다.
    coalesce(new.raw_user_meta_data->>'marketingOptIn', 'false') = 'true'
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
