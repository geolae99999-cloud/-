// 원어민 목소리(서버 tts): 늦으면 기기 목소리로 바로, 미리 받기, 너무 긴 소리 거르기, 기기 목소리가 실패하면 원어민 소리 기다리기
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, 'site');
const AUD = process.env.AUD_DIR || path.join(__dirname, 'fixtures');
const clip = n => fs.readFileSync(path.join(AUD, n));
const reqs = []; let delay = 0;
const srv = http.createServer((q, r) => {
  const u = q.url.split('?')[0];
  if (u.startsWith('/storage/')) { r.writeHead(404, { 'Access-Control-Allow-Origin': '*' }); return r.end(); }
  if (u === '/functions/v1/tts') {
    if (q.method === 'OPTIONS') { r.writeHead(200, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' }); return r.end(); }
    let b = ''; q.on('data', d => b += d); q.on('end', () => {
      const j = JSON.parse(b); reqs.push(j.text);
      setTimeout(() => { r.writeHead(200, { 'Content-Type': 'audio/mpeg', 'Access-Control-Allow-Origin': '*' }); r.end(clip(/^his\.?$/.test(j.text) ? 'long.mp3' : 'short.mp3')); }, delay);
    });
    return;
  }
  let f = path.join(root, decodeURIComponent(u)); if (f.endsWith('/')) f += 'index.html';
  fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': /\.m?js$/.test(f) ? 'text/javascript' : f.endsWith('.css') ? 'text/css' : 'text/html; charset=utf-8' }); r.end(d); });
}).listen(8798);
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
(async () => {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] }), errs = [];
  async function page(devFail) {
    const ctx = await b.newContext(), p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
    await p.addInitScript(devFail => {
      window.__dev = []; window.__plays = [];
      const s = window.speechSynthesis;
      s.getVoices = () => [{ name: 'Microsoft Zira', lang: 'en-US', localService: true, voiceURI: 'z', default: true }];
      s.speak = u => { window.__dev.push(u.text); setTimeout(() => devFail ? (u.onerror && u.onerror({ error: 'synthesis-failed' })) : (u.onstart && u.onstart(), setTimeout(() => u.onend && u.onend(), 20)), 5); };
      const p0 = HTMLMediaElement.prototype.play;
      HTMLMediaElement.prototype.play = function () { const a = this; a.addEventListener('playing', () => window.__plays.push(Math.round(a.duration * 10) / 10), { once: true }); return p0.call(a); };
    }, devFail);
    await p.goto('http://localhost:8798/'); await p.waitForSelector('#authScreen .auth-box');
    await p.evaluate(() => { window.VOCA_CLOUD = { url: 'http://localhost:8798', apiKey: '' }; });
    return p;
  }
  let p = await page(false);
  // 1) 서버가 늦으면(3초) 기기 목소리로 1.5초 안에 읽어요
  delay = 3000; let t = Date.now();
  await p.evaluate(() => speak('apple', 'en-US'));
  ok(Date.now() - t < 2200 && (await p.evaluate(() => __dev)).includes('apple'), `늦으면 기기 목소리로 바로 (${Date.now() - t}ms)`);
  // 2) 뒤에서 받아 둔 원어민 소리를 다음엔 바로 써요
  await p.waitForTimeout(2000);
  await p.evaluate(() => { __dev.length = 0; return speak('apple', 'en-US'); });
  ok((await p.evaluate(() => __plays.length)) === 1 && !(await p.evaluate(() => __dev.length)), '두 번째는 원어민 소리 ' + JSON.stringify(await p.evaluate(() => __plays)));
  ok(reqs.filter(x => x === 'apple.').length === 1, '한 단어도 마침표를 붙여 한 번만 만들어요 ' + JSON.stringify(reqs));
  // 3) 미리 받기: 다음 카드 소리를 받아 두면 바로 원어민 소리
  delay = 500; await p.evaluate(() => ttsPrefetch('banana')); await p.waitForTimeout(900);
  t = Date.now(); await p.evaluate(() => { __dev.length = 0; __plays.length = 0; return speak('banana', 'en-US'); });
  ok((await p.evaluate(() => __plays.length)) === 1 && !(await p.evaluate(() => __dev.length)), '미리 받은 소리는 바로 원어민으로');
  // 3-1) 미리 받는 중이면 같은 소리를 두 번 만들지 않아요
  delay = 800; await p.evaluate(() => { ttsPrefetch('cherry'); return speak('cherry', 'en-US'); });
  ok(reqs.filter(x => x === 'cherry.').length === 1, '미리 받는 중인 소리는 한 번만 요청');
  // 4) his: 소리가 너무 길면(뒤에 없는 소리) 버리고 기기 목소리로
  delay = 50; await p.evaluate(() => { __dev.length = 0; __plays.length = 0; return speak('his', 'en-US'); });
  ok((await p.evaluate(() => __dev)).includes('his'), '너무 긴 짧은 단어 소리는 기기 목소리로 ' + JSON.stringify(await p.evaluate(() => ({ d: __dev, p: __plays }))));
  await p.context().close();
  // 5) 기기 목소리가 소리를 못 내면 원어민 소리를 기다렸다 읽고, 그 뒤로는 원어민 소리를 끝까지 기다려요
  p = await page(true); delay = 2500;
  await p.evaluate(() => speak('grape', 'en-US'));
  ok((await p.evaluate(() => __plays.length)) === 1, '기기 목소리 실패 -> 원어민 소리로 다시');
  await p.evaluate(() => { __dev.length = 0; __plays.length = 0; return speak('melon', 'en-US'); });
  ok((await p.evaluate(() => __plays.length)) === 1 && !(await p.evaluate(() => __dev.length)), '그 뒤로는 원어민 소리를 기다려요');
  await p.context().close();
  console.log('ERRORS:', errs.length ? errs.join('\n') : 'none'); await b.close(); srv.close();
  console.log(fails || errs.length ? 'SOME FAILED' : 'ALL OK'); process.exit(fails || errs.length ? 1 : 0);
})();
