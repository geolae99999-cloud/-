// 철자 퍼즐 키보드 입력 · 단어장 여러 개 지우기 · 공유 링크 크기 제한 확인
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, 'site'), shots = path.join(__dirname, 'shots', 'kbd');
fs.mkdirSync(shots, { recursive: true });
const srv = http.createServer((q, r) => { let f = path.join(root, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html'; fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': f.endsWith('.js') ? 'text/javascript' : f.endsWith('.css') ? 'text/css' : f.endsWith('.woff2') ? 'font/woff2' : 'text/html; charset=utf-8' }); r.end(d); }); }).listen(8797);
const fails = [];
const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails.push(m); };
(async () => {
  const b = await chromium.launch(); const errs = [];
  for (const vp of [{ width: 390, height: 844 }, { width: 1440, height: 900 }]) {
    const tag = vp.width + ' ';
    const p = await (await b.newContext({ viewport: vp })).newPage();
    p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => { errs.push('native dialog ' + d.message()); d.dismiss(); });
    await p.addInitScript(() => { try { window.speechSynthesis.speak = () => {}; } catch (e) {} });
    await p.goto('http://localhost:8797/'); await p.waitForSelector('#authScreen .auth-box');
    await p.click('[data-act="auth-mode"][data-m="signup"]'); await p.waitForTimeout(200);
    await p.fill('#auId', 'jiwoo'); await p.fill('#auPw', 'pass1234'); await p.fill('#auPw2', 'pass1234');
    await p.click('#auNext'); await p.waitForSelector('#auGrade', { state: 'attached' }); await p.evaluate(g => { document.getElementById('auGrade').value = g; }, 'm2'); await p.fill('#auName', '김지우'); await p.fill('#auSchool', '한빛중학교'); await p.fill('#auSno', '20315'); await p.check('#auTerms');
    await p.fill('#capIn', await p.evaluate('capText')); await p.click('#auGo');
    await p.waitForSelector('#obOv'); await p.click('[data-ob="skip"]'); await p.waitForSelector('#ltOv'); await p.click('[data-lt="close"]');
    await p.waitForSelector('#recOv.show'); await p.click('#recOv [data-act="rec-close"]'); await p.waitForTimeout(300);
    // 글꼴: 외부 CDN 없이 같은 주소에서
    ok(await p.evaluate(() => [...document.styleSheets].some(s => /font\/pretendard\.css$/.test(s.href || '')) && ![...document.querySelectorAll('link[href]')].some(l => /jsdelivr/.test(l.href))), tag + '글꼴을 같은 주소에서 받아요');
    // ---- 철자 퍼즐 ----
    await p.evaluate(() => { categories.push({ id: 'cK', name: 'K', words: [sanitizeWord({ id: uid(), word: 'apple', meaning: '사과' })] }); syncStorage(); startSession('scramble', { type: 'cat', id: 'cK' }, 1); });
    await p.waitForSelector('#scrTiles .scr-t');
    ok((await p.textContent('#kbdHint').catch(() => '')).includes('글자 넣기') || vp.width < 900, tag + '키 안내에 "글자 넣기"');
    await p.keyboard.press('a'); await p.keyboard.press('p'); await p.keyboard.press('z');
    ok(await p.evaluate(() => S.scr.picked.map(i => S.scr.letters[i]).join('')) === 'ap', tag + '키보드 a, p -> "ap" (없는 z는 무시)');
    ok(await p.evaluate(() => $('scrTiles').classList.contains('nope')), tag + '없는 글자는 흔들어 알려요');
    await p.keyboard.press('Backspace');
    ok(await p.evaluate(() => S.scr.picked.length) === 1, tag + 'Backspace로 한 글자 지우기');
    for (const k of 'pple') await p.keyboard.press(k);
    await p.waitForSelector('#typeFeedback .fb.ok', { timeout: 3000 }).catch(() => {});
    ok(!!(await p.$('#typeFeedback .fb.ok')), tag + '키보드로 apple을 다 치면 정답');
    await p.waitForTimeout(1300);
    await p.evaluate(() => { if (S.active) ACTIONS['exit-session'](); }); await p.waitForTimeout(300);
    if (await p.$('.dlg')) await p.click('.dlg [data-d="1"]');
    // ---- 단어장 여러 개 지우기 ----
    await p.evaluate(() => { for (let i = 1; i <= 4; i++) categories.push({ id: 'cD' + i, name: 'Day ' + i, words: [sanitizeWord({ id: uid(), word: 'w' + i, meaning: '뜻' })] }); syncStorage(); go('tabBooks'); renderBooks(); });
    const n0 = await p.evaluate(() => categories.length);
    await p.click('#bkEdit');
    ok(await p.$$eval('.book.sel', a => a.length) === n0 && (await p.textContent('#bkEdit')) === '취소', tag + '"여러 개 지우기"를 누르면 고르기 모드');
    await p.click('.book[data-id="cD2"]'); await p.click('.book[data-id="cD3"]');
    ok((await p.textContent('.bk-bar span')) === '2개 골랐어요' && await p.$$eval('.book.on', a => a.length) === 2, tag + '두 개 고르기');
    await p.screenshot({ path: path.join(shots, tag.trim() + '-select.png') });
    await p.click('[data-act="books-del"]'); await p.waitForSelector('.dlg');
    ok(/단어장 2개/.test(await p.textContent('.dlg')) && /Day 2/.test(await p.textContent('.dlg')), tag + '지우기 전에 확인(이름과 개수)');
    await p.click('.dlg [data-d="1"]'); await p.waitForTimeout(300);
    const left = await p.evaluate(() => categories.map(c => c.id));
    ok(left.length === n0 - 2 && !left.includes('cD2') && !left.includes('cD3') && left.includes('cD1') && left.includes('cD4'), tag + '고른 단어장만 지워져요');
    ok(!(await p.$('.book.sel')) && (await p.textContent('#bkEdit')) === '여러 개 지우기', tag + '지운 뒤 보통 모드로');
    await p.click('.book[data-id="cD1"]'); await p.waitForTimeout(300);
    ok(await p.evaluate(() => currentCategoryId) === 'cD1', tag + '보통 모드에서는 눌러서 열기');
    // ---- 공유 링크 크기 제한 ----
    const bomb = await p.evaluate(async () => {
      const big = new Uint8Array(20 << 20).fill(32); const z = await zipBytes(big); const code = 'z' + b64u(z);
      try { await shareDecode(code); return 'decoded'; } catch (e) { return e.message; }
    });
    ok(bomb === 'too_big', tag + '20MB로 풀리는 공유 링크는 거절 (' + bomb + ')');
    const fine = await p.evaluate(async () => (await shareDecode(await shareEncode({ name: 'S', words: [{ word: 'cat', meaning: '고양이' }] }))).words[0][0]);
    ok(fine === 'cat', tag + '보통 공유 링크는 그대로 풀려요');
  }
  ok(!errs.length, 'ERRORS: ' + (errs.join(' | ') || 'none'));
  await b.close(); srv.close();
  console.log(fails.length ? `FAILED ${fails.length}` : 'ALL OK'); process.exit(fails.length ? 1 : 0);
})();
