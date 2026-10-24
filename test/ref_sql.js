// 친구 초대 SQL(supabase_update_v21.sql)을 로컬 PostgreSQL에서 실제로 돌려 봐요.
// 필요: psql -U postgres 접속. 빈 시험 DB(voca_ref_test)를 만들고, 운영 기본 함수(voca_me, voca_uid, voca_accounts)는 흉내 내요.
const { execFileSync } = require('child_process'), path = require('path');
const DB = 'voca_ref_test';
const run = (sql, db) => execFileSync('psql', ['-U', 'postgres', '-d', db || DB, '-At', '-v', 'ON_ERROR_STOP=1'], { input: sql, encoding: 'utf8' }).trim();
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
run(`drop database if exists ${DB}`, 'postgres'); run(`create database ${DB}`, 'postgres');
run(`do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role; end if;
end $$;
grant usage on schema public to anon, authenticated, service_role;
create table public.voca_accounts (id bigint primary key, username text);
insert into public.voca_accounts values (1, 'a'), (2, 'b'), (3, 'c'), (4, 'd');
-- 토큰 't<번호>' = 그 번호의 회원
create function public.voca_me(p_token text) returns jsonb language sql security definer as $$
  select case when p_token ~ '^t[0-9]+$' and exists (select 1 from public.voca_accounts where id = substr(p_token, 2)::bigint)
    then jsonb_build_object('id', substr(p_token, 2)) else jsonb_build_object('err', 'auth') end $$;
create function public.voca_uid(p_token text) returns text language plpgsql security definer set search_path = public as $$
declare j jsonb; begin j := public.voca_me(p_token); if j ? 'err' then return null; end if; return j->>'id'; end $$;`);
run(require('fs').readFileSync(path.join(__dirname, '..', 'supabase', 'sql', 'supabase_update_v21.sql'), 'utf8'));
run(require('fs').readFileSync(path.join(__dirname, '..', 'supabase', 'sql', 'supabase_update_v21.sql'), 'utf8')); // 두 번 실행해도 안전
const call = (fn, args) => JSON.parse(run(`set role anon; select public.${fn}(${args.map(a => `$q$${a}$q$`).join(', ')})`).split('\n').pop());
const c1 = call('voca_ref_code', ['t1']).code, c1b = call('voca_ref_code', ['t1']).code;
ok(/^[A-HJKMNP-Z2-9]{7}$/.test(c1) && c1 === c1b, '내 초대 코드는 7자리, 다시 받아도 같아요 ' + c1);
ok(call('voca_ref_code', ['bad']).err === 'auth', '로그인 안 하면 코드 없음');
ok(call('voca_ref_claim', ['t1', c1]).err === 'self', '내 코드는 못 써요');
ok(call('voca_ref_claim', ['t2', 'NOPE123']).err === 'bad_code', '없는 코드');
ok(call('voca_ref_claim', ['t2', c1.toLowerCase()]).ok === true, '친구가 내 코드로 가입(소문자도 됨)');
ok(call('voca_ref_claim', ['t2', c1]).err === 'used', '한 사람은 한 번만');
const s1 = call('voca_ref_status', ['t1']);
ok(s1.code === c1 && s1.total === 1 && s1.fresh === 1, '초대한 사람: 1명, 새 보상 1 ' + JSON.stringify(s1));
ok(call('voca_ref_status', ['t1']).fresh === 0, '보상은 한 번만 알려 줘요');
// 30일에 10명까지만 보상
run(`insert into public.voca_refs (invitee, inviter, paid, seen) select 'x' || g, '1', true, true from generate_series(1, 9) g`);
ok(call('voca_ref_claim', ['t3', c1]).ok === true && call('voca_ref_status', ['t1']).fresh === 0, '10명을 넘으면 기록만 하고 보상은 없어요');
// 표는 anon이 직접 못 읽어요
let denied = false; try { run(`set role anon; select * from public.voca_refs`); } catch (e) { denied = /permission denied/.test(String(e.stderr || e.message)); }
ok(denied, '초대 기록 표는 직접 못 읽어요');
// 탈퇴하면 코드와 기록이 지워져요
run(`delete from public.voca_accounts where id = 1`);
ok(run(`select count(*) from public.voca_ref_codes where uid = '1'`) === '0' && run(`select count(*) from public.voca_refs where inviter = '1'`) === '0', '탈퇴하면 초대 코드와 기록 삭제');
run(`drop database if exists ${DB}`, 'postgres');
console.log(fails ? 'SOME FAILED' : 'ALL OK'); process.exit(fails ? 1 : 0);
