// 영어 말하기 문장 · 늘어난 중학/고교 단어 · 로그인 해시 업그레이드 확인
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, 'site'), shots = path.join(__dirname, 'shots');
const srv = http.createServer((q, r) => { let f = path.join(root, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html'; fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': f.endsWith('.js') ? 'text/javascript' : f.endsWith('.css') ? 'text/css' : f.endsWith('.json') ? 'application/json' : 'text/html; charset=utf-8' }); r.end(d); }); }).listen(8771);
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
(async () => {
  const b = await chromium.launch();
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })).newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await require('./undef')(p, errs);
  await p.route('**/fonts.googleapis.com/**', r => r.abort()); await p.route('https://cdn.jsdelivr.net/**', r => r.abort());
  await p.goto('http://localhost:8771/'); await p.waitForSelector('#authScreen .auth-box');
  // 예전 약한 해시(f)로 만든 로컬 계정을 심어 두고 로그인하면 PBKDF2(p)로 바뀌어야 해요
  await p.evaluate(async () => { const s = 'oldsalt'; const h = await hashPw('pass1234', s, 'f'); const u = getUsers(); u.olduser = { name: 'olduser', s, m: 'f', h, t: 1 }; saveUsers(u); });
  await p.click('[data-act="auth-mode"][data-m="signup"]');
  await p.fill('#auId', 'tester'); await p.fill('#auPw', 'pass1234'); await p.fill('#auPw2', 'pass1234');
  await p.click('#auNext'); await p.waitForSelector('#auGrade', { state: 'attached' }); await p.evaluate(g => { document.getElementById('auGrade').value = g; }, 'm2'); await p.fill('#auName', '김지우'); await p.fill('#auSchool', '한빛중학교'); await p.fill('#auSno', '20315'); await p.check('#auTerms');
  await p.fill('#capIn', await p.evaluate('capText')); await p.click('#auGo');
  await p.waitForSelector('#obOv'); await p.click('[data-ob="skip"]');
  await p.waitForSelector('#ltOv'); await p.click('[data-lt="close"]');
  await p.waitForSelector('#recOv.show'); await p.click('#recOv [data-act="rec-close"]'); await p.waitForTimeout(400);

  const n = await p.evaluate(() => ({ mid: gradeWords('mid').length, high: gradeWords('high').length, dupM: gradeWords('mid').length - new Set(gradeWords('mid').map(e => e.w.toLowerCase())).size, dupH: gradeWords('high').length - new Set(gradeWords('high').map(e => e.w.toLowerCase())).size, emptyM: gradeWords('mid').concat(gradeWords('high')).filter(e => !e.w || !e.m).length }));
  ok(n.mid === 1844 && n.high === 1779 && !n.dupM && !n.dupH && !n.emptyM, '중학 1844 · 고교 1779, 중복 · 빈 뜻 없음 ' + JSON.stringify(n));

  // 영어 말하기 문장 책장 · 시트 · 담기
  await p.waitForFunction(() => document.querySelectorAll('.shelf-b[data-g^="es-"]').length === 4, null, { timeout: 8000 });
  ok(await p.evaluate(() => /영어 말하기 문장 \(하 · 중 · 상 · 최상\)/.test(document.querySelector('.tool-list').textContent)), '홈 줄: 영어 말하기 문장');
  await p.click('.shelf-b[data-g="es-2"]'); await p.waitForSelector('#recList .rec-row');
  const es = await p.evaluate(() => ({ t: $('sheetTitle').textContent, n: document.querySelectorAll('#recList .rec-row').length, ex: (document.querySelector('#recList .rec-ex') || {}).textContent || '' }));
  ok(/영어 말하기 · 중/.test(es.t) && es.n === 60 && /[.?!]/.test(es.ex), '난이도 중 문장 60개 ' + JSON.stringify(es));
  await p.screenshot({ path: path.join(shots, 'en-speak-sheet.png') });
  await p.click('[data-act="rec-left-add"]'); await p.waitForTimeout(600);
  const eb = await p.evaluate(() => { const c = categories.find(x => x.name === '영어 말하기 · 중'); return c && { n: c.words.length, bad: c.words.filter(w => !w.example || !w.exampleKo || !w.meaning || !w.example.toLowerCase().includes(w.word.toLowerCase())).length }; });
  ok(eb && eb.n === 60 && eb.bad === 0, '담으면 단어 · 뜻 · 문장 · 해석 ' + JSON.stringify(eb));

  // 문장·예문 탭: 문장 속 단어(꼴이 바뀐 것도)를 찾아 예문 없는 단어로 기본 선택, 예문이 이미 있으면 새 문장으로
  await p.evaluate(() => { closeSheet(); translateText = async t => ({ t: '해석: ' + t }); const c = sanitizeCategories([{ id: uid(), name: '예문 시험', words: [sanitizeWord({ id: uid(), word: 'run', meaning: '달리다' }), sanitizeWord({ id: uid(), word: 'apple', meaning: '사과', example: 'An apple a day.', exampleKo: '하루 사과 하나.' })] }])[0]; categories.push(c); syncStorage(); openBook(c.id); });
  await p.waitForTimeout(300); await p.click('.fab'); await p.waitForSelector('#fieldWord'); await p.click('[data-act="add-tab"][data-t="sent"]');
  await p.fill('#sentText', 'She runs every morning.\nI ate a red apple.'); await p.click('#btnSentFill'); await p.waitForSelector('.sent-row >> nth=1');
  const dst = await p.$$eval('.sent-dest', a => a.map(s => s.options[s.selectedIndex].textContent));
  ok(dst[0] === "'run' 예문으로" && dst[1] === '새 문장으로', '넣을 곳 기본값 ' + JSON.stringify(dst));
  await p.click('#btnSentSave'); await p.waitForTimeout(300);
  const sv = await p.evaluate(() => { const c = curCat(); return { run: c.words.find(w => w.word === 'run').example, apple: c.words.find(w => w.word === 'apple').example, n: c.words.length, ko: c.words.find(w => w.word === 'run').exampleKo }; });
  ok(sv.run === 'She runs every morning.' && sv.ko === '해석: She runs every morning.' && sv.apple === 'An apple a day.' && sv.n === 3, '예문 저장 · 기존 예문 그대로 · 새 문장 1개 ' + JSON.stringify(sv));
  await p.evaluate(() => closeSheet());

  // 추천 창 제목은 글자로만 들어가요
  ok(await p.evaluate(() => { recOpen('<img src=x id=xssimg>'); const r = !document.getElementById('xssimg') && /<img/.test($('recOv').textContent); ACTIONS['rec-close'](); return r; }), '추천 창 문구 이스케이프');
  // 로컬 모드에서는 '이 기기에서 지우기'를 숨겨요
  ok(await p.evaluate(() => { go('tabSettings'); return getComputedStyle($('btnWipe')).display === 'none'; }), '로컬 모드에서 지우기 버튼 숨김');

  // 로그아웃 후 예전 계정으로 로그인 → 해시 업그레이드
  await p.evaluate(() => ACTIONS.logout()); await p.waitForSelector('#authScreen .auth-box');
  await p.click('[data-act="auth-mode"][data-m="login"]').catch(() => {});
  await p.fill('#auId', 'olduser'); await p.fill('#auPw', 'pass1234'); await p.click('#auGo');
  await p.waitForFunction(() => currentUser === 'olduser', null, { timeout: 8000 });
  const up = await p.evaluate(async () => { const u = getUsers().olduser; return { m: u.m, ok: (await hashPw('pass1234', u.s, 'p')) === u.h }; });
  ok(up.m === 'p' && up.ok, '예전 해시 계정 로그인 시 PBKDF2로 바뀜 ' + JSON.stringify(up));

  ok(!errs.length, 'ERRORS: ' + (errs.join('\n') || 'none'));
  console.log(fails ? `FAILS: ${fails}` : 'FAILS: none');
  await b.close(); srv.close(); process.exit(fails ? 1 : 0);
})().catch(e => { console.log('FAIL crash', e.message); process.exit(1); });
