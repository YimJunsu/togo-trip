-- 요청사항(requests)을 추가한다. (2026-09-20)
--
-- 이 파일은 schema.sql을 이미 실행한 DB에 이 변경만 얹는 델타다.
-- 새 DB는 schema.sql 전체, 이미 붙인 DB는 이 파일을 SQL Editor에 붙여 실행한다.
-- (schema.sql에도 같은 내용이 반영돼 있다. 두 파일이 어긋나면 schema.sql이 원본이다.)
--
-- 왜: 홈 아래에 «요청 넣기» 구역을 두어 회원이 기능 제안·오류 신고를 남기고,
-- 관리자만 /admin/requests 에서 모아 보며 처리 여부를 표시한다.

-- 1) 관리자 판정 함수 -------------------------------------------------------
-- profiles.is_admin을 보는 정책이 ingest_runs에 이미 하나 있었는데 exists()를 인라인으로
-- 썼다. 표가 둘이 되면서 한 함수로 모은다. security definer인 이유는 is_onboarded()와
-- 같다 — profiles 읽기 정책이 본인 행뿐이라 정책 안에서 남의 플래그를 못 본다.
create or replace function public.is_admin()
returns boolean
language sql security definer stable set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
     where id = auth.uid() and is_admin
  );
$$;

grant execute on function public.is_admin() to authenticated, anon;

-- 2) 표 --------------------------------------------------------------------
-- 작성자 닉네임·이메일을 행에 복사해 둔다. 관리자가 남의 profiles 행을 읽는 정책을
-- 열면 전화번호·생년월일까지 딸려 나가므로, 관리 화면에 필요한 둘만 스냅샷으로
-- 가져온다. 닉네임을 나중에 바꿔도 여기는 그대로다 — 보낸 시점의 이름이면 충분하다.
--
-- on delete cascade: 계정이 지워지면 요청도 같이 지운다. 요청은 회원 서비스 기록이고
-- 남겨 둘 이유가 없다. profiles를 가리키는 restrict FK를 하나 더 늘리지 않는다.
create table if not exists public.requests (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  author_name  text not null,
  author_email text not null,
  kind         text not null check (kind in ('feature', 'bug', 'other')),
  -- 최소 10자. "ㅇㅇ" 같은 한 글자 요청은 관리자가 아무것도 할 수 없다.
  -- lib/requests/limits.ts와 같은 값이다. 한쪽을 바꾸면 같이 바꾼다.
  content      text not null check (char_length(btrim(content)) between 10 and 1000),
  status       text not null default 'open' check (status in ('open', 'done')),
  created_at   timestamptz not null default now(),
  resolved_at  timestamptz
);

-- 관리 화면은 항상 전체를 최신순으로 읽는다.
create index if not exists requests_created_idx on public.requests(created_at desc);

-- 3) RLS -------------------------------------------------------------------
alter table public.requests enable row level security;

-- 본인 것은 읽을 수 있게 열어 둔다. 지금 화면은 안 쓰지만, «내가 보낸 요청»을 붙일 때
-- 정책을 다시 만지지 않기 위해서다. 관리자는 전부.
drop   policy if exists "본인 또는 관리자만 요청 읽기" on public.requests;
create policy "본인 또는 관리자만 요청 읽기" on public.requests
  for select using (user_id = auth.uid() or public.is_admin());

-- insert 정책이 없다 = 아래 create_request RPC로만 넣는다. 스냅샷 컬럼을 클라이언트가
-- 채우게 두면 남의 이름으로 보낼 수 있다.

drop   policy if exists "관리자만 요청 상태 변경" on public.requests;
create policy "관리자만 요청 상태 변경" on public.requests
  for update using (public.is_admin()) with check (public.is_admin());

-- RLS는 어느 행인지만 제한한다. 관리자라도 내용·작성자를 고쳐 쓰면 안 되므로
-- 컬럼 권한으로 상태 둘만 연다.
revoke update on public.requests from authenticated, anon;
grant  update (status, resolved_at) on public.requests to authenticated;

-- 4) RPC -------------------------------------------------------------------
create or replace function public.create_request(kind_input text, content_input text)
returns public.requests
language plpgsql security definer set search_path = ''
as $$
declare
  me      public.profiles%rowtype;
  created public.requests%rowtype;
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  select * into me from public.profiles where id = auth.uid();
  -- 온보딩을 마치지 않은 계정은 앱 전체가 로그아웃으로 본다. 여기도 같은 판정.
  if not found or me.onboarded_at is null then
    raise exception 'NOT_ONBOARDED';
  end if;

  -- 길이·종류는 표의 CHECK가 막는다. 앱(lib/requests/actions.ts)이 먼저 거르지만
  -- 액션을 우회한 직접 호출은 여기서 23514로 떨어진다.
  insert into public.requests (user_id, author_name, author_email, kind, content)
  values (me.id, me.name, me.email, kind_input, btrim(content_input))
  returning * into created;

  return created;
end;
$$;

revoke execute on function public.create_request(text, text) from public, anon;
grant  execute on function public.create_request(text, text) to authenticated;
