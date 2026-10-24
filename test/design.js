// 디자인 확인용 스크린샷: 모바일(390) + PC(1280) + 키보드 단축키 동작
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, 'site'), shots = path.join(__dirname, 'shots', 'design');
fs.mkdirSync(shots, { recursive: true });
const srv = http.createServer((q, r) => { let f = path.join(root, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html'; fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': f.endsWith('.js') ? 'text/javascript' : f.endsWith('.css') ? 'text/css' : f.endsWith('.json') ? 'application/json' : 'text/html; charset=utf-8' }); r.end(d); }); }).listen(8770);

async function setup(b, vp, tag) {
  const ctx = await b.newContext({ viewport: vp, deviceScaleFactor: 2 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(tag + ' pageerror: ' + e.message));
  await require('./undef')(p, errs, tag);
  await p.route('**/fonts.googleapis.com/**', r => r.abort());
  await p.route('https://cdn.jsdelivr.net/**', r => r.abort());
  await p.addInitScript(() => { try { window.speechSynthesis.speak = () => {}; } catch (e) {} });
  const shot = n => p.screenshot({ path: path.join(shots, `${tag}-${n}.png`) });
  await p.goto('http://localhost:8770/');
  await p.waitForSelector('#authScreen .auth-box');
  await p.click('[data-act="auth-mode"][data-m="signup"]');
  await p.waitForTimeout(300);
  await shot('01-auth');
  await p.fill('#auId', 'jiwoo'); await p.fill('#auPw', 'pass1234'); await p.fill('#auPw2', 'pass1234');
  await p.click('#auNext'); await p.waitForSelector('#auGrade', { state: 'attached' }); await p.evaluate(g => { document.getElementById('auGrade').value = g; }, 'm1'); await p.fill('#auName', '김지우'); await p.fill('#auSchool', '한빛중학교'); await p.fill('#auSno', '20315');
  await p.check('#auTerms');
  await p.fill('#capIn', await p.evaluate('capText'));
  await p.click('#auGo');
  await p.waitForSelector('#obOv'); await p.waitForTimeout(500);
  await shot('02-onboarding');
  await p.click('[data-ob="skip"]');
  await p.waitForSelector('#ltOv'); await p.waitForTimeout(400);
  await shot('03-leveltest');
  await p.click('[data-lt="close"]');
  await p.waitForSelector('#recOv.show'); await p.waitForTimeout(400);
  await p.click('[data-act="rec-add"]'); await p.waitForTimeout(300);
  await p.click('#recOv [data-act="rec-close"]'); await p.waitForTimeout(400);
  // 학습 기록을 조금 만들어 홈 화면을 채움
  await p.evaluate(() => { const d = new Date(); for (let i = 1; i <= 3; i++) { const t = new Date(d); t.setDate(d.getDate() - i); stats.days[dayKey(t.getTime())] = { n: 12, ok: 10 }; } stats.days[dayKey()] = { n: 8, ok: 7 }; syncStorage(); go('tabHome'); });
  await p.waitForTimeout(300);
  return { p, ctx, shot, errs };
}

(async () => {
  const b = await chromium.launch();
  const all = [];

  // ---------- 모바일 ----------
  {
    const { p, ctx, shot, errs } = await setup(b, { width: 390, height: 844 }, 'm');
    await shot('04-home');
    await p.evaluate(() => window.scrollTo(0, 2000)); await p.waitForTimeout(200); await shot('05-home-bottom');
    await p.click('.nav-item[data-t="tabStudy"]'); await p.waitForTimeout(250); await shot('06-study');
    await p.click('[data-act="pick-src"][data-k="all"]');
    await p.click('[data-act="study-start"][data-mode="choice"]'); await p.waitForTimeout(400);
    await shot('07-choice');
    const right = await p.evaluate(() => S.options.findIndex(o => o.id === S.queue[S.idx].w.id));
    await p.click(`.opt >> nth=${right}`); await p.waitForTimeout(350); await shot('08-choice-ok');
    await p.waitForTimeout(900);
    const wrong = await p.evaluate(() => S.options.findIndex(o => o.id !== S.queue[S.idx].w.id));
    await p.click(`.opt >> nth=${wrong}`); await p.waitForTimeout(400); await shot('09-choice-bad');
    await p.evaluate(() => exitSession(true)); await p.waitForTimeout(200);
    await p.evaluate(() => startSession('card', { type: 'all' }, 5)); await p.waitForTimeout(400); await shot('10-card');
    await p.click('#swipeWrap'); await p.waitForTimeout(700); await shot('11-card-back');
    await p.evaluate(() => exitSession(true));
    await p.evaluate(() => startSession('spell', { type: 'all' }, 3)); await p.waitForTimeout(300);
    await p.fill('#typeInput', 'zzz'); await p.click('#typeBtn'); await p.waitForTimeout(400); await shot('12-typing-bad');
    await p.evaluate(() => exitSession(true));
    await p.evaluate(() => startSession('choice', { type: 'all' }, 3)); await p.waitForTimeout(300);
    for (let i = 0; i < 3; i++) { const r = await p.evaluate(() => S.options.findIndex(o => o.id === S.queue[S.idx].w.id)); await p.click(`.opt >> nth=${r}`); await p.waitForTimeout(900); }
    await p.waitForTimeout(500); await shot('13-result');
    await p.click('[data-act="exit-session"] >> nth=-1'); await p.waitForTimeout(300);
    await p.click('.nav-item[data-t="tabBooks"]'); await p.waitForTimeout(200);
    await p.evaluate(() => ACTIONS.match()).catch(() => {});
    await p.evaluate(() => go('tabHome')); await p.evaluate(() => ACTIONS.match()); await p.waitForTimeout(400); await shot('14-match');
    await p.click('[data-mg="x"]');
    await p.evaluate(() => { categories.push({ id: 'cEmpty', name: '빈 단어장', words: [] }); syncStorage(); openBook('cEmpty'); }); await p.waitForTimeout(300); await shot('15-empty-book');
    await p.click('.nav-item[data-t="tabStats"]'); await p.waitForTimeout(250); await shot('16-stats');
    await p.click('[data-act="theme"]'); await p.click('.nav-item[data-t="tabHome"]'); await p.waitForTimeout(300); await shot('17-dark-home');
    await p.evaluate(() => startSession('choice', { type: 'all' }, 3)); await p.waitForTimeout(300);
    const r2 = await p.evaluate(() => S.options.findIndex(o => o.id === S.queue[S.idx].w.id));
    await p.click(`.opt >> nth=${r2}`); await p.waitForTimeout(350); await shot('18-dark-choice');
    await p.evaluate(() => exitSession(true));
    await p.evaluate(() => startSession('card', { type: 'all' }, 3)); await p.waitForTimeout(400); await shot('19-dark-card');
    await p.evaluate(() => exitSession(true));
    all.push(...errs); await ctx.close();
  }

  // ---------- PC ----------
  {
    const { p, ctx, shot, errs } = await setup(b, { width: 1280, height: 800 }, 'd');
    await shot('04-home');
    await p.click('.nav-item[data-t="tabBooks"]'); await p.waitForTimeout(250); await shot('05-books');
    await p.click('#folderContainer .book >> nth=0'); await p.waitForTimeout(250); await shot('06-book');
    await p.click('.nav-item[data-t="tabStudy"]'); await p.waitForTimeout(250); await shot('07-study');
    await p.click('.nav-item[data-t="tabStats"]'); await p.waitForTimeout(250); await shot('08-stats');
    await p.click('.nav-item[data-t="tabSettings"]'); await p.waitForTimeout(250); await shot('09-settings');
    await p.click('.nav-item[data-t="tabHome"]'); await p.click('[data-act="pack-open"]'); await p.waitForTimeout(400); await shot('10-sheet');
    // 키보드: Esc로 시트 닫기
    await p.keyboard.press('Escape'); await p.waitForTimeout(200);
    const sheetOpen = await p.evaluate(() => $('sheetOv').classList.contains('open'));
    // 키보드: 4지선다 숫자키
    await p.evaluate(() => startSession('choice', { type: 'all' }, 5)); await p.waitForTimeout(400);
    await shot('11-choice');
    const r = await p.evaluate(() => S.options.findIndex(o => o.id === S.queue[S.idx].w.id));
    await p.keyboard.press(String(r + 1)); await p.waitForTimeout(350);
    const kbOk = await p.evaluate(() => S.ok);
    await shot('12-choice-ok');
    await p.waitForTimeout(800);
    // Esc로 학습 종료 (확인 대화상자 → Enter)
    await p.keyboard.press('Escape'); await p.waitForTimeout(250);
    const dlg = !!(await p.$('.dlg-ov'));
    await p.keyboard.press('Enter'); await p.waitForTimeout(250);
    const studyOpen = await p.evaluate(() => $('studyScreen').classList.contains('open'));
    // 플래시카드: Space 뒤집기, → 알아요
    await p.evaluate(() => startSession('card', { type: 'all' }, 5)); await p.waitForTimeout(400);
    await p.keyboard.press('Space'); await p.waitForTimeout(650);
    const flipped = await p.evaluate(() => $('fc3d').classList.contains('is-flipped'));
    await shot('13-card-back');
    await p.keyboard.press('ArrowRight'); await p.waitForTimeout(450);
    const cardIdx = await p.evaluate(() => S.idx);
    await p.evaluate(() => exitSession(true));
    // 짝 맞추기, 다크
    await p.evaluate(() => ACTIONS.match()); await p.waitForTimeout(400); await shot('14-match');
    await p.keyboard.press('Escape'); await p.waitForTimeout(200);
    const mgClosed = !(await p.$('#mgOv'));
    await p.click('[data-act="theme"]'); await p.waitForTimeout(300); await shot('15-dark-home');
    await p.click('[data-act="theme"]');
    await p.click('[data-act="logout"]').catch(async () => { await p.click('.nav-item[data-t="tabSettings"]'); await p.click('[data-act="logout"]'); });
    await p.waitForTimeout(400);
    if (await p.$('.dlg-ov')) { await p.click('.dlg [data-d="1"]'); await p.waitForTimeout(400); }
    await shot('16-auth');
    console.log(JSON.stringify({ sheetClosedByEsc: !sheetOpen, numKeyAnswered: kbOk === 1, escAsksConfirm: dlg, studyClosed: !studyOpen, spaceFlips: flipped, arrowAdvances: cardIdx === 1, escClosesMatch: mgClosed }));
    all.push(...errs); await ctx.close();
  }
  console.log('ERRORS:', all.length ? all.join('\n') : 'none');
  await b.close(); srv.close();
})().catch(e => { console.error(e); process.exit(1); });
