const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, 'site'), shots = path.join(__dirname, 'shots');
fs.mkdirSync(shots, { recursive: true });
const srv = http.createServer((q, r) => { let f = path.join(root, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html'; fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': f.endsWith('.js') ? 'text/javascript' : f.endsWith('.css') ? 'text/css' : 'text/html; charset=utf-8' }); r.end(d); }); }).listen(8765);
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push('pageerror: ' + e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await p.route('**/fonts.googleapis.com/**', r => r.abort());
  await p.route('https://cdn.jsdelivr.net/**', r => r.abort());
  let aiCalls = 0;
  await p.route('https://generativelanguage.googleapis.com/**', async r => {
    aiCalls++; const body = r.request().postData() || '';
    await new Promise(x => setTimeout(x, 800));
    let obj;
    if (body.includes('"items"')) obj = { items: [ { word: 'resilient', meaning: '형 회복력 있는', phonetic: '/rɪˈzɪliənt/', koreanPron: '리질리언트', example: 'She is resilient.', exampleKo: '그녀는 회복력이 있다.', synonyms: 'tough' } ] };
    else if (body.includes('Translate')) obj = { t: '그녀는 매우 강하다.' };
    else obj = { meaning: '형 일관된', phonetic: '/kənˈsɪstənt/', koreanPron: '컨시스턴트', example: 'Be consistent every day.', exampleKo: '매일 꾸준히 하세요.', synonyms: 'steady, constant' };
    r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(obj) }] } }] }) });
  });
  const shot = n => p.screenshot({ path: path.join(shots, n + '.png') });
  await p.goto('http://localhost:8765/');
  await p.waitForSelector('#authScreen .auth-box');
  await p.click('[data-act="auth-mode"][data-m="signup"]');
  await shot('01-signup');
  await p.fill('#auId', 'tester'); await p.fill('#auPw', 'pass1234'); await p.fill('#auPw2', 'pass1234');
  await p.selectOption('#auGrade', 'e3'); await p.fill('#auName', '김지우'); await p.fill('#auSchool', '한빛중학교'); await p.fill('#auSno', '20315');
  await p.check('#auTerms');
  await p.fill('#capIn', await p.evaluate('capText'));
  await p.click('#auGo');
  await p.waitForSelector('#obOv');
  await p.click('[data-ob="skip"]');
  await p.waitForSelector('#ltOv'); await p.click('[data-lt="close"]');
  await p.waitForSelector('#recOv.show'); await p.waitForTimeout(400);
  await shot('02-home-rec');
  console.log('grade', await p.evaluate('config.grade'));
  await p.click('[data-act="rec-add"]'); await p.waitForTimeout(300);
  await shot('03-rec-added');
  await p.click('#recOv [data-act="rec-close"]'); await p.waitForTimeout(400);
  await p.evaluate(() => window.scrollTo(0, 0)); await shot('04-home');
  await p.evaluate(() => window.scrollTo(0, 2000)); await p.waitForTimeout(200); await shot('05-home-bottom');
  // 오늘 안보기
  await p.reload(); await p.waitForSelector('#recOv.show'); await p.check('#recSkip'); await p.click('#recOv [data-act="rec-close"]');
  await p.reload(); await p.waitForTimeout(1500);
  console.log('banner after skip:', await p.$('#recOv') ? 'SHOWN(bad)' : 'hidden(ok)');
  // 100개 시트
  await p.click('[data-act="rec-all"]'); await p.waitForTimeout(300); await shot('06-rec-sheet');
  await p.click('#recList .rec-row:not(.has) input >> nth=0'); await p.click('#recList .rec-row:not(.has) input >> nth=1');
  await p.click('[data-act="rec-pick-add"]'); await p.waitForTimeout(200);
  await p.click('[data-act="sheet-close"]');
  // 단어장
  await p.click('.nav-item[data-t="tabBooks"]'); await p.waitForTimeout(200); await shot('07-books');
  await p.click('#folderContainer .book >> text=초3 추천 단어'); await p.waitForTimeout(200);
  await p.click('.wcard >> nth=0 >> .w-main'); await p.waitForTimeout(200); await shot('08-book-pane');
  // 설정에서 내 키 (AI 모의)
  await p.evaluate(() => { config.keys.gemini = 'AIzaFAKEKEY123'; syncStorage(); });
  await p.click('.fab'); await p.waitForSelector('#fieldWord');
  await p.fill('#fieldWord', 'consistent'); await p.click('#btnRunAi');
  await p.waitForTimeout(250); await shot('09-ai-busy');
  await p.waitForSelector('.ai-state.ok', { timeout: 15000 }); await shot('10-ai-done');
  console.log('exampleKo field (dict):', await p.inputValue('#fieldExampleKo'), '|', await p.textContent('#aiState'));
  await p.click('text=단어 저장'); await p.click('[data-act="sheet-close"]');
  const before = aiCalls;
  await p.click('.fab'); await p.waitForSelector('#fieldWord');
  await p.fill('#fieldWord', 'snorkel'); await p.click('#btnRunAi');
  await p.waitForSelector('.ai-state.ok', { timeout: 15000 });
  console.log('AI path calls:', aiCalls - before, await p.inputValue('#fieldExampleKo'));
  await p.click('[data-act="sheet-close"]');
  // 내장 사전 즉시 뜻 + AI 실패 시
  await p.unroute('https://generativelanguage.googleapis.com/**');
  await p.route('https://generativelanguage.googleapis.com/**', r => r.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: { message: 'The model is overloaded.' } }) }));
  await p.click('.fab'); await p.waitForSelector('#fieldWord');
  await p.fill('#fieldWord', 'zyzzyvax'); await p.click('#btnRunAi');
  await p.waitForSelector('.ai-state.err', { timeout: 40000 });
  console.log('builtin meaning:', await p.inputValue('#fieldMeaning')); await shot('11-ai-fail-builtin');
  await p.click('[data-act="sheet-close"]');
  // 예문 표시 / 수정
  const wid = await p.evaluate(() => curCat().words.find(w => w.word === 'consistent').id);
  await p.click(`[data-wid="${wid}"] .w-main`); await p.waitForTimeout(200); await shot('12-word-detail');
  await p.click(`[data-wid="${wid}"] [data-act="edit-word"]`); await p.waitForTimeout(200); await shot('13-edit');
  await p.fill('#fieldMeaning', '형 꾸준한, 일관된'); await p.click('text=수정 저장');
  console.log('edited:', await p.evaluate(id => curCat().words.find(w => w.id === id).meaning, wid));
  // 옛 데이터 마이그레이션
  console.log('migrate:', JSON.stringify(await p.evaluate(() => sanitizeWord({ word: 'x', meaning: 'y', example: 'I like apples. (나는 사과를 좋아한다.)' }))).slice(0, 200));
  // 학습
  await p.click('#paneBook [data-act="start"][data-mode="card"]'); await p.waitForTimeout(400); await shot('14-card');
  await p.click('#fc3d'); await p.waitForTimeout(600); await shot('15-card-back');
  await p.click('[data-act="fly"][data-dir="1"]'); await p.waitForTimeout(400);
  await p.evaluate(() => exitSession(true));
  await p.click('.nav-item[data-t="tabStudy"]'); await p.waitForTimeout(200); await shot('16-study');
  await p.click('[data-act="study-start"][data-mode="choice"]'); await p.waitForTimeout(300); await shot('17-choice');
  await p.evaluate(() => exitSession(true));
  await p.click('.nav-item[data-t="tabStats"]'); await p.waitForTimeout(200); await shot('18-stats');
  await p.click('.nav-item[data-t="tabSettings"]'); await p.waitForTimeout(200); await shot('19-settings');
  console.log('cfgGrade:', await p.inputValue('#cfgGrade'));
  await p.click('#btnTr'); await p.waitForSelector('#trOv'); await shot('20-translator'); await p.click('[data-act="tr-close"]');
  await p.click('[data-act="theme"]'); await p.click('.nav-item[data-t="tabHome"]'); await p.waitForTimeout(300); await shot('21-dark-home');
  await p.click('.nav-item[data-t="tabBooks"]'); await p.click('#folderContainer .book >> nth=0'); await p.waitForTimeout(200); await shot('22-dark-book');
  await p.click('#paneBook [data-act="start"][data-mode="card"]'); await p.waitForTimeout(400); await shot('23-dark-card');
  await p.evaluate(() => exitSession(true));
  // 4단계 / 짝맞추기
  await p.click('.nav-item[data-t="tabHome"]'); await p.click('[data-act="flow"]'); await p.waitForTimeout(400); await shot('24-flow'); await p.click('[data-fl="close"]');
  await p.click('[data-act="match"]'); await p.waitForTimeout(300); await shot('25-match'); await p.click('[data-mg="x"]');
  await p.click('.grade-chip'); await p.waitForTimeout(300); await shot('26-grade-pick');
  await p.click('[data-act="grade-set"][data-g="h3"]'); await p.waitForTimeout(900); await shot('27-h3-rec');
  console.log('aiCalls', aiCalls);
  console.log('ERRORS:', errs.length ? errs.join('\n') : 'none');
  await b.close(); srv.close();
})().catch(e => { console.error('FAIL', e); process.exit(1); });
