-- VocaPro v8: 보안 보강 (v5, v6, v7을 실행한 뒤 SQL Editor에 이 파일 전체를 붙여 넣고 Run을 한 번 누르세요. 다시 실행해도 안전해요.)
-- 1) AI 전체 하루 한도: 계정을 여러 개 만들어 한도를 피하는 것을 막아요. (Edge Function ai v5가 사용, 비밀 값 AI_GLOBAL_LIMIT)
-- 2) 반 초대 코드 맞히기 막기: 한 계정이 하루에 틀린 코드를 20번 넘게 넣으면 그날은 참여를 막아요.
-- 3) 실시간 보기: 학생이 보낸 'today' 값이 숫자가 아니어도 선생님 화면이 멈추지 않게 해요.

-- 1) AI 사용량: uid '*' 줄에 하루 전체 사용량을 세요. 기존 2개 인자 함수(v5)는 그대로 두어 이전 함수 버전도 동작해요.
create or replace function public.voca_ai_use(p_uid text, p_limit int, p_global int)
returns boolean language plpgsql security definer set search_path = public as $$
declare c int; g int;
begin
  delete from public.voca_ai_usage where day < current_date - 30;
  insert into public.voca_ai_usage(uid, day, n) values ('*', current_date, 1)
  on conflict (uid, day) do update set n = public.voca_ai_usage.n + 1
  returning n into g;
  insert into public.voca_ai_usage(uid, day, n) values (p_uid, current_date, 1)
  on conflict (uid, day) do update set n = public.voca_ai_usage.n + 1
  returning n into c;
  return c <= p_limit and (coalesce(p_global, 0) <= 0 or g <= p_global);
end $$;
revoke all on function public.voca_ai_use(text, int, int) from public, anon, authenticated;
grant execute on function public.voca_ai_use(text, int, int) to service_role;

-- 2) 틀린 초대 코드 기록 (하루 단위, 7일 보관)
create table if not exists public.voca_join_fail (
  uid text not null,
  day date not null default current_date,
  n int not null default 0,
  primary key (uid, day)
);
alter table public.voca_join_fail enable row level security;
revoke all on table public.voca_join_fail from public, anon, authenticated;

create or replace function public.voca_class_join(p_token text, p_code text, p_name text, p_sno text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare u text := public.voca_uid(p_token); r public.voca_classes;
begin
  if u is null then return jsonb_build_object('err', 'auth'); end if;
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
  if not exists (select 1 from public.voca_class_members where class_id = r.id and uid = u) then
    if (select count(*) from public.voca_class_members where uid = u) >= 10 then return jsonb_build_object('err', 'too_many'); end if;
    if (select count(*) from public.voca_class_members where class_id = r.id) >= 200 then return jsonb_build_object('err', 'full'); end if;
  end if;
  insert into public.voca_class_members(class_id, uid, name, sno) values (r.id, u, left(coalesce(p_name, ''), 30), left(coalesce(p_sno, ''), 12))
  on conflict (class_id, uid) do update set name = excluded.name, sno = excluded.sno;
  return jsonb_build_object('id', r.id, 'name', r.name, 'teacher', r.teacher, 'school', r.school);
end $$;
grant execute on function public.voca_class_join(text, text, text, text) to anon, authenticated;

-- 3) 실시간 보기 (v7과 같고 'today' 읽는 부분만 안전하게)
create or replace function public.voca_class_live(p_token text, p_class bigint)
returns jsonb language plpgsql security definer set search_path = public as $$
declare u text := public.voca_uid(p_token); r public.voca_classes;
begin
  if u is null then return jsonb_build_object('err', 'auth'); end if;
  select * into r from public.voca_classes where id = p_class and owner = u;
  if not found then return jsonb_build_object('err', 'no_class'); end if;
  return jsonb_build_object(
    'class', jsonb_build_object('id', r.id, 'name', r.name, 'code', r.code, 'school', r.school),
    'members', coalesce((select jsonb_agg(jsonb_build_object('uid', m.uid, 'name', m.name, 'sno', m.sno, 'live', m.live,
        'ago', case when m.live_at is null then null else extract(epoch from now() - m.live_at)::int end,
        'today', case when (m.progress->>'today') ~ '^[0-9]{1,7}$' then (m.progress->>'today')::int else 0 end) order by m.sno, m.name)
      from public.voca_class_members m where m.class_id = r.id), '[]'::jsonb));
end $$;
grant execute on function public.voca_class_live(text, bigint) to anon, authenticated;

-- 내부용 함수는 앱(anon)에서 부를 수 없게 다시 한 번 막아요.
revoke all on function public.voca_uid(text) from public, anon, authenticated;
revoke all on function public.voca_ai_use(text, int) from public, anon, authenticated;
revoke all on function public.voca_class_cleanup() from public, anon, authenticated;

notify pgrst, 'reload schema';
