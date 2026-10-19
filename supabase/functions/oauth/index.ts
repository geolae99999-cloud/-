// VocaPro 간편 로그인 Edge Function (구글 · 카카오 · 네이버)
// 배포: supabase functions deploy oauth --no-verify-jwt
// 비밀값: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, KAKAO_REST_KEY, KAKAO_CLIENT_SECRET(선택), NAVER_CLIENT_ID, NAVER_CLIENT_SECRET

const DEFAULT_RETURN = 'https://vocapro.kro.kr/';
const ALLOWED_ORIGINS = [
  'https://vocapro.kro.kr',
  'https://www.vocapro.kro.kr',
  'https://vocapro.pages.dev'
];

function originOk(origin: string | null): boolean {
  if (!origin) return false;
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  if (/^https:\/\/[a-z0-9-]+\.vocapro\.pages\.dev$/.test(origin)) return true;
  if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return true;
  return false;
}

function safeReturnUrl(raw: string | null): string {
  if (!raw) return DEFAULT_RETURN;
  try {
    const u = new URL(raw);
    // 로그인 토큰을 보내는 곳이라 https 사이트(본 사이트 · 미리보기 배포)만 허용해요. localhost 는 받지 않아요.
    if (u.protocol !== 'https:' || !originOk(u.origin)) return DEFAULT_RETURN;
    return u.origin + u.pathname;
  } catch (_e) {
    return DEFAULT_RETURN;
  }
}

function redirect(to: string, cookie?: string): Response {
  const headers: Record<string, string> = { Location: to, 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' };
  if (cookie) headers['Set-Cookie'] = cookie;
  return new Response(null, { status: 302, headers });
}

// 로그인을 시작한 브라우저에만 쿠키(nonce)를 심고, 콜백에서 state 의 nonce 와 같은지 확인해요.
// 남이 만든 콜백 주소를 눌러 그 사람 계정으로 로그인되는 공격(login CSRF)을 막아요.
const NONCE_COOKIE = 'vp_on';
const cookieSet = (n: string) => `${NONCE_COOKIE}=${n}; Path=/functions/v1/oauth; Max-Age=600; HttpOnly; Secure; SameSite=Lax`;
const cookieClear = `${NONCE_COOKIE}=; Path=/functions/v1/oauth; Max-Age=0; HttpOnly; Secure; SameSite=Lax`;
function cookieGet(req: Request, name: string): string {
  for (const part of (req.headers.get('cookie') || '').split(';')) {
    const [k, v] = part.trim().split('=');
    if (k === name && v && /^[A-Za-z0-9_-]{8,64}$/.test(v)) return v;
  }
  return '';
}

function b64uEncode(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64uDecode(str: string): Uint8Array {
  const b64 = str.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((str.length + 3) % 4);
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

async function signState(payload: { p: string; r: string; exp: number; n: string }, secret: string): Promise<string> {
  const body = b64uEncode(new TextEncoder().encode(JSON.stringify(payload)));
  const key = await hmacKey(secret);
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body)));
  return body + '.' + b64uEncode(sig);
}

async function verifyState(state: string, secret: string): Promise<{ p: string; r: string; exp: number; n: string } | null> {
  const parts = state.split('.');
  if (parts.length !== 2) return null;
  try {
    const key = await hmacKey(secret);
    const sigBytes = b64uDecode(parts[1]);
    const valid = await crypto.subtle.verify('HMAC', key, sigBytes.buffer as ArrayBuffer, new TextEncoder().encode(parts[0]));
    if (!valid) return null;
    const data = JSON.parse(new TextDecoder().decode(b64uDecode(parts[0])));
    if (!data || typeof data.p !== 'string' || typeof data.r !== 'string' || typeof data.exp !== 'number') return null;
    if (Date.now() > data.exp) return null;
    return data;
  } catch (_e) {
    return null;
  }
}

async function fetchWithTimeout(url: string, init: RequestInit = {}, ms = 8000): Promise<Response> {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: ctl.signal });
  } finally {
    clearTimeout(t);
  }
}

function callbackUri(): string {
  const base = (Deno.env.get('SUPABASE_URL') || '').replace(/\/+$/, '');
  return `${base}/functions/v1/oauth/cb`;
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'GET') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const url = new URL(req.url);
  const supaUrl = (Deno.env.get('SUPABASE_URL') || '').replace(/\/+$/, '');
  const srvKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

  // 콜백: /functions/v1/oauth/cb
  if (url.pathname.endsWith('/cb')) {
    const out = (to: string) => redirect(to, cookieClear);
    const stateRaw = url.searchParams.get('state') || '';
    const st = srvKey ? await verifyState(stateRaw, srvKey) : null;
    const ret = safeReturnUrl(st?.r || null);

    if (!st || !supaUrl || !srvKey || !st.n || cookieGet(req, NONCE_COOKIE) !== st.n) {
      return out(`${ret}#oerr=fail`);
    }
    if (url.searchParams.get('error')) {
      return out(`${ret}#oerr=cancel`);
    }
    const code = url.searchParams.get('code') || '';
    if (!code) {
      return out(`${ret}#oerr=fail`);
    }

    const p = st.p;
    const cb = callbackUri();
    let sub = '';

    try {
      if (p === 'google') {
        const cid = Deno.env.get('GOOGLE_CLIENT_ID') || '';
        const csec = Deno.env.get('GOOGLE_CLIENT_SECRET') || '';
        if (!cid || !csec) return out(`${ret}#oerr=config`);
        const tr = await fetchWithTimeout('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            code,
            client_id: cid,
            client_secret: csec,
            redirect_uri: cb,
            grant_type: 'authorization_code'
          })
        });
        if (!tr.ok) return out(`${ret}#oerr=fail`);
        const tj = await tr.json();
        const at = String(tj?.access_token || '');
        if (!at) return out(`${ret}#oerr=fail`);
        const ur = await fetchWithTimeout('https://openidconnect.googleapis.com/v1/userinfo', {
          headers: { Authorization: `Bearer ${at}` }
        });
        if (!ur.ok) return out(`${ret}#oerr=fail`);
        const uj = await ur.json();
        sub = String(uj?.sub || '').trim();
      } else if (p === 'kakao') {
        const cid = Deno.env.get('KAKAO_REST_KEY') || '';
        const csec = Deno.env.get('KAKAO_CLIENT_SECRET') || '';
        if (!cid) return out(`${ret}#oerr=config`);
        const bodyParams: Record<string, string> = {
          grant_type: 'authorization_code',
          client_id: cid,
          redirect_uri: cb,
          code
        };
        if (csec) bodyParams.client_secret = csec;
        const tr = await fetchWithTimeout('https://kauth.kakao.com/oauth/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8' },
          body: new URLSearchParams(bodyParams)
        });
        if (!tr.ok) return out(`${ret}#oerr=fail`);
        const tj = await tr.json();
        const at = String(tj?.access_token || '');
        if (!at) return out(`${ret}#oerr=fail`);
        const ur = await fetchWithTimeout('https://kapi.kakao.com/v2/user/me', {
          headers: { Authorization: `Bearer ${at}` }
        });
        if (!ur.ok) return out(`${ret}#oerr=fail`);
        const uj = await ur.json();
        sub = uj?.id != null ? String(uj.id).trim() : '';
      } else if (p === 'naver') {
        const cid = Deno.env.get('NAVER_CLIENT_ID') || '';
        const csec = Deno.env.get('NAVER_CLIENT_SECRET') || '';
        if (!cid || !csec) return out(`${ret}#oerr=config`);
        const tUrl =
          'https://nid.naver.com/oauth2.0/token?' +
          new URLSearchParams({
            grant_type: 'authorization_code',
            client_id: cid,
            client_secret: csec,
            code,
            state: stateRaw
          }).toString();
        const tr = await fetchWithTimeout(tUrl);
        if (!tr.ok) return out(`${ret}#oerr=fail`);
        const tj = await tr.json();
        const at = String(tj?.access_token || '');
        if (!at) return out(`${ret}#oerr=fail`);
        const ur = await fetchWithTimeout('https://openapi.naver.com/v1/nid/me', {
          headers: { Authorization: `Bearer ${at}` }
        });
        if (!ur.ok) return out(`${ret}#oerr=fail`);
        const uj = await ur.json();
        sub = String(uj?.response?.id || '').trim();
      } else {
        return out(`${ret}#oerr=fail`);
      }
    } catch (_e) {
      return out(`${ret}#oerr=fail`);
    }

    if (!sub || sub.length > 128) {
      return out(`${ret}#oerr=fail`);
    }

    try {
      const rpcRes = await fetchWithTimeout(`${supaUrl}/rest/v1/rpc/voca_oauth_enter`, {
        method: 'POST',
        headers: {
          apikey: srvKey,
          Authorization: `Bearer ${srvKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ p_provider: p, p_sub: sub })
      });
      const txt = await rpcRes.text();
      if (!rpcRes.ok) {
        if (/too_many_signups/i.test(txt)) return out(`${ret}#oerr=busy`);
        return out(`${ret}#oerr=fail`);
      }
      const j = JSON.parse(txt);
      if (!j || j.err || !j.token) {
        if (/too_many_signups/i.test(String(j?.err || ''))) return out(`${ret}#oerr=busy`);
        return out(`${ret}#oerr=fail`);
      }
      const isNew = j.new ? '1' : '0';
      return out(`${ret}#oauth=${encodeURIComponent(String(j.token))}&new=${isNew}`);
    } catch (_e) {
      return out(`${ret}#oerr=fail`);
    }
  }

  // 시작 요청: GET /functions/v1/oauth?p=google|kakao|naver&r=<돌아갈 주소>
  const p = (url.searchParams.get('p') || '').trim();
  const ret = safeReturnUrl(url.searchParams.get('r'));
  if (!['google', 'kakao', 'naver'].includes(p)) {
    return redirect(`${ret}#oerr=fail`);
  }
  if (!supaUrl || !srvKey) {
    return redirect(`${ret}#oerr=config`);
  }

  const cb = callbackUri();
  const randBytes = new Uint8Array(16);
  crypto.getRandomValues(randBytes);
  const nonce = b64uEncode(randBytes);
  const state = await signState(
    { p, r: ret, exp: Date.now() + 10 * 60 * 1000, n: nonce },
    srvKey
  );

  if (p === 'google') {
    const cid = Deno.env.get('GOOGLE_CLIENT_ID') || '';
    const csec = Deno.env.get('GOOGLE_CLIENT_SECRET') || '';
    if (!cid || !csec) return redirect(`${ret}#oerr=config`);
    const authUrl =
      'https://accounts.google.com/o/oauth2/v2/auth?' +
      new URLSearchParams({
        client_id: cid,
        redirect_uri: cb,
        response_type: 'code',
        scope: 'openid',
        prompt: 'select_account',
        state
      }).toString();
    return redirect(authUrl, cookieSet(nonce));
  }

  if (p === 'kakao') {
    const cid = Deno.env.get('KAKAO_REST_KEY') || '';
    if (!cid) return redirect(`${ret}#oerr=config`);
    const authUrl =
      'https://kauth.kakao.com/oauth/authorize?' +
      new URLSearchParams({
        client_id: cid,
        redirect_uri: cb,
        response_type: 'code',
        state
      }).toString();
    return redirect(authUrl, cookieSet(nonce));
  }

  if (p === 'naver') {
    const cid = Deno.env.get('NAVER_CLIENT_ID') || '';
    const csec = Deno.env.get('NAVER_CLIENT_SECRET') || '';
    if (!cid || !csec) return redirect(`${ret}#oerr=config`);
    const authUrl =
      'https://nid.naver.com/oauth2.0/authorize?' +
      new URLSearchParams({
        client_id: cid,
        redirect_uri: cb,
        response_type: 'code',
        state
      }).toString();
    return redirect(authUrl, cookieSet(nonce));
  }

  return redirect(`${ret}#oerr=fail`);
});
