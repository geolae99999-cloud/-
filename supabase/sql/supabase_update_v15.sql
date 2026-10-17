-- =========================================================
-- VocaPro 서버 업데이트 v15 · 간편 로그인(구글 · 카카오 · 네이버)
-- 여러 번 실행해도 안전합니다 (if not exists, create or replace).
-- =========================================================

create table if not exists public.voca_oauth (
  provider text not null check (provider in ('google', 'kakao', 'naver')),
  sub text not null check (char_length(sub) between 1 and 128),
  username text not null unique,
  secret text not null,
  created_at timestamptz not null default now(),
  primary key (provider, sub)
);

alter table public.voca_oauth enable row level security;

revoke all on table public.voca_oauth from public, anon, authenticated;

create or replace function public.voca_oauth_enter(p_provider text, p_sub text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_prov text := lower(trim(coalesce(p_provider, '')));
  v_sub text := trim(coalesce(p_sub, ''));
  v_row public.voca_oauth%rowtype;
  v_res json;
  v_user text;
  v_secret text;
  v_try int := 0;
begin
  if v_prov not in ('google', 'kakao', 'naver') or char_length(v_sub) < 1 or char_length(v_sub) > 128 then
    return json_build_object('err', 'bad_input');
  end if;

  select * into v_row
    from public.voca_oauth
   where provider = v_prov and sub = v_sub;

  if found then
    begin
      v_res := public.voca_login(v_row.username, v_row.secret);
      if v_res is not null and (v_res->>'token') is not null then
        return json_build_object(
          'token', v_res->>'token',
          'id', v_res->'id',
          'username', v_res->>'username',
          'new', false
        );
      end if;
    exception when others then
      v_res := null;
    end;
    -- 기존 계정이 지워졌거나 로그인에 실패하면 연결 기록을 지우고 새로 만듭니다.
    delete from public.voca_oauth where provider = v_prov and sub = v_sub;
  end if;

  loop
    v_try := v_try + 1;
    v_user := substr(v_prov, 1, 1) || '_' || substr(md5(random()::text || clock_timestamp()::text || v_sub || v_try::text), 1, 14);
    v_secret := md5(random()::text || clock_timestamp()::text || v_user) || md5(clock_timestamp()::text || random()::text || v_sub);

    v_res := public.voca_signup(v_user, v_secret);
    if v_res is not null and (v_res->>'token') is not null then
      insert into public.voca_oauth (provider, sub, username, secret)
      values (v_prov, v_sub, v_user, v_secret);

      return json_build_object(
        'token', v_res->>'token',
        'id', v_res->'id',
        'username', v_res->>'username',
        'new', true
      );
    end if;

    exit when v_try >= 5;
  end loop;

  return coalesce(v_res, json_build_object('err', 'signup_failed'));
end;
$$;

revoke all on function public.voca_oauth_enter(text, text) from public, anon, authenticated;
grant execute on function public.voca_oauth_enter(text, text) to service_role;

notify pgrst, 'reload schema';
