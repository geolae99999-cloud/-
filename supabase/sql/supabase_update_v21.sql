-- VocaPro 업데이트 v21: 친구 초대 보상
-- 내 초대 코드(링크)로 친구가 새로 가입하면, 친구와 나 모두 연속 학습 보호권을 1장씩 받아요.
-- 보호권은 앱이 학습 기록(stats.bonus)에 더해요. 서버는 누가 누구를 초대했는지와 아직 알려 주지 않은 보상 수만 기억해요.
-- 한 사람은 한 번만 초대받을 수 있고, 자기 코드는 못 써요. 초대한 사람 보상은 30일에 10명까지예요. 여러 번 실행해도 안전해요.

create table if not exists public.voca_ref_codes (
  uid text primary key,
  code text not null unique,
  at timestamptz not null default now()
);
create table if not exists public.voca_refs (
  invitee text primary key,
  inviter text not null,
  at timestamptz not null default now(),
  seen boolean not null default false,
  paid boolean not null default true
);
create index if not exists voca_refs_inviter on public.voca_refs (inviter, seen);
alter table public.voca_ref_codes enable row level security;
alter table public.voca_refs enable row level security;
revoke all on table public.voca_ref_codes from public, anon, authenticated;
revoke all on table public.voca_refs from public, anon, authenticated;

-- 내 초대 코드 (없으면 만들어요). 헷갈리는 글자(0 O 1 I L)는 빼요.
create or replace function public.voca_ref_code(p_token text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare u text := public.voca_uid(p_token); c text; i int := 0;
  abc constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
begin
  if u is null then return jsonb_build_object('err', 'auth'); end if;
  select code into c from public.voca_ref_codes where uid = u;
  if c is not null then return jsonb_build_object('code', c); end if;
  loop
    i := i + 1;
    c := '';
    for k in 1..7 loop c := c || substr(abc, 1 + floor(random() * length(abc))::int, 1); end loop;
    begin
      insert into public.voca_ref_codes (uid, code) values (u, c);
      return jsonb_build_object('code', c);
    exception when unique_violation then
      select code into c from public.voca_ref_codes where uid = u;
      if c is not null then return jsonb_build_object('code', c); end if;
      if i > 8 then return jsonb_build_object('err', 'busy'); end if;
    end;
  end loop;
end $$;

-- 초대 코드로 가입한 친구가 부르면 기록해요. 보상을 받을지(ok)와 이유를 알려 줘요.
create or replace function public.voca_ref_claim(p_token text, p_code text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare u text := public.voca_uid(p_token); inv text; n int; pay boolean;
begin
  if u is null then return jsonb_build_object('err', 'auth'); end if;
  select uid into inv from public.voca_ref_codes where code = upper(left(coalesce(p_code, ''), 12));
  if inv is null then return jsonb_build_object('err', 'bad_code'); end if;
  if inv = u then return jsonb_build_object('err', 'self'); end if;
  if exists (select 1 from public.voca_refs where invitee = u) then return jsonb_build_object('err', 'used'); end if;
  select count(*) into n from public.voca_refs where inviter = inv and paid and at > now() - interval '30 days';
  pay := n < 10;
  insert into public.voca_refs (invitee, inviter, paid, seen) values (u, inv, pay, not pay);
  return jsonb_build_object('ok', true);
exception when unique_violation then
  return jsonb_build_object('err', 'used');
end $$;

-- 초대한 사람: 내 코드, 지금까지 초대한 친구 수, 새로 받을 보상 수(받으면 다시 안 나와요)
create or replace function public.voca_ref_status(p_token text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare u text := public.voca_uid(p_token); c text; total int; fresh int;
begin
  if u is null then return jsonb_build_object('err', 'auth'); end if;
  select code into c from public.voca_ref_codes where uid = u;
  select count(*) into total from public.voca_refs where inviter = u;
  with x as (update public.voca_refs set seen = true where inviter = u and not seen and paid returning 1)
  select count(*) into fresh from x;
  return jsonb_build_object('code', c, 'total', total, 'fresh', fresh);
end $$;

-- 회원이 탈퇴(계정 삭제)하면 초대 코드와 초대 기록도 함께 지워요(계정 표에 id 열이 있을 때만 연결).
create or replace function public.voca_ref_cleanup()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  delete from public.voca_ref_codes where uid = old.id::text;
  delete from public.voca_refs where invitee = old.id::text or inviter = old.id::text;
  return old;
end $$;
do $$ begin
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'voca_accounts' and column_name = 'id') then
    drop trigger if exists voca_ref_cleanup on public.voca_accounts;
    create trigger voca_ref_cleanup after delete on public.voca_accounts for each row execute function public.voca_ref_cleanup();
  end if;
end $$;

revoke all on function public.voca_ref_code(text) from public;
revoke all on function public.voca_ref_claim(text, text) from public;
revoke all on function public.voca_ref_status(text) from public;
revoke all on function public.voca_ref_cleanup() from public, anon, authenticated;
grant execute on function public.voca_ref_code(text) to anon, authenticated;
grant execute on function public.voca_ref_claim(text, text) to anon, authenticated;
grant execute on function public.voca_ref_status(text) to anon, authenticated;

notify pgrst, 'reload schema';
