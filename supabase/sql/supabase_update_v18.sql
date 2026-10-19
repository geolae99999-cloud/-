-- VocaPro 업데이트 v18: 보안 강화
-- 1) 예전 Supabase Auth용 표 user_data(지금은 쓰지 않음, 비어 있음)에서 앱 권한을 거둬요.
--    RLS가 켜져 있어도 TRUNCATE 권한은 RLS를 건너뛰기 때문에 anon 에게 남겨 두면 안 돼요.
-- 2) 앞으로 public 스키마에 새로 만드는 표 · 함수 · 시퀀스는 기본으로 앱(anon · authenticated)이 못 쓰게 해요.
--    필요한 것만 각 업데이트 SQL에서 grant 로 직접 열어요 (지금까지의 v3~v17 도 모두 그렇게 했어요).
-- 여러 번 실행해도 안전해요.

revoke all on table public.user_data from anon, authenticated;

alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;
alter default privileges in schema public revoke execute on functions from public, anon, authenticated;

notify pgrst, 'reload schema';
