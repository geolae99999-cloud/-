-- VocaPro v10: 보안 점검 보강 (v9까지 실행한 뒤 SQL Editor에 이 파일 전체를 붙여 넣고 Run을 한 번 누르세요. 다시 실행해도 안전해요.)
-- 1) AI 하루 한도: 한도를 넘긴 계정의 요청은 전체 사용량에 더하지 않아요. (한 계정이 모두의 AI를 막는 것 방지)
-- 2) 게임 점수 검사 강화: 답 사이 최소 0.4초, 한 판 최대 130문제, 숫자 범위 검사 (오류로 입장권이 되살아나는 것 방지)
-- 3) 반 참여: 동시에 여러 번 보내도 틀린 코드 20번 한도, 반 10개·인원 200명 한도가 지켜져요. 내보낸 학생은 다시 못 들어와요.
-- 4) 과제·실시간·진도 보내기: 계정당 전체 과제 수와 하루 만들기 수, 보내는 간격을 제한해요.
-- 5) 우리 반 랭킹: 반 참여 때 적은 실명 대신 게임 별명을 보여 줘요.
-- 6) 가입: 전체 가입 수를 한 시간에 300개로 제한해요 (계정을 대량으로 만들어 한도를 피하는 것 방지).

-- 1) AI 사용량
create or replace function public.voca_ai_use(p_uid text, p_limit int, p_global int)
returns boolean language plpgsql security definer set search_path = public as $$
declare c int; g int;
begin
  delete from public.voca_ai_usage where day < current_date - 30;
  insert into public.voca_ai_usage(uid, day, n) values (p_uid, current_date, 1)
  on conflict (uid, day) do update set n = public.voca_ai_usage.n + 1
  returning n into c;
  if c > p_limit then return false; end if;
  insert into public.voca_ai_usage(uid, day, n) values ('*', current_date, 1)
  on conflict (uid, day) do update set n = public.voca_ai_usage.n + 1
  returning n into g;
  return coalesce(p_global, 0) <= 0 or g <= p_global;
end $$;
revoke all on function public.voca_ai_use(text, int, int) from public, anon, authenticated;
grant execute on function public.voca_ai_use(text, int, int) to service_role;

-- 2) 게임 결과 올리기 (v9과 같고 검사만 강화)
create or replace function public.voca_game_submit(p_token text, p_run text, p_log jsonb, p_name text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare u text := public.voca_uid(p_token); wk text := public.voca_game_week(); nm text := public.voca_game_clean(p_name);
  r public.voca_game_runs; e jsonb; t int; prev int := -1000; okv int; elapsed int; x0 numeric; x1 numeric;
  v_score int := 0; v_ok int := 0; v_n int := 0; v_combo int := 0; v_max int := 0; v_wrong int := 0;
  old_all int; b_all int; b_wk int;
begin
  if u is null then return jsonb_build_object('err', 'auth'); end if;
  select * into r from public.voca_game_runs where id = p_run for update;
  if not found or r.uid <> u then return jsonb_build_object('err', 'bad_run'); end if;
  if r.used then return jsonb_build_object('err', 'used'); end if;
  update public.voca_game_runs set used = true where id = r.id;
  elapsed := (extract(epoch from now() - r.started_at) * 1000)::int;
  if elapsed > 15 * 60 * 1000 then return jsonb_build_object('err', 'bad_run'); end if;
  if p_log is null or jsonb_typeof(p_log) <> 'array' or jsonb_array_length(p_log) > 130 then return jsonb_build_object('err', 'bad_input'); end if;
  for e in select value from jsonb_array_elements(p_log) loop
    if jsonb_typeof(e) <> 'array' or jsonb_array_length(e) <> 2 or jsonb_typeof(e->0) <> 'number' or jsonb_typeof(e->1) <> 'number' then return jsonb_build_object('err', 'bad_input'); end if;
    x0 := (e->>0)::numeric; x1 := (e->>1)::numeric;
    if x0 not in (0, 1) or x1 < 0 or x1 > 1000000 then return jsonb_build_object('err', 'bad_input'); end if;
    okv := x0::int; t := x1::int;
    if t - prev < 400 or t > elapsed + 3000 or t > 60000 - v_wrong * 3000 + 1500 then
      return jsonb_build_object('err', 'bad_input');
    end if;
    prev := t; v_n := v_n + 1;
    if okv = 1 then v_score := v_score + 10 + least(v_combo, 10) * 2; v_ok := v_ok + 1; v_combo := v_combo + 1; v_max := greatest(v_max, v_combo);
    else v_combo := 0; v_wrong := v_wrong + 1; end if;
  end loop;
  if v_score <= 0 then return jsonb_build_object('score', 0, 'ok', v_ok, 'n', v_n); end if;

  select score into old_all from public.voca_game_scores where uid = u and lang = r.lang and lvl = r.lvl and period = 'all';
  insert into public.voca_game_scores as s (uid, lang, lvl, period, score, ok, n, combo, name)
  values (u, r.lang, r.lvl, 'all', v_score, v_ok, v_n, v_max, nm), (u, r.lang, r.lvl, wk, v_score, v_ok, v_n, v_max, nm)
  on conflict (uid, lang, lvl, period) do update set
    name = excluded.name,
    score = greatest(s.score, excluded.score),
    ok = case when excluded.score > s.score then excluded.ok else s.ok end,
    n = case when excluded.score > s.score then excluded.n else s.n end,
    combo = case when excluded.score > s.score then excluded.combo else s.combo end,
    at = case when excluded.score > s.score then now() else s.at end;
  update public.voca_game_scores set name = nm where uid = u and name <> nm;
  delete from public.voca_game_scores where period <> 'all' and period < 'w' || to_char(now() - interval '70 days', 'YYYY-MM-DD');

  select score into b_all from public.voca_game_scores where uid = u and lang = r.lang and lvl = r.lvl and period = 'all';
  select score into b_wk from public.voca_game_scores where uid = u and lang = r.lang and lvl = r.lvl and period = wk;
  return jsonb_build_object(
    'score', v_score, 'ok', v_ok, 'n', v_n, 'combo', v_max,
    'best', b_all, 'wbest', b_wk, 'nb', old_all is null or v_score > old_all,
    'rank', 1 + (select count(*) from public.voca_game_scores where lang = r.lang and lvl = r.lvl and period = wk and score > b_wk),
    'arank', 1 + (select count(*) from public.voca_game_scores where lang = r.lang and lvl = r.lvl and period = 'all' and score > b_all),
    'total', (select count(*) from public.voca_game_scores where lang = r.lang and lvl = r.lvl and period = wk));
end $$;
grant execute on function public.voca_game_submit(text, text, jsonb, text) to anon, authenticated;

-- 3) 반 참여: 내보낸 학생 목록 + 잠금
create table if not exists public.voca_class_bans (
  class_id bigint not null references public.voca_classes(id) on delete cascade,
  uid text not null,
  at timestamptz not null default now(),
  primary key (class_id, uid)
);
alter table public.voca_class_bans enable row level security;
revoke all on table public.voca_class_bans from public, anon, authenticated;

create or replace function public.voca_class_join(p_token text, p_code text, p_name text, p_sno text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare u text := public.voca_uid(p_token); r public.voca_classes;
begin
  if u is null then return jsonb_build_object('err', 'auth'); end if;
  perform pg_advisory_xact_lock(hashtext('voca_join:' || u));
  if coalesce((select n from public.voca_join_fail where uid = u and day = current_date), 0) >= 20 then
    return jsonb_build_object('err', 'too_many_tries');
  end if;
  select * into r from public.voca_classes where code = upper(btrim(coalesce(p_code, '')));
  if not found then
    delete from public.voca_join_fail where day < current_date - 7;
    insert into public.voca_join_fail(uid, day, n) values (u, current_date, 1)
    on conflict (uid, day) do update set n = public.voca_join_fail.n + 1;
    return jsonb_build_object('err', 'no_class');
  end if;
  if r.owner = u then return jsonb_build_object('err', 'own_class'); end if;
  if exists (select 1 from public.voca_class_bans where class_id = r.id and uid = u) then return jsonb_build_object('err', 'no_class'); end if;
  perform pg_advisory_xact_lock(hashtext('voca_class:' || r.id));
  if not exists (select 1 from public.voca_class_members where class_id = r.id and uid = u) then
    if (select count(*) from public.voca_class_members where uid = u) >= 10 then return jsonb_build_object('err', 'too_many'); end if;
    if (select count(*) from public.voca_class_members where class_id = r.id) >= 200 then return jsonb_build_object('err', 'full'); end if;
  end if;
  insert into public.voca_class_members(class_id, uid, name, sno) values (r.id, u, left(coalesce(p_name, ''), 30), left(coalesce(p_sno, ''), 12))
  on conflict (class_id, uid) do update set name = excluded.name, sno = excluded.sno;
  return jsonb_build_object('id', r.id, 'name', r.name, 'teacher', r.teacher, 'school', r.school);
end $$;
grant execute on function public.voca_class_join(text, text, text, text) to anon, authenticated;

-- 내보내기: 다시 들어오지 못하게 기록해요.
create or replace function public.voca_class_kick(p_token text, p_class bigint, p_uid text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare u text := public.voca_uid(p_token);
begin
  if u is null then return jsonb_build_object('err', 'auth'); end if;
  if not exists (select 1 from public.voca_classes where id = p_class and owner = u) then return jsonb_build_object('err', 'no_class'); end if;
  delete from public.voca_submissions s using public.voca_assignments a where s.assignment_id = a.id and a.class_id = p_class and s.uid = p_uid;
  delete from public.voca_class_members where class_id = p_class and uid = p_uid;
  insert into public.voca_class_bans(class_id, uid) values (p_class, p_uid) on conflict do nothing;
  return jsonb_build_object('ok', true);
end $$;
grant execute on function public.voca_class_kick(text, bigint, text) to anon, authenticated;

-- 4) 과제 만들기: 반마다 300개, 계정 전체 600개, 하루 100개, 과제 하나 60,000자
create or replace function public.voca_assign_create(p_token text, p_class bigint, p_title text, p_kind text, p_n int, p_due date, p_words jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare u text := public.voca_uid(p_token); i bigint;
begin
  if u is null then return jsonb_build_object('err', 'auth'); end if;
  if not exists (select 1 from public.voca_classes where id = p_class and owner = u) then return jsonb_build_object('err', 'no_class'); end if;
  p_title := left(btrim(coalesce(p_title, '')), 60);
  if p_title = '' or p_kind not in ('study', 'test') or jsonb_typeof(p_words) <> 'array'
     or jsonb_array_length(p_words) < 1 or jsonb_array_length(p_words) > 500 or length(p_words::text) > 60000 then
    return jsonb_build_object('err', 'bad_input');
  end if;
  perform pg_advisory_xact_lock(hashtext('voca_assign:' || u));
  if (select count(*) from public.voca_assignments where class_id = p_class) >= 300 then return jsonb_build_object('err', 'too_many'); end if;
  if (select count(*) from public.voca_assignments a join public.voca_classes c on c.id = a.class_id where c.owner = u) >= 600 then return jsonb_build_object('err', 'too_many'); end if;
  if (select count(*) from public.voca_assignments a join public.voca_classes c on c.id = a.class_id where c.owner = u and a.created_at > now() - interval '1 day') >= 100 then return jsonb_build_object('err', 'too_many'); end if;
  insert into public.voca_assignments(class_id, title, kind, n, due, words)
  values (p_class, p_title, p_kind, greatest(1, least(coalesce(p_n, 20), 100)), p_due, p_words) returning id into i;
  return jsonb_build_object('id', i);
end $$;
grant execute on function public.voca_assign_create(text, bigint, text, text, int, date, jsonb) to anon, authenticated;

-- 실시간 신호: 2초에 한 번까지 (앱은 5~15초마다 보내요)
create or replace function public.voca_class_ping(p_token text, p_live jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare u text := public.voca_uid(p_token); k int;
begin
  if u is null then return jsonb_build_object('err', 'auth'); end if;
  if p_live is null or jsonb_typeof(p_live) <> 'object' or length(p_live::text) > 2000 then return jsonb_build_object('err', 'bad_input'); end if;
  update public.voca_class_members set live = p_live, live_at = now() where uid = u and (live_at is null or live_at < now() - interval '2 seconds');
  get diagnostics k = row_count;
  return jsonb_build_object('n', k);
end $$;
grant execute on function public.voca_class_ping(text, jsonb) to anon, authenticated;

-- 진도 보내기: 20초에 한 번까지 (앱은 3분마다 보내요)
create or replace function public.voca_class_report(p_token text, p_progress jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare u text := public.voca_uid(p_token); k int;
begin
  if u is null then return jsonb_build_object('err', 'auth'); end if;
  if p_progress is null or jsonb_typeof(p_progress) <> 'object' or length(p_progress::text) > 20000 then return jsonb_build_object('err', 'bad_input'); end if;
  update public.voca_class_members set progress = p_progress, updated_at = now() where uid = u and (updated_at is null or updated_at < now() - interval '20 seconds');
  get diagnostics k = row_count;
  return jsonb_build_object('n', k);
end $$;
grant execute on function public.voca_class_report(text, jsonb) to anon, authenticated;

-- 5) 랭킹: 우리 반에서도 게임 별명을 보여 줘요.
create or replace function public.voca_game_top(p_token text, p_lang text, p_lvl text, p_period text, p_scope text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare u text := public.voca_uid(p_token); per text := case when p_period = 'all' then 'all' else public.voca_game_week() end;
  mine public.voca_game_scores; myrank int; res jsonb; tot int;
begin
  if u is null then return jsonb_build_object('err', 'auth'); end if;
  if p_lang is null or p_lang not in ('en', 'zh') or p_lvl is null or p_lvl not in ('l1', 'l2', 'l3', 'l4') then return jsonb_build_object('err', 'bad_input'); end if;
  if p_scope = 'class' then
    if not exists (select 1 from public.voca_class_members where uid = u) and not exists (select 1 from public.voca_classes where owner = u) then
      return jsonb_build_object('list', '[]'::jsonb, 'noclass', true, 'total', 0);
    end if;
    with cls as (
      select class_id from public.voca_class_members where uid = u
      union select id from public.voca_classes where owner = u
    ), ppl as (
      select distinct m.uid from public.voca_class_members m where m.class_id in (select class_id from cls)
      union select u
    ), rows as (
      select s.*, row_number() over (order by s.score desc, s.at) as rk
      from public.voca_game_scores s join ppl p on p.uid = s.uid
      where s.lang = p_lang and s.lvl = p_lvl and s.period = per and s.score > 0
    )
    select coalesce(jsonb_agg(jsonb_build_object('name', r.name, 'score', r.score, 'ok', r.ok, 'n', r.n, 'combo', r.combo, 'me', r.uid = u) order by r.rk) filter (where r.rk <= 50), '[]'::jsonb),
           max(r.rk) filter (where r.uid = u), count(*)
      into res, myrank, tot from rows r;
  else
    with rows as (
      select s.*, row_number() over (order by s.score desc, s.at) as rk
      from public.voca_game_scores s where s.lang = p_lang and s.lvl = p_lvl and s.period = per and s.score > 0
    )
    select coalesce(jsonb_agg(jsonb_build_object('name', r.name, 'score', r.score, 'ok', r.ok, 'n', r.n, 'combo', r.combo, 'me', r.uid = u) order by r.rk) filter (where r.rk <= 50), '[]'::jsonb),
           max(r.rk) filter (where r.uid = u), count(*)
      into res, myrank, tot from rows r;
  end if;
  select * into mine from public.voca_game_scores where uid = u and lang = p_lang and lvl = p_lvl and period = per;
  return jsonb_build_object('list', res, 'total', tot,
    'me', case when mine.uid is null then null else jsonb_build_object('rank', myrank, 'score', mine.score, 'ok', mine.ok, 'n', mine.n, 'combo', mine.combo, 'name', mine.name) end);
end $$;
grant execute on function public.voca_game_top(text, text, text, text, text) to anon, authenticated;

-- 6) 가입 속도 제한: 전체 한 시간에 300개
create table if not exists public.voca_signup_rate (
  hr timestamptz primary key,
  n int not null default 0
);
alter table public.voca_signup_rate enable row level security;
revoke all on table public.voca_signup_rate from public, anon, authenticated;

create or replace function public.voca_signup_guard()
returns trigger language plpgsql security definer set search_path = public as $$
declare c int;
begin
  delete from public.voca_signup_rate where hr < now() - interval '2 days';
  insert into public.voca_signup_rate(hr, n) values (date_trunc('hour', now()), 1)
  on conflict (hr) do update set n = public.voca_signup_rate.n + 1 returning n into c;
  if c > 300 then raise exception 'too_many_signups' using errcode = 'P0001'; end if;
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

notify pgrst, 'reload schema';
