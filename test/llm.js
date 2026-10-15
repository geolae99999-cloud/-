// 기기 AI (Qwen) 연결: 진짜 워커 묶음이 뜨고 huggingface.co 에서 모델을 찾는지, 설정 · AI 채우기가 기기 AI로 가는지
// huggingface.co 대신 test/fixtures/llm 의 작은 'Qwen2 모양' 모델(tools/llm/make_fixture.py)을 내줘서 토크나이저 · 생성 · 디코딩까지 실제로 돌려요.
// LLM_FIXTURE=none 이면 모델 없이(받기 실패 안내만) 확인해요.
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, 'site'), shots = path.join(__dirname, 'shots');
const TYPES = { '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.wasm': 'application/wasm' };
const srv = http.createServer((q, r) => { let f = path.join(root, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html'; fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'text/html; charset=utf-8' }); r.end(d); }); }).listen(8772);
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
const FIX = process.env.LLM_FIXTURE === 'none' ? '' : (process.env.LLM_FIXTURE || path.join(__dirname, 'fixtures', 'llm'));
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await require('./undef')(p, errs);
  await p.route('**/fonts.googleapis.com/**', r => r.abort()); await p.route('https://cdn.jsdelivr.net/**', r => r.abort());
  const hf = [];
  // 워커 요청도 잡혀요(context 단위)
  await ctx.route('https://huggingface.co/**', async r => {
    const u = new URL(r.request().url()); hf.push(u.pathname);
    const m = u.pathname.match(/^\/onnx-community\/Qwen2\.5-0\.5B-Instruct\/resolve\/main\/(.+)$/);
    const f = m && path.join(FIX || '', m[1].replace('model_q4f16.onnx', 'model_q4.onnx'));
    if (FIX && m && fs.existsSync(f)) { const d = fs.readFileSync(f); return r.fulfill({ status: 200, body: d, headers: { 'content-type': 'application/octet-stream', 'content-length': String(d.length), 'access-control-allow-origin': '*' } }); }
    if (FIX) return r.fulfill({ status: 404, body: 'not found', headers: { 'access-control-allow-origin': '*' } });
    return r.abort();
  });
  await p.goto('http://localhost:8772/'); await p.waitForSelector('#authScreen .auth-box');
  await p.click('[data-act="auth-mode"][data-m="signup"]');
  await p.fill('#auId', 'tester'); await p.fill('#auPw', 'pass1234'); await p.fill('#auPw2', 'pass1234');
  await p.selectOption('#auGrade', 'm2'); await p.fill('#auName', '김지우'); await p.fill('#auSchool', '한빛중학교'); await p.fill('#auSno', '20315'); await p.check('#auTerms');
  await p.fill('#capIn', await p.evaluate('capText')); await p.click('#auGo');
  await p.waitForSelector('#obOv'); await p.click('[data-ob="skip"]');
  await p.waitForSelector('#ltOv'); await p.click('[data-lt="close"]');
  await p.waitForSelector('#recOv.show'); await p.click('#recOv [data-act="rec-close"]'); await p.waitForTimeout(300);

  // 기본 AI 는 서버(로그인) · 키. 기기 AI 를 고른 뒤 처음 부르면 받을지 물어보고, 거절하면(로그인 안 한 로컬 계정) 설정에서 받을 수 있다고 알려 줘요
  ok(await p.evaluate(() => config.provider === 'gemini'), '기본 AI 엔진 = 서버/키(Gemini 자리)');
  await p.evaluate(() => { config.provider = 'local'; });
  const preP = p.evaluate(async () => { try { await callAi(buildPrompt('apple', false), normalizeResult, { task: 'word' }); return 'no error'; } catch (e) { return e.message; } });
  await p.waitForSelector('.dlg [data-d="0"]'); const askT = await p.textContent('.dlg p');
  ok(/오픈소스 AI\(Qwen\)/.test(askT), '처음 쓸 때 받을지 물어봄');
  await p.click('.dlg [data-d="0"]'); const pre = await preP;
  ok(/설정 > AI 기능에서 받을 수/.test(pre), '거절하면 안내 ' + pre);
  // 설정 화면: 키 · 모델 칸 숨김, 안내 · 버튼 글자
  await p.evaluate(() => go('tabSettings')); await p.evaluate(() => { document.querySelector('details.adv').open = true; });
  await p.selectOption('#cfgProvider', 'local');
  const ui = await p.evaluate(() => ({ key: getComputedStyle($('cfgKeyRow')).display, model: getComputedStyle($('cfgModelRow')).display, note: getComputedStyle($('cfgLocalNote')).display, btn: $('btnTestConn').textContent, prov: config.provider }));
  ok(ui.key === 'none' && ui.model === 'none' && ui.note !== 'none' && ui.btn === '기기 AI 받기 · 테스트' && ui.prov === 'local', '설정 화면 ' + JSON.stringify(ui));
  await p.screenshot({ path: path.join(shots, 'llm-settings.png') });

  // 받기 · 테스트: 확인 창 → 진짜 워커가 huggingface.co 에서 Qwen 파일을 찾아요
  await p.click('#btnTestConn'); await p.waitForSelector('.dlg [data-d="1"]'); await p.click('.dlg [data-d="1"]');
  await p.waitForFunction(() => /cfg-status (ok|err)/.test($('cfgStatus').className), null, { timeout: FIX ? 300000 : 60000 });
  const st = await p.evaluate(() => ({ cls: $('cfgStatus').className, t: $('cfgStatus').textContent }));
  ok(hf.some(x => x.startsWith('/onnx-community/Qwen2.5-0.5B-Instruct/resolve/main/tokenizer')), '워커가 Qwen 토크나이저를 요청 ' + JSON.stringify(hf.slice(0, 4)));
  if (FIX) {
    ok(/ok/.test(st.cls) && /apple →/.test(st.t), '작은 모델로 실제 생성 ' + JSON.stringify(st));
    ok(hf.some(x => /onnx\/model_q4\.onnx$/.test(x)), 'CPU에서 q4 모델 파일 요청 ' + JSON.stringify(hf.filter(x => /onnx/.test(x))));
    // 받은 뒤에는 AI 채우기가 기기 AI로 가요
    const r = await p.evaluate(async () => { try { const x = await callAi(buildPrompt('banana', false), normalizeResult, { task: 'word' }); return { m: x.meaning }; } catch (e) { return { e: e.message }; } });
    ok(r.m, '기기 AI로 단어 채우기 ' + JSON.stringify(r));
    ok(await p.evaluate(() => LS.getItem('vocapro_llm_ok') === '1' && $('btnTestConn').textContent === '기기 AI 테스트'), '받은 표시 · 버튼 글자');
  } else {
    ok(/err/.test(st.cls) && /모델을 받지 못했어요/.test(st.t), '모델을 못 받으면 알려 줌 ' + JSON.stringify(st));
  }
  await p.screenshot({ path: path.join(shots, 'llm-test.png') });
  ok(!errs.length, 'ERRORS: ' + (errs.join('\n') || 'none'));
  console.log(fails ? `FAILS: ${fails}` : 'FAILS: none');
  await b.close(); srv.close(); process.exit(fails ? 1 : 0);
})().catch(e => { console.log('FAIL crash', e.message); process.exit(1); });
