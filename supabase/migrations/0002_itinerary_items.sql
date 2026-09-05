-- 날짜별 일정(itinerary_items)을 추가한다.
--
-- 이 파일은 schema.sql을 이미 실행한 DB에 이 변경만 얹는 델타다.
-- 새 DB는 schema.sql 전체, 이미 붙인 DB는 이 파일을 SQL Editor에 붙여 실행한다.
-- (schema.sql에도 같은 내용이 반영돼 있다. 두 파일이 어긋나면 schema.sql이 원본이다.)
--
-- 왜: 여행방 상세의 "일정" 탭이 날짜 칸만 그려 두고 담을 것이 없었다.
-- PROJECT_SPEC §3에 일정 항목 타입 자체가 없어 화면이 빈 슬롯으로 남아 있었다.

-- 1) 표 --------------------------------------------------------------------
-- 돈 계산에 들어가지 않으므로 expenses처럼 무거운 제약이 없다. 정산 확정과도
-- 무관하다 — 확정된 방에서도 일정은 계속 고칠 수 있다(잠기는 건 계산 입력뿐).
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
  at         time,
  title      text not null check (char_length(btrim(title)) between 1 and 60),
  memo       text not null default '' check (char_length(memo) <= 500),
  created_at timestamptz not null default now()
);

-- 목록은 항상 한 여행방의 것을 날짜순으로 읽는다.
create index if not exists itinerary_items_trip_day_idx
  on public.itinerary_items(trip_id, day);

-- 2) RLS -------------------------------------------------------------------
-- 지출·정산과 달리 RPC를 거치지 않고 정책만으로 연다. 한 행이 곧 한 일정이라
-- 함께 만들어져야 할 짝이 없고, 돈이 걸리지 않아 확정 잠금과 얽히지도 않는다.
--
-- UPDATE 정책은 없다. 지금 화면은 추가·삭제만 한다 — 고칠 일이 생기면 지우고
-- 다시 넣는다. 쓰지 않는 구멍을 미리 뚫지 않는다.
alter table public.itinerary_items enable row level security;

drop   policy if exists "멤버만 일정 읽기" on public.itinerary_items;
create policy "멤버만 일정 읽기" on public.itinerary_items
  for select using (public.is_trip_member(trip_id));

drop   policy if exists "멤버만 일정 추가" on public.itinerary_items;
create policy "멤버만 일정 추가" on public.itinerary_items
  for insert with check (public.is_trip_member(trip_id));

-- 넣은 사람만이 아니라 멤버면 지울 수 있다. 일정은 같이 짜는 것이고, 넣은 사람이
-- 자리에 없다고 잘못 들어간 줄을 아무도 못 지우면 그게 더 불편하다.
drop   policy if exists "멤버만 일정 삭제" on public.itinerary_items;
create policy "멤버만 일정 삭제" on public.itinerary_items
  for delete using (public.is_trip_member(trip_id));
