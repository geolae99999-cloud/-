// 일반인 가입: 학교 · 학번 없이 이름만으로 가입하고, 홈은 학년 대신 공부 목적(맞춤 코스)으로
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, 'site');
const srv = http.createServer((q, r) => { let f = path.join(root, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html'; fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': /\.m?js$/.test(f) ? 'text/javascript' : f.endsWith('.css') ? 'text/css' : f.endsWith('.json') ? 'application/json' : 'text/html; charset=utf-8' }); r.end(d); }); }).listen(8794);
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
(async () => {
  const b = await chromium.launch(), errs = [];
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage(); p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:8794/'); await p.waitForSelector('#authScreen .auth-box');
  await p.click('[data-act="auth-mode"][data-m="signup"]'); await p.waitForTimeout(200);
  await p.fill('#auId', 'genuser'); await p.fill('#auPw', 'pass1234'); await p.fill('#auPw2', 'pass1234');
  await p.click('#auNext'); await p.waitForSelector('#auRoleSw');
  ok((await p.$$eval('#auRoleSw button', a => a.map(x => x.textContent))).join() === '학생,선생님,일반', '역할: 학생 · 선생님 · 일반');
  await p.click('#auRoleSw [data-r="general"]');
  const v = await p.evaluate(() => ({ sch: document.getElementById('auSchWrap').hidden, sno: document.getElementById('auSno').hidden, grade: document.getElementById('auGradeBox').hidden, note: !document.getElementById('auGenNote').hidden, title: document.querySelector('.au-s2-title').textContent, ph: document.getElementById('auName').placeholder }));
  ok(v.sch && v.sno && v.grade && v.note && /나에 대해/.test(v.title) && /별명/.test(v.ph), '일반을 고르면 학교 · 학년 · 학번이 숨어요 ' + JSON.stringify(v));
  await p.check('#auTerms'); await p.fill('#capIn', await p.evaluate('capText'));
  await p.click('#auGo'); await p.waitForTimeout(200);
  ok(/이름이나 별명/.test(await p.textContent('#auMsg')), '이름이 없으면 안내');
  await p.fill('#auName', '여행가'); await p.fill('#capIn', await p.evaluate('capText')); await p.click('#auGo');
  await p.waitForSelector('#obOv'); await p.click('[data-ob="skip"]'); await p.waitForSelector('#ltOv'); await p.click('[data-lt="close"]'); await p.waitForTimeout(800);
  const c = await p.evaluate(() => ({ role: config.role, grade: config.grade, prof: config.profile, pf: !!document.getElementById('pfOv'), rec: !!document.querySelector('#recOv.show'), chip: (document.querySelector('.grade-chip') || {}).textContent, mc: !!document.querySelector('.mc-start') }));
  ok(c.role === 'general' && !c.grade && c.prof.name === '여행가' && !c.prof.school && !c.pf && !c.rec, '일반으로 가입 · 정보 다시 묻지 않음 · 학년 추천 창 없음 ' + JSON.stringify(c));
  ok(c.chip === '공부 목적' && c.mc, '홈: 학년 대신 공부 목적 칩, 맞춤 코스 카드');
  await p.click('.grade-chip'); await p.waitForSelector('#mcOv .mc-grid'); ok(true, '공부 목적 칩을 누르면 코스 만들기');
  await p.click('#mcOv [data-mc="close"]');
  await p.reload(); await p.waitForTimeout(1200);
  ok((await p.evaluate(() => config.role)) === 'general' && !(await p.$('#pfOv')), '새로고침해도 일반 유지');
  // 설정: 역할 목록에 일반, 학번 칸 숨김
  await p.evaluate(() => go('tabSettings')); await p.waitForTimeout(300);
  const st = await p.evaluate(() => ({ sel: document.getElementById('cfgGrade').value, sno: document.getElementById('pfSno').style.display }));
  ok(st.sel === 'general' && st.sno === 'none', '설정: 일반 선택됨, 학번 칸 숨김 ' + JSON.stringify(st));
  console.log('ERRORS:', errs.length ? errs.join('\n') : 'none'); await b.close(); srv.close();
  console.log(fails || errs.length ? 'SOME FAILED' : 'ALL OK'); process.exit(fails || errs.length ? 1 : 0);
})();
