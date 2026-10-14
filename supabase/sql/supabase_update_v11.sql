-- VocaPro v11: 발음 수행평가 (학생이 단어·예문을 녹음해 제출 -> AI가 채점 -> 선생님이 듣고 점수 확인·수정)
-- v6~v10을 실행한 뒤 Supabase 대시보드 > SQL Editor에 이 파일 전체를 붙여 넣고 Run을 한 번 누르세요. 다시 실행해도 안전해요.
-- 그다음 AI 함수(supabase/functions/ai/index.ts)를 다시 배포해야 AI 채점이 돼요: supabase functions deploy ai --no-verify-jwt
-- 앱은 이 SQL이 없어도 그대로 동작하고, '발음 평가' 과제만 "서버 설정이 필요해요"라고 안내해요.
-- 1) 과제 종류에 'speak'(발음 평가)를 더해요. 한 과제에 20문항까지, 문항마다 글자 200자까지.
-- 2) 녹음은 16kHz · 모노 · 16비트 WAV만 받아요(한 개 최대 340KB ≈ 10초). 같은 문항을 다시 녹음하면 덮어쓰고 AI 점수는 지워져요.
-- 3) 녹음은 반 선생님과 학생 본인만 들을 수 있어요. 60일이 지난 녹음 파일은 자동으로 지워지고 점수만 남아요.
-- 4) 녹음 올리기는 계정마다 한 시간에 120번까지. 표는 앱에서 직접 읽고 쓸 수 없고 아래 함수로만 처리해요.
-- 5) AI 채점 결과는 서버(AI 함수, service_role)만 쓸 수 있어요. 학생이 점수를 직접 올리는 길(voca_assign_submit)은 발음 평가에서 막았어요.
-- 6) 반에서 나가거나 내보내지거나 계정을 지우면 녹음도 지워요. 학생 반 목록에 '채점 중'을 보여 주려고 voca_class_mine 도 바꿨어요.

-- 1) 과제 종류: kind 검사 규칙을 이름과 상관없이 지우고 새로 걸어요
do $$ declare c text;
begin
  for c in select conname from pg_constraint where conrelid = 'public.voca_assignments'::regclass and contype = 'c' and pg_get_constraintdef(oid) ilike '%kind%' loop
    execute format('alter table public.voca_assignments drop constraint %I', c);
  end loop;
end $$;
alter table public.voca_assignments add constraint voca_assignments_kind_check check (kind in ('study', 'test', 'speak'));

-- 녹음 한 개 = (과제, 학생, 문항 번호) 한 줄
create table if not exists public.voca_speak_recs (
  assign_id bigint not null references public.voca_assignments(id) on delete cascade,
  uid text not null,
  idx int not null,
  audio bytea,
  bytes int not null default 0,
  dur_ms int not null default 0,
  created_at timestamptz not null default now(),
  ai_score int,
  ai_detail jsonb,
  ai_at timestamptz,
  t_score int,
  t_note text,
  primary key (assign_id, uid, idx)
);
create index if not exists voca_speak_recs_uid on public.voca_speak_recs(uid);
create index if not exists voca_speak_recs_old on public.voca_speak_recs(created_at) where audio is not null;

-- 올리기 횟수 (계정 · 시간)
create table if not exists public.voca_speak_rate (
  uid text not null,
  hr timestamptz not null,
  n int not null default 0,
  primary key (uid, hr)
);
alter table public.voca_speak_recs enable row level security;
alter table public.voca_speak_rate enable row level security;
revoke all on table public.voca_speak_recs, public.voca_speak_rate from public, anon, authenticated;

-- 과제 만들기: v10 한도 그대로 + 발음 평가는 20문항, 문항 200자
create or replace function public.voca_assign_create(p_token text, p_class bigint, p_title text, p_kind text, p_n int, p_due date, p_words jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare u text := public.voca_uid(p_token); i bigint;
begin
  if u is null then return jsonb_build_object('err', 'auth'); end if;
  if not exists (select 1 from public.voca_classes where id = p_class and owner = u) then return jsonb_build_object('err', 'no_class'); end if;
  p_title := left(btrim(coalesce(p_title, '')), 60);
  if p_title = '' or p_kind is null or p_kind not in ('study', 'test', 'speak') or p_words is null or jsonb_typeof(p_words) <> 'array'
     or jsonb_array_length(p_words) < 1 or jsonb_array_length(p_words) > 500 or length(p_words::text) > 60000 then
    return jsonb_build_object('err', 'bad_input');
  end if;
  if p_kind = 'speak' and (jsonb_array_length(p_words) > 20 or exists (
      select 1 from jsonb_array_elements(p_words) e
      where jsonb_typeof(e) <> 'array' or jsonb_typeof(e->0) <> 'string' or length(btrim(e->>0)) < 1 or length(e->>0) > 200)) then
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

-- 시험 점수 제출: 발음 평가는 이 길로 점수를 올릴 수 없어요 (점수는 AI·선생님만)
create or replace function public.voca_assign_submit(p_token text, p_assign bigint, p_ok int, p_n int, p_sec int, p_wrong jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare u text := public.voca_uid(p_token); sc int; s public.voca_submissions;
begin
  if u is null then return jsonb_build_object('err', 'auth'); end if;
  if not exists (select 1 from public.voca_assignments a join public.voca_class_members m on m.class_id = a.class_id and m.uid = u where a.id = p_assign and a.kind <> 'speak') then
    return jsonb_build_object('err', 'no_assign');
  end if;
  p_n := greatest(1, least(coalesce(p_n, 1), 1000)); p_ok := greatest(0, least(coalesce(p_ok, 0), p_n));
  sc := round(p_ok * 100.0 / p_n);
  if p_wrong is null or jsonb_typeof(p_wrong) <> 'array' or length(p_wrong::text) > 20000 then p_wrong := '[]'::jsonb; end if;
  insert into public.voca_submissions(assignment_id, uid, score, ok, n, sec, wrong)
  values (p_assign, u, sc, p_ok, p_n, greatest(0, least(coalesce(p_sec, 0), 86400)), p_wrong)
  on conflict (assignment_id, uid) do update set
    tries = public.voca_submissions.tries + 1, last_at = now(),
    score = case when excluded.score >= public.voca_submissions.score then excluded.score else public.voca_submissions.score end,
    ok = case when excluded.score >= public.voca_submissions.score then excluded.ok else public.voca_submissions.ok end,
    n = case when excluded.score >= public.voca_submissions.score then excluded.n else public.voca_submissions.n end,
    sec = case when excluded.score >= public.voca_submissions.score then excluded.sec else public.voca_submissions.sec end,
    wrong = case when excluded.score >= public.voca_submissions.score then excluded.wrong else public.voca_submissions.wrong end
  returning * into s;
  return jsonb_build_object('score', sc, 'best', s.score, 'tries', s.tries);
end $$;
grant execute on function public.voca_assign_submit(text, bigint, int, int, int, jsonb) to anon, authenticated;

-- (내부) 제출한 학생의 과제 점수를 다시 계산해요: 문항마다 선생님 점수, 없으면 AI 점수의 평균
create or replace function public.voca_speak_sync(p_assign bigint, p_uid text)
returns void language plpgsql security definer set search_path = public as $$
declare sc int; k int; tot int;
begin
  select round(avg(coalesce(t_score, ai_score))), count(coalesce(t_score, ai_score)) into sc, k
  from public.voca_speak_recs where assign_id = p_assign and uid = p_uid;
  select jsonb_array_length(words) into tot from public.voca_assignments where id = p_assign;
  update public.voca_submissions set score = coalesce(sc, 0), ok = coalesce(k, 0), n = coalesce(tot, 0)
  where assignment_id = p_assign and uid = p_uid;
end $$;

-- (내부) 60일 지난 녹음 파일 지우기 (점수는 남겨요)
create or replace function public.voca_speak_expire()
returns void language sql security definer set search_path = public as $$
  update public.voca_speak_recs set audio = null, bytes = 0 where audio is not null and created_at < now() - interval '60 days';
$$;

-- 학생: 문항 하나 녹음 올리기 (base64 WAV)
create or replace function public.voca_speak_put(p_token text, p_assign bigint, p_idx int, p_b64 text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare u text := public.voca_uid(p_token); a public.voca_assignments; b bytea; c int; dur int;
begin
  if u is null then return jsonb_build_object('err', 'auth'); end if;
  select a2.* into a from public.voca_assignments a2 join public.voca_class_members m on m.class_id = a2.class_id and m.uid = u where a2.id = p_assign;
  if not found then return jsonb_build_object('err', 'no_assign'); end if;
  if a.kind <> 'speak' or p_idx is null or p_idx < 0 or p_idx >= jsonb_array_length(a.words) then return jsonb_build_object('err', 'bad_input'); end if;
  if p_b64 is null or length(p_b64) > 460000 then return jsonb_build_object('err', 'too_big'); end if;
  begin b := decode(p_b64, 'base64'); exception when others then return jsonb_build_object('err', 'bad_audio'); end;
  if length(b) > 340000 then return jsonb_build_object('err', 'too_big'); end if;
  -- WAV 머리글: RIFF....WAVEfmt  PCM(1) · 모노(1) · 16000Hz · 16비트 · data
  if length(b) < 44 + 3200
     or substring(b from 1 for 4) <> '\x52494646'::bytea or substring(b from 9 for 8) <> '\x57415645666d7420'::bytea
     or substring(b from 21 for 4) <> '\x01000100'::bytea or substring(b from 25 for 4) <> '\x803e0000'::bytea
     or substring(b from 35 for 2) <> '\x1000'::bytea or substring(b from 37 for 4) <> '\x64617461'::bytea then
    return jsonb_build_object('err', 'bad_audio');
  end if;
  dur := ((length(b) - 44) / 32)::int;
  perform pg_advisory_xact_lock(hashtext('voca_speak:' || u));
  insert into public.voca_speak_rate(uid, hr, n) values (u, date_trunc('hour', now()), 1)
  on conflict (uid, hr) do update set n = public.voca_speak_rate.n + 1 returning n into c;
  if c > 120 then return jsonb_build_object('err', 'too_many'); end if;
  delete from public.voca_speak_rate where hr < now() - interval '1 day';
  perform public.voca_speak_expire();
  insert into public.voca_speak_recs(assign_id, uid, idx, audio, bytes, dur_ms) values (a.id, u, p_idx, b, length(b), dur)
  on conflict (assign_id, uid, idx) do update set audio = excluded.audio, bytes = excluded.bytes, dur_ms = excluded.dur_ms,
    created_at = now(), ai_score = null, ai_detail = null, ai_at = null;
  perform public.voca_speak_sync(a.id, u);
  return jsonb_build_object('ok', true, 'idx', p_idx, 'bytes', length(b), 'dur_ms', dur);
end $$;

-- 학생: 다 녹음했으면 제출 (선생님 목록에 '제출'로 보여요)
create or replace function public.voca_speak_submit(p_token text, p_assign bigint)
returns jsonb language plpgsql security definer set search_path = public as $$
declare u text := public.voca_uid(p_token); a public.voca_assignments; k int; tot int;
begin
  if u is null then return jsonb_build_object('err', 'auth'); end if;
  select a2.* into a from public.voca_assignments a2 join public.voca_class_members m on m.class_id = a2.class_id and m.uid = u where a2.id = p_assign;
  if not found then return jsonb_build_object('err', 'no_assign'); end if;
  if a.kind <> 'speak' then return jsonb_build_object('err', 'bad_input'); end if;
  tot := jsonb_array_length(a.words);
  select count(*) into k from public.voca_speak_recs where assign_id = a.id and uid = u and idx < tot;
  if k < tot then return jsonb_build_object('err', 'not_done', 'n', k, 'total', tot); end if;
  insert into public.voca_submissions(assignment_id, uid, score, ok, n) values (a.id, u, 0, 0, tot)
  on conflict (assignment_id, uid) do update set tries = public.voca_submissions.tries + 1, last_at = now();
  perform public.voca_speak_sync(a.id, u);
  return jsonb_build_object('ok', true, 'n', k);
end $$;

-- 학생: 내 녹음 상태와 점수 (소리 파일은 빼고)
create or replace function public.voca_speak_mine(p_token text, p_assign bigint)
returns jsonb language plpgsql security definer set search_path = public as $$
declare u text := public.voca_uid(p_token); a public.voca_assignments;
begin
  if u is null then return jsonb_build_object('err', 'auth'); end if;
  select a2.* into a from public.voca_assignments a2 join public.voca_class_members m on m.class_id = a2.class_id and m.uid = u where a2.id = p_assign;
  if not found then return jsonb_build_object('err', 'no_assign'); end if;
  if a.kind <> 'speak' then return jsonb_build_object('err', 'bad_input'); end if;
  return jsonb_build_object('count', jsonb_array_length(a.words),
    'submitted', exists (select 1 from public.voca_submissions s where s.assignment_id = a.id and s.uid = u),
    'score', (select s.score from public.voca_submissions s where s.assignment_id = a.id and s.uid = u),
    'items', coalesce((select jsonb_agg(jsonb_build_object('idx', r.idx, 'bytes', r.bytes, 'dur_ms', r.dur_ms, 'at', r.created_at, 'audio', r.audio is not null,
        'ai_score', r.ai_score, 'ai_detail', r.ai_detail, 't_score', r.t_score, 't_note', r.t_note) order by r.idx)
      from public.voca_speak_recs r where r.assign_id = a.id and r.uid = u), '[]'::jsonb));
end $$;

-- 녹음 듣기: 반 선생님, 또는 학생 본인
create or replace function public.voca_speak_audio(p_token text, p_assign bigint, p_uid text, p_idx int)
returns jsonb language plpgsql security definer set search_path = public as $$
declare u text := public.voca_uid(p_token); ok boolean; b bytea;
begin
  if u is null then return jsonb_build_object('err', 'auth'); end if;
  select (c.owner = u) or (p_uid = u and exists (select 1 from public.voca_class_members m where m.class_id = c.id and m.uid = u)) into ok
  from public.voca_assignments a join public.voca_classes c on c.id = a.class_id where a.id = p_assign;
  if not coalesce(ok, false) then return jsonb_build_object('err', 'no_assign'); end if;
  select audio into b from public.voca_speak_recs where assign_id = p_assign and uid = p_uid and idx = p_idx;
  if b is null then return jsonb_build_object('err', 'no_rec'); end if;
  return jsonb_build_object('b64', translate(encode(b, 'base64'), E'\n', ''), 'type', 'audio/wav');
end $$;

-- 선생님: 학생별 · 문항별 점수 (반 학생 모두, 아직 안 한 학생도)
create or replace function public.voca_speak_results(p_token text, p_assign bigint)
returns jsonb language plpgsql security definer set search_path = public as $$
declare u text := public.voca_uid(p_token); a public.voca_assignments;
begin
  if u is null then return jsonb_build_object('err', 'auth'); end if;
  select a2.* into a from public.voca_assignments a2 join public.voca_classes c on c.id = a2.class_id and c.owner = u where a2.id = p_assign;
  if not found then return jsonb_build_object('err', 'no_assign'); end if;
  perform public.voca_speak_expire();
  return jsonb_build_object(
    'assign', jsonb_build_object('id', a.id, 'title', a.title, 'kind', a.kind, 'due', a.due, 'count', jsonb_array_length(a.words), 'words', a.words),
    'rows', coalesce((select jsonb_agg(jsonb_build_object('uid', m.uid, 'name', m.name, 'sno', m.sno,
        'submitted', s.uid is not null, 'score', s.score, 'at', s.last_at,
        'n', (select count(*) from public.voca_speak_recs r where r.assign_id = a.id and r.uid = m.uid),
        'ai_avg', (select round(avg(r.ai_score)) from public.voca_speak_recs r where r.assign_id = a.id and r.uid = m.uid),
        't_avg', (select round(avg(r.t_score)) from public.voca_speak_recs r where r.assign_id = a.id and r.uid = m.uid),
        'items', coalesce((select jsonb_agg(jsonb_build_object('idx', r.idx, 'dur_ms', r.dur_ms, 'at', r.created_at, 'audio', r.audio is not null,
            'ai_score', r.ai_score, 'ai_detail', r.ai_detail, 't_score', r.t_score, 't_note', r.t_note) order by r.idx)
          from public.voca_speak_recs r where r.assign_id = a.id and r.uid = m.uid), '[]'::jsonb)) order by m.sno, m.name)
      from public.voca_class_members m left join public.voca_submissions s on s.assignment_id = a.id and s.uid = m.uid
      where m.class_id = a.class_id), '[]'::jsonb));
end $$;

-- 선생님: 문항 점수 직접 매기기 (p_score 가 null 이면 선생님 점수를 지우고 AI 점수로 돌아가요)
create or replace function public.voca_speak_teacher(p_token text, p_assign bigint, p_uid text, p_idx int, p_score int, p_note text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare u text := public.voca_uid(p_token); k int;
begin
  if u is null then return jsonb_build_object('err', 'auth'); end if;
  if not exists (select 1 from public.voca_assignments a join public.voca_classes c on c.id = a.class_id and c.owner = u where a.id = p_assign) then
    return jsonb_build_object('err', 'no_assign');
  end if;
  if p_score is not null and (p_score < 0 or p_score > 100) then return jsonb_build_object('err', 'bad_input'); end if;
  update public.voca_speak_recs set t_score = p_score, t_note = nullif(left(btrim(coalesce(p_note, '')), 200), '')
  where assign_id = p_assign and uid = p_uid and idx = p_idx;
  get diagnostics k = row_count;
  if k = 0 then return jsonb_build_object('err', 'no_rec'); end if;
  perform public.voca_speak_sync(p_assign, p_uid);
  return jsonb_build_object('ok', true);
end $$;

-- (AI 함수 전용) 채점할 녹음: 학생 본인 것만. p_all 이면 이미 채점한 것도 다시
create or replace function public.voca_speak_for_grade(p_uid text, p_assign bigint, p_all boolean default false)
returns jsonb language plpgsql security definer set search_path = public as $$
declare a public.voca_assignments;
begin
  select a2.* into a from public.voca_assignments a2 join public.voca_class_members m on m.class_id = a2.class_id and m.uid = p_uid where a2.id = p_assign;
  if not found then return jsonb_build_object('err', 'no_assign'); end if;
  if a.kind <> 'speak' then return jsonb_build_object('err', 'bad_input'); end if;
  return jsonb_build_object('items', coalesce((select jsonb_agg(jsonb_build_object('idx', r.idx,
      'text', a.words->r.idx->>0, 'lang', coalesce(a.words->r.idx->>2, 'en'), 'kind', coalesce(a.words->r.idx->>3, 'w'),
      'v', (extract(epoch from r.created_at) * 1000)::bigint::text,
      'b64', translate(encode(r.audio, 'base64'), E'\n', '')) order by r.idx)
    from public.voca_speak_recs r
    where r.assign_id = a.id and r.uid = p_uid and r.audio is not null and r.idx < jsonb_array_length(a.words) and (p_all or r.ai_score is null)), '[]'::jsonb));
end $$;

-- (AI 함수 전용) 이 계정이 과제를 낸 반 선생님인지
create or replace function public.voca_speak_is_owner(p_uid text, p_assign bigint)
returns boolean language sql security definer set search_path = public as $$
  select exists (select 1 from public.voca_assignments a join public.voca_classes c on c.id = a.class_id where a.id = p_assign and c.owner = p_uid);
$$;

-- (AI 함수 전용) AI 점수 쓰기. p_detail 의 v(녹음 시각)가 지금 녹음과 다르면(그사이 다시 녹음) 쓰지 않아요.
create or replace function public.voca_speak_set_ai(p_uid text, p_assign bigint, p_idx int, p_score int, p_detail jsonb)
returns boolean language plpgsql security definer set search_path = public as $$
declare k int;
begin
  if p_detail is null or jsonb_typeof(p_detail) <> 'object' or length(p_detail::text) > 2000 then p_detail := '{}'::jsonb; end if;
  update public.voca_speak_recs set ai_score = greatest(0, least(coalesce(p_score, 0), 100)), ai_detail = p_detail - 'v', ai_at = now()
  where assign_id = p_assign and uid = p_uid and idx = p_idx
    and (not (p_detail ? 'v') or (extract(epoch from created_at) * 1000)::bigint::text = p_detail->>'v');
  get diagnostics k = row_count;
  if k > 0 then perform public.voca_speak_sync(p_assign, p_uid); end if;
  return k > 0;
end $$;

-- 학생 반 목록: 내 결과에 채점한 문항 수(ok)와 전체(n)를 더해요 (발음 평가는 "채점 중" 표시)
create or replace function public.voca_class_mine(p_token text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare u text := public.voca_uid(p_token);
begin
  if u is null then return jsonb_build_object('err', 'auth'); end if;
  return jsonb_build_object(
    'owned', coalesce((select jsonb_agg(jsonb_build_object('id', c.id, 'name', c.name, 'code', c.code,
        'members', (select count(*) from public.voca_class_members m where m.class_id = c.id),
        'assignments', (select count(*) from public.voca_assignments a where a.class_id = c.id)) order by c.id)
      from public.voca_classes c where c.owner = u), '[]'::jsonb),
    'joined', coalesce((select jsonb_agg(jsonb_build_object('id', c.id, 'name', c.name, 'teacher', c.teacher, 'school', c.school,
        'assignments', coalesce((select jsonb_agg(jsonb_build_object('id', a.id, 'title', a.title, 'kind', a.kind, 'n', a.n, 'due', a.due,
            'count', jsonb_array_length(a.words), 'created', a.created_at,
            'mine', (select jsonb_build_object('score', s.score, 'tries', s.tries, 'at', s.last_at, 'ok', s.ok, 'n', s.n) from public.voca_submissions s where s.assignment_id = a.id and s.uid = u))
          order by a.id desc) from public.voca_assignments a where a.class_id = c.id), '[]'::jsonb)) order by c.id)
      from public.voca_classes c join public.voca_class_members m on m.class_id = c.id and m.uid = u), '[]'::jsonb));
end $$;

-- 반에서 나가기 · 내보내기 · 계정 지우기: 녹음도 함께 지워요 (반·과제를 지우면 표 연결로 함께 지워져요)
create or replace function public.voca_class_leave(p_token text, p_class bigint)
returns jsonb language plpgsql security definer set search_path = public as $$
declare u text := public.voca_uid(p_token);
begin
  if u is null then return jsonb_build_object('err', 'auth'); end if;
  delete from public.voca_speak_recs r using public.voca_assignments a where r.assign_id = a.id and a.class_id = p_class and r.uid = u;
  delete from public.voca_submissions s using public.voca_assignments a where s.assignment_id = a.id and a.class_id = p_class and s.uid = u;
  delete from public.voca_class_members where class_id = p_class and uid = u;
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.voca_class_kick(p_token text, p_class bigint, p_uid text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare u text := public.voca_uid(p_token);
begin
  if u is null then return jsonb_build_object('err', 'auth'); end if;
  if not exists (select 1 from public.voca_classes where id = p_class and owner = u) then return jsonb_build_object('err', 'no_class'); end if;
  delete from public.voca_speak_recs r using public.voca_assignments a where r.assign_id = a.id and a.class_id = p_class and r.uid = p_uid;
  delete from public.voca_submissions s using public.voca_assignments a where s.assignment_id = a.id and a.class_id = p_class and s.uid = p_uid;
  delete from public.voca_class_members where class_id = p_class and uid = p_uid;
  insert into public.voca_class_bans(class_id, uid) values (p_class, p_uid) on conflict do nothing;
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.voca_class_forget(p_token text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare u text := public.voca_uid(p_token);
begin
  if u is null then return jsonb_build_object('err', 'auth'); end if;
  delete from public.voca_speak_recs where uid = u;
  delete from public.voca_speak_rate where uid = u;
  delete from public.voca_submissions where uid = u;
  delete from public.voca_class_members where uid = u;
  delete from public.voca_classes where owner = u;
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.voca_class_cleanup()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  delete from public.voca_speak_recs where uid = old.id::text;
  delete from public.voca_speak_rate where uid = old.id::text;
  delete from public.voca_submissions where uid = old.id::text;
  delete from public.voca_class_members where uid = old.id::text;
  delete from public.voca_classes where owner = old.id::text;
  return old;
end $$;

-- 권한: 앱(anon)은 아래 함수만, AI 함수(service_role)는 채점 함수만
revoke all on function
  public.voca_speak_sync(bigint, text), public.voca_speak_expire(), public.voca_class_cleanup(),
  public.voca_speak_for_grade(text, bigint, boolean), public.voca_speak_is_owner(text, bigint), public.voca_speak_set_ai(text, bigint, int, int, jsonb)
from public, anon, authenticated;
grant execute on function
  public.voca_speak_for_grade(text, bigint, boolean), public.voca_speak_is_owner(text, bigint), public.voca_speak_set_ai(text, bigint, int, int, jsonb)
to service_role;
grant execute on function
  public.voca_speak_put(text, bigint, int, text), public.voca_speak_submit(text, bigint), public.voca_speak_mine(text, bigint),
  public.voca_speak_audio(text, bigint, text, int), public.voca_speak_results(text, bigint), public.voca_speak_teacher(text, bigint, text, int, int, text),
  public.voca_class_mine(text), public.voca_class_leave(text, bigint), public.voca_class_kick(text, bigint, text), public.voca_class_forget(text)
to anon, authenticated;

notify pgrst, 'reload schema';
