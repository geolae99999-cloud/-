// 기기 음성 AI 확인: 브라우저(Web Worker + wasm)에서 모델을 받아 채점하고, 말하기 연습이 가짜 마이크 소리를 듣고 맞다/틀리다를 정해요.
// test/fixtures: yes-human.wav (Google Speech Commands, CC BY 4.0), zh-human.wav · zh-two-sent.wav (sherpa-onnx 중국어 모델의 시험 녹음), 나머지는 시험용 합성 음성
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
  await p.click('#auNext'); await p.waitForSelector('#auGrade', { state: 'attached' }); await p.evaluate(g => { document.getElementById('auGrade').value = g; }, 'm2'); await p.fill('#auName', '김지우'); await p.fill('#auSchool', '한빛중학교'); await p.fill('#auSno', '20315'); await p.check('#auTerms');
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
    const grade = (file, items, lang) => p.evaluate(async ([file, items, lang]) => {
      const buf = await (await fetch('/fixtures/' + file)).arrayBuffer(); const d = await spDecode(buf);
      const t = performance.now(); const r = await VPA.score(d.y, items, lang); r.ms = Math.round(performance.now() - t); return r;
    }, [file, items, lang]);
    let r = await grade('yes-human.wav', [{ text: 'yes', kind: 'w' }]);
    ok(r.items[0].score >= 80 && /yes/.test(r.items[0].heard), `사람 목소리 "yes" -> ${r.items[0].score}점, 들은 말 "${r.items[0].heard}" (${r.ms}ms)`);
    r = await grade('yes-human.wav', [{ text: 'yet', kind: 'w' }]);
    ok(r.items[0].score < 60, `같은 소리를 "yet"으로 채점하면 낮게 -> ${r.items[0].score}점`);
    const S = ['I eat an apple every day.', 'My brother likes to play soccer after school.', 'The library is very quiet in the morning.'];
    r = await grade('three-sent-skip.wav', S.map((text, idx) => ({ text, kind: 's', idx })));
    const sc = r.items.map(x => x.score);
    ok(sc[0] >= 85 && sc[1] === 0 && sc[2] >= 85, `파일 하나에 문장 3개(2번을 빼먹음) -> ${sc.join(', ')}점 (${r.ms}ms)`);
    ok(r.items.every(x => x.model === 'vocapro-local' && x.acc != null && x.flu != null && x.comp != null && Array.isArray(x.miss) && typeof x.tips === 'string'), '결과에 정확성 · 유창성 · 일치도 · 빠뜨린 자리 · 조언');
    ok([0, 2].every(i => r.items[i].score === Math.round(r.items[i].acc * 0.7 + r.items[i].flu * 0.3) && r.items[i].comp === 100 && !r.items[i].miss.length) && r.items[1].comp === 0 && r.items[1].miss.length === 8,
      '점수 = 정확성 70% + 유창성 30%, 다 읽은 문장은 일치도 100%, 빼먹은 문장은 0% ' + r.items.map(x => `${x.score}=${x.acc}/${x.flu}/${x.comp}%`).join(' '));
    { const m = await grade('three-sent-skip.wav', [{ text: 'I eat an apple every single day.', kind: 's', idx: 0 }, { text: S[2], kind: 's', idx: 1 }]), x = m.items[0];
      ok(x.comp === 86 && x.miss.join() === '5' && x.score < r.items[0].score && x.score === Math.round(x.acc * 0.7 + x.flu * 0.3) && /single/.test(x.tips),
        `읽지 않은 단어(single)가 든 문장 -> 일치도 ${x.comp}%, 빠뜨린 자리 ${x.miss}, ${x.score}점 (다 읽으면 ${r.items[0].score}점) "${x.tips}"`); }
    r = await grade('four-words.wav', ['apple', 'liver', 'trouble', 'library'].map((text, idx) => ({ text, kind: 'w', idx })));
    ok(r.items[0].score >= 85 && r.items[3].score >= 85 && r.items[1].score < 60 && r.items[2].score < 30, `단어 4개 파일, 2·3번은 다른 단어로 채점 -> ${r.items.map(x => x.score).join(', ')}`);
    { const e = await grade('yes-human.wav', [{ text: '2024', kind: 'w', idx: 0 }, { text: '안녕하세요', kind: 's', idx: 1 }, { text: 'yes', kind: 'w', idx: 2 }]);
      ok(e.items.length === 3 && e.items.every(x => x && typeof x.score === 'number') && e.items[0].score === 0 && e.items[1].score === 0 && e.items[2].idx === 2, '영어 글자가 없는 문항(2024, 한글)도 빈 값 대신 0점 결과 ' + e.items.map(x => x && x.score).join(',')); }
    const r2 = await grade('four-words.wav', ['apple', 'liver', 'trouble', 'library'].map((text, idx) => ({ text, kind: 'w', idx })));
    ok(JSON.stringify(r2.items.map(x => x.score)) === JSON.stringify(r.items.map(x => x.score)), '같은 소리는 몇 번을 해도 같은 점수');
    // 중국어: 모델을 따로 받아(4조각) 글자마다 채점
    const z0 = Date.now(), zp = [];
    await p.exposeFunction('__zprog', x => zp.push(x));
    const zr = await p.evaluate(() => VPA.init(x => window.__zprog(x), 'zh').then(() => true, e => e.message));
    ok(zr === true, `중국어 모델을 받아 준비 (${((Date.now() - z0) / 1000).toFixed(1)}초, 마지막 ${zp[zp.length - 1]}%) ${zr}`);
    ok(await p.evaluate(async () => (await (await caches.open('vp-asr-1')).keys()).length) === 7, '영어 3 + 중국어 4 조각을 이 기기에 저장');
    const Z0 = '对我做了介绍那么我想说的是呢大家如果对我的研究感兴趣呢', Z1 = '重点呢想谈三个问题首先呢就是这一轮全球金融动荡的表现';
    r = await grade('zh-human.wav', [{ text: Z0 + '。', kind: 's' }], 'zh');
    ok(r.items[0].score >= 90 && r.items[0].heard === Z0, `중국어 사람 목소리 문장 -> ${r.items[0].score}점, 들은 말 "${r.items[0].heard}" (${r.ms}ms)`);
    r = await grade('zh-human.wav', [{ text: Z1, kind: 's' }], 'zh');
    ok(r.items[0].score < 20, `같은 소리를 다른 문장으로 채점하면 낮게 -> ${r.items[0].score}점`);
    { const m = await grade('zh-human.wav', [{ text: Z0.slice(0, 10) + '今天' + Z0.slice(10), kind: 's' }], 'zh'), x = m.items[0];
      ok(x.miss.join() === '10,11' && x.comp === Math.round(Z0.length / (Z0.length + 2) * 100) && /今/.test(x.tips), `중국어 문장에 읽지 않은 글자(今天) -> 일치도 ${x.comp}%, 빠뜨린 자리 ${x.miss}, ${x.score}점`); }
    r = await grade('zh-two-sent.wav', [{ text: Z0, kind: 's', idx: 0 }, { text: '我每天早上七点起床', kind: 's', idx: 1 }, { text: Z1, kind: 's', idx: 2 }], 'zh');
    ok(r.items[0].comp === 100 && r.items[1].comp === 0 && r.items[0].score === Math.round(r.items[0].acc * 0.7 + r.items[0].flu * 0.3), '중국어도 점수 = 정확성 70% + 유창성 30%, 일치도 ' + r.items.map(x => x.comp + '%').join(' '));
    ok(r.items[0].score >= 85 && r.items[1].score === 0 && r.items[2].score >= 85, `중국어 파일 하나에 문장 3개(2번을 빼먹음) -> ${r.items.map(x => x.score).join(', ')}점 (${r.ms}ms)`);
    r = await grade('zh-human.wav', [{ text: 'abc 123', kind: 'w' }], 'zh');
    ok(r.items[0].score === 0 && /한자/.test(r.items[0].tips), '한자가 없는 문항은 0점 결과');
    r = await grade('yes-human.wav', [{ text: 'yes', kind: 'w' }]);
    ok(r.items[0].score >= 80, '중국어를 쓴 뒤에도 영어 채점은 그대로 ' + r.items[0].score);
    await b.close();
  }
  // 2) 말하기 연습: 가짜 마이크가 "river"를 말해요
  for (const [said, want, target] of [['river', true, 'river'], ['liver', false, 'river'], ['xuexi', true, '学习'], ['xuexi', false, '中国']]) {
    const b = await chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--use-file-for-fake-audio-capture=' + path.join(fx, `say-${said}.wav`)] });
    const ctx = await b.newContext({ permissions: ['microphone'] }); const p = await ctx.newPage();
    p.on('pageerror', e => errs.push(e.message));
    await signup(p);
    await p.evaluate(tg => { categories.push({ id: 'cR', name: 'R', words: [sanitizeWord({ id: uid(), word: tg, meaning: '뜻' }), sanitizeWord({ id: uid(), word: /[一-鿿]/.test(tg) ? '苹果' : 'apple', meaning: '사과' })] }); syncStorage(); startSession('speak', { type: 'cat', id: 'cR' }, 2); }, target);
    await p.waitForSelector('#micBtn');
    // 목표 단어가 먼저 나오게
    await p.evaluate(tg => { const i = S.queue.findIndex(x => x.w.word === tg); if (i !== S.idx) { const t = S.queue[S.idx]; S.queue[S.idx] = S.queue[i]; S.queue[i] = t; renderSpeak(S.queue[S.idx]); } }, target);
    await p.click('#micBtn');
    await p.waitForFunction(() => /정확해요|들렸어요|잘 들리지/.test((document.querySelector('#spkOut') || {}).textContent || ''), null, { timeout: 120000 }).catch(() => {});
    const txt = await p.textContent('#spkOut').catch(() => '');
    ok(want ? /정확해요/.test(txt) : !/정확해요/.test(txt), `말하기 연습: 목표 ${target}, 마이크로 "${said}" -> ${JSON.stringify(txt)}`);
    await b.close();
  }
  // 3) 녹음 파일 채점(누구나): 문장 + 파일 -> 이 기기에서 채점, 서버로 아무것도 보내지 않아요 (말하기 연습 점수에 정확성 · 유창성)
  {
    const b = await chromium.launch(); const ctx = await b.newContext({ acceptDownloads: true }), p = await ctx.newPage();
    p.on('pageerror', e => errs.push(e.message));
    await signup(p);
    const sent = []; p.on('request', q => { if (/supabase|functions\/v1|\/rpc\//.test(q.url()) && q.method() === 'POST') sent.push(q.url()); });
    await p.click('[data-act="fsc-open"]'); await p.waitForSelector('#fscText');
    await p.fill('#fscText', ['I eat an apple every day.', 'My brother likes to play soccer after school.', 'The library is very quiet in the morning.'].join('\n'));
    await p.setInputFiles('#fscIn', [path.join(fx, 'three-sent-skip.wav'), path.join(fx, 'yes-human.wav')]);
    await p.waitForSelector('#fscGo:not([disabled])'); const n0 = sent.length;
    await p.click('#fscGo');
    await p.waitForFunction(() => document.querySelectorAll('[data-act="fsc-res"]').length === 2, null, { timeout: 180000 });
    const rs = await p.$$eval('[data-act="fsc-res"]', a => a.map(x => x.textContent.replace(/\s+/g, ' ').trim()));
    const sc = rs.map(t => +((t.match(/(\d+)점$/) || [])[1]));
    ok(rs.length === 2 && rs.every(t => /정확성 \d+ · 유창성 \d+ · 일치도 \d+%/.test(t)), '파일 채점 결과: 점수 + 정확성 · 유창성 · 일치도 ' + JSON.stringify(rs));
    ok(sc[0] > 40 && sc[1] < 20, `문장 읽은 파일은 점수, 다른 말(yes) 파일은 낮게: ${sc}`);
    ok(sent.length === n0, '채점하는 동안 서버로 보낸 요청 없음 ' + (sent.length - n0));
    await p.click('[data-act="fsc-res"] >> nth=0'); await p.waitForSelector('.sp-det .sp-ri');
    ok((await p.$$('.sp-det .sp-ri')).length === 3 && /빠뜨린 말/.test(await p.textContent('.sp-det')), '자세히: 문장마다 점수, 빠뜨린 문장 표시');
    await p.screenshot({ path: path.join(__dirname, 'shots', 'qs-file.png'), fullPage: false });
    const [dl] = await Promise.all([p.waitForEvent('download'), p.click('[data-act="fsc-csv"]')]);
    const csv = fs.readFileSync(await dl.path(), 'utf8').replace(/^\ufeff/, '').split('\r\n');
    ok(csv[0].startsWith('파일,점수,정확성,유창성,일치도(%),1. I eat an apple') && csv.length === 3, 'CSV ' + csv[0].slice(0, 80));
    await b.close();
  }
  ok(!errs.length, 'ERRORS: ' + (errs.join(' | ') || 'none'));
  srv.close();
  console.log(fails.length ? `FAILED ${fails.length}` : 'ALL OK');
  process.exit(fails.length ? 1 : 0);
})();
