-- VocaPro v3: 서버 AI 일일 사용 한도 (SQL Editor에서 실행)
create table if not exists public.voca_ai_usage (
  uid text not null,
  day date not null default current_date,
  n int not null default 0,
  primary key (uid, day)
);
alter table public.voca_ai_usage enable row level security;

create or replace function public.voca_ai_use(p_uid text, p_limit int)
returns boolean language plpgsql security definer set search_path = public as $$
declare c int;
begin
  insert into public.voca_ai_usage(uid, day, n) values (p_uid, current_date, 1)
  on conflict (uid, day) do update set n = public.voca_ai_usage.n + 1
  returning n into c;
  return c <= p_limit;
end $$;

revoke all on function public.voca_ai_use(text, int) from public, anon, authenticated;
grant execute on function public.voca_ai_use(text, int) to service_role;
