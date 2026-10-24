// 문장 배열 학습: 영어·중국어 예문을 조각으로 섞고, 순서대로 눌러 맞히기 / 틀리기
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, 'site'), shots = path.join(__dirname, 'shots');
fs.mkdirSync(shots, { recursive: true });
const TYPES = { js: 'text/javascript', css: 'text/css', json: 'application/json; charset=utf-8' };
const srv = http.createServer((q, r) => { let f = path.join(root, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html'; fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': TYPES[f.split('.').pop()] || 'text/html; charset=utf-8' }); r.end(d); }); }).listen(8781);
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await require('./undef')(p, errs);
  await p.route(/fonts\.googleapis|jsdelivr/, r => r.abort());
  await p.addInitScript(() => { try { window.speechSynthesis.speak = () => {}; } catch (e) {} });
  await p.goto('http://localhost:8781/'); await p.waitForSelector('#authScreen .auth-box');
  await p.click('[data-act="auth-mode"][data-m="signup"]');
  await p.fill('#auId', 'sen1'); await p.fill('#auPw', 'pass1234'); await p.fill('#auPw2', 'pass1234');
  await p.click('#auNext'); await p.waitForSelector('#auGrade', { state: 'attached' }); await p.evaluate(g => { document.getElementById('auGrade').value = g; }, 'm2'); await p.fill('#auName', '김주원'); await p.fill('#auSchool', '한빛중학교'); await p.fill('#auSno', '20315'); await p.check('#auTerms');
  await p.fill('#capIn', await p.evaluate('capText')); await p.click('#auGo');
  await p.waitForSelector('#obOv'); await p.click('[data-ob="skip"]'); await p.waitForTimeout(500);
  await p.waitForTimeout(800); await p.evaluate(() => ['recOv', 'ltOv'].forEach(id => { const r = document.getElementById(id); if (r) r.remove(); }));
  await p.evaluate(() => recAddWords('mid', gradeWords('mid').slice(0, 12))); await p.waitForTimeout(1500);
  ok(await p.evaluate(() => Object.keys(MODES).includes('sentence')), '학습 방법에 문장 배열');
  const play = async (lang, right) => {
    await p.evaluate(() => startSession('sentence', { type: 'all' }, 3)); await p.waitForSelector('#senTiles .sen-chip');
    const toks = await p.evaluate(() => S.sen.toks);
    console.log('     ', lang, JSON.stringify(toks));
    await p.screenshot({ path: path.join(shots, `sentence-${lang}-q.png`) });
    const ord = await p.evaluate(() => S.sen.toks.map((_, i) => i));
    const seq = right ? ord : ord.slice().reverse();
    for (let k = 0; k < seq.length; k++) { await p.click(`#senTiles [data-i="${seq[k]}"]`); if (k === 1) await p.screenshot({ path: path.join(shots, `sentence-${lang}-mid.png`) }); }
    await p.waitForTimeout(150);
    ok(await p.evaluate(r => document.getElementById('senLine').classList.contains(r ? 'ok' : 'bad'), right), `${lang} ${right ? '맞게' : '거꾸로'} 놓으면 ${right ? '정답' : '오답'}`);
    await p.screenshot({ path: path.join(shots, `sentence-${lang}-${right ? 'ok' : 'bad'}.png`) });
    await p.waitForTimeout(2800);
    ok(await p.evaluate(() => S.idx >= 1), lang + ' 다음 문제로 넘어감');
    await p.evaluate(() => exitSession(true));
  };
  await play('en', true); await play('en2', false);
  // 빼기와 처음부터
  await p.evaluate(() => startSession('sentence', { type: 'all' }, 3)); await p.waitForSelector('#senTiles .sen-chip');
  await p.click('#senTiles .sen-chip >> nth=0'); await p.click('#senTiles .sen-chip >> nth=1'); await p.click('#senLine .sen-chip >> nth=0');
  ok(await p.evaluate(() => S.sen.picked.length === 1), '놓은 조각 누르면 빠짐');
  await p.click('[data-act="sen-reset"]'); ok(await p.evaluate(() => S.sen.picked.length === 0), '처음부터');
  await p.evaluate(() => exitSession(true));
  // 중국어
  await p.evaluate(() => setLang('zh')); await p.waitForFunction(() => zhIdx && zhIdx.length > 1000); await p.waitForTimeout(1200);
  await p.evaluate(() => recAddWords('hsk2', gradeWords('hsk2').slice(0, 12))); await p.waitForTimeout(800);
  await play('zh', true);
  ok(!errs.length, 'ERRORS: ' + (errs.join('\n') || 'none'));
  await b.close(); srv.close(); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
