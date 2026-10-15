// 발음 수행평가: 선생님 과제(발음 평가) -> 학생 녹음(가짜 마이크, 16kHz MP3) · 제출(AI 채점 없음, '제출 완료') -> 선생님 보드(10초마다 새 제출)
const PG = require('./pgrst');
//   -> 선생님만 AI 채점(카드 하나 · 전체, 실제 AI 함수 코드 + 가짜 Gemini) -> 결과 목록 · 문항/최종 점수 -> 받은 파일(m4a·wav·zip) 채점 -> CSV -> 녹음 지우기
// 반 · 발음 RPC는 로컬 PostgreSQL(supabase_update_v6~v11.sql 적용)로 실제 실행해요. AI 함수(supabase/functions/ai/index.ts)는 TypeScript를 바로 변환해 Node에서 돌려요.
// 보안 검사: 학생 AI 채점 막기, 학생 화면에 AI 점수 없음, 반이 아닌 사람 올리기, 다른 학생 녹음, 다른 반 선생님, 너무 큰 · MP3 아닌 파일, 표 직접 읽기, 서비스 함수 anon 호출, 학생 점수 직접 제출, 발음 채점 한도
// 화면: test/shots/speak/ 와 /mnt/project-files/vocapro/screens/발음평가/ (SHOTS_OUT 로 바꿀 수 있어요). 소리 파일 준비에 ffmpeg 이 있어야 해요.
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const ts = require('/opt/node22/lib/node_modules/typescript');
const http = require('http'), fs = require('fs'), os = require('os'), path = require('path'), { execFileSync } = require('child_process');
const root = path.join(__dirname, 'site2'), shots = path.join(__dirname, 'shots', 'speak');
const OUT = process.env.SHOTS_OUT || '/mnt/project-files/vocapro/screens/발음평가';
fs.mkdirSync(shots, { recursive: true }); try { fs.mkdirSync(OUT, { recursive: true }); } catch (e) {}
const srv = http.createServer((q, r) => { let f = path.join(root, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html'; fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': /\.m?js$/.test(f) ? 'text/javascript' : f.endsWith('.wasm') ? 'application/wasm' : f.endsWith('.css') ? 'text/css' : f.endsWith('.json') ? 'application/json' : 'text/html; charset=utf-8' }); r.end(d); }); }).listen(8795);
let fails = 0;
const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
// 긴 base64도 넣을 수 있게 SQL은 표준 입력으로 보내요
const psql = sql => execFileSync('psql', ['-U', 'postgres', '-At', '-v', 'ON_ERROR_STOP=1'], { input: sql, encoding: 'utf8', maxBuffer: 64 << 20, stdio: ['pipe', 'pipe', 'pipe'] }).trim();
const lit = v => v === null || v === undefined ? 'NULL' : typeof v === 'number' ? String(v) : typeof v === 'boolean' ? String(v) : typeof v === 'object' ? `$q$${JSON.stringify(v)}$q$::jsonb` : `$q$${String(v)}$q$`;
const call = (role, fn, args) => { const a = Object.keys(args).map(k => `${k} => ${lit(args[k])}`).join(', '); return JSON.parse(psql(`set role ${role}; select to_jsonb(public.${fn}(${a}))`).split('\n').pop()); };
const denied = (role, sql) => { try { psql(`set role ${role}; ${sql}`); return false; } catch (e) { return /permission denied/.test(String(e.stderr || e.message)); } };
const users = { kimteacher: 1, leestu: 2, parkstu: 3, otherteach: 5 }, store = {};
let MISSING = false, GEMINI = 'ok', gemReqs = [], puts = [], aiBodies = [], resCalls = [];

/* ----- MP3: 시험 소리 만들기(앱과 같은 lamejs) · 머리글 읽기 ----- */
const lame = new Function(fs.readFileSync(path.join(__dirname, '..', 'public', 'lame.min.js'), 'utf8') + ';return lamejs;')();
const mkMp3 = (sec, rate = 16000, ch = 1, kbps = 32, f = 220) => {
  const enc = new lame.Mp3Encoder(ch, rate, kbps), n = Math.round(sec * rate), L = new Int16Array(n), out = [];
  for (let i = 0; i < n; i++) L[i] = Math.round(Math.sin(i * 2 * Math.PI * f / rate) * 9000 * (0.55 + 0.45 * Math.sin(i / rate * 9)));
  for (let i = 0; i < n; i += 1152) { const b = ch === 1 ? enc.encodeBuffer(L.subarray(i, i + 1152)) : enc.encodeBuffer(L.subarray(i, i + 1152), L.subarray(i, i + 1152)); if (b.length) out.push(Buffer.from(b.buffer, b.byteOffset, b.length)); }
  const fl = enc.flush(); if (fl.length) out.push(Buffer.from(fl.buffer, fl.byteOffset, fl.length));
  return Buffer.concat(out);
};
const KB = [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160];
// 첫 프레임 머리글 + 프레임이 끝까지 이어지는지(MPEG-2 Layer III 16kHz 기준)
const mp3Info = buf => {
  const b = Buffer.isBuffer(buf) ? buf : Buffer.from(buf, 'base64'); let p = 0;
  if (b.toString('latin1', 0, 3) === 'ID3') p = 10 + (b[6] & 127) * 2097152 + (b[7] & 127) * 16384 + (b[8] & 127) * 128 + (b[9] & 127);
  const h = b.subarray(p, p + 4), ver = (h[1] >> 3) & 3, layer = (h[1] >> 1) & 3;
  let q = p, frames = 0, chain = true;
  while (q + 4 <= b.length) { if (b[q] !== 255 || (b[q + 1] & 0xe6) !== 0xe2) { chain = false; break; } q += 72 * KB[b[q + 2] >> 4] * 1000 / 16000 + ((b[q + 2] >> 1) & 1); frames++; }
  return { sync: h[0] === 255 && (h[1] & 0xe0) === 0xe0, mpeg2: ver === 2, layer3: layer === 1, rate: ver === 2 && ((h[2] >> 2) & 3) === 2 ? 16000 : 0, mono: h[3] >> 6 === 3, kbps: KB[h[2] >> 4], frames, chain: chain && q === b.length, sec: frames * 576 / 16000, len: b.length };
};
const mp3Ok = x => x.sync && x.mpeg2 && x.layer3 && x.rate === 16000 && x.mono && x.chain;
const mkWav = (sec, rate, ch) => { const n = Math.round(sec * rate) * ch, b = Buffer.alloc(44 + n * 2); b.write('RIFF', 0, 'latin1'); b.writeUInt32LE(36 + n * 2, 4); b.write('WAVEfmt ', 8, 'latin1'); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(ch, 22); b.writeUInt32LE(rate, 24); b.writeUInt32LE(rate * 2 * ch, 28); b.writeUInt16LE(2 * ch, 32); b.writeUInt16LE(16, 34); b.write('data', 36, 'latin1'); b.writeUInt32LE(n * 2, 40); for (let i = 0; i < n; i++) b.writeInt16LE(Math.round(Math.sin(i / 8) * 8000 * (0.6 + 0.4 * Math.sin(i / rate * 7))), 44 + i * 2); return b; };

/* ----- 받은 파일 시험용: ffmpeg 로 m4a(Opus·AAC) · ogg · mp3, 파이썬으로 zip(UTF-8 이름 + 윈도우 CP949 이름) ----- */
const FX = fs.mkdtempSync(path.join(os.tmpdir(), 'spfx-'));
const ff = (args, out) => { execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-f', 'lavfi', '-i', 'aevalsrc=0.4*sin(2*PI*230*t)*(0.55+0.45*sin(2*PI*1.3*t)):s=48000:d=' + args.d].concat(args.o, [path.join(FX, out)])); return path.join(FX, out); };
const FILES = {
  m4a: ff({ d: 6, o: ['-ac', '1', '-c:a', 'libopus', '-f', 'mp4'] }, '30211_김주원_발음평가.m4a'), // MP4 안 Opus (시험 브라우저는 AAC를 못 풀어요)
  aac: ff({ d: 3, o: ['-ac', '1', '-c:a', 'aac'] }, '30215_정하은.m4a'),
  ogg: ff({ d: 4, o: ['-ac', '2', '-c:a', 'libopus'] }, 'KakaoTalk_20241014_1230.ogg'),
  mp3: ff({ d: 5, o: ['-ac', '2', '-ar', '44100', '-b:a', '128k'] }, '30213 박하늘.mp3'),
  cp: ff({ d: 3, o: ['-ac', '1', '-c:a', 'libopus'] }, 'cp.ogg')
};
FILES.wav = path.join(FX, '김서연_30212.wav'); fs.writeFileSync(FILES.wav, mkWav(5, 44100, 2));
FILES.zip = path.join(FX, '카톡녹음.zip');
execFileSync('python3', ['-I', '-c', `
import sys, zipfile
class CP(zipfile.ZipInfo):
    def _encodeFilenameFlags(self): return self.filename.encode('cp949'), self.flag_bits & ~0x800
d = sys.argv[1]
with zipfile.ZipFile(sys.argv[2], 'w', zipfile.ZIP_DEFLATED) as z:
    z.write(d + '/30213 박하늘.mp3', '녹음/30213 박하늘.mp3')
    z.write(d + '/KakaoTalk_20241014_1230.ogg', 'KakaoTalk_20241014_1230.ogg')
    z.writestr(CP('30214_최유나.ogg'), open(d + '/cp.ogg', 'rb').read())
    z.writestr('readme.txt', 'hello')
    z.writestr('__MACOSX/._30213 박하늘.mp3', 'x')
`, FX, FILES.zip]);

/* ----- AI 함수: index.ts 를 변환해 Deno 대신 가짜 환경에서 실행 ----- */
let edge = null;
const env = { SUPABASE_URL: 'http://db', SUPABASE_SERVICE_ROLE_KEY: 'svc', GEMINI_API_KEY: 'test-key', AI_DAILY_LIMIT: '40', AI_GLOBAL_LIMIT: '3000' };
globalThis.Deno = { env: { get: k => env[k] }, serve: h => { edge = h; } };
const stubSb = { createClient: () => ({ rpc: async (fn, args) => {
  try { return { data: call('service_role', fn, args), error: null }; }
  catch (e) { const m = String(e.stderr || e.message); return { data: null, error: { code: /does not exist/.test(m) ? '42883' : 'XX000', message: m.slice(0, 200) } }; }
}, from: tbl => { // service_role 표 읽기(select · eq · maybeSingle · head count)만
  const q = { cols: '*', where: [], head: false }, w = () => q.where.join(' and ') || 'true';
  const b = {
    select(c, o) { q.cols = c; q.head = !!(o && o.head); return b; },
    eq(c, v) { q.where.push(`${c} = '${String(v).replace(/'/g, "''")}'`); return b; },
    maybeSingle() { return Promise.resolve({ data: JSON.parse(psql(`select coalesce(json_agg(t), '[]') from (select ${q.cols} from public.${tbl} where ${w()} limit 1) t`))[0] || null, error: null }); },
    then(ok, no) { return Promise.resolve(q.head ? { count: +psql(`select count(*) from public.${tbl} where ${w()}`), error: null } : { data: JSON.parse(psql(`select coalesce(json_agg(t), '[]') from (select ${q.cols} from public.${tbl} where ${w()}) t`)), error: null }).then(ok, no); }
  };
  return b;
} }) };
{
  const src = fs.readFileSync(path.join(__dirname, '..', 'supabase', 'functions', 'ai', 'index.ts'), 'utf8');
  const out = ts.transpileModule(src, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS }, reportDiagnostics: true });
  const mod = { exports: {} };
  new Function('require', 'exports', 'module', out.outputText)(n => { if (/supabase-js/.test(n)) return stubSb; throw new Error('import ' + n); }, mod.exports, mod);
}
// 가짜 Gemini: 문항 글과 MP3 소리가 맞게 왔는지 기록하고, 소리 길이에 따라 정해진 점수를 돌려줘요
const realFetch = globalThis.fetch;
globalThis.fetch = async (url, o) => {
  if (!String(url).startsWith('https://generativelanguage.googleapis.com/')) return realFetch(url, o);
  const b = JSON.parse(o.body), parts = b.contents[0].parts;
  const items = parts.filter(p => p.text).flatMap(p => p.text.split('\n')).filter(l => /^Item idx=/.test(l)).map(l => { const m = l.match(/idx=(\d+)\. Language: ([^.]+)\. TARGET (\w+): (".*")$/); return { idx: +m[1], lang: m[2], kind: m[3], text: JSON.parse(m[4]) }; });
  const audio = parts.filter(p => p.inlineData).map(p => Object.assign({ mime: p.inlineData.mimeType }, mp3Info(p.inlineData.data)));
  const res = items.map((x, k) => { const a = audio[Math.min(k, audio.length - 1)] || { len: 0 }; const sc = 60 + (a.len + x.idx * 13) % 37; return { idx: x.idx, score: sc, accuracy: sc, fluency: sc, read: !(globalThis.HEARD && HEARD(x) === null), heard: globalThis.HEARD ? HEARD(x) || '' : x.text, tips: x.idx === 0 ? '끝소리 l을 혀끝으로 또렷하게 해 보세요.' : '또렷하고 자연스러워요. 강세만 조금 더 살려요.', problems: x.idx === 0 ? ['l'] : [] }; });
  gemReqs.push({ url: String(url), text: parts.filter(p => p.text).map(p => p.text).join('\n'), items, audio, res, schema: b.generationConfig.responseSchema, cfg: b.generationConfig });
  if (GEMINI === 'busy') return new Response('{}', { status: 503 });
  return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify({ items: res }) }] } }] }), { status: 200, headers: { 'Content-Type': 'application/json' } });
};

async function mock(p) {
  await p.route('https://psmmrwhmpezyeehjivav.supabase.co/**', async r => {
    const u = r.request().url(), body = JSON.parse(r.request().postData() || '{}'), fn = u.split('?')[0].split('/').pop();
    const j = (x, st) => r.fulfill({ status: st || 200, contentType: 'application/json', body: JSON.stringify(x) });
    if (u.includes('/functions/v1/ai')) {
      aiBodies.push(Object.assign({ url: u }, body));
      if (body.student) await new Promise(r => setTimeout(r, 300)); // 진행 표시를 볼 수 있게 조금 늦게
      const res = await edge(new Request(u.replace('psmmrwhmpezyeehjivav', 'x'), { method: 'POST', headers: { origin: 'http://localhost:8795', 'content-type': 'application/json' }, body: JSON.stringify(body) }));
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
      if (PG.on) { const x = await PG.call(fn, body); if (fn === 'voca_speak_results' && x.status === 200) { const o = JSON.parse(x.body); resCalls.push({ since: body.p_since || null, same: !!(o && o.same) }); } return r.fulfill({ status: x.status, contentType: 'application/json', body: x.body }); }
      try {
        const out = JSON.parse(psql(`set role anon; select public.${fn}(${a})`).split('\n').pop());
        if (fn === 'voca_speak_results') resCalls.push({ since: body.p_since || null, same: !!(out && out.same) });
        return j(out);
      } catch (e) { return j({ message: String(e.stderr || e.message).slice(0, 200) }, 400); }
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
const BOOK = [['apple', '사과', 'I eat an apple every day.', '나는 매일 사과를 먹어요.'], ['river', '강', 'The river is very long.', '그 강은 아주 길어요.'], ['travel', '여행하다', '', ''], ['library', '도서관', 'She studies in the library.', '그녀는 도서관에서 공부해요.']];
const errs = [];
const AI_KEYS = /"(ai_score|ai_detail|ai_avg|ai_n|heard|tips|problems)"/;

(async () => {
  psql('truncate voca_speak_recs, voca_speak_marks, voca_speak_rate, voca_submissions, voca_assignments, voca_class_members, voca_class_bans, voca_classes, voca_ai_usage restart identity cascade');
  const b = await chromium.launch({ env: Object.assign({}, process.env, { LANG: 'C.UTF-8' }), args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--autoplay-policy=no-user-gesture-required'] });
  const page = async (vp, tag, init) => {
    const ctx = await b.newContext({ viewport: vp, acceptDownloads: true }), p = await ctx.newPage();
    p.on('pageerror', e => errs.push(tag + ' ' + e.message)); p.on('console', m => { if (m.type() === 'error' && !/ERR_FAILED|Failed to load resource/.test(m.text())) errs.push(tag + ' console: ' + m.text()); }); await require('./undef')(p, errs, tag);
    await p.route(/fonts|jsdelivr/, r => r.abort());
    await p.addInitScript(() => { try { window.speechSynthesis.speak = u => { (window.__spoken = window.__spoken || []).push(u.text); }; } catch (e) {} window.__blobs = []; try { if (!localStorage.getItem('vp_eng')) localStorage.setItem('vp_eng', 'ai'); } catch (e) {} const c = URL.createObjectURL; URL.createObjectURL = o => { if (o && /^audio\//.test(o.type)) window.__blobs.push(o.type); return c.call(URL, o); }; const r = URL.revokeObjectURL; window.__revoked = 0; URL.revokeObjectURL = u => { window.__revoked++; return r.call(URL, u); }; HTMLMediaElement.prototype.play = function () { window.__played = (window.__played || 0) + 1; return Promise.resolve(); }; });
    if (init) await p.addInitScript(init);
    await mock(p); return p;
  };
  const save = async (p, name, out) => { await p.waitForFunction(() => !document.querySelector('#toast.show'), null, { timeout: 5000 }).catch(() => {}); await p.waitForTimeout(250); await p.screenshot({ path: path.join(shots, name + '.png') }); if (out) { try { fs.copyFileSync(path.join(shots, name + '.png'), path.join(OUT, out)); } catch (e) {} } };
  const dark = async (p, on) => { await p.emulateMedia({ colorScheme: on ? 'dark' : 'light' }); await p.evaluate(v => { config.darkMode = v; applyTheme(); }, on); await p.waitForTimeout(150); };
  const confirm = async p => { await p.waitForSelector('.dlg [data-d="1"]'); await p.click('.dlg [data-d="1"]'); };
  const usage = k => +(psql(`select n from voca_ai_usage where uid = '${k}' and day = current_date`) || 0);
  try { fs.readdirSync(OUT).filter(f => /^(학생-결과|선생님-목록|선생님-상세)\.png$/.test(f)).forEach(f => fs.unlinkSync(path.join(OUT, f))); } catch (e) {} // 예전 화면은 지워요

  // ===== 선생님: 반 만들기 + 발음 평가 과제 =====
  const T = await page({ width: 1280, height: 860 }, 'T');
  await signup(T, 'kimteacher', 'teacher', '김선생');
  await T.evaluate(B => { categories.push({ id: 'cSp', name: '발음 연습 1', words: B.map(([w, m, e, k]) => sanitizeWord({ word: w, meaning: m, example: e, exampleKo: k })) }); categories.push({ id: 'cBig', name: '큰 단어장', words: Array.from({ length: 25 }, (_, i) => sanitizeWord({ word: 'word' + i, meaning: '뜻' + i })) }); syncStorage(); }, BOOK);
  await T.click('[data-act="class-open"]'); await T.waitForSelector('#clName');
  await T.fill('#clName', '3학년 2반'); await T.click('[data-act="cl-create"]'); await T.waitForSelector('.cl-code b');
  const code = await T.textContent('.cl-code b'), CID = +psql('select id from voca_classes');
  await T.click('[data-act="cl-tab"][data-t="asg"]'); await T.click('[data-act="cl-anew"]'); await T.waitForSelector('#caBook');
  ok(await T.isHidden('#caSpBox') && await T.isVisible('#caNumBox'), '과제 내기: 처음엔 시험 문제 수만 보여요');
  await T.click('#caKind [data-v="speak"]');
  ok(await T.isVisible('#caSpBox') && await T.isHidden('#caNumBox') && await T.isHidden('#caNote'), '발음 평가를 고르면 단어만/예문까지 설정이 보여요');
  ok(/선생님 보드에 바로 모여요/.test(await T.textContent('#caSpBox')) && /학생에게는 선생님이 매긴 점수만/.test(await T.textContent('#caSpBox')), '과제 안내: 보드에 모이고 학생은 선생님 점수만');
  await T.selectOption('#caBook', 'cSp'); await T.fill('#caTitle', '발음 평가 1'); await T.waitForTimeout(300); await save(T, 'T-01-new');
  await T.click('[data-act="cl-acreate"]'); await T.waitForSelector('[data-act="cl-ares"]');
  await T.click('[data-act="cl-anew"]'); await T.waitForSelector('#caBook'); await T.click('#caKind [data-v="speak"]'); await T.click('#caSp [data-v="s"]'); await T.selectOption('#caBook', 'cSp'); await T.fill('#caTitle', '예문 읽기'); await T.click('[data-act="cl-acreate"]'); await T.waitForTimeout(700);
  await T.click('[data-act="cl-anew"]'); await T.waitForSelector('#caBook'); await T.click('#caKind [data-v="speak"]'); await T.selectOption('#caBook', 'cBig'); await T.fill('#caTitle', '많은 단어'); await T.click('[data-act="cl-acreate"]'); await T.waitForTimeout(700);
  const asg = JSON.parse(psql(`select json_agg(json_build_object('id', id, 't', title, 'k', kind, 'w', words) order by id) from voca_assignments`));
  ok(asg.length === 3 && asg.every(a => a.k === 'speak'), '발음 평가 과제 3개가 speak 종류로 저장돼요');
  ok(JSON.stringify(asg[0].w[0]) === '["apple","사과","en","w"]' && asg[0].w.length === 4, '단어만: [단어, 뜻, en, w]');
  ok(asg[1].w[0][0] === 'I eat an apple every day.' && asg[1].w[0][3] === 's' && asg[1].w[2][0] === 'travel' && asg[1].w[2][3] === 'w', '예문까지: 예문이 있으면 예문(s), 없으면 단어(w)');
  ok(asg[2].w.length === 20, '단어장이 25개여도 20문항까지만 들어가요');
  const A1 = asg[0].id, A2 = asg[1].id;

  // ===== 학생: 참여 -> 녹음(MP3) -> 제출 (AI 채점 없음) =====
  const P = await page({ width: 390, height: 844 }, 'S');
  await signup(P, 'leestu', 'm2', '이지우', '20315');
  await P.click('[data-act="class-open"]'); await P.waitForSelector('#clCode'); await P.fill('#clCode', code); await P.check('#clAgree'); await P.click('[data-act="cl-join"]'); await P.waitForSelector('.cl-asg');
  ok((await P.textContent('.cl-asg >> nth=2')).includes('발음 평가 · 4문항'), '학생 과제 목록: 발음 평가 · 4문항');
  ok(await P.evaluate(() => !window.lamejs && !document.querySelector('script[src="lame.min.js"]')), 'MP3 라이브러리는 녹음 전에는 불러오지 않아요');
  await P.click('.cl-asg >> text=발음 평가 1'); await P.waitForSelector('.sp-card');
  ok((await P.textContent('.sp-text')) === 'apple' && (await P.textContent('.sp-mean')) === '사과', '첫 문항: 단어와 뜻');
  await P.click('[data-act="sp-listen"]'); ok((await P.evaluate(() => window.__spoken || [])).includes('apple'), '듣기: 원어민 발음(TTS)');
  ok(/최대 4초/.test(await P.textContent('#spCd')), '단어는 최대 4초');
  await save(P, 'S-01-record', '학생-녹음.png');
  await P.click('[data-act="sp-rec"]'); await P.waitForSelector('.dlg');
  ok(/선생님만 들을 수 있고 60일 뒤 자동으로 지워져요/.test(await P.textContent('.dlg p')), '처음 녹음 전 안내(60일 삭제)');
  await P.click('.dlg [data-d="1"]');
  await P.waitForSelector('.sp-mic.on', { timeout: 5000 }); await P.waitForTimeout(2100);
  ok(/초 남았어요/.test(await P.textContent('#spCd')), '녹음 중: 남은 시간 표시');
  await save(P, 'S-02-recording');
  await P.click('[data-act="sp-rec"]'); await P.waitForSelector('.sp-mine', { timeout: 8000 });
  ok(await P.evaluate(() => typeof lamejs === 'function' && !!document.querySelector('script[src="lame.min.js"]')), '녹음할 때 lame.min.js 를 같은 주소에서 불러와요');
  ok(puts.length === 1 && puts[0].p_idx === 0, '녹음 하나를 바로 서버에 올려요');
  const m0 = mp3Info(puts[0].p_b64);
  ok(mp3Ok(m0) && m0.kbps === 32, `MP3: 프레임 시작 · MPEG-2 Layer III · 16kHz · 모노 · 32kbps, 프레임이 끝까지 이어져요 (${m0.len} B, ${m0.sec.toFixed(2)}초)`);
  ok(m0.sec <= 2.1 + 0.2 && m0.len < 64 * 1024, '녹음 길이는 누른 시간 이하, 단어 한도(64KB) 안');
  const dbBytes = psql(`select bytes || '|' || dur_ms from voca_speak_recs where assign_id = ${A1} and idx = 0`).split('|').map(Number);
  ok(dbBytes[0] === m0.len && Math.abs(dbBytes[1] - m0.len * 8 / 32) < 2, `DB에는 MP3 그대로(${dbBytes[0]} B), 길이 ${dbBytes[1]}ms`);
  await P.click('[data-act="sp-play"]'); await P.waitForTimeout(200);
  ok(await P.evaluate(() => window.__blobs.includes('audio/mpeg') && window.__played >= 1), '내 녹음 다시 듣기 (audio/mpeg blob 재생)');
  // 다시 녹음: 덮어써요
  await P.click('[data-act="sp-rec"]'); await P.waitForSelector('.sp-mic.on'); await P.waitForTimeout(900); await P.click('[data-act="sp-rec"]'); await P.waitForFunction(() => SP && SP.busy == null && !SP.rec, null, { timeout: 8000 });
  ok(puts.length === 2 && psql(`select count(*) from voca_speak_recs where assign_id = ${A1}`) === '1', '다시 녹음하면 같은 문항을 덮어써요');
  for (let i = 1; i < 4; i++) {
    await P.click('.sp-nav [data-act="sp-go"]:not([disabled]) >> text=다음'); await P.waitForFunction(k => SP && SP.i === k, i);
    await P.click('[data-act="sp-rec"]'); await P.waitForSelector('.sp-mic.on'); await P.waitForTimeout(1000); await P.click('[data-act="sp-rec"]');
    await P.waitForFunction(k => SP && SP.mine[k] && SP.busy == null, i, { timeout: 8000 });
  }
  ok(await P.isEnabled('[data-act="sp-submit"]') && /선생님께 제출하기/.test(await P.textContent('[data-act="sp-submit"]')), '모두 녹음하면 "선생님께 제출하기"');
  gemReqs = []; aiBodies = [];
  await P.click('[data-act="sp-submit"]'); await P.waitForSelector('.sp-done', { timeout: 8000 }); await P.waitForTimeout(500);
  ok(/제출 완료/.test(await P.textContent('.sp-done')) && /선생님이 녹음을 듣고 점수를 매기면/.test(await P.textContent('.sp')), '학생: 제출하면 "제출 완료" + 선생님 점수 안내');
  ok(aiBodies.length === 0 && gemReqs.length === 0 && usage('2') === 0 && usage('pron:2') === 0, '학생이 제출해도 AI 채점을 부르지 않아요 (AI 사용 0)');
  ok(psql(`select count(*) from voca_submissions where assignment_id = ${A1}`) === '1', '제출이 기록돼요');
  await save(P, 'S-03-done-wait');
  await P.keyboard.press('Escape'); await P.waitForTimeout(300); await P.click('[data-act="class-open"]'); await P.waitForSelector('.cl-asg');
  ok((await P.textContent('.cl-asg:has-text("발음 평가 1")')).includes('제출 완료'), '반 목록에 "제출 완료"');
  ok(await P.evaluate(() => window.__revoked >= 1), '시트를 닫으면 blob 주소를 반납해요');
  // 예문 과제: 10초, 8초짜리 문장 녹음 크기
  await P.click('.cl-asg >> text=예문 읽기'); await P.waitForSelector('.sp-card');
  ok(/최대 10초/.test(await P.textContent('#spCd')) && (await P.getAttribute('.sp-text', 'class')).includes('long'), '예문은 최대 10초, 긴 글씨');
  await P.click('[data-act="sp-rec"]'); await P.waitForSelector('.sp-mic.on'); await P.waitForTimeout(8000); await P.click('[data-act="sp-rec"]');
  await P.waitForFunction(() => SP && SP.mine[0] && SP.busy == null, null, { timeout: 8000 });
  const ms = mp3Info(puts[puts.length - 1].p_b64);
  ok(mp3Ok(ms) && ms.len < 160 * 1024, `문장 녹음도 MP3 (${(ms.len / 1024).toFixed(1)}KB, ${ms.sec.toFixed(1)}초) · 문장 한도 160KB 안`);
  await P.keyboard.press('Escape');
  const SIZES = { word2: mkMp3(2).length, sent8: mkMp3(8).length, browserWord: m0.len, browserWordSec: m0.sec, browserSent: ms.len, browserSentSec: ms.sec };

  // ===== 다른 학생 + 반 학생 몇 명 더 (RPC로 직접 녹음 · 제출) =====
  const Q = await page({ width: 390, height: 844 }, 'S2');
  await signup(Q, 'parkstu', 'm2', '박민', '20301');
  await Q.click('[data-act="class-open"]'); await Q.waitForSelector('#clCode'); await Q.fill('#clCode', code); await Q.check('#clAgree'); await Q.click('[data-act="cl-join"]'); await Q.waitForSelector('.cl-asg');
  const MORE = [[21, '20302', '김하린'], [22, '20307', '오세훈'], [23, '20311', '윤서아']];
  for (const [u, sno, name] of MORE) {
    call('anon', 'voca_class_join', { p_token: 't' + u, p_code: code, p_name: name, p_sno: sno });
    for (let i = 0; i < 4; i++) ok(call('anon', 'voca_speak_put', { p_token: 't' + u, p_assign: A1, p_idx: i, p_b64: mkMp3(1 + (u + i) % 3 * 0.4, 16000, 1, 32, 180 + u * 3 + i * 20).toString('base64') }).ok === true, `${name} ${i + 1}번 MP3 올리기`);
    ok(call('anon', 'voca_speak_submit', { p_token: 't' + u, p_assign: A1 }).ok === true, `${name} 제출`);
  }
  const mine = call('anon', 'voca_speak_mine', { p_token: 't21', p_assign: A1 });
  ok(mine.submitted === true && mine.items.length === 4 && !AI_KEYS.test(JSON.stringify(mine)), '학생 voca_speak_mine: AI 칸(ai_score · 들은 말 · 조언)이 없어요');

  // ===== 학생은 AI 채점을 부를 수 없어요 =====
  const edgeCall = async (tok, extra, q) => { const r = await edge(new Request('https://x/functions/v1/ai' + (q || ''), { method: 'POST', headers: { origin: 'http://localhost:8795' }, body: JSON.stringify(Object.assign({ token: tok, task: 'pron' }, extra)) })); return [r.status, await r.json()]; };
  const [st1, j1] = await edgeCall('t2', { assign: A1 }), [st2] = await edgeCall('t2', { assign: A1, student: '2' });
  ok(st1 === 403 && st2 === 403 && /선생님만/.test(j1.error) && gemReqs.length === 0 && usage('2') === 0 && usage('pron:2') === 0, 'AI 함수: 학생이 자기 녹음을 채점하려 하면 403 (AI 사용 0)');
  ok((await edgeCall('t2', { assign: A1, file: mkMp3(2).toString('base64'), items: [{ text: 'apple' }] }, '?t=pron'))[0] === 403, 'AI 함수: 학생은 파일 채점도 못 해요 (403)');

  // ===== 선생님 보드: 카드 · 듣기 · 10초마다 새 제출 =====
  await T.evaluate(() => clDetail(CLV.id, true)); await T.waitForSelector('[data-act="cl-tab"]'); await T.click('[data-act="cl-tab"][data-t="asg"]');
  ok((await T.textContent('[data-act="cl-ares"]:has-text("발음 평가 1")')).includes('제출 4/5'), '과제 목록: 제출 4/5');
  await T.click('[data-act="cl-ares"] >> text=발음 평가 1'); await T.waitForSelector('.sp-grid');
  const cards = await T.$$eval('.sp-bc', a => a.map(x => x.textContent.replace(/\s+/g, ' ').trim()));
  ok(cards.length === 4 && /^20302 ?김하린/.test(cards[0]) && /^20315 ?이지우/.test(cards[3]) && cards.every(c => /\d+\/\d+ \d\d:\d\d 제출 · 4\/4문항/.test(c) && /AI 전/.test(c) && /AI 채점/.test(c)), '보드: 제출 학생 카드(학번 순) · 제출 시각 · 4/4문항 · AI 전 ' + JSON.stringify(cards[3]));
  ok(/아직 안 낸 학생 1명/.test(await T.textContent('#sheetBody')) && /20301 박민/.test(await T.textContent('.cl-chips')), '아직 안 낸 학생: 20301 박민');
  ok(await T.evaluate(() => !!document.querySelector('.sp-wide') && document.querySelector('.sheet').getBoundingClientRect().width > 900), 'PC: 보드는 넓은 시트(그리드)');
  await T.click('.sp-bc[data-uid="2"] [data-act="sp-tplay"][data-i="1"]'); await T.waitForTimeout(400);
  ok(await T.evaluate(() => window.__blobs.includes('audio/mpeg') && window.__played >= 1), '카드 숫자: 그 문항 녹음을 받아 재생 (audio/mpeg)');
  await T.evaluate(() => spStopAudio());
  const playedBefore = await T.evaluate(() => window.__played || 0);
  await T.click('.sp-bc[data-uid="21"] [data-act="sp-pall"]'); await T.waitForTimeout(500);
  ok(await T.evaluate(n => window.__played > n && document.querySelector('.sp-bc[data-uid="21"] .sp-play').classList.contains('on'), playedBefore), '카드 ▶: 전체 듣기(문항 차례로)');
  await T.evaluate(() => spStopAudio());
  // 보드가 열린 사이 새 제출 -> 10초 안에 카드가 생겨요
  resCalls = [];
  for (let i = 0; i < 4; i++) call('anon', 'voca_speak_put', { p_token: 't3', p_assign: A1, p_idx: i, p_b64: mkMp3(1.2 + i * 0.3).toString('base64') });
  call('anon', 'voca_speak_submit', { p_token: 't3', p_assign: A1 });
  const t0 = Date.now();
  await T.waitForFunction(() => document.querySelectorAll('.sp-bc').length === 5, null, { timeout: 13000 }).catch(() => {});
  ok((await T.$$('.sp-bc')).length === 5 && !!(await T.$('.sp-bc.arrive[data-uid="3"]')) && Date.now() - t0 < 12500, `10초마다 새로 고쳐 새 제출 카드가 나타나요 (${((Date.now() - t0) / 1000).toFixed(1)}초, 반짝임)`);
  ok(resCalls.length >= 1 && resCalls.every(x => x.since), '새로 고칠 때는 p_since(지난 상태)를 보내요');
  await T.waitForTimeout(10500);
  ok(resCalls.some(x => x.same), '바뀐 게 없으면 서버는 {same:true}만 돌려줘요');

  // ===== 선생님 AI 채점: 카드 하나 =====
  gemReqs = []; aiBodies = [];
  await T.click('.sp-bc[data-uid="2"] [data-act="sp-grade1"]');
  await T.waitForFunction(() => /AI \d+/.test((document.querySelector('.sp-bc[data-uid="2"]') || {}).textContent || ''), null, { timeout: 20000 });
  const g = gemReqs[0];
  ok(aiBodies.length === 1 && aiBodies[0].student === '2' && !aiBodies[0].file && gemReqs.length === 1, '카드 "AI 채점": 그 학생만 AI 함수 1번, Gemini 1번');
  ok(!!g && g.audio.length === 4 && g.audio.every(a => a.mime === 'audio/mp3' && mp3Ok(a)) && g.items.length === 4 && g.items.every(x => x.kind === 'word' && x.lang === 'English'), 'Gemini 요청: 문항 글 4개 + MP3(audio/mp3, 16kHz 모노) 4개');
  ok(/Korean middle and high school/.test(g.text) && /never copy or correct toward the target/.test(g.text) && ['accuracy', 'fluency', 'read', 'heard'].every(k => g.schema.properties.items.items.required.includes(k)), '채점 기준 프롬프트(정확도 · 유창성 · 들은 그대로) + JSON 스키마');
  ok(g.cfg.temperature === 0 && g.cfg.seed > 0 && g.cfg.topK === 1 && g.cfg.thinkingConfig.thinkingBudget === 1024 && /gemini-2\.5-flash:/.test(g.url), '수행평가 채점: temperature 0 · 고정 seed · 생각 1024 · 2.5-flash');
  const want2 = g.res.map(x => x.score).join(',');
  ok(psql(`select string_agg(ai_score::text, ',' order by idx) from voca_speak_recs where assign_id = ${A1} and uid = '2'`) === want2, 'AI 점수가 DB에 저장돼요 ' + want2);
  ok(usage('pron:1') === 1 && usage('1') === 0, 'AI 사용량: 발음 채점은 선생님의 따로 센 한도(pron:계정)에 1회');
  ok(!AI_KEYS.test(JSON.stringify(call('anon', 'voca_speak_mine', { p_token: 't2', p_assign: A1 }))) && call('anon', 'voca_class_mine', { p_token: 't2' }).joined[0].assignments.find(a => a.id === A1).mine.score === null, '채점 뒤에도 학생 voca_speak_mine · voca_class_mine 에 AI 점수가 없어요');
  // AI가 바쁠 때
  GEMINI = 'busy'; const gb = gemReqs.length;
  await T.click('.sp-bc[data-uid="21"] [data-act="sp-grade1"]'); await T.waitForSelector('.dlg', { timeout: 20000 });
  ok(/AI 채점을 하지 못했어요/.test(await T.textContent('.dlg p')), 'AI가 바쁘면 안내하고 점수는 그대로');
  ok(gemReqs.length - gb === 2 && gemReqs.slice(gb).every(r => /gemini-2\.5-flash:/.test(r.url)), 'AI가 바쁘면 다른(약한) 모델로 넘어가지 않고 같은 모델로 한 번 더');
  await confirm(T); GEMINI = 'ok';
  // 전체 AI 채점: 채점 안 된 학생 4명을 학번 순서로 한 명씩
  gemReqs = []; aiBodies = [];
  ok(/전체 AI 채점 \(4명\)/.test(await T.textContent('[data-act="sp-gall"]')), '"전체 AI 채점 (4명)"');
  await T.click('[data-act="sp-gall"]'); await T.waitForSelector('.dlg');
  ok(/4명의 녹음을 AI로 채점할까요/.test(await T.textContent('.dlg p')) && /하루 200회/.test(await T.textContent('.dlg p')), '전체 채점 전 확인: 인원 · AI 사용 횟수');
  await confirm(T);
  await T.waitForSelector('[data-act="sp-gstop"]', { timeout: 5000 }).catch(() => {});
  const prog = await T.textContent('.sp-acts').catch(() => '');
  await T.waitForSelector('[data-act="sp-gall"]', { timeout: 60000 });
  ok(/AI 채점 중 \d\/4/.test(prog), '채점 중 진행 표시 ' + JSON.stringify(prog.trim()));
  ok(aiBodies.length === 4 && aiBodies.map(x => x.student).sort().join(',') === '21,22,23,3' && gemReqs.length === 4 && aiBodies.every(x => !x.all), '전체 AI 채점: 학생마다 한 번씩 4번 (4명씩 동시에)');
  ok(psql(`select count(*) from voca_speak_recs where assign_id = ${A1} and ai_score is null`) === '0', '모든 녹음에 AI 점수');
  ok(usage('pron:1') === 6, 'AI 사용량: 채점 한 번마다 1회 (실패 포함 6회)');
  ok(/모두 AI 채점했어요/.test(await T.textContent('[data-act="sp-gall"]')) && await T.isDisabled('[data-act="sp-gall"]'), '다 채점하면 버튼이 꺼져요');
  ok((await T.$$eval('.sp-bc', a => a.filter(x => /AI \d+/.test(x.textContent) && /다시 채점/.test(x.textContent)).length)) === 5, '카드마다 AI 점수 배지 + "다시 채점"');
  // 다시 채점: 확인 후 all
  gemReqs = []; aiBodies = [];
  psql(`update voca_speak_recs set ai_score = 10 where assign_id = ${A1} and uid = '2'`);
  await T.click('.sp-bc[data-uid="2"] [data-act="sp-grade1"]'); await confirm(T);
  await T.waitForFunction(() => !document.querySelector('.sp-bc[data-uid="2"] [data-act="sp-grade1"][disabled]'), null, { timeout: 20000 }); await T.waitForTimeout(600);
  ok(aiBodies.length === 1 && aiBodies[0].all === true && psql(`select string_agg(ai_score::text, ',' order by idx) from voca_speak_recs where assign_id = ${A1} and uid = '2'`) === want2, '"다시 채점": 이미 채점한 문항도 다시(all)');

  // 기기 AI(무료): 녹음을 받아 이 브라우저에서 채점하고 점수만 저장 (Gemini · AI 함수 안 씀)
  gemReqs = []; aiBodies = [];
  await T.click('[data-act="sp-eng"][data-v="local"]');
  ok(await T.evaluate(() => localStorage.getItem('vp_eng')) === 'local' && (await T.getAttribute('[data-act="sp-eng"][data-v="local"]', 'class')).includes('on'), '채점 AI를 "기기 AI (무료)"로 바꿔요');
  psql(`update voca_speak_recs set ai_score = null, ai_detail = null where assign_id = ${A1} and uid = '3'`);
  await T.waitForTimeout(10500);
  await T.click('.sp-bc[data-uid="3"] [data-act="sp-grade1"]');
  if (await T.waitForSelector('.dlg', { timeout: 1500 }).catch(() => null)) await confirm(T);
  await T.waitForFunction(() => !document.querySelector('.sp-bc[data-uid="3"] [data-act="sp-grade1"][disabled]'), null, { timeout: 180000 }); await T.waitForTimeout(800);
  const loc3 = psql(`select count(*) || '|' || count(ai_score) || '|' || string_agg(distinct ai_detail->>'model', ',') from voca_speak_recs where assign_id = ${A1} and uid = '3' and audio is not null`);
  ok(/^(\d+)\|\1\|vocapro-local$/.test(loc3) && aiBodies.length === 0 && gemReqs.length === 0, '기기 AI 채점: 녹음마다 점수 저장, 모델 vocapro-local, 서버 AI 0번 ' + loc3);
  ok(call('anon', 'voca_speak_set_local', { p_token: 't2', p_assign: A1, p_uid: '3', p_items: [{ idx: 0, score: 100 }] }).err === 'no_assign', '기기 AI 점수 저장: 그 과제 선생님만');
  ok(call('anon', 'voca_speak_set_local', { p_token: 't1', p_assign: A1, p_uid: '3', p_items: [{ idx: 99, score: 100 }] }).err === 'bad_input', '없는 문항 번호는 거절');
  await T.click('[data-act="sp-eng"][data-v="ai"]');

  // ===== 결과 목록: 30211 김주원 75점 형식, 문항 점수 · 최종 점수 =====
  await T.click('[data-act="sp-tab"][data-t="list"]'); await T.waitForSelector('.sp-lr');
  let lines = await T.$$eval('.sp-lr', a => a.map(x => [x.querySelector('.sp-no').textContent, x.querySelector('b').textContent, x.querySelector('em').textContent]));
  ok(lines.length === 5 && lines.map(x => x[0]).join(',') === '20301,20302,20307,20311,20315' && lines.every(x => /^\d+점$/.test(x[2])), '결과 목록: 한 줄에 한 명, 학번 순 "20301 박민 n점" ' + JSON.stringify(lines[0]));
  await T.click('.sp-lr[data-k="u:2"]'); await T.waitForSelector('.sp-det');
  ok((await T.textContent('.sp-det')).includes('끝소리 l을') && (await T.textContent('.sp-det')).includes('AI가 들은 말'), '줄을 누르면 문항 점수 · 들은 말 · 조언');
  await T.fill('#spT0', '95'); await T.fill('#spN0', '끝소리가 좋아졌어요'); await T.click('[data-act="sp-tsave"][data-i="0"]'); await T.waitForTimeout(900);
  ok(psql(`select t_score || '|' || t_note from voca_speak_recs where assign_id = ${A1} and uid = '2' and idx = 0`) === '95|끝소리가 좋아졌어요', '문항 선생님 점수 · 메모 저장');
  const s2 = g.res.map(x => x.score); s2[0] = 95;
  ok(+psql(`select score from voca_submissions where assignment_id = ${A1} and uid = '2'`) === Math.round(s2.reduce((a, x) => a + x, 0) / 4), '최종 점수 = 문항(선생님, 없으면 AI) 평균');
  ok(call('anon', 'voca_speak_mine', { p_token: 't2', p_assign: A1 }).score === null, '모든 문항에 선생님 점수가 없으면 학생에게 점수를 보내지 않아요');
  await T.fill('#spMS', '88'); await T.fill('#spMN', '강세와 끝소리가 좋아졌어요'); await T.click('[data-act="sp-msave"]'); await T.waitForTimeout(900);
  ok(psql(`select score from voca_submissions where assignment_id = ${A1} and uid = '2'`) === '88' && (await T.textContent('.sp-lr[data-k="u:2"] em')) === '88점', '최종 점수(선생님) 88 -> 목록 "20315 이지우 88점"');
  await T.fill('#spT1', '130'); await T.click('[data-act="sp-tsave"][data-i="1"]'); await T.waitForTimeout(300);
  ok(psql(`select coalesce(t_score::text, 'null') from voca_speak_recs where assign_id = ${A1} and uid = '2' and idx = 1`) === 'null', '0~100 밖의 점수는 저장하지 않아요');
  await T.waitForTimeout(2600);
  await save(T, 'T-03-list-detail');

  // ===== 학생: 선생님 점수 · 메모만 보여요 =====
  ok(call('anon', 'voca_class_mine', { p_token: 't2' }).joined[0].assignments.find(a => a.id === A1).mine.score === 88, '학생 반 목록 점수 = 선생님 점수 88');
  await P.click('[data-act="class-open"]').catch(() => {}); await P.waitForSelector('.cl-asg');
  ok((await P.textContent('.cl-asg:has-text("발음 평가 1")')).includes('88점'), '학생 반 목록에 88점');
  await P.click('.cl-asg >> text=발음 평가 1'); await P.waitForSelector('.sp-done');
  const done = await P.textContent('.sp');
  ok(/88\s*점/.test(await P.textContent('.sp-tbox')) && done.includes('강세와 끝소리가 좋아졌어요') && done.includes('선생님 · 끝소리가 좋아졌어요'), '학생 제출 완료 화면: 선생님 점수 · 한마디 · 문항 메모');
  ok(!/AI|들은 말|끝소리 l을/.test(done), '학생 화면에 AI 점수 · 들은 말 · 조언이 없어요');
  await save(P, 'S-04-done', '학생-제출완료.png');
  await dark(P, true); await save(P, 'S-04-done-dark'); await dark(P, false);
  // 내 녹음 저장: 학번_이름_과제명.mp3
  const [dlm] = await Promise.all([P.waitForEvent('download'), P.click('[data-act="sp-save"]')]);
  const mp3Path = path.join(FX, 'mine.mp3'); await dlm.saveAs(mp3Path);
  const mi = mp3Info(fs.readFileSync(mp3Path));
  let probe = ''; try { probe = execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'stream=codec_name,sample_rate,channels:format=duration', '-of', 'csv=p=0', mp3Path], { encoding: 'utf8' }).replace(/\s+/g, ' ').trim(); } catch (e) { probe = 'ERR ' + e.message; }
  const sumSec = JSON.parse(psql(`select json_agg(dur_ms) from voca_speak_recs where assign_id = ${A1} and uid = '2'`)).reduce((a, x) => a + x, 0) / 1000;
  ok(dlm.suggestedFilename() === '20315_이지우_발음 평가 1.mp3', '내 녹음 저장 파일 이름: ' + dlm.suggestedFilename());
  ok(mp3Ok(mi) && /mp3,16000,1/.test(probe) && Math.abs(mi.sec - sumSec - 3 * 0.6) < 0.5, `저장한 MP3: 문항을 0.6초 무음으로 이어 붙여 ${mi.sec.toFixed(1)}초 (${probe})`);
  await P.keyboard.press('Escape');

  // ===== 받은 파일 채점 (카카오톡 등): m4a · wav · zip -> 브라우저에서 16kHz MP3 -> AI 함수(저장 안 함) =====
  const parse = await T.evaluate(() => [['30211_김주원_발음평가.m4a'], ['30211 김주원.mp3'], ['김주원_30211.wav'], ['녹음30211김주원.m4a'], ['발음평가_20315_이지우_최종.m4a'], ['KakaoTalk_20241014_123045123.m4a'], ['음성 메모 30216 정하은.m4a'], ['3학년 2반 김주원.mp3'], ['30212_이서연.m4a'.normalize('NFD')]].map(([n]) => { const r = spfParse(n); return r.sno + '/' + r.name; }));
  ok(parse.join(',') === '30211/김주원,30211/김주원,30211/김주원,30211/김주원,20315/이지우,/,30216/정하은,/김주원,30212/이서연', '파일 이름에서 학번 · 이름 찾기 ' + parse.join(','));
  const recsBefore = psql('select count(*) || \':\' || coalesce(sum(bytes), 0) from voca_speak_recs');
  await T.click('[data-act="sp-tab"][data-t="file"]'); await T.waitForSelector('.sp-drop');
  ok(await T.evaluate(() => !window.fflate), 'zip 라이브러리는 zip을 넣기 전에는 불러오지 않아요');
  await T.setInputFiles('#spfIn', [FILES.m4a, FILES.wav, FILES.zip]); await T.waitForSelector('.sp-fr');
  await T.waitForTimeout(300);
  const frs = await T.$$eval('.sp-fr', a => a.map(x => [x.querySelector('.sp-fn').textContent, ...[...x.querySelectorAll('input')].map(i => i.value)]));
  ok(frs.length === 5, '파일 2개 + zip 안 소리 3개 = 5줄 (txt · __MACOSX 는 빼요) ' + JSON.stringify(frs.map(x => x[0])));
  ok(frs.some(x => x[0] === '30211_김주원_발음평가.m4a' && x[1] === '30211' && x[2] === '김주원') && frs.some(x => x[1] === '30212' && x[2] === '김서연') && frs.some(x => x[0] === '30213 박하늘.mp3' && x[1] === '30213' && x[2] === '박하늘'), '파일 이름에서 학번 · 이름을 채워요');
  ok(frs.some(x => x[0] === '30214_최유나.ogg' && x[1] === '30214' && x[2] === '최유나'), 'zip 안 윈도우(CP949) 한글 이름도 읽어요');
  ok(await T.evaluate(() => typeof fflate === 'object' && !!document.querySelector('script[src="fflate.min.js"]')), 'zip을 넣을 때 fflate.min.js 를 같은 주소에서 불러와요');
  const kk = frs.findIndex(x => /^KakaoTalk/.test(x[0]));
  ok(kk >= 0 && frs[kk][1] === '' && frs[kk][2] === '', '이름이 없는 파일(KakaoTalk_...)은 칸이 비어 있어요');
  const kin = await T.$$('.sp-fr'); const kInputs = await kin[kk].$$('input'); await kInputs[0].fill('30216'); await kInputs[1].fill('한지민');
  ok(/4문항/.test(await T.textContent('#spfQ')) && /apple · river · travel · library/.test(await T.textContent('#spfQ')), '채점 기준: 기본은 과제 문항');
  gemReqs = []; aiBodies = [];
  await T.click('[data-act="spf-go"]'); await confirm(T);
  await T.waitForFunction(() => SPT && !SPT.frun, null, { timeout: 60000 });
  const fb = aiBodies.filter(x => x.file);
  ok(fb.length === 5 && fb.every(x => /\?t=pron$/.test(x.url) && mp3Ok(mp3Info(x.file)) && mp3Info(x.file).kbps === 32), '파일마다 16kHz 모노 MP3로 바꿔 ?t=pron 으로 1번씩 (5번)');
  ok(fb.every(x => x.items.length === 4 && x.items[0].text === 'apple' && x.items[0].kind === 'w') && gemReqs.length === 5 && gemReqs.every(r => r.audio.length === 1 && r.items.length === 4 && /ONE recording/.test(r.text)), 'Gemini: 파일 하나 + 목표 문장 4개를 한 번에');
  const longest = Math.max(...fb.map(x => mp3Info(x.file).sec));
  ok(longest > 5 && longest < 7.5, `파일 길이 그대로 바꿔요(가장 긴 것 ${longest.toFixed(1)}초)`);
  ok(psql('select count(*) || \':\' || coalesce(sum(bytes), 0) from voca_speak_recs') === recsBefore, '받은 파일은 서버(DB)에 저장하지 않아요');
  ok(usage('pron:1') === 12, 'AI 사용량: 파일 하나에 1회');
  ok((await T.$$eval('.sp-fs', a => a.map(x => x.textContent))).every(x => /^\d+점$/.test(x)), '파일 줄마다 점수');
  await T.waitForTimeout(2800); await T.evaluate(() => { document.querySelector('.sheet').scrollTop = 0; }); await T.waitForTimeout(150);
  await save(T, 'T-04-files', '선생님-파일채점.png');
  // AAC m4a: 이 시험 브라우저(Chromium)는 AAC를 못 풀어요 -> 안내 (실제 Chrome · Safari · Edge 는 풀어요)
  await T.setInputFiles('#spfIn', [FILES.aac]); await T.waitForFunction(() => document.querySelectorAll('.sp-fr').length === 6);
  const aacOk = await T.evaluate(async () => { try { const c = new OfflineAudioContext(1, 1, 16000); return !!c; } catch (e) { return false; } });
  await T.click('[data-act="spf-go"]'); await T.waitForFunction(() => SPT && !SPT.frun, null, { timeout: 30000 });
  const aacSt = await T.textContent('.sp-fr:last-child .sp-fs');
  ok(aacOk && (/이 파일은 읽지 못했어요/.test(aacSt) || /^\d+점$/.test(aacSt)), 'AAC m4a: 풀 수 있으면 채점, 못 풀면 "이 파일은 읽지 못했어요" (' + aacSt + ')');
  await T.click('.sp-fr:last-child [data-act="spf-x"]');
  // 녹음을 넣을 때 그 파일만 다른 문장으로: 파일 줄의 '문장'에 적으면 그 문장으로 채점하고, 일치도 · 빠뜨린 단어를 보여요
  { await T.setInputFiles('#spfIn', [FILES.wav]); await T.waitForFunction(() => document.querySelectorAll('.sp-fr').length === 6);
    ok((await T.textContent('.sp-fr:last-child .sp-ftb')) === '문장', '파일 줄마다 "문장" 버튼');
    await T.click('.sp-fr:last-child [data-act="spf-ft"]'); await T.waitForSelector('.sp-ftx');
    await T.fill('.sp-ftx', 'I eat an apple every day.\nrice');
    ok((await T.textContent('.sp-fr:last-child .sp-ftb')) === '문장 2' && await T.isEnabled('[data-act="spf-go"]'), '적으면 "문장 2"로 바뀌어요');
    gemReqs = []; aiBodies = []; globalThis.HEARD = x => x.idx === 0 ? 'I eat apple every day' : x.text;
    await T.click('[data-act="spf-go"]'); await T.waitForFunction(() => SPT && !SPT.frun, null, { timeout: 30000 }); globalThis.HEARD = null;
    const fb2 = aiBodies.filter(x => x.file);
    ok(fb2.length === 1 && fb2[0].items.map(x => x.text).join('|') === 'I eat an apple every day.|rice' && fb2[0].items[0].kind === 's', '그 파일은 적은 문장 2개로 채점(과제 문항 대신) ' + JSON.stringify(fb2.map(x => x.items.length)));
    const dh = await T.evaluate(() => spFileDetHtml(SPT.files[SPT.files.length - 1]));
    ok(/일치도 <b>83%<\/b>/.test(dh) && /<mark class="sp-miss" title="빠뜨린 말">an<\/mark>/.test(dh) && /빠뜨린 말 1개 \(줄 그어 표시\)/.test(dh) && /정확성 <b>\d+<\/b>/.test(dh) && /유창성 <b>\d+<\/b>/.test(dh), '결과: 정확성 · 유창성 · 일치도 83%, 빠뜨린 단어(an)에 표시');
    await T.click('.sp-fr:last-child [data-act="spf-x"]'); }
  // 파일 채점도 기기 AI로: 서버 AI를 부르지 않고 점수
  { const ab = aiBodies.length; await T.click('[data-act="sp-eng"][data-v="local"]');
    await T.setInputFiles('#spfIn', [FILES.wav]); await T.waitForFunction(() => document.querySelectorAll('.sp-fr').length === 6);
    await T.click('[data-act="spf-go"]'); await T.waitForFunction(() => SPT && !SPT.frun, null, { timeout: 120000 });
    const st = await T.textContent('.sp-fr:last-child .sp-fs'), det = await T.evaluate(() => SPT.files[SPT.files.length - 1].res);
    ok(/^\d+점$/.test(st) && aiBodies.length === ab && det.length > 0 && det.every(x => x.model === 'vocapro-local' && typeof x.score === 'number' && typeof x.comp === 'number' && Array.isArray(x.miss) && (x.score === Math.max(0, Math.min(100, Math.round(x.acc * 0.7 + x.flu * 0.3))) || x.score <= 10)), '파일 채점(기기 AI): 서버 AI 없이 문항마다 점수 ' + st);
    await T.click('.sp-fr:last-child [data-act="spf-x"]'); await T.click('[data-act="sp-eng"][data-v="ai"]'); }
  // 결과 목록: 앱 제출 + 파일 결과가 학번 순으로 함께
  await T.click('[data-act="sp-tab"][data-t="list"]'); await T.waitForSelector('.sp-lr');
  lines = await T.$$eval('.sp-lr', a => a.map(x => x.querySelector('.sp-no').textContent + ' ' + x.querySelector('b').textContent + ' ' + x.querySelector('em').textContent));
  ok(lines.length === 10 && lines.map(x => x.split(' ')[0]).join(',') === '20301,20302,20307,20311,20315,30211,30212,30213,30214,30216' && lines.includes('20315 이지우 88점') && lines.some(x => /^30211 김주원 \d+점$/.test(x)), '결과 목록: 앱 제출과 파일 결과를 학번 순으로 "30211 김주원 n점" ' + JSON.stringify(lines.slice(4, 6)));
  await T.click('.sp-lr:has-text("김주원")'); await T.waitForSelector('.sp-det');
  ok(/30211_김주원_발음평가\.m4a/.test(await T.textContent('.sp-det')) && (await T.textContent('.sp-det')).includes('AI가 들은 말'), '파일 결과 줄: 파일 이름 · 문항 점수 · 들은 말');
  await T.fill('#spMS', '75'); await T.click('[data-act="sp-fmsave"]'); await T.waitForTimeout(300);
  ok((await T.textContent('.sp-lr:has-text("김주원") em')) === '75점', '파일 결과도 선생님 최종 점수(이 기기) -> "30211 김주원 75점"');
  await T.click('.sp-lr:has-text("한지민")'); await T.waitForSelector('.sp-det .sp-mark'); await T.waitForTimeout(2800);
  await T.setViewportSize({ width: 1280, height: 1000 }); await T.evaluate(() => { document.querySelector('.sheet').scrollTop = 0; }); await T.waitForTimeout(250);
  await save(T, 'T-03-list', '선생님-결과목록.png'); await T.setViewportSize({ width: 1280, height: 860 });
  await T.setViewportSize({ width: 390, height: 844 }); await T.waitForTimeout(250); await save(T, 'T-03-list-mobile');
  await dark(T, true); await save(T, 'T-03-list-mobile-dark'); await dark(T, false);
  await T.click('[data-act="sp-tab"][data-t="file"]'); await T.waitForTimeout(200); await save(T, 'T-04-files-mobile');
  await T.click('[data-act="sp-tab"][data-t="board"]'); await T.waitForTimeout(200); await T.evaluate(() => { document.querySelector('.sheet').scrollTop = 0; }); await save(T, 'T-02-board-mobile');
  await dark(T, true); await save(T, 'T-02-board-mobile-dark'); await dark(T, false);
  await T.setViewportSize({ width: 1280, height: 860 }); await T.waitForTimeout(250);
  // 다시 열어도 파일 결과는 남아요(이 기기)
  await T.evaluate(id => spResults(id), A1); await T.waitForSelector('.sp-grid'); await T.click('[data-act="sp-tab"][data-t="list"]');
  ok((await T.$$('.sp-lr')).length === 10, '보드를 다시 열어도 파일 결과가 남아요(이 기기 저장, 소리는 없음)');
  // CSV (이 과제)
  const [dl] = await Promise.all([T.waitForEvent('download'), T.click('[data-act="sp-csv"]')]);
  const csv = fs.readFileSync(await dl.path(), 'utf8').replace(/^\ufeff/, '').split('\r\n');
  const h = csv[0].split(','), rowOf = s => (csv.find(l => l.includes(s)) || '').split(',');
  ok(dl.suggestedFilename().startsWith('발음 평가 1_발음평가_') && h.slice(0, 12).join('|') === '학번|이름|출처|제출 시각|녹음|AI 평균|AI 정확성|AI 유창성|AI 일치도(%)|선생님 점수|최종 점수|선생님 한마디' && h[12] === '1. apple' && csv.length === 11, 'CSV: 머리글 + 학생 10줄');
  ok(rowOf('이지우')[0] === '20315' && rowOf('이지우')[2] === '앱' && rowOf('이지우')[10] === '88' && rowOf('이지우')[12] === '95' && /^파일 30211_김주원/.test(rowOf('김주원')[2]) && rowOf('김주원')[10] === '75' && /^\d+$/.test(rowOf('김주원')[8]) && /^\d+$/.test(rowOf('김주원')[6]) && /^\d+$/.test(rowOf('김주원')[7]) && /^\d+$/.test(rowOf('이지우')[6]), 'CSV: 앱 제출(최종 88, 1번 95) + 파일 결과(최종 75) + 정확성 · 유창성 ' + [rowOf('이지우').slice(5, 9), rowOf('김주원').slice(5, 9)].join(' / '));
  ok(/정확성 \d+ · 유창성 \d+/.test(await T.evaluate(() => [...document.querySelectorAll('.sp-af')].map(x => x.textContent).join(' | '))), '결과 화면: 학생마다 정확성 · 유창성 평균 ' + await T.evaluate(() => [...document.querySelectorAll('.sp-af')].slice(0, 3).map(x => x.textContent).join(' | ')));
  // 반 CSV에도 발음 평가 점수
  await T.click('[data-act="cl-back"]'); await T.waitForSelector('[data-act="cl-csv"]');
  const [dl2] = await Promise.all([T.waitForEvent('download'), T.click('[data-act="cl-csv"]')]);
  const csv2 = fs.readFileSync(await dl2.path(), 'utf8').replace(/^\ufeff/, '').split('\r\n'), h2 = csv2[0].split(','), r2 = csv2.find(l => l.includes('이지우')).split(','), ci = h2.indexOf('발음 평가 1 AI 평균');
  ok(ci > 0 && h2[ci - 1] === '발음 평가 1 (발음 평가)' && r2[ci - 1] === '88', '반 CSV: 발음 평가 최종 점수 88');
  // 보드 화면 (PC): 새 제출 하나는 아직 채점 전
  call('anon', 'voca_class_join', { p_token: 't24', p_code: code, p_name: '정우진', p_sno: '20318' });
  for (let i = 0; i < 4; i++) call('anon', 'voca_speak_put', { p_token: 't24', p_assign: A1, p_idx: i, p_b64: mkMp3(1.4).toString('base64') });
  call('anon', 'voca_speak_submit', { p_token: 't24', p_assign: A1 });
  await T.click('[data-act="cl-ares"] >> text=발음 평가 1'); await T.waitForSelector('.sp-grid'); await T.waitForTimeout(3200);
  ok(/선생님\s*88/.test(await T.textContent('.sp-bc[data-uid="2"] .sp-bc-h')), '카드 머리: 선생님 최종 점수 88');
  await save(T, 'T-02-board', '선생님-보드.png');
  await dark(T, true); await save(T, 'T-02-board-dark'); await dark(T, false);

  // ===== 녹음 지우기: 학생 한 명 · 과제 전체 (점수는 남아요) =====
  await T.click('[data-act="sp-open"][data-k="u:3"]'); await T.waitForSelector('.sp-det [data-act="sp-del1"]');
  await T.click('.sp-det [data-act="sp-del1"]'); await confirm(T); await T.waitForTimeout(900);
  ok(psql(`select count(*) from voca_speak_recs where assign_id = ${A1} and uid = '3' and audio is not null`) === '0' && psql(`select count(ai_score) from voca_speak_recs where assign_id = ${A1} and uid = '3'`) === '4', '선생님: 학생 한 명 녹음 파일 지우기 (점수는 남아요)');
  ok(call('anon', 'voca_speak_audio', { p_token: 't1', p_assign: A1, p_uid: '3', p_idx: 0 }).err === 'no_rec' && await T.isDisabled('.sp-det [data-act="sp-tplay"][data-i="0"]'), '지운 녹음은 들을 수 없어요');
  ok(call('anon', 'voca_speak_delete', { p_token: 't2', p_assign: A1, p_uid: '3' }).err === 'no_assign' && call('anon', 'voca_speak_delete', { p_token: 't5', p_assign: A1 }).err === 'no_assign', '학생 · 다른 반 선생님은 녹음을 지울 수 없어요');

  // ===== 보안 =====
  const t = (u, fn, args) => call('anon', fn, Object.assign({ p_token: 't' + u }, args));
  const mp3 = mkMp3(1).toString('base64');
  ok(t(9, 'voca_speak_put', { p_assign: A1, p_idx: 0, p_b64: mp3 }).err === 'no_assign', '반 학생이 아니면 올릴 수 없어요');
  ok(t(1, 'voca_speak_put', { p_assign: A1, p_idx: 0, p_b64: mp3 }).err === 'no_assign', '선생님 계정도 학생 녹음 칸에 올릴 수 없어요');
  ok(t(3, 'voca_speak_put', { p_assign: A1, p_idx: 4, p_b64: mp3 }).err === 'bad_input' && t(3, 'voca_speak_put', { p_assign: A1, p_idx: -1, p_b64: mp3 }).err === 'bad_input', '문항 번호 범위 검사');
  ok(t(3, 'voca_speak_put', { p_assign: A1, p_idx: 0, p_b64: mkMp3(20).toString('base64') }).err === 'too_big', '단어 문항은 64KB 넘으면 거절 (32kbps 20초 = 80KB)');
  ok(t(2, 'voca_speak_put', { p_assign: A2, p_idx: 0, p_b64: mkMp3(20).toString('base64') }).ok === true && t(2, 'voca_speak_put', { p_assign: A2, p_idx: 0, p_b64: mkMp3(45).toString('base64') }).err === 'too_big', '문장 문항은 160KB까지 (20초 OK, 45초 거절)');
  ok(t(3, 'voca_speak_put', { p_assign: A1, p_idx: 0, p_b64: mkWav(1, 16000, 1).toString('base64') }).err === 'bad_audio', 'WAV는 이제 받지 않아요 (MP3만)');
  ok(t(3, 'voca_speak_put', { p_assign: A1, p_idx: 0, p_b64: Buffer.from('hello world, this is not audio'.repeat(300)).toString('base64') }).err === 'bad_audio', 'MP3가 아니면 거절');
  ok(t(3, 'voca_speak_put', { p_assign: A1, p_idx: 0, p_b64: mkMp3(1, 44100, 2, 128).toString('base64') }).err === 'bad_audio' && t(3, 'voca_speak_put', { p_assign: A1, p_idx: 0, p_b64: mkMp3(1, 16000, 2, 32).toString('base64') }).err === 'bad_audio', '16kHz 모노 MP3가 아니면 거절 (44.1kHz 스테레오, 16kHz 스테레오)');
  const fake = Buffer.concat([Buffer.from([255, 243, 72, 196]), Buffer.alloc(2000, 7)]).toString('base64');
  ok(t(3, 'voca_speak_put', { p_assign: A1, p_idx: 0, p_b64: fake }).err === 'bad_audio', '머리글만 MP3인 가짜(다음 프레임 없음)는 거절');
  const id3 = Buffer.concat([Buffer.from('ID3'), Buffer.from([4, 0, 0, 0, 0, 0, 20]), Buffer.alloc(20), mkMp3(1)]).toString('base64');
  ok(t(3, 'voca_speak_put', { p_assign: A1, p_idx: 0, p_b64: id3 }).ok === true, 'ID3 태그가 앞에 붙은 MP3는 받아요');
  ok(t(3, 'voca_speak_put', { p_assign: A1, p_idx: 0, p_b64: '%%%not base64%%%' }).err === 'bad_audio', 'base64가 깨졌으면 거절');
  ok(t(3, 'voca_speak_audio', { p_assign: A1, p_uid: '2', p_idx: 0 }).err === 'no_assign', '다른 학생 녹음은 들을 수 없어요');
  const au2 = t(2, 'voca_speak_audio', { p_assign: A1, p_uid: '2', p_idx: 0 });
  ok(!!au2.b64 && au2.type === 'audio/mpeg' && !!t(1, 'voca_speak_audio', { p_assign: A1, p_uid: '2', p_idx: 0 }).b64, '학생 본인과 반 선생님은 들을 수 있어요 (audio/mpeg)');
  call('anon', 'voca_class_create', { p_token: 't5', p_name: '다른 반', p_teacher: '오', p_school: '' });
  ok(t(5, 'voca_speak_results', { p_assign: A1 }).err === 'no_assign' && t(5, 'voca_speak_audio', { p_assign: A1, p_uid: '2', p_idx: 0 }).err === 'no_assign' && t(5, 'voca_speak_teacher', { p_assign: A1, p_uid: '2', p_idx: 0, p_score: 0, p_note: '' }).err === 'no_assign' && t(5, 'voca_speak_mark', { p_assign: A1, p_uid: '2', p_score: 0, p_note: '' }).err === 'no_assign', '다른 반 선생님은 결과 · 녹음 · 점수에 접근할 수 없어요');
  ok(t(2, 'voca_speak_results', { p_assign: A1 }).err === 'no_assign' && t(2, 'voca_speak_teacher', { p_assign: A1, p_uid: '2', p_idx: 0, p_score: 100, p_note: '' }).err === 'no_assign' && t(2, 'voca_speak_mark', { p_assign: A1, p_uid: '2', p_score: 100, p_note: '' }).err === 'no_assign', '학생은 반 결과를 보거나 점수를 고칠 수 없어요');
  ok(t(1, 'voca_speak_mark', { p_assign: A1, p_uid: '99', p_score: 50, p_note: '' }).err === 'no_rec' && t(1, 'voca_speak_mark', { p_assign: A1, p_uid: '2', p_score: 101, p_note: '' }).err === 'bad_input', 'voca_speak_mark: 반 학생만, 0~100');
  ok(t(2, 'voca_assign_submit', { p_assign: A1, p_ok: 10, p_n: 10, p_sec: 1, p_wrong: [] }).err === 'no_assign', '발음 평가는 voca_assign_submit 으로 점수를 올릴 수 없어요');
  ok(t(25, 'voca_speak_submit', { p_assign: A1 }).err === 'no_assign', '반 학생이 아니면 제출할 수 없어요');
  call('anon', 'voca_class_join', { p_token: 't25', p_code: code, p_name: '조민서', p_sno: '20320' });
  ok(t(25, 'voca_speak_submit', { p_assign: A1 }).err === 'not_done', '다 녹음하지 않으면 제출할 수 없어요');
  ok(['anon', 'authenticated'].every(r => denied(r, 'select * from voca_speak_recs') && denied(r, 'select * from voca_speak_marks') && denied(r, 'select * from voca_speak_rate') && denied(r, "insert into voca_speak_recs(assign_id, uid, idx) values (1, '1', 0)")), '표를 직접 읽고 쓸 수 없어요 (anon, authenticated)');
  ok(['anon', 'authenticated'].every(r => denied(r, `select voca_speak_for_grade('2', ${A1}, false)`) && denied(r, `select voca_speak_set_ai('2', ${A1}, 0, 100, '{}')`) && denied(r, `select voca_speak_is_owner('1', ${A1})`) && denied(r, `select voca_speak_sync(${A1}, '2')`) && denied(r, `select voca_speak_tscore(${A1}, '2')`) && denied(r, "select voca_speak_mp3('\\x00')")), '서비스 함수는 anon · authenticated 가 부를 수 없어요');
  ok(call('service_role', 'voca_speak_is_owner', { p_uid: '1', p_assign: A1 }) === true && call('service_role', 'voca_speak_is_owner', { p_uid: '5', p_assign: A1 }) === false && call('service_role', 'voca_speak_is_owner', { p_uid: '2', p_assign: A1 }) === false, 'voca_speak_is_owner: 반 선생님만');
  ok(call('service_role', 'voca_speak_for_grade', { p_uid: '9', p_assign: A1, p_all: true }).err === 'no_assign', 'for_grade: 반 학생이 아니면 꺼내지 않아요');
  // 다시 녹음하면 AI 점수만 지워지고, 그사이 늦게 온 AI 점수는 버려요
  ok(t(2, 'voca_speak_put', { p_assign: A1, p_idx: 1, p_b64: mp3 }).ok === true && psql(`select coalesce(ai_score::text, 'null') from voca_speak_recs where assign_id = ${A1} and uid = '2' and idx = 1`) === 'null', '다시 녹음하면 그 문항 AI 점수가 지워져요');
  ok(call('service_role', 'voca_speak_set_ai', { p_uid: '2', p_assign: A1, p_idx: 1, p_score: 50, p_detail: { v: '1' } }) === false, '그사이 다시 녹음했으면 늦게 온 AI 점수는 버려요');
  ok(call('service_role', 'voca_speak_set_ai', { p_uid: '2', p_assign: A1, p_idx: 1, p_score: 66, p_detail: { tips: '좋아요' } }) === true && psql(`select ai_score from voca_speak_recs where assign_id = ${A1} and uid = '2' and idx = 1`) === '66', 'service_role 이 voca_speak_set_ai 로 점수를 써요');
  // AI 함수
  ok((await edgeCall('t5', { assign: A1, student: '2' }))[0] === 403, 'AI 함수: 다른 반 선생님은 채점할 수 없어요 (403)');
  ok((await edgeCall('t9', { assign: A1, student: '2' }))[0] === 403, 'AI 함수: 반과 상관없는 계정 403');
  ok((await edgeCall('t2', { assign: 'x' }))[0] === 400 && (await edgeCall('', { assign: A1 }))[0] === 401, 'AI 함수: 잘못된 요청 400, 로그인 없으면 401');
  ok((await edgeCall('t1', { assign: A1 }))[0] === 400, 'AI 함수: 선생님이 학생도 파일도 없이 부르면 400');
  const u0 = usage('pron:1');
  ok((await edgeCall('t1', { assign: A1, student: '25' }))[1].items.length === 0 && usage('pron:1') === u0, 'AI 함수: 채점할 녹음이 없으면 AI 사용량을 쓰지 않아요');
  ok((await edgeCall('t1', { assign: A1, file: mkWav(1, 16000, 1).toString('base64'), items: [{ text: 'apple' }] }, '?t=pron'))[0] === 400, 'AI 함수: 파일 채점은 MP3(16kHz 모노)만 (WAV 400)');
  ok((await edgeCall('t1', { assign: A1, file: mkMp3(1, 44100, 2, 128).toString('base64'), items: [{ text: 'apple' }] }, '?t=pron'))[0] === 400, 'AI 함수: 44.1kHz 스테레오 MP3 400');
  ok((await edgeCall('t1', { assign: A1, file: mkMp3(1).toString('base64'), items: [] }, '?t=pron'))[0] === 400 && (await edgeCall('t1', { assign: A1, file: mkMp3(1).toString('base64'), items: Array.from({ length: 21 }, () => ({ text: 'a' })) }, '?t=pron'))[0] === 400, 'AI 함수: 문장 0개 · 21개는 400');
  ok((await edgeCall('t1', { assign: A1, file: 'A'.repeat(1_350_000), items: [{ text: 'a' }] }, '?t=pron'))[0] === 413 && (await edgeCall('t1', { assign: A1, file: mkMp3(4).toString('base64'), items: [{ text: 'a' }] }))[0] === 413, 'AI 함수: 너무 긴 파일 413, 큰 요청은 ?t=pron 주소로만 (아니면 413)');
  ok(usage('pron:1') === u0, 'AI 함수: 거절한 요청은 AI 사용량을 쓰지 않아요');
  const [fs1, fj] = await edgeCall('t1', { assign: A1, file: mkMp3(3).toString('base64'), items: [{ text: 'apple' }, { text: '我喜欢学习。', lang: 'zh', kind: 's' }] }, '?t=pron');
  ok(fs1 === 200 && fj.items.length === 2 && fj.items.every(x => x.score >= 0 && x.heard != null && !('v' in x)) && /Mandarin Chinese/.test(gemReqs[gemReqs.length - 1].text), 'AI 함수: 선생님 파일 채점은 결과만 돌려줘요(중국어는 성조까지)');
  // 점수 계산: 정확성 70% + 유창성 30% (단어도 같은 비율). 정확성은 일치도(들은 말과 목표 비교)만큼만 인정
  const S1 = 'I eat an apple every day.', its = [{ text: S1, kind: 's' }, { text: 'rice' }, { text: 'library' }, { text: '我喜欢学习。', lang: 'zh', kind: 's' }];
  globalThis.HEARD = x => x.idx === 0 ? 'I eat apple every day' : x.idx === 1 ? 'lice' : x.idx === 2 ? null : '我喜欢学';
  const [ss, sj] = await edgeCall('t1', { assign: A1, file: mkMp3(3).toString('base64'), items: its }, '?t=pron');
  globalThis.HEARD = null;
  const gr = gemReqs[gemReqs.length - 1].res, by = i => sj.items.find(x => x.idx === i), accE = (i, c) => Math.round(gr[i].accuracy * Math.min(1, c / 0.95)), base = (i, c) => accE(i, c) * 0.7 + gr[i].fluency * 0.3;
  ok(ss === 200 && by(0).comp === 83 && by(0).acc === accE(0, 5 / 6) && by(0).score === Math.round(base(0, 5 / 6)), '빠진 단어(an)가 있으면 일치도 83%, 그만큼 정확성을 깎고 점수 = 정확성 70% + 유창성 30% ' + JSON.stringify(by(0)));
  ok(by(1).comp === 100 && by(1).acc === gr[1].accuracy && by(1).score === Math.round(base(1, 1)), '발음을 틀려 다르게 들린 단어(rice→lice)는 일치도에서 또 깎지 않아요. 단어도 정확성 70% + 유창성 30%');
  ok(by(2).score === 0 && by(2).comp === 0, '읽지 않은 문항은 0점');
  ok(by(3).comp === 80 && by(3).score === Math.round(base(3, 0.8)), '중국어는 글자 단위로 일치도 (5자 중 4자)');
  ok(sj.items.every(x => x.acc != null && x.flu != null && x.model === 'gemini-2.5-flash'), '결과에 정확성 · 유창성 · 일치도 · 모델');
  // 발음 채점 한도: 선생님마다 하루 200회(AI_PRON_LIMIT), 일반 AI 한도(40)와 따로
  psql(`insert into voca_ai_usage(uid, day, n) values ('1', current_date, 40) on conflict (uid, day) do update set n = 40`);
  ok((await edgeCall('t1', { assign: A1, student: '2', all: true }))[0] === 200, '일반 AI 한도(40)를 다 써도 발음 채점은 돼요');
  psql(`update voca_ai_usage set n = 200 where uid = 'pron:1' and day = current_date`);
  const [ls, lj] = await edgeCall('t1', { assign: A1, student: '2', all: true });
  ok(ls === 429 && /발음 AI 채점 한도\(200번\)/.test(lj.error), '발음 채점 한도 200번을 넘으면 429');
  env.AI_PRON_LIMIT = '300';
  ok((await edgeCall('t1', { assign: A1, student: '2', all: true }))[0] === 200, 'AI_PRON_LIMIT 로 한도를 바꿀 수 있어요');
  delete env.AI_PRON_LIMIT;
  const corsBad = await edge(new Request('https://x/functions/v1/ai', { method: 'POST', headers: { origin: 'https://evil.example' }, body: '{}' }));
  ok(corsBad.status === 403, 'AI 함수: 다른 사이트 주소는 막아요 (CORS 그대로)');
  // 시간당 올리기 한도
  psql(`insert into voca_speak_rate(uid, hr, n) values ('3', date_trunc('hour', now()), 120) on conflict (uid, hr) do update set n = 120`);
  ok(t(3, 'voca_speak_put', { p_assign: A1, p_idx: 0, p_b64: mp3 }).err === 'too_many', '한 시간에 120번 넘게 올리면 막아요');
  // 60일 보관
  psql(`update voca_speak_recs set created_at = now() - interval '61 days' where assign_id = ${A1} and uid = '2' and idx = 3`);
  const rr = t(1, 'voca_speak_results', { p_assign: A1 }), it3 = rr.rows.find(x => x.uid === '2').items.find(x => x.idx === 3);
  ok(it3.audio === false && it3.ai_score != null && psql(`select coalesce(octet_length(audio), -1) from voca_speak_recs where assign_id = ${A1} and uid = '2' and idx = 3`) === '-1', '60일 지난 녹음 파일은 지우고 점수는 남겨요');
  ok(t(1, 'voca_speak_audio', { p_assign: A1, p_uid: '2', p_idx: 3 }).err === 'no_rec', '지워진 녹음은 no_rec');
  // 과제 전체 녹음 지우기 (화면)
  await T.evaluate(id => spResults(id), A1); await T.waitForSelector('.sp-grid');
  await T.click('[data-act="sp-delall"]'); await T.waitForSelector('.dlg'); ok(/모두 지울까요/.test(await T.textContent('.dlg p')), '"녹음 파일 지우기": 과제 전체 확인'); await confirm(T); await T.waitForTimeout(900);
  ok(psql(`select count(*) from voca_speak_recs where assign_id = ${A1} and audio is not null`) === '0' && +psql(`select count(*) from voca_speak_recs where assign_id = ${A1} and ai_score is not null`) > 10, '과제 전체 녹음 파일을 지워요 (점수는 남아요)');
  ok(await T.$$eval('.sp-bc .sp-bi', a => a.every(x => x.disabled)), '지우면 카드의 듣기 버튼이 꺼져요');

  // ===== 서버 v11이 없을 때 =====
  MISSING = true;
  await T.evaluate(() => clDetail(CLV.id, true)); await T.waitForSelector('[data-act="cl-tab"]'); await T.click('[data-act="cl-tab"][data-t="asg"]');
  await T.click('[data-act="cl-ares"] >> text=예문 읽기'); await T.waitForFunction(() => /supabase_update_v11\.sql/.test(document.querySelector('#sheetBody').textContent), null, { timeout: 8000 }).catch(() => {});
  ok((await T.textContent('#sheetBody')).includes('supabase_update_v11.sql'), 'v11 없음: 선생님 결과 화면에 SQL 안내');
  await T.click('[data-act="cl-back"]'); await T.waitForSelector('[data-act="cl-anew"]'); await T.click('[data-act="cl-anew"]'); await T.waitForSelector('#caBook'); await T.click('#caKind [data-v="speak"]'); await T.click('[data-act="cl-acreate"]'); await T.waitForSelector('.dlg');
  ok((await T.textContent('.dlg p')).includes('supabase_update_v11.sql'), 'v11 없음: 발음 평가 과제를 만들기 전에 안내');
  await T.click('.dlg [data-d="1"]');
  await P.click('[data-act="class-open"]'); await P.waitForSelector('.cl-asg'); await P.click('.cl-asg >> text=예문 읽기'); await P.waitForFunction(() => /supabase_update_v11\.sql/.test(document.querySelector('#sheetBody').textContent), null, { timeout: 8000 }).catch(() => {});
  ok((await P.textContent('#sheetBody')).includes('supabase_update_v11.sql'), 'v11 없음: 학생 화면에 안내');
  MISSING = false;

  // ===== 마이크 거부 · 녹음 못 하는 브라우저 =====
  const D = await page({ width: 390, height: 844 }, 'D', () => { navigator.mediaDevices.getUserMedia = () => Promise.reject(Object.assign(new Error('no'), { name: 'NotAllowedError' })); });
  await signup(D, 'parkstu', 'm2', '박민', '20301');
  await D.click('[data-act="class-open"]'); await D.waitForSelector('.cl-asg', { timeout: 5000 }); await D.click('.cl-asg >> text=예문 읽기'); await D.waitForSelector('.sp-card');
  await D.click('[data-act="sp-rec"]'); await D.click('.dlg [data-d="1"]'); await D.waitForSelector('.sp-note');
  ok(/마이크를 쓸 수 없어요/.test(await D.textContent('.sp-note')), '마이크를 거부하면 허용 방법 안내');
  await D.evaluate(() => { Object.defineProperty(navigator, 'mediaDevices', { value: undefined, configurable: true }); }); await D.click('[data-act="sp-rec"]'); await D.waitForTimeout(300);
  ok(/이 브라우저에서는 녹음할 수 없어요/.test(await D.textContent('.sp-note')), '녹음을 못 하는 브라우저 안내');

  // 학생 녹음 화면 PC
  const W = await page({ width: 1280, height: 860 }, 'W');
  await signup(W, 'parkstu', 'm2', '박민', '20301');
  await W.click('[data-act="class-open"]'); await W.waitForSelector('.cl-asg'); await W.click('.cl-asg >> text=예문 읽기'); await W.waitForSelector('.sp-card'); await save(W, 'S-05-record-pc');
  await dark(W, true); await save(W, 'S-05-record-pc-dark');

  // 나가기 · 과제 삭제 · 계정 지우기
  t(1, 'voca_speak_mark', { p_assign: A1, p_uid: '3', p_score: 70, p_note: '' });
  ok(t(3, 'voca_class_leave', { p_class: CID }).ok && psql("select count(*) from voca_speak_recs where uid = '3'") === '0' && psql("select count(*) from voca_speak_marks where uid = '3'") === '0', '반에서 나가면 그 학생 녹음 · 점수도 지워져요');
  t(1, 'voca_assign_delete', { p_assign: A1 });
  ok(psql(`select count(*) from voca_speak_recs where assign_id = ${A1}`) === '0' && psql(`select count(*) from voca_speak_marks where assign_id = ${A1}`) === '0', '과제를 지우면 녹음 · 점수도 지워져요');
  t(2, 'voca_class_forget', {});
  ok(psql("select count(*) from voca_speak_recs where uid = '2'") === '0', '계정을 지우면(class_forget) 녹음도 지워져요');

  console.log('SIZES', JSON.stringify({ '2초 단어(lamejs 32kbps)': (SIZES.word2 / 1024).toFixed(1) + 'KB', '8초 문장(lamejs 32kbps)': (SIZES.sent8 / 1024).toFixed(1) + 'KB', '브라우저 단어': `${(SIZES.browserWord / 1024).toFixed(1)}KB/${SIZES.browserWordSec.toFixed(1)}초`, '브라우저 문장': `${(SIZES.browserSent / 1024).toFixed(1)}KB/${SIZES.browserSentSec.toFixed(1)}초`, 'WAV 2초': '62.5KB', 'WAV 8초': '250KB' }));
  console.log('ERRORS:', errs.length ? errs.join('\n') : 'none');
  console.log(fails ? `${fails} FAIL` : 'ALL OK');
  try { fs.rmSync(FX, { recursive: true, force: true }); } catch (e) {}
  await b.close(); srv.close(); process.exit(fails || errs.length ? 1 : 0);
})().catch(e => { console.error(e); console.error('ERRORS:', errs.join('\n')); process.exit(1); });
