-- 지출 삭제를 RLS 정책에서 remove_expense RPC로 옮긴다.
--
-- 이 파일은 schema.sql을 이미 실행한 DB에 이 변경만 얹는 델타다. schema.sql은
-- create policy가 idempotent하지 않아(같은 이름이면 42710) 전체 재실행이 안전하지
-- 않다 — 새 DB는 schema.sql 전체, 이미 붙인 DB는 이 파일을 SQL Editor에 붙여 실행한다.
-- (schema.sql에도 같은 내용이 반영돼 있다. 두 파일이 어긋나면 schema.sql이 원본이다.)
--
-- 왜: 걷어낸 정책이 부르는 is_trip_settled는 stable이라 스냅샷을 본다. READ COMMITTED
-- 에서 settle_trip의 `for update` 커밋과 겹치면 삭제가 "미확정"으로 통과해, 이미 저장된
-- 송금 리스트에 몫이 반영된 지출이 사라진다. 확정된 방엔 INSERT 경로가 없어(add_expense
-- 가 TRIP_ALREADY_SETTLED로 거절) 되살릴 수도 없다. add_expense가 `for share`로 막은
-- 실패의 대칭형이라 해법도 같다.

-- 1) 삭제 정책을 걷는다. 이 순간부터 REST DELETE는 0행을 돌려준다(권한 오류가 아니다).
drop policy if exists "미확정 방 지출만 삭제" on public.expenses;

-- 2) 삭제 경로를 RPC로 옮긴다.
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
  -- 없는 지출은 조용히 넘어간다(mock의 remove와 같게).
  if not found then
    return;
  end if;

  if not public.is_trip_member(target_trip_id) then
    raise exception 'NOT_TRIP_MEMBER';
  end if;

  -- settle_trip의 `for update`와 순서를 강제한다. 확정이 먼저 커밋됐다면
  -- 여기서 잠금을 기다린 뒤 settled_at을 보고 거절한다.
  select settled_at into locked_settled_at
    from public.trips where id = target_trip_id for share;
  if locked_settled_at is not null then
    raise exception 'TRIP_ALREADY_SETTLED';
  end if;

  delete from public.expenses where id = check_expense_id;
end;
$$;

-- 3) create function은 PUBLIC에 EXECUTE를 준다. 다른 RPC와 같은 관례로 anon을 걷고
--    authenticated에 명시적으로 준다.
revoke execute on function public.remove_expense(uuid) from anon;
grant  execute on function public.remove_expense(uuid) to authenticated;
