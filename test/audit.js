// 전체 점검: 화면마다 보이는 버튼(data-act)을 하나씩 눌러 보고 자바스크립트 오류가 나는지 봐요. (영어, 중국어 둘 다)
// 새 기능도 확인: 읽어주기 설정(속도·높이·목소리), 듣기 모드 속도, 한글 뜻으로 영어 찾기, 번역기, 신HSK 단어장
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, 'site'), shots = path.join(__dirname, 'shots');
fs.mkdirSync(shots, { recursive: true });
const TYPES = { js: 'text/javascript', css: 'text/css', json: 'application/json; charset=utf-8' };
const srv = http.createServer((q, r) => { let f = path.join(root, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html'; fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': TYPES[f.split('.').pop()] || 'text/html; charset=utf-8' }); r.end(d); }); }).listen(8772);
let fails = 0;
const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
// 누르면 지워지거나, 파일 창·인쇄·다른 화면으로 나가는 버튼은 건너뛰어요.
const SKIP = new Set(['acct-del', 'reset-all', 'book-del', 'del-word', 'cl-delete', 'cl-kick', 'cl-leave', 'cl-adel', 'logout', 'import-json', 'csv-import', 'export-json', 'csv-export', 'book-print', 'pt-go', 'share-send', 'share-copy', 'auth-go', 'pw-change', 'test-conn', 'ai-fill', 'dict-ai', 'bulk-run', 'fill-exko', 'form-exko', 'lang', 'lang-set', 'install']);
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const p = await ctx.newPage();
  let where = 'start';
  const errs = []; p.on('pageerror', e => errs.push(where + ': ' + e.message));
  await require('./undef')(p, errs);
  await p.route('**/fonts.googleapis.com/**', r => r.abort()); await p.route('https://cdn.jsdelivr.net/**', r => r.abort());
  await p.route('https://translate.googleapis.com/**', r => {
    const u = new URL(r.request().url()), q = u.searchParams.get('q'), tl = u.searchParams.get('tl');
    const t = tl === 'ko' ? { book: '책', 'I have a book.': '나는 책이 있다.' }[q] || '번역' : tl === 'en' ? { '사과': 'apple' }[q] || 'translation' : '苹果';
    const bd = q === 'book' ? [['명사', ['책', '서적', '장부'], [], 'book', 1], ['동사', ['예약하다'], [], 'book', 2]] : q === '사과' ? [['명사', ['apple', 'apology'], [], '사과', 1]] : null;
    r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify([[[t, q, null, null, 10]], bd, tl === 'ko' ? 'en' : 'ko']) });
  });
  await p.route('https://api.mymemory.translated.net/**', r => r.abort());
  await p.addInitScript(() => {
    window.__spoken = [];
    const s = window.speechSynthesis;
    const V = [['Google US English', 'en-US'], ['Microsoft Guy Online (Natural) - English (United States)', 'en-US'], ['Microsoft Aria Online (Natural) - English (United States)', 'en-US'], ['Google 한국의', 'ko-KR'], ['Microsoft InJoon Online (Natural) - Korean (Korea)', 'ko-KR'], ['Microsoft SunHi Online (Natural) - Korean (Korea)', 'ko-KR'], ['Google 普通话（中国大陆）', 'zh-CN']].map(([name, lang]) => ({ name, lang, voiceURI: name, localService: false, default: false }));
    window.SpeechSynthesisUtterance = class { constructor(t) { this.text = t; this.lang = ''; this.rate = 1; this.pitch = 1; this.voice = null; } };
    if (s) { s.getVoices = () => V; s.speak = u => { window.__spoken.push([u.text, u.lang, u.voice && u.voice.name, u.rate, u.pitch]); setTimeout(() => { u.onstart && u.onstart(); u.onend && u.onend(); }, 5); }; }
    window.print = () => {};
  });
  await p.goto('http://localhost:8772/'); await p.waitForSelector('#authScreen .auth-box');
  await p.click('[data-act="auth-mode"][data-m="signup"]');
  await p.fill('#auId', 'audit1'); await p.fill('#auPw', 'pass1234'); await p.fill('#auPw2', 'pass1234');
  await p.selectOption('#auGrade', 'm2'); await p.fill('#auName', '김주원'); await p.fill('#auSchool', '한빛중학교'); await p.fill('#auSno', '20315'); await p.check('#auTerms');
  await p.fill('#capIn', await p.evaluate('capText')); await p.click('#auGo');
  await p.waitForSelector('#obOv'); await p.click('[data-ob="skip"]');
  await p.waitForSelector('#ltOv'); await p.click('[data-lt="close"]');
  await p.waitForSelector('#recOv.show'); await p.click('#recOv [data-act="rec-close"]'); await p.waitForTimeout(400);
  await p.evaluate(() => { const ws = [['apple', '사과'], ['book', '책; 예약하다'], ['happy', '행복한'], ['run', '달리다'], ['river', '강']]; ws.forEach(([w, m]) => categories[0].words.push(sanitizeWord({ word: w, meaning: m, example: `I like the ${w}.`, exampleKo: '예문' }))); syncStorage(); });

  // 오늘의 학습 아이콘이 제대로 그려져요 (undefined 글자가 아니라 그림)
  await p.evaluate(() => go('tabHome')); await p.waitForTimeout(200);
  ok(await p.evaluate(() => { const e = document.querySelector('.today-entry .mg-ico'); return !!e && !!e.querySelector('svg') && !/undefined/.test(e.textContent); }), '오늘의 학습 아이콘');
  ok(await p.evaluate(() => !/undefined/.test(document.body.innerText)), '홈 화면에 undefined 글자 없음');

  // 1) 읽어주기 설정
  await p.evaluate(() => go('tabSettings')); await p.waitForSelector('#ttsBox .tts-row');
  await p.click('[data-act="tts-step"][data-k="ttsRate"][data-d="1"]');
  ok(await p.evaluate(() => Math.abs(config.ttsRate - 0.95) < 1e-9), '속도 + 버튼 0.05씩: ' + await p.evaluate('config.ttsRate'));
  await p.$eval('#tts_ttsRate', el => { el.value = '1.35'; el.dispatchEvent(new Event('input', { bubbles: true })); });
  ok(await p.evaluate(() => config.ttsRate === 1.35 && document.getElementById('tts_ttsRateV').textContent === '1.35x'), '속도 슬라이더 1.35x');
  await p.click('[data-act="tts-chip"][data-k="koRate"][data-v="1.2"]');
  await p.$eval('#tts_ttsPitch', el => { el.value = '1.1'; el.dispatchEvent(new Event('input', { bubbles: true })); });
  await p.evaluate(() => { window.__spoken = []; }); await p.click('[data-act="tts-try"][data-l="all"]'); await p.waitForTimeout(1200);
  const sp = await p.evaluate(() => window.__spoken);
  console.log('     미리 듣기:', JSON.stringify(sp));
  ok(sp.length === 2 && sp[0][3] === 1.35 && sp[1][3] === 1.2 && sp[0][4] === 1.1, '단어는 1.35x, 뜻은 1.2x, 높이 1.1');
  ok(/Google/.test(sp[0][2]) && /Google/.test(sp[1][2]), '뜻도 단어와 같은 회사 목소리: ' + sp.map(x => x[2]).join(' / '));
  await p.selectOption('[data-change="tts-voice"][data-l="en"]', 'Microsoft Guy Online (Natural) - English (United States)'); await p.waitForTimeout(300);
  await p.evaluate(() => { window.__spoken = []; }); await p.click('[data-act="tts-try"][data-l="all"]'); await p.waitForTimeout(1200);
  const sp2 = await p.evaluate(() => window.__spoken.map(x => x[2]));
  ok(/Guy/.test(sp2[0]) && /InJoon/.test(sp2[1]), '남자 영어 목소리면 뜻도 남자 한국어 목소리: ' + sp2.join(' / '));
  await p.screenshot({ path: path.join(shots, 'audit-tts.png'), fullPage: false });
  await p.evaluate(() => document.getElementById('ttsBox').scrollIntoView()); await p.waitForTimeout(200);
  await p.screenshot({ path: path.join(shots, 'audit-tts2.png') });
  await p.reload(); await p.waitForTimeout(1500);
  ok(await p.evaluate(() => config.ttsRate === 1.35 && config.koRate === 1.2 && config.voice.en.includes('Guy')), '다시 열어도 읽어주기 설정 유지');

  // 2) 듣기 모드: 같은 목소리로, 속도 바꾸기
  await p.evaluate(() => { window.__spoken = []; startSession('listen', { type: 'all' }, 3); }); await p.waitForTimeout(600);
  await p.screenshot({ path: path.join(shots, 'audit-listen.png') });
  await p.click('[data-act="l-rate"][data-v="0.8"]');
  ok(await p.evaluate(() => config.ttsRate === 0.8 && /0\.80x/.test(document.querySelector('.l-speed b').textContent)), '듣기 화면에서 속도 0.8x');
  await p.evaluate(() => exitSession(true));

  // 3) 한글 뜻으로 영어 사전 찾기
  await p.evaluate(() => go('tabHome')); await p.click('#btnDict:visible, .hd-search:visible'); await p.waitForSelector('#dictQ');
  await p.fill('#dictQ', '사과'); await p.waitForFunction(() => document.querySelectorAll('#dictOut .dict-row').length > 0, null, { timeout: 15000 });
  const rows = await p.evaluate(() => [...document.querySelectorAll('#dictOut .dict-row b')].slice(0, 5).map(x => x.textContent));
  ok(rows[0] === 'apple' || rows.includes('apple'), "'사과' → " + rows.join(', '));
  await p.fill('#dictQ', '행복한'); await p.waitForTimeout(500);
  const rows2 = await p.evaluate(() => [...document.querySelectorAll('#dictOut .dict-row b')].slice(0, 5).map(x => x.textContent));
  ok(rows2.includes('happy'), "'행복한' → " + rows2.join(', '));
  await p.screenshot({ path: path.join(shots, 'audit-dict-ko.png') });
  await p.click('#dictOut .dict-row'); await p.waitForTimeout(400);
  ok(await p.evaluate(() => !!document.querySelector('#dictOut .dict-card')), '찾은 단어 누르면 사전 카드');
  await p.evaluate(() => closeSheet());

  // 4) 번역기
  await p.evaluate(() => openTranslator()); await p.fill('#trIn', 'book'); await p.click('#trGo');
  await p.waitForSelector('#trOut .tr-text');
  ok(await p.evaluate(() => document.querySelector('#trOut .tr-text').textContent === '책' && /Google/.test(document.querySelector('.tr-lang').textContent)), '영→한 번역');
  ok(await p.evaluate(() => document.querySelectorAll('#trOut .tr-alt').length === 2 && !!document.querySelector('#trOut .tr-dict')), '다른 뜻과 사전 뜻도 보여줌');
  await p.screenshot({ path: path.join(shots, 'audit-tr.png') });
  await p.fill('#trIn', '사과'); await p.click('#trGo'); await p.waitForTimeout(600);
  ok(await p.evaluate(() => document.querySelector('#trOut .tr-text').textContent === 'apple' && !!document.querySelector('[data-act="tr-pick"]')), '한→영 번역, 다른 단어 고르기');
  await p.evaluate(() => closeTranslator());

  // 5) 버튼 하나씩 눌러 보기
  // 열린 창 닫기: 닫기 버튼을 눌러서(게임 타이머도 멈추게), 그래도 남으면 치워요.
  const CLEAN = `(() => { try { closeSheet(); } catch (e) {} for (let k = 0; k < 3; k++) { const ov = [...document.querySelectorAll('[id$="Ov"]:not(#sheetOv), .dlg-ov, .lang-splash, .vid-ov')].filter(x => x.isConnected); if (!ov.length) break; ov.forEach(o => { const c = o.querySelector('[aria-label="닫기"], [data-act$="close"], [data-d="0"], [data-fl="close"], [data-mg="close"], [data-rn="close"]'); if (c) c.click(); else o.remove(); }); } document.querySelectorAll('[id$="Ov"]:not(#sheetOv), .dlg-ov').forEach(o => o.remove()); if (S.active) exitSession(true); })()`;
  async function sweep(label) {
    let n = 0;
    for (const tab of ['tabHome', 'tabBooks', 'tabStats', 'tabSettings']) {
      await p.evaluate(CLEAN); await p.evaluate(t => go(t), tab);
      await p.waitForTimeout(150);
      const acts = await p.evaluate(sk => { const seen = new Set(); return [...document.querySelectorAll('[data-act]')].filter(e => e.offsetParent && !sk.includes(e.dataset.act)).map(e => { const k = e.dataset.act + '|' + (e.dataset.k || e.dataset.g || e.dataset.m || e.dataset.l || e.dataset.v || e.dataset.id || ''); if (seen.has(k)) return null; seen.add(k); return k; }).filter(Boolean); }, [...SKIP]);
      console.log('     ', label, tab, acts.length, acts.slice(0, 40).join(' '));
      for (const k of acts) {
        const [act, sub] = k.split('|');
        where = `${label} ${tab} ${act} ${sub}`;
        await p.evaluate(CLEAN); await p.evaluate(t => { if (curTab !== t) go(t); }, tab);
        await p.waitForTimeout(60);
        const el = await p.evaluateHandle(([a, s]) => [...document.querySelectorAll(`[data-act="${a}"]`)].find(e => e.offsetParent && (!s || [e.dataset.k, e.dataset.g, e.dataset.m, e.dataset.l, e.dataset.v, e.dataset.id].includes(s))) || null, [act, sub]);
        if (!(await el.evaluate(e => !!e))) continue;
        try { await el.asElement().click({ timeout: 1500 }); n++; } catch (e) { { const m = String(e.message).match(/<[^>]*> (from <[^>]*>)? *(subtree )?intercepts[^\n]*/); console.log('      (못 누름)', where, m ? m[0].slice(0, 200) : String(e.message).slice(0, 120)); } }
        await p.waitForTimeout(220);
        if (process.env.DBG) console.log('      top:', act, await p.evaluate(() => { const e = document.elementFromPoint(195, 420); return e ? (e.id || '') + '.' + e.className + ' < ' + (e.parentElement && (e.parentElement.id + '.' + e.parentElement.className)) : '-'; }));
        // 열린 창 안의 버튼도 한 번씩
        const inner = await p.evaluate(sk => [...document.querySelectorAll('.sheet [data-act], #studyScreen.open [data-act], [id$="Ov"] [data-act]')].filter(e => e.offsetParent && !sk.includes(e.dataset.act)).slice(0, 6).map(e => e.dataset.act), [...SKIP, 'sheet-close', 'exit-session']);
        for (const ia of inner) {
          where = `${label} ${tab} ${act} > ${ia}`;
          const h = await p.$(`.sheet [data-act="${ia}"], #studyScreen.open [data-act="${ia}"], [id$="Ov"] [data-act="${ia}"]`);
          if (h && await h.isVisible()) { try { await h.click({ timeout: 1000 }); n++; } catch (e) {} await p.waitForTimeout(150); }
          await p.evaluate(() => document.querySelectorAll('.dlg-ov').forEach(x => x.querySelector('[data-d="0"]') ? x.querySelector('[data-d="0"]').click() : x.remove()));
        }
      }
    }
    return n;
  }
  const n1 = await sweep('영어');
  ok(true, `영어 화면 버튼 ${n1}번 눌러 봄`);
  await p.evaluate(() => { try { closeSheet(); } catch (e) {} if (S.active) exitSession(true); setLang('zh'); });
  await p.waitForTimeout(1500); await p.waitForFunction(() => zhIdx && zhIdx.length > 11000);
  ok(true, '중국어 단어 ' + await p.evaluate(() => zhIdx.length) + '개');

  // 6) 신HSK 단어장
  await p.evaluate(() => recSheet('nhsk7')); await p.waitForSelector('#recList .rec-row');
  ok(await p.evaluate(() => document.getElementById('sheetTitle').textContent.includes('신HSK 7~9급') && document.querySelectorAll('#recList .rec-row').length < 400 && gradeWords('nhsk7').length > 5000), '신HSK 7~9급: ' + await p.locator('#recList .rec-row').count() + '개');
  { const n0 = await p.locator('#recList .rec-row').count(); await p.click('#recMore'); await p.waitForTimeout(200); const n1 = await p.locator('#recList .rec-row').count(); ok(n1 > n0, `더 보기로 이어서 그림 ${n0} -> ${n1}`); }
  await p.screenshot({ path: path.join(shots, 'audit-nhsk.png') });
  await p.evaluate(() => closeSheet());
  await p.evaluate(() => dictOpen('人工智能')); await p.waitForSelector('#dictOut .dict-card');
  ok(await p.evaluate(() => /신HSK 7~9급/.test(document.querySelector('#dictOut .dict-card').textContent)), '사전에 신HSK 급수 표시');
  await p.fill('#dictQ', '공부'); await p.waitForTimeout(500);
  ok(await p.evaluate(() => document.querySelector('#dictOut .dict-row b').textContent), '중국어 사전 한글 뜻 찾기 첫 결과: ' + await p.evaluate(() => document.querySelector('#dictOut .dict-row b').textContent));
  await p.evaluate(() => closeSheet());
  await p.evaluate(() => { recAddWords('hsk1', gradeWords('hsk1').slice(0, 8)); });
  await p.waitForTimeout(800);
  const n2 = await sweep('중국어');
  ok(true, `중국어 화면 버튼 ${n2}번 눌러 봄`);
  where = 'end';
  ok(!errs.length, 'ERRORS: ' + (errs.join('\n') || 'none'));
  await b.close(); srv.close();
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
