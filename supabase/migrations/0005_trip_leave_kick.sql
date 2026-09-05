-- 여행방 나가기 / 방장이 멤버 내보내기.
--
-- 이 파일은 schema.sql을 이미 실행한 DB에 이 변경만 얹는 델타다.
-- 새 DB는 schema.sql 전체, 이미 붙인 DB는 이 파일을 SQL Editor에 붙여 실행한다.
-- (schema.sql에도 같은 내용이 반영돼 있다. 두 파일이 어긋나면 schema.sql이 원본이다.)
--
-- 왜: trips·trip_members에 DELETE 정책이 없어 잘못 들어간 방에서 빠져나올 방법도,
-- 방장이 잘못 참여한 사람을 정리할 방법도 없었다.
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

-- 다른 RPC와 같은 이유로 anon의 기본 직접 EXECUTE 권한도 걷는다.
-- 위 NOT_AUTHENTICATED가 이미 막지만 방어를 겹쳐 둔다.
revoke execute on function public.leave_trip(uuid, uuid) from public;
revoke execute on function public.leave_trip(uuid, uuid) from anon;
grant  execute on function public.leave_trip(uuid, uuid) to authenticated;
