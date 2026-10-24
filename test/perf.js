// 중국어(HSK) 화면 속도 재기. 휴대폰처럼 CPU를 4배 느리게 하고 화면마다 걸린 시간(ms)을 찍어요. LIMIT 넘으면 실패.
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, 'site');
const TYPES = { js: 'text/javascript', css: 'text/css', json: 'application/json; charset=utf-8' };
const srv = http.createServer((q, r) => { let f = path.join(root, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html'; fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': TYPES[f.split('.').pop()] || 'text/html; charset=utf-8' }); r.end(d); }); }).listen(8779);
const LIMIT = +process.env.LIMIT || 400;
let fails = 0;
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.route(/fonts\.googleapis|jsdelivr/, r => r.abort());
  await p.goto('http://localhost:8779/'); await p.waitForSelector('#authScreen .auth-box');
  await p.click('[data-act="auth-mode"][data-m="signup"]');
  await p.fill('#auId', 'perf1'); await p.fill('#auPw', 'pass1234'); await p.fill('#auPw2', 'pass1234');
  await p.click('#auNext'); await p.waitForSelector('#auGrade', { state: 'attached' }); await p.evaluate(g => { document.getElementById('auGrade').value = g; }, 'm2'); await p.fill('#auName', '김주원'); await p.fill('#auSchool', '한빛중학교'); await p.fill('#auSno', '20315'); await p.check('#auTerms');
  await p.fill('#capIn', await p.evaluate('capText')); await p.click('#auGo');
  await p.waitForSelector('#obOv'); await p.click('[data-ob="skip"]'); await p.waitForTimeout(500);
  await p.evaluate(() => { const r = document.getElementById('recOv'); if (r) r.remove(); });
  const cdp = await ctx.newCDPSession(p); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  // 화면 하나 그리는 데 걸린 시간: 동작 + 스타일·레이아웃까지
  const time = async (label, fn) => {
    const ms = await p.evaluate(async src => { const t0 = performance.now(); await (0, eval)(src)(); document.body.offsetHeight; await new Promise(r => requestAnimationFrame(() => setTimeout(r, 0))); return performance.now() - t0; }, fn);
    console.log((ms > LIMIT ? 'SLOW ' : 'ok   ') + label.padEnd(28) + Math.round(ms) + 'ms'); if (ms > LIMIT) fails++;
    await p.waitForTimeout(300);
  };
  await time('중국어로 바꾸기', '(async () => { setLang("zh"); await zhLoad(); })');
  await p.waitForTimeout(1500);
  await time('홈 다시 그리기', '(() => renderHome())');
  await time('HSK 단어 (pack-open)', '(() => ACTIONS["pack-open"]())');
  for (const k of ['hsk1', 'hsk6', 'nhsk7']) await time('단어 목록 ' + k, `(() => recSheet("${k}"))`);
  await time('닫기', '(() => closeSheet())');
  await time('단어장 탭', '(() => go("tabBooks"))');
  await time('홈 탭', '(() => go("tabHome"))');
  console.log('ERRORS:', errs.length ? errs.join('\n') : 'none');
  await b.close(); srv.close(); process.exit(fails || errs.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
