-- VocaPro 업데이트 v12: 기기 AI 채점 저장 + 보안 보강
-- 순서: v10 -> v11 -> v12 -> v13. 여러 번 실행해도 안전해요. (가입 제한은 v13 에서 고쳤어요. v12 다음에 v13 을 꼭 실행하세요)
--
-- 1) 선생님 기기(브라우저)에서 채점한 발음 점수 저장: voca_speak_set_local
-- 2) 녹음 올리기: MP3 프레임을 끝까지 검사(가짜 파일로 DB 채우기 막기), 학생 한 명 녹음 합계 30MB까지
-- 3) 녹음 듣기 속도 제한(한 시간 1,500번)
-- 4) 시험 점수 제출: 과제를 연 지 (문항 수 x 1초)가 안 됐거나 단어 수보다 많은 문항이면 거절(직접 호출로 100점 만들기 막기)
-- 5) 가입 속도 제한: 같은 인터넷 주소(IP)에서 한 시간 60개, 전체 한 시간 1,500개 (예전: 전체 300개라 누가 막을 수 있었어요)
-- 6) 반 초대 코드 바꾸기: voca_class_rotate_code (쫓아낸 학생이 새 계정으로 다시 들어오는 것 막기)
-- 7) 다시 녹음하면 그 문항의 예전 선생님 점수 · 메모도 지워요. 반 화면 과제 평균에서 아직 채점 안 한 발음 평가는 빼요

-- 1) 기기 AI 채점 저장 (그 과제를 낸 선생님만). p_items: [{ idx, score, detail }]
create or replace function public.voca_speak_set_local(p_token text, p_assign bigint, p_uid text, p_items jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare u text := public.voca_uid(p_token); a public.voca_assignments; e jsonb; i int; sc int; d jsonb; done int := 0; c int;
begin
  if u is null then return jsonb_build_object('err', 'auth'); end if;
  select a2.* into a from public.voca_assignments a2 join public.voca_classes c2 on c2.id = a2.class_id and c2.owner = u where a2.id = p_assign and a2.kind = 'speak';
  if not found then return jsonb_build_object('err', 'no_assign'); end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) > 20 or length(p_items::text) > 40000 then return jsonb_build_object('err', 'bad_input'); end if;
  insert into public.voca_speak_rate(uid, hr, n) values ('L:' || u, date_trunc('hour', now()), 1)
  on conflict (uid, hr) do update set n = public.voca_speak_rate.n + 1 returning n into c;
  if c > 2000 then return jsonb_build_object('err', 'too_many'); end if;
  for e in select value from jsonb_array_elements(p_items) loop
    if jsonb_typeof(e) <> 'object' or jsonb_typeof(e->'idx') <> 'number' or jsonb_typeof(e->'score') <> 'number' then return jsonb_build_object('err', 'bad_input'); end if;
    i := (e->>'idx')::numeric::int; sc := greatest(0, least(round((e->>'score')::numeric)::int, 100));
    if i < 0 or i >= jsonb_array_length(a.words) then return jsonb_build_object('err', 'bad_input'); end if;
    d := case when jsonb_typeof(e->'detail') = 'object' and length((e->'detail')::text) <= 2000 then e->'detail' else '{}'::jsonb end;
    d := (d - 'v') || jsonb_build_object('model', 'vocapro-local');
    update public.voca_speak_recs set ai_score = sc, ai_detail = d, ai_at = now() where assign_id = a.id and uid = p_uid and idx = i;
    if found then done := done + 1; end if;
  end loop;
  perform public.voca_speak_sync(a.id, p_uid);
  return jsonb_build_object('ok', true, 'n', done);
end $$;
revoke all on function public.voca_speak_set_local(text, bigint, text, jsonb) from public;
grant execute on function public.voca_speak_set_local(text, bigint, text, jsonb) to anon, authenticated;

-- 2) MP3 검사: 앞의 ID3 태그를 건너뛰고, 첫 프레임부터 끝까지 MPEG-2 Layer III · 16kHz · 모노 프레임이 빈틈없이 이어지는지 봐요.
--    끝에는 ID3v1 태그(128바이트)나 3바이트 이하 찌꺼기만 허용해요. 맞으면 비트레이트(kbps)와 첫 프레임 위치, 아니면 kbps 0
create or replace function public.voca_speak_mp3(b bytea, out kbps int, out pos int)
language plpgsql immutable set search_path = public as $$
declare h1 int; h2 int; h3 int; fl int; n int := coalesce(length(b), 0); p int; k int := 0; first_kb int;
  rates int[] := array[8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160];
begin
  kbps := 0; pos := 0;
  if n < 400 then return; end if;
  if substring(b from 1 for 3) = '\x494433'::bytea then -- 'ID3'
    pos := 10 + (get_byte(b, 6) & 127) * 2097152 + (get_byte(b, 7) & 127) * 16384 + (get_byte(b, 8) & 127) * 128 + (get_byte(b, 9) & 127);
    if get_byte(b, 5) & 16 <> 0 then pos := pos + 10; end if;
  end if;
  if pos + 400 > n then return; end if;
  p := pos;
  loop
    exit when n - p <= 3 or (n - p = 128 and substring(b from p + 1 for 3) = '\x544147'::bytea); -- 끝 또는 'TAG'
    if p + 4 > n or get_byte(b, p) <> 255 then return; end if;
    h1 := get_byte(b, p + 1); h2 := get_byte(b, p + 2); h3 := get_byte(b, p + 3);
    -- 1111 1111 1111 0 01 x = 프레임 시작 + MPEG-2 + Layer III, 샘플레이트 10 = 16kHz, 비트레이트 1~14, 채널 11 = 모노
    if h1 & 254 <> 242 or (h2 >> 2) & 3 <> 2 or (h2 >> 4) < 1 or (h2 >> 4) > 14 or h3 >> 6 <> 3 then return; end if;
    fl := 72 * rates[h2 >> 4] * 1000 / 16000 + ((h2 >> 1) & 1);
    if first_kb is null then first_kb := rates[h2 >> 4]; end if;
    if p + fl > n then return; end if;
    p := p + fl; k := k + 1;
    if k > 20000 then return; end if;
  end loop;
  if k < 2 then return; end if;
  kbps := first_kb;
end $$;

-- 학생: 문항 하나 녹음 올리기 (v11 + 학생 한 명 녹음 합계 30MB까지)
create or replace function public.voca_speak_put(p_token text, p_assign bigint, p_idx int, p_b64 text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare u text := public.voca_uid(p_token); a public.voca_assignments; b bytea; c int; dur int; cap int; m record; used bigint;
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
  select coalesce(sum(bytes), 0) into used from public.voca_speak_recs where uid = u and not (assign_id = a.id and idx = p_idx);
  if used + length(b) > 30 * 1024 * 1024 then return jsonb_build_object('err', 'too_many'); end if;
  insert into public.voca_speak_rate(uid, hr, n) values (u, date_trunc('hour', now()), 1)
  on conflict (uid, hr) do update set n = public.voca_speak_rate.n + 1 returning n into c;
  if c > 120 then return jsonb_build_object('err', 'too_many'); end if;
  delete from public.voca_speak_rate where hr < now() - interval '1 day';
  perform public.voca_speak_expire();
  insert into public.voca_speak_recs(assign_id, uid, idx, audio, bytes, dur_ms) values (a.id, u, p_idx, b, length(b), dur)
  on conflict (assign_id, uid, idx) do update set audio = excluded.audio, bytes = excluded.bytes, dur_ms = excluded.dur_ms,
    created_at = now(), ai_score = null, ai_detail = null, ai_at = null, t_score = null, t_note = null; -- 다시 녹음하면 예전 점수(AI · 선생님)는 지워요
  perform public.voca_speak_sync(a.id, u);
  return jsonb_build_object('ok', true, 'idx', p_idx, 'bytes', length(b), 'dur_ms', dur);
end $$;

-- 3) 녹음 듣기: 반 선생님, 또는 학생 본인. 한 사람이 한 시간 1,500번까지
create or replace function public.voca_speak_audio(p_token text, p_assign bigint, p_uid text, p_idx int)
returns jsonb language plpgsql security definer set search_path = public as $$
declare u text := public.voca_uid(p_token); ok boolean; b bytea; c int;
begin
  if u is null then return jsonb_build_object('err', 'auth'); end if;
  select (c2.owner = u) or (p_uid = u and exists (select 1 from public.voca_class_members m where m.class_id = c2.id and m.uid = u)) into ok
  from public.voca_assignments a join public.voca_classes c2 on c2.id = a.class_id where a.id = p_assign;
  if not coalesce(ok, false) then return jsonb_build_object('err', 'no_assign'); end if;
  insert into public.voca_speak_rate(uid, hr, n) values ('A:' || u, date_trunc('hour', now()), 1)
  on conflict (uid, hr) do update set n = public.voca_speak_rate.n + 1 returning n into c;
  if c > 1500 then return jsonb_build_object('err', 'too_many'); end if;
  select audio into b from public.voca_speak_recs where assign_id = p_assign and uid = p_uid and idx = p_idx;
  if b is null then return jsonb_build_object('err', 'no_rec'); end if;
  return jsonb_build_object('b64', translate(encode(b, 'base64'), E'\n', ''),
    'type', case when substring(b from 1 for 4) = '\x52494646'::bytea then 'audio/wav' else 'audio/mpeg' end);
end $$;

-- 4) 시험 점수 제출: 과제를 연 시각을 기록해 두고(voca_assign_get), 너무 빠르거나 단어 수보다 많은 문항이면 거절해요
create table if not exists public.voca_assign_open (
  uid text not null,
  assign_id bigint not null references public.voca_assignments(id) on delete cascade,
  at timestamptz not null default now(),
  primary key (uid, assign_id)
);
alter table public.voca_assign_open enable row level security;
revoke all on table public.voca_assign_open from public, anon, authenticated;

create or replace function public.voca_assign_get(p_token text, p_assign bigint)
returns jsonb language plpgsql security definer set search_path = public as $$
declare u text := public.voca_uid(p_token); a public.voca_assignments; c public.voca_classes;
begin
  if u is null then return jsonb_build_object('err', 'auth'); end if;
  select * into a from public.voca_assignments where id = p_assign;
  if not found then return jsonb_build_object('err', 'no_assign'); end if;
  select * into c from public.voca_classes where id = a.class_id;
  if c.owner <> u and not exists (select 1 from public.voca_class_members where class_id = c.id and uid = u) then return jsonb_build_object('err', 'no_assign'); end if;
  if c.owner <> u then
    insert into public.voca_assign_open(uid, assign_id, at) values (u, a.id, now())
    on conflict (uid, assign_id) do update set at = now();
  end if;
  return jsonb_build_object('id', a.id, 'title', a.title, 'kind', a.kind, 'n', a.n, 'due', a.due, 'words', a.words, 'class', c.name);
end $$;

create or replace function public.voca_assign_submit(p_token text, p_assign bigint, p_ok int, p_n int, p_sec int, p_wrong jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare u text := public.voca_uid(p_token); sc int; s public.voca_submissions; a public.voca_assignments; opened timestamptz; nw int;
begin
  if u is null then return jsonb_build_object('err', 'auth'); end if;
  select a2.* into a from public.voca_assignments a2 join public.voca_class_members m on m.class_id = a2.class_id and m.uid = u where a2.id = p_assign and a2.kind <> 'speak';
  if not found then return jsonb_build_object('err', 'no_assign'); end if;
  nw := greatest(1, jsonb_array_length(a.words));
  p_n := greatest(1, least(coalesce(p_n, 1), 1000)); p_ok := greatest(0, least(coalesce(p_ok, 0), p_n));
  if p_n > nw then return jsonb_build_object('err', 'bad_input'); end if;
  select at into opened from public.voca_assign_open where uid = u and assign_id = a.id;
  -- 한 문항에 적어도 1초: 과제를 열지 않았거나 너무 빨리 냈으면 받지 않아요
  if opened is null or now() - opened < make_interval(secs => p_n) then return jsonb_build_object('err', 'too_fast'); end if;
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

-- 5) 가입 속도 제한: IP마다 한 시간 60개(한 반이 학교에서 같이 가입해도 돼요), 전체 한 시간 1,500개
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
declare c int; v_ip text := public.voca_req_ip();
begin
  delete from public.voca_signup_rate where hr < now() - interval '2 days';
  delete from public.voca_signup_ip where hr < now() - interval '2 days';
  if v_ip <> '' then
    insert into public.voca_signup_ip(ip, hr, n) values (v_ip, date_trunc('hour', now()), 1)
    on conflict (ip, hr) do update set n = public.voca_signup_ip.n + 1 returning public.voca_signup_ip.n into c;
    if c > 60 then raise exception 'too_many_signups' using errcode = 'P0001'; end if;
  end if;
  insert into public.voca_signup_rate(hr, n) values (date_trunc('hour', now()), 1)
  on conflict (hr) do update set n = public.voca_signup_rate.n + 1 returning public.voca_signup_rate.n into c;
  if c > 1500 then raise exception 'too_many_signups' using errcode = 'P0001'; end if;
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

-- 7) 반 화면 과제 평균: 아직 채점하지 않은 발음 평가 제출(0점으로 저장된 것)은 평균에서 빼요
create or replace function public.voca_class_detail(p_token text, p_class bigint)
returns jsonb language plpgsql security definer set search_path = public as $$
declare u text := public.voca_uid(p_token); r public.voca_classes;
begin
  if u is null then return jsonb_build_object('err', 'auth'); end if;
  select * into r from public.voca_classes where id = p_class and owner = u;
  if not found then return jsonb_build_object('err', 'no_class'); end if;
  return jsonb_build_object(
    'class', jsonb_build_object('id', r.id, 'name', r.name, 'code', r.code),
    'members', coalesce((select jsonb_agg(jsonb_build_object('uid', m.uid, 'name', m.name, 'sno', m.sno, 'progress', m.progress,
        'joined', m.joined_at, 'updated', m.updated_at,
        'done', (select count(*) from public.voca_submissions s join public.voca_assignments a on a.id = s.assignment_id where a.class_id = r.id and s.uid = m.uid)) order by m.sno, m.name)
      from public.voca_class_members m where m.class_id = r.id), '[]'::jsonb),
    'assignments', coalesce((select jsonb_agg(jsonb_build_object('id', a.id, 'title', a.title, 'kind', a.kind, 'n', a.n, 'due', a.due,
        'count', jsonb_array_length(a.words), 'created', a.created_at,
        'subs', (select count(*) from public.voca_submissions s join public.voca_class_members m on m.uid = s.uid and m.class_id = r.id where s.assignment_id = a.id),
        'avg', (select round(avg(s.score)) from public.voca_submissions s join public.voca_class_members m on m.uid = s.uid and m.class_id = r.id where s.assignment_id = a.id and (a.kind <> 'speak' or s.ok > 0))) order by a.id desc)
      from public.voca_assignments a where a.class_id = r.id), '[]'::jsonb));
end $$;

-- 6) 반 초대 코드 바꾸기 (반을 만든 선생님만). 예전 코드로는 더 들어올 수 없어요
create or replace function public.voca_class_rotate_code(p_token text, p_class bigint)
returns jsonb language plpgsql security definer set search_path = public as $$
declare u text := public.voca_uid(p_token); c text; i int := 0; r bytea;
begin
  if u is null then return jsonb_build_object('err', 'auth'); end if;
  if not exists (select 1 from public.voca_classes where id = p_class and owner = u) then return jsonb_build_object('err', 'no_class'); end if;
  loop
    c := ''; r := uuid_send(gen_random_uuid());
    for k in 0..5 loop c := c || substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 1 + get_byte(r, k) % 32, 1); end loop;
    exit when not exists (select 1 from public.voca_classes where code = c);
    i := i + 1; if i > 20 then return jsonb_build_object('err', 'server'); end if;
  end loop;
  update public.voca_classes set code = c where id = p_class;
  return jsonb_build_object('code', c);
end $$;
revoke all on function public.voca_class_rotate_code(text, bigint) from public;
grant execute on function public.voca_class_rotate_code(text, bigint) to anon, authenticated;

notify pgrst, 'reload schema';
