// 진짜 Qwen 확인(인터넷 필요, GitHub Actions 에서 돌려요): huggingface.co 에서 모델을 받아 단어 뜻 · 묶음 · 번역을 만들고 시간을 재요.
// 사용: node test/llm-real.js <public 폴더> [모델] [dtype]   (npm i playwright, npx playwright install chromium)
// 결과는 GitHub 주석(::notice)으로도 남겨요(로그를 못 받는 곳에서도 보이게).
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.resolve(process.argv[2] || 'public'), MODEL = process.argv[3] || '', DTYPE = process.argv[4] || '';
const note = (t, m) => { console.log(t + ': ' + m); if (process.env.GITHUB_ACTIONS) console.log(`::notice title=${(MODEL || 'default').replace(/[:,]/g, ' ')} ${t}::${String(m).replace(/[\r\n%]/g, ' ').slice(0, 900)}`); };
const limit = (pr, ms) => Promise.race([pr, new Promise(r => setTimeout(() => r('TIMEOUT ' + ms / 1000 + 's'), ms))]);
const TYPES = { '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.wasm': 'application/wasm' };
const srv = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]); if (u === '/config.js') { r.writeHead(200, { 'Content-Type': 'text/javascript' }); return r.end("window.VOCA_CLOUD = { url: '', apiKey: '' };"); } let f = path.join(root, u); if (f.endsWith('/')) f += 'index.html'; fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'text/html; charset=utf-8' }); r.end(d); }); }).listen(8790);
(async () => {
  const b = await chromium.launch({ args: ['--enable-unsafe-webgpu'] });
  const p = await (await b.newContext({ viewport: { width: 1200, height: 900 } })).newPage();
  p.on('console', m => { if (/기기 AI|error/i.test(m.text())) console.log('console:', m.text().slice(0, 300)); });
  p.on('pageerror', e => console.log('pageerror:', e.message));
  await p.goto('http://localhost:8790/'); await p.waitForSelector('#authScreen .auth-box');
  await p.click('[data-act="auth-mode"][data-m="signup"]');
  await p.fill('#auId', 'tester'); await p.fill('#auPw', 'pass1234'); await p.fill('#auPw2', 'pass1234');
  await p.selectOption('#auGrade', 'm2'); await p.fill('#auName', '김지우'); await p.fill('#auSchool', '한빛중학교'); await p.fill('#auSno', '20315'); await p.check('#auTerms');
  await p.fill('#capIn', await p.evaluate('capText')); await p.click('#auGo');
  await p.waitForSelector('#obOv'); await p.click('[data-ob="skip"]');
  const t0 = Date.now();
  const init = await limit(p.evaluate(async ([m, d]) => { config.provider = 'local'; try { await VLM.init(null, m ? { model: m, dtype: d } : null); LS.setItem('vocapro_llm_ok', '1'); return 'ready ' + VLM.device; } catch (e) { return 'ERR ' + e.message; } }, [MODEL, DTYPE]), 20 * 60000);
  note('init', init + ' ' + ((Date.now() - t0) / 1000).toFixed(0) + 's');
  if (!/^ready/.test(init)) { await b.close(); srv.close(); process.exit(1); }
  const run = async (label, fn, arg) => { const t = Date.now(); const r = await limit(p.evaluate(fn, arg), 180000); note(label, ((Date.now() - t) / 1000).toFixed(1) + 's ' + JSON.stringify(r)); return r; };
  // 한 단어 뜻(짧은 답) → 예문까지(긴 답) → 중국어 → 묶음 3개
  const one = async ([w, full, lang]) => { try { return await callAi(buildPrompt(w, full), normalizeResult, { task: 'word', word: w, full, lang }, { once: true }); } catch (e) { return 'ERR ' + e.message; } };
  for (const w of ['kayak', 'reluctant', 'photosynthesis']) await run('word ' + w, one, [w, false, 'en']);
  await run('full serendipity', one, ['serendipity', true, 'en']);
  await run('zh 电脑', one, ['电脑', false, 'zh']);
  await run('batch', async () => { const ws = ['canoe', 'glacier', 'harvest']; try { return await callAi(buildBatchPrompt(ws), normalizeBatch, { task: 'batch', words: ws, lang: 'en' }, { once: true }); } catch (e) { return 'ERR ' + e.message; } });
  await b.close(); srv.close(); process.exit(0);
})().catch(e => { console.log('crash', e.message); process.exit(1); });
