const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, 'site2');
const srv = http.createServer((q, r) => { let f = path.join(root, q.url.split('?')[0]); if (f.endsWith('/')) f += 'index.html'; fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': f.endsWith('.js') ? 'text/javascript' : f.endsWith('.css') ? 'text/css' : 'text/html; charset=utf-8' }); r.end(d); }); }).listen(8767);
(async () => {
  const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await require('./undef')(p, errs);
  await p.route(/fonts|jsdelivr/, r => r.abort());
  let saved = null, aiBody = null, failSave = false;
  await p.route('https://psmmrwhmpezyeehjivav.supabase.co/**', async r => {
    const u = r.request().url(), body = JSON.parse(r.request().postData() || '{}');
    const j = x => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(x) });
    if (u.endsWith('/voca_signup') || u.endsWith('/voca_signup_email')) return j({ token: 'tok', id: 1, username: body.p_user });
    if (u.endsWith('/voca_load')) return j(null);
    if (u.endsWith('/voca_save')) { if (failSave) return r.fulfill({ status: 500, body: 'x' }); saved = body; return j({ ok: true }); }
    if (u.endsWith('/voca_me')) return j({ id: 1, username: 'kim' });
    if (u.includes('/functions/v1/ai')) { aiBody = body; await new Promise(x => setTimeout(x, 300)); return j({ text: JSON.stringify({ meaning: '형 꾸준한', phonetic: '/x/', koreanPron: '엑스', example: 'Keep going.', exampleKo: '계속 가.', synonyms: 'steady' }) }); }
    return j({});
  });
  await p.goto('http://localhost:8767/'); await p.waitForSelector('.auth-box #auId'); await p.evaluate(() => { DEFAULT_CFG.provider = 'gemini'; }); // 이 시험은 서버 · 키 AI 경로를 봐요(기본은 기기 AI)
  await p.click('[data-m="signup"]'); await p.click('[data-act="auth-age"][data-k="0"]'); await p.fill('#auId', 'kim'); await p.fill('#auPw', 'pass1234'); await p.fill('#auPw2', 'pass1234');
  if (await p.$('#auEmail')) { await p.fill('#auEmail', 'kim@example.com'); await p.fill('#auCode', '123456'); } // 서버 계정 가입은 이메일 인증코드가 필요해요
  await p.click('#auNext'); await p.waitForSelector('#auGrade', { state: 'attached' }); await p.evaluate(g => { document.getElementById('auGrade').value = g; }, 'h1'); await p.fill('#auName', '김지우'); await p.fill('#auSchool', '한빛중학교'); await p.fill('#auSno', '20315'); await p.check('#auTerms'); await p.fill('#capIn', await p.evaluate('capText')); await p.click('#auGo');
  await p.waitForSelector('#obOv'); await p.click('[data-ob="skip"]'); await p.click('[data-lt="close"]');
  await p.waitForTimeout(2200);
  console.log('saved grade:', saved && JSON.parse(saved.p_data).cfg.grade, JSON.stringify(saved && JSON.parse(saved.p_data).cfg.profile));
  await p.evaluate(() => openBook(categories[0].id)); await p.click('.fab'); await p.fill('#fieldWord', 'zyzzyvax'); await p.click('#btnRunAi');
  await p.waitForSelector('.ai-state.ok');
  console.log('ai body:', JSON.stringify({ ...aiBody, prompt: aiBody.prompt.slice(0, 30) + '...' }));
  // AI가 채우는 중에 단어를 바꾸면 '채우는 중' 표시가 남지 않아요
  await p.fill('#fieldWord', 'qwertyx'); await p.click('#btnRunAi'); await p.waitForTimeout(100); await p.fill('#fieldWord', 'other'); await p.waitForTimeout(600);
  console.log('ai state after word change:', JSON.stringify(await p.textContent('#aiState')));
  await p.keyboard.press('Escape');
  // 서버 저장 실패 → 표시가 남고, 다시 연결되면 다시 올려요
  failSave = true; saved = null; await p.evaluate(() => syncStorage()); await p.waitForTimeout(2200);
  const d1 = await p.evaluate(() => cloudDirty()); failSave = false;
  await p.evaluate(() => window.dispatchEvent(new Event('online'))); await p.waitForTimeout(600);
  console.log('dirty retry:', d1, '->', await p.evaluate(() => cloudDirty()), 'saved:', !!saved);
  // 기본(기기 AI)인데 받기를 거절하면, 로그인한 계정은 서버 AI 로 채워요
  aiBody = null;
  const fb = p.evaluate(async () => { config.provider = 'local'; try { const r = await callAi(buildPrompt('zyzzyvb', false), normalizeResult, { task: 'word', word: 'zyzzyvb', lang: 'en' }); return r && r.meaning; } catch (e) { return 'ERR ' + e.message; } });
  await p.waitForSelector('.dlg [data-d="0"]'); await p.click('.dlg [data-d="0"]');
  const fbm = await fb;
  console.log('local declined -> server ai:', !!aiBody && !!fbm && !/^ERR/.test(fbm) ? 'FALLBACK_OK' : 'FAIL ' + fbm);
  console.log('errors:', errs.length ? errs : 'none'); await b.close(); srv.close();
})();
