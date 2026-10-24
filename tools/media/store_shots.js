// 플레이 스토어 스크린샷(1080x1920, 휴대폰 세로) 만들기: node tools/media/store_shots.js  (먼저 sh test/prep.sh)
// 결과: docs/store/shot-1.png ... 로컬 계정으로 가입해서 실제 화면을 찍어요(서버 연결 없음).
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..', '..', 'test', 'site'), out = path.join(__dirname, '..', '..', 'docs', 'store');
fs.mkdirSync(out, { recursive: true });
const srv = http.createServer((q, r) => { let f = path.join(root, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html'; fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': /\.m?js$/.test(f) ? 'text/javascript' : f.endsWith('.css') ? 'text/css' : f.endsWith('.json') ? 'application/json' : 'text/html; charset=utf-8' }); r.end(d); }); }).listen(8650);
(async () => {
  const b = await chromium.launch();
  const p = await (await b.newContext({ viewport: { width: 360, height: 640 }, deviceScaleFactor: 3 })).newPage();
  await p.addInitScript(() => { speechSynthesis.speak = u => setTimeout(() => { u.onstart && u.onstart(); setTimeout(() => u.onend && u.onend(), 10); }, 5); speechSynthesis.getVoices = () => [{ name: 'Samantha', lang: 'en-US', localService: true, voiceURI: 's', default: true }]; });
  const shot = async n => { await p.waitForTimeout(500); await p.screenshot({ path: path.join(out, `shot-${n}.png`) }); };
  await p.goto('http://localhost:8650/'); await p.waitForSelector('#authScreen .auth-box');
  await p.click('[data-act="auth-mode"][data-m="signup"]'); await p.waitForTimeout(200);
  await p.fill('#auId', 'store'); await p.fill('#auPw', 'pass1234'); await p.fill('#auPw2', 'pass1234');
  await p.click('#auNext'); await p.waitForSelector('#auRoleSw'); await p.click('#auRoleSw [data-r="general"]'); await p.fill('#auName', '지우'); await p.check('#auTerms');
  await p.fill('#capIn', await p.evaluate('capText')); await p.click('#auGo');
  await p.waitForSelector('#obOv'); await p.click('[data-ob="skip"]'); await p.waitForSelector('#ltOv'); await p.click('[data-lt="close"]'); await p.waitForTimeout(600);
  // 지난 2주 공부 기록(연속 학습 · 통계가 비어 보이지 않게)
  await p.evaluate(() => { for (let i = 1; i <= 12; i++) stats.days[dayKey(addDays(startOfDay(), -i))] = { n: 15 + (i * 7) % 20, ok: 12 + (i * 5) % 15, sec: 600 + i * 30 }; syncStorage(); });
  // 1) 목적 고르기
  await p.click('[data-act="mc-open"]'); await p.waitForSelector('#mcOv .mc-grid'); await p.waitForTimeout(400); await p.click('[data-mc="goal"][data-v="travel"]'); await shot(1);
  await p.click('[data-mc="next"]'); await p.click('[data-mc="lv"][data-v="1"]'); await p.click('[data-mc="next"]'); await p.click('[data-mc="daily"][data-v="10"]');
  await p.click('[data-mc="done"]');
  // 2) 아는 단어 체크
  await p.waitForSelector('#kcOv .kc-w'); await p.waitForTimeout(400); await p.click('.kc-w[data-i="1"]'); await p.click('.kc-w[data-i="4"]'); await p.evaluate(() => document.querySelector('#kcOv').scrollTo(0, 0)); await shot(2);
  await p.click('[data-kc="ok"]');
  // 3) 플래시카드(발음기호 · 한글 발음 · 예문): 카드를 뒤집어서
  await p.waitForSelector('#fc3d'); await p.waitForTimeout(4000); await p.click('#fc3d'); await shot(3);
  for (let i = 0; i < 4; i++) { await p.click('[data-act="fly"][data-dir="1"]'); await p.waitForTimeout(350); }
  await p.evaluate(() => exitSession(true)); await p.waitForTimeout(300);
  // 4) 홈(오늘의 맞춤 코스)
  await p.evaluate(() => { stats.days[dayKey()] = { n: 14, ok: 12, sec: 420 }; syncStorage(); go('tabHome'); });
  await p.evaluate(() => { const c = document.querySelector('.mc-card'); if (c) window.scrollTo(0, c.getBoundingClientRect().top + scrollY - 260); }); await shot(4);
  // 5) 단어 맞추기 대결
  await p.evaluate(() => ACTIONS.wordquiz()); await p.waitForTimeout(600); await shot(5);
  await b.close(); srv.close();
  console.log('saved to', out);
})();
