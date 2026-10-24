// 맞춤 코스: 목적 · 수준 · 하루 학습량을 고르면 매일 새 단어를 담고, 목적에 맞는 순서로 학습해요
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, 'site');
const srv = http.createServer((q, r) => { let f = path.join(root, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html'; fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': /\.m?js$/.test(f) ? 'text/javascript' : f.endsWith('.css') ? 'text/css' : f.endsWith('.json') ? 'application/json' : 'text/html; charset=utf-8' }); r.end(d); }); }).listen(8797);
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
(async () => {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] }), errs = [];
  for (const width of [390, 1440]) {
    const p = await (await b.newContext({ viewport: { width, height: 900 } })).newPage();
    p.on('pageerror', e => errs.push(width + ': ' + e.message));
    await p.addInitScript(() => { speechSynthesis.speak = u => setTimeout(() => { u.onstart && u.onstart(); setTimeout(() => u.onend && u.onend(), 10); }, 5); });
    await p.goto('http://localhost:8797/'); await p.waitForSelector('#authScreen .auth-box');
    await p.click('[data-act="auth-mode"][data-m="signup"]'); await p.waitForTimeout(200);
    await p.fill('#auId', 'mcuser'); await p.fill('#auPw', 'pass1234'); await p.fill('#auPw2', 'pass1234');
    await p.click('#auNext'); await p.waitForSelector('#auGrade', { state: 'attached' }); await p.evaluate(g => { document.getElementById('auGrade').value = g; }, 'h1'); await p.fill('#auName', '김지우'); await p.fill('#auSchool', '한빛고등학교'); await p.fill('#auSno', '10315'); await p.check('#auTerms');
    await p.fill('#capIn', await p.evaluate('capText')); await p.click('#auGo');
    await p.waitForSelector('#obOv'); await p.click('[data-ob="skip"]'); await p.waitForSelector('#ltOv');
    // 레벨 테스트 결과에서 바로 맞춤 코스로
    await p.click('[data-lt="start"]');
    for (let i = 0; i < 12; i++) { await p.waitForSelector('#ltOv .opt'); const v = await p.evaluate(() => LT.qs[LT.i].m); await p.click(`#ltOv .opt[data-v="${v}"]`); await p.waitForTimeout(520); }
    await p.waitForSelector('[data-lt="course"]');
    ok(/맞춤 코스|코스 만들기/.test(await p.textContent('[data-lt="course"]')), width + ' 레벨 테스트 결과에 코스 만들기 버튼');
    await p.click('[data-lt="course"]'); await p.waitForSelector('#mcOv .mc-grid');
    ok(!(await p.$('#ltOv')), width + ' 레벨 테스트 창은 닫혀요');
    // 1단계 목적
    ok(await p.$eval('#mcOv [data-mc="next"]', e => e.disabled), width + ' 목적을 고르기 전엔 다음 버튼 꺼짐');
    await p.click('#mcOv [data-mc="goal"][data-v="travel"]'); await p.click('#mcOv [data-mc="next"]');
    // 2단계 수준: 테스트 결과가 골라져 있어요
    await p.waitForSelector('#mcOv .mc-lv');
    ok(await p.$('#mcOv [data-mc="lv"].on'), width + ' 수준은 테스트 결과로 골라져 있어요');
    await p.click('#mcOv [data-mc="lv"][data-v="1"]'); await p.click('#mcOv [data-mc="next"]');
    // 3단계 하루 학습량
    await p.click('#mcOv [data-mc="daily"][data-v="5"]');
    ok(/귀로 익히기/.test(await p.textContent('#mcOv')), width + ' 여행 영어는 듣기 위주 순서 안내');
    await p.click('#mcOv [data-mc="done"]');
    await p.waitForFunction(() => S && S.active && S.mode === 'card');
    const st = await p.evaluate(() => ({ n: S.queue.length, course: config.course, cat: (categories.find(c => c.id === config.course.catId) || {}).name, life: gradeWords('life', true).slice(0, 40).map(e => e.w.toLowerCase()), q: S.queue.map(x => x.w.word.toLowerCase()) }));
    ok(st.n === 5 && st.course.day === 1 && st.course.ids.length === 5 && /여행 영어/.test(st.cat), width + ' 오늘 새 단어 5개를 코스 단어장에 담고 카드부터 ' + JSON.stringify({ n: st.n, day: st.course.day, cat: st.cat }));
    ok(st.q.every(w => st.life.includes(w)), width + ' 여행 영어 단어(생활 · 여행)에서 골라요 ' + st.q.join(','));
    // 카드 5장을 넘기면 다음 단계 버튼
    for (let i = 0; i < 5; i++) { await p.waitForSelector('[data-act="fly"][data-dir="1"]'); await p.click('[data-act="fly"][data-dir="1"]'); await p.waitForTimeout(330); }
    await p.waitForSelector('[data-act="mc-next"]');
    ok(/귀로 익히기/.test(await p.textContent('[data-act="mc-next"]')), width + ' 결과 화면: 다음 단계(귀로 익히기)');
    ok((await p.evaluate(() => config.course.step)) === 1, width + ' 1단계 완료 저장');
    await p.click('[data-act="mc-next"]');
    await p.waitForFunction(() => S && S.active && S.mode === 'lchoice' && S.queue.length === 5);
    ok(true, width + ' 2단계 듣고 고르기 시작');
    await p.evaluate(() => exitSession(true)); await p.waitForTimeout(300);
    // 홈 카드: Day 1, 2단계 진행 중
    await p.evaluate(() => go('tabHome')); await p.waitForSelector('.mc-card');
    const home = await p.evaluate(() => ({ t: document.querySelector('.mc-card').innerText, done: document.querySelectorAll('.mc-steps li.done').length, now: document.querySelectorAll('.mc-steps li.now').length, vis: document.querySelector('.mc-card').getBoundingClientRect().width > 200 }));
    ok(/Day 1/.test(home.t) && home.done === 1 && home.now === 1 && /2단계 이어서/.test(home.t) && home.vis, width + ' 홈 카드에 진행 상황 ' + JSON.stringify(home).slice(0, 160));
    // 다음 날이 되면 새 단어 5개가 더 담겨요(Day 2), 어제 단어와 겹치지 않아요
    const y = await p.evaluate(async () => { const old = config.course.ids.slice(); config.course.last = '2000-01-01'; await mcToday(); return { day: config.course.day, n: config.course.ids.length, overlap: config.course.ids.some(i => old.includes(i)), step: config.course.step, total: categories.find(c => c.id === config.course.catId).words.length }; });
    ok(y.day === 2 && y.n === 5 && !y.overlap && y.step === 0 && y.total === 10, width + ' 다음 날 새 단어 5개 (Day 2) ' + JSON.stringify(y));
    // 저장 후 다시 불러와도 코스가 남아요
    await p.reload(); await p.waitForSelector('.mc-card');
    ok(/Day 2/.test(await p.textContent('.mc-card')) || /Day/.test(await p.textContent('.mc-card')), width + ' 새로고침해도 코스 유지');
    // 대화 목적으로 바꾸면 말하기 문장 묶음에서 담아요
    await p.click('.mc-card [data-act="mc-open"]'); await p.waitForSelector('#mcOv');
    await p.click('#mcOv [data-mc="goal"][data-v="talk"]'); await p.click('#mcOv [data-mc="next"]'); await p.click('#mcOv [data-mc="next"]'); await p.click('#mcOv [data-mc="done"]');
    await p.waitForFunction(() => S && S.active);
    const t = await p.evaluate(() => ({ goal: config.course.goal, ex: S.queue.filter(x => x.w.example).length, n: S.queue.length, cat: categories.find(c => c.id === config.course.catId).name }));
    ok(t.goal === 'talk' && t.n === 5 && t.ex >= 3 && /외국인과 대화/.test(t.cat), width + ' 외국인과 대화: 예문 있는 문장 묶음 단어 ' + JSON.stringify(t));
    await p.evaluate(() => exitSession(true));
    await p.context().close();
  }
  console.log('ERRORS:', errs.length ? errs.join('\n') : 'none'); await b.close(); srv.close();
  console.log(fails || errs.length ? 'SOME FAILED' : 'ALL OK'); process.exit(fails || errs.length ? 1 : 0);
})();
