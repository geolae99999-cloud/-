// 공유 · 친구 초대: 결과 공유 버튼, 초대 항목, 휴대폰 공유 창(없으면 복사), 초대 보상 보호권이 연속 학습을 지켜 줘요
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, 'site');
const srv = http.createServer((q, r) => { let f = path.join(root, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html'; fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': /\.m?js$/.test(f) ? 'text/javascript' : f.endsWith('.css') ? 'text/css' : f.endsWith('.json') ? 'application/json' : 'text/html; charset=utf-8' }); r.end(d); }); }).listen(8793);
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
(async () => {
  const b = await chromium.launch(), errs = [];
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } }); await ctx.grantPermissions(['clipboard-read', 'clipboard-write']);
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => { window.__shared = []; navigator.share = d => { window.__shared.push(d); return Promise.resolve(); }; });
  // 초대 링크로 들어오면 코드를 기억하고 주소창에서 지워요
  await p.goto('http://localhost:8793/?ref=ab12cd'); await p.waitForSelector('#authScreen .auth-box');
  ok((await p.evaluate(() => JSON.parse(localStorage.getItem('vocapro_ref_in')).c)) === 'AB12CD' && !/ref=/.test(await p.evaluate(() => location.href)), '초대 코드를 기억하고 주소에서 지워요');
  await p.click('[data-act="auth-mode"][data-m="signup"]'); await p.waitForTimeout(200);
  await p.fill('#auId', 'shuser'); await p.fill('#auPw', 'pass1234'); await p.fill('#auPw2', 'pass1234');
  await p.click('#auNext'); await p.waitForSelector('#auRoleSw'); await p.click('#auRoleSw [data-r="general"]'); await p.fill('#auName', '공유왕'); await p.check('#auTerms');
  await p.fill('#capIn', await p.evaluate('capText')); await p.click('#auGo');
  await p.waitForSelector('#obOv'); await p.click('[data-ob="skip"]'); await p.waitForSelector('#ltOv'); await p.click('[data-lt="close"]'); await p.waitForTimeout(600);
  // 홈 학습 도구 첫 줄에 친구 초대
  ok(await p.$('#homeToolList > [data-act="invite"]:first-child'), '홈 학습 도구 맨 앞에 친구 초대');
  await p.click('[data-act="invite"]'); await p.waitForTimeout(200);
  const sh = await p.evaluate(() => __shared[0]);
  ok(sh && /VocaPro/.test(sh.text) && /^http:\/\/localhost:8793\/$/.test(sh.url), '초대: 휴대폰 공유 창으로 글과 링크 ' + JSON.stringify(sh));
  // 학습 결과 공유
  await p.evaluate(() => { categories.push({ id: 'cS', name: 'S', words: ['apple', 'river', 'cat', 'dog'].map(w => sanitizeWord({ id: uid(), word: w, meaning: '뜻' })) }); syncStorage(); startSession('card', { type: 'cat', id: 'cS' }, 4); });
  for (let i = 0; i < 4; i++) { await p.waitForSelector('[data-act="fly"][data-dir="1"]'); await p.click('[data-act="fly"][data-dir="1"]'); await p.waitForTimeout(330); }
  await p.waitForSelector('[data-act="share-result"]');
  await p.click('[data-act="share-result"]'); await p.waitForTimeout(200);
  const s2 = await p.evaluate(() => __shared[1]);
  ok(s2 && /4개/.test(s2.text) && /100%/.test(s2.text), '결과 공유: 단어 수와 정답률 ' + (s2 && s2.text));
  await p.evaluate(() => exitSession(true));
  // 공유 창이 없으면 클립보드로 복사
  await p.evaluate(() => { navigator.share = undefined; });
  await p.click('[data-act="invite"]'); await p.waitForTimeout(300);
  ok(/VocaPro/.test(await p.evaluate(() => navigator.clipboard.readText())) && /복사/.test(await p.textContent('#toast')), '공유 창이 없으면 글과 링크를 복사');
  // 보호권 보너스: 그제까지 공부하고 어제 빠졌어도, 받은 보호권이 있으면 오늘 이어져요
  const st = await p.evaluate(() => {
    const k = n => dayKey(addDays(startOfDay(), -n));
    stats.days = {}; [4, 3, 2].forEach(n => { stats.days[k(n)] = { n: 5, ok: 5 }; });
    const before = streakInfo();
    stats.bonus = [{ d: k(4), n: 1 }];
    const after = streakInfo();
    addBonusFrz(1, '테스트 보상');
    return { before: before.n, after: after.n, prot: after.prot, frz: streakInfo().frz, saved: JSON.parse(localStorage.getItem(KEY_DATA)).stats.bonus.length };
  });
  ok(st.before === 0 && st.after === 3 && st.prot.length === 1 && st.frz >= 1 && st.saved === 2, '받은 보호권이 빠진 날을 지켜 줘요 ' + JSON.stringify(st));
  console.log('ERRORS:', errs.length ? errs.join('\n') : 'none'); await b.close(); srv.close();
  console.log(fails || errs.length ? 'SOME FAILED' : 'ALL OK'); process.exit(fails || errs.length ? 1 : 0);
})();
