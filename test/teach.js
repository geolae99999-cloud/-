// 선생님 가입, 수업 도구, 수업용 큰 화면, 문장 빈칸, 말하기, Day 나누기, 업적
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, 'site'), shots = path.join(__dirname, 'shots', 'teach');
fs.mkdirSync(shots, { recursive: true });
const srv = http.createServer((q, r) => { let f = path.join(root, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html'; fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': f.endsWith('.js') ? 'text/javascript' : f.endsWith('.css') ? 'text/css' : f.endsWith('.json') ? 'application/json' : 'text/html; charset=utf-8' }); r.end(d); }); }).listen(8776);
(async () => {
  const b = await chromium.launch(); const errs = [], res = {};
  for (const vp of [{ width: 390, height: 844 }, { width: 1440, height: 900 }]) {
    const tag = String(vp.width), ctx = await b.newContext({ viewport: vp }), p = await ctx.newPage();
    p.on('pageerror', e => errs.push(tag + ' ' + e.message));
    await p.route('https://cdn.jsdelivr.net/**', r => r.abort());
    await p.addInitScript(() => {
      try { window.speechSynthesis.speak = () => {}; } catch (e) {}
      window.SpeechRecognition = window.webkitSpeechRecognition = function () { const r = this; r.start = () => setTimeout(() => { const w = S.queue[S.idx].w.word; r.onresult({ results: [[{ transcript: window.__say || w }]] }); r.onend(); }, 50); r.abort = () => {}; };
    });
    const shot = n => p.screenshot({ path: path.join(shots, `${tag}-${n}.png`) });
    await p.goto('http://localhost:8776/'); await p.waitForSelector('#authScreen .auth-box');
    await p.click('[data-act="auth-mode"][data-m="signup"]'); await p.waitForTimeout(300);
    res[tag + ' options'] = await p.$$eval('#auGrade optgroup', a => a.map(g => g.label + ':' + g.children.length));
    await p.fill('#auId', 'kimteacher'); await p.fill('#auPw', 'pass1234'); await p.fill('#auPw2', 'pass1234');
    await p.selectOption('#auGrade', 'teacher'); await p.fill('#auName', '김지우'); await p.fill('#auSchool', '한빛중학교'); res[tag + ' sno hidden'] = await p.evaluate(() => getComputedStyle(document.getElementById('auSno')).display === 'none'); await p.check('#auTerms'); await p.fill('#capIn', await p.evaluate('capText'));
    await shot('00-signup'); await p.click('#auGo');
    await p.waitForSelector('#obOv'); await p.click('[data-ob="skip"]'); await p.waitForTimeout(1200);
    res[tag + ' no lt/rec'] = await p.evaluate(() => !document.getElementById('ltOv') && !document.querySelector('#recOv.show'));
    res[tag + ' role'] = await p.evaluate(() => config.role + ' / ' + document.querySelector('.hello-name').textContent + ' / ' + document.querySelector('.grade-chip').textContent);
    await shot('01-home-teacher');
    // 단어 담기
    await p.evaluate(() => recSheet('mid')); await p.waitForTimeout(300); await p.click('[data-act="rec-left-add"]').catch(() => {}); await p.waitForTimeout(600); await p.keyboard.press('Escape'); await p.waitForTimeout(300);
    await p.click('.teach-card[data-next="present"]'); await p.waitForSelector('[data-act="teach-go"]'); await shot('02-pick');
    await p.click('[data-act="teach-go"] >> nth=0'); await p.waitForSelector('#pvOv'); await p.waitForTimeout(200); await shot('03-present');
    await p.keyboard.press(' '); await p.waitForTimeout(300); await shot('04-present-mean');
    await p.keyboard.press('ArrowRight'); await p.waitForTimeout(100);
    res[tag + ' pv'] = await p.evaluate(() => document.querySelector('.pv-n').textContent + ' show:' + !!document.querySelector('.pv-mean'));
    await p.keyboard.press('Escape'); await p.waitForTimeout(200); res[tag + ' pv closed'] = await p.evaluate(() => !document.getElementById('pvOv'));
    // 문장 빈칸
    await p.evaluate(() => startSession('cloze', { type: 'all' }, 5)); await p.waitForTimeout(400); await shot('05-cloze');
    res[tag + ' cloze'] = await p.evaluate(() => (document.querySelector('.cloze-s') || {}).textContent || 'fallback');
    for (let i = 0; i < 5; i++) { const o = await p.$('.opt:not([disabled])'); if (!o) break; await o.click(); await p.waitForTimeout(1700); }
    await p.evaluate(() => exitSession(true));
    // 말하기
    await p.evaluate(() => startSession('speak', { type: 'all' }, 3)); await p.waitForTimeout(400); await shot('06-speak');
    await p.evaluate(() => { window.__say = 'banana'; }); await p.click('#micBtn'); await p.waitForTimeout(300);
    res[tag + ' speak wrong'] = await p.textContent('#spkOut');
    await p.evaluate(() => { window.__say = ''; }); await p.click('#micBtn'); await p.waitForTimeout(300);
    res[tag + ' speak ok'] = await p.textContent('#spkOut'); await shot('07-speak-ok');
    await p.waitForTimeout(1000); res[tag + ' speak next'] = await p.textContent('#stCount');
    await p.evaluate(() => exitSession(true));
    // Day 나누기
    await p.evaluate(() => { currentCategoryId = categories.find(c => c.words.length >= 20).id; ACTIONS['book-split'](); }); await p.waitForSelector('#spN');
    await p.click('[data-act="split-go"]'); await p.waitForTimeout(300);
    res[tag + ' split'] = await p.evaluate(() => categories.filter(c => / Day \d+$/.test(c.name)).map(c => c.name.replace(/.* Day/, 'Day') + ':' + c.words.length).join(','));
    await p.click('.nav-item[data-t="tabStats"]'); await p.waitForTimeout(300); await shot('08-stats');
    res[tag + ' badges'] = await p.$$eval('.bdg.on b', a => a.map(x => x.textContent));
    await p.click('.nav-item[data-t="tabStudy"]'); await p.waitForTimeout(300); await shot('09-study');
    await p.click('.nav-item[data-t="tabSettings"]'); await p.waitForTimeout(300);
    res[tag + ' cfgGrade'] = await p.inputValue('#cfgGrade');
    res[tag + ' profile'] = await p.evaluate(() => JSON.stringify(config.profile) + ' / ' + document.getElementById('pfSchool').value);
    await p.fill('#pfName', '박선생'); await p.click('[data-act="pf-save"]'); await p.click('.nav-item[data-t="tabHome"]'); await p.waitForTimeout(300);
    res[tag + ' hello'] = await p.evaluate(() => document.querySelector('.hello-name').textContent + ' | ' + (document.querySelector('.hello-school') || {}).textContent);
    // 기존 계정: 정보가 비어 있으면 로그인할 때 입력 창
    await p.evaluate(() => { config.profile = { name: '', school: '', sno: '' }; config.role = ''; config.grade = 'm2'; syncStorage(); });
    await p.evaluate(() => ACTIONS.logout()); await p.waitForSelector('#authScreen .auth-box #auId');
    await p.fill('#auId', 'kimteacher'); await p.fill('#auPw', 'pass1234'); await p.click('#auGo');
    await p.waitForSelector('#pfOv'); await shot('10-profile-ask');
    await p.keyboard.press('Escape'); res[tag + ' pf stays'] = await p.evaluate(() => !!document.getElementById('pfOv'));
    await p.fill('#pqName', '이민수'); await p.fill('#pqSchool', '한빛중학교'); await p.click('[data-act="pq-save"]');
    res[tag + ' pf need sno'] = await p.textContent('#pqMsg');
    await p.fill('#pqSno', '20315'); await p.click('[data-act="pq-save"]'); await p.waitForTimeout(300);
    res[tag + ' pf saved'] = await p.evaluate(() => !document.getElementById('pfOv') + ' ' + JSON.stringify(config.profile) + ' ' + document.querySelector('.hello-school').textContent);
    await ctx.close();
  }
  console.log(JSON.stringify(res, null, 1)); console.log('ERRORS:', errs.length ? errs.join('\n') : 'none'); await b.close(); srv.close();
})().catch(e => { console.error(e); process.exit(1); });
