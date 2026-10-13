-- VocaPro v9: 단어 맞추기 대결 랭킹 (영어 · 중국어, 단계별, 이번 주 · 역대, 전체 · 우리 반)
-- v6~v8을 실행한 뒤 Supabase 대시보드 > SQL Editor에 이 파일 전체를 붙여 넣고 Run을 한 번 누르세요. 다시 실행해도 안전해요.
-- 앱은 이 SQL이 없어도 게임은 그대로 되고, 랭킹만 "내 기록"으로 보여 줘요.
-- 보안: 점수는 서버가 답한 기록으로 직접 계산해요(앱이 보낸 점수는 받지 않음). 판마다 서버 입장권(한 번만 사용), 실제 흐른 시간 검사, 시작 3초에 한 번 · 하루 300판 제한. 표는 앱에서 직접 읽고 쓸 수 없어요.

-- 계정 · 언어 · 단계 · 기간('all' 또는 'w2026-10-12' 같은 주 시작일)마다 최고 점수 한 줄
create table if not exists public.voca_game_scores (
  uid text not null,
  lang text not null check (lang in ('en', 'zh')),
  lvl text not null check (lvl in ('l1', 'l2', 'l3', 'l4')),
  period text not null,
  score int not null default 0,
  ok int not null default 0,
  n int not null default 0,
  combo int not null default 0,
  name text not null default '',
  at timestamptz not null default now(),
  primary key (uid, lang, lvl, period)
);
create index if not exists voca_game_scores_top on public.voca_game_scores(lang, lvl, period, score desc, at);

-- 한 판마다 서버가 내주는 입장권. 시작 시각을 서버가 기록하고, 결과는 한 번만 올릴 수 있어요.
create table if not exists public.voca_game_runs (
  id text primary key,
  uid text not null,
  lang text not null,
  lvl text not null,
  started_at timestamptz not null default now(),
  used boolean not null default false
);
create index if not exists voca_game_runs_uid on public.voca_game_runs(uid, started_at desc);

alter table public.voca_game_scores enable row level security;
alter table public.voca_game_runs enable row level security;
-- 표는 앱에서 직접 읽고 쓸 수 없어요(정책 없음 + 권한 회수). 아래 함수가 로그인 토큰으로 확인한 내 계정 줄만 써요.
revoke all on table public.voca_game_scores, public.voca_game_runs from public, anon, authenticated;

-- 이번 주 키 (한국 시간 월요일 시작)
create or replace function public.voca_game_week()
returns text language sql stable set search_path = public as $$
  select 'w' || to_char(date_trunc('week', now() at time zone 'Asia/Seoul'), 'YYYY-MM-DD');
$$;

-- 랭킹에 보일 이름: 앞뒤 공백과 제어 문자를 빼고 12자까지
create or replace function public.voca_game_clean(p_name text)
returns text language sql immutable set search_path = public as $$
  select coalesce(nullif(left(btrim(regexp_replace(coalesce(p_name, ''), '[[:cntrl:]<>]', '', 'g')), 12), ''), '익명');
$$;

-- 예전 방식(앱이 점수를 보내는 함수)은 지워요. 점수는 서버가 직접 계산해요.
drop function if exists public.voca_game_submit(text, text, text, int, int, int, int, text);

-- 게임 시작: 입장권을 받아요. 3초에 한 번, 하루 300판까지.
create or replace function public.voca_game_start(p_token text, p_lang text, p_lvl text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare u text := public.voca_uid(p_token); g text;
begin
  if u is null then return jsonb_build_object('err', 'auth'); end if;
  if p_lang is null or p_lang not in ('en', 'zh') or p_lvl is null or p_lvl not in ('l1', 'l2', 'l3', 'l4') then return jsonb_build_object('err', 'bad_input'); end if;
  perform pg_advisory_xact_lock(hashtext('voca_game:' || u));
  if exists (select 1 from public.voca_game_runs where uid = u and started_at > now() - interval '3 seconds') then return jsonb_build_object('err', 'too_fast'); end if;
  if (select count(*) from public.voca_game_runs where uid = u and started_at > now() - interval '1 day') >= 300 then return jsonb_build_object('err', 'too_many'); end if;
  delete from public.voca_game_runs where started_at < now() - interval '2 days';
  g := md5(random()::text || clock_timestamp()::text || u);
  insert into public.voca_game_runs(id, uid, lang, lvl) values (g, u, p_lang, p_lvl);
  return jsonb_build_object('id', g);
end $$;

-- 게임 결과 올리기: 앱은 점수를 보내지 않고 답한 기록만 보내요. p_log = [[맞음 1 또는 0, 시작 후 몇 ms], ...]
-- 서버가 기록을 검사(입장권 주인, 한 번만, 실제로 흐른 시간 안, 답 사이 0.25초 이상, 틀린 만큼 줄어든 60초 안)하고 점수를 직접 계산해요.
create or replace function public.voca_game_submit(p_token text, p_run text, p_log jsonb, p_name text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare u text := public.voca_uid(p_token); wk text := public.voca_game_week(); nm text := public.voca_game_clean(p_name);
  r public.voca_game_runs; e jsonb; t int; prev int := -1000; okv int; elapsed int;
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
  if p_log is null or jsonb_typeof(p_log) <> 'array' or jsonb_array_length(p_log) > 240 then return jsonb_build_object('err', 'bad_input'); end if;
  for e in select value from jsonb_array_elements(p_log) loop
    if jsonb_typeof(e) <> 'array' or jsonb_array_length(e) <> 2 or jsonb_typeof(e->0) <> 'number' or jsonb_typeof(e->1) <> 'number' then return jsonb_build_object('err', 'bad_input'); end if;
    okv := (e->>0)::numeric::int; t := (e->>1)::numeric::int;
    if okv not in (0, 1) or t < 0 or t - prev < 250 or t > elapsed + 3000 or t > 60000 - v_wrong * 3000 + 1500 then
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
  -- 이름은 모든 기록에서 같게
  update public.voca_game_scores set name = nm where uid = u and name <> nm;
  -- 오래된 주간 기록 정리
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

-- 랭킹 보기: p_period 'week' | 'all', p_scope 'all'(모든 사용자) | 'class'(내가 참여했거나 만든 반 친구들)
-- 다른 사람의 계정 id는 내보내지 않아요.
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
      select m.uid, min(nullif(m.name, '')) as cname from public.voca_class_members m where m.class_id in (select class_id from cls) group by m.uid
      union all select u, null where not exists (select 1 from public.voca_class_members m where m.uid = u and m.class_id in (select class_id from cls))
    ), rows as (
      select s.*, p.cname, row_number() over (order by s.score desc, s.at) as rk
      from public.voca_game_scores s join ppl p on p.uid = s.uid
      where s.lang = p_lang and s.lvl = p_lvl and s.period = per and s.score > 0
    )
    select coalesce(jsonb_agg(jsonb_build_object('name', coalesce(r.cname, r.name), 'score', r.score, 'ok', r.ok, 'n', r.n, 'combo', r.combo, 'me', r.uid = u) order by r.rk) filter (where r.rk <= 50), '[]'::jsonb),
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

-- 랭킹 이름 바꾸기
create or replace function public.voca_game_name(p_token text, p_name text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare u text := public.voca_uid(p_token); nm text := public.voca_game_clean(p_name);
begin
  if u is null then return jsonb_build_object('err', 'auth'); end if;
  update public.voca_game_scores set name = nm where uid = u;
  return jsonb_build_object('name', nm);
end $$;

-- 계정을 지울 때 게임 기록도 지워요.
create or replace function public.voca_game_forget(p_token text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare u text := public.voca_uid(p_token);
begin
  if u is null then return jsonb_build_object('err', 'auth'); end if;
  delete from public.voca_game_scores where uid = u;
  delete from public.voca_game_runs where uid = u;
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.voca_game_cleanup()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  delete from public.voca_game_scores where uid = old.id::text;
  delete from public.voca_game_runs where uid = old.id::text;
  return old;
end $$;
do $$ begin
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'voca_accounts' and column_name = 'id') then
    drop trigger if exists voca_game_cleanup on public.voca_accounts;
    create trigger voca_game_cleanup after delete on public.voca_accounts for each row execute function public.voca_game_cleanup();
  end if;
end $$;

revoke all on function public.voca_game_week(), public.voca_game_clean(text), public.voca_game_cleanup() from public, anon, authenticated;
grant execute on function
  public.voca_game_start(text, text, text), public.voca_game_submit(text, text, jsonb, text), public.voca_game_top(text, text, text, text, text),
  public.voca_game_name(text, text), public.voca_game_forget(text)
to anon, authenticated;
revoke all on function public.voca_uid(text) from public, anon, authenticated;

notify pgrst, 'reload schema';
