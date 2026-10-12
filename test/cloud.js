const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, 'site2');
const srv = http.createServer((q, r) => { let f = path.join(root, q.url.split('?')[0]); if (f.endsWith('/')) f += 'index.html'; fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': f.endsWith('.js') ? 'text/javascript' : f.endsWith('.css') ? 'text/css' : 'text/html; charset=utf-8' }); r.end(d); }); }).listen(8767);
(async () => {
  const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.route(/fonts|jsdelivr/, r => r.abort());
  let saved = null, aiBody = null;
  await p.route('https://psmmrwhmpezyeehjivav.supabase.co/**', async r => {
    const u = r.request().url(), body = JSON.parse(r.request().postData() || '{}');
    const j = x => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(x) });
    if (u.endsWith('/voca_signup')) return j({ token: 'tok', id: 1, username: body.p_user });
    if (u.endsWith('/voca_load')) return j(null);
    if (u.endsWith('/voca_save')) { saved = body; return j({ ok: true }); }
    if (u.endsWith('/voca_me')) return j({ id: 1, username: 'kim' });
    if (u.includes('/functions/v1/ai')) { aiBody = body; await new Promise(x => setTimeout(x, 300)); return j({ text: JSON.stringify({ meaning: '형 꾸준한', phonetic: '/x/', koreanPron: '엑스', example: 'Keep going.', exampleKo: '계속 가.', synonyms: 'steady' }) }); }
    return j({});
  });
  await p.goto('http://localhost:8767/'); await p.waitForSelector('.auth-box #auId');
  await p.click('[data-m="signup"]'); await p.click('[data-act="auth-age"][data-k="0"]'); await p.fill('#auId', 'kim'); await p.fill('#auPw', 'pass1234'); await p.fill('#auPw2', 'pass1234');
  await p.selectOption('#auGrade', 'h1'); await p.fill('#auName', '김지우'); await p.fill('#auSchool', '한빛중학교'); await p.fill('#auSno', '20315'); await p.check('#auTerms'); await p.fill('#capIn', await p.evaluate('capText')); await p.click('#auGo');
  await p.waitForSelector('#obOv'); await p.click('[data-ob="skip"]'); await p.click('[data-lt="close"]');
  await p.waitForTimeout(2200);
  console.log('saved grade:', saved && JSON.parse(saved.p_data).cfg.grade, JSON.stringify(saved && JSON.parse(saved.p_data).cfg.profile));
  await p.evaluate(() => openBook(categories[0].id)); await p.click('.fab'); await p.fill('#fieldWord', 'zyzzyvax'); await p.click('#btnRunAi');
  await p.waitForSelector('.ai-state.ok');
  console.log('ai body:', JSON.stringify({ ...aiBody, prompt: aiBody.prompt.slice(0, 30) + '...' }));
  console.log('errors:', errs.length ? errs : 'none'); await b.close(); srv.close();
})();
