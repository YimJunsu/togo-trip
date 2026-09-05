-- 전량 선적재와 상시 갱신 (2026-08-03)

-- ── 1. regions: 갱신 주기와 실패 추적 ───────────────────────────────────────
alter table public.regions
  add column if not exists refreshed_at   timestamptz,
  add column if not exists attempt_count  int not null default 0,
  add column if not exists last_error     text,
  -- cron 2순위(overview 부족한 지역)가 이 값만 보면 되게 한다. attractions를
  -- 조인해 세면 PostgREST 임베디드 쿼리가 되어 취약하다.
  add column if not exists overview_count int not null default 0;

-- cron 3순위(가장 오래 갱신 안 된 지역)가 이 인덱스를 탄다.
create index if not exists regions_refresh_idx
  on public.regions (attempt_count, refreshed_at nulls first, priority);

-- ── 2. attractions 복합키 전환 ──────────────────────────────────────────────
-- TourAPI는 수원시·성남시·안양시·안산시·고양시·용인시·청주시·천안시·전주시·
-- 포항시·창원시를 통째로 하나로 본다. 시군구 30개가 12개 지역을 공유하는데
-- content_id 단독 기본키로는 같은 그룹의 뒤에 적재된 구가 앞선 구의 행을 가져간다.
-- 완주 시 약 17개 지역 페이지가 건수만 표시하고 빈 목록을 렌더하게 된다.
--
-- 기존 데이터는 버린다 — 3개 지역 180건뿐이고 어차피 그룹 단위로 다시 넣는다.
-- 파괴적 구간이라 "아직 단일 기본키인가"로 가드한다. 파일의 나머지가 전부
-- if not exists로 안전해 보이는데 이 블록만 무조건 돌면, 실수로 재실행했을 때
-- 1만 행과 250개 지역의 적재 상태가 날아가고 이틀치 API 쿼터를 다시 써야 한다.
do $$
begin
  if exists (
    select 1 from pg_constraint
     where conrelid = 'public.attractions'::regclass
       and contype = 'p'
       and array_length(conkey, 1) = 1
  ) then
    truncate table public.attractions;

    alter table public.attractions drop constraint attractions_pkey;
    alter table public.attractions
      add constraint attractions_pkey primary key (content_id, region_code);

    -- 복합키로 다시 넣어야 하므로 적재 상태를 되돌린다.
    update public.regions
       set ingested_at = null, refreshed_at = null,
           attraction_count = 0, restaurant_count = 0, overview_count = 0,
           attempt_count = 0, last_error = null;
  end if;
end $$;

-- ── 3. heartbeat ────────────────────────────────────────────────────────────
-- Supabase 무료 플랜 정지 방지용 keepalive.
--
-- 적재 cron도 쓰기를 만들지만 그쪽은 TourAPI에 의존한다. 외부 API 장애나 한도
-- 소진이 일주일 이어지면 쓰기가 0이 되어 프로젝트가 정지한다. 이 테이블은
-- Postgres만 건드리므로 그 실패 경로를 끊는다. 중복이 아니라 보험이다.
create table if not exists public.heartbeats (
  id      smallint primary key default 1,
  beat_at timestamptz not null default now(),
  constraint heartbeats_single_row check (id = 1)
);

insert into public.heartbeats (id) values (1) on conflict (id) do nothing;

-- 쓰기는 service role만. 읽기 정책도 두지 않는다 — 화면에 쓰이지 않는다.
alter table public.heartbeats enable row level security;
