  /* =========================================================
   * AI 연동 (모델 자동 조회)
   * ======================================================= */
  const PROVIDERS = {
    gemini:    { label: 'Google Gemini',    hint: 'AIza... 로 시작하는 키 (Google AI Studio에서 발급)' },
    xai:       { label: 'xAI Grok',         hint: 'xai-... 로 시작하는 키 (console.x.ai, 크레딧 충전 필요)' },
    openai:    { label: 'OpenAI ChatGPT',   hint: 'sk-... 로 시작하는 키' },
    anthropic: { label: 'Anthropic Claude', hint: 'sk-ant-... 로 시작하는 키' }
  };
  const FALLBACK_MODELS = { gemini: ['gemini-2.5-flash', 'gemini-2.0-flash'], xai: ['grok-3-mini', 'grok-3'], openai: ['gpt-4o-mini'], anthropic: ['claude-haiku-4-5'] };

  class ApiError extends Error { constructor(msg, status) { super(msg); this.status = status || 0; } }

  function cleanKey(raw) {
    const k = String(raw || '').replace(/[\s"'`]/g, '');
    if (k && !/^[\x21-\x7E]+$/.test(k)) throw new ApiError('API 키에 한글이나 특수문자가 섞여 있어요. 키를 다시 복사해서 붙여넣어 주세요.', 0);
    return k;
  }
  async function http(url, options = {}, timeoutMs = 15000) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    let resp;
    try { resp = await fetch(url, { ...options, signal: ctrl.signal }); }
    catch (e) {
      clearTimeout(timer);
      if (e.name === 'AbortError') throw new ApiError(`응답 시간이 초과되었어요 (${Math.round(timeoutMs / 1000)}초). 네트워크를 확인하세요.`, 0);
      throw new ApiError('서버에 연결하지 못했어요. 인터넷 연결, VPN, 광고차단 확장프로그램을 확인하고, 파일을 file:// 로 열었다면 웹 주소로 열어 보세요.', 0);
    }
    clearTimeout(timer);
    const text = await resp.text();
    let body = null; try { body = JSON.parse(text); } catch (e) {}
    if (!resp.ok) {
      let m = (body && ((body.error && body.error.message) || body.error || body.message)) || text.slice(0, 200) || resp.statusText;
      if (typeof m !== 'string') m = JSON.stringify(m);
      throw new ApiError(m, resp.status);
    }
    return body;
  }
  function authHeaders(p, key) {
    if (p === 'gemini') return { 'x-goog-api-key': key };
    if (p === 'anthropic') return { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' };
    return { 'Authorization': `Bearer ${key}` };
  }
  function friendlyError(p, e) {
    const name = PROVIDERS[p].label, s = e.status, raw = e.message || '';
    if (s === 401 || s === 403 || /API key not valid|invalid.*key|permission/i.test(raw)) {
      const extra = (p === 'xai' && /credit|billing|spending/i.test(raw)) ? '\nxAI는 크레딧(결제)이 있어야 호출돼요. console.x.ai 에서 확인하세요.' : '';
      return `${name} 키 인증에 실패했어요 (${s || '키 오류'}). 키를 다시 확인하세요.${extra}\n원문: ${raw}`;
    }
    if (s === 429) return `${name} 사용 한도를 넘었거나 요청이 너무 잦아요. 잠시 후 다시 시도하거나 결제/한도를 확인하세요.\n원문: ${raw}`;
    if (s === 404) return `${name} 모델을 찾지 못했어요. 설정에서 연결 테스트로 모델 목록을 다시 불러오세요.\n원문: ${raw}`;
    if (s === 400) return `${name} 요청 오류(400).\n원문: ${raw}`;
    if (s >= 500) return `${name} 서버 오류(${s}). 잠시 후 다시 시도하세요.`;
    return raw || `${name} 알 수 없는 오류`;
  }

  const verOf = id => (id.replace(/-\d{8}$/, '').replace(/-\d{4}-\d{2}-\d{2}$/, '').match(/\d+(?:\.\d+)?/g) || []).map(Number);
  function cmpVerDesc(a, b) {
    const A = verOf(a), B = verOf(b);
    for (let i = 0; i < Math.max(A.length, B.length); i++) { const d = (B[i] || 0) - (A[i] || 0); if (d) return d; }
    return 0;
  }
  function rankModels(p, ids) {
    let list = [...new Set(ids)], rank;
    if (p === 'gemini') {
      list = list.filter(id => /^gemini-/.test(id) && !/image|tts|embed|live|audio|robotics|computer|aqa|imagen|veo|native|learnlm/.test(id));
      rank = id => (/flash/.test(id) && !/lite/.test(id) ? 0 : /flash-lite/.test(id) ? 1 : 2) + (/preview|exp/.test(id) ? 0.5 : 0);
    } else if (p === 'xai') {
      list = list.filter(id => /^grok/.test(id) && !/image|imagine|video|vision/.test(id));
      rank = id => (/mini|fast/.test(id) ? 0 : 1);
    } else if (p === 'openai') {
      list = list.filter(id => /^gpt-/.test(id) && !/audio|realtime|image|tts|transcribe|search|instruct|embedding|moderation|codex|chat-latest|preview|-\d{4}-\d{2}-\d{2}$/.test(id));
      rank = id => (/mini|nano/.test(id) ? 0 : 1);
    } else {
      list = list.filter(id => /^claude-/.test(id));
      rank = id => (/haiku/.test(id) ? 0 : /sonnet/.test(id) ? 1 : 2);
    }
    return list.sort((a, b) => rank(a) - rank(b) || cmpVerDesc(a, b));
  }
  async function listModels(p, key) {
    let ids = [];
    if (p === 'gemini') {
      const body = await http('https://generativelanguage.googleapis.com/v1beta/models?pageSize=200', { headers: authHeaders(p, key) });
      ids = (body.models || []).filter(m => (m.supportedGenerationMethods || []).includes('generateContent')).map(m => String(m.name).replace(/^models\//, ''));
    } else if (p === 'xai') {
      ids = ((await http('https://api.x.ai/v1/models', { headers: authHeaders(p, key) })).data || []).map(m => m.id);
    } else if (p === 'openai') {
      ids = ((await http('https://api.openai.com/v1/models', { headers: authHeaders(p, key) })).data || []).map(m => m.id);
    } else {
      ids = ((await http('https://api.anthropic.com/v1/models?limit=100', { headers: authHeaders(p, key) })).data || []).map(m => m.id);
    }
    return rankModels(p, ids);
  }
  async function requestModel(p, key, model, prompt) {
    if (p === 'gemini') {
      const gurl = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
      const gsend = gc => http(gurl, { method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders(p, key) }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: gc }) });
      let body;
      try { body = await gsend({ temperature: 0.2, responseMimeType: 'application/json', thinkingConfig: { thinkingBudget: 0 } }); }
      catch (e) { if (e.status === 400) body = await gsend({ temperature: 0.2, responseMimeType: 'application/json' }); else throw e; }
      const parts = (body.candidates && body.candidates[0] && body.candidates[0].content && body.candidates[0].content.parts) || [];
      const text = parts.filter(x => !x.thought).map(x => x.text || '').join('');
      if (!text) throw new ApiError('빈 응답이 왔어요' + (body.promptFeedback && body.promptFeedback.blockReason ? ` (${body.promptFeedback.blockReason})` : ''), 0);
      return text;
    }
    if (p === 'xai' || p === 'openai') {
      const url = p === 'xai' ? 'https://api.x.ai/v1/chat/completions' : 'https://api.openai.com/v1/chat/completions';
      const base = { model, messages: [{ role: 'system', content: 'You are a dictionary API. Reply with a single JSON object only.' }, { role: 'user', content: prompt }] };
      const send = payload => http(url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders(p, key) }, body: JSON.stringify(payload) });
      let body;
      try { body = await send({ ...base, temperature: 0.2, response_format: { type: 'json_object' } }); }
      catch (e) { if (e.status === 400) body = await send(base); else throw e; }
      const text = (body.choices && body.choices[0] && body.choices[0].message && body.choices[0].message.content) || '';
      if (!text) throw new ApiError('빈 응답이 왔어요', 0);
      return text;
    }
    const body = await http('https://api.anthropic.com/v1/messages', {
      method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders(p, key) },
      body: JSON.stringify({ model, max_tokens: 1600, messages: [{ role: 'user', content: prompt }] })
    });
    const text = (body.content || []).map(c => c.text || '').join('');
    if (!text) throw new ApiError('빈 응답이 왔어요', 0);
    return text;
  }
  function parseJson(text) {
    if (!text) return null;
    let clean = String(text).replace(/```json/gi, '').replace(/```/g, '').trim();
    const a = clean.indexOf('{'), b = clean.lastIndexOf('}');
    if (a !== -1 && b > a) clean = clean.slice(a, b + 1);
    try { return JSON.parse(clean); } catch (e) { return null; }
  }
  function normalizeResult(r) {
    if (!r || typeof r !== 'object') return null;
    const syn = Array.isArray(r.synonyms) ? r.synonyms.join(', ') : r.synonyms;
    const ex = splitExample(r.example, r.exampleKo);
    const out = { meaning: str(r.meaning), phonetic: str(r.phonetic), koreanPron: str(r.koreanPron), example: ex.en, exampleKo: ex.ko, synonyms: str(syn) };
    return out.meaning ? out : null;
  }

  const ownKey = () => { try { return cleanKey(config.keys && config.keys[config.provider]); } catch (e) { return ''; } };
  const aiReady = () => !!ownKey() || !!(cloudMode && window.Cloud && Cloud.ai);
  /* task: 서버 AI가 프롬프트를 직접 만들 수 있게 보내는 정보 ({task:'word'|'batch'|'translate'|'ctx', ...})
     opt: { ms: 기다릴 시간, once: 실패해도 다시 보내지 않기(AI 사용 1회만) } */
  async function callAi(prompt, normalize, task, opt) {
    opt = opt || {};
    normalize = normalize || normalizeResult;
    const p = config.provider;
    const key = cleanKey(config.keys && config.keys[p]);
    const finish = text => normalize(parseJson(text));
    if (!key) {
      if (cloudMode && window.Cloud && Cloud.ai) {
        let last = null;
        const tries = opt.once ? 1 : 2;
        for (let a = 0; a < tries; a++) {
          try { const r = finish(await Cloud.ai(prompt, task, opt.ms)); if (r) return r; last = new ApiError('AI 응답을 해석하지 못했어요. 다시 시도해 주세요.', 0); }
          catch (e) { last = e; if (e.status && e.status < 500 && e.status !== 408) break; }
          if (a < tries - 1) await sleep(600);
        }
        throw new ApiError(last && last.message ? last.message : 'AI를 쓸 수 없어요.', last && last.status);
      }
      throw new ApiError(`AI를 쓰려면 로그인하거나 설정에서 ${PROVIDERS[p].label} API 키를 입력해 주세요.`, 401);
    }
    const deadline = Date.now() + (opt.ms || 30000);
    const tryModels = async models => {
      let lastErr = null;
      for (const model of models) {
        for (let a = 0; a < 2; a++) {
          if (Date.now() > deadline) return { err: lastErr || new ApiError('응답이 너무 늦어요. 잠시 후 다시 시도해 주세요.', 0) };
          try {
            const parsed = finish(await requestModel(p, key, model, prompt));
            if (!parsed) { lastErr = new ApiError('AI 응답을 해석하지 못했어요. 다시 시도해 주세요.', 0); continue; }
            if (config.models[p] !== model) { config.models[p] = model; syncStorage(); }
            return { ok: parsed };
          } catch (e) {
            lastErr = e;
            if ([401, 403].includes(e.status)) throw new ApiError(friendlyError(p, e), e.status);
            if (e.status === 429) { await sleep(1200 * (a + 1)); continue; }
            if (e.status === 404 || e.status === 400 || e.status === 0) break;
            await sleep(400);
          }
        }
      }
      return { err: lastErr };
    };
    const first = [];
    [config.models[p], ...(FALLBACK_MODELS[p] || [])].forEach(m => { if (m && !first.includes(m)) first.push(m); });
    let r = await tryModels(first.slice(0, 2));
    if (r.ok) return r.ok;
    if (!(config.modelLists[p] || []).length && Date.now() < deadline) {
      try {
        const list = await listModels(p, key); config.modelLists[p] = list; syncStorage();
        const more = list.filter(m => !first.slice(0, 2).includes(m)).slice(0, 2);
        if (more.length) { const r2 = await tryModels(more); if (r2.ok) return r2.ok; r = r2.err ? r2 : r; }
      } catch (e) { if ([401, 403].includes(e.status)) throw new ApiError(friendlyError(p, e), e.status); }
    }
    const err = r.err || new ApiError('알 수 없는 오류', 0);
    throw new ApiError(friendlyError(p, err), err.status);
  }

  /* ----- 단어 조회 캐시 · 내장 사전 · 묶음 조회 ----- */
  const AIC_KEY = 'vocapro_aic2'; let aiCache = null;
  const aicAll = () => aiCache || (aiCache = loadJson(AIC_KEY) || {});
  const aicGet = w => { const r = aicAll()[String(w).toLowerCase()]; return r ? { ...r } : null; };
  const aicSet = (w, r) => { const c = aicAll(); c[String(w).toLowerCase()] = r; const ks = Object.keys(c); if (ks.length > 600) delete c[ks[0]]; try { LS.setItem(AIC_KEY, JSON.stringify(c)); } catch (e) {} };
  // 내장 사전: dict/<첫 글자>.json 을 필요할 때만 불러와요. [단어, 뜻, 발음기호, 한글 발음, 예문, 예문 해석, 유의어]
  // 중국어 사전은 dict/zh/<0-f>.json (첫 글자 코드 % 16) 이고 뒤에 [예문 병음, HSK 급수] 가 더 붙어요.
  const DICT_KEYS = ['word', 'meaning', 'phonetic', 'koreanPron', 'example', 'exampleKo', 'synonyms', 'exPy', 'hsk', 'hsk3'];
  const dictShards = {};
  function dictShard(c) {
    if (!dictShards[c]) dictShards[c] = fetch(`dict/${c}.json`).then(r => r.ok ? r.json() : null).catch(() => null)
      .then(d => { if (!d) delete dictShards[c]; return d || {}; });
    return dictShards[c];
  }
  const dictLetter = w => { const s = String(w || '').trim(); if (isHanWord(s)) return 'zh/' + (s.codePointAt(0) % 16).toString(16); const c = s.charAt(0).toLowerCase(); return c >= 'a' && c <= 'z' ? c : ''; };
  // 중국어 단어 목록: [단어, 병음, 뜻, 옛 HSK 급수(1~6, 없으면 0), 신HSK 급수(1~7, 7은 7~9급, 없으면 0)]. 중국어로 바꿀 때 한 번만 받아요.
  const zhLv = e => e[3] || (e[4] ? 6 + e[4] / 10 : 9);
  const zhTag = (old, nw) => old ? `HSK ${old}급` : nw ? `신HSK ${+nw === 7 ? '7~9' : nw}급` : '';
  let zhIdx = null, zhIdxP = null, zhMap = null;
  function zhLoad() {
    if (!zhIdxP) zhIdxP = fetch('dict/zh/index.json').then(r => r.ok ? r.json() : null).catch(() => null).then(d => {
      if (!Array.isArray(d)) { zhIdxP = null; return []; }
      zhIdx = d; zhMap = new Map(d.map(e => [e[0], e])); dictMap = null; gwCache = {}; zhTok = null; zsLoad();
      if (isZh() && currentUser && curTab === 'tabHome' && !S.active) { try { renderHome(); } catch (e) {} }
      return d;
    });
    return zhIdxP;
  }
  // 중국어 말하기 문장 (난이도 하 · 중 · 상 · 최상): {1|2|3|4: [[단어, 단어 병음, 뜻, 문장, 문장 병음, 해석], ...]}
  let zsData = null, zsP = null;
  function zsLoad() {
    if (!zsP) zsP = fetch('dict/zh/speak.json').then(r => r.ok ? r.json() : null).catch(() => null).then(d => {
      if (!d || !Array.isArray(d[1])) { zsP = null; return null; }
      zsData = d; gwCache = {};
      if (isZh() && currentUser && curTab === 'tabHome' && !S.active) { try { renderHome(); } catch (e) {} }
      return d;
    });
    return zsP;
  }
  // 변화형: 사전에 "went": "go:VBD" 처럼 원형을 가리키는 항목이 있고, 규칙 변화(-s, -ed, -ing 등)는 원형을 찾아봐요.
  const FORM_NAMES = { VBD: '과거형', VBN: '과거분사', VBG: '-ing형', VBZ: '3인칭 단수형', NNS: '복수형', JJR: '비교급', JJS: '최상급', RBR: '비교급', RBS: '최상급' };
  function baseCandidates(w) {
    const c = [], add = x => { if (x && x.length > 1 && x !== w && !c.includes(x)) c.push(x); };
    const dbl = x => x.length > 2 && x[x.length - 1] === x[x.length - 2] ? x.slice(0, -1) : '';
    if (w.endsWith('ies')) add(w.slice(0, -3) + 'y');
    if (w.endsWith('es')) add(w.slice(0, -2));
    if (w.endsWith('s') && !w.endsWith('ss')) add(w.slice(0, -1));
    if (w.endsWith('ied')) add(w.slice(0, -3) + 'y');
    if (w.endsWith('ed')) { add(w.slice(0, -2)); add(w.slice(0, -1)); add(dbl(w.slice(0, -2))); }
    if (w.endsWith('ing')) { add(w.slice(0, -3)); add(w.slice(0, -3) + 'e'); add(dbl(w.slice(0, -3))); if (w.endsWith('ying')) add(w.slice(0, -4) + 'ie'); }
    if (w.endsWith('ier') || w.endsWith('iest')) add(w.replace(/i(er|est)$/, 'y'));
    if (w.endsWith('er')) { add(w.slice(0, -2)); add(w.slice(0, -1)); add(dbl(w.slice(0, -2))); }
    if (w.endsWith('est')) { add(w.slice(0, -3)); add(w.slice(0, -2)); add(dbl(w.slice(0, -3))); }
    return c;
  }
  async function dictRaw(w) { const c = dictLetter(w); return c ? (await dictShard(c))[w] : null; }
  const dictObj = a => { const o = {}; DICT_KEYS.forEach((k, i) => { o[k] = a[i] || ''; }); return o; };
  async function dictGet(word) {
    const w = String(word || '').trim().toLowerCase(); if (!dictLetter(w)) return null;
    let a = await dictRaw(w);
    if (typeof a === 'string') {
      const [base, tag] = a.split(':'), b = await dictRaw(base);
      if (Array.isArray(b)) { const o = dictObj(b); o.base = base; o.meaning = `${o.meaning} (${base}의 ${FORM_NAMES[tag] || '변화형'})`; o.phonetic = ''; o.koreanPron = ''; return o; }
      a = null;
    }
    if (Array.isArray(a)) return dictObj(a);
    if (w.includes(' ')) {
      const [h, ...rest] = w.split(' '), r = await dictRaw(h), heads = (typeof r === 'string' ? [r.split(':')[0]] : []).concat(baseCandidates(h));
      for (const b of heads) { const p = await dictRaw(b + ' ' + rest.join(' ')); if (Array.isArray(p)) { const o = dictObj(p); o.base = b + ' ' + rest.join(' '); return o; } }
      return null;
    }
    for (const base of baseCandidates(w)) {
      const b = await dictRaw(base);
      if (Array.isArray(b)) { const o = dictObj(b); o.base = base; o.phonetic = ''; o.koreanPron = ''; return o; }
    }
    return null;
  }
  async function dictPreload(words) { await Promise.all([...new Set(words.map(dictLetter).filter(Boolean))].map(dictShard)); }
  async function lookupWord(word, full) {
    const own = await dictGet(word); if (own) return own;
    const hit = aicGet(word); if (hit && (hit.example || !full)) return hit;
    const r = await callAi(buildPrompt(word, full), normalizeResult, { task: 'word', word, full: !!full, lang: aiLang(word) }); if (full) aicSet(word, r); return r;
  }
  const aiLang = w => isHanWord(w) ? 'zh' : undefined;
  const ZH_ENTRY = `"meaning":"핵심 한국어 뜻 (예: 공부하다, 배우다)","phonetic":"pinyin with tone marks, e.g. xuéxí","koreanPron":"한글 발음 (예: 쉬에시)","example":"short natural sentence in simplified Chinese that contains the word","exampleKo":"그 예문의 자연스러운 한국어 해석","synonyms":"中文近义词1, 近义词2 (없으면 빈칸)"`;
  const buildBatchPrompt = words => words.some(isHanWord) ? `You are a Chinese-Korean dictionary for Korean students. Define each Chinese word below (simplified Chinese).
Return ONLY one JSON object (no markdown): {"items":[{"word":"<same word as given>",${ZH_ENTRY}}]}
Keep the same order. WORDS: ${JSON.stringify(words)}` : `You are an English-Korean dictionary for Korean students. Define each English word or phrase below.
Return ONLY one JSON object (no markdown): {"items":[{"word":"<same word as given>","meaning":"핵심 한국어 뜻 (품사 포함, 예: 형 일관된)","phonetic":"/IPA/","koreanPron":"한글 발음","example":"short natural English sentence (under 12 words)","exampleKo":"그 예문의 자연스러운 한국어 해석","synonyms":"synonym1, synonym2"}]}
Keep the same order. WORDS: ${JSON.stringify(words)}`;
  function normalizeBatch(o) {
    if (!o || !Array.isArray(o.items)) return null;
    const m = {};
    o.items.forEach(it => { const n = normalizeResult(it); if (n && it && it.word) m[String(it.word).trim().toLowerCase()] = n; });
    return Object.keys(m).length ? m : null;
  }

  const buildPrompt = (word, full) => isHanWord(word) ? `You are a Chinese-Korean dictionary for Korean students. Define the Chinese word "${word}" (simplified Chinese).
Return ONLY one JSON object (no markdown, no commentary): {${ZH_ENTRY}}${full ? '' : '\nLeave "example", "exampleKo" and "synonyms" as empty strings.'}` : `You are an English-Korean dictionary for Korean students. Define the English word or phrase "${word}".
Return ONLY one JSON object (no markdown, no commentary) with exactly these keys:
{"meaning":"가장 핵심적인 한국어 뜻 (품사 포함, 예: 형 일관된)","phonetic":"/IPA/","koreanPron":"한글 발음 표기","example":${full ? '"short natural English sentence (under 12 words)"' : '""'},"exampleKo":${full ? '"그 예문의 자연스러운 한국어 해석"' : '""'},"synonyms":${full ? '"synonym1, synonym2, synonym3"' : '""'}}`;

  let formEditId = null, aiRun = 0;
  function aiState(html, kind) { const e = $('aiState'); if (!e) return; e.className = 'ai-state' + (html ? ' show ' + (kind || '') : ''); e.innerHTML = html || ''; }
  // 중국어: 단어 칸에 병음(xuexi, xué xí, xue2 xi2)을 쓰면 한자를 찾아 채워요. HSK 단어에서 먼저 찾고, 없으면 AI로.
  // 같은 병음 단어가 여럿이면(shi: 是 · 事 · 时 …) 골라요
  const PY_IN = /^[a-zA-Z\u00C0-\u024F\u0300-\u036F0-5'\s]+$/;
  const isPyInput = q => isZh() && !HAN.test(q) && PY_IN.test(q) && /[a-z]/i.test(q);
  const pyMarked = s => String(s || '').normalize('NFC').toLowerCase().replace(/[\s'0-5]/g, '');
  async function pyCands(q) {
    const idx = await zhLoad(), pq = pyPlain(q); if (!pq) return [];
    let hit = idx.filter(e => pyPlain(e[1]) === pq);
    // 성조 부호를 썼으면 성조까지 같은 단어를 먼저(있을 때만 좁혀요)
    if (/[\u00C0-\u024F\u0300-\u036F]/.test(q.normalize('NFD').replace(/[a-z]/gi, ''))) { const t = hit.filter(e => pyMarked(e[1]) === pyMarked(q)); if (t.length) hit = t; }
    return hit.sort((a, b) => zhLv(a) - zhLv(b) || a[0].length - b[0].length).slice(0, 8).map(e => [e[0], e[1], e[2]]);
  }
  const normPy = o => { const a = o && Array.isArray(o.items) ? o.items.filter(x => x && HAN.test(String(x.word || '')) && !/[^㐀-鿿豈-﫿]/.test(String(x.word).trim())).map(x => [String(x.word).trim().slice(0, 12), String(x.phonetic || '').slice(0, 60), String(x.meaning || '').slice(0, 80)]).slice(0, 6) : null; return a; };
  async function pyResolve(q) {
    const run = ++aiRun;
    aiState('<span class="dot"></span>병음으로 한자를 찾는 중', 'busy');
    let c = [];
    try { c = await pyCands(q); } catch (e) { c = []; }
    if (!c.length && aiReady()) {
      try { c = await callAi(`A Korean student typed Mandarin pinyin (tones may be missing): ${JSON.stringify(q)}. List up to 5 common Chinese words in simplified characters whose pinyin is exactly this syllable sequence, most common first. Return ONLY one JSON object: {"items":[{"word":"简体字","phonetic":"pinyin with tone marks","meaning":"핵심 한국어 뜻"}]}. If none, {"items":[]}.`, normPy, { task: 'pinyin', py: q, lang: 'zh' }, { once: true }) || []; }
      catch (e) { if (run === aiRun) aiState(`병음으로 단어를 찾지 못했어요. 한자로 써 주세요. <small>${esc(String(e.message || '').split('\n')[0])}</small>`, 'err'); return; }
    }
    if (run !== aiRun || !$('fieldWord') || $('fieldWord').value.trim() !== q) return;
    if (!c.length) return aiState(`'${esc(q)}'(으)로 읽는 단어를 찾지 못했어요. 병음을 확인하거나 한자로 써 주세요.`, 'err');
    if (c.length === 1) { $('fieldWord').value = c[0][0]; return executeFastAi(); }
    aiState(`<span>같은 병음 단어가 ${c.length}개예요. 골라 주세요</span><span class="py-picks">${c.map(e => `<button class="py-pick" data-act="py-pick" data-word="${esc(e[0])}"><b lang="zh-CN">${esc(e[0])}</b><i>${esc(e[1])}</i><small>${esc(e[2])}</small></button>`).join('')}</span>`, 'ok');
  }
  ACTIONS['py-pick'] = el => { const f = $('fieldWord'); if (!f) return; f.value = el.dataset.word; executeFastAi(); };
  async function executeFastAi() {
    const query = $('fieldWord').value.trim();
    if (!query) return toast('단어를 입력하세요.');
    if (isPyInput(query)) return pyResolve(query);
    const btn = $('btnRunAi'), run = ++aiRun, edit = !!formEditId;
    const set = (id, v, force) => { const f = $(id); if (f && v && (force || !f.value.trim())) f.value = v; };
    const local = builtinMeaning(query);
    if (local) set('fieldMeaning', local, !edit);
    btn.disabled = true; btn.textContent = '조회 중';
    const start = Date.now();
    const tick = () => { if (run === aiRun) aiState(`<span class="dot"></span>${local ? '기본 뜻을 먼저 채웠어요. 발음과 예문을 채우는 중' : 'AI가 채우는 중'} · ${((Date.now() - start) / 1000).toFixed(1)}초`, 'busy'); };
    tick(); const timer = setInterval(tick, 100);
    try {
      const fromDict = await dictGet(query);
      const r = fromDict || await lookupWord(query, true);
      if (run !== aiRun || !$('fieldMeaning')) return;
      if ($('fieldWord').value.trim() !== query) { clearInterval(timer); aiState(''); return; } // 단어를 바꿨으면 '채우는 중' 표시를 지워요
      const force = !edit;
      set('fieldMeaning', r.meaning, force || $('fieldMeaning').value === local); set('fieldPhonetic', r.phonetic, force); set('fieldKoreanPron', r.koreanPron, force);
      set('fieldExample', r.example, force); set('fieldExampleKo', r.exampleKo, force); set('fieldSynonyms', r.synonyms, force);
      clearInterval(timer);
      aiState(fromDict ? '내장 사전에서 바로 채웠어요' : `채웠어요 · ${((Date.now() - start) / 1000).toFixed(1)}초`, 'ok');
      playAudio(query);
    } catch (err) {
      clearInterval(timer);
      if (run !== aiRun) return;
      const msg = esc(String(err.message || '').split('\n')[0]);
      aiState(`${local ? '기본 뜻만 채웠어요. ' : ''}${msg || 'AI 응답을 받지 못했어요.'} <button class="link-btn" data-act="ai-fill">다시 시도</button>`, 'err');
    } finally { clearInterval(timer); if (run === aiRun && btn) { btn.disabled = false; btn.textContent = 'AI 완성'; } }
  }

  /* ----- 유의어 시트 ----- */
  let synData = null;
  async function inspectSynonym(word) {
    synData = null;
    openSheet(word, `<div id="synBox"><div class="q-meaning" style="font-size:1.2rem;">뜻을 찾는 중...</div></div>
      <div class="row" style="margin-top:16px;"><button class="btn btn-soft" data-act="speak" data-text="${esc(word)}">발음 듣기</button><button class="btn btn-primary" data-act="syn-add">단어장에 추가</button></div>`);
    playAudio(word);
    try {
      const local = builtinMeaning(word);
      const res = (await dictGet(word)) || (local ? { meaning: local, phonetic: '', koreanPron: '' } : await lookupWord(word, false));
      if ($('sheetTitle').textContent !== word || !$('synBox')) return;
      synData = { word, ...res };
      // 비슷한 단어끼리 이어서 볼 수 있게 칩으로 보여줘요
      const syns = String(res.synonyms || '').split(',').map(x => x.trim()).filter(x => x && x.toLowerCase() !== word.toLowerCase());
      $('synBox').innerHTML = `<div class="q-pron" style="margin-bottom:6px;">${esc(pronText(res))}</div><div class="q-meaning" style="font-size:1.4rem;">${esc(res.meaning)}</div>
        ${res.example ? `<div class="syn-ex"><div>${esc(res.example)}</div>${res.exampleKo ? `<small>${esc(res.exampleKo)}</small>` : ''}</div>` : ''}
        ${syns.length ? `<h4 class="syn-h">비슷한 단어</h4><div class="syn-chips">${syns.map(x => `<button class="syn" data-act="syn" data-word="${esc(x)}">${esc(x)}</button>`).join('')}</div>` : ''}`;
    } catch (e) {
      if ($('synBox')) $('synBox').innerHTML = `<div class="muted">뜻을 가져오지 못했어요.<br>${esc(e.message.split('\n')[0])}</div>`;
    }
  }
  ACTIONS['syn-add'] = () => {
    const cat = curCat();
    if (!synData || !cat) return toast('뜻을 불러온 뒤에 추가할 수 있어요.');
    if (cat.words.some(w => w.word.toLowerCase() === synData.word.toLowerCase())) return toast('이미 이 단어장에 있어요.');
    cat.words.unshift(sanitizeWord({ id: uid(), word: synData.word, meaning: synData.meaning, phonetic: synData.phonetic, koreanPron: synData.koreanPron, example: synData.example || '', exampleKo: synData.exampleKo || '', synonyms: synData.synonyms || '' }));
    syncStorage(); closeSheet(); renderBookDynamic(); toast(`'${synData.word}' 을(를) 추가했어요.`);
  };

