-- VocaPro 업데이트 v19: 이메일 인증 가입 · 비밀번호 찾기 · 이메일 등록
-- 인증코드는 서버 함수 mail(Brevo)이 만들어 보내고, 여기에는 해시만 저장해요(10분, 5번 틀리면 무효).
-- 일반 회원가입은 이제 voca_signup_email(아이디, 비밀번호, 이메일, 인증코드)로만 돼요.
--   (간편 로그인은 voca_oauth_enter 안에서 voca_signup 을 그대로 써요.)
-- 여러 번 실행해도 안전해요.

-- 1) 계정에 이메일 (한 이메일 = 한 계정)
alter table public.voca_accounts add column if not exists email text;
create unique index if not exists voca_accounts_email_key on public.voca_accounts (email) where email is not null;

-- 2) 인증코드 (이메일 + 목적마다 하나)
create table if not exists public.voca_email_codes (
  email text not null,
  purpose text not null check (purpose in ('signup', 'reset', 'link')),
  code_hash text not null,
  expires_at timestamptz not null,
  tries int not null default 0,
  sent_at timestamptz not null default now(),
  hour_start timestamptz not null default now(),
  hour_n int not null default 1,
  primary key (email, purpose)
);
alter table public.voca_email_codes enable row level security;
revoke all on table public.voca_email_codes from public, anon, authenticated;

-- IP 당 보내기 횟수 (1시간 단위)
create table if not exists public.voca_email_ip (
  ip text not null,
  hr timestamptz not null,
  n int not null default 0,
  primary key (ip, hr)
);
alter table public.voca_email_ip enable row level security;
revoke all on table public.voca_email_ip from public, anon, authenticated;

create or replace function public.voca_email_norm(p text)
returns text language sql immutable as $$
  select case when lower(trim(coalesce(p, ''))) ~ '^[a-z0-9._%+-]{1,64}@[a-z0-9.-]{1,185}\.[a-z]{2,24}$' then lower(trim(p)) else null end
$$;
revoke all on function public.voca_email_norm(text) from public, anon, authenticated;

-- 서버 함수 mail 전용: 코드 해시 저장 + 횟수 제한. send=false 면 메일을 보내지 않아요(없는 이메일로 비밀번호 찾기).
create or replace function public.voca_email_code_put(p_email text, p_purpose text, p_hash text, p_ip text)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare e text := public.voca_email_norm(p_email); r public.voca_email_codes%rowtype; ipn int; taken boolean;
begin
  if e is null or p_purpose not in ('signup', 'reset', 'link') or coalesce(p_hash, '') !~ '^[0-9a-f]{64}$' then
    return jsonb_build_object('err', 'bad_input');
  end if;
  delete from public.voca_email_codes where expires_at < now() - interval '1 day';
  delete from public.voca_email_ip where hr < now() - interval '1 day';
  if coalesce(p_ip, '') <> '' then
    insert into public.voca_email_ip (ip, hr, n) values (left(p_ip, 64), date_trunc('hour', now()), 1)
      on conflict (ip, hr) do update set n = public.voca_email_ip.n + 1
      returning n into ipn;
    if ipn > 20 then return jsonb_build_object('err', 'too_many'); end if;
  end if;
  select * into r from public.voca_email_codes where email = e and purpose = p_purpose;
  if found then
    if r.sent_at > now() - interval '60 seconds' then return jsonb_build_object('err', 'too_many'); end if;
    if r.hour_start > now() - interval '1 hour' and r.hour_n >= 6 then return jsonb_build_object('err', 'too_many'); end if;
  end if;
  taken := exists (select 1 from public.voca_accounts where email = e);
  if p_purpose in ('signup', 'link') and taken then return jsonb_build_object('err', 'email_taken'); end if;
  if p_purpose = 'reset' and not taken then return jsonb_build_object('ok', true, 'send', false); end if;
  insert into public.voca_email_codes (email, purpose, code_hash, expires_at, tries, sent_at, hour_start, hour_n)
    values (e, p_purpose, p_hash, now() + interval '10 minutes', 0, now(), now(), 1)
  on conflict (email, purpose) do update set
    code_hash = excluded.code_hash, expires_at = excluded.expires_at, tries = 0, sent_at = now(),
    hour_start = case when public.voca_email_codes.hour_start > now() - interval '1 hour' then public.voca_email_codes.hour_start else now() end,
    hour_n = case when public.voca_email_codes.hour_start > now() - interval '1 hour' then public.voca_email_codes.hour_n + 1 else 1 end;
  return jsonb_build_object('ok', true, 'send', true);
end $$;
revoke all on function public.voca_email_code_put(text, text, text, text) from public, anon, authenticated;
grant execute on function public.voca_email_code_put(text, text, text, text) to service_role;

-- 코드 확인 (맞으면 지우고 true). 내부 전용.
create or replace function public.voca_email_code_use(p_email text, p_purpose text, p_code text)
returns boolean language plpgsql security definer set search_path = public, extensions as $$
declare e text := public.voca_email_norm(p_email); r public.voca_email_codes%rowtype;
begin
  if e is null or coalesce(p_code, '') !~ '^[0-9]{6}$' then return false; end if;
  select * into r from public.voca_email_codes where email = e and purpose = p_purpose for update;
  if not found or r.expires_at < now() or r.tries >= 5 then return false; end if;
  if r.code_hash = encode(digest(p_purpose || ':' || e || ':' || p_code, 'sha256'), 'hex') then
    delete from public.voca_email_codes where email = e and purpose = p_purpose;
    return true;
  end if;
  update public.voca_email_codes set tries = tries + 1 where email = e and purpose = p_purpose;
  return false;
end $$;
revoke all on function public.voca_email_code_use(text, text, text) from public, anon, authenticated;

-- 이메일 인증 회원가입
create or replace function public.voca_signup_email(p_user text, p_pw text, p_email text, p_code text)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare u text := lower(trim(coalesce(p_user, ''))); e text := public.voca_email_norm(p_email); res jsonb;
begin
  if u !~ '^[a-z0-9_가-힣-]{2,20}$' or length(coalesce(p_pw, '')) < 6 or length(p_pw) > 72 or e is null then
    return jsonb_build_object('err', 'bad_input');
  end if;
  -- 아이디 · 이메일 중복은 코드를 쓰기 전에 먼저 알려 줘요(코드를 다시 받지 않아도 되게).
  if exists (select 1 from public.voca_accounts where username = u) then return jsonb_build_object('err', 'exists'); end if;
  if exists (select 1 from public.voca_accounts where email = e) then return jsonb_build_object('err', 'email_taken'); end if;
  if not public.voca_email_code_use(e, 'signup', p_code) then return jsonb_build_object('err', 'bad_code'); end if;
  res := public.voca_signup(u, p_pw);
  if res ? 'token' then
    update public.voca_accounts set email = e where id = (res->>'id')::bigint;
  end if;
  return res;
end $$;
revoke all on function public.voca_signup_email(text, text, text, text) from public;
grant execute on function public.voca_signup_email(text, text, text, text) to anon, authenticated;

-- 비밀번호 찾기: 코드가 맞으면 새 비밀번호로 바꾸고, 모든 기기에서 로그아웃시켜요. 아이디도 알려 줘요.
create or replace function public.voca_pw_reset(p_email text, p_code text, p_new text)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare e text := public.voca_email_norm(p_email); a public.voca_accounts%rowtype;
begin
  if e is null or length(coalesce(p_new, '')) < 6 or length(p_new) > 72 then return jsonb_build_object('err', 'bad_input'); end if;
  if not public.voca_email_code_use(e, 'reset', p_code) then return jsonb_build_object('err', 'bad_code'); end if;
  select * into a from public.voca_accounts where email = e;
  if not found then return jsonb_build_object('err', 'bad_code'); end if;
  update public.voca_accounts set pw = crypt(p_new, gen_salt('bf', 10)), fails = 0, locked_until = null where id = a.id;
  delete from public.voca_sessions where account_id = a.id;
  return jsonb_build_object('ok', true, 'username', a.username);
end $$;
revoke all on function public.voca_pw_reset(text, text, text) from public;
grant execute on function public.voca_pw_reset(text, text, text) to anon, authenticated;

-- 이미 있는 계정에 이메일 등록 · 변경
create or replace function public.voca_email_link(p_token text, p_email text, p_code text)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare a bigint := public.voca_acct(p_token); e text := public.voca_email_norm(p_email);
begin
  if a is null then return jsonb_build_object('err', 'auth'); end if;
  if e is null then return jsonb_build_object('err', 'bad_input'); end if;
  if exists (select 1 from public.voca_accounts where email = e and id <> a) then return jsonb_build_object('err', 'email_taken'); end if;
  if not public.voca_email_code_use(e, 'link', p_code) then return jsonb_build_object('err', 'bad_code'); end if;
  update public.voca_accounts set email = e where id = a;
  return jsonb_build_object('ok', true, 'email', e);
end $$;
revoke all on function public.voca_email_link(text, text, text) from public;
grant execute on function public.voca_email_link(text, text, text) to anon, authenticated;

-- 내 이메일 보기
create or replace function public.voca_email_mine(p_token text)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare a bigint := public.voca_acct(p_token); e text;
begin
  if a is null then return jsonb_build_object('err', 'auth'); end if;
  select email into e from public.voca_accounts where id = a;
  return jsonb_build_object('email', e);
end $$;
revoke all on function public.voca_email_mine(text) from public;
grant execute on function public.voca_email_mine(text) to anon, authenticated;

-- 3) 일반 가입은 이메일 인증을 거치게: 앱에서 voca_signup 을 직접 부를 수 없게 해요.
revoke execute on function public.voca_signup(text, text) from public, anon, authenticated;

notify pgrst, 'reload schema';
