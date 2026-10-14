// 새 기능 확인: 영어사전, 오늘의 단어, 시험지, 학년 탭
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, 'site'), shots = path.join(__dirname, 'shots', 'feat');
fs.mkdirSync(shots, { recursive: true });
const srv = http.createServer((q, r) => { let f = path.join(root, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html'; fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': f.endsWith('.js') ? 'text/javascript' : f.endsWith('.css') ? 'text/css' : f.endsWith('.json') ? 'application/json' : 'text/html; charset=utf-8' }); r.end(d); }); }).listen(8774);
(async () => {
  const b = await chromium.launch(); const errs = []; const res = {};
  for (const vp of [{ width: 390, height: 844 }, { width: 1920, height: 1080 }]) {
    const tag = String(vp.width); const ctx = await b.newContext({ viewport: vp }); const p = await ctx.newPage();
    p.on('pageerror', e => errs.push(tag + ' ' + e.message));
    await require('./undef')(p, errs, tag);
    await p.route('https://cdn.jsdelivr.net/**', r => r.abort());
    await p.addInitScript(() => { try { window.speechSynthesis.speak = () => {}; } catch (e) {} window.__printed = 0; window.print = () => { window.__printed++; }; });
    const shot = n => p.screenshot({ path: path.join(shots, `${tag}-${n}.png`) });
    await p.goto('http://localhost:8774/'); await p.waitForSelector('#authScreen .auth-box');
    await p.click('[data-act="auth-mode"][data-m="signup"]'); await p.waitForTimeout(300);
    await p.fill('#auId', 'jiwoo'); await p.fill('#auPw', 'pass1234'); await p.fill('#auPw2', 'pass1234');
    await p.selectOption('#auGrade', 'm2'); await p.fill('#auName', '김지우'); await p.fill('#auSchool', '한빛중학교'); await p.fill('#auSno', '20315'); await p.check('#auTerms'); await p.fill('#capIn', await p.evaluate('capText')); await p.click('#auGo');
    await p.waitForSelector('#obOv'); await p.click('[data-ob="skip"]'); await p.waitForSelector('#ltOv'); await p.click('[data-lt="close"]');
    await p.waitForSelector('#recOv.show'); await p.click('[data-act="rec-add"]'); await p.waitForTimeout(400); await p.click('#recOv [data-act="rec-close"]'); await p.waitForTimeout(500);
    res[tag + ' hello'] = await p.evaluate(() => document.querySelector('.hello-name').textContent + ' | ' + (document.querySelector('.hello-school') || {}).textContent);
    res[tag + ' wotd'] = await p.evaluate(() => { const e = document.querySelector('.wotd-body b'); return e ? e.textContent + ' / ' + (document.querySelector('#wotdEx') || {}).textContent : null; });
    await shot('01-home');
    await p.click('#btnDict:visible, .hd-search:visible'); await p.waitForSelector('#dictQ');
    await p.fill('#dictQ', 'went'); await p.waitForSelector('.dict-card'); await p.waitForTimeout(200);
    res[tag + ' went'] = await p.textContent('.dict-m');
    await shot('02-dict-went');
    await p.click('[data-act="dict-go"][data-word="go"]'); await p.waitForTimeout(400);
    res[tag + ' go'] = await p.textContent('.dict-m');
    await p.fill('#dictQ', 'happ'); await p.waitForTimeout(500);
    res[tag + ' happ sug'] = await p.$$eval('.dict-row b', a => a.map(x => x.textContent).slice(0, 5));
    await shot('03-dict-prefix');
    await p.fill('#dictQ', 'resilience'); await p.waitForSelector('.dict-card'); await p.waitForTimeout(200);
    const syn = await p.$$eval('.dict-card .syn', a => a.map(x => x.textContent)); res[tag + ' syn'] = syn;
    if (syn[0]) { await p.click('.dict-card .syn >> nth=0'); await p.waitForTimeout(400); res[tag + ' syn->'] = await p.inputValue('#dictQ'); }
    await shot('04-dict-syn');
    await p.selectOption('#dictBook', '__new'); await p.click('[data-act="dict-add"]'); await p.waitForTimeout(200);
    res[tag + ' added'] = await p.evaluate(() => { const c = categories.find(c => c.name === '사전에서 담은 단어'); return c ? c.words.map(w => w.word + ':' + !!w.example) : null; });
    await p.fill('#dictQ', 'qzxv'); await p.waitForTimeout(500); res[tag + ' none'] = await p.evaluate(() => (document.querySelector('.dict-none') || {}).textContent || '');
    await p.keyboard.press('Escape'); await p.waitForTimeout(200);
    // 시험지
    await p.evaluate(() => { const c = categories.find(c => /추천/.test(c.name)); openBook(c.id); }); await p.waitForTimeout(300);
    await p.click('[data-act="book-menu"]').catch(() => p.evaluate(() => ACTIONS['book-menu']())); await p.waitForTimeout(200);
    await p.click('[data-act="book-print"]'); await p.waitForTimeout(200); await shot('05-print-opts');
    await p.click('[data-act="pt-opt"][data-v="x"]'); await p.click('[data-act="pt-go"]'); await p.waitForTimeout(300);
    res[tag + ' printed'] = await p.evaluate(() => ({ n: window.__printed, rows: document.querySelectorAll('#printArea .pt-list:not(.key) li').length, key: document.querySelectorAll('#printArea .pt-list.key li').length }));
    await p.emulateMedia({ media: 'print' }); await p.evaluate(() => document.body.classList.add('printing')); await shot('06-print-view'); await p.emulateMedia({ media: 'screen' }); await p.evaluate(() => document.body.classList.remove('printing'));
    // 단어장 공유
    await p.evaluate(() => { const c = categories.find(c => /추천/.test(c.name)); openBook(c.id); }); await p.waitForTimeout(300);
    await p.evaluate(() => ACTIONS['book-share']()); await p.waitForSelector('#shareUrl'); await shot('14-share');
    const shareUrl = await p.inputValue('#shareUrl'); res[tag + ' share len'] = shareUrl.length;
    await p.keyboard.press('Escape'); await p.waitForTimeout(200);
    { const c2 = await b.newContext({ viewport: vp }); const q = await c2.newPage(); q.on('pageerror', e => errs.push(tag + ' share ' + e.message));
      await q.route('https://cdn.jsdelivr.net/**', r => r.abort());
      await q.goto(shareUrl); await q.waitForSelector('#authScreen .auth-box');
      await q.click('[data-act="auth-mode"][data-m="signup"]'); await q.waitForTimeout(300);
      await q.fill('#auId', 'minsu'); await q.fill('#auPw', 'pass1234'); await q.fill('#auPw2', 'pass1234');
      await q.selectOption('#auGrade', 'm2'); await q.fill('#auName', '김지우'); await q.fill('#auSchool', '한빛중학교'); await q.fill('#auSno', '20315'); await q.check('#auTerms'); await q.fill('#capIn', await q.evaluate('capText')); await q.click('#auGo');
      await q.waitForSelector('#obOv'); await q.click('[data-ob="skip"]'); await q.waitForSelector('#ltOv'); await q.click('[data-lt="close"]');
      await q.waitForSelector('#recOv.show'); await q.click('#recOv [data-act="rec-close"]');
      await q.waitForSelector('[data-act="share-take"]', { timeout: 8000 }); await q.screenshot({ path: path.join(shots, `${tag}-15-share-in.png`) });
      await q.click('[data-act="share-take"]'); await q.waitForTimeout(800);
      res[tag + ' share in'] = await q.evaluate(() => { const c = categories.find(c => /추천/.test(c.name)); return c ? c.name + ' ' + c.words.length + ' ex:' + c.words.filter(w => w.example).length + ' hash:' + location.hash : null; });
      await c2.close(); }
    // 숙어
    await p.click('#btnDict:visible, .hd-search:visible'); await p.waitForSelector('#dictQ');
    await p.fill('#dictQ', 'give'); await p.waitForSelector('.dict-card'); await p.waitForTimeout(300);
    res[tag + ' give phr'] = await p.$$eval('.dict-sug', a => a.map(x => x.querySelector('h4').textContent + ': ' + [...x.querySelectorAll('.dict-row b')].slice(0, 4).map(y => y.textContent).join(', ')));
    await shot('08-dict-phrases');
    await p.fill('#dictQ', 'gave up'); await p.waitForTimeout(600);
    res[tag + ' gave up'] = await p.evaluate(() => (document.querySelector('.dict-m') || {}).textContent || '');
    await p.keyboard.press('Escape'); await p.waitForTimeout(200);
    // 실전 시험
    await p.evaluate(() => ACTIONS['exam-open']()); await p.waitForSelector('#exSrc'); await shot('09-exam-open');
    await p.click('[data-act="pt-opt"][data-g="exNum"][data-v="10"]'); await p.click('[data-act="exam-go"]'); await p.waitForTimeout(400);
    await shot('10-exam-q');
    for (let i = 0; i < 12; i++) {
      if (await p.$('.exam-result')) break;
      if (await p.$('#typeInput')) { await p.fill('#typeInput', i % 2 ? await p.evaluate(() => S.queue[S.idx].w.word) : 'nope'); await p.keyboard.press('Enter'); }
      else { await p.click('.opt >> nth=0'); }
      await p.waitForTimeout(450);
    }
    await p.waitForSelector('.exam-result'); await p.waitForTimeout(300);
    res[tag + ' exam'] = await p.evaluate(() => ({ score: document.querySelector('.exam-result .score').textContent, rows: document.querySelectorAll('.ex-row').length, saved: (stats.tests || []).length, types: [...new Set(S.log.map(x => x.t))].join(',') }));
    await shot('11-exam-result');
    await p.evaluate(() => exitSession(true)); await p.click('.nav-item[data-t="tabStats"]'); await p.waitForTimeout(300); await shot('12-stats');
    res[tag + ' stats bars'] = await p.$$eval('.tbar', a => a.length);
    await p.click('.nav-item[data-t="tabHome"]'); await p.waitForTimeout(300); await shot('13-home2');
    // 학년 탭
    await p.evaluate(() => recSheet('basic')); await p.waitForTimeout(200);
    await p.click('.rec-tabs [data-act="rec-tab"][data-g="h3"]'); await p.waitForTimeout(200);
    res[tag + ' h3 first'] = await p.$$eval('#recList .rec-row b', a => a.slice(0, 5).map(x => x.textContent));
    await shot('07-rec-h3');
    await p.keyboard.press('Escape'); await p.waitForTimeout(200);
    // 섞어서 학습: 철자 문제도 Enter로 제출
    res[tag + ' mix enter'] = await p.evaluate(async () => { startSession('mix', { type: 'all' }, 10); S.queue[S.idx].t = 'spell'; renderQuestion(); document.getElementById('typeInput').value = 'zzz'; document.getElementById('typeInput').focus(); return true; });
    await p.keyboard.press('Enter'); await p.waitForTimeout(150); res[tag + ' mix enter'] = await p.evaluate(() => S.answered); await p.evaluate(() => exitSession(true)); await p.waitForTimeout(200);
    // 짝 맞추기: 같은 단어·같은 뜻 타일이 겹치지 않아요
    res[tag + ' match dedupe'] = await p.evaluate(() => {
      const keep = categories.splice(0); categories.push({ id: 'cdup', name: 'dup', words: [['shop', '가게'], ['store', '가게'], ['Shop', '상점'], ['apple', '사과'], ['red', '빨강'], ['blue', '파랑'], ['cat', '고양이']].map(([w, m]) => sanitizeWord({ id: uid(), word: w, meaning: m })) });
      let bad = 0; for (let i = 0; i < 15; i++) { openMatch(); const t = [...document.querySelectorAll('#mgOv .mg-tile')].map(x => x.textContent.toLowerCase()); if (new Set(t).size !== t.length) bad++; closeMatch(); }
      categories.splice(0, categories.length, ...keep); return bad;
    });
    // 공유 링크: 뜻이 빈 단어도 남아요
    res[tag + ' share empty'] = await p.evaluate(async () => (await shareDecode(await shareEncode({ name: 'x', words: [{ word: 'a', meaning: '' }, { word: 'b', meaning: '비' }] }))).words.length);
    // 키보드로 단어장 열기 · 단어 펼치기
    await p.click('.nav-item[data-t="tabBooks"]'); await p.waitForTimeout(300);
    { const bid = await p.evaluate(() => categories.find(c => c.words.length).id); await p.locator(`.book[role="button"][data-id="${bid}"]:visible`).first().focus(); } await p.keyboard.press('Enter'); await p.waitForTimeout(300);
    await p.locator('.w-main[role="button"]:visible').first().focus(); await p.keyboard.press('Enter'); await p.waitForTimeout(200);
    // 4단계: 닫고 바로 다시 열면 옛 타이머가 새 학습을 넘기지 않아요
    res[tag + ' fl stale'] = await p.evaluate(async () => { flOpen(); FL.step = 1; flDraw(); flAnswer('x'); document.querySelector('#flOv [data-fl="close"]').click(); flOpen(); await new Promise(r => setTimeout(r, 1200)); const i = FL.i + '/' + FL.step; document.querySelector('#flOv [data-fl="close"]').click(); return i; });
    res[tag + ' kbd a11y'] = await p.evaluate(() => !!document.querySelector('.wcard.open') && document.activeElement.classList.contains('w-main'));
    await ctx.close();
  }
  console.log(JSON.stringify(res, null, 1)); console.log('ERRORS:', errs.length ? errs.join('\n') : 'none'); await b.close(); srv.close();
})().catch(e => { console.error(e); process.exit(1); });
