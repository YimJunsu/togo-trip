-- 지출 삭제는 결제자·방장만, 한 건 금액은 1억 원까지. (2026-11-18)
--
-- 이 파일은 schema.sql을 이미 실행한 DB에 이 변경만 얹는 델타다.
-- 새 DB는 schema.sql 전체, 이미 붙인 DB는 이 파일을 SQL Editor에 붙여 실행한다.
-- (schema.sql에도 같은 내용이 반영돼 있다. 두 파일이 어긋나면 schema.sql이 원본이다.)
--
-- 왜:
-- 1) remove_expense가 멤버면 누구나 남의 지출을 지우게 했다. 자기가 나눠 내야 하는
--    지출을 지우면 송금액이 줄어드는데 막을 길도 기록도 없었다. 앱의 서버 액션
--    (lib/expenses/actions.ts)은 이미 같은 규칙을 보지만, RPC는 두 번째 정문이다.
-- 2) amount가 int4라 "0을 하나 더 친" 입력이 정산 전체를 뒤집었다. 앱과 같은 상한
--    (lib/expenses/validate.ts의 MAX_EXPENSE_AMOUNT)을 CHECK로 건다. 기존 행 중
--    1억을 넘는 것이 있으면 이 ALTER가 실패한다 — 그 행부터 정리한 뒤 다시 돌린다.

alter table public.expenses drop constraint if exists expenses_amount_max;
alter table public.expenses
  add constraint expenses_amount_max check (amount <= 100000000);

create or replace function public.remove_expense(check_expense_id uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  target_trip_id    uuid;
  target_payer_id   uuid;
  locked_settled_at timestamptz;
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  select trip_id, payer_id into target_trip_id, target_payer_id
    from public.expenses where id = check_expense_id;
  if not found then
    return;
  end if;

  if not public.is_trip_member(target_trip_id) then
    raise exception 'NOT_TRIP_MEMBER';
  end if;

  if target_payer_id <> auth.uid() and not public.is_trip_host(target_trip_id) then
    raise exception 'NOT_ALLOWED';
  end if;

  select settled_at into locked_settled_at
    from public.trips where id = target_trip_id for share;
  if locked_settled_at is not null then
    raise exception 'TRIP_ALREADY_SETTLED';
  end if;

  delete from public.expenses where id = check_expense_id;
end;
$$;
