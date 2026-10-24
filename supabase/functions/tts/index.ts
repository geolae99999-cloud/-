// VocaPro 원어민 목소리 Edge Function (Cloudflare Workers AI 음성 합성)
// 배포: supabase functions deploy tts --no-verify-jwt
// 비밀값: CF_ACCOUNT_ID, CF_API_TOKEN (ai 함수와 같은 값), 선택: TTS_EN_MODELS (쉼표로 모델 순서)
// POST { text, lang: 'en' | 'zh' } -> audio/mpeg
// 만든 소리는 Storage 'tts' 버킷(공개)에 tts/<lang>/<sha256>.mp3 로 저장해서, 앱은 다음부터 그 주소에서 바로 받아요.

const ALLOWED_ORIGINS = ['https://vocapro.kro.kr', 'https://www.vocapro.kro.kr', 'https://vocapro.pages.dev'];
function originOk(o: string | null): boolean {
  if (!o) return false;
  if (ALLOWED_ORIGINS.includes(o)) return true;
  if (/^https:\/\/[a-z0-9-]+\.vocapro\.pages\.dev$/.test(o)) return true;
  return /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(o);
}
function cors(req: Request): Record<string, string> {
  const o = req.headers.get('origin');
  return {
    'Access-Control-Allow-Origin': o && originOk(o) ? o : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin'
  };
}
const json = (b: unknown, s: number, h: Record<string, string>) => new Response(JSON.stringify(b), { status: s, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...h } });

async function sha256Hex(s: string): Promise<string> {
  const b = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)));
  return [...b].map(x => x.toString(16).padStart(2, '0')).join('');
}
function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64); const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

// 모델마다 입력 · 출력 형식이 달라요. 오디오를 그대로 주는 모델과 JSON(base64)으로 주는 모델을 모두 받아요.
type Plan = { model: string; body: Record<string, unknown> };
function plans(lang: string, text: string): Plan[] {
  if (lang === 'zh') return [{ model: '@cf/myshell-ai/melotts', body: { prompt: text, lang: 'zh' } }];
  const order = (Deno.env.get('TTS_EN_MODELS') || '@cf/deepgram/aura-2-en,@cf/deepgram/aura-1,@cf/myshell-ai/melotts').split(',').map(s => s.trim()).filter(Boolean);
  return order.map(m => m.includes('aura-2') ? { model: m, body: { text, speaker: 'thalia', encoding: 'mp3' } }
    : m.includes('aura') ? { model: m, body: { text, speaker: 'asteria', encoding: 'mp3' } }
    : { model: m, body: { prompt: text, lang: 'en' } });
}
async function synth(acct: string, tok: string, p: Plan): Promise<Uint8Array | null> {
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 20000);
  try {
    const r = await fetch(`https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(acct)}/ai/run/${p.model}`, {
      method: 'POST', signal: ctl.signal,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` },
      body: JSON.stringify(p.body)
    });
    if (!r.ok) return null;
    const ct = r.headers.get('content-type') || '';
    if (ct.startsWith('audio/') || ct.includes('octet-stream')) { const b = new Uint8Array(await r.arrayBuffer()); return b.length > 200 ? b : null; }
    const j = await r.json().catch(() => null);
    const a = j?.result?.audio ?? j?.audio;
    if (typeof a === 'string' && a.length > 200) return b64ToBytes(a.replace(/^data:audio\/[a-z0-9]+;base64,/, ''));
    return null;
  } catch (_e) { return null; } finally { clearTimeout(t); }
}

Deno.serve(async (req: Request) => {
  const h = cors(req);
  if (req.method === 'OPTIONS') return new Response('ok', { headers: h });
  if (req.method !== 'POST') return json({ error: 'method' }, 405, h);
  if (!originOk(req.headers.get('origin'))) return json({ error: 'origin' }, 403, h);
  let b: { text?: unknown; lang?: unknown };
  try { b = await req.json(); } catch (_e) { return json({ error: 'bad_input' }, 400, h); }
  const lang = b.lang === 'zh' ? 'zh' : b.lang === 'en' ? 'en' : '';
  const text = String(b.text ?? '').replace(/\s+/g, ' ').trim();
  if (!lang || !text || text.length > 400) return json({ error: 'bad_input' }, 400, h);

  const supa = (Deno.env.get('SUPABASE_URL') || '').replace(/\/+$/, ''), srv = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  const acct = Deno.env.get('CF_ACCOUNT_ID') || '', tok = Deno.env.get('CF_API_TOKEN') || '';
  if (!supa || !srv || !acct || !tok) return json({ error: 'config' }, 503, h);
  const key = await sha256Hex(`v1|${lang}|${text}`), path = `${lang}/${key}.mp3`;
  const audioHeaders = { ...h, 'Content-Type': 'audio/mpeg', 'Cache-Control': 'public, max-age=31536000, immutable' };

  // 이미 있으면 그대로 보내요(앱이 공개 주소를 먼저 보지만, 동시에 눌렀을 때 대비)
  try {
    const c = await fetch(`${supa}/storage/v1/object/public/tts/${path}`);
    if (c.ok) return new Response(await c.arrayBuffer(), { headers: audioHeaders });
  } catch (_e) { /* 만들기로 */ }

  const ip = (req.headers.get('cf-connecting-ip') || (req.headers.get('x-forwarded-for') || '').split(',')[0] || '').trim();
  try {
    const r = await fetch(`${supa}/rest/v1/rpc/voca_tts_hit`, { method: 'POST', headers: { apikey: srv, Authorization: `Bearer ${srv}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ p_ip: ip }) });
    if (r.ok && (await r.json()) === false) return json({ error: 'too_many' }, 429, h);
  } catch (_e) { /* 제한 확인 실패는 통과 */ }

  let audio: Uint8Array | null = null;
  for (const p of plans(lang, text)) { audio = await synth(acct, tok, p); if (audio) break; }
  if (!audio) return json({ error: 'tts_failed' }, 502, h);

  // 저장은 기다리지 않아요(실패해도 소리는 보내요)
  const save = fetch(`${supa}/storage/v1/object/tts/${path}`, {
    method: 'POST', headers: { apikey: srv, Authorization: `Bearer ${srv}`, 'Content-Type': 'audio/mpeg', 'x-upsert': 'true', 'cache-control': 'max-age=31536000' }, body: audio
  }).catch(() => null);
  try { (globalThis as unknown as { EdgeRuntime?: { waitUntil(p: Promise<unknown>): void } }).EdgeRuntime?.waitUntil(save); } catch (_e) { /* ignore */ }
  return new Response(audio, { headers: audioHeaders });
});
