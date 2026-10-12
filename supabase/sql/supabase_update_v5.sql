-- VocaPro v5: AI 하루 사용 한도 + 사용 기록 30일 보관 (개인정보 처리방침 제3조)
-- v3를 실행하지 않았어도 이 파일 하나로 충분해요. SQL Editor에서 통째로 한 번 실행하세요.
create table if not exists public.voca_ai_usage (
  uid text not null,
  day date not null default current_date,
  n int not null default 0,
  primary key (uid, day)
);
alter table public.voca_ai_usage enable row level security;
revoke all on table public.voca_ai_usage from public, anon, authenticated;

create or replace function public.voca_ai_use(p_uid text, p_limit int)
returns boolean language plpgsql security definer set search_path = public as $$
declare c int;
begin
  delete from public.voca_ai_usage where day < current_date - 30;
  insert into public.voca_ai_usage(uid, day, n) values (p_uid, current_date, 1)
  on conflict (uid, day) do update set n = public.voca_ai_usage.n + 1
  returning n into c;
  return c <= p_limit;
end $$;

revoke all on function public.voca_ai_use(text, int) from public, anon, authenticated;
grant execute on function public.voca_ai_use(text, int) to service_role;
