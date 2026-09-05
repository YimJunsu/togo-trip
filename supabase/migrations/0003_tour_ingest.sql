-- 공공데이터 관광정보 적재 (feat/tour-api-ingest)

-- 시군구 마스터 250건. seed로 한 번 채우고 이후엔 상태만 바뀐다.
create table if not exists public.regions (
  code               text primary key,          -- korea-sigungu.json의 5자리
  name               text not null,
  province           text not null,
  tour_area_code     int  not null,
  tour_sigungu_code  int,                       -- 세종은 null
  priority           int  not null default 999, -- 적재 순서. 낮을수록 먼저
  ingested_at        timestamptz,               -- null이면 미적재
  attraction_count   int  not null default 0,
  restaurant_count   int  not null default 0
);

-- cron이 매번 "미적재 중 우선순위 높은 3건"을 찾는 쿼리를 탄다.
create index if not exists regions_pending_idx
  on public.regions (priority, code) where ingested_at is null;

-- 관광지(12)와 음식점(39)을 한 테이블에 담는다.
-- TourAPI 공통 필드가 같고, 지역 페이지가 둘을 함께 읽기 때문이다.
create table if not exists public.attractions (
  content_id       text primary key,            -- TourAPI contentid
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
  updated_at       timestamptz not null default now()
);

-- 테이블이 이미 존재하는 경우(위 create table if not exists가 스킵된 경우)를 위한 보강.
alter table public.attractions
  add column if not exists has_overview boolean
  generated always as (overview is not null) stored;

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

-- 관리자 플래그
alter table public.profiles
  add column if not exists is_admin boolean not null default false;

-- ── RLS ─────────────────────────────────────────────────────────────────────
alter table public.regions     enable row level security;
alter table public.attractions enable row level security;
alter table public.ingest_runs enable row level security;

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

-- 세 테이블 모두 insert/update 정책이 없다. 쓰기는 RLS를 우회하는 service role 키로만
-- 가능하고, 그 키는 lib/supabase/admin.ts 한 파일에 갇힌다.
