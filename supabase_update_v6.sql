-- VocaPro v6: 우리 반 (반 만들기, 초대 코드, 과제, 학생별 현황, 시험 결과 제출)
-- Supabase 대시보드 > SQL Editor에 이 파일 전체를 붙여 넣고 Run을 한 번 누르세요. 다시 실행해도 안전해요.
-- 앱은 이 SQL이 없어도 그대로 동작하고, '우리 반' 화면만 "아직 준비 중"이라고 안내해요.

create table if not exists public.voca_classes (
  id bigint generated always as identity primary key,
  code text not null unique,
  owner text not null,
  name text not null,
  teacher text not null default '',
  school text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists voca_classes_owner on public.voca_classes(owner);

create table if not exists public.voca_class_members (
  class_id bigint not null references public.voca_classes(id) on delete cascade,
  uid text not null,
  name text not null default '',
  sno text not null default '',
  progress jsonb not null default '{}'::jsonb,
  joined_at timestamptz not null default now(),
  updated_at timestamptz,
  primary key (class_id, uid)
);
create index if not exists voca_class_members_uid on public.voca_class_members(uid);

create table if not exists public.voca_assignments (
  id bigint generated always as identity primary key,
  class_id bigint not null references public.voca_classes(id) on delete cascade,
  title text not null,
  kind text not null check (kind in ('study', 'test')),
  n int not null default 20,
  due date,
  words jsonb not null,
  created_at timestamptz not null default now()
);
create index if not exists voca_assignments_class on public.voca_assignments(class_id);

create table if not exists public.voca_submissions (
  assignment_id bigint not null references public.voca_assignments(id) on delete cascade,
  uid text not null,
  score int not null,
  ok int not null default 0,
  n int not null default 0,
  sec int not null default 0,
  wrong jsonb not null default '[]'::jsonb,
  tries int not null default 1,
  first_at timestamptz not null default now(),
  last_at timestamptz not null default now(),
  primary key (assignment_id, uid)
);
create index if not exists voca_submissions_uid on public.voca_submissions(uid);

-- 표는 앱에서 직접 읽고 쓸 수 없어요. 아래 함수로만 처리해요.
alter table public.voca_classes enable row level security;
alter table public.voca_class_members enable row level security;
alter table public.voca_assignments enable row level security;
alter table public.voca_submissions enable row level security;
revoke all on table public.voca_classes, public.voca_class_members, public.voca_assignments, public.voca_submissions from public, anon, authenticated;

-- 로그인 토큰 -> 회원 id (기존 voca_me 사용)
create or replace function public.voca_uid(p_token text)
returns text language plpgsql security definer set search_path = public as $$
declare j jsonb;
begin
  if p_token is null or p_token = '' then return null; end if;
  begin j := to_jsonb(public.voca_me(p_token)); exception when others then return null; end;
  if j is null or jsonb_typeof(j) <> 'object' or j ? 'err' then return null; end if;
  return nullif(j->>'id', '');
end $$;

create or replace function public.voca_class_create(p_token text, p_name text, p_teacher text, p_school text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare u text := public.voca_uid(p_token); c text; i int := 0; r public.voca_classes;
begin
  if u is null then return jsonb_build_object('err', 'auth'); end if;
  p_name := left(btrim(coalesce(p_name, '')), 40);
  if p_name = '' then return jsonb_build_object('err', 'bad_input'); end if;
  if (select count(*) from public.voca_classes where owner = u) >= 30 then return jsonb_build_object('err', 'too_many'); end if;
  loop
    c := '';
    for k in 1..6 loop c := c || substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 1 + floor(random() * 32)::int, 1); end loop;
    exit when not exists (select 1 from public.voca_classes where code = c);
    i := i + 1; if i > 20 then return jsonb_build_object('err', 'server'); end if;
  end loop;
  insert into public.voca_classes(code, owner, name, teacher, school)
  values (c, u, p_name, left(coalesce(p_teacher, ''), 30), left(coalesce(p_school, ''), 40)) returning * into r;
  return jsonb_build_object('id', r.id, 'code', r.code, 'name', r.name);
end $$;

create or replace function public.voca_class_join(p_token text, p_code text, p_name text, p_sno text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare u text := public.voca_uid(p_token); r public.voca_classes;
begin
  if u is null then return jsonb_build_object('err', 'auth'); end if;
  select * into r from public.voca_classes where code = upper(btrim(coalesce(p_code, '')));
  if not found then return jsonb_build_object('err', 'no_class'); end if;
  if r.owner = u then return jsonb_build_object('err', 'own_class'); end if;
  if not exists (select 1 from public.voca_class_members where class_id = r.id and uid = u) then
    if (select count(*) from public.voca_class_members where uid = u) >= 10 then return jsonb_build_object('err', 'too_many'); end if;
    if (select count(*) from public.voca_class_members where class_id = r.id) >= 200 then return jsonb_build_object('err', 'full'); end if;
  end if;
  insert into public.voca_class_members(class_id, uid, name, sno) values (r.id, u, left(coalesce(p_name, ''), 30), left(coalesce(p_sno, ''), 12))
  on conflict (class_id, uid) do update set name = excluded.name, sno = excluded.sno;
  return jsonb_build_object('id', r.id, 'name', r.name, 'teacher', r.teacher, 'school', r.school);
end $$;

create or replace function public.voca_class_leave(p_token text, p_class bigint)
returns jsonb language plpgsql security definer set search_path = public as $$
declare u text := public.voca_uid(p_token);
begin
  if u is null then return jsonb_build_object('err', 'auth'); end if;
  delete from public.voca_submissions s using public.voca_assignments a where s.assignment_id = a.id and a.class_id = p_class and s.uid = u;
  delete from public.voca_class_members where class_id = p_class and uid = u;
  return jsonb_build_object('ok', true);
end $$;

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
            'mine', (select jsonb_build_object('score', s.score, 'tries', s.tries, 'at', s.last_at) from public.voca_submissions s where s.assignment_id = a.id and s.uid = u))
          order by a.id desc) from public.voca_assignments a where a.class_id = c.id), '[]'::jsonb)) order by c.id)
      from public.voca_classes c join public.voca_class_members m on m.class_id = c.id and m.uid = u), '[]'::jsonb));
end $$;

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
        'avg', (select round(avg(s.score)) from public.voca_submissions s join public.voca_class_members m on m.uid = s.uid and m.class_id = r.id where s.assignment_id = a.id)) order by a.id desc)
      from public.voca_assignments a where a.class_id = r.id), '[]'::jsonb));
end $$;

create or replace function public.voca_class_kick(p_token text, p_class bigint, p_uid text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare u text := public.voca_uid(p_token);
begin
  if u is null then return jsonb_build_object('err', 'auth'); end if;
  if not exists (select 1 from public.voca_classes where id = p_class and owner = u) then return jsonb_build_object('err', 'no_class'); end if;
  delete from public.voca_submissions s using public.voca_assignments a where s.assignment_id = a.id and a.class_id = p_class and s.uid = p_uid;
  delete from public.voca_class_members where class_id = p_class and uid = p_uid;
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.voca_class_delete(p_token text, p_class bigint)
returns jsonb language plpgsql security definer set search_path = public as $$
declare u text := public.voca_uid(p_token);
begin
  if u is null then return jsonb_build_object('err', 'auth'); end if;
  delete from public.voca_classes where id = p_class and owner = u;
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.voca_assign_create(p_token text, p_class bigint, p_title text, p_kind text, p_n int, p_due date, p_words jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare u text := public.voca_uid(p_token); i bigint;
begin
  if u is null then return jsonb_build_object('err', 'auth'); end if;
  if not exists (select 1 from public.voca_classes where id = p_class and owner = u) then return jsonb_build_object('err', 'no_class'); end if;
  p_title := left(btrim(coalesce(p_title, '')), 60);
  if p_title = '' or p_kind not in ('study', 'test') or jsonb_typeof(p_words) <> 'array'
     or jsonb_array_length(p_words) < 1 or jsonb_array_length(p_words) > 500 or length(p_words::text) > 200000 then
    return jsonb_build_object('err', 'bad_input');
  end if;
  if (select count(*) from public.voca_assignments where class_id = p_class) >= 300 then return jsonb_build_object('err', 'too_many'); end if;
  insert into public.voca_assignments(class_id, title, kind, n, due, words)
  values (p_class, p_title, p_kind, greatest(1, least(coalesce(p_n, 20), 100)), p_due, p_words) returning id into i;
  return jsonb_build_object('id', i);
end $$;

create or replace function public.voca_assign_delete(p_token text, p_assign bigint)
returns jsonb language plpgsql security definer set search_path = public as $$
declare u text := public.voca_uid(p_token);
begin
  if u is null then return jsonb_build_object('err', 'auth'); end if;
  delete from public.voca_assignments a using public.voca_classes c where a.id = p_assign and c.id = a.class_id and c.owner = u;
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.voca_assign_get(p_token text, p_assign bigint)
returns jsonb language plpgsql security definer set search_path = public as $$
declare u text := public.voca_uid(p_token); a public.voca_assignments; c public.voca_classes;
begin
  if u is null then return jsonb_build_object('err', 'auth'); end if;
  select * into a from public.voca_assignments where id = p_assign;
  if not found then return jsonb_build_object('err', 'no_assign'); end if;
  select * into c from public.voca_classes where id = a.class_id;
  if c.owner <> u and not exists (select 1 from public.voca_class_members where class_id = c.id and uid = u) then return jsonb_build_object('err', 'no_assign'); end if;
  return jsonb_build_object('id', a.id, 'title', a.title, 'kind', a.kind, 'n', a.n, 'due', a.due, 'words', a.words, 'class', c.name);
end $$;

create or replace function public.voca_assign_submit(p_token text, p_assign bigint, p_ok int, p_n int, p_sec int, p_wrong jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare u text := public.voca_uid(p_token); sc int; s public.voca_submissions;
begin
  if u is null then return jsonb_build_object('err', 'auth'); end if;
  if not exists (select 1 from public.voca_assignments a join public.voca_class_members m on m.class_id = a.class_id and m.uid = u where a.id = p_assign) then
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

create or replace function public.voca_assign_results(p_token text, p_assign bigint)
returns jsonb language plpgsql security definer set search_path = public as $$
declare u text := public.voca_uid(p_token); a public.voca_assignments;
begin
  if u is null then return jsonb_build_object('err', 'auth'); end if;
  select a2.* into a from public.voca_assignments a2 join public.voca_classes c on c.id = a2.class_id and c.owner = u where a2.id = p_assign;
  if not found then return jsonb_build_object('err', 'no_assign'); end if;
  return jsonb_build_object(
    'assign', jsonb_build_object('id', a.id, 'title', a.title, 'kind', a.kind, 'n', a.n, 'due', a.due, 'count', jsonb_array_length(a.words)),
    'rows', coalesce((select jsonb_agg(jsonb_build_object('name', m.name, 'sno', m.sno,
        'score', s.score, 'ok', s.ok, 'n', s.n, 'sec', s.sec, 'tries', s.tries, 'at', s.last_at, 'wrong', s.wrong) order by m.sno, m.name)
      from public.voca_class_members m left join public.voca_submissions s on s.assignment_id = a.id and s.uid = m.uid
      where m.class_id = a.class_id), '[]'::jsonb));
end $$;

-- 학생 앱이 동기화할 때 학습 요약(단어 수, 정답률, 많이 틀린 단어 등)을 참여한 반에 올려요.
create or replace function public.voca_class_report(p_token text, p_progress jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare u text := public.voca_uid(p_token); k int;
begin
  if u is null then return jsonb_build_object('err', 'auth'); end if;
  if p_progress is null or jsonb_typeof(p_progress) <> 'object' or length(p_progress::text) > 20000 then return jsonb_build_object('err', 'bad_input'); end if;
  update public.voca_class_members set progress = p_progress, updated_at = now() where uid = u;
  get diagnostics k = row_count;
  return jsonb_build_object('n', k);
end $$;

-- 계정을 지울 때 반 관련 기록도 모두 지워요.
create or replace function public.voca_class_forget(p_token text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare u text := public.voca_uid(p_token);
begin
  if u is null then return jsonb_build_object('err', 'auth'); end if;
  delete from public.voca_submissions where uid = u;
  delete from public.voca_class_members where uid = u;
  delete from public.voca_classes where owner = u;
  return jsonb_build_object('ok', true);
end $$;

revoke all on function public.voca_uid(text) from public, anon, authenticated;
grant execute on function
  public.voca_class_create(text, text, text, text), public.voca_class_join(text, text, text, text),
  public.voca_class_leave(text, bigint), public.voca_class_mine(text), public.voca_class_detail(text, bigint),
  public.voca_class_kick(text, bigint, text), public.voca_class_delete(text, bigint),
  public.voca_assign_create(text, bigint, text, text, int, date, jsonb), public.voca_assign_delete(text, bigint),
  public.voca_assign_get(text, bigint), public.voca_assign_submit(text, bigint, int, int, int, jsonb),
  public.voca_assign_results(text, bigint), public.voca_class_report(text, jsonb), public.voca_class_forget(text)
to anon, authenticated;

-- 계정 표에서 회원이 지워지면 반 기록도 함께 지워요(계정 표에 id 열이 있을 때만 연결).
create or replace function public.voca_class_cleanup()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  delete from public.voca_submissions where uid = old.id::text;
  delete from public.voca_class_members where uid = old.id::text;
  delete from public.voca_classes where owner = old.id::text;
  return old;
end $$;
do $$ begin
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'voca_accounts' and column_name = 'id') then
    drop trigger if exists voca_class_cleanup on public.voca_accounts;
    create trigger voca_class_cleanup after delete on public.voca_accounts for each row execute function public.voca_class_cleanup();
  end if;
end $$;

notify pgrst, 'reload schema';
