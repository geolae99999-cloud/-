// 기기 음성 AI 확인: 브라우저(Web Worker + wasm)에서 모델을 받아 채점하고, 말하기 연습이 가짜 마이크 소리를 듣고 맞다/틀리다를 정해요.
// test/fixtures: yes-human.wav (Google Speech Commands, CC BY 4.0), 나머지는 시험용 합성 음성
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, 'site'), fx = path.join(__dirname, 'fixtures');
const TYPES = { js: 'text/javascript', mjs: 'text/javascript', css: 'text/css', json: 'application/json', wasm: 'application/wasm', wav: 'audio/wav', txt: 'text/plain', bin: 'application/octet-stream' };
const srv = http.createServer((q, r) => {
  const u = decodeURIComponent(q.url.split('?')[0]);
  let f = u.startsWith('/fixtures/') ? path.join(fx, u.slice(10)) : path.join(root, u); if (f.endsWith('/')) f += 'index.html';
  fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': TYPES[f.split('.').pop()] || 'text/html; charset=utf-8' }); r.end(d); });
}).listen(8796);
const fails = [];
const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails.push(m); };

async function signup(p) {
  await p.goto('http://localhost:8796/'); await p.waitForSelector('#authScreen .auth-box');
  await p.click('[data-act="auth-mode"][data-m="signup"]'); await p.waitForTimeout(200);
  await p.fill('#auId', 'jiwoo'); await p.fill('#auPw', 'pass1234'); await p.fill('#auPw2', 'pass1234');
  await p.selectOption('#auGrade', 'm2'); await p.fill('#auName', '김지우'); await p.fill('#auSchool', '한빛중학교'); await p.fill('#auSno', '20315'); await p.check('#auTerms');
  await p.fill('#capIn', await p.evaluate('capText')); await p.click('#auGo');
  await p.waitForSelector('#obOv'); await p.click('[data-ob="skip"]'); await p.waitForSelector('#ltOv'); await p.click('[data-lt="close"]');
  await p.waitForSelector('#recOv.show'); await p.click('#recOv [data-act="rec-close"]'); await p.waitForTimeout(300);
}

(async () => {
  const errs = [];
  // 1) 엔진: 파일을 풀어 채점
  {
    const b = await chromium.launch(); const p = await (await b.newContext()).newPage();
    p.on('pageerror', e => errs.push(e.message));
    await signup(p);
    const t0 = Date.now(); const prog = [];
    await p.exposeFunction('__prog', x => prog.push(x));
    const ready = await p.evaluate(() => VPA.init(x => window.__prog(x)).then(() => true, e => e.message));
    ok(ready === true, `모델을 받아 준비 (${((Date.now() - t0) / 1000).toFixed(1)}초, 진행 ${prog.length}번, 마지막 ${prog[prog.length - 1]}%) ${ready}`);
    const cached = await p.evaluate(async () => (await (await caches.open('vp-asr-1')).keys()).length);
    ok(cached === 3, '모델 조각 3개를 이 기기(Cache)에 저장 ' + cached);
    const grade = (file, items) => p.evaluate(async ([file, items]) => {
      const buf = await (await fetch('/fixtures/' + file)).arrayBuffer(); const d = await spDecode(buf);
      const t = performance.now(); const r = await VPA.score(d.y, items); r.ms = Math.round(performance.now() - t); return r;
    }, [file, items]);
    let r = await grade('yes-human.wav', [{ text: 'yes', kind: 'w' }]);
    ok(r.items[0].score >= 80 && /yes/.test(r.items[0].heard), `사람 목소리 "yes" -> ${r.items[0].score}점, 들은 말 "${r.items[0].heard}" (${r.ms}ms)`);
    r = await grade('yes-human.wav', [{ text: 'yet', kind: 'w' }]);
    ok(r.items[0].score < 60, `같은 소리를 "yet"으로 채점하면 낮게 -> ${r.items[0].score}점`);
    const S = ['I eat an apple every day.', 'My brother likes to play soccer after school.', 'The library is very quiet in the morning.'];
    r = await grade('three-sent-skip.wav', S.map((text, idx) => ({ text, kind: 's', idx })));
    const sc = r.items.map(x => x.score);
    ok(sc[0] >= 85 && sc[1] === 0 && sc[2] >= 85, `파일 하나에 문장 3개(2번을 빼먹음) -> ${sc.join(', ')}점 (${r.ms}ms)`);
    ok(r.items.every(x => x.model === 'vocapro-local' && x.acc != null && x.flu != null && x.comp != null && typeof x.tips === 'string'), '결과에 정확도 · 유창성 · 완성도 · 조언');
    r = await grade('four-words.wav', ['apple', 'liver', 'trouble', 'library'].map((text, idx) => ({ text, kind: 'w', idx })));
    ok(r.items[0].score >= 85 && r.items[3].score >= 85 && r.items[1].score < 60 && r.items[2].score < 30, `단어 4개 파일, 2·3번은 다른 단어로 채점 -> ${r.items.map(x => x.score).join(', ')}`);
    { const e = await grade('yes-human.wav', [{ text: '2024', kind: 'w', idx: 0 }, { text: '안녕하세요', kind: 's', idx: 1 }, { text: 'yes', kind: 'w', idx: 2 }]);
      ok(e.items.length === 3 && e.items.every(x => x && typeof x.score === 'number') && e.items[0].score === 0 && e.items[1].score === 0 && e.items[2].idx === 2, '영어 글자가 없는 문항(2024, 한글)도 빈 값 대신 0점 결과 ' + e.items.map(x => x && x.score).join(',')); }
    const r2 = await grade('four-words.wav', ['apple', 'liver', 'trouble', 'library'].map((text, idx) => ({ text, kind: 'w', idx })));
    ok(JSON.stringify(r2.items.map(x => x.score)) === JSON.stringify(r.items.map(x => x.score)), '같은 소리는 몇 번을 해도 같은 점수');
    await b.close();
  }
  // 2) 말하기 연습: 가짜 마이크가 "river"를 말해요
  for (const [said, want] of [['river', true], ['liver', false]]) {
    const b = await chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--use-file-for-fake-audio-capture=' + path.join(fx, `say-${said}.wav`)] });
    const ctx = await b.newContext({ permissions: ['microphone'] }); const p = await ctx.newPage();
    p.on('pageerror', e => errs.push(e.message));
    await signup(p);
    await p.evaluate(() => { categories.push({ id: 'cR', name: 'R', words: [sanitizeWord({ id: uid(), word: 'river', meaning: '강' }), sanitizeWord({ id: uid(), word: 'apple', meaning: '사과' })] }); syncStorage(); startSession('speak', { type: 'cat', id: 'cR' }, 2); });
    await p.waitForSelector('#micBtn');
    // river 가 먼저 나오게
    await p.evaluate(() => { const i = S.queue.findIndex(x => x.w.word === 'river'); if (i !== S.idx) { const t = S.queue[S.idx]; S.queue[S.idx] = S.queue[i]; S.queue[i] = t; renderSpeak(S.queue[S.idx]); } });
    await p.click('#micBtn');
    await p.waitForFunction(() => /정확해요|들렸어요|잘 들리지/.test((document.querySelector('#spkOut') || {}).textContent || ''), null, { timeout: 120000 }).catch(() => {});
    const txt = await p.textContent('#spkOut').catch(() => '');
    ok(want ? /정확해요/.test(txt) : !/정확해요/.test(txt), `말하기 연습: 목표 river, 마이크로 "${said}" -> ${JSON.stringify(txt)}`);
    await b.close();
  }
  ok(!errs.length, 'ERRORS: ' + (errs.join(' | ') || 'none'));
  srv.close();
  console.log(fails.length ? `FAILED ${fails.length}` : 'ALL OK');
  process.exit(fails.length ? 1 : 0);
})();
