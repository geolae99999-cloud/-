// 넓은 PC 화면 스크린샷 (1920, 1440, 1100)
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, 'site'), shots = path.join(__dirname, 'shots', 'wide');
fs.mkdirSync(shots, { recursive: true });
const srv = http.createServer((q, r) => { let f = path.join(root, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html'; fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': f.endsWith('.js') ? 'text/javascript' : f.endsWith('.css') ? 'text/css' : f.endsWith('.json') ? 'application/json' : 'text/html; charset=utf-8' }); r.end(d); }); }).listen(8771);

(async () => {
  const b = await chromium.launch(); const errs = [];
  const only = process.argv[2] ? process.argv[2].split(',').map(Number) : [1920, 1440, 1100];
  for (const vp of [{ width: 1920, height: 1080 }, { width: 1440, height: 900 }, { width: 1100, height: 800 }].filter(v => only.includes(v.width))) {
    const ctx = await b.newContext({ viewport: vp }); const p = await ctx.newPage(); const tag = String(vp.width);
    p.on('pageerror', e => errs.push(tag + ' ' + e.message));
    await require('./undef')(p, errs, tag);
    await p.route('https://cdn.jsdelivr.net/**', r => r.abort());
    await p.addInitScript(() => { try { window.speechSynthesis.speak = () => {}; } catch (e) {} });
    const shot = n => p.screenshot({ path: path.join(shots, `${tag}-${n}.png`) });
    await p.goto('http://localhost:8771/'); await p.waitForSelector('#authScreen .auth-box'); await p.waitForTimeout(300); await shot('00-login');
    await p.click('[data-act="auth-mode"][data-m="signup"]'); await p.waitForTimeout(300);
    await p.fill('#auId', 'jiwoo'); await p.fill('#auPw', 'pass1234'); await p.fill('#auPw2', 'pass1234');
    await p.selectOption('#auGrade', 'm1'); await p.fill('#auName', '김지우'); await p.fill('#auSchool', '한빛중학교'); await p.fill('#auSno', '20315'); await p.check('#auTerms'); await p.fill('#capIn', await p.evaluate('capText')); await p.click('#auGo');
    await p.waitForSelector('#obOv'); await p.click('[data-ob="skip"]'); await p.waitForSelector('#ltOv'); await p.click('[data-lt="close"]');
    await p.waitForSelector('#recOv.show'); await p.click('[data-act="rec-add"]'); await p.waitForTimeout(300); await p.click('#recOv [data-act="rec-close"]'); await p.waitForTimeout(300);
    await p.evaluate(() => { const d = new Date(); for (let i = 1; i <= 3; i++) { const t = new Date(d); t.setDate(d.getDate() - i); stats.days[dayKey(t.getTime())] = { n: 12, ok: 10 }; } stats.days[dayKey()] = { n: 8, ok: 7 }; categories.push({ id: 'c2', name: 'Day 1', words: [] }, { id: 'c3', name: '수능 필수', words: [] }); syncStorage(); go('tabHome'); });
    await p.waitForTimeout(300); await shot('01-home');
    for (const [t, n] of [['tabBooks', '02-books'], ['tabStudy', '04-study'], ['tabStats', '05-stats'], ['tabSettings', '06-settings']]) {
      await p.click(`.nav-item[data-t="${t}"]`); await p.waitForTimeout(250); await shot(n);
      if (t === 'tabBooks') { await p.click('#folderContainer .book:has-text("추천")'); await p.waitForTimeout(300); await shot('03-book'); }
    }
    await p.click('.nav-item[data-t="tabHome"]'); await p.waitForTimeout(200); await p.click('[data-act="pack-open"]'); await p.waitForTimeout(400); await shot('07-packs');
    await p.click('.rec-tabs [data-act="rec-tab"][data-g="e4"]'); await p.waitForTimeout(300); await shot('08-packs-e4');
    await p.keyboard.press('Escape'); await p.waitForTimeout(200);
    await p.evaluate(() => startSession('choice', { type: 'all' }, 5)); await p.waitForTimeout(400); await shot('09-choice');
    await p.evaluate(() => exitSession(true));
    await p.evaluate(() => startSession('card', { type: 'all' }, 5)); await p.waitForTimeout(400); await shot('10-card');
    await p.evaluate(() => exitSession(true));
    await ctx.close();
  }
  console.log('ERRORS:', errs.length ? errs.join('\n') : 'none'); await b.close(); srv.close();
})().catch(e => { console.error(e); process.exit(1); });
