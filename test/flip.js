const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, 'site');
const srv = http.createServer((q, r) => { let f = path.join(root, q.url.split('?')[0]); if (f.endsWith('/')) f += 'index.html'; fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': f.endsWith('.js') ? 'text/javascript' : f.endsWith('.css') ? 'text/css' : 'text/html; charset=utf-8' }); r.end(d); }); }).listen(8766);
(async () => {
  const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })).newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await require('./undef')(p, errs);
  await p.route(/fonts|jsdelivr/, r => r.abort());
  await p.goto('http://localhost:8766/'); await p.waitForSelector('.auth-box');
  await p.click('[data-m="signup"]'); await p.fill('#auId', 'kim'); await p.fill('#auPw', 'pass1234'); await p.fill('#auPw2', 'pass1234');
  // 학년 없이 가입 시도
  await p.check('#auTerms'); await p.fill('#capIn', await p.evaluate('capText')); await p.click('#auGo');
  console.log('no grade msg:', await p.textContent('#auMsg'));
  await p.selectOption('#auGrade', 'm2'); await p.fill('#auName', '김지우'); await p.fill('#auSchool', '한빛중학교'); await p.fill('#auSno', '20315'); await p.fill('#capIn', await p.evaluate('capText')); await p.click('#auGo');
  await p.waitForSelector('#obOv'); await p.click('[data-ob="skip"]'); await p.click('[data-lt="close"]');
  await p.waitForSelector('#recOv.show'); await p.click('[data-act="rec-add"]'); await p.waitForTimeout(100);
  await p.click('[data-act="rec-study"]'); await p.waitForTimeout(500);
  const box = await p.$('#swipeWrap'); const bb = await box.boundingBox();
  await p.mouse.move(bb.x + bb.width / 2, bb.y + 70); await p.mouse.down(); await p.mouse.up(); await p.waitForTimeout(700);
  console.log('flipped:', await p.evaluate(() => $('fc3d').classList.contains('is-flipped')));
  await p.screenshot({ path: path.join(__dirname, 'shots', '30-flip.png') });
  await p.click('[data-act="fly"][data-dir="1"]'); await p.waitForTimeout(500);
  await p.evaluate(() => exitSession(true)); await p.waitForTimeout(200);
  await p.screenshot({ path: path.join(__dirname, 'shots', '31-home-light.png') });
  // 리스닝 모드 아이콘
  await p.evaluate(() => startSession('listen', { type: 'all' }, 5)); await p.waitForTimeout(300);
  await p.screenshot({ path: path.join(__dirname, 'shots', '32-listen.png') });
  await p.evaluate(() => exitSession(true));
  // 백업 데이터 호환: 오래된 예문 형식으로 복원
  console.log('errors:', errs.length ? errs : 'none'); await b.close(); srv.close();
})();
