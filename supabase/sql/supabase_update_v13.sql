-- VocaPro 업데이트 v13: 회원가입이 '서버 설정에 문제가 있어요'로 막히는 문제 고치기
-- v12 를 실행한 뒤에(또는 v10 · v11 · v12 중 일부만 실행했어도) 이 파일을 실행하세요. 여러 번 실행해도 안전해요.
--
-- 1) 가입 속도 제한에 쓰는 표가 없으면 만들어요(v10 을 건너뛰고 v12 를 실행하면 표가 없어 모든 가입이 실패했어요).
-- 2) 학교처럼 한 인터넷 주소(IP)에서 여러 반이 같이 가입해도 되게: 같은 IP 한 시간 300개, 전체 한 시간 3,000개.
--    지금 시간대에 쌓인 횟수는 0으로 되돌려요.
-- 3) 속도 제한 검사에서 예상하지 못한 오류가 나도 가입을 막지 않아요(일부러 막는 'too_many_signups'만 막아요).
-- 4) 마지막에 가입을 시험해 결과를 보여 줘요(시험 계정은 바로 되돌려서 남지 않아요). '가입 OK'가 나오면 정상이에요.

create table if not exists public.voca_signup_rate (
  hr timestamptz primary key,
  n int not null default 0
);
alter table public.voca_signup_rate enable row level security;
revoke all on table public.voca_signup_rate from public, anon, authenticated;

create table if not exists public.voca_signup_ip (
  ip text not null,
  hr timestamptz not null,
  n int not null default 0,
  primary key (ip, hr)
);
alter table public.voca_signup_ip enable row level security;
revoke all on table public.voca_signup_ip from public, anon, authenticated;

create or replace function public.voca_req_ip()
returns text language plpgsql stable set search_path = public as $$
declare h json; v text;
begin
  begin h := current_setting('request.headers', true)::json; exception when others then return ''; end;
  if h is null then return ''; end if;
  v := coalesce(h->>'cf-connecting-ip', split_part(coalesce(h->>'x-forwarded-for', ''), ',', 1), h->>'x-real-ip', '');
  return left(btrim(v), 64);
end $$;
revoke all on function public.voca_req_ip() from public, anon, authenticated;

create or replace function public.voca_signup_guard()
returns trigger language plpgsql security definer set search_path = public as $$
declare c int; v_ip text; over boolean := false;
begin
  begin
    v_ip := public.voca_req_ip();
    delete from public.voca_signup_rate where hr < now() - interval '2 days';
    delete from public.voca_signup_ip where hr < now() - interval '2 days';
    if v_ip <> '' then
      insert into public.voca_signup_ip(ip, hr, n) values (v_ip, date_trunc('hour', now()), 1)
      on conflict (ip, hr) do update set n = public.voca_signup_ip.n + 1 returning public.voca_signup_ip.n into c;
      if c > 300 then over := true; end if;
    end if;
    insert into public.voca_signup_rate(hr, n) values (date_trunc('hour', now()), 1)
    on conflict (hr) do update set n = public.voca_signup_rate.n + 1 returning public.voca_signup_rate.n into c;
    if c > 3000 then over := true; end if;
  exception when others then
    over := false; -- 제한 검사가 고장 나도 가입은 돼요
  end;
  if over then raise exception 'too_many_signups' using errcode = 'P0001'; end if;
  return new;
end $$;
revoke all on function public.voca_signup_guard() from public, anon, authenticated;

do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'voca_accounts') then
    drop trigger if exists voca_signup_guard on public.voca_accounts;
    create trigger voca_signup_guard before insert on public.voca_accounts for each row execute function public.voca_signup_guard();
  end if;
end $$;

-- 지금 시간대 횟수 되돌리기(오늘 막혔던 학생들이 바로 다시 가입할 수 있게)
delete from public.voca_signup_ip where hr >= date_trunc('hour', now()) - interval '1 hour';
delete from public.voca_signup_rate where hr >= date_trunc('hour', now()) - interval '1 hour';

notify pgrst, 'reload schema';

-- 가입 시험: 시험 계정을 만들었다가 바로 되돌려요. 아래 결과 칸에 '가입 OK' 또는 오류 내용이 나와요
create or replace function public.voca_signup_selftest()
returns text language plpgsql security definer set search_path = public as $$
declare r text;
begin
  begin
    r := public.voca_signup(p_user => 'zt' || substr(md5(random()::text), 1, 12), p_pw => 'selftest-' || substr(md5(random()::text), 1, 8))::text;
    if r is null or r like '%"err"%' then raise exception using message = coalesce(r, 'null'); end if;
    raise exception using message = '__vp_ok__';
  exception when others then
    if sqlerrm = '__vp_ok__' then return '가입 OK'; end if;
    return '가입 오류: ' || sqlerrm;
  end;
end $$;
revoke all on function public.voca_signup_selftest() from public, anon, authenticated;
select public.voca_signup_selftest() as "가입 시험";
drop function public.voca_signup_selftest();
