// 발음 수행평가: 선생님 과제(발음 평가) -> 학생 녹음(가짜 마이크) · 제출 -> AI 채점(실제 AI 함수 코드 + 가짜 Gemini) -> 선생님 목록 · 듣기 · 점수 고치기 · 다시 채점 -> CSV
// 반 · 발음 RPC는 로컬 PostgreSQL(supabase_update_v6~v11.sql 적용)로 실제 실행해요. AI 함수(supabase/functions/ai/index.ts)는 TypeScript를 바로 변환해 Node에서 돌려요.
// 보안 검사: 반이 아닌 사람 올리기, 다른 학생 녹음 듣기, 다른 반 선생님, 너무 큰 · WAV 아닌 파일, 표 직접 읽기, 서비스 함수 anon 호출, 학생 점수 직접 제출
// 화면: test/shots/speak/ 와 /mnt/project-files/vocapro/screens/발음평가/ (SHOTS_OUT 로 바꿀 수 있어요)
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const ts = require('/opt/node22/lib/node_modules/typescript');
const http = require('http'), fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const root = path.join(__dirname, 'site2'), shots = path.join(__dirname, 'shots', 'speak');
const OUT = process.env.SHOTS_OUT || '/mnt/project-files/vocapro/screens/발음평가';
fs.mkdirSync(shots, { recursive: true }); try { fs.mkdirSync(OUT, { recursive: true }); } catch (e) {}
const srv = http.createServer((q, r) => { let f = path.join(root, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html'; fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': f.endsWith('.js') ? 'text/javascript' : f.endsWith('.css') ? 'text/css' : f.endsWith('.json') ? 'application/json' : 'text/html; charset=utf-8' }); r.end(d); }); }).listen(8795);
let fails = 0;
const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
// 긴 base64도 넣을 수 있게 SQL은 표준 입력으로 보내요
const psql = sql => execFileSync('psql', ['-U', 'postgres', '-At', '-v', 'ON_ERROR_STOP=1'], { input: sql, encoding: 'utf8', maxBuffer: 64 << 20, stdio: ['pipe', 'pipe', 'pipe'] }).trim();
const lit = v => v === null || v === undefined ? 'NULL' : typeof v === 'number' ? String(v) : typeof v === 'boolean' ? String(v) : typeof v === 'object' ? `$q$${JSON.stringify(v)}$q$::jsonb` : `$q$${String(v)}$q$`;
const call = (role, fn, args) => { const a = Object.keys(args).map(k => `${k} => ${lit(args[k])}`).join(', '); return JSON.parse(psql(`set role ${role}; select to_jsonb(public.${fn}(${a}))`).split('\n').pop()); };
const denied = (role, sql) => { try { psql(`set role ${role}; ${sql}`); return false; } catch (e) { return /permission denied/.test(String(e.stderr || e.message)); } };
const users = { kimteacher: 1, leestu: 2, parkstu: 3, otherteach: 5 }, store = {};
let MISSING = false, GEMINI = 'ok', gemReqs = [], puts = [], aiBodies = [];

/* ----- AI 함수: index.ts 를 변환해 Deno 대신 가짜 환경에서 실행 ----- */
let edge = null;
const env = { SUPABASE_URL: 'http://db', SUPABASE_SERVICE_ROLE_KEY: 'svc', GEMINI_API_KEY: 'test-key', AI_DAILY_LIMIT: '40', AI_GLOBAL_LIMIT: '3000' };
globalThis.Deno = { env: { get: k => env[k] }, serve: h => { edge = h; } };
const stubSb = { createClient: () => ({ rpc: async (fn, args) => {
  try { return { data: call('service_role', fn, args), error: null }; }
  catch (e) { const m = String(e.stderr || e.message); return { data: null, error: { code: /does not exist/.test(m) ? '42883' : 'XX000', message: m.slice(0, 200) } }; }
} }) };
{
  const src = fs.readFileSync(path.join(__dirname, '..', 'supabase', 'functions', 'ai', 'index.ts'), 'utf8');
  const out = ts.transpileModule(src, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS }, reportDiagnostics: true });
  const mod = { exports: {} };
  new Function('require', 'exports', 'module', out.outputText)(n => { if (/supabase-js/.test(n)) return stubSb; throw new Error('import ' + n); }, mod.exports, mod);
}
// 가짜 Gemini: 문항 글과 WAV 소리 조각이 맞게 왔는지 보고 점수를 돌려줘요
const realFetch = globalThis.fetch;
globalThis.fetch = async (url, o) => {
  if (!String(url).startsWith('https://generativelanguage.googleapis.com/')) return realFetch(url, o);
  const b = JSON.parse(o.body), parts = b.contents[0].parts; gemReqs.push({ url: String(url), parts: parts.map(p => p.text ? { text: p.text } : { mime: p.inlineData.mimeType, head: Buffer.from(p.inlineData.data, 'base64').subarray(0, 4).toString('latin1'), len: p.inlineData.data.length }), schema: b.generationConfig.responseSchema });
  if (GEMINI === 'busy') return new Response('{}', { status: 503 });
  const items = parts.filter(p => p.text && /^Item idx=/.test(p.text)).map(p => { const m = p.text.match(/idx=(\d+).*TARGET \w+: (".*")$/); return { idx: +m[1], text: JSON.parse(m[2]) }; });
  const text = JSON.stringify({ items: items.map(x => ({ idx: x.idx, score: Math.min(100, 72 + x.idx * 6), heard: x.text, tips: x.idx === 0 ? '끝소리 l을 혀끝으로 또렷하게 해 보세요.' : '또렷하고 자연스러워요. 강세만 조금 더 살려요.', problems: x.idx === 0 ? ['l'] : [] })) });
  return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text }] } }] }), { status: 200, headers: { 'Content-Type': 'application/json' } });
};

async function mock(p) {
  await p.route('https://psmmrwhmpezyeehjivav.supabase.co/**', async r => {
    const u = r.request().url(), body = JSON.parse(r.request().postData() || '{}'), fn = u.split('/').pop();
    const j = (x, st) => r.fulfill({ status: st || 200, contentType: 'application/json', body: JSON.stringify(x) });
    if (u.includes('/functions/v1/ai')) {
      aiBodies.push(body);
      const res = await edge(new Request('https://x.supabase.co/functions/v1/ai', { method: 'POST', headers: { origin: 'http://localhost:8795', 'content-type': 'application/json' }, body: JSON.stringify(body) }));
      return r.fulfill({ status: res.status, contentType: 'application/json', body: await res.text() });
    }
    if (fn === 'voca_signup' || fn === 'voca_login') return j({ token: 't' + users[body.p_user], id: users[body.p_user], username: body.p_user });
    const id = body.p_token ? +String(body.p_token).slice(1) : 0;
    if (fn === 'voca_me') return j({ id, username: 'x' });
    if (fn === 'voca_load') return j(store[id] ? { data: store[id], updated: 1 } : null);
    if (fn === 'voca_save') { store[id] = body.p_data; return j({ ok: true }); }
    if (/^voca_(class|assign|speak)_/.test(fn)) {
      if (MISSING && /^voca_speak_/.test(fn)) return j({ code: 'PGRST202', message: 'Could not find the function public.' + fn }, 404);
      if (fn === 'voca_speak_put') puts.push(body);
      const a = Object.keys(body).map(k => `${k} => ${lit(body[k])}`).join(', ');
      try { return j(JSON.parse(psql(`set role anon; select public.${fn}(${a})`).split('\n').pop())); }
      catch (e) { return j({ message: String(e.stderr || e.message).slice(0, 200) }, 400); }
    }
    return j({});
  });
}
async function signup(p, id, role, name, sno) {
  await p.goto('http://localhost:8795/'); await p.waitForSelector('.auth-box #auId');
  await p.click('[data-m="signup"]').catch(() => {}); await p.click('[data-act="auth-age"][data-k="0"]', { timeout: 1500 }).catch(() => {}); await p.fill('#auId', id); await p.fill('#auPw', 'pass1234'); await p.fill('#auPw2', 'pass1234');
  await p.selectOption('#auGrade', role); await p.fill('#auName', name); await p.fill('#auSchool', '한빛중학교'); if (sno) await p.fill('#auSno', sno);
  await p.check('#auTerms'); await p.fill('#capIn', await p.evaluate('capText')); await p.click('#auGo');
  await p.waitForSelector('#obOv'); await p.click('[data-ob="skip"]'); await p.waitForTimeout(500);
  await p.click('[data-lt="close"]').catch(() => {}); await p.waitForTimeout(800);
  await p.evaluate(() => { const o = document.getElementById('recOv'); if (o) o.remove(); });
}
// WAV 머리글 읽기
const wavInfo = b64 => { const b = Buffer.from(b64, 'base64'); return { riff: b.toString('latin1', 0, 4), wave: b.toString('latin1', 8, 12), fmt: b.readUInt16LE(20), ch: b.readUInt16LE(22), rate: b.readUInt32LE(24), bits: b.readUInt16LE(34), data: b.toString('latin1', 36, 40), dlen: b.readUInt32LE(40), len: b.length }; };
const mkWav = (sec, rate, ch) => { const n = Math.round(sec * rate) * ch, b = Buffer.alloc(44 + n * 2); b.write('RIFF', 0, 'latin1'); b.writeUInt32LE(36 + n * 2, 4); b.write('WAVEfmt ', 8, 'latin1'); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(ch, 22); b.writeUInt32LE(rate, 24); b.writeUInt32LE(rate * 2 * ch, 28); b.writeUInt16LE(2 * ch, 32); b.writeUInt16LE(16, 34); b.write('data', 36, 'latin1'); b.writeUInt32LE(n * 2, 40); for (let i = 0; i < n; i++) b.writeInt16LE(Math.round(Math.sin(i / 8) * 8000), 44 + i * 2); return b.toString('base64'); };
const BOOK = [['apple', '사과', 'I eat an apple every day.', '나는 매일 사과를 먹어요.'], ['river', '강', 'The river is very long.', '그 강은 아주 길어요.'], ['travel', '여행하다', '', ''], ['library', '도서관', 'She studies in the library.', '그녀는 도서관에서 공부해요.']];

(async () => {
  psql('truncate voca_speak_recs, voca_speak_rate, voca_submissions, voca_assignments, voca_class_members, voca_class_bans, voca_classes, voca_ai_usage restart identity cascade');
  const b = await chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--autoplay-policy=no-user-gesture-required'] });
  const errs = [];
  const page = async (vp, tag, init) => {
    const ctx = await b.newContext({ viewport: vp, acceptDownloads: true }), p = await ctx.newPage();
    p.on('pageerror', e => errs.push(tag + ' ' + e.message)); await require('./undef')(p, errs, tag);
    await p.route(/fonts|jsdelivr/, r => r.abort());
    await p.addInitScript(() => { try { window.speechSynthesis.speak = u => { (window.__spoken = window.__spoken || []).push(u.text); }; } catch (e) {} window.__blobs = 0; const c = URL.createObjectURL; URL.createObjectURL = o => { if (o && o.type === 'audio/wav') window.__blobs++; return c.call(URL, o); }; const r = URL.revokeObjectURL; window.__revoked = 0; URL.revokeObjectURL = u => { window.__revoked++; return r.call(URL, u); }; HTMLMediaElement.prototype.play = function () { window.__played = (window.__played || 0) + 1; return Promise.resolve(); }; });
    if (init) await p.addInitScript(init);
    await mock(p); return p;
  };
  const save = async (p, name, out) => { await p.screenshot({ path: path.join(shots, name + '.png') }); if (out) { try { fs.copyFileSync(path.join(shots, name + '.png'), path.join(OUT, out)); } catch (e) {} } };
  const dark = async (p, on) => { await p.emulateMedia({ colorScheme: on ? 'dark' : 'light' }); await p.evaluate(v => { config.darkMode = v; applyTheme(); }, on); await p.waitForTimeout(150); };

  // ===== 선생님: 반 만들기 + 발음 평가 과제 =====
  const T = await page({ width: 1280, height: 860 }, 'T');
  await signup(T, 'kimteacher', 'teacher', '김선생');
  await T.evaluate(B => { categories.push({ id: 'cSp', name: '발음 연습 1', words: B.map(([w, m, e, k]) => sanitizeWord({ word: w, meaning: m, example: e, exampleKo: k })) }); categories.push({ id: 'cBig', name: '큰 단어장', words: Array.from({ length: 25 }, (_, i) => sanitizeWord({ word: 'word' + i, meaning: '뜻' + i })) }); syncStorage(); }, BOOK);
  await T.click('[data-act="class-open"]'); await T.waitForSelector('#clName');
  await T.fill('#clName', '2학년 3반'); await T.click('[data-act="cl-create"]'); await T.waitForSelector('.cl-code b');
  const code = await T.textContent('.cl-code b');
  await T.click('[data-act="cl-tab"][data-t="asg"]'); await T.click('[data-act="cl-anew"]'); await T.waitForSelector('#caBook');
  ok(await T.isHidden('#caSpBox') && await T.isVisible('#caNumBox'), '과제 내기: 처음엔 시험 문제 수만 보여요');
  await T.click('#caKind [data-v="speak"]');
  ok(await T.isVisible('#caSpBox') && await T.isHidden('#caNumBox') && await T.isHidden('#caNote'), '발음 평가를 고르면 단어만/예문까지 설정이 보여요');
  await T.selectOption('#caBook', 'cSp'); await T.fill('#caTitle', '발음 평가 1'); await T.waitForTimeout(300); await save(T, 'T-01-new');
  await T.click('[data-act="cl-acreate"]'); await T.waitForSelector('[data-act="cl-ares"]');
  await T.click('[data-act="cl-anew"]'); await T.waitForSelector('#caBook'); await T.click('#caKind [data-v="speak"]'); await T.click('#caSp [data-v="s"]'); await T.selectOption('#caBook', 'cSp'); await T.fill('#caTitle', '예문 읽기'); await T.click('[data-act="cl-acreate"]'); await T.waitForTimeout(700);
  await T.click('[data-act="cl-anew"]'); await T.waitForSelector('#caBook'); await T.click('#caKind [data-v="speak"]'); await T.selectOption('#caBook', 'cBig'); await T.fill('#caTitle', '많은 단어'); await T.click('[data-act="cl-acreate"]'); await T.waitForTimeout(700);
  const asg = JSON.parse(psql(`select json_agg(json_build_object('id', id, 't', title, 'k', kind, 'w', words) order by id) from voca_assignments`));
  ok(asg.length === 3 && asg.every(a => a.k === 'speak'), '발음 평가 과제 3개가 speak 종류로 저장돼요');
  ok(JSON.stringify(asg[0].w[0]) === '["apple","사과","en","w"]' && asg[0].w.length === 4, '단어만: [단어, 뜻, en, w]');
  ok(asg[1].w[0][0] === 'I eat an apple every day.' && asg[1].w[0][3] === 's' && asg[1].w[2][0] === 'travel' && asg[1].w[2][3] === 'w', '예문까지: 예문이 있으면 예문(s), 없으면 단어(w)');
  ok(asg[2].w.length === 20, '단어장이 25개여도 20문항까지만 들어가요');
  ok(await T.$$eval('[data-act="cl-ares"] small', a => a.every(x => /발음 평가 · \d+문항/.test(x.textContent))), '과제 목록에 "발음 평가 · N문항"');
  const A1 = asg[0].id;

  // ===== 학생: 참여 -> 녹음 =====
  const P = await page({ width: 390, height: 844 }, 'S');
  await signup(P, 'leestu', 'm2', '이지우', '20315');
  await P.click('[data-act="class-open"]'); await P.waitForSelector('#clCode'); await P.fill('#clCode', code); await P.check('#clAgree'); await P.click('[data-act="cl-join"]'); await P.waitForSelector('.cl-asg');
  ok((await P.textContent('.cl-asg >> nth=2')).includes('발음 평가 · 4문항'), '학생 과제 목록: 발음 평가 · 4문항');
  await P.click('.cl-asg >> text=발음 평가 1'); await P.waitForSelector('.sp-card');
  ok((await P.textContent('.sp-text')) === 'apple' && (await P.textContent('.sp-mean')) === '사과', '첫 문항: 단어와 뜻');
  await P.click('[data-act="sp-listen"]'); ok((await P.evaluate(() => window.__spoken || [])).includes('apple'), '듣기: 원어민 발음(TTS)');
  ok(/최대 4초/.test(await P.textContent('#spCd')), '단어는 최대 4초');
  await save(P, 'S-01-record', '학생-녹음.png');
  await P.click('[data-act="sp-rec"]'); await P.waitForSelector('.dlg');
  const notice = await P.textContent('.dlg p'); ok(/선생님만 들을 수 있고 60일 뒤 자동으로 지워져요/.test(notice), '처음 녹음 전 안내(60일 삭제)');
  await P.click('.dlg [data-d="1"]');
  await P.waitForSelector('.sp-mic.on', { timeout: 5000 }); await P.waitForTimeout(1300);
  ok(/초 남았어요/.test(await P.textContent('#spCd')), '녹음 중: 남은 시간 표시');
  await save(P, 'S-02-recording');
  await P.click('[data-act="sp-rec"]'); await P.waitForSelector('.sp-mine', { timeout: 8000 });
  ok(puts.length === 1 && puts[0].p_idx === 0, '녹음 하나를 바로 서버에 올려요');
  const w0 = wavInfo(puts[0].p_b64);
  ok(w0.riff === 'RIFF' && w0.wave === 'WAVE' && w0.fmt === 1 && w0.ch === 1 && w0.rate === 16000 && w0.bits === 16 && w0.data === 'data' && w0.dlen === w0.len - 44, `WAV: 16kHz 모노 16비트 (${w0.len} B, ${(w0.dlen / 32000).toFixed(2)}초)`);
  ok(w0.dlen / 32000 <= 1.5 + 0.01, '녹음 길이는 누른 시간 이하');
  await P.click('[data-act="sp-play"]'); await P.waitForTimeout(200);
  ok(await P.evaluate(() => window.__blobs >= 1 && window.__played >= 1), '내 녹음 다시 듣기 (blob 주소 재생)');
  // 다시 녹음: 덮어써요
  await P.click('[data-act="sp-rec"]'); await P.waitForSelector('.sp-mic.on'); await P.waitForTimeout(900); await P.click('[data-act="sp-rec"]'); await P.waitForFunction(() => SP && SP.busy == null && !SP.rec, null, { timeout: 8000 });
  ok(puts.length === 2 && psql(`select count(*) from voca_speak_recs where assign_id = ${A1}`) === '1', '다시 녹음하면 같은 문항을 덮어써요');
  // 나머지 문항
  for (let i = 1; i < 4; i++) {
    await P.click('.sp-nav [data-act="sp-go"]:not([disabled]) >> text=다음'); await P.waitForFunction(k => SP && SP.i === k, i);
    await P.click('[data-act="sp-rec"]'); await P.waitForSelector('.sp-mic.on'); await P.waitForTimeout(1000); await P.click('[data-act="sp-rec"]');
    await P.waitForFunction(k => SP && SP.mine[k] && SP.busy == null, i, { timeout: 8000 });
  }
  ok(await P.isEnabled('[data-act="sp-submit"]'), '모두 녹음하면 제출 버튼이 켜져요');
  // AI가 바쁠 때: 제출은 되고 다시 채점 버튼
  GEMINI = 'busy';
  await P.click('[data-act="sp-submit"]'); await P.waitForSelector('.sp-sum', { timeout: 20000 });
  ok(/AI 채점을 하지 못했어요/.test(await P.textContent('.sp-note')) && !!(await P.$('[data-act="sp-grade"]')), 'AI가 바쁘면 안내 + "AI 채점 다시 하기"');
  ok(psql(`select count(*) from voca_submissions where assignment_id = ${A1}`) === '1', 'AI가 실패해도 제출은 기록돼요');
  GEMINI = 'ok'; gemReqs = [];
  await P.click('[data-act="sp-grade"]'); await P.waitForFunction(() => SP && SP.view === 'res' && !document.querySelector('.sp-note'), null, { timeout: 20000 });
  const g = gemReqs[gemReqs.length - 1];
  ok(!!g && g.parts.filter(x => x.mime === 'audio/wav' && x.head === 'RIFF').length === 4 && g.parts.filter(x => /^Item idx=\d+\. Language: English\. TARGET word: "/.test(x.text || '')).length === 4, 'Gemini 요청 1번: 문항 글 + WAV 소리 4개');
  ok(/Korean middle and high school/.test(g.parts[0].text) && /0: silence/.test(g.parts[0].text) && g.schema.properties.items.items.required.includes('score'), '채점 기준 프롬프트 + JSON 스키마');
  ok(psql(`select string_agg(ai_score::text, ',' order by idx) from voca_speak_recs where assign_id = ${A1}`) === '72,78,84,90', 'AI 점수가 DB에 저장돼요 (service_role 함수)');
  ok(psql(`select score || '/' || ok || '/' || n from voca_submissions where assignment_id = ${A1}`) === '81/4/4', '과제 점수 = 문항 점수 평균');
  ok(psql(`select n from voca_ai_usage where uid = '2' and day = current_date`) === '2', 'AI 사용량: 채점 한 번에 1회 (실패한 것 포함 2회)');
  const resTxt = await P.textContent('.sp');
  ok(/81\s*점/.test(await P.textContent('.sp-sum b')) && resTxt.includes('끝소리 l을') && resTxt.includes('AI가 들은 말'), '학생 결과: 점수, 들은 말, 조언');
  await save(P, 'S-03-result', '학생-결과.png');
  await dark(P, true); await save(P, 'S-03-result-dark');
  await P.click('[data-act="sp-redo"]'); await P.waitForSelector('.sp-card'); await save(P, 'S-01-record-dark'); await dark(P, false);
  await P.keyboard.press('Escape'); await P.waitForTimeout(300); await P.click('[data-act="class-open"]'); await P.waitForSelector('.cl-asg');
  ok((await P.textContent('.cl-asg:has-text("발음 평가 1")')).includes('81점'), '반 목록에 81점');
  ok(await P.evaluate(() => window.__revoked >= 1), '시트를 닫으면 blob 주소를 반납해요');
  // 예문 과제: 10초
  await P.click('.cl-asg >> text=예문 읽기'); await P.waitForSelector('.sp-card');
  ok(/최대 10초/.test(await P.textContent('#spCd')) && (await P.getAttribute('.sp-text', 'class')).includes('long'), '예문은 최대 10초, 긴 글씨');
  await P.keyboard.press('Escape');

  // ===== 다른 학생 (조금만 녹음) =====
  const Q = await page({ width: 390, height: 844 }, 'S2');
  await signup(Q, 'parkstu', 'm2', '박민', '20301');
  await Q.click('[data-act="class-open"]'); await Q.waitForSelector('#clCode'); await Q.fill('#clCode', code); await Q.check('#clAgree'); await Q.click('[data-act="cl-join"]'); await Q.waitForSelector('.cl-asg');
  await Q.click('.cl-asg >> text=발음 평가 1'); await Q.waitForSelector('.sp-card');
  await Q.click('[data-act="sp-rec"]'); await Q.click('.dlg [data-d="1"]'); await Q.waitForSelector('.sp-mic.on'); await Q.waitForTimeout(900); await Q.click('[data-act="sp-rec"]'); await Q.waitForSelector('.sp-mine', { timeout: 8000 });
  ok(await Q.isDisabled('.sp-nav button >> nth=0'), '첫 문항에서 이전 버튼은 꺼져 있어요');

  // ===== 선생님: 결과 목록 -> 학생 상세 -> 듣기 -> 점수 고치기 -> 다시 채점 =====
  await T.evaluate(() => clDetail(CLV.id, true)); await T.waitForSelector('[data-act="cl-tab"]'); await T.click('[data-act="cl-tab"][data-t="asg"]');
  ok((await T.textContent('[data-act="cl-ares"]:has-text("발음 평가 1")')).includes('제출 1/2'), '과제 목록: 제출 1/2');
  await T.click('[data-act="cl-ares"] >> text=발음 평가 1'); await T.waitForSelector('.sp-tt');
  const rows = await T.$$eval('.sp-tt .cl-tr:not(.cl-th)', a => a.map(x => x.textContent.replace(/\s+/g, ' ').trim()));
  ok(rows.length === 2 && rows.some(r => /이지우.*4\/4.*81.*-.*81/.test(r)) && rows.some(r => /박민.*1\/4.*미제출/.test(r)), '선생님 목록: 녹음 수, AI 평균, 선생님 점수, 점수 ' + JSON.stringify(rows));
  await save(T, 'T-02-list', '선생님-목록.png');
  await T.setViewportSize({ width: 390, height: 844 }); await T.waitForTimeout(200); await save(T, 'T-02-list-mobile');
  await dark(T, true); await save(T, 'T-02-list-mobile-dark'); await dark(T, false); await T.setViewportSize({ width: 1280, height: 860 });
  await T.click('.sp-tt [data-uid="2"]'); await T.waitForSelector('.sp-who');
  await T.click('[data-act="sp-tplay"][data-i="0"]'); await T.waitForTimeout(400);
  ok(await T.evaluate(() => window.__blobs >= 1 && window.__played >= 1), '선생님: ▶ 누르면 녹음을 받아 blob 주소로 재생');
  ok((await T.textContent('.sp-list')).includes('끝소리 l을'), '선생님 상세: AI 점수 · 들은 말 · 조언');
  await T.fill('#spT0', '95'); await T.fill('#spN0', '끝소리가 좋아졌어요'); await T.click('[data-act="sp-tsave"][data-i="0"]'); await T.waitForTimeout(900);
  ok(psql(`select t_score || '|' || t_note from voca_speak_recs where assign_id = ${A1} and uid = '2' and idx = 0`) === '95|끝소리가 좋아졌어요', '선생님 점수 · 메모 저장');
  await T.waitForTimeout(2600); await T.click('[data-act="sp-tplay"][data-i="1"]'); await T.waitForTimeout(300);
  await save(T, 'T-03-detail', '선생님-상세.png');
  await T.setViewportSize({ width: 390, height: 844 }); await T.waitForTimeout(200); await save(T, 'T-03-detail-mobile');
  await dark(T, true); await save(T, 'T-03-detail-mobile-dark'); await dark(T, false); await T.setViewportSize({ width: 1280, height: 860 });
  ok(psql(`select score from voca_submissions where assignment_id = ${A1} and uid = '2'`) === '87', '과제 점수에 선생님 점수 반영 (95,78,84,90 -> 87)');
  await T.fill('#spT1', '130'); await T.click('[data-act="sp-tsave"][data-i="1"]'); await T.waitForTimeout(300);
  ok(psql(`select coalesce(t_score::text, 'null') from voca_speak_recs where assign_id = ${A1} and uid = '2' and idx = 1`) === 'null', '0~100 밖의 점수는 저장하지 않아요');
  gemReqs = []; aiBodies = [];
  psql(`update voca_speak_recs set ai_score = 10 where assign_id = ${A1} and uid = '2'`);
  await T.click('[data-act="sp-regrade"]'); await T.click('.dlg [data-d="1"]'); await T.waitForFunction(() => SPT && document.querySelector('.sp-who') && !document.querySelector('[data-act="sp-regrade"][disabled]'), null, { timeout: 20000 }); await T.waitForTimeout(500);
  ok(aiBodies.length === 1 && aiBodies[0].student === '2' && gemReqs.length === 1 && psql(`select string_agg(ai_score::text, ',' order by idx) from voca_speak_recs where assign_id = ${A1} and uid = '2'`) === '72,78,84,90', '선생님 "AI 다시 채점": 학생 녹음 전체를 다시 채점');
  ok(psql(`select t_score from voca_speak_recs where assign_id = ${A1} and uid = '2' and idx = 0`) === '95', '다시 채점해도 선생님 점수는 남아요');
  // CSV
  await T.click('[data-act="sp-tlist"]'); await T.click('[data-act="cl-back"]'); await T.waitForSelector('[data-act="cl-csv"]');
  const [dl] = await Promise.all([T.waitForEvent('download'), T.click('[data-act="cl-csv"]')]);
  const csv = fs.readFileSync(await dl.path(), 'utf8').replace(/^﻿/, '').split('\r\n');
  const h = csv[0].split(','), r2 = csv.find(l => l.includes('이지우')).split(','), ci = h.indexOf('발음 평가 1 AI 평균');
  ok(ci > 0 && h[ci - 1] === '발음 평가 1 (발음 평가)' && h[ci + 1] === '발음 평가 1 선생님 점수' && r2[ci - 1] === '87' && r2[ci] === '81' && r2[ci + 1] === '95', 'CSV: 발음 평가 점수 · AI 평균 · 선생님 점수 ' + [r2[ci - 1], r2[ci], r2[ci + 1]].join('/'));
  // 학생이 다시 열면 선생님 점수 · 메모
  await P.click('.cl-asg >> text=발음 평가 1').catch(async () => { await P.click('[data-act="class-open"]'); await P.click('.cl-asg >> text=발음 평가 1'); });
  await P.waitForSelector('.sp-sum'); ok((await P.textContent('.sp-list')).includes('선생님 95점 · 끝소리가 좋아졌어요'), '학생 결과에 선생님 점수 · 메모');
  await P.keyboard.press('Escape');
  // 다시 녹음하면 AI 점수만 지워져요
  ok(call('anon', 'voca_speak_put', { p_token: 't2', p_assign: A1, p_idx: 1, p_b64: mkWav(1, 16000, 1) }).ok === true && psql(`select coalesce(ai_score::text, 'null') from voca_speak_recs where assign_id = ${A1} and uid = '2' and idx = 1`) === 'null', '다시 녹음하면 그 문항 AI 점수가 지워져요');
  // 옛 녹음에 대한 늦은 AI 점수는 쓰지 않아요
  ok(call('service_role', 'voca_speak_set_ai', { p_uid: '2', p_assign: A1, p_idx: 1, p_score: 50, p_detail: { v: '1' } }) === false, '그사이 다시 녹음했으면 늦게 온 AI 점수는 버려요');
  ok(call('service_role', 'voca_speak_set_ai', { p_uid: '2', p_assign: A1, p_idx: 1, p_score: 66, p_detail: { tips: '좋아요' } }) === true && psql(`select ai_score from voca_speak_recs where assign_id = ${A1} and uid = '2' and idx = 1`) === '66', 'service_role 이 voca_speak_set_ai 로 점수를 써요');

  // ===== 보안 =====
  const t = (u, fn, args) => call('anon', fn, Object.assign({ p_token: 't' + u }, args));
  const wav = mkWav(1, 16000, 1);
  ok(t(9, 'voca_speak_put', { p_assign: A1, p_idx: 0, p_b64: wav }).err === 'no_assign', '반 학생이 아니면 올릴 수 없어요');
  ok(t(1, 'voca_speak_put', { p_assign: A1, p_idx: 0, p_b64: wav }).err === 'no_assign', '선생님 계정도 학생 녹음 칸에 올릴 수 없어요');
  ok(t(3, 'voca_speak_put', { p_assign: A1, p_idx: 4, p_b64: wav }).err === 'bad_input' && t(3, 'voca_speak_put', { p_assign: A1, p_idx: -1, p_b64: wav }).err === 'bad_input', '문항 번호 범위 검사');
  ok(t(3, 'voca_speak_put', { p_assign: A1, p_idx: 0, p_b64: mkWav(11, 16000, 1) }).err === 'too_big', '340KB 넘는 녹음은 거절 (11초)');
  ok(t(3, 'voca_speak_put', { p_assign: A1, p_idx: 0, p_b64: Buffer.from('hello world, this is not audio'.repeat(300)).toString('base64') }).err === 'bad_audio', 'WAV가 아니면 거절');
  ok(t(3, 'voca_speak_put', { p_assign: A1, p_idx: 0, p_b64: mkWav(1, 44100, 1) }).err === 'bad_audio' && t(3, 'voca_speak_put', { p_assign: A1, p_idx: 0, p_b64: mkWav(1, 16000, 2) }).err === 'bad_audio', '16kHz 모노가 아니면 거절');
  ok(t(3, 'voca_speak_put', { p_assign: A1, p_idx: 0, p_b64: '%%%not base64%%%' }).err === 'bad_audio', 'base64가 깨졌으면 거절');
  ok(t(3, 'voca_speak_audio', { p_assign: A1, p_uid: '2', p_idx: 0 }).err === 'no_assign', '다른 학생 녹음은 들을 수 없어요');
  ok(!!t(2, 'voca_speak_audio', { p_assign: A1, p_uid: '2', p_idx: 0 }).b64 && !!t(1, 'voca_speak_audio', { p_assign: A1, p_uid: '2', p_idx: 0 }).b64, '학생 본인과 반 선생님은 들을 수 있어요');
  call('anon', 'voca_class_create', { p_token: 't5', p_name: '다른 반', p_teacher: '오', p_school: '' });
  ok(t(5, 'voca_speak_results', { p_assign: A1 }).err === 'no_assign' && t(5, 'voca_speak_audio', { p_assign: A1, p_uid: '2', p_idx: 0 }).err === 'no_assign' && t(5, 'voca_speak_teacher', { p_assign: A1, p_uid: '2', p_idx: 0, p_score: 0, p_note: '' }).err === 'no_assign', '다른 반 선생님은 결과 · 녹음 · 점수에 접근할 수 없어요');
  ok(t(2, 'voca_speak_results', { p_assign: A1 }).err === 'no_assign' && t(2, 'voca_speak_teacher', { p_assign: A1, p_uid: '2', p_idx: 0, p_score: 100, p_note: '' }).err === 'no_assign', '학생은 반 결과를 보거나 점수를 고칠 수 없어요');
  ok(t(2, 'voca_assign_submit', { p_assign: A1, p_ok: 10, p_n: 10, p_sec: 1, p_wrong: [] }).err === 'no_assign', '발음 평가는 voca_assign_submit 으로 점수를 올릴 수 없어요');
  ok(t(3, 'voca_speak_submit', { p_assign: A1 }).err === 'not_done', '다 녹음하지 않으면 제출할 수 없어요');
  ok(['anon', 'authenticated'].every(r => denied(r, 'select * from voca_speak_recs') && denied(r, 'select * from voca_speak_rate') && denied(r, "insert into voca_speak_recs(assign_id, uid, idx) values (1, '1', 0)")), '표를 직접 읽고 쓸 수 없어요 (anon, authenticated)');
  ok(['anon', 'authenticated'].every(r => denied(r, `select voca_speak_for_grade('2', ${A1}, false)`) && denied(r, `select voca_speak_set_ai('2', ${A1}, 0, 100, '{}')`) && denied(r, `select voca_speak_is_owner('1', ${A1})`) && denied(r, `select voca_speak_sync(${A1}, '2')`)), '서비스 함수는 anon · authenticated 가 부를 수 없어요');
  ok(call('service_role', 'voca_speak_is_owner', { p_uid: '1', p_assign: A1 }) === true && call('service_role', 'voca_speak_is_owner', { p_uid: '5', p_assign: A1 }) === false, 'voca_speak_is_owner');
  ok(call('service_role', 'voca_speak_for_grade', { p_uid: '9', p_assign: A1, p_all: true }).err === 'no_assign', 'for_grade: 반 학생이 아니면 꺼내지 않아요');
  // AI 함수: 다른 반 선생님의 다시 채점, 남의 과제 채점
  const edgeCall = async (tok, extra) => { const r = await edge(new Request('https://x/functions/v1/ai', { method: 'POST', headers: { origin: 'http://localhost:8795' }, body: JSON.stringify(Object.assign({ token: tok, task: 'pron' }, extra)) })); return [r.status, await r.json()]; };
  ok((await edgeCall('t5', { assign: A1, student: '2' }))[0] === 403, 'AI 함수: 다른 반 선생님은 다시 채점할 수 없어요 (403)');
  ok((await edgeCall('t9', { assign: A1 }))[0] === 403, 'AI 함수: 반 학생이 아니면 채점할 수 없어요');
  ok((await edgeCall('t2', { assign: 'x' }))[0] === 400 && (await edgeCall('', { assign: A1 }))[0] === 401, 'AI 함수: 잘못된 요청 400, 로그인 없으면 401');
  const before = psql(`select n from voca_ai_usage where uid = '3' and day = current_date`) || '0';
  ok((await edgeCall('t3', { assign: asg[1].id }))[1].items.length === 0 && (psql(`select n from voca_ai_usage where uid = '3' and day = current_date`) || '0') === before, 'AI 함수: 채점할 녹음이 없으면 AI 사용량을 쓰지 않아요');
  const corsBad = await edge(new Request('https://x/functions/v1/ai', { method: 'POST', headers: { origin: 'https://evil.example' }, body: '{}' }));
  ok(corsBad.status === 403, 'AI 함수: 다른 사이트 주소는 막아요 (CORS 그대로)');
  // 시간당 올리기 한도
  psql(`insert into voca_speak_rate(uid, hr, n) values ('3', date_trunc('hour', now()), 120) on conflict (uid, hr) do update set n = 120`);
  ok(t(3, 'voca_speak_put', { p_assign: A1, p_idx: 0, p_b64: wav }).err === 'too_many', '한 시간에 120번 넘게 올리면 막아요');
  // 60일 보관
  psql(`update voca_speak_recs set created_at = now() - interval '61 days' where assign_id = ${A1} and uid = '2' and idx = 3`);
  const rr = t(1, 'voca_speak_results', { p_assign: A1 }), it3 = rr.rows.find(x => x.uid === '2').items.find(x => x.idx === 3);
  ok(it3.audio === false && it3.ai_score === 90 && psql(`select coalesce(octet_length(audio), -1) from voca_speak_recs where assign_id = ${A1} and uid = '2' and idx = 3`) === '-1', '60일 지난 녹음 파일은 지우고 점수는 남겨요');
  ok(t(1, 'voca_speak_audio', { p_assign: A1, p_uid: '2', p_idx: 3 }).err === 'no_rec', '지워진 녹음은 no_rec');
  // ===== 서버 v11이 없을 때 =====
  MISSING = true;
  await T.evaluate(() => clDetail(CLV.id, true)); await T.waitForSelector('[data-act="cl-tab"]'); await T.click('[data-act="cl-tab"][data-t="asg"]');
  await T.click('[data-act="cl-ares"] >> text=예문 읽기'); await T.waitForSelector('.cl-load span');
  ok((await T.textContent('#sheetBody')).includes('supabase_update_v11.sql'), 'v11 없음: 선생님 결과 화면에 SQL 안내');
  await T.click('[data-act="cl-back"]'); await T.waitForSelector('[data-act="cl-anew"]'); await T.click('[data-act="cl-anew"]'); await T.waitForSelector('#caBook'); await T.click('#caKind [data-v="speak"]'); await T.click('[data-act="cl-acreate"]'); await T.waitForSelector('.dlg');
  ok((await T.textContent('.dlg p')).includes('supabase_update_v11.sql'), 'v11 없음: 발음 평가 과제를 만들기 전에 안내');
  await T.click('.dlg [data-d="1"]');
  await P.click('[data-act="class-open"]'); await P.waitForSelector('.cl-asg'); await P.click('.cl-asg >> text=예문 읽기'); await P.waitForSelector('.cl-load span');
  ok((await P.textContent('#sheetBody')).includes('supabase_update_v11.sql'), 'v11 없음: 학생 화면에 안내');
  MISSING = false;

  // ===== 마이크 거부 · 녹음 못 하는 브라우저 =====
  const D = await page({ width: 390, height: 844 }, 'D', () => { navigator.mediaDevices.getUserMedia = () => Promise.reject(Object.assign(new Error('no'), { name: 'NotAllowedError' })); });
  await signup(D, 'parkstu', 'm2', '박민', '20301');
  await D.click('[data-act="class-open"]'); await D.waitForSelector('.cl-asg', { timeout: 5000 }).catch(async () => { console.log('D sheet:', await D.textContent('#sheetBody')); }); await D.click('.cl-asg >> text=예문 읽기'); await D.waitForSelector('.sp-card');
  await D.click('[data-act="sp-rec"]'); await D.click('.dlg [data-d="1"]'); await D.waitForSelector('.sp-note');
  ok(/마이크를 쓸 수 없어요/.test(await D.textContent('.sp-note')), '마이크를 거부하면 허용 방법 안내');
  await D.evaluate(() => { Object.defineProperty(navigator, 'mediaDevices', { value: undefined, configurable: true }); }); await D.click('[data-act="sp-rec"]'); await D.waitForTimeout(300);
  ok(/이 브라우저에서는 녹음할 수 없어요/.test(await D.textContent('.sp-note')), '녹음을 못 하는 브라우저 안내');

  // 학생 녹음 화면 PC
  const W = await page({ width: 1280, height: 860 }, 'W');
  await signup(W, 'parkstu', 'm2', '박민', '20301');
  await W.click('[data-act="class-open"]'); await W.waitForSelector('.cl-asg'); await W.click('.cl-asg >> text=예문 읽기'); await W.waitForSelector('.sp-card'); await save(W, 'S-04-record-pc');

  // 나가기 · 과제 삭제 · 계정 지우기
  ok(t(3, 'voca_class_leave', { p_class: +psql('select id from voca_classes where owner = \'1\'') }).ok && psql("select count(*) from voca_speak_recs where uid = '3'") === '0', '반에서 나가면 그 학생 녹음도 지워져요');
  t(1, 'voca_assign_delete', { p_assign: A1 });
  ok(psql(`select count(*) from voca_speak_recs where assign_id = ${A1}`) === '0', '과제를 지우면 녹음도 지워져요');
  t(2, 'voca_class_forget', {});
  ok(psql("select count(*) from voca_speak_recs where uid = '2'") === '0', '계정을 지우면(class_forget) 녹음도 지워져요');

  console.log('ERRORS:', errs.length ? errs.join('\n') : 'none');
  console.log(fails ? `${fails} FAIL` : 'ALL OK');
  await b.close(); srv.close(); process.exit(fails || errs.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
