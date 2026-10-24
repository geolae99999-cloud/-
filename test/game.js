// 단어 맞추기 대결: 영어·중국어 60초 게임 -> 결과 -> 랭킹(이번 주·역대, 전체·우리 반), 랭킹 이름, 로컬 계정 내 기록
const PG = require('./pgrst');
// 게임 RPC(voca_game_*)와 반 RPC는 로컬 PostgreSQL(supabase_update_v6~v9.sql 적용)로 실제 실행해요.
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const http = require('http'), fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const shots = path.join(__dirname, 'shots', 'game');
fs.mkdirSync(shots, { recursive: true });
const serve = (root, port) => http.createServer((q, r) => { let f = path.join(root, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html'; fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': f.endsWith('.js') ? 'text/javascript' : f.endsWith('.css') ? 'text/css' : f.endsWith('.json') ? 'application/json' : 'text/html; charset=utf-8' }); r.end(d); }); }).listen(port);
const srv = serve(path.join(__dirname, 'site2'), 8791), srvL = serve(path.join(__dirname, 'site'), 8792);
const psql = sql => execFileSync('psql', ['-U', 'postgres', '-At', '-v', 'ON_ERROR_STOP=1', '-c', sql], { encoding: 'utf8' }).trim();
const lit = v => v === null || v === undefined ? 'NULL' : typeof v === 'number' ? String(v) : typeof v === 'object' ? `$q$${JSON.stringify(v)}$q$::jsonb` : `$q$${String(v)}$q$`;
const users = { kimteacher: 1, leestu: 2, parkstu: 3 }, store = {};
async function mock(p) {
  await p.route('https://psmmrwhmpezyeehjivav.supabase.co/**', async r => {
    const u = r.request().url(), body = JSON.parse(r.request().postData() || '{}'), fn = u.split('/').pop();
    const j = (x, st) => r.fulfill({ status: st || 200, contentType: 'application/json', body: JSON.stringify(x) });
    if (fn === 'voca_signup' || fn === 'voca_login') return j({ token: 't' + users[body.p_user], id: users[body.p_user], username: body.p_user });
    const id = body.p_token ? +String(body.p_token).slice(1) : 0;
    if (fn === 'voca_me') return j({ id, username: 'x' });
    if (fn === 'voca_load') return j(store[id] ? { data: store[id], updated: 1 } : null);
    if (fn === 'voca_save') { store[id] = body.p_data; return j({ ok: true }); }
    if (/^voca_(class|assign|game)_/.test(fn)) {
      if (PG.on) { const x = await PG.call(fn, body); return r.fulfill({ status: x.status, contentType: 'application/json', body: x.body }); }
      const args = Object.keys(body).map(k => `${k} => ${lit(body[k])}`).join(', ');
      try { return j(JSON.parse(psql(`set role anon; select public.${fn}(${args})`).split('\n').pop())); }
      catch (e) { const m = String(e.stderr || e.message); return j({ message: m.slice(0, 200) }, /function .* does not exist/.test(m) ? 404 : 400); }
    }
    return j({});
  });
}
async function signup(p, port, id, role, name, sno) {
  await p.goto(`http://localhost:${port}/`); await p.waitForSelector('.auth-box #auId');
  await p.click('[data-m="signup"]').catch(() => {}); await p.click('[data-act="auth-age"][data-k="0"]', { timeout: 1500 }).catch(() => {}); await p.fill('#auId', id); await p.fill('#auPw', 'pass1234'); await p.fill('#auPw2', 'pass1234');
  await p.click('#auNext'); await p.waitForSelector('#auGrade', { state: 'attached' }); await p.evaluate(g => { document.getElementById('auGrade').value = g; }, role); await p.fill('#auName', name); await p.fill('#auSchool', '한빛중학교'); if (sno) await p.fill('#auSno', sno);
  await p.check('#auTerms'); await p.fill('#capIn', await p.evaluate('capText')); await p.click('#auGo');
  await p.waitForSelector('#obOv'); await p.click('[data-ob="skip"]'); await p.waitForTimeout(500);
  await p.click('[data-lt="close"]').catch(() => {}); await p.waitForTimeout(800);
  await p.evaluate(() => { const o = document.getElementById('recOv'); if (o) o.remove(); });
}
// 게임 한 판: ok번 맞히고 bad번 틀린 뒤 시간을 끝내요.
async function play(p, ok, bad) {
  await p.click('[data-wq="go"]'); await p.waitForSelector('.wq-opt', { timeout: 6000 });
  for (let i = 0; i < ok + bad; i++) {
    await p.waitForFunction(() => WQ && WQ.view === 'play' && !WQ.lock && document.querySelector('.wq-opt') && Date.now() - WQ.qAt > 160);
    const k = await p.evaluate(wrong => { const q = WQ.q, c = q.opts.indexOf(q.cur); return wrong ? (c + 1) % 4 : c; }, i >= ok);
    await p.keyboard.press(String(k + 1));
  }
  await p.waitForTimeout(800);
  await p.evaluate(() => { WQ.end = Date.now(); });
  await p.waitForSelector('.wq-end h2');
}
(async () => {
  psql('truncate voca_game_scores, voca_game_runs, voca_submissions, voca_assignments, voca_class_members, voca_classes restart identity cascade');
  const b = await chromium.launch(), errs = [], res = {};
  const page = async (vp, tag, cloud) => { const ctx = await b.newContext({ viewport: vp }), p = await ctx.newPage(); p.on('pageerror', e => errs.push(tag + ' ' + e.message)); await require('./undef')(p, errs, tag); await p.route(/fonts|jsdelivr/, r => r.abort()); await p.addInitScript(() => { try { window.speechSynthesis.speak = () => {}; } catch (e) {} }); if (cloud) await mock(p); return p; };

  // 선생님이 반을 만들고 학생 한 명(박민)이 들어와 있어요. 다른 학생 기록도 미리 넣어요.
  psql(`set role anon; select voca_class_create('t1', '2학년 3반', '김선생', '')`);
  const code = psql('select code from voca_classes limit 1');
  psql(`set role anon; select voca_class_join('t3', '${code}', '박민', '20301')`);
  psql(`insert into voca_game_scores(uid, lang, lvl, period, score, ok, n, combo, name) select '3', 'en', 'l2', p, 200, 10, 12, 6, '민이' from (values ('all'), (voca_game_week())) v(p)`);
  for (let i = 0; i < 6; i++) psql(`insert into voca_game_scores(uid, lang, lvl, period, score, ok, n, combo, name) select 'x${i}', 'en', 'l2', p, ${150 + i * 37}, ${8 + i}, ${10 + i}, ${3 + i}, '친구${i}' from (values ('all'), (voca_game_week())) v(p)`);

  const P = await page({ width: 390, height: 844 }, 'S', true), shot = async n => { await P.waitForTimeout(450); await P.screenshot({ path: path.join(shots, n + '.png') }); };
  await signup(P, 8791, 'leestu', 'm2', '이지우', '20315');
  res.entry = await P.textContent('[data-act="wordquiz"]');
  await P.click('[data-act="wordquiz"]'); await P.waitForSelector('.wq-lvs'); await shot('01-lobby');
  res.lobbyName = await P.textContent('.wq-note b');
  res.levels = await P.$$eval('.wq-lv b', a => a.map(x => x.textContent).join(','));
  await P.click('[data-wq="lv"][data-k="l2"]');
  await P.click('[data-wq="go"]'); await P.waitForSelector('.wq-cd'); await shot('02-countdown');
  await P.waitForSelector('.wq-opt', { timeout: 6000 }); await shot('03-play');
  res.firstQ = await P.evaluate(() => ({ a: WQ.q.a, opts: WQ.q.opts.length, uniq: new Set(WQ.q.opts.map(o => WQ.q.a === 'm' ? o.m : o.w)).size, left: +document.getElementById('wqLeft').textContent }));
  for (let i = 0; i < 6; i++) { await P.waitForFunction(() => WQ && !WQ.lock && Date.now() - WQ.qAt > 160); await P.keyboard.press(String(await P.evaluate(() => WQ.q.opts.indexOf(WQ.q.cur)) + 1)); }
  await P.waitForFunction(() => WQ && !WQ.lock && Date.now() - WQ.qAt > 160); await shot('04-combo');
  res.afterSix = await P.evaluate(() => ({ score: WQ.score, combo: WQ.combo, badge: document.getElementById('wqCombo').textContent }));
  const before = await P.evaluate(() => WQ.end);
  await P.keyboard.press(String(await P.evaluate(() => (WQ.q.opts.indexOf(WQ.q.cur) + 1) % 4) + 1)); await P.waitForTimeout(150); await shot('05-wrong');
  res.wrong = await P.evaluate(b4 => ({ combo: WQ.combo, penaltyMs: b4 - WQ.end, wrongWords: WQ.wrong.length }), before);
  await P.waitForFunction(() => WQ && !WQ.lock && Date.now() - WQ.qAt > 160);
  for (let i = 0; i < 4; i++) { await P.waitForFunction(() => WQ && !WQ.lock && Date.now() - WQ.qAt > 160); await P.keyboard.press(String(await P.evaluate(() => WQ.q.opts.indexOf(WQ.q.cur)) + 1)); }
  await P.waitForTimeout(400); await P.evaluate(() => { WQ.end = Date.now(); });
  await P.waitForSelector('.wq-rkres', { timeout: 5000 }); await shot('06-result');
  res.result = await P.evaluate(() => ({ score: WQ.score, ok: WQ.ok, n: WQ.n, sent: WQ.sent, h2: document.querySelector('.wq-end h2').textContent, rk: document.querySelector('.wq-rkres').textContent.replace(/\s+/g, ' ') }));
  res.db = psql(`select name || ':' || score from voca_game_scores where uid = '2' order by period`);
  // 랭킹
  await P.click('[data-wq="rank"]'); await P.waitForSelector('.rk-pod'); await P.waitForTimeout(900); await shot('07-rank-week');
  res.rankRows = await P.$$eval('.rk-p b, .rk-row b', a => a.length);
  res.rankMe = await P.textContent('.wq-me');
  res.meHighlighted = await P.evaluate(() => !!document.querySelector('.rk-p.me, .rk-row.me'));
  // 우리 반: 아직 반이 없어요
  await P.click('[data-wq="rk-scope"][data-v="class"]'); await P.waitForSelector('.cl-load'); await P.waitForTimeout(300);
  res.noClass = await P.textContent('.wq-scroll .cl-load');
  // 반에 들어가면 반 친구 이름으로 보여요
  psql(`set role anon; select voca_class_join('t2', '${code}', '이지우', '20315')`);
  await P.click('[data-wq="rk-per"][data-v="all"]'); await P.waitForSelector('.rk-pod'); await P.waitForTimeout(900); await shot('08-rank-class');
  res.classNames = await P.$$eval('.rk-p b, .rk-row b', a => a.map(x => x.textContent.split(' ')[0]).join(','));
  // 이름 바꾸기
  await P.click('.wq-me [data-wq="rename"]'); await P.fill('#dlgIn', '단어왕<b>'); await P.keyboard.press('Enter'); await P.waitForTimeout(600);
  res.renamed = psql(`select distinct name from voca_game_scores where uid = '2'`);
  // 보안: 브라우저에서 점수를 꾸며 올릴 수 없어요
  res.sec = await P.evaluate(async () => {
    const c = (fn, a) => Cloud.call(fn, a).then(r => r, e => ({ err: e.code }));
    const old = await c('voca_game_submit', { p_lang: 'en', p_lvl: 'l2', p_score: 9999, p_ok: 300, p_n: 300, p_combo: 300, p_name: 'x' });
    const t = await c('voca_game_start', { p_lang: 'en', p_lvl: 'l2' }), again = await c('voca_game_start', { p_lang: 'en', p_lvl: 'l2' });
    const fast = await c('voca_game_submit', { p_run: t.id, p_log: Array.from({ length: 100 }, (_, i) => [1, i * 100]), p_name: 'x' });
    const reuse = await c('voca_game_submit', { p_run: t.id, p_log: [[1, 500]], p_name: 'x' });
    const fake = await c('voca_game_submit', { p_run: 'nope', p_log: [[1, 500]], p_name: 'x' });
    return { old: old.err, again: again.err, fast: fast.err, reuse: reuse.err, fake: fake.err };
  });
  res.tableDirect = (() => { try { psql('set role anon; select count(*) from voca_game_scores'); return 'open'; } catch (e) { return 'denied'; } })();
  // 중국어
  await P.waitForTimeout(3100);
  await P.click('[data-wq="lobby"]'); await P.click('[data-wq="lang"][data-l="zh"]'); await P.waitForSelector('[data-wq="go"]:not([disabled])', { timeout: 8000 });
  await P.click('[data-wq="lv"][data-k="l1"]'); await shot('09-zh-lobby');
  await P.click('[data-wq="go"]'); await P.waitForSelector('.wq-opt', { timeout: 6000 });
  for (let t = 0; t < 8 && (await P.evaluate(() => WQ.q.a)) !== 'm'; t++) { await P.keyboard.press(String(await P.evaluate(() => WQ.q.opts.indexOf(WQ.q.cur)) + 1)); await P.waitForFunction(() => WQ && !WQ.lock && Date.now() - WQ.qAt > 160); }
  await shot('10-zh-play');
  res.zhQ = await P.evaluate(() => ({ word: WQ.q.cur.w, py: (document.querySelector('.wq-py') || {}).textContent || '', han: /[一-鿿]/.test(WQ.q.cur.w) }));
  for (let i = 0; i < 3; i++) { await P.waitForFunction(() => WQ && !WQ.lock && Date.now() - WQ.qAt > 160); await P.keyboard.press(String(await P.evaluate(() => WQ.q.opts.indexOf(WQ.q.cur)) + 1)); }
  await P.waitForTimeout(400); await P.evaluate(() => { WQ.end = Date.now(); }); await P.waitForSelector('.wq-rkres', { timeout: 5000 }); await shot('11-zh-result');
  res.zhDb = psql(`select lang || lvl || ':' || score from voca_game_scores where uid = '2' and lang = 'zh' and period = 'all'`);
  // 홈 항목에 최고 기록
  await P.keyboard.press('Escape'); await P.keyboard.press('Escape'); await P.waitForTimeout(300);
  res.closed = await P.evaluate(() => !document.getElementById('wqOv'));
  await P.evaluate(() => renderHome()); res.entryAfter = await P.textContent('[data-act="wordquiz"] small');
  // 어두운 화면
  await P.emulateMedia({ colorScheme: 'dark' }); await P.click('[data-act="wordquiz"]'); await P.waitForSelector('.wq-lvs'); await shot('12-dark-lobby');
  await P.click('[data-wq="rank"]'); await P.waitForTimeout(1200); await shot('13-dark-rank');
  await P.keyboard.press('Escape'); await P.keyboard.press('Escape');

  // 큰 화면
  const W = await page({ width: 1280, height: 800 }, 'W', true);
  await signup(W, 8791, 'parkstu', 'm2', '박민', '20301');
  await W.click('[data-act="wordquiz"]'); await W.waitForSelector('.wq-lvs'); await W.click('[data-wq="go"]'); await W.waitForSelector('.wq-opt', { timeout: 6000 }); await W.waitForTimeout(500); await W.screenshot({ path: path.join(shots, '14-wide-play.png') });
  await W.keyboard.press('Escape'); await W.waitForSelector('.wq-end h2'); res.quitEnds = await W.evaluate(() => WQ.view);

  // 로컬 계정(서버 없음): 게임은 되고 랭킹은 내 기록
  const L = await page({ width: 390, height: 844 }, 'L', false);
  await signup(L, 8792, 'localstu', 'm2', '최서연', '20322');
  await L.click('[data-act="wordquiz"]'); await L.waitForSelector('.wq-lvs');
  res.localNote = await L.textContent('.wq-note');
  await play(L, 3, 1); res.localSent = await L.evaluate(() => WQ.sent);
  await L.click('[data-wq="rank"]'); await L.waitForSelector('.rk-list'); await L.screenshot({ path: path.join(shots, '15-local-rank.png') });
  res.localRank = await L.$$eval('.rk-row', a => a.length);

  console.log(JSON.stringify(res, null, 1));
  const fails = [];
  if (!/단어 맞추기 대결/.test(res.entry)) fails.push('entry');
  if (res.lobbyName !== '이*우') fails.push('mask ' + res.lobbyName);
  if (res.firstQ.opts !== 4 || res.firstQ.uniq !== 4 || res.firstQ.left < 55) fails.push('firstQ');
  if (res.afterSix.score !== 10 + 12 + 14 + 16 + 18 + 20 || res.afterSix.combo !== 6) fails.push('score ' + res.afterSix.score);
  if (res.wrong.combo !== 0 || Math.abs(res.wrong.penaltyMs - 3000) > 5 || res.wrong.wrongWords !== 1) fails.push('wrong');
  if (!res.result.sent || res.result.sent.rank !== 8 || !/8위/.test(res.result.rk)) fails.push('rank result');
  if (!res.db.includes(':' + res.result.score)) fails.push('db');
  if (!res.meHighlighted || res.rankRows < 8) fails.push('board');
  if (!/참여한 반이 없어요/.test(res.noClass)) fails.push('noclass');
  if (res.classNames.includes('이지우') || !res.classNames.includes('이*우') || res.classNames.includes('친구')) fails.push('class names ' + res.classNames); // 우리 반 랭킹도 게임 별명(기본은 가린 이름)으로 보여요.
  if (res.renamed !== '단어왕b') fails.push('rename ' + res.renamed);
  if (res.sec.old !== 'missing' || res.sec.again !== 'too_fast' || res.sec.fast !== 'bad_input' || res.sec.reuse !== 'used' || res.sec.fake !== 'bad_run' || res.tableDirect !== 'denied') fails.push('security ' + JSON.stringify(res.sec) + res.tableDirect);
  if (res.result.sent.score !== res.result.score) fails.push('server score');
  if (!res.zhQ.han || !res.zhQ.py || !/^zhl1:\d+/.test(res.zhDb)) fails.push('zh');
  if (!res.closed || !/최고/.test(res.entryAfter)) fails.push('home');
  if (res.quitEnds !== 'end') fails.push('quit');
  if (res.localSent !== null || res.localRank < 1 || !/내 기록/.test(res.localNote)) fails.push('local');
  console.log('FAILS:', fails.length ? fails.join(' | ') : 'none');
  console.log('ERRORS:', errs.length ? errs.join('\n') : 'none');
  await b.close(); srv.close(); srvL.close();
  process.exitCode = fails.length || errs.length ? 1 : 0;
})();
