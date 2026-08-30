-- 구글 로그인 온보딩 (2026-08-30)
-- 설계: docs/superpowers/specs/2026-08-30-google-login-design.md

-- ── 1. 온보딩 완료 시각 ─────────────────────────────────────────────────────
-- schema.sql은 "profiles 행이 있다는 것 자체가 동의를 뜻한다"고 적었다. OAuth에서는
-- 트리거가 인증 직후 행을 만들어 버리므로 그 전제가 깨진다 — 행이 있어도 우리
-- 동의 화면을 거치지 않은 상태가 생긴다. 그 구분을 이 컬럼이 맡는다.
-- null이면 미완료이고, 값이 있으면 그 시각에 약관·개인정보에 동의했다는 뜻이다.
alter table public.profiles
  add column if not exists onboarded_at timestamptz;

-- ── 2. 기존 사용자 백필 ─────────────────────────────────────────────────────
-- 이메일로 가입한 사람들은 가입 폼에서 이미 동의를 마쳤다. 비워 두면 아래 앱
-- 규칙(미완료 = 로그아웃)에 걸려 기존 사용자 전원이 로그인에서 막힌다.
update public.profiles
   set onboarded_at = created_at
 where onboarded_at is null;

-- ── 3. 트리거: provider에 따라 갈라진다 ─────────────────────────────────────
-- 이메일 가입은 동의 화면을 이미 거쳤으므로 바로 찍는다.
-- OAuth는 비워 두고, 앱의 온보딩 화면이 채운다.
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
