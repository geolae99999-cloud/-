// VocaPro 학교 검색 Edge Function (나이스 교육정보개방포털 schoolInfo)
// 배포: supabase functions deploy school --no-verify-jwt
// 비밀값 등록: supabase secrets set NEIS_API_KEY=<나이스 인증키>

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

function corsFor(req: Request): Record<string, string> {
  const o = req.headers.get('origin');
  return {
    'Access-Control-Allow-Origin': o && originOk(o) ? o : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Vary': 'Origin'
  };
}

function jsonResp(body: unknown, status: number, extraHeaders: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...extraHeaders
    }
  });
}

const Q_RE = /^[가-힣ㄱ-ㅎㅏ-ㅣA-Za-z0-9 ()·.-]{2,20}$/;

Deno.serve(async (req: Request) => {
  const cors = corsFor(req);
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: cors });
  }
  if (req.method !== 'GET') {
    return jsonResp({ error: '허용되지 않는 요청 방식이에요.' }, 405, cors);
  }

  const url = new URL(req.url);
  const q = (url.searchParams.get('q') || '').replace(/\s+/g, ' ').trim();
  if (!Q_RE.test(q)) {
    return jsonResp({ error: '학교 이름을 2~20자로 입력해 주세요.' }, 400, cors);
  }

  const apiKey = Deno.env.get('NEIS_API_KEY');
  if (!apiKey) {
    return jsonResp({ error: '학교 검색이 아직 준비되지 않았어요.' }, 503, cors);
  }

  const neisUrl =
    'https://open.neis.go.kr/hub/schoolInfo?KEY=' +
    encodeURIComponent(apiKey) +
    '&Type=json&pIndex=1&pSize=10&SCHUL_NM=' +
    encodeURIComponent(q);

  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 6000);
  try {
    const r = await fetch(neisUrl, { signal: ctl.signal });
    clearTimeout(timer);
    if (!r.ok) {
      return jsonResp({ error: '학교 정보를 불러오지 못했어요.' }, 502, cors);
    }
    const data = await r.json();
    if (data?.RESULT?.CODE === 'INFO-200') {
      return jsonResp(
        { items: [] },
        200,
        { ...cors, 'Cache-Control': 'public, max-age=86400' }
      );
    }
    const rows = Array.isArray(data?.schoolInfo?.[1]?.row) ? data.schoolInfo[1].row : null;
    if (!rows) {
      return jsonResp({ error: '학교 정보를 불러오지 못했어요.' }, 502, cors);
    }
    const items = rows.slice(0, 10).map((row: Record<string, unknown>) => ({
      code: `${String(row.ATPT_OFCDC_SC_CODE || '').trim()}:${String(row.SD_SCHUL_CODE || '').trim()}`,
      name: String(row.SCHUL_NM || '').trim(),
      kind: String(row.SCHUL_KND_SC_NM || '').trim(),
      region: String(row.LCTN_SC_NM || '').trim(),
      found: String(row.FOND_SC_NM || '').trim(),
      coedu: String(row.COEDU_SC_NM || '').trim()
    }));
    return jsonResp(
      { items },
      200,
      { ...cors, 'Cache-Control': 'public, max-age=86400' }
    );
  } catch (_e) {
    clearTimeout(timer);
    return jsonResp({ error: '학교 검색 응답이 지연되고 있어요.' }, 504, cors);
  }
});
