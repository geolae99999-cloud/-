// AI 함수: Cloudflare Workers AI(오픈소스 모델)를 글 작업에 먼저 쓰고, 실패하면 Gemini 로. 사진 · 녹음은 Gemini 만.
// index.ts 를 변환해 가짜 Deno 환경에서 돌려요(Workers AI · Gemini 는 가짜 응답).
const ts = require('/opt/node22/lib/node_modules/typescript');
const fs = require('fs'), path = require('path');
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
let edge = null;
const env = { SUPABASE_URL: 'http://db', SUPABASE_SERVICE_ROLE_KEY: 'svc', GEMINI_API_KEY: 'test-key', CF_ACCOUNT_ID: 'acct1', CF_API_TOKEN: 'cftok', AI_DAILY_LIMIT: '40', AI_GLOBAL_LIMIT: '3000' };
globalThis.Deno = { env: { get: k => env[k] }, serve: h => { edge = h; } };
const stubSb = { createClient: () => ({ rpc: async fn => fn === 'voca_me' ? { data: { id: 7, username: 'kim' }, error: null } : fn === 'voca_ai_use' ? { data: true, error: null } : { data: null, error: { code: 'PGRST202' } } }) };
{
  const src = fs.readFileSync(path.join(__dirname, '..', 'supabase', 'functions', 'ai', 'index.ts'), 'utf8');
  const out = ts.transpileModule(src, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } });
  const mod = { exports: {} };
  new Function('require', 'exports', 'module', out.outputText)(n => { if (/supabase-js/.test(n)) return stubSb; throw new Error('import ' + n); }, mod.exports, mod);
}
let calls = [], CF = 'ok';
const WORD = { meaning: '카약', phonetic: '/ˈkaɪæk/', koreanPron: '카이악', example: 'We paddled a kayak.', exampleKo: '우리는 카약을 저었다.', synonyms: 'canoe' };
globalThis.fetch = async (url, o) => {
  url = String(url); const b = JSON.parse(o.body);
  if (url.startsWith('https://api.cloudflare.com/client/v4/accounts/acct1/ai/run/')) {
    const model = url.split('/ai/run/')[1];
    calls.push({ to: 'cf', model, auth: o.headers.Authorization, fmt: b.response_format && b.response_format.type, schemaType: b.response_format && b.response_format.json_schema && b.response_format.json_schema.type, user: b.messages[1].content });
    if (CF === 'busy') return new Response(JSON.stringify({ success: false, errors: [{ message: 'busy' }] }), { status: 503 });
    if (CF === 'nofmt' && b.response_format) return new Response(JSON.stringify({ success: false }), { status: 400 });
    if (CF === 'junk') return new Response(JSON.stringify({ success: true, result: { response: 'Sorry, I cannot.' } }), { status: 200 });
    if (CF === 'obj') return new Response(JSON.stringify({ success: true, result: { response: WORD } }), { status: 200 });
    return new Response(JSON.stringify({ success: true, result: { response: 'Here: ' + JSON.stringify(WORD) } }), { status: 200 });
  }
  if (url.startsWith('https://generativelanguage.googleapis.com/')) {
    calls.push({ to: 'gemini', model: url.split('/models/')[1].split(':')[0] });
    return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify({ ...WORD, meaning: '제미니 카약' }) }] } }] }), { status: 200 });
  }
  throw new Error('unexpected fetch ' + url);
};
const call = async body => { const res = await edge(new Request('https://x.supabase.co/functions/v1/ai', { method: 'POST', headers: { origin: 'https://vocapro.kro.kr', 'content-type': 'application/json' }, body: JSON.stringify(body) })); return { status: res.status, j: await res.json().catch(() => null) }; };
(async () => {
  const W = { token: 't', task: 'word', word: 'kayak', lang: 'en' };
  calls = []; let r = await call(W);
  ok(r.status === 200 && JSON.parse(r.j.text).meaning === '카약' && /^@cf\/meta\/llama-3\.3-70b/.test(r.j.model), '단어: 오픈소스 모델(Llama 3.3 70B)로 ' + JSON.stringify(r.j));
  ok(calls.length === 1 && calls[0].auth === 'Bearer cftok' && calls[0].fmt === 'json_schema' && calls[0].schemaType === 'object' && /kayak/.test(calls[0].user), 'Workers AI 요청 모양(토큰 · JSON 스키마 소문자 · 프롬프트) ' + JSON.stringify(calls));
  CF = 'obj'; calls = []; r = await call(W);
  ok(r.status === 200 && JSON.parse(r.j.text).meaning === '카약', '답이 객체로 와도 글로 바꿔요');
  CF = 'nofmt'; calls = []; r = await call(W);
  ok(r.status === 200 && calls.length === 2 && calls[1].fmt === undefined, 'JSON 형식을 못 받는 모델은 형식 없이 한 번 더');
  CF = 'junk'; calls = []; r = await call(W);
  ok(r.status === 200 && calls.filter(c => c.to === 'cf').length === 3 && calls.some(c => c.to === 'gemini') && JSON.parse(r.j.text).meaning === '제미니 카약', 'JSON 이 아니면 다음 모델 → 다 안 되면 Gemini ' + calls.map(c => c.model).join(', '));
  CF = 'busy'; calls = []; r = await call(W);
  ok(r.status === 200 && calls[calls.length - 1].to === 'gemini', 'Workers AI 가 바쁘면 Gemini');
  // 사진 · 녹음은 Gemini 만
  CF = 'ok'; calls = []; r = await call({ token: 't', task: 'ocr', images: ['/9j/AAAA'], lang: 'en' });
  ok(!calls.some(c => c.to === 'cf'), '사진 읽기는 Workers AI 를 쓰지 않아요 ' + JSON.stringify(calls.map(c => c.to)));
  // Gemini 키가 없어도 글 작업은 돼요, 사진은 설정 안내
  delete env.GEMINI_API_KEY; CF = 'ok'; calls = []; r = await call(W);
  ok(r.status === 200 && calls.every(c => c.to === 'cf'), 'Gemini 키 없이도 단어 채우기');
  r = await call({ token: 't', task: 'ocr', images: ['/9j/AAAA'], lang: 'en' });
  ok(r.status === 503 && /설정/.test(r.j.error), '키 없으면 사진 읽기는 설정 안내 ' + JSON.stringify(r.j));
  CF = 'busy'; r = await call(W);
  ok(r.status === 503 && /바빠요/.test(r.j.error), '키 없고 Workers AI 도 바쁘면 안내');
  // Workers AI 설정이 없으면 예전처럼 Gemini
  env.GEMINI_API_KEY = 'test-key'; delete env.CF_API_TOKEN; CF = 'ok'; calls = []; r = await call(W);
  ok(r.status === 200 && calls.every(c => c.to === 'gemini'), 'CF 설정이 없으면 Gemini 그대로');
  // 모델 목록은 환경 변수로 바꿀 수 있고, 이상한 이름은 버려요
  console.log(fails ? `FAILS: ${fails}` : 'FAILS: none'); process.exit(fails ? 1 : 0);
})().catch(e => { console.log('FAIL crash', e.stack); process.exit(1); });
