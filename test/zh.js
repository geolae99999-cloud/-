// 중국어 전환 테스트: EN/中 스위치, 언어별 단어장 분리, HSK 단어장, 중국어 학습 모드, 중국어 사전, 다시 열었을 때 유지
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, 'site'), shots = path.join(__dirname, 'shots');
fs.mkdirSync(shots, { recursive: true });
const TYPES = { js: 'text/javascript', css: 'text/css', json: 'application/json; charset=utf-8' };
const srv = http.createServer((q, r) => { let f = path.join(root, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html'; fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': TYPES[f.split('.').pop()] || 'text/html; charset=utf-8' }); r.end(d); }); }).listen(8771);
let fails = 0;
const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await require('./undef')(p, errs);
  await p.route('**/fonts.googleapis.com/**', r => r.abort()); await p.route('https://cdn.jsdelivr.net/**', r => r.abort());
  await p.addInitScript(() => { window.__spoken = []; const s = window.speechSynthesis; if (s) { s.speak = u => { window.__spoken.push([u.text, u.lang]); setTimeout(() => u.onend && u.onend(), 5); }; } });
  await p.goto('http://localhost:8771/'); await p.waitForSelector('#authScreen .auth-box');
  await p.click('[data-act="auth-mode"][data-m="signup"]');
  await p.fill('#auId', 'zhtest'); await p.fill('#auPw', 'pass1234'); await p.fill('#auPw2', 'pass1234');
  await p.selectOption('#auGrade', 'm2'); await p.fill('#auName', '김주원'); await p.fill('#auSchool', '한빛중학교'); await p.fill('#auSno', '20315'); await p.check('#auTerms');
  await p.fill('#capIn', await p.evaluate('capText')); await p.click('#auGo');
  await p.waitForSelector('#obOv'); await p.click('[data-ob="skip"]');
  await p.waitForSelector('#ltOv'); await p.click('[data-lt="close"]');
  await p.waitForSelector('#recOv.show'); await p.click('#recOv [data-act="rec-close"]'); await p.waitForTimeout(400);

  // 영어 단어 하나 넣어 두기
  await p.evaluate(() => { categories[0].words.push(sanitizeWord({ word: 'apple', meaning: '사과' })); syncStorage(); });

  // 1) 머리글 스위치로 중국어 전환
  await p.click('#btnLang'); await p.waitForTimeout(300);
  ok(await p.evaluate(() => !!document.querySelector('.lang-splash')), '전환 화면이 떠요');
  await p.screenshot({ path: path.join(shots, 'zh-switch.png') });
  await p.waitForTimeout(1100);
  ok(await p.evaluate(() => LANG === 'zh' && document.body.classList.contains('lang-zh')), '중국어로 바뀜');
  ok(await p.evaluate(() => allWords().length === 0), '중국어 단어장은 영어와 따로 (비어 있음)');
  ok(!(await p.evaluate(() => !!document.getElementById('recOv'))), '학년 추천 창은 중국어에서 안 떠요');
  await p.waitForFunction(() => zhIdx && zhIdx.length > 4900);
  ok(true, 'HSK 목록 ' + await p.evaluate(() => zhIdx.length) + '개 불러옴');
  await p.screenshot({ path: path.join(shots, 'zh-home.png') });

  // 2) HSK 1급 담기
  await p.click('.grade-chip'); await p.waitForSelector('#recList .rec-row');
  ok(await p.evaluate(() => document.getElementById('sheetTitle').textContent.includes('HSK 1급')), 'HSK 1급 목록: ' + await p.locator('#recList .rec-row').count() + '개');
  await p.screenshot({ path: path.join(shots, 'zh-hsk.png') });
  await p.click('[data-act="rec-left-add"]'); await p.waitForTimeout(800);
  const w0 = await p.evaluate(() => JSON.stringify(categories.find(c => c.name === 'HSK 1급 단어').words.find(w => w.word === '学习')));
  console.log('     学习:', w0);
  ok(/xuéxí/.test(w0) && /쉬에시/.test(w0) && /exPy/.test(w0), '병음, 한글 발음, 예문 병음까지 채워짐');
  await p.click('[data-act="sheet-close"]').catch(() => {}); await p.evaluate(() => closeSheet());

  // 3) 단어장 화면
  await p.evaluate(() => { openBook(categories.find(c => c.name === 'HSK 1급 단어').id); });
  await p.waitForTimeout(300);
  await p.click('.wcard .w-main >> nth=0'); await p.waitForTimeout(200);
  await p.screenshot({ path: path.join(shots, 'zh-book.png') });

  // 4) 플래시카드 → 발음은 중국어
  await p.evaluate(() => { window.__spoken = []; startSession('card', { type: 'cat', id: currentCategoryId }, 5); });
  await p.waitForTimeout(400);
  const sp = await p.evaluate(() => window.__spoken.slice(-1)[0]);
  ok(sp && sp[1] === 'zh-CN', '카드 발음 언어: ' + JSON.stringify(sp));
  await p.click('#fc3d'); await p.waitForTimeout(500);
  await p.screenshot({ path: path.join(shots, 'zh-card.png') });
  await p.evaluate(() => exitSession(true));

  // 5) 스펠링: 병음으로, 한자로 답하기
  const spell = await p.evaluate(() => {
    const w = { word: '学习', phonetic: 'xuéxí' };
    return [answerOk('xuexi', w), answerOk('xue2 xi2', w), answerOk('学习', w), answerOk('xuexy', w), answerOk('学', w), answerOk('lü', { word: '绿', phonetic: 'lǜ' }), answerOk('lv', { word: '绿', phonetic: 'lǜ' })].join(',');
  });
  ok(spell === 'true,true,true,false,false,true,true', '병음/한자 채점: ' + spell);
  await p.evaluate(() => startSession('spell', { type: 'cat', id: currentCategoryId }, 3));
  await p.waitForSelector('#typeInput');
  const cur = await p.evaluate(() => S.queue[S.idx].w.phonetic);
  await p.fill('#typeInput', cur.normalize('NFD').replace(/[̀-ͯ]/g, '')); await p.click('#typeBtn'); await p.waitForTimeout(200);
  ok(await p.evaluate(() => !!document.querySelector('.fb.ok')), '스펠링 화면에서 병음으로 정답 처리');
  await p.screenshot({ path: path.join(shots, 'zh-spell.png') });
  await p.evaluate(() => exitSession(true));

  // 6) 철자 퍼즐(한자 조각), 문장 빈칸, 섞어 풀기
  await p.evaluate(() => startSession('scramble', { type: 'cat', id: currentCategoryId }, 3));
  await p.waitForSelector('.scr-t');
  const tiles = await p.evaluate(() => [...document.querySelectorAll('.scr-t')].map(b => b.textContent).join(''));
  ok(/^[㐀-鿿]+$/.test(tiles), '철자 퍼즐 조각이 한자: ' + tiles);
  await p.screenshot({ path: path.join(shots, 'zh-scramble.png') });
  await p.evaluate(() => exitSession(true));
  ok(await p.evaluate(() => { const w = categories.find(c => c.name === 'HSK 1급 단어').words.find(x => x.word === '学习'); const c = clozeOf(w); return !!c && c.hit === '学习'; }), '문장 빈칸 만들기');
  await p.evaluate(() => startSession('mix', { type: 'cat', id: currentCategoryId }, 10));
  await p.waitForTimeout(300); await p.evaluate(() => exitSession(true));
  await p.evaluate(() => startSession('test', { type: 'cat', id: currentCategoryId }, 10));
  ok(await p.evaluate(() => S.queue.some(x => x.t === 'spell')), '실전 시험에 중국어 쓰기 문제도 나와요');
  await p.evaluate(() => exitSession(true));

  // 7) 중국어 사전: 병음, 한글, 한자로 찾기
  await p.evaluate(() => go('tabHome'));
  await p.click('#btnDict'); await p.waitForSelector('#dictQ');
  for (const q of ['xuexi', '공부', '学']) {
    await p.fill('#dictQ', q); await p.waitForTimeout(450);
    const n = await p.locator('#dictOut .dict-row').count();
    ok(n > 0, `사전 '${q}' 찾기: ${n}개`);
  }
  await p.fill('#dictQ', '学习'); await p.waitForTimeout(450);
  ok(await p.evaluate(() => /xuéxí/.test(document.querySelector('#dictOut .dict-card').textContent)), '사전 단어 카드');
  await p.screenshot({ path: path.join(shots, 'zh-dict.png') });
  await p.evaluate(() => closeSheet());

  // 8) 영어로 돌아가기: 영어 단어 그대로
  await p.waitForTimeout(300);
  await p.click('#btnLang'); await p.waitForTimeout(1200);
  ok(await p.evaluate(() => LANG === 'en' && allWords().some(x => x.w.word === 'apple') && !allWords().some(x => x.w.word === '学习')), '영어로 돌아오면 영어 단어장 그대로');
  ok(await p.evaluate(() => { const d = JSON.parse(LS.getItem(KEY_DATA)); return d.categories.length && d.zh.categories.some(c => c.name === 'HSK 1급 단어'); }), '저장본에 두 언어 모두 있음');

  // 9) 설정에서 중국어 → 다시 열어도 유지
  await p.evaluate(() => go('tabSettings')); await p.click('#cfgLang [data-l="zh"]'); await p.waitForTimeout(1200);
  await p.screenshot({ path: path.join(shots, 'zh-settings.png') });
  await p.reload(); await p.waitForTimeout(1500);
  ok(await p.evaluate(() => LANG === 'zh' && allWords().some(x => x.w.word === '学习')), '다시 열어도 중국어 유지');

  // 10) 어두운 화면
  await p.evaluate(() => { config.darkMode = true; applyTheme(); go('tabHome'); }); await p.waitForTimeout(400);
  await p.screenshot({ path: path.join(shots, 'zh-dark-home.png') });

  ok(!errs.length, 'ERRORS: ' + (errs.join('\n') || 'none'));
  await b.close(); srv.close();
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
