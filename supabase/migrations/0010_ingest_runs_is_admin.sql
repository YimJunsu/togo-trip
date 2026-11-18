-- 적재 이력 정책이 is_admin()을 보게 한다. (2026-10-03)
--
-- 이 파일은 schema.sql을 이미 실행한 DB에 이 변경만 얹는 델타다.
-- 새 DB는 schema.sql 전체, 이미 붙인 DB는 이 파일을 SQL Editor에 붙여 실행한다.
-- (schema.sql에도 같은 내용이 반영돼 있다. 두 파일이 어긋나면 schema.sql이 원본이다.)
--
-- 왜: 관리자 판정이 두 군데 적혀 있었다. ingest_runs 정책은 is_admin() 함수(0009)보다
-- 먼저 만들어져 exists()를 인라인으로 갖고 있었고, requests 정책은 함수를 본다.
-- 판정 기준이 바뀔 때 한쪽만 고치면 «적재 이력은 보이는데 요청은 안 보이는»
-- 식으로 조용히 갈라진다.
--
-- 동작은 전과 똑같다. 지금 돌리지 않아도 두 표현이 같은 결과를 내므로 급하지 않다.
drop policy if exists "관리자만 적재 이력 읽기" on public.ingest_runs;
create policy "관리자만 적재 이력 읽기" on public.ingest_runs
  for select using (public.is_admin());
