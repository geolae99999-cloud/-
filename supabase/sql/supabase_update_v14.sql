-- VocaPro 보안 보강 v14 (v13 다음에 한 번 실행). 기존 데이터는 그대로예요.
-- 1) 반 코드: 예측하기 어려운 난수(gen_random_uuid)로 만들어요 (예전: random())
-- 2) 반 참여: 틀린 코드를 계정마다 하루 20번에 더해, 같은 접속 주소(IP)에서 하루 60번까지만 (계정을 여러 개 만들어 코드를 맞히는 것을 막아요)

create table if not exists public.voca_join_fail_ip (
  ip text not null,
  day date not null,
  n int not null default 0,
  primary key (ip, day)
);
alter table public.voca_join_fail_ip enable row level security;
revoke all on table public.voca_join_fail_ip from public, anon, authenticated;

create or replace function public.voca_class_code()
returns text language plpgsql volatile set search_path = public as $$
declare b bytea := decode(replace(gen_random_uuid()::text, '-', ''), 'hex'); c text := '';
begin
  for k in 0..5 loop c := c || substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 1 + (get_byte(b, k) % 32), 1); end loop;
  return c;
end $$;
revoke all on function public.voca_class_code() from public, anon, authenticated;

create or replace function public.voca_class_create(p_token text, p_name text, p_teacher text, p_school text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare u text := public.voca_uid(p_token); c text; i int := 0; r public.voca_classes;
begin
  if u is null then return jsonb_build_object('err', 'auth'); end if;
  p_name := left(btrim(coalesce(p_name, '')), 40);
  if p_name = '' then return jsonb_build_object('err', 'bad_input'); end if;
  if (select count(*) from public.voca_classes where owner = u) >= 30 then return jsonb_build_object('err', 'too_many'); end if;
  loop
    c := public.voca_class_code();
    exit when not exists (select 1 from public.voca_classes where code = c);
    i := i + 1; if i > 20 then return jsonb_build_object('err', 'server'); end if;
  end loop;
  insert into public.voca_classes(code, owner, name, teacher, school)
  values (c, u, p_name, left(coalesce(p_teacher, ''), 30), left(coalesce(p_school, ''), 40)) returning * into r;
  return jsonb_build_object('id', r.id, 'code', r.code, 'name', r.name);
end $$;
grant execute on function public.voca_class_create(text, text, text, text) to anon, authenticated;

create or replace function public.voca_class_join(p_token text, p_code text, p_name text, p_sno text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare u text := public.voca_uid(p_token); r public.voca_classes; v_ip text := '';
begin
  if u is null then return jsonb_build_object('err', 'auth'); end if;
  begin v_ip := public.voca_req_ip(); exception when others then v_ip := ''; end;
  perform pg_advisory_xact_lock(hashtext('voca_join:' || u));
  if coalesce((select n from public.voca_join_fail where uid = u and day = current_date), 0) >= 20 then
    return jsonb_build_object('err', 'too_many_tries');
  end if;
  if v_ip <> '' and coalesce((select n from public.voca_join_fail_ip where ip = v_ip and day = current_date), 0) >= 60 then
    return jsonb_build_object('err', 'too_many_tries');
  end if;
  select * into r from public.voca_classes where code = upper(btrim(coalesce(p_code, '')));
  if not found then
    delete from public.voca_join_fail where day < current_date - 7;
    delete from public.voca_join_fail_ip where day < current_date - 7;
    insert into public.voca_join_fail(uid, day, n) values (u, current_date, 1)
    on conflict (uid, day) do update set n = public.voca_join_fail.n + 1;
    if v_ip <> '' then
      insert into public.voca_join_fail_ip(ip, day, n) values (v_ip, current_date, 1)
      on conflict (ip, day) do update set n = public.voca_join_fail_ip.n + 1;
    end if;
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

notify pgrst, 'reload schema';
select 'v14 OK' as result;
