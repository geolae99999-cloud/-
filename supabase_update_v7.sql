-- VocaPro v7: 실시간 수업 현황 (학생이 지금 들어와 있는지, 무엇을 공부하는지 선생님 화면에 표시)
-- v6를 먼저 실행한 뒤, SQL Editor에 이 파일 전체를 붙여 넣고 Run을 한 번 누르세요. 다시 실행해도 안전해요.

alter table public.voca_class_members add column if not exists live jsonb not null default '{}'::jsonb;
alter table public.voca_class_members add column if not exists live_at timestamptz;

-- 학생 앱이 열려 있는 동안 15초마다 지금 상태를 올려요. 참여한 모든 반에 같은 값이 들어가요.
create or replace function public.voca_class_ping(p_token text, p_live jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare u text := public.voca_uid(p_token); k int;
begin
  if u is null then return jsonb_build_object('err', 'auth'); end if;
  if p_live is null or jsonb_typeof(p_live) <> 'object' or length(p_live::text) > 2000 then return jsonb_build_object('err', 'bad_input'); end if;
  update public.voca_class_members set live = p_live, live_at = now() where uid = u;
  get diagnostics k = row_count;
  return jsonb_build_object('n', k);
end $$;

-- 선생님 실시간 화면: 학생별 현재 상태와 마지막 신호 이후 지난 초
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
        'today', coalesce((m.progress->>'today')::int, 0)) order by m.sno, m.name)
      from public.voca_class_members m where m.class_id = r.id), '[]'::jsonb));
end $$;

grant execute on function public.voca_class_ping(text, jsonb), public.voca_class_live(text, bigint) to anon, authenticated;

notify pgrst, 'reload schema';
