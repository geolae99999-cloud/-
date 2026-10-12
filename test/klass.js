// 우리 반: 선생님 반 만들기 -> 학생 코드 참여 -> 과제 -> 학생 풀이·제출 -> 선생님 현황·결과
// 반 관련 RPC는 로컬 PostgreSQL(supabase_update_v6.sql 적용)로 실제 실행해요. PGHOST/PGPORT 필요.
// SQL 미적용(404) 상태도 확인: NOSQL=1 node test/klass.js
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const http = require('http'), fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const root = path.join(__dirname, 'site2'), shots = path.join(__dirname, 'shots', 'klass');
fs.mkdirSync(shots, { recursive: true });
const srv = http.createServer((q, r) => { let f = path.join(root, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html'; fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': f.endsWith('.js') ? 'text/javascript' : f.endsWith('.css') ? 'text/css' : f.endsWith('.json') ? 'application/json' : 'text/html; charset=utf-8' }); r.end(d); }); }).listen(8779);
const NOSQL = !!process.env.NOSQL;
const psql = sql => execFileSync('psql', ['-U', 'postgres', '-At', '-v', 'ON_ERROR_STOP=1', '-c', sql], { encoding: 'utf8' }).trim();
const lit = v => v === null || v === undefined ? 'NULL' : typeof v === 'number' ? String(v) : typeof v === 'object' ? `$q$${JSON.stringify(v)}$q$::jsonb` : `$q$${String(v)}$q$`;
const users = { kimteacher: 1, leestu: 2, parkstu: 3, choistu: 4 }, store = {};
async function mock(p) {
  await p.route('https://psmmrwhmpezyeehjivav.supabase.co/**', async r => {
    const u = r.request().url(), body = JSON.parse(r.request().postData() || '{}'), fn = u.split('/').pop();
    const j = (x, st) => r.fulfill({ status: st || 200, contentType: 'application/json', body: JSON.stringify(x) });
    if (fn === 'voca_signup' || fn === 'voca_login') return j({ token: 't' + users[body.p_user], id: users[body.p_user], username: body.p_user });
    const id = body.p_token ? +String(body.p_token).slice(1) : 0;
    if (fn === 'voca_me') return j({ id, username: 'x' });
    if (fn === 'voca_load') return j(store[id] ? { data: store[id], updated: 1 } : null);
    if (fn === 'voca_save') { store[id] = body.p_data; return j({ ok: true }); }
    if (fn === 'voca_logout') return j({ ok: true });
    if (/^voca_(class|assign)_/.test(fn)) {
      if (NOSQL) return j({ code: 'PGRST202', message: 'Could not find the function public.' + fn }, 404);
      const args = Object.keys(body).map(k => `${k} => ${lit(body[k])}`).join(', ');
      try { return j(JSON.parse(psql(`set role anon; select public.${fn}(${args})`).split('\n').pop())); }
      catch (e) { return j({ message: String(e.stderr || e.message).slice(0, 200) }, 400); }
    }
    return j({});
  });
}
async function signup(p, id, role, name, sno) {
  await p.goto('http://localhost:8779/'); await p.waitForSelector('.auth-box #auId');
  await p.click('[data-m="signup"]'); await p.click('[data-act="auth-age"][data-k="0"]'); await p.fill('#auId', id); await p.fill('#auPw', 'pass1234'); await p.fill('#auPw2', 'pass1234');
  await p.selectOption('#auGrade', role); await p.fill('#auName', name); await p.fill('#auSchool', '한빛중학교'); if (sno) await p.fill('#auSno', sno);
  await p.check('#auTerms'); await p.fill('#capIn', await p.evaluate('capText')); await p.click('#auGo');
  await p.waitForSelector('#obOv'); await p.click('[data-ob="skip"]'); await p.waitForTimeout(500);
  await p.click('[data-lt="close"]').catch(() => {}); await p.waitForTimeout(800);
  await p.evaluate(() => { const o = document.getElementById('recOv'); if (o) o.remove(); });
}
(async () => {
  if (!NOSQL) psql('truncate voca_submissions, voca_assignments, voca_class_members, voca_classes restart identity cascade');
  const b = await chromium.launch(), errs = [], res = {};
  const page = async (vp, tag) => { const ctx = await b.newContext({ viewport: vp }), p = await ctx.newPage(); p.on('pageerror', e => errs.push(tag + ' ' + e.message)); await p.route(/fonts|jsdelivr/, r => r.abort()); await p.addInitScript(() => { try { window.speechSynthesis.speak = () => {}; } catch (e) {} }); await mock(p); return p; };
  const T = await page({ width: 1280, height: 860 }, 'T'), shotT = n => T.screenshot({ path: path.join(shots, `T-${n}.png`) });
  await signup(T, 'kimteacher', 'teacher', '김선생');
  res.teachEntry = await T.evaluate(() => !!document.querySelector('.cl-entry [data-act="class-open"]'));
  await T.evaluate(() => recSheet('mid')); await T.waitForTimeout(300); await T.click('[data-act="rec-left-add"]').catch(() => {}); await T.waitForTimeout(600); await T.keyboard.press('Escape');
  await T.click('[data-act="class-open"]'); await T.waitForTimeout(500); await shotT('01-list');
  if (NOSQL) {
    res.missing = await T.textContent('#sheetBody');
    await T.keyboard.press('Escape');
    await T.evaluate(() => { syncStorage(); return cloudPush(); }); await T.waitForTimeout(300);
    res.stillWorks = await T.evaluate(() => categories.length + ' books, saved=' + !!document.querySelector('.hello-name'));
    console.log(JSON.stringify(res, null, 1)); console.log('ERRORS:', errs.length ? errs.join('\n') : 'none'); await b.close(); srv.close(); return;
  }
  await T.fill('#clName', '2학년 3반'); await T.click('[data-act="cl-create"]'); await T.waitForSelector('.cl-code b');
  const code = await T.textContent('.cl-code b'); res.code = code; await shotT('02-empty-class');
  // 과제 내기
  await T.click('[data-act="cl-tab"][data-t="asg"]'); await T.click('[data-act="cl-anew"]'); await T.waitForSelector('#caBook');
  await T.selectOption('#caBook', { index: 0 }); await T.fill('#caTitle', 'Day 1 단어 시험'); await T.click('#caNum [data-v="10"]'); await shotT('03-new-asg');
  await T.click('[data-act="cl-acreate"]'); await T.waitForSelector('[data-act="cl-ares"]');
  await T.click('[data-act="cl-anew"]'); await T.waitForSelector('#caBook'); await T.fill('#caTitle', '뜻 익히기'); await T.click('#caKind [data-v="study"]'); await T.click('[data-act="cl-acreate"]'); await T.waitForTimeout(800);
  res.teacherAsg = await T.$$eval('[data-act="cl-ares"] small', a => a.map(x => x.textContent));
  // 학생
  const P = await page({ width: 390, height: 844 }, 'S'), shotS = n => P.screenshot({ path: path.join(shots, `S-${n}.png`) });
  await signup(P, 'leestu', 'm2', '이지우', '20315');
  res.stuEntry = await P.textContent('[data-act="class-open"] small');
  await P.click('[data-act="class-open"]'); await P.waitForSelector('#clCode'); await shotS('01-join');
  await P.fill('#clCode', code.toLowerCase()); await P.click('[data-act="cl-join"]'); await P.waitForTimeout(400);
  res.noAgree = await P.evaluate(() => (document.querySelector('.toast') || {}).textContent || '');
  await P.check('#clAgree'); await P.click('[data-act="cl-join"]'); await P.waitForSelector('.cl-asg'); await shotS('02-joined');
  res.stuAsg = await P.$$eval('.cl-asg', a => a.map(x => x.textContent.replace(/\s+/g, ' ').trim()));
  await P.keyboard.press('Escape'); await P.evaluate(() => renderHome()); await P.waitForTimeout(200);
  res.stuEntry2 = await P.textContent('[data-act="class-open"] small');
  // 시험 과제 풀기: 정답만 고르고 철자는 그대로 입력
  await P.click('[data-act="class-open"]'); await P.waitForSelector('.cl-asg');
  await P.click('.cl-asg >> text=Day 1 단어 시험'); await P.waitForSelector('#studyScreen.open'); await P.waitForTimeout(300);
  for (let i = 0; i < 40; i++) {
    if (await P.$('.exam-result')) break;
    const w = await P.evaluate(() => { const it = S.queue[S.idx]; return it && { t: it.t, word: it.w.word, mean: it.w.meaning }; }); if (!w) break;
    if (w.t === 'spell') { await P.fill('#typeInput', i === 0 ? 'zzz' : w.word); await P.click('[data-act="type-submit"]'); }
    else { const ok = await P.evaluate(t => { const b = [...document.querySelectorAll('.opt')].find(o => o.textContent.includes(t.t === 'choice' ? t.mean : t.word)); return b ? (b.click(), 1) : 0; }, w); if (!ok) await P.click('.opt >> nth=0'); }
    const before = await P.evaluate(() => S.idx); await P.waitForFunction(b => S.idx !== b || S.finished, before, { timeout: 5000 }).catch(() => {}); await P.waitForTimeout(150);
  }
  await P.waitForSelector('.cl-sub.ok', { timeout: 5000 }).catch(() => {}); await shotS('03-exam-result');
  res.submit = await P.textContent('.cl-sub').catch(() => 'none');
  console.error("DBG", res.submit, await P.evaluate(() => JSON.stringify({ idx: S.idx, total: S.total, fin: S.finished, mode: S.mode }))); await P.click('[data-act="exit-session"]'); await P.waitForTimeout(300);
  // 다시 열면 점수 표시
  await P.click('[data-act="class-open"]'); await P.waitForSelector('.cl-asg'); res.stuAsgAfter = await P.$$eval('.cl-asg', a => a.map(x => x.textContent.replace(/\s+/g, ' ').trim())); await shotS('04-after');
  // 두 번째 학생 참여 후 나가기
  const Q = await page({ width: 390, height: 844 }, 'S2'); await signup(Q, 'parkstu', 'm2', '박민', '20301');
  await Q.click('[data-act="class-open"]'); await Q.waitForSelector('#clCode'); await Q.fill('#clCode', code); await Q.check('#clAgree'); await Q.click('[data-act="cl-join"]'); await Q.waitForSelector('.cl-cls');
  // 실시간 보기: 선생님이 띄워 두고 학생이 들어와 공부를 시작
  await T.evaluate(() => clDetail(CLV.id)); await T.waitForSelector('[data-act="cl-live"]'); await T.click('[data-act="cl-live"]'); await T.waitForSelector('.lv-top');
  res.liveFirst = await T.$$eval('.lv-card', a => a.map(x => x.className.replace('lv-card ', '') + ' | ' + x.textContent.replace(/\s+/g, ' ').trim()));
  const R = await page({ width: 390, height: 844 }, 'S3'); await signup(R, 'choistu', 'm2', '최하늘', '20330');
  await R.click('[data-act="class-open"]'); await R.waitForSelector('#clCode'); await R.fill('#clCode', code); await R.check('#clAgree'); await R.click('[data-act="cl-join"]'); await R.waitForSelector('.cl-cls');
  await R.click('.cl-asg >> text=뜻 익히기'); await R.waitForSelector('#studyScreen.open .opt', { timeout: 20000 }); await R.waitForTimeout(300);
  await R.click('.opt >> nth=0'); await R.waitForTimeout(1800); await R.evaluate(() => clPing(true)); await R.waitForTimeout(300);
  await T.waitForTimeout(5600); await T.screenshot({ path: path.join(shots, 'T-06-live.png') });
  res.liveFeed = await T.$$eval('.lv-feed span', a => a.map(x => x.textContent));
  res.liveCards = await T.$$eval('.lv-card', a => a.map(x => x.className.replace('lv-card ', '') + ' | ' + x.textContent.replace(/\s+/g, ' ').trim()));
  res.liveNums = await T.textContent('.lv-nums');
  await T.keyboard.press('Escape'); await T.waitForTimeout(300); res.liveClosed = await T.evaluate(() => !document.getElementById('lvOv') && !LV);
  // 선생님 현황
  await T.click('[data-act="cl-back"]').catch(() => {}); await T.evaluate(() => clDetail(CLV.id)); await T.waitForSelector('.cl-tr');
  res.members = await T.$$eval('.cl-tr:not(.cl-th)', a => a.map(x => x.textContent.replace(/\s+/g, ' ').trim()));
  res.classWeak = await T.$$eval('.cl-weak span', a => a.map(x => x.textContent)).catch(() => []);
  await T.click('.cl-tr[data-uid="2"]'); await T.waitForSelector('.cl-stu'); await shotT('04-students');
  res.stuDetail = (await T.textContent('.cl-stu')).replace(/\s+/g, ' ').slice(0, 200);
  await T.click('[data-act="cl-tab"][data-t="asg"]'); await T.click('[data-act="cl-ares"] >> text=Day 1'); await T.waitForSelector('.cl-kv'); await shotT('05-results');
  res.results = (await T.textContent('#sheetBody')).replace(/\s+/g, ' ').slice(0, 300);
  // 학생 나가기 -> 선생님 목록에서 사라짐
  await Q.click('[data-act="cl-leave"]'); await Q.click('.dlg [data-d="1"]').catch(() => {}); await Q.waitForTimeout(600);
  await T.evaluate(() => clDetail(CLV.id)); await T.waitForSelector('.cl-tr'); res.afterLeave = await T.$$eval('.cl-tr:not(.cl-th)', a => a.length);
  // 처리방침에 반 내용
  res.privacy = await T.evaluate(() => legalDocs().privacy[2].find(x => x[0].startsWith('제4조'))[1].includes('반을 만든 선생님'));
  // 반 삭제
  await T.click('[data-act="cl-delete"]'); await T.click('.dlg [data-d="1"]').catch(() => {}); await T.waitForTimeout(800);
  res.afterDelete = psql('select count(*) from voca_classes');
  console.log(JSON.stringify(res, null, 1)); console.log('ERRORS:', errs.length ? errs.join('\n') : 'none'); await b.close(); srv.close();
})().catch(e => { console.error(e); process.exit(1); });
