-- VocaPro 업데이트 v17: 방문 기록(IP)
-- 사이트에 들어올 때마다 IP, 브라우저, 시각, (로그인했다면) 회원 아이디를 기록하고 방문자에게 자기 IP를 돌려줘요.
-- 관리자는 Supabase 대시보드 > Table Editor > voca_visit_log 에서 최근 방문을 봐요.
-- 같은 IP · 같은 회원은 10분에 한 번만 기록하고, 180일이 지난 기록은 자동으로 지워요. 여러 번 실행해도 안전해요.

create table if not exists public.voca_visits (
  id bigserial primary key,
  at timestamptz not null default now(),
  ip text not null default '',
  uid text,
  ua text
);
create index if not exists voca_visits_at on public.voca_visits (at desc);
create index if not exists voca_visits_ip on public.voca_visits (ip, at desc);
alter table public.voca_visits enable row level security;
revoke all on table public.voca_visits from public, anon, authenticated;
revoke all on sequence public.voca_visits_id_seq from public, anon, authenticated;

-- 앱이 부르는 함수: 기록하고 IP를 돌려줘요. p_token 은 로그인했을 때만 보내요.
create or replace function public.voca_visit(p_token text default null, p_ua text default null)
returns text language plpgsql security definer set search_path = public as $$
declare v_ip text := public.voca_req_ip(); v_uid text; j jsonb;
begin
  if p_token is not null and char_length(p_token) between 16 and 400 then
    begin
      j := to_jsonb(public.voca_me(p_token));
      if j is not null and jsonb_typeof(j) = 'object' and not (j ? 'err') then
        v_uid := coalesce(nullif(j->>'username', ''), nullif(j->>'id', ''));
      end if;
    exception when others then v_uid := null; end;
  end if;
  if not exists (
    select 1 from public.voca_visits
    where ip = v_ip and uid is not distinct from v_uid and at > now() - interval '10 minutes'
  ) then
    insert into public.voca_visits (ip, uid, ua) values (v_ip, v_uid, left(p_ua, 300));
  end if;
  if random() < 0.02 then
    delete from public.voca_visits where at < now() - interval '180 days';
  end if;
  return v_ip;
end $$;
revoke all on function public.voca_visit(text, text) from public;
grant execute on function public.voca_visit(text, text) to anon, authenticated;

-- 관리자용 보기: 한국 시간, 최신순
create or replace view public.voca_visit_log as
  select v.at at time zone 'Asia/Seoul' as "시각(한국)", v.ip as "IP", coalesce(v.uid, '(로그인 안 함)') as "회원", v.ua as "브라우저"
  from public.voca_visits v
  order by v.at desc;
revoke all on public.voca_visit_log from public, anon, authenticated;

notify pgrst, 'reload schema';
