// 선생님 수업 도구: 퀴즈 쇼, 빙고판, 발표자 뽑기·모둠, 수업 타이머, 반 결과 엑셀(CSV)
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, 'site2'), shots = path.join(__dirname, 'shots', 'tools');
fs.mkdirSync(shots, { recursive: true });
const srv = http.createServer((q, r) => { let f = path.join(root, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html'; fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': f.endsWith('.js') ? 'text/javascript' : f.endsWith('.css') ? 'text/css' : f.endsWith('.json') ? 'application/json' : 'text/html; charset=utf-8' }); r.end(d); }); }).listen(8783);
const members = [{ uid: '2', name: '이지우', sno: '20315', progress: { last: '2026-10-13', n7: 40, acc7: 85, streak: 3, total: 120, mastered: 10 }, done: 1 }, { uid: '3', name: '박민', sno: '20301', progress: {}, done: 0 }, { uid: '4', name: '=cmd', sno: '20302', progress: {}, done: 0 }, { uid: '5', name: '최서연', sno: '20322', progress: { last: '2026-10-13', n7: 72, acc7: 91, streak: 6, total: 210, mastered: 44 }, done: 1 }, { uid: '6', name: '정하늘', sno: '20327', progress: { last: '2026-10-12', n7: 55, acc7: 78, streak: 9, total: 160, mastered: 30 }, done: 1 }, { uid: '7', name: '김도윤', sno: '20305', progress: { last: '2026-10-11', n7: 18, acc7: 66, streak: 1, total: 60, mastered: 5 }, done: 0 }, { uid: '8', name: '김도윤', sno: '20305', progress: {}, done: 0 }];
(async () => {
  const b = await chromium.launch(), errs = [], res = {};
  const ctx = await b.newContext({ viewport: { width: 1280, height: 800 }, acceptDownloads: true }), p = await ctx.newPage();
  p.on('pageerror', e => errs.push(e.message));
  await require('./undef')(p, errs);
  await p.route(/fonts|jsdelivr/, r => r.abort());
  await p.addInitScript(() => { try { window.speechSynthesis.speak = () => {}; } catch (e) {} window.print = () => { window.__printed = document.getElementById('printArea').innerHTML.length; }; });
  await p.route('https://psmmrwhmpezyeehjivav.supabase.co/**', async r => {
    const fn = r.request().url().split('/').pop(), body = JSON.parse(r.request().postData() || '{}');
    const j = x => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(x) });
    if (fn === 'voca_signup') return j({ token: 't1', id: 1, username: body.p_user });
    if (fn === 'voca_me') return j({ id: 1, username: 'kimteacher' });
    if (fn === 'voca_load') return j(null);
    if (fn === 'voca_class_mine') return j({ owned: [{ id: 7, name: '2학년 3반', code: 'ABC234', members: 3, assignments: 1 }], joined: [] });
    if (fn === 'voca_class_detail') return j({ class: { id: 7, name: '2학년 3반', code: 'ABC234' }, members, assignments: [{ id: 9, title: 'Day 1', kind: 'test', n: 10, count: 30, subs: 1, avg: 90 }] });
    if (fn === 'voca_assign_results') return j({ assign: { id: 9, title: 'Day 1', kind: 'test' }, rows: [{ name: '이지우', sno: '20315', score: 90 }, { name: '박민', sno: '20301', score: null }, { name: '=cmd', sno: '20302', score: null }, { name: '김도윤', sno: '20305', score: 70 }] });
    return j({ ok: true });
  });
  const shot = n => p.screenshot({ path: path.join(shots, n + '.png') });
  await p.goto('http://localhost:8783/'); await p.waitForSelector('.auth-box #auId');
  await p.click('[data-m="signup"]'); await p.click('[data-act="auth-age"][data-k="0"]').catch(() => {}); await p.fill('#auId', 'kimteacher'); await p.fill('#auPw', 'pass1234'); await p.fill('#auPw2', 'pass1234');
  await p.click('#auNext'); await p.waitForSelector('#auGrade', { state: 'attached' }); await p.evaluate(g => { document.getElementById('auGrade').value = g; }, 'teacher'); await p.fill('#auName', '김선생'); await p.fill('#auSchool', '봉담중학교'); await p.check('#auTerms'); await p.fill('#capIn', await p.evaluate('capText')); await p.click('#auGo');
  await p.waitForSelector('#obOv'); await p.click('[data-ob="skip"]'); await p.waitForTimeout(1000);
  await p.evaluate(() => recSheet('mid')); await p.waitForTimeout(300); await p.click('[data-act="rec-left-add"]').catch(() => {}); await p.waitForFunction(() => categories.some(c => c.words.length > 100), null, { timeout: 15000 }).catch(() => {}); await p.waitForTimeout(300); await p.keyboard.press('Escape');
  await p.evaluate(() => renderHome()); await p.waitForTimeout(200); await shot('01-home');
  res.cards = await p.$$eval('.teach-card b', a => a.map(x => x.textContent));
  // 퀴즈 쇼
  await p.click('.teach-card[data-next="quizshow"]'); await p.click('[data-act="teach-go"] >> nth=0'); await p.waitForSelector('#qsAsk');
  await p.click('#qsNum [data-v="10"]'); await p.click('#qsSec [data-v="10"]'); await p.click('#qsTeam [data-v="3"]'); await p.click('[data-act="qs-go"]'); await p.waitForSelector('.qs-opts');
  await p.waitForTimeout(1200); await shot('02-quiz'); res.qsClock = await p.textContent('#qsLeft');
  await p.keyboard.press(' '); await p.waitForTimeout(200); res.qsShown = await p.$$eval('.qs-opt.ok', a => a.length);
  await p.keyboard.press('2'); await p.waitForTimeout(200); res.qsTeam = await p.$$eval('.qs-team b', a => a.map(x => x.textContent).join(',')); await shot('03-quiz-answer');
  await p.keyboard.press('2'); res.qsNoDouble = await p.$$eval('.qs-team b', a => a.map(x => x.textContent).join(','));
  await p.evaluate(() => { TT.i = TT.qs.length - 1; TT.show = true; qsDraw(); }); await p.click('[data-tt="next"]'); await p.waitForSelector('.qs-end'); res.qsEnd = await p.textContent('.qs-end h2'); res.qsEndNoTimer = await p.evaluate(() => TT.timer == null); await shot('04-quiz-end');
  await p.keyboard.press('Escape'); res.qsClosed = await p.evaluate(() => !document.getElementById('ttOv'));
  // 빙고판
  await p.click('.teach-card[data-next="bingo"]'); await p.click('[data-act="teach-go"] >> nth=0'); await p.waitForSelector('#bgSize');
  await p.fill('#bgCopies', '3'); await p.click('[data-act="bg-go"]'); await p.waitForTimeout(400);
  res.bingo = await p.evaluate(() => ({ printed: window.__printed > 0, sheets: document.querySelectorAll('#printArea .bg-sheet').length, cells: document.querySelectorAll('#printArea .bg-sheet:first-child .bg-grid div').length, diff: document.querySelectorAll('#printArea .bg-grid')[0].textContent !== document.querySelectorAll('#printArea .bg-grid')[1].textContent, call: document.querySelectorAll('#printArea .bg-call li').length }));
  // 발표자 뽑기: 반 명단
  await p.click('.teach-card[data-next="picker"]'); await p.waitForSelector('#pkSrc'); await shot('05-picker-sheet');
  res.pkOptions = await p.$$eval('#pkSrc option', a => a.map(x => x.textContent));
  await p.click('[data-act="pk-go"]'); await p.waitForSelector('#pkName');
  res.pkSameName = await p.evaluate(() => TT.names.filter(n => n.startsWith('김도윤')).join('|')); // 동명이인 둘 다 남아야 해요
  await p.keyboard.press(' '); await p.waitForTimeout(1700); res.pkPicked = await p.textContent('#pkName'); await shot('06-picker');
  await p.keyboard.press(' '); await p.waitForTimeout(1700); await p.keyboard.press(' '); await p.waitForTimeout(1700);
  res.pkAllDifferent = await p.evaluate(() => TT.used.length + ' / ' + new Set(TT.used).size + ' left:' + TT.names.filter(n => !TT.used.includes(n)).length);
  res.pkEscaped = await p.evaluate(() => !document.querySelector('#ttOv script') && document.querySelector('.pk-used').innerHTML.includes('=cmd'));
  await p.click('[data-tt="pk-mode"][data-m="grp"]'); await p.click('[data-tt="pk-size"][data-k="2"]'); await p.click('[data-tt="pk-grp"]'); await p.waitForTimeout(200);
  res.groups = await p.$$eval('.pk-g', a => a.map(x => x.textContent)); await shot('07-groups');
  await p.keyboard.press('Escape');
  // 번호로 뽑기
  await p.click('.teach-card[data-next="picker"]'); await p.waitForSelector('#pkSrc'); await p.selectOption('#pkSrc', 'num'); await p.fill('#pkNum', '25'); await p.click('[data-act="pk-go"]'); await p.waitForSelector('#pkName');
  res.pkNum = await p.evaluate(() => TT.names.length + ' ' + TT.names[24]);
  // 뽑는 도중 모드를 바꿨다 돌아와도 다시 뽑을 수 있어야 해요
  await p.click('[data-tt="pk-spin"]'); await p.click('[data-tt="pk-mode"][data-m="grp"]'); await p.waitForTimeout(200); await p.click('[data-tt="pk-mode"][data-m="one"]');
  res.pkSpinUnlock = await p.evaluate(() => TT.spin == null && !document.querySelector('[data-tt="pk-spin"]').disabled);
  await p.keyboard.press('Escape');
  // 타이머
  await p.click('.teach-card[data-next="ctimer"]'); await p.waitForSelector('.tm-time');
  await p.click('[data-tt="tm-set"][data-s="60"]'); await p.keyboard.press(' '); await p.waitForTimeout(1600); res.timer = await p.textContent('#tmTime'); await shot('08-timer');
  await p.evaluate(() => { TT.end = Date.now() + 300; }); await p.waitForTimeout(800); res.timerDone = await p.textContent('#tmTime'); await shot('09-timer-done');
  await p.keyboard.press('Escape');
  // 반 결과 엑셀
  await p.click('[data-act="class-open"]'); await p.waitForSelector('[data-act="cl-class"]'); await p.click('[data-act="cl-class"]'); await p.waitForSelector('[data-act="cl-csv"]');
  const [dl] = await Promise.all([p.waitForEvent('download'), p.click('[data-act="cl-csv"]')]);
  const file = await dl.path(); const csv = fs.readFileSync(file, 'utf8');
  res.csvName = dl.suggestedFilename(); res.csv = csv.replace(/^﻿/, '').split('\r\n');
  // 우리 반 랭킹: 시상대, 기준 바꾸기, 칠판용 큰 화면
  await p.click('[data-act="cl-tab"][data-t="rank"]'); await p.waitForSelector('.rk-pod'); await p.waitForTimeout(900); await shot('10-rank');
  res.rank = await p.$$eval('.rk-p b', a => a.map(x => x.textContent).join(','));
  await p.click('[data-act="cl-rk"][data-m="streak"]'); await p.waitForSelector('.rk-pod'); res.rankStreak = await p.$$eval('.rk-p b', a => a.map(x => x.textContent).join(','));
  await p.click('[data-act="cl-rk-big"]'); await p.waitForSelector('#ttOv .rk-pod'); await p.waitForTimeout(1200); await shot('11-rank-big');
  res.rankBig = await p.evaluate(() => document.querySelectorAll('#ttOv .rk-p').length);
  await p.keyboard.press('Escape');
  console.log(JSON.stringify(res, null, 1)); console.log('ERRORS:', errs.length ? errs.join('\n') : 'none'); await b.close(); srv.close();
})().catch(e => { console.error(e); process.exit(1); });
