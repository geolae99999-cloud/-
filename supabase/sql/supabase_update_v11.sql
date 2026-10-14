-- VocaPro v11: 발음 수행평가 (학생이 앱에서 녹음해 제출 -> 선생님 보드에 자동으로 모임 -> 선생님이 듣고 AI 채점 · 점수)
-- v6~v10을 실행한 뒤 Supabase 대시보드 > SQL Editor에 이 파일 전체를 붙여 넣고 Run을 한 번 누르세요. 다시 실행해도 안전해요.
-- (이 파일의 예전 초안을 이미 실행했어도 그대로 다시 실행하면 돼요. 표는 지우지 않고 함수만 새로 바꿔요.)
-- 그다음 AI 함수(supabase/functions/ai/index.ts, v9)를 다시 배포해야 선생님 AI 채점이 돼요: supabase functions deploy ai --no-verify-jwt
--   선택: supabase secrets set AI_PRON_LIMIT=200  (선생님 한 명의 하루 발음 채점 횟수, 기본 200. 일반 AI 한도 40과 따로 세요)
-- 앱은 이 SQL이 없어도 그대로 동작하고, '발음 평가' 과제만 "서버 설정이 필요해요"라고 안내해요.
-- 1) 과제 종류에 'speak'(발음 평가)를 더해요. 한 과제에 20문항까지, 문항마다 글자 200자까지.
-- 2) 녹음은 앱이 만든 MP3만 받아요(MPEG-2 Layer III · 16kHz · 모노, 프레임 머리글 검사). 한 개 최대 단어 64KB, 문장 160KB.
--    같은 문항을 다시 녹음하면 덮어쓰고 AI 점수는 지워져요.
-- 3) 녹음은 반 선생님과 학생 본인만 들을 수 있어요. 60일이 지난 녹음 파일은 자동으로 지워지고 점수만 남아요.
--    선생님은 학생 한 명 또는 과제 전체의 녹음 파일을 바로 지울 수 있어요(voca_speak_delete, 점수는 남김).
-- 4) 녹음 올리기는 계정마다 한 시간에 120번까지. 표는 앱에서 직접 읽고 쓸 수 없고 아래 함수로만 처리해요.
-- 5) AI 채점은 선생님만(AI 함수가 반 선생님인지 확인). 학생 화면(voca_speak_mine, voca_class_mine)에는 AI 점수 · 들은 말 · 조언을 보내지 않고,
--    선생님이 직접 매긴 점수 · 메모만 보내요. AI 점수는 서버(AI 함수, service_role)만 쓸 수 있어요.
-- 6) 선생님 점수: 문항마다(voca_speak_teacher) 또는 학생 한 명 전체(voca_speak_mark). 최종 점수 = 전체 점수 > 문항 점수(선생님, 없으면 AI) 평균.
-- 7) 선생님 보드는 10초마다 바뀐 게 있는지만 묻고(p_since), 바뀌었을 때만 전체를 받아요.
-- 8) 반에서 나가거나 내보내지거나 계정을 지우면 녹음 · 점수도 지워요. 학생이 voca_assign_submit 으로 점수를 올리는 길은 막았어요.

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

-- 선생님이 학생 한 명에게 주는 전체 점수 · 메모
create table if not exists public.voca_speak_marks (
  assign_id bigint not null references public.voca_assignments(id) on delete cascade,
  uid text not null,
  t_score int,
  t_note text,
  at timestamptz not null default now(),
  primary key (assign_id, uid)
);
create index if not exists voca_speak_marks_uid on public.voca_speak_marks(uid);

-- 올리기 횟수 (계정 · 시간)
create table if not exists public.voca_speak_rate (
  uid text not null,
  hr timestamptz not null,
  n int not null default 0,
  primary key (uid, hr)
);
alter table public.voca_speak_recs enable row level security;
alter table public.voca_speak_marks enable row level security;
alter table public.voca_speak_rate enable row level security;
revoke all on table public.voca_speak_recs, public.voca_speak_marks, public.voca_speak_rate from public, anon, authenticated;

-- 예전 초안의 함수 중 모양(인자)이 바뀐 것은 지우고 새로 만들어요
drop function if exists public.voca_speak_results(text, bigint);

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

-- (내부) MP3 검사: 앞의 ID3 태그는 건너뛰고, 첫 프레임이 MPEG-2 Layer III · 16kHz · 모노이고 다음 프레임이 바로 이어지는지.
-- 맞으면 비트레이트(kbps)와 첫 프레임 위치, 아니면 kbps 0
create or replace function public.voca_speak_mp3(b bytea, out kbps int, out pos int)
language plpgsql immutable set search_path = public as $$
declare h1 int; h2 int; h3 int; fl int; n int := coalesce(length(b), 0);
begin
  kbps := 0; pos := 0;
  if n < 400 then return; end if;
  if substring(b from 1 for 3) = '\x494433'::bytea then -- 'ID3'
    pos := 10 + (get_byte(b, 6) & 127) * 2097152 + (get_byte(b, 7) & 127) * 16384 + (get_byte(b, 8) & 127) * 128 + (get_byte(b, 9) & 127);
    if get_byte(b, 5) & 16 <> 0 then pos := pos + 10; end if;
  end if;
  if pos + 400 > n or get_byte(b, pos) <> 255 then return; end if;
  h1 := get_byte(b, pos + 1); h2 := get_byte(b, pos + 2); h3 := get_byte(b, pos + 3);
  -- 1111 1111 1111 0 01 x = 프레임 시작 + MPEG-2 + Layer III, 샘플레이트 10 = 16kHz, 비트레이트 1~14, 채널 11 = 모노
  if h1 & 254 <> 242 or (h2 >> 2) & 3 <> 2 or (h2 >> 4) < 1 or (h2 >> 4) > 14 or h3 >> 6 <> 3 then return; end if;
  fl := 72 * (array[8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160])[h2 >> 4] * 1000 / 16000 + ((h2 >> 1) & 1);
  if pos + fl + 2 > n or get_byte(b, pos + fl) <> 255 or get_byte(b, pos + fl + 1) & 254 <> 242 then return; end if;
  kbps := (array[8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160])[h2 >> 4];
end $$;

-- (내부) 학생에게 보여 줄 선생님 점수: 전체 점수, 없으면 모든 문항에 선생님 점수가 있을 때 그 평균 (AI 점수는 넣지 않아요)
create or replace function public.voca_speak_tscore(p_assign bigint, p_uid text)
returns int language sql stable security definer set search_path = public as $$
  select coalesce(
    (select k.t_score from public.voca_speak_marks k where k.assign_id = p_assign and k.uid = p_uid),
    (select case when count(*) > 0 and count(r.t_score) = jsonb_array_length(a.words) then round(avg(r.t_score))::int end
     from public.voca_assignments a left join public.voca_speak_recs r on r.assign_id = a.id and r.uid = p_uid and r.idx < jsonb_array_length(a.words)
     where a.id = p_assign group by a.words));
$$;

-- (내부) 제출한 학생의 최종 점수: 선생님 전체 점수, 없으면 문항마다 선생님 점수(없으면 AI 점수)의 평균
create or replace function public.voca_speak_sync(p_assign bigint, p_uid text)
returns void language plpgsql security definer set search_path = public as $$
declare sc int; k int; tot int; mk int;
begin
  select round(avg(coalesce(t_score, ai_score))), count(coalesce(t_score, ai_score)) into sc, k
  from public.voca_speak_recs where assign_id = p_assign and uid = p_uid;
  select jsonb_array_length(words) into tot from public.voca_assignments where id = p_assign;
  select t_score into mk from public.voca_speak_marks where assign_id = p_assign and uid = p_uid;
  update public.voca_submissions set score = coalesce(mk, sc, 0), ok = case when mk is not null then coalesce(tot, 0) else coalesce(k, 0) end, n = coalesce(tot, 0)
  where assignment_id = p_assign and uid = p_uid;
end $$;

-- (내부) 60일 지난 녹음 파일 지우기 (점수는 남겨요)
create or replace function public.voca_speak_expire()
returns void language sql security definer set search_path = public as $$
  update public.voca_speak_recs set audio = null, bytes = 0 where audio is not null and created_at < now() - interval '60 days';
$$;

-- 학생: 문항 하나 녹음 올리기 (base64 MP3)
create or replace function public.voca_speak_put(p_token text, p_assign bigint, p_idx int, p_b64 text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare u text := public.voca_uid(p_token); a public.voca_assignments; b bytea; c int; dur int; cap int; m record;
begin
  if u is null then return jsonb_build_object('err', 'auth'); end if;
  select a2.* into a from public.voca_assignments a2 join public.voca_class_members m2 on m2.class_id = a2.class_id and m2.uid = u where a2.id = p_assign;
  if not found then return jsonb_build_object('err', 'no_assign'); end if;
  if a.kind <> 'speak' or p_idx is null or p_idx < 0 or p_idx >= jsonb_array_length(a.words) then return jsonb_build_object('err', 'bad_input'); end if;
  -- 한 개 최대: 단어 64KB(32kbps로 16초), 문장 160KB(40초)
  cap := case when a.words->p_idx->>3 = 's' then 163840 else 65536 end;
  if p_b64 is null or length(p_b64) > cap / 3 * 4 + 8 then return jsonb_build_object('err', 'too_big'); end if;
  begin b := decode(p_b64, 'base64'); exception when others then return jsonb_build_object('err', 'bad_audio'); end;
  if length(b) > cap then return jsonb_build_object('err', 'too_big'); end if;
  select * into m from public.voca_speak_mp3(b);
  if m.kbps = 0 then return jsonb_build_object('err', 'bad_audio'); end if;
  dur := ((length(b) - m.pos) * 8 / m.kbps)::int;
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

-- 학생: 다 녹음했으면 제출 (선생님 보드에 바로 나타나요). AI 채점은 하지 않아요
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
  return jsonb_build_object('ok', true, 'n', k, 'at', now());
end $$;

-- 학생: 내 녹음 상태와 선생님 점수 · 메모만 (AI 점수 · 들은 말 · 조언, 소리 파일은 빼고)
create or replace function public.voca_speak_mine(p_token text, p_assign bigint)
returns jsonb language plpgsql security definer set search_path = public as $$
declare u text := public.voca_uid(p_token); a public.voca_assignments; s public.voca_submissions;
begin
  if u is null then return jsonb_build_object('err', 'auth'); end if;
  select a2.* into a from public.voca_assignments a2 join public.voca_class_members m on m.class_id = a2.class_id and m.uid = u where a2.id = p_assign;
  if not found then return jsonb_build_object('err', 'no_assign'); end if;
  if a.kind <> 'speak' then return jsonb_build_object('err', 'bad_input'); end if;
  select * into s from public.voca_submissions where assignment_id = a.id and uid = u;
  return jsonb_build_object('count', jsonb_array_length(a.words), 'submitted', s.uid is not null, 'at', s.last_at,
    'score', public.voca_speak_tscore(a.id, u),
    'note', (select k.t_note from public.voca_speak_marks k where k.assign_id = a.id and k.uid = u),
    'items', coalesce((select jsonb_agg(jsonb_build_object('idx', r.idx, 'bytes', r.bytes, 'dur_ms', r.dur_ms, 'at', r.created_at, 'audio', r.audio is not null,
        't_score', r.t_score, 't_note', r.t_note) order by r.idx)
      from public.voca_speak_recs r where r.assign_id = a.id and r.uid = u), '[]'::jsonb));
end $$;

-- 녹음 듣기: 반 선생님, 또는 학생 본인 (예전 초안의 WAV도 그대로 들려줘요)
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
  return jsonb_build_object('b64', translate(encode(b, 'base64'), E'\n', ''),
    'type', case when substring(b from 1 for 4) = '\x52494646'::bytea then 'audio/wav' else 'audio/mpeg' end);
end $$;

-- 선생님: 학생별 · 문항별 결과 (반 학생 모두, 아직 안 한 학생도). p_since 가 지금 상태(v)와 같으면 바뀐 게 없다는 것만 알려 줘요
create or replace function public.voca_speak_results(p_token text, p_assign bigint, p_since text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare u text := public.voca_uid(p_token); a public.voca_assignments; v text;
begin
  if u is null then return jsonb_build_object('err', 'auth'); end if;
  select a2.* into a from public.voca_assignments a2 join public.voca_classes c on c.id = a2.class_id and c.owner = u where a2.id = p_assign;
  if not found then return jsonb_build_object('err', 'no_assign'); end if;
  perform public.voca_speak_expire();
  v := md5(concat_ws('|',
    (select string_agg(concat_ws(':', r.uid, r.idx, extract(epoch from r.created_at), extract(epoch from r.ai_at), r.t_score, r.t_note, r.audio is null), ',' order by r.uid, r.idx)
      from public.voca_speak_recs r where r.assign_id = a.id),
    (select string_agg(concat_ws(':', s.uid, extract(epoch from s.last_at)), ',' order by s.uid) from public.voca_submissions s where s.assignment_id = a.id),
    (select string_agg(concat_ws(':', k.uid, k.t_score, k.t_note), ',' order by k.uid) from public.voca_speak_marks k where k.assign_id = a.id),
    (select string_agg(concat_ws(':', m.uid, m.name, m.sno), ',' order by m.uid) from public.voca_class_members m where m.class_id = a.class_id)));
  if p_since is not null and p_since = v then return jsonb_build_object('same', true, 'v', v); end if;
  return jsonb_build_object('v', v,
    'assign', jsonb_build_object('id', a.id, 'title', a.title, 'kind', a.kind, 'due', a.due, 'count', jsonb_array_length(a.words), 'words', a.words),
    'rows', coalesce((select jsonb_agg(jsonb_build_object('uid', m.uid, 'name', m.name, 'sno', m.sno,
        'submitted', s.uid is not null, 'score', s.score, 'at', s.last_at,
        'n', (select count(*) from public.voca_speak_recs r where r.assign_id = a.id and r.uid = m.uid),
        'ai_n', (select count(r.ai_score) from public.voca_speak_recs r where r.assign_id = a.id and r.uid = m.uid),
        'ai_avg', (select round(avg(r.ai_score)) from public.voca_speak_recs r where r.assign_id = a.id and r.uid = m.uid),
        't_avg', (select round(avg(r.t_score)) from public.voca_speak_recs r where r.assign_id = a.id and r.uid = m.uid),
        'mark', (select jsonb_build_object('score', k.t_score, 'note', k.t_note) from public.voca_speak_marks k where k.assign_id = a.id and k.uid = m.uid),
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

-- 선생님: 학생 한 명 전체 점수 · 메모 (둘 다 비우면 지워요). 학생 화면에 보여요
create or replace function public.voca_speak_mark(p_token text, p_assign bigint, p_uid text, p_score int, p_note text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare u text := public.voca_uid(p_token); a public.voca_assignments; nt text := nullif(left(btrim(coalesce(p_note, '')), 300), '');
begin
  if u is null then return jsonb_build_object('err', 'auth'); end if;
  select a2.* into a from public.voca_assignments a2 join public.voca_classes c on c.id = a2.class_id and c.owner = u where a2.id = p_assign;
  if not found or a.kind <> 'speak' then return jsonb_build_object('err', 'no_assign'); end if;
  if not exists (select 1 from public.voca_class_members m where m.class_id = a.class_id and m.uid = p_uid) then return jsonb_build_object('err', 'no_rec'); end if;
  if p_score is not null and (p_score < 0 or p_score > 100) then return jsonb_build_object('err', 'bad_input'); end if;
  if p_score is null and nt is null then delete from public.voca_speak_marks where assign_id = a.id and uid = p_uid;
  else
    insert into public.voca_speak_marks(assign_id, uid, t_score, t_note) values (a.id, p_uid, p_score, nt)
    on conflict (assign_id, uid) do update set t_score = excluded.t_score, t_note = excluded.t_note, at = now();
  end if;
  perform public.voca_speak_sync(a.id, p_uid);
  return jsonb_build_object('ok', true);
end $$;

-- 선생님: 녹음 파일 지우기. p_uid 가 있으면 그 학생만, 없으면 과제 전체 (점수 · 들은 말은 남겨요)
create or replace function public.voca_speak_delete(p_token text, p_assign bigint, p_uid text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare u text := public.voca_uid(p_token); k int;
begin
  if u is null then return jsonb_build_object('err', 'auth'); end if;
  if not exists (select 1 from public.voca_assignments a join public.voca_classes c on c.id = a.class_id and c.owner = u where a.id = p_assign) then
    return jsonb_build_object('err', 'no_assign');
  end if;
  update public.voca_speak_recs set audio = null, bytes = 0 where assign_id = p_assign and (p_uid is null or uid = p_uid) and audio is not null;
  get diagnostics k = row_count;
  return jsonb_build_object('ok', true, 'n', k);
end $$;

-- (AI 함수 전용) 채점할 녹음. p_all 이면 이미 채점한 것도 다시. 선생님 확인은 AI 함수가 voca_speak_is_owner 로 먼저 해요
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
      'mime', case when substring(r.audio from 1 for 4) = '\x52494646'::bytea then 'audio/wav' else 'audio/mp3' end,
      'b64', translate(encode(r.audio, 'base64'), E'\n', '')) order by r.idx)
    from public.voca_speak_recs r
    where r.assign_id = a.id and r.uid = p_uid and r.audio is not null and r.idx < jsonb_array_length(a.words) and (p_all or r.ai_score is null)), '[]'::jsonb));
end $$;

-- (AI 함수 전용) 이 계정이 과제를 낸 반 선생님인지
create or replace function public.voca_speak_is_owner(p_uid text, p_assign bigint)
returns boolean language sql security definer set search_path = public as $$
  select exists (select 1 from public.voca_assignments a join public.voca_classes c on c.id = a.class_id where a.id = p_assign and a.kind = 'speak' and c.owner = p_uid);
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

-- 학생 반 목록: 발음 평가는 AI 점수를 빼고 선생님 점수만(없으면 null -> 앱에 '제출 완료')
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
            'mine', (select case when a.kind = 'speak' then jsonb_build_object('score', public.voca_speak_tscore(a.id, u), 'tries', s.tries, 'at', s.last_at)
                else jsonb_build_object('score', s.score, 'tries', s.tries, 'at', s.last_at, 'ok', s.ok, 'n', s.n) end
              from public.voca_submissions s where s.assignment_id = a.id and s.uid = u))
          order by a.id desc) from public.voca_assignments a where a.class_id = c.id), '[]'::jsonb)) order by c.id)
      from public.voca_classes c join public.voca_class_members m on m.class_id = c.id and m.uid = u), '[]'::jsonb));
end $$;

-- 반에서 나가기 · 내보내기 · 계정 지우기: 녹음 · 점수도 함께 지워요 (반·과제를 지우면 표 연결로 함께 지워져요)
create or replace function public.voca_class_leave(p_token text, p_class bigint)
returns jsonb language plpgsql security definer set search_path = public as $$
declare u text := public.voca_uid(p_token);
begin
  if u is null then return jsonb_build_object('err', 'auth'); end if;
  delete from public.voca_speak_recs r using public.voca_assignments a where r.assign_id = a.id and a.class_id = p_class and r.uid = u;
  delete from public.voca_speak_marks r using public.voca_assignments a where r.assign_id = a.id and a.class_id = p_class and r.uid = u;
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
  delete from public.voca_speak_marks r using public.voca_assignments a where r.assign_id = a.id and a.class_id = p_class and r.uid = p_uid;
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
  delete from public.voca_speak_marks where uid = u;
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
  delete from public.voca_speak_marks where uid = old.id::text;
  delete from public.voca_speak_rate where uid = old.id::text;
  delete from public.voca_submissions where uid = old.id::text;
  delete from public.voca_class_members where uid = old.id::text;
  delete from public.voca_classes where owner = old.id::text;
  return old;
end $$;

-- 권한: 앱(anon)은 아래 함수만, AI 함수(service_role)는 채점 함수만
revoke all on function
  public.voca_speak_sync(bigint, text), public.voca_speak_expire(), public.voca_class_cleanup(),
  public.voca_speak_mp3(bytea), public.voca_speak_tscore(bigint, text),
  public.voca_speak_for_grade(text, bigint, boolean), public.voca_speak_is_owner(text, bigint), public.voca_speak_set_ai(text, bigint, int, int, jsonb)
from public, anon, authenticated;
grant execute on function
  public.voca_speak_for_grade(text, bigint, boolean), public.voca_speak_is_owner(text, bigint), public.voca_speak_set_ai(text, bigint, int, int, jsonb)
to service_role;
grant execute on function
  public.voca_speak_put(text, bigint, int, text), public.voca_speak_submit(text, bigint), public.voca_speak_mine(text, bigint),
  public.voca_speak_audio(text, bigint, text, int), public.voca_speak_results(text, bigint, text), public.voca_speak_teacher(text, bigint, text, int, int, text),
  public.voca_speak_mark(text, bigint, text, int, text), public.voca_speak_delete(text, bigint, text),
  public.voca_class_mine(text), public.voca_class_leave(text, bigint), public.voca_class_kick(text, bigint, text), public.voca_class_forget(text)
to anon, authenticated;

notify pgrst, 'reload schema';
