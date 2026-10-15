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
  await p.addInitScript(() => { window.__spoken = []; const s = window.speechSynthesis; if (s) { s.speak = u => { window.__spoken.push([u.text, u.lang]); setTimeout(() => { u.onstart && u.onstart(); u.onend && u.onend(); }, 5); }; } });
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
  await p.click('#btnDict:visible, .hd-search:visible'); await p.waitForSelector('#dictQ');
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

  // 11) 단어 추가: 병음으로 쓰면 한자를 찾아 채워요(같은 병음이 여럿이면 골라요)
  await p.evaluate(() => { config.darkMode = false; applyTheme(); openBook(categories.find(c => c.lang === 'zh' || true).id); });
  await p.click('.fab'); await p.waitForSelector('#fieldWord');
  await p.fill('#fieldWord', 'pengyou'); await p.click('#btnRunAi');
  await p.waitForFunction(() => $('fieldWord').value === '朋友' && $('fieldMeaning').value, null, { timeout: 8000 });
  ok(await p.evaluate(() => $('fieldWord').value === '朋友' && !!$('fieldMeaning').value && /péngyou|péng/.test($('fieldPhonetic').value)), '병음 pengyou -> 朋友 + 뜻 · 병음 채움 ' + await p.evaluate(() => $('fieldMeaning').value + ' ' + $('fieldPhonetic').value));
  await p.fill('#fieldWord', 'shi'); await p.click('#btnRunAi'); await p.waitForSelector('.py-pick');
  const picks = await p.$$eval('.py-pick b', a => a.map(x => x.textContent));
  ok(picks.length > 1 && picks.includes('是'), '같은 병음(shi)은 골라요: ' + picks.join(' '));
  await p.screenshot({ path: path.join(shots, 'zh-pinyin-pick.png') });
  await p.click('.py-pick:has-text("是")'); await p.waitForFunction(() => $('fieldWord').value === '是' && $('fieldMeaning').value, null, { timeout: 8000 });
  ok(true, '고르면 그 한자로 채워요');
  await p.fill('#fieldWord', 'xué xí'); await p.fill('#fieldMeaning', ''); await p.click('#btnRunAi');
  await p.waitForFunction(() => $('fieldWord').value === '学习', null, { timeout: 8000 });
  ok(true, '성조 부호 · 띄어쓰기 병음(xué xí) -> 学习');
  await p.fill('#fieldWord', 'qqqzz'); await p.click('#btnRunAi'); await p.waitForTimeout(800);
  ok(/찾지 못했어요/.test(await p.textContent('#aiState')), '없는 병음은 안내');
  await p.evaluate(() => closeSheet && closeSheet());
  // 12) 중국어 말하기 문장 (초 · 중 · 고): 책장 · 홈 줄 · 담으면 문장 · 병음 · 해석이 예문으로 들어가요
  await p.evaluate(() => go('tabHome')); await p.waitForFunction(() => document.querySelectorAll('.shelf-b[data-g^="zs-"]').length === 4, null, { timeout: 8000 });
  ok(await p.evaluate(() => /sentences/.test(document.querySelector('.shelf-b[data-g="zs-2"]').textContent)), '책장에 말하기 하 · 중 · 상 · 최상');
  ok(await p.evaluate(() => /중국어 말하기 문장 \(하 · 중 · 상 · 최상\)[\s\S]*문장 139개/.test(document.querySelector('.tool-list').textContent)), '홈 줄: 말하기 문장 139개');
  await p.click('.shelf-b[data-g="zs-2"]'); await p.waitForSelector('#recList .rec-row.zs');
  const zs = await p.evaluate(() => ({ t: $('sheetTitle').textContent, n: document.querySelectorAll('#recList .rec-row').length, ex: document.querySelector('#recList .rec-ex').textContent, tabs: [...document.querySelectorAll('.rec-tab-row .chip')].map(x => x.textContent).join(',') }));
  ok(zs.t === '중국어 말하기 · 중 문장 39' && zs.n === 39 && /。/.test(zs.ex) && zs.tabs === '하,중,상,최상', '난이도 중 문장 39개 + 병음 · 해석 ' + JSON.stringify(zs));
  await p.screenshot({ path: path.join(shots, 'zh-speak-sheet.png') });
  await p.click('[data-act="rec-left-add"]'); await p.waitForTimeout(600);
  const zb = await p.evaluate(() => { const c = categories.find(x => x.name === '중국어 말하기 · 중'); const w = c && c.words[0]; return c && { n: c.words.length, lang: c.lang || LANG, w: w.word, p: w.phonetic, ex: w.example, py: w.exPy, ko: w.exampleKo }; });
  ok(zb && zb.n === 39 && zb.ex && zb.ex.includes(zb.w) && zb.py && zb.ko && zb.p, '담으면 단어장에 문장 · 병음 · 해석 ' + JSON.stringify(zb));
  // 이미 다른 단어장에 있는 단어도 말하기 단어장에는 문장과 함께 담겨요
  ok(await p.evaluate(() => { const c = categories.find(x => x.name === '중국어 말하기 · 중'); return c.words.some(w => w.word === '学习') || !gradeWords('zs-2').some(e => e.w === '学习'); }), '다른 단어장에 있는 단어도 따로 담음');
  ok(await p.evaluate(() => /0개 모두 담기/.test(document.querySelector('[data-act="rec-left-add"]').textContent)), '다 담으면 남은 0개');
  // 발음 평가 문항: 문장 + 병음(5번째 칸), 학생 화면에 병음 표시
  const items = await p.evaluate(() => { const cat = categories.find(x => x.name === '중국어 말하기 · 중'); return cat.words.slice(0, 2).map(w => { const s = true && w.example, py = LANG === 'zh' ? ((s ? w.exPy : w.phonetic) || '').slice(0, 200) : ''; const it = s ? [w.example.slice(0, 200), (w.exampleKo || w.meaning || '').slice(0, 160), LANG, 's'] : [w.word, w.meaning, LANG, 'w']; if (py) it.push(py); return it; }); });
  ok(items[0].length === 5 && items[0][2] === 'zh' && items[0][3] === 's' && /[āáǎàēéěèīíǐìōóǒòūúǔù]/.test(items[0][4]), '문항 모양 ' + JSON.stringify(items[0]));
  // 단어 추가 · 문장 탭: 한 줄에 한 문장, 해석 · 병음 채워 저장
  await p.evaluate(() => { closeSheet(); openBook(categories.find(x => x.name === '중국어 말하기 · 중').id); }); await p.waitForTimeout(300);
  await p.click('.fab'); await p.waitForSelector('#fieldWord'); await p.click('[data-act="add-tab"][data-t="sent"]');
  await p.fill('#sentText', '我不去学校。\n一个人也可以学习汉语。'); await p.click('#btnSentFill'); await p.waitForSelector('.sent-row >> nth=1', { timeout: 15000 });
  const sr = await p.$$eval('.sent-row', a => a.map(r => [r.querySelector('b').textContent, r.querySelector('.sent-py').value, r.querySelector('.sent-ko').value]));
  ok(sr.length === 2 && sr[0][1] === 'Wǒ bú qù xuéxiào.' && ['Yí gèrén yě kěyǐ xuéxí Hànyǔ.', 'Yí ge rén yě kěyǐ xuéxí Hànyǔ.'].includes(sr[1][1]) && sr.every(x => x[2]), '문장 병음 자동(不·一 성조 변화) + 해석 ' + JSON.stringify(sr));
  await p.screenshot({ path: path.join(shots, 'zh-add-sentence.png') });
  await p.click('#btnSentSave'); await p.waitForTimeout(300);
  const sw = await p.evaluate(() => curCat().words.slice(0, 2).map(w => [w.word, w.meaning, w.phonetic, sentLike(w.word)]));
  ok(sw.length === 2 && sw[0][0] === '我不去学校。' && sw[1][0] === '一个人也可以学习汉语。' && sw.every(x => x[1] && x[2] && x[3]), '문장을 단어처럼 저장 · 문장으로 인식 ' + JSON.stringify(sw));
  ok(await p.evaluate(() => !sentLike('学习') && !sentLike('apple') && sentLike('I like it.') && sentLike('你好吗？')), '단어는 단어, 문장은 문장');
  await p.evaluate(() => closeSheet());
  // 학생 녹음 화면: 문장 아래 병음
  await p.evaluate(its => { closeSheet(); openSheet('말하기', ''); SP = { a: { id: 1, title: '말하기', words: its }, items: its, i: 0, mine: {}, local: {}, raw: {}, submitted: false, view: 'rec', rec: null, busy: null, note: '' }; spDraw(); }, items);
  await p.waitForSelector('.sp-py');
  ok(await p.evaluate(() => $('sheetBody').querySelector('.sp-text').textContent === '认识你很高兴。' && $('sheetBody').querySelector('.sp-py').textContent === 'Rènshi nǐ hěn gāoxìng.'), '학생 화면: 문장 아래 병음');
  await p.waitForTimeout(300); await p.screenshot({ path: path.join(shots, 'zh-speak-student.png') });
  await p.evaluate(() => { SP = null; closeSheet(); });
  await p.evaluate(() => closeSheet && closeSheet());
  // 10) 어두운 화면
  await p.evaluate(() => { config.darkMode = true; applyTheme(); go('tabHome'); }); await p.waitForTimeout(400);
  await p.screenshot({ path: path.join(shots, 'zh-dark-home.png') });

  ok(!errs.length, 'ERRORS: ' + (errs.join('\n') || 'none'));
  await b.close(); srv.close();
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
