// 글·사진에서 단어 뽑기: 기사 붙여넣기(원형 went→go, 이미 있는 단어·이름·숫자 빼기, 쉬운 단어 토글, 글 속 문장 = 예문, 새 단어장, 중복 없음)
// 유튜브·SRT·VTT 자막 정리, 중국어(HSK 최장 일치), 사진(줄인 JPEG → AI 함수 ocr → 고칠 수 있는 글), AI 문맥 뜻(ctx 한 번), 로컬 계정 안내, XSS
// AI 함수(supabase/functions/ai/index.ts)는 TypeScript를 바로 변환해 Node에서 돌려요(Gemini만 가짜). 화면: test/shots/extract/ 와 /mnt/project-files/vocapro/screens/단어뽑기/
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const ts = require('/opt/node22/lib/node_modules/typescript');
const http = require('http'), fs = require('fs'), path = require('path');
const shots = path.join(__dirname, 'shots', 'extract'), OUT = process.env.SHOTS_OUT || '/mnt/project-files/vocapro/screens/단어뽑기';
fs.mkdirSync(shots, { recursive: true }); try { fs.mkdirSync(OUT, { recursive: true }); } catch (e) {}
const TYPES = { js: 'text/javascript', css: 'text/css', json: 'application/json; charset=utf-8' };
const serve = (dir, port) => http.createServer((q, r) => { let f = path.join(__dirname, dir, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html'; fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': TYPES[f.split('.').pop()] || 'text/html; charset=utf-8' }); r.end(d); }); }).listen(port);
const srv1 = serve('site', 8811), srv2 = serve('site2', 8812);
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };

/* ----- AI 함수: index.ts 를 변환해 가짜 Deno 환경에서 실행 ----- */
let edge = null, aiUse = 0, gem = [], GEM = 'ok';
const env = { SUPABASE_URL: 'http://db', SUPABASE_SERVICE_ROLE_KEY: 'svc', GEMINI_API_KEY: 'test-key', AI_DAILY_LIMIT: '40', AI_GLOBAL_LIMIT: '3000' };
globalThis.Deno = { env: { get: k => env[k] }, serve: h => { edge = h; } };
const stubSb = { createClient: () => ({ rpc: async fn => fn === 'voca_me' ? { data: { id: 7, username: 'kim' }, error: null } : fn === 'voca_ai_use' ? (aiUse++, { data: true, error: null }) : { data: null, error: { code: '42883' } } }) };
{
  const src = fs.readFileSync(path.join(__dirname, '..', 'supabase', 'functions', 'ai', 'index.ts'), 'utf8');
  const out = ts.transpileModule(src, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } });
  const mod = { exports: {} };
  new Function('require', 'exports', 'module', out.outputText)(n => { if (/supabase-js/.test(n)) return stubSb; throw new Error('import ' + n); }, mod.exports, mod);
}
const OCR_TEXT = 'Unit 3. Saving the Ocean\nStudnets must protect marine species.\nPlastic pollution threatens sea turtles and whales.\n바다를 지켜요';
const realFetch = globalThis.fetch;
globalThis.fetch = async (url, o) => {
  if (!String(url).startsWith('https://generativelanguage.googleapis.com/')) return realFetch(url, o);
  const b = JSON.parse(o.body), parts = b.contents[0].parts;
  gem.push({ texts: parts.filter(p => p.text).map(p => p.text), imgs: parts.filter(p => p.inlineData).map(p => ({ mime: p.inlineData.mimeType, len: p.inlineData.data.length })), schema: b.generationConfig.responseSchema, max: b.generationConfig.maxOutputTokens });
  if (GEM === 'busy') return new Response('{}', { status: 503 });
  let text;
  if (/OCR engine/.test(parts[0].text)) text = JSON.stringify({ t: OCR_TEXT });
  else { const items = JSON.parse(parts[0].text.split('ITEMS: ').pop()); text = JSON.stringify({ items: items.map(x => ({ word: x.word, meaning: '문맥 ' + x.word, phonetic: '/x/', koreanPron: '엑스', exampleKo: '해석: ' + x.s.slice(0, 12) })) }); }
  return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text }] } }] }), { status: 200, headers: { 'Content-Type': 'application/json' } });
};
const callEdge = async (body, q) => { const res = await edge(new Request('https://x.supabase.co/functions/v1/ai' + (q || ''), { method: 'POST', headers: { origin: 'http://localhost:8812', 'content-type': 'application/json' }, body: typeof body === 'string' ? body : JSON.stringify(body) })); return { status: res.status, j: await res.json().catch(() => null) }; };
// JPEG 크기(SOF 표지) 읽기
const jpegSize = buf => { for (let i = 2; i < buf.length - 9;) { if (buf[i] !== 0xff) { i++; continue; } const m = buf[i + 1], len = buf.readUInt16BE(i + 2); if (m >= 0xc0 && m <= 0xc2) return { h: buf.readUInt16BE(i + 5), w: buf.readUInt16BE(i + 7) }; i += 2 + len; } return null; };

const ART = `Last summer, Minjun went to the beach with his two cats. Scientists have discovered 3 new species of frogs in the Amazon rainforest.
The river was polluted, and researchers warned that the frogs' habitat is disappearing quickly. In 2024, about 1,500 people visited the area.
<img src=x onerror="window.__xss=1"> Minjun said the discovery was remarkable, and the endangered frogs need conservation.`;
const SRT = `1
00:00:01,000 --> 00:00:03,500
[Music]

2
00:00:03,600 --> 00:00:06,000
>> JOHN: Welcome back to the channel.

3
00:00:06,100 --> 00:00:09,000
Today we explore ancient civilizations.
`;
const VTT = `WEBVTT
Kind: captions
Language: en

00:00:00.000 --> 00:00:02.000 align:start position:0%
<00:00:00.400><c>so</c><00:00:00.800><c> today</c> we talk about

00:00:02.000 --> 00:00:04.000
so today we talk about
volcanoes and earthquakes`;
const YT = `0:00
hello everyone and welcome
0:03
in this video we look at photosynthesis
1:02:05
[Applause]
1:02:07
plants absorb sunlight`;
const ZH = '我们今天去图书馆学习汉语。这个城市的环境非常美丽，但是交通有点儿拥挤。';

(async () => {
  const b = await chromium.launch(), errs = [];
  const page = async (vp, tag, port) => {
    const ctx = await b.newContext({ viewport: vp, deviceScaleFactor: 2 }), p = await ctx.newPage();
    p.on('pageerror', e => errs.push(tag + ' ' + e.message)); await require('./undef')(p, errs, tag);
    await p.route(/fonts\.googleapis|jsdelivr/, r => r.abort());
    p.on('dialog', d => { errs.push(tag + ' dialog ' + d.message()); d.dismiss(); });
    return p;
  };
  const save = async (p, name, out) => { await p.waitForTimeout(250); await p.screenshot({ path: path.join(shots, name + '.png') }); if (out) { try { fs.copyFileSync(path.join(shots, name + '.png'), path.join(OUT, out)); } catch (e) {} } };
  const dark = async (p, on) => { await p.emulateMedia({ colorScheme: on ? 'dark' : 'light' }); await p.evaluate(v => { config.darkMode = v; applyTheme(); }, on); await p.waitForTimeout(150); };
  const signupLocal = async (p, id) => {
    await p.goto('http://localhost:8811/'); await p.waitForSelector('#authScreen .auth-box'); await p.evaluate(() => { DEFAULT_CFG.provider = 'gemini'; }); // 이 시험은 서버 · 키 AI 경로를 봐요(기본은 기기 AI)
    await p.click('[data-act="auth-mode"][data-m="signup"]');
    await p.fill('#auId', id); await p.fill('#auPw', 'pass1234'); await p.fill('#auPw2', 'pass1234');
    await p.click('#auNext'); await p.waitForSelector('#auGrade', { state: 'attached' }); await p.evaluate(g => { document.getElementById('auGrade').value = g; }, 'm2'); await p.fill('#auName', '김주원'); await p.fill('#auSchool', '한빛중학교'); await p.fill('#auSno', '20315'); await p.check('#auTerms');
    await p.fill('#capIn', await p.evaluate('capText')); await p.click('#auGo');
    await p.waitForSelector('#obOv'); await p.click('[data-ob="skip"]'); await p.waitForTimeout(1300);
    await p.evaluate(() => ['recOv', 'ltOv'].forEach(id => { const r = document.getElementById(id); if (r) r.remove(); }));
  };

  // ===== 1. 기사 붙여넣기 (로컬 계정, AI 없음) =====
  const p = await page({ width: 390, height: 844 }, 'M', 8811);
  await signupLocal(p, 'gx1');
  await p.evaluate(() => { categories.push({ id: 'cHave', name: '내 단어', words: [sanitizeWord({ word: 'species', meaning: '종' }), sanitizeWord({ word: 'river', meaning: '강' })] }); syncStorage(); renderHome(); });
  ok(await p.isVisible('.tool-list [data-act="gx-open"]'), '홈 학습 도구에 "글·사진에서 단어 뽑기"');
  await p.click('.tool-list [data-act="gx-open"]'); await p.waitForSelector('#gxIn');
  await p.fill('#gxIn', ART);
  ok(/\d+ \/ 20,000자/.test(await p.textContent('#gxCnt')) && await p.isVisible('.gx-clear'), '글자 수 표시와 모두 지우기');
  await save(p, 'paste-light', '붙여넣기.png');
  await p.click('#gxRun'); await p.waitForSelector('.gx-row');
  const C = await p.evaluate(() => GX.cands.map(c => ({ w: c.w, forms: c.forms, easy: c.easy, unk: c.unk, on: c.on, t: c.t, s: c.s, m: c.m })));
  const get = w => C.find(c => c.w === w);
  ok(get('go') && get('go').forms.includes('went') && !get('went'), 'went → go (원형으로 모아요)');
  ok(get('cat') && get('cat').forms.includes('cats') && get('frog') && get('frog').forms.includes('frogs'), 'cats → cat, frogs → frog');
  ok(get('discover') && get('discover').forms.includes('discovered') && get('pollute') && get('researcher'), 'discovered → discover, polluted → pollute, researchers → researcher');
  ok(!get('species') && !get('river'), '이미 내 단어장에 있는 단어(species, river)는 빠져요');
  ok(!C.some(c => /minjun|amazon/i.test(c.w)), '이름(Minjun, Amazon)은 빠져요');
  ok(!C.some(c => /\d/.test(c.w)), '숫자(3, 2024, 1,500)는 빠져요');
  ok(!C.some(c => ['the', 'and', 'with', 'his', 'was', 'have'].includes(c.w)), '기능어(the, and, with …)는 빠져요');
  ok(get('go').easy && get('cat').easy && !get('habitat').easy && !get('conservation').easy, '중2 기준: go·cat은 쉬운 단어, habitat·conservation은 아님');
  ok(get('habitat').t === '고1' && get('conservation').t === '수능' && get('disappear').t === '중2', '수준 배지: 고1, 수능, 중2');
  ok(get('habitat').on && !get('go').on && !get('img').on && get('img').unk, '기본 선택: 내 수준 이상만 (쉬운 단어·사전에 없는 단어는 빼고)');
  ok(get('habitat').m === '서식지' && get('remarkable').m === '놀라운', '뜻은 내장 사전에서');
  ok(await p.evaluate(() => [...document.querySelectorAll('.gx-row .gx-w')].every(e => !['go', 'cat'].includes(e.textContent))), '쉬운 단어는 처음엔 안 보여요');
  const sum = await p.textContent('.gx-sum'); ok(/모르는 단어/.test(sum) && /내 단어장에 있는 2개/.test(sum) && /이름·약어 2개/.test(sum), '요약: ' + sum.replace(/\s+/g, ' ').trim());
  const ctxHtml = await p.evaluate(() => { const r = [...document.querySelectorAll('.gx-row')].find(x => x.querySelector('.gx-w').textContent === 'pollute'); return r && r.querySelector('.gx-ctx').innerHTML; });
  ok(/<mark>polluted<\/mark>/.test(ctxHtml || '') && /The river was/.test(ctxHtml), '글 속 문장에 단어를 표시해요: ' + (ctxHtml || '').slice(0, 70));
  // XSS: 글 속 <img onerror> 는 글자로만 보여요
  const xss = await p.evaluate(() => ({ img: !!document.querySelector('.gx-list img'), flag: !!window.__xss, txt: [...document.querySelectorAll('.gx-ctx')].some(e => e.textContent.includes('<img src=x onerror=')) }));
  ok(!xss.img && !xss.flag && xss.txt, 'XSS: <img onerror> 는 이스케이프돼 글자로 보여요');
  await save(p, 'list-light', '후보목록.png');
  await p.evaluate(() => document.querySelector('.sheet').scrollTo(0, 99999)); await save(p, 'list-light-bottom');
  await p.evaluate(() => document.querySelector('.sheet').scrollTo(0, 0));
  // 쉬운 단어도 보기
  await p.click('.gx-easy .tg'); await p.waitForTimeout(150);
  const shown = await p.$$eval('.gx-row .gx-w', a => a.map(e => e.textContent));
  ok(shown.includes('go') && shown.includes('cat'), '쉬운 단어도 보기 → go, cat 이 보여요');
  ok(await p.evaluate(() => { const r = [...document.querySelectorAll('.gx-row')].find(x => x.querySelector('.gx-w').textContent === 'go'); return r && /went/.test(r.querySelector('.gx-form').textContent) && /<mark>went<\/mark>/.test(r.querySelector('.gx-ctx').innerHTML); }), 'go 줄: ← went, 문장에 went 표시');
  await p.click('.gx-easy .tg'); await p.waitForTimeout(100);
  ok(!(await p.$$eval('.gx-row .gx-w', a => a.map(e => e.textContent))).includes('go'), '끄면 다시 숨겨요');
  // 하나 더 고르고(쉬운 단어 아님), 하나 빼기
  await p.evaluate(() => { const i = GX.cands.findIndex(c => c.w === 'area'); const el = document.querySelector(`.gx-row input[data-i="${i}"]`); if (el.checked) el.click(); });
  const nSel = await p.evaluate(() => GX.cands.filter(c => c.on).length);
  ok(new RegExp(`단어 ${nSel}개 넣기`).test(await p.textContent('#gxAdd')) && /골랐어요/.test(await p.textContent('#gxSel')), `넣기 버튼에 고른 수(${nSel}개)`);
  const bookName = await p.inputValue('#gxName'); ok(/^기사 단어 \d+\/\d+$/.test(bookName), '새 단어장 이름: ' + bookName);
  ok((await p.textContent('#gxTo')) === `새 단어장 '${bookName}'에 넣어요`, '아래 버튼 위에 넣을 곳: ' + await p.textContent('#gxTo'));
  ok(!(await p.isVisible('#gxAi')), 'AI가 없으면 문맥 뜻 채우기 스위치를 숨겨요');
  await p.click('#gxAdd'); await p.waitForSelector('#paneBook.active .wcard'); await p.waitForTimeout(300);
  const nb = await p.evaluate(n => { const c = categories.find(x => x.name === n); return c && c.words.map(w => ({ word: w.word, m: w.meaning, ex: w.example, ko: w.exampleKo, ph: w.phonetic })); }, bookName);
  ok(nb && nb.length === nSel && !nb.some(w => w.word === 'area'), `새 단어장에 ${nb && nb.length}개`);
  const hab = nb.find(w => w.word === 'habitat'), dis = nb.find(w => w.word === 'researcher');
  ok(hab && /habitat is disappearing/.test(hab.ex) && hab.ko === '' && hab.m === '서식지' && !!hab.ph, '예문 = 글 속 문장, 해석은 비워 둬요, 발음기호는 사전에서');
  ok(dis && /researchers warned/.test(dis.ex), 'researcher 예문(researchers 로 쓰인 문장): ' + (dis && dis.ex));
  ok(new Set(nb.map(w => w.word.toLowerCase())).size === nb.length, '단어장 안에 중복 없음');
  await save(p, 'book-after');
  // 같은 글을 다시 뽑으면 넣은 단어는 빠져요 → 기존 단어장에 넣어도 중복 없음
  await p.evaluate(() => ACTIONS['gx-open']({ dataset: {} })); await p.waitForSelector('#gxIn'); await p.fill('#gxIn', ART); await p.click('#gxRun'); await p.waitForSelector('.gx-sum');
  const C2 = await p.evaluate(() => GX.cands.filter(c => !c.easy).map(c => c.w));
  ok(!C2.includes('habitat') && C2.includes('area'), '다시 뽑으면 이미 넣은 단어는 빠지고 뺐던 area 는 남아요');
  await p.evaluate(() => { GX.cands.forEach(c => { c.on = c.w === 'area' || c.w === 'go'; }); gxListFill(); });
  const hid = await p.evaluate(n => categories.find(x => x.name === n).id, bookName);
  await p.selectOption('#gxBook', hid); ok(await p.isHidden('#gxName') && (await p.textContent('#gxTo')).includes(bookName + "' 단어장"), '기존 단어장을 고르면 이름 칸을 숨기고 넣을 곳이 바뀌어요');
  await p.click('#gxAdd'); await p.waitForTimeout(500);
  const nb2 = await p.evaluate(n => categories.find(x => x.name === n).words.map(w => w.word), bookName);
  ok(nb2.length === nSel + 2 && nb2[0] === 'area' && new Set(nb2).size === nb2.length, '기존 단어장 앞에 2개 더, 중복 없음');

  // 단어장 추가 시트에도 입구
  await p.click('.fab'); await p.waitForSelector('#addOne');
  ok(await p.isVisible('#sheetBody .seg [data-act="gx-open"]'), '단어 추가 시트에 "글·사진에서" 탭');
  await p.click('#sheetBody .seg [data-act="gx-open"]'); await p.waitForSelector('#gxIn');
  await p.fill('#gxIn', 'The volcano erupted.'); await p.click('#gxRun'); await p.waitForSelector('.gx-sum');
  ok(await p.inputValue('#gxBook') === hid, '단어장 안에서 열면 그 단어장이 기본으로 골라져 있어요');

  // ===== 2. 자막 정리 =====
  const subs = await p.evaluate(([a, b2, c]) => [gxClean(a), gxClean(b2), gxClean(c), gxClean('He met her at 10:30 [1] yesterday.')], [SRT, VTT, YT]);
  console.log('     ', JSON.stringify(subs.map(x => x.text)));
  ok(subs[0].subs && subs[0].text === 'Welcome back to the channel. Today we explore ancient civilizations.', 'SRT: 번호·시간·[Music]·>> JOHN: 을 지우고 문장으로 이어요');
  ok(subs[1].subs && !/\d\d:|<|align|WEBVTT|Kind/.test(subs[1].text) && subs[1].text.split('\n').filter(l => l === 'so today we talk about').length === 1 && /volcanoes and earthquakes/.test(subs[1].text), 'VTT: 시간 태그·머리글을 지우고 겹친 줄은 한 번만');
  ok(subs[2].subs && subs[2].text === 'hello everyone and welcome\nin this video we look at photosynthesis\nplants absorb sunlight', '유튜브 스크립트: 0:00, 1:02:05, [Applause] 지우고 줄은 그대로');
  ok(!subs[3].subs && subs[3].text.includes('10:30'), '일반 글의 시각(10:30)은 그대로 둬요');
  await p.keyboard.press('Escape'); await p.evaluate(() => closeSheet());
  await p.evaluate(() => ACTIONS['gx-open']({ dataset: {} })); await p.waitForSelector('#gxIn'); await p.fill('#gxIn', YT); await p.click('#gxRun'); await p.waitForSelector('.gx-sum');
  ok(/자막의 시간 표시/.test(await p.textContent('.gx-sum')) && /^자막 단어/.test(await p.inputValue('#gxName')), '자막이면 안내 문구와 "자막 단어" 이름');
  const ph = await p.evaluate(() => GX.cands.find(c => c.w === 'photosynthesis'));
  ok(ph && ph.s === 'in this video we look at photosynthesis', '자동 자막은 줄 하나를 문장으로: ' + (ph && ph.s));

  // ===== 3. 로컬 계정: 사진은 서버 계정 안내 =====
  await p.click('[data-act="gx-back"]'); await p.click('[data-act="gx-tab"][data-t="photo"]');
  ok(await p.isVisible('.gx-need') && /서버 계정/.test(await p.textContent('.gx-need')) && /텍스트 인식/.test(await p.textContent('.gx-need')), '로컬 계정: 사진은 서버 계정에서, 휴대폰 텍스트 인식 안내');
  ok(!(await p.$('#gxPhoto input[type=file]')), '로컬 계정에는 사진 고르기가 없어요');
  await save(p, 'photo-local');
  await p.click('.gx-need [data-act="gx-tab"]'); ok(await p.isVisible('#gxIn'), '글 붙여넣기로 가기');

  // ===== 4. 다크 모드 · PC 화면 =====
  await dark(p, true); await p.evaluate(n => { categories = categories.filter(c => c.name !== n); }, bookName);
  await p.fill('#gxIn', ART); await p.click('#gxRun'); await p.waitForSelector('.gx-row');
  await save(p, 'list-dark', '후보목록-다크.png');
  await p.click('[data-act="gx-back"]'); await save(p, 'paste-dark');
  await dark(p, false); await p.evaluate(() => closeSheet());
  const pc = await page({ width: 1280, height: 860 }, 'PC', 8811);
  await signupLocal(pc, 'gx2');
  await pc.click('[data-act="gx-open"] >> nth=0'); await pc.waitForSelector('#gxIn'); await pc.fill('#gxIn', ART); await pc.click('#gxRun'); await pc.waitForSelector('.gx-row');
  await save(pc, 'list-pc', '후보목록-PC.png');
  ok(await pc.evaluate(() => document.documentElement.scrollWidth <= innerWidth && document.querySelector('.sheet').scrollWidth <= document.querySelector('.sheet').clientWidth), 'PC: 가로로 넘치지 않아요');
  ok(await p.evaluate(() => document.querySelector('.sheet').scrollWidth <= document.querySelector('.sheet').clientWidth + 1), '휴대폰: 시트가 가로로 넘치지 않아요');
  await pc.evaluate(() => closeSheet()); await pc.evaluate(() => go('tabBooks')); await pc.waitForTimeout(200);
  ok(await pc.isVisible('#tabBooks .gx-entry'), '단어장 탭에도 "글·사진에서 단어 뽑기"');
  await save(pc, 'books-pc');

  // ===== 5. 중국어 =====
  await p.evaluate(() => setLang('zh')); await p.waitForFunction(() => zhIdx && zhIdx.length > 1000); await p.waitForTimeout(1200);
  await p.evaluate(() => { categories.push({ id: 'cZh', name: '내 중국어', words: [sanitizeWord({ word: '城市', meaning: '도시' })] }); syncStorage(); });
  await p.evaluate(() => ACTIONS['gx-open']({ dataset: {} })); await p.waitForSelector('#gxIn'); await p.fill('#gxIn', ZH); await p.click('#gxRun'); await p.waitForSelector('.gx-row');
  const Z = await p.evaluate(() => GX.cands.map(c => ({ w: c.w, t: c.t, easy: c.easy, on: c.on, p: c.p, m: c.m, s: c.s })));
  console.log('     ', JSON.stringify(Z.map(z => z.w + ':' + z.t + (z.easy ? '(쉬움)' : ''))));
  const zg = w => Z.find(z => z.w === w);
  ok(zg('图书馆') && !zg('图书'), '가장 긴 단어부터: 图书馆 (图书 아님)');
  ok(zg('环境') && zg('拥挤') && zg('美丽') && /^HSK\d$/.test(zg('环境').t), 'HSK 단어와 배지: 环境 ' + (zg('环境') && zg('环境').t));
  ok(!zg('城市'), '이미 있는 중국어 단어(城市)는 빠져요');
  ok(zg('我们') && zg('我们').easy && !zg('我们').on, 'HSK 1급(我们)은 쉬운 단어');
  ok(zg('拥挤').p && zg('拥挤').m && /拥挤/.test(zg('拥挤').s), '병음, 뜻, 글 속 문장');
  await save(p, 'zh-list');
  await p.click('#gxAdd'); await p.waitForTimeout(500);
  const zb = await p.evaluate(() => categories[categories.length - 1].words.map(w => ({ w: w.word, ex: w.example, ph: w.phonetic })));
  ok(zb.length >= 3 && zb.every(w => w.ex && w.ph) && zb.some(w => w.w === '拥挤'), `중국어 단어장에 ${zb.length}개 (예문·병음)`);
  await p.evaluate(() => setLang('en')); await p.waitForTimeout(400);
  await p.evaluate(() => ACTIONS['gx-open']({ dataset: {} })); await p.waitForSelector('#gxIn'); await p.fill('#gxIn', ZH); await p.click('#gxRun'); await p.waitForTimeout(500);
  ok(/영어 단어가 없어요/.test(await p.textContent('.dlg, #dlgOv, body')), '영어 모드에 중국어 글 → 중국어 단어장으로 바꾸라는 안내');

  // ===== 6. 사진 (서버 계정) + AI 문맥 뜻 =====
  const reqs = [];
  const q = await page({ width: 390, height: 844 }, 'C', 8812);
  await q.route('https://psmmrwhmpezyeehjivav.supabase.co/**', async r => {
    const u = r.request().url(), raw = r.request().postData() || '{}', body = JSON.parse(raw);
    const j = x => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(x) });
    if (u.includes('/functions/v1/ai')) {
      reqs.push({ url: u, body, size: raw.length });
      const res = await edge(new Request('https://x.supabase.co/functions/v1/ai' + (u.includes('?') ? '?' + u.split('?')[1] : ''), { method: 'POST', headers: { origin: 'http://localhost:8812', 'content-type': 'application/json' }, body: raw }));
      return r.fulfill({ status: res.status, contentType: 'application/json', body: await res.text() });
    }
    if (u.endsWith('/voca_signup')) return j({ token: 'tok', id: 7, username: body.p_user });
    if (u.endsWith('/voca_load')) return j(null);
    if (u.endsWith('/voca_me')) return j({ id: 7, username: 'kim' });
    return j({ ok: true });
  });
  await q.goto('http://localhost:8812/'); await q.waitForSelector('.auth-box #auId'); await q.evaluate(() => { DEFAULT_CFG.provider = 'gemini'; }); // 이 시험은 서버 · 키 AI 경로를 봐요(기본은 기기 AI)
  await q.click('[data-m="signup"]'); await q.click('[data-act="auth-age"][data-k="0"]'); await q.fill('#auId', 'kim'); await q.fill('#auPw', 'pass1234'); await q.fill('#auPw2', 'pass1234');
  await q.click('#auNext'); await q.waitForSelector('#auGrade', { state: 'attached' }); await q.evaluate(g => { document.getElementById('auGrade').value = g; }, 'h1'); await q.fill('#auName', '김지우'); await q.fill('#auSchool', '한빛고등학교'); await q.fill('#auSno', '10315'); await q.check('#auTerms'); await q.fill('#capIn', await q.evaluate('capText')); await q.click('#auGo');
  await q.waitForSelector('#obOv'); await q.click('[data-ob="skip"]'); await q.click('[data-lt="close"]').catch(() => {}); await q.waitForTimeout(1500);
  await q.evaluate(() => { const o = document.getElementById('recOv'); if (o) o.remove(); });
  await q.evaluate(() => ACTIONS['gx-open']({ dataset: {} })); await q.waitForSelector('#gxIn');
  await q.click('[data-act="gx-tab"][data-t="photo"]'); await q.waitForSelector('.gx-pick');
  ok(await q.isDisabled('#gxOcr'), '사진이 없으면 읽기 버튼이 꺼져 있어요');
  await save(q, 'photo-empty');
  // 큰 사진(3200x2400 PNG) 두 장
  const big = Buffer.from(await q.evaluate(() => { const c = document.createElement('canvas'); c.width = 3200; c.height = 2400; const g = c.getContext('2d'); g.fillStyle = '#f7f3e8'; g.fillRect(0, 0, 3200, 2400); g.fillStyle = '#222'; g.font = 'bold 120px serif'; ['Unit 3. Saving the Ocean', 'Students must protect', 'marine species.'].forEach((t, i) => g.fillText(t, 200, 500 + i * 260)); for (let i = 0; i < 4000; i++) { g.fillStyle = `hsl(${i % 360},40%,${50 + (i % 30)}%)`; g.fillRect((i * 97) % 3200, 1500 + (i * 13) % 900, 18, 18); } return c.toDataURL('image/png').split(',')[1]; }), 'base64');
  const tall = Buffer.from(await q.evaluate(() => { const c = document.createElement('canvas'); c.width = 900; c.height = 2000; const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, 900, 2000); g.fillStyle = '#000'; g.font = '60px sans-serif'; g.fillText('Whales are mammals.', 60, 300); return c.toDataURL('image/png').split(',')[1]; }), 'base64');
  console.log('      원본 사진 크기', big.length, tall.length);
  await q.setInputFiles('#gxPhoto input[multiple]', [{ name: 'handout1.png', mimeType: 'image/png', buffer: big }, { name: 'handout2.png', mimeType: 'image/png', buffer: tall }]);
  await q.waitForSelector('.gx-shot >> nth=1');
  ok(await q.$$eval('.gx-shot img', a => a.length === 2 && a.every(i => i.src.startsWith('data:image/jpeg') && i.naturalWidth <= 240)), '사진 2장 미리보기(작은 JPEG)');
  ok(/2\/3/.test(await q.textContent('.gx-hint')), '3장까지 안내 (2/3)');
  await save(q, 'photo-cloud', '사진.png');
  await q.click('#gxOcr'); await q.waitForSelector('.gx-note.ok');
  const ocr = reqs.find(r => r.body.task === 'ocr');
  ok(ocr && /\/functions\/v1\/ai\?t=ocr$/.test(ocr.url) && !('prompt' in ocr.body) && ocr.body.images.length === 2 && ocr.body.lang === 'en', 'ocr 요청: ?t=ocr 주소, 사진 2장, prompt 없음');
  const dims = ocr.body.images.map(x => ({ head: x.slice(0, 4), len: x.length, ...jpegSize(Buffer.from(x, 'base64')) }));
  console.log('      보낸 사진', JSON.stringify(dims), '요청', ocr.size, 'B');
  ok(dims.every(d => d.head === '/9j/' && d.len <= 1400000) && dims[0].w === 1600 && dims[0].h === 1200 && dims[1].h === 1600 && dims[1].w === 720, '사진을 1600px JPEG로 줄여 보내요 (3200x2400 → 1600x1200, 900x2000 → 720x1600)');
  const og = gem.find(g => g.imgs.length);
  ok(og && og.imgs.length === 2 && og.imgs.every(i => i.mime === 'image/jpeg') && /OCR engine/.test(og.texts[0]) && og.max === 8000, 'AI 함수 → Gemini: 사진 2장(image/jpeg) + 글자 읽기 지시');
  ok(aiUse === 1, 'AI 사용 1회로 셌어요');
  ok(await q.inputValue('#gxIn') === OCR_TEXT && await q.isEditable('#gxIn'), '읽은 글을 고칠 수 있는 칸에 보여 줘요');
  await save(q, 'photo-text', '사진-읽은글.png');
  await q.fill('#gxIn', OCR_TEXT.replace('Studnets', 'Students'));
  await q.click('#gxRun'); await q.waitForSelector('.gx-row');
  const QC = await q.evaluate(() => GX.cands.filter(c => c.on).map(c => c.w));
  ok(!QC.includes('studnets') && QC.includes('marine'), '고친 글로 단어를 뽑아요: ' + QC.join(', '));
  ok(/^유인물 단어/.test(await q.inputValue('#gxName')), '사진이면 "유인물 단어" 이름');
  ok(await q.isChecked('#gxAi'), 'AI가 있으면 문맥 뜻 채우기가 켜져 있어요');
  await save(q, 'photo-list');
  const before = aiUse;
  await q.click('#gxAdd'); await q.waitForSelector('#paneBook.active .wcard'); await q.waitForTimeout(300);
  const ctxReq = reqs.filter(r => r.body.task === 'ctx');
  ok(ctxReq.length === 1 && aiUse === before + 1 && !('prompt' in ctxReq[0].body) && ctxReq[0].body.items.length === QC.length && ctxReq[0].body.items.every(i => i.word && i.s), 'AI 문맥 뜻: ctx 요청 한 번 (prompt 없음, 단어 + 문장)');
  const qb = await q.evaluate(() => categories[categories.length - 1].words.map(w => ({ w: w.word, m: w.meaning, ko: w.exampleKo, ex: w.example })));
  const mar = qb.find(w => w.w === 'marine');
  ok(mar && mar.m === '문맥 marine' && /^해석: /.test(mar.ko) && /protect marine species/.test(mar.ex), 'AI가 고른 문맥 뜻과 문장 해석으로 저장');

  // ===== 7. AI 함수 검사 (Node) =====
  const n0 = aiUse;
  const tiny = big.toString('base64').slice(0, 0) + '/9j/' + 'A'.repeat(100);
  let r = await callEdge({ token: 't', task: 'ocr', images: [tiny, tiny, tiny, tiny] }, '?t=ocr'); ok(r.status === 400, 'ocr: 4장은 거절 (400)');
  r = await callEdge({ token: 't', task: 'ocr', images: ['iVBORw0KGgo' + 'A'.repeat(50)] }, '?t=ocr'); ok(r.status === 400, 'ocr: JPEG가 아니면 거절');
  r = await callEdge({ token: 't', task: 'ocr', images: ['/9j/' + 'A'.repeat(1500001)] }, '?t=ocr'); ok(r.status === 413, 'ocr: 한 장 1.5MB 넘으면 거절 (413)');
  r = await callEdge({ token: 't', task: 'ocr', images: [tiny] }); ok(r.status === 200 && JSON.parse(r.j.text).t === OCR_TEXT, 'ocr: 작은 사진은 ?t=ocr 없이도 돼요');
  r = await callEdge({ token: 't', task: 'ocr', images: ['/9j/' + 'A'.repeat(20000)] }); ok(r.status === 413, 'ocr: 큰 요청은 ?t=ocr 주소로만');
  r = await callEdge({ token: 't', task: 'word', word: 'apple', pad: 'x'.repeat(20000) }, '?t=ocr'); ok(r.status === 413, '?t=ocr 주소로 다른 작업을 크게 보내면 거절');
  r = await callEdge({ token: 't', task: 'ctx', items: Array.from({ length: 31 }, () => ({ word: 'apple', s: 'I ate an apple.' })) }); ok(r.status === 400, 'ctx: 31개는 거절');
  r = await callEdge({ token: 't', task: 'ctx', items: [{ word: 'apple', s: 'x'.repeat(241) }] }); ok(r.status === 400, 'ctx: 너무 긴 문장은 거절');
  r = await callEdge({ token: 't', task: 'ctx', items: [{ word: '<script>', s: 'hi' }] }); ok(r.status === 400, 'ctx: 단어 형식 검사');
  r = await callEdge({ token: 't', task: 'ctx', lang: 'zh', items: [{ word: '拥挤', s: '交通有点儿拥挤。' }] }); ok(r.status === 200 && /Chinese word/.test(gem[gem.length - 1].texts[0]) && gem[gem.length - 1].schema.properties.items, 'ctx: 중국어도 돼요 (스키마 고정)');
  ok(aiUse === n0 + 2, '거절된 요청은 AI 사용으로 세지 않아요 (성공 2번만)');
  GEM = 'busy'; r = await callEdge({ token: 't', task: 'ocr', images: [tiny] }); ok(r.status === 503 && aiUse === n0 + 3, 'Gemini가 바쁘면 503 (사용은 1회)'); GEM = 'ok';
  r = await callEdge({ token: '', task: 'ocr', images: [tiny] }); ok(r.status === 401, '로그인 없으면 401');

  ok(!errs.length, 'ERRORS: ' + (errs.join('\n') || 'none'));
  await b.close(); srv1.close(); srv2.close(); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
