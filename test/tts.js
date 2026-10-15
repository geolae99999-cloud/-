// 읽어주기: 고른 목소리가 소리를 못 내면 다른 목소리로 다시, 그 언어 목소리가 없으면 설치 방법 안내(한 번)
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, 'site');
const srv = http.createServer((q, r) => { let f = path.join(root, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html'; fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': /\.m?js$/.test(f) ? 'text/javascript' : f.endsWith('.css') ? 'text/css' : 'text/html; charset=utf-8' }); r.end(d); }); }).listen(8799);
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
(async () => {
  const b = await chromium.launch(), errs = [];
  async function page(voices, failNames, ua) {
    const ctx = await b.newContext(ua ? { userAgent: ua } : {}), p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
    await p.addInitScript(([voices, failNames]) => {
      window.__tries = [];
      const s = window.speechSynthesis;
      s.getVoices = () => voices.map(v => Object.assign({ default: false, localService: false, voiceURI: v.name }, v));
      // 진짜 SpeechSynthesisVoice가 아니라 u.voice 에 못 넣어요 -> 시도 순서로 어떤 목소리였는지 알아요
      let n = 0;
      s.speak = u => { const k = n++; window.__tries.push([u.text, u.lang, k]); setTimeout(() => (failNames.includes(k) ? u.onerror && u.onerror({ error: 'synthesis-failed' }) : failNames.includes('quiet' + k) ? u.onend && u.onend() : (u.onstart && u.onstart(), setTimeout(() => u.onend && u.onend(), 20))), 5); };
    }, [voices, failNames]);
    await p.goto('http://localhost:8799/'); await p.waitForSelector('#authScreen .auth-box');
    return p;
  }
  const ZH = [{ name: 'Google 普通话（中国大陆）', lang: 'zh-CN' }, { name: 'Microsoft Huihui', lang: 'zh-CN', localService: true }, { name: 'Microsoft Heami', lang: 'ko-KR', localService: true }, { name: 'Microsoft Zira', lang: 'en-US', localService: true }];
  // 1) 첫 목소리가 실패하면 다른 중국어 목소리로 다시 해서 소리가 나요(안내 창 없음)
  let p = await page(ZH, [0]);
  await p.evaluate(() => speak('学习', 'zh-CN'));
  ok((await p.evaluate(() => __tries.length)) === 2 && !(await p.$('#sayOv.show, .say-ov.show, [role="alertdialog"]')), '첫 목소리가 실패하면 다른 중국어 목소리로 한 번 더(안내 없음) ' + JSON.stringify(await p.evaluate(() => __tries)));
  await p.context().close();
  // 2) 이 기기에 중국어 목소리가 아예 없으면 설치 방법을 한 번 알려 줘요
  p = await page(ZH.slice(2), [], 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36');
  // 저절로 읽어 줄 때(카드 넘김 등)는 하던 일을 막지 않게 짧은 알림만
  await p.evaluate(() => speak('学习', 'zh-CN')); await p.waitForTimeout(300);
  const t0 = await p.evaluate(() => ({ dlg: !!document.querySelector('.dlg'), toast: (document.querySelector('#toast') || {}).textContent || '' }));
  ok(!t0.dlg && /중국어 소리가 안 나요/.test(t0.toast), '저절로 읽다 실패하면 창 없이 짧은 알림 ' + JSON.stringify(t0));
  await p.evaluate(() => speak('学习', 'zh-CN', { ask: true }));
  await p.waitForTimeout(300);
  const t1 = await p.evaluate(() => document.body.innerText);
  ok(/중국어 소리를 낼 목소리를 찾지 못했어요/.test(t1) && /Windows 설정/.test(t1), '중국어 목소리가 없으면 안내(Windows: 음성 추가 · Chrome/Edge)');
  // 3) 영어는 영어 목소리로 그대로
  await p.evaluate(() => { document.querySelectorAll('[data-act="say-ok"], .modal .btn-primary').forEach(x => x.click()); });
  await p.evaluate(() => { __tries.length = 0; return speak('apple', 'en-US'); });
  ok((await p.evaluate(() => __tries.length)) === 1, '영어는 한 번에');
  await p.context().close();
  // 4) 모든 목소리가 실패하면(인터넷 목소리가 막힌 곳) 3번까지 해 보고 안내 (Android)
  p = await page(ZH, [0, 1, 2], 'Mozilla/5.0 (Linux; Android 14; SM-S918N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36');
  await p.evaluate(() => speak('学习', 'zh-CN', { ask: true })); await p.waitForTimeout(300);
  const t4 = await p.evaluate(() => document.body.innerText);
  ok((await p.evaluate(() => __tries.length)) === 3 && /텍스트 음성 변환/.test(t4), '다 실패하면 3번까지 해 보고 안내(Android: TTS 엔진 · 음성 데이터)');
  await p.context().close();
  // 5) 삼성 폰: 오류 없이 바로 끝나기만 하면(소리 없음) 실패로 보고 다른 목소리로, 다 안 되면 삼성용 안내
  p = await page(ZH, ['quiet0', 'quiet1', 'quiet2'], 'Mozilla/5.0 (Linux; Android 14; SM-S921N) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/26.0 Chrome/122.0 Mobile Safari/537.36');
  await p.evaluate(() => speak('学习', 'zh-CN', { ask: true })); await p.waitForTimeout(300);
  const t5 = await p.evaluate(() => document.body.innerText);
  ok((await p.evaluate(() => __tries.length)) === 3 && /삼성 폰/.test(t5) && /Google 음성 인식 및 합성/.test(t5), '삼성: 소리 없이 바로 끝나면 다른 목소리로, 그래도 안 되면 삼성 설정 안내');
  await p.context().close();
  p = await page(ZH, ['quiet0']);
  await p.evaluate(() => speak('学习', 'zh-CN'));
  ok((await p.evaluate(() => __tries.length)) === 2, '첫 목소리가 소리 없이 끝나면 두 번째 목소리로 소리가 나요');
  await p.context().close();
  console.log('ERRORS:', errs.length ? errs.join('\n') : 'none'); await b.close(); srv.close();
  console.log(fails || errs.length ? 'SOME FAILED' : 'ALL OK'); process.exit(fails || errs.length ? 1 : 0);
})();
