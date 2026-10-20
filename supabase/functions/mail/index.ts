// VocaPro 이메일 인증코드 Edge Function (Brevo)
// 배포: supabase functions deploy mail --no-verify-jwt
// 비밀값: BREVO_API_KEY, MAIL_FROM (Brevo 에서 인증한 보내는 사람 이메일)
// POST { email, purpose: 'signup' | 'reset' | 'link' } -> { ok: true }
// 6자리 코드는 서버에서만 만들고, DB 에는 해시만 저장해요(voca_email_code_put). 보내는 횟수 제한도 DB 함수가 해요.
// 비밀번호 찾기(reset)는 가입된 이메일인지 알려 주지 않아요(항상 같은 응답).

const ALLOWED_ORIGINS = ['https://vocapro.kro.kr', 'https://www.vocapro.kro.kr', 'https://vocapro.pages.dev'];
function originOk(o: string | null): boolean {
  if (!o) return false;
  if (ALLOWED_ORIGINS.includes(o)) return true;
  return /^https:\/\/[a-z0-9-]+\.vocapro\.pages\.dev$/.test(o);
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
function json(body: unknown, status: number, h: Record<string, string>): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...h } });
}

const EMAIL_RE = /^[A-Za-z0-9._%+-]{1,64}@[A-Za-z0-9.-]{1,185}\.[A-Za-z]{2,24}$/;
const PURPOSE = { signup: '회원가입', reset: '비밀번호 재설정', link: '이메일 등록' } as const;

async function sha256Hex(s: string): Promise<string> {
  const b = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)));
  return [...b].map(x => x.toString(16).padStart(2, '0')).join('');
}
function sixDigits(): string {
  const a = new Uint32Array(1);
  crypto.getRandomValues(a);
  return String(a[0] % 1000000).padStart(6, '0');
}
const escHtml = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

Deno.serve(async (req: Request) => {
  const h = cors(req);
  if (req.method === 'OPTIONS') return new Response('ok', { headers: h });
  if (req.method !== 'POST') return json({ error: 'method' }, 405, h);
  if (!originOk(req.headers.get('origin'))) return json({ error: 'origin' }, 403, h);

  let body: { email?: unknown; purpose?: unknown };
  try { body = await req.json(); } catch (_e) { return json({ error: 'bad_input' }, 400, h); }
  const email = String(body.email ?? '').trim().toLowerCase();
  const purpose = String(body.purpose ?? '') as keyof typeof PURPOSE;
  if (!EMAIL_RE.test(email) || email.length > 254 || !(purpose in PURPOSE)) return json({ error: 'bad_input' }, 400, h);

  const supaUrl = (Deno.env.get('SUPABASE_URL') || '').replace(/\/+$/, '');
  const srvKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  const apiKey = Deno.env.get('BREVO_API_KEY') || '';
  const from = Deno.env.get('MAIL_FROM') || '';
  if (!supaUrl || !srvKey || !apiKey || !from) return json({ error: 'config' }, 503, h);

  const ip = (req.headers.get('cf-connecting-ip') || (req.headers.get('x-forwarded-for') || '').split(',')[0] || '').trim().slice(0, 64);
  const code = sixDigits();
  const hash = await sha256Hex(`${purpose}:${email}:${code}`);

  // 코드 저장 + 횟수 제한 (가입된 이메일인지도 여기서 판단)
  let put: { ok?: boolean; send?: boolean; err?: string } = {};
  try {
    const r = await fetch(`${supaUrl}/rest/v1/rpc/voca_email_code_put`, {
      method: 'POST',
      headers: { apikey: srvKey, Authorization: `Bearer ${srvKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_email: email, p_purpose: purpose, p_hash: hash, p_ip: ip })
    });
    put = await r.json();
  } catch (_e) { return json({ error: 'server' }, 502, h); }
  if (put.err) return json({ error: put.err }, put.err === 'too_many' ? 429 : 400, h);
  if (!put.send) return json({ ok: true }, 200, h); // reset 인데 없는 이메일: 같은 응답

  const what = PURPOSE[purpose];
  const html = `<div style="font-family:-apple-system,'Apple SD Gothic Neo','Malgun Gothic',sans-serif;max-width:440px;margin:0 auto;padding:28px 24px;color:#191f28">
  <h2 style="margin:0 0 6px;font-size:20px">VocaPro ${escHtml(what)} 인증코드</h2>
  <p style="margin:0 0 20px;color:#6b7684;font-size:14px">아래 6자리 코드를 VocaPro 화면에 입력해 주세요. 10분 동안만 쓸 수 있어요.</p>
  <div style="font-size:34px;font-weight:800;letter-spacing:10px;background:#f2f4f6;border-radius:14px;padding:18px 0;text-align:center">${code}</div>
  <p style="margin:20px 0 0;color:#8b95a1;font-size:12px;line-height:1.6">직접 요청하지 않았다면 이 메일을 무시해 주세요. VocaPro는 이 코드를 전화나 메시지로 묻지 않아요.</p>
</div>`;
  try {
    const r = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': apiKey, 'Content-Type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({
        sender: { name: 'VocaPro', email: from },
        to: [{ email }],
        subject: `[VocaPro] ${what} 인증코드 ${code}`,
        htmlContent: html,
        textContent: `VocaPro ${what} 인증코드: ${code}\n10분 동안만 쓸 수 있어요. 직접 요청하지 않았다면 무시해 주세요.`
      })
    });
    if (!r.ok) return json({ error: 'send_failed' }, 502, h);
  } catch (_e) { return json({ error: 'send_failed' }, 502, h); }
  return json({ ok: true }, 200, h);
});
