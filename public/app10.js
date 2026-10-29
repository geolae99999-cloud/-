  /* =========================================================
   * AI 연동 (모델 자동 조회)
   * ======================================================= */
  const PROVIDERS = {
    gemini:    { label: 'Google Gemini',    hint: 'AIza... 로 시작하는 키 (Google AI Studio에서 발급)' },
    xai:       { label: 'xAI Grok',         hint: 'xai-... 로 시작하는 키 (console.x.ai, 크레딧 충전 필요)' },
    openai:    { label: 'OpenAI ChatGPT',   hint: 'sk-... 로 시작하는 키' },
    anthropic: { label: 'Anthropic Claude', hint: 'sk-ant-... 로 시작하는 키' },
    local:     { label: '기기 AI (Qwen)',    hint: '' }
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
  const aiReady = () => (config.provider === 'local' && VLM.ok()) || !!ownKey() || !!(cloudMode && window.Cloud && Cloud.ai);
  /* ----- 기기 AI (Qwen2.5 0.5B, llm/vp-llm.js 워커) -----
     처음 한 번 모델(0.5~0.8GB)을 huggingface.co 에서 받아 브라우저 캐시에 두고, 그다음부터는 인터넷 없이도 돌아요.
     받은 적이 있는지는 LLM_OK 로 기억해요(받기 전에는 설정에서 직접 받게 해요). */
  const LLM_OK = 'vocapro_llm_ok';
  const VLM = (() => {
    let w = null, seq = 0, initP = null, ready = false, device = '';
    const wait = new Map(), subs = new Set();
    const ok = () => typeof Worker === 'function' && typeof WebAssembly === 'object' && 'caches' in window && typeof TextDecoder === 'function';
    function worker() {
      if (w) return w;
      w = new Worker('llm/vp-llm.js', { type: 'module' });
      w.onmessage = e => {
        const m = e.data || {};
        if (m.type === 'progress') subs.forEach(f => { try { f(m.p, m.mb); } catch (x) {} });
        else if (m.type === 'ready') { ready = true; device = m.device || ''; const x = wait.get('init'); if (x) { wait.delete('init'); x.ok(); } }
        else if (m.type === 'result' || m.type === 'error') {
          const k = m.id != null ? m.id : 'init', x = wait.get(k); if (!x) return; wait.delete(k);
          if (m.type === 'result') x.ok(m.text || ''); else x.no(new ApiError(vlmMsg(m.msg, m.load), 0));
        }
      };
      w.onerror = () => { const e = new ApiError('기기 AI를 시작하지 못했어요. 최신 Chrome · Edge · Safari에서 열어 주세요.', 0); wait.forEach(x => x.no(e)); wait.clear(); try { w.terminate(); } catch (x) {} w = null; initP = null; ready = false; };
      return w;
    }
    function init(onProg, pick) {
      if (onProg) subs.add(onProg);
      if (ready) return Promise.resolve();
      if (!ok()) return Promise.reject(new ApiError('이 브라우저에서는 기기 AI를 쓸 수 없어요. 최신 Chrome · Edge · Safari에서 열어 주세요.', 0));
      if (!initP) initP = new Promise((res, rej) => { wait.set('init', { ok: res, no: rej }); worker().postMessage({ cmd: 'init', ...(pick || {}) }); }).catch(e => { initP = null; throw e; });
      return initP;
    }
    async function gen(prompt, max, ms) {
      await init();
      return new Promise((res, rej) => {
        const id = ++seq; wait.set(id, { ok: res, no: rej });
        setTimeout(() => { const x = wait.get(id); if (x) { wait.delete(id); x.no(new ApiError('기기 AI 응답이 너무 늦어요. 한 번에 넣는 단어 수를 줄여 보세요.', 0)); } }, ms || 120000);
        worker().postMessage({ cmd: 'gen', id, prompt, max });
      });
    }
    return { ok, init, gen, off: f => subs.delete(f), isReady: () => ready, get device() { return device; } };
  })();
  function vlmMsg(raw, load) {
    raw = String(raw || '');
    if (/memory|OOM|allocation|Aborted/i.test(raw)) return '기기 메모리가 부족해 기기 AI를 돌리지 못했어요. 다른 앱 · 탭을 닫고 다시 시도해 주세요.';
    if (load) { try { console.warn('기기 AI 받기 실패:', raw); } catch (e) {} return '기기 AI 모델을 받지 못했어요. 인터넷 연결을 확인하고 다시 시도해 주세요.'; }
    return '기기 AI 오류: ' + raw.slice(0, 160);
  }
  // 작업마다 만들 글 길이(토큰). 묶음 · 문맥 작업은 길어요
  const VLM_MAX = { word: 384, batch: 1024, ctx: 1024, translate: 320, pinyin: 200 };
  // 처음 쓸 때 한 번 물어보고 받아요(동시에 여러 번 불려도 한 번만 물어요). 거절하거나 못 받으면 이번에는 서버 AI 로 해요
  let vlmGate = null, vlmNo = false;
  function vlmEnsure() {
    if (VLM.isReady()) return Promise.resolve(true);
    if (vlmNo || !VLM.ok()) return Promise.resolve(false);
    let flag = ''; try { flag = LS.getItem(LLM_OK) || ''; } catch (e) {}
    if (!vlmGate) vlmGate = (async () => {
      if (!flag && !await ask('사전에 없는 단어는 무료 오픈소스 AI(Qwen)가 이 기기에서 채워요.\n처음 한 번 모델(0.5~0.8GB)을 받아야 해요. 모바일 데이터라면 Wi-Fi를 권해요. 받을까요?', { ok: '받기' })) { vlmNo = true; return false; }
      let last = -10; const prog = pc => { if (pc >= last + 10) { last = pc; toast(`기기 AI 받는 중... ${pc}% (처음 한 번만)`); } };
      try { await VLM.init(prog); try { LS.setItem(LLM_OK, '1'); } catch (e) {} toast('기기 AI 준비 완료'); return true; }
      catch (e) { vlmNo = true; toast(e.message || '기기 AI를 받지 못했어요.'); return false; }
      finally { VLM.off(prog); vlmGate = null; }
    })();
    return vlmGate;
  }
  const cloudAiOk = () => !!(cloudMode && window.Cloud && Cloud.ai);
  async function localAi(prompt, normalize, task, opt) {
    if (!await vlmEnsure()) {
      // 기기 AI 를 못 쓰면 로그인한 사람은 서버 AI(Gemini)로 해요
      if (cloudAiOk()) return callAi(prompt, normalize, task, { ...(opt || {}), server: true });
      throw new ApiError(VLM.ok() ? '기기 AI를 받지 않아서 AI로 채울 수 없어요. 설정 > AI 기능에서 받을 수 있어요.' : '이 브라우저에서는 기기 AI를 쓸 수 없어요. 최신 Chrome · Edge · Safari에서 열거나, 로그인해서 서버 AI를 써 주세요.', 401);
    }
    const max = VLM_MAX[task && task.task] || 512;
    let last = null;
    for (let a = 0; a < 2; a++) {
      const text = await VLM.gen(prompt, max, 300000);
      const r = normalize(parseJson(text)); if (r) return r;
      last = new ApiError('기기 AI 답을 해석하지 못했어요. 다시 시도하거나 직접 입력해 주세요.', 0);
      if (opt && opt.once) break;
    }
    throw last;
  }
  /* task: 서버 AI가 프롬프트를 직접 만들 수 있게 보내는 정보 ({task:'word'|'batch'|'translate'|'ctx', ...})
     opt: { ms: 기다릴 시간, once: 실패해도 다시 보내지 않기(AI 사용 1회만) } */
  async function callAi(prompt, normalize, task, opt) {
    opt = opt || {};
    normalize = normalize || normalizeResult;
    const p = config.provider;
    if (p === 'local' && !opt.server) return localAi(prompt, normalize, task, opt);
    const key = p === 'local' ? '' : cleanKey(config.keys && config.keys[p]);
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
  // 영어 말하기 문장 (난이도 하 · 중 · 상 · 최상): {1|2|3|4: [[단어, 뜻, 문장, 해석], ...]}
  let esData = null, esP = null;
  function esLoad() {
    if (!esP) esP = fetch('dict/en-speak.json').then(r => r.ok ? r.json() : null).catch(() => null).then(d => {
      if (!d || !Array.isArray(d[1])) { esP = null; return null; }
      esData = d; gwCache = {};
      if (!isZh() && currentUser && curTab === 'tabHome' && !S.active) { try { renderHome(); } catch (e) {} }
      return d;
    });
    return esP;
  }
  const spkPackLoad = k => k.startsWith('es') ? esLoad() : zsLoad();
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
  // 숙어(cry out to)는 사전에 발음이 비어 있어요. 단어마다 사전 발음을 찾아 이어 붙여요: /kraɪ aʊt tu/ [크라이 아웃 투]
  // 한 단어라도 못 찾으면 만들지 않아요(엉뚱한 글자가 섞이지 않게).
  const PRON_EXTRA = { "one's": ['wʌnz', '원즈'], "someone's": ['ˈsʌmˌwʌnz', '썸원즈'], "somebody's": ['ˈsʌmbədiz', '썸바디즈'], sb: ['ˈsʌmbədi', '썸바디'], sth: ['ˈsʌmθɪŋ', '썸씽'], a: ['ə', '어'], an: ['ən', '언'] };
  async function composePron(word) {
    const raw = String(word || '').toLowerCase().replace(/[’‘]/g, "'");
    if (isHanWord(raw) || !/[a-z]/.test(raw)) return null;
    const toks = raw.replace(/[~…/()\[\]]/g, ' ').split(/\s+/).map(t => t.replace(/^[^a-z']+|[^a-z']+$/g, '')).filter(Boolean);
    if (!toks.length || toks.length > 8) return null;
    const ph = [], ko = [];
    for (const t of toks) {
      const x = PRON_EXTRA[t]; if (x) { ph.push(x[0]); ko.push(x[1]); continue; }
      let a = null; try { a = await dictRaw(t); } catch (e) {}
      if (!Array.isArray(a) || !a[2] || !a[3]) return null;
      ph.push(String(a[2]).replace(/^\/+|\/+$/g, '')); ko.push(String(a[3]));
    }
    return { phonetic: `/${ph.join(' ')}/`, koreanPron: ko.join(' ') };
  }
  async function withPron(o, word) {
    if (!o || (o.phonetic && o.koreanPron) || !/\s/.test(String(word).trim())) return o;
    const c = await composePron(word); if (c) { if (!o.phonetic) o.phonetic = c.phonetic; if (!o.koreanPron) o.koreanPron = c.koreanPron; }
    return o;
  }
  async function dictGet(word) { return withPron(await dictGetRaw(word), word); }
  async function dictGetRaw(word) {
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
  // 발음기호(IPA) -> 한글 발음 (원본: tools/ipa2ko.js, 사전 단어와 비교하면 86%가 같거나 한 글자 차이)
  function ipaToKo(ipa) {
    const L = { 'ㄱ': 0, 'ㄲ': 1, 'ㄴ': 2, 'ㄷ': 3, 'ㄸ': 4, 'ㄹ': 5, 'ㅁ': 6, 'ㅂ': 7, 'ㅃ': 8, 'ㅅ': 9, 'ㅆ': 10, 'ㅇ': 11, 'ㅈ': 12, 'ㅉ': 13, 'ㅊ': 14, 'ㅋ': 15, 'ㅌ': 16, 'ㅍ': 17, 'ㅎ': 18 };
    const VV = { 'ㅏ': 0, 'ㅐ': 1, 'ㅑ': 2, 'ㅒ': 3, 'ㅓ': 4, 'ㅔ': 5, 'ㅕ': 6, 'ㅖ': 7, 'ㅗ': 8, 'ㅘ': 9, 'ㅙ': 10, 'ㅚ': 11, 'ㅛ': 12, 'ㅜ': 13, 'ㅝ': 14, 'ㅞ': 15, 'ㅟ': 16, 'ㅠ': 17, 'ㅡ': 18, 'ㅢ': 19, 'ㅣ': 20 };
    const T = { '': 0, 'ㄱ': 1, 'ㄴ': 4, 'ㄹ': 8, 'ㅁ': 16, 'ㅂ': 17, 'ㅅ': 19, 'ㅇ': 21 };
    const syl = (l, v, t) => String.fromCharCode(0xAC00 + (L[l] * 21 + VV[v]) * 28 + T[t || '']);
    // 모음 소리(긴 것부터 맞춰요) -> 한글 모음 줄(두 글자면 두 음절)
    const VOW = [['aɪə', 'ㅏㅣㅓ'], ['aʊə', 'ㅏㅜㅓ'], ['eɪ', 'ㅔㅣ'], ['aɪ', 'ㅏㅣ'], ['aʊ', 'ㅏㅜ'], ['ɔɪ', 'ㅗㅣ'], ['oʊ', 'ㅗ'], ['əʊ', 'ㅗ'], ['ɪə', 'ㅣㅓ'], ['eə', 'ㅔㅓ'], ['ɛə', 'ㅔㅓ'], ['ʊə', 'ㅜㅓ'],
      ['iː', 'ㅣ'], ['uː', 'ㅜ'], ['ɑː', 'ㅏ'], ['ɔː', 'ㅗ'], ['ɜː', 'ㅓ'], ['i', 'ㅣ'], ['ɪ', 'ㅣ'], ['e', 'ㅔ'], ['ɛ', 'ㅔ'], ['æ', 'ㅐ'], ['ɑ', 'ㅏ'], ['a', 'ㅏ'], ['ɒ', 'ㅗ'], ['ɔ', 'ㅗ'], ['o', 'ㅗ'],
      ['ʊ', 'ㅜ'], ['u', 'ㅜ'], ['ʌ', 'ㅓ'], ['ə', 'ㅓ'], ['ɜ', 'ㅓ'], ['ɝ', 'ㅓ'], ['ɚ', 'ㅓ'], ['ɐ', 'ㅓ'], ['ᵻ', 'ㅣ'], ['ɨ', 'ㅣ'], ['y', 'ㅣ']];
    const CON = [['tʃ', 'ch'], ['dʒ', 'j'], ['ʧ', 'ch'], ['ʤ', 'j'], ['p', 'p'], ['b', 'b'], ['t', 't'], ['d', 'd'], ['k', 'k'], ['g', 'g'], ['ɡ', 'g'], ['f', 'f'], ['v', 'v'], ['θ', 'th'], ['ð', 'dh'], ['s', 's'], ['z', 'z'],
      ['ʃ', 'sh'], ['ʒ', 'zh'], ['h', 'h'], ['m', 'm'], ['n', 'n'], ['ŋ', 'ng'], ['l', 'l'], ['ɫ', 'l'], ['r', 'r'], ['ɹ', 'r'], ['ɾ', 'd'], ['w', 'w'], ['j', 'y'], ['x', 'h'], ['ʔ', '']];
    // 초성 자음
    const ON = { p: 'ㅍ', b: 'ㅂ', t: 'ㅌ', d: 'ㄷ', k: 'ㅋ', g: 'ㄱ', f: 'ㅍ', v: 'ㅂ', th: 'ㅅ', dh: 'ㄷ', s: 'ㅅ', z: 'ㅈ', sh: 'ㅅ', zh: 'ㅈ', ch: 'ㅊ', j: 'ㅈ', h: 'ㅎ', m: 'ㅁ', n: 'ㄴ', l: 'ㄹ', r: 'ㄹ', ng: 'ㅇ' };
    // 받침으로 못 쓰는 자음은 '으'를 붙인 음절로(브, 드, 스 ...). sh, ch, j, zh 는 '시, 치, 지, 지'
    const SOLO = { p: '프', b: '브', t: '트', d: '드', k: '크', g: '그', f: '프', v: '브', th: '스', dh: '드', s: '스', z: '즈', sh: '시', zh: '지', ch: '치', j: '지', h: '흐', r: '', l: '', m: '', n: '', ng: '' };
    const words = String(ipa || '').replace(/[\/\[\]ˈˌ'`.‿͡()]/g, '').replace(/ː/g, 'ː').toLowerCase().split(/[\s,]+/).filter(Boolean);
    const out = [];
    for (const w of words) {
      // 1) 소리 단위로 나누기
      const seg = []; let i = 0;
      while (i < w.length) {
        let hit = null;
        for (const [k, v] of VOW) if (w.startsWith(k, i)) { hit = { v, len: k.length }; break; }
        if (hit) { const src = w.substr(i, hit.len); i += hit.len; const long = w[i] === 'ː'; if (long) i++; seg.push({ v: hit.v, src, short: !long && /^([ɪɛæʌʊəɒ]|aʊ)$/.test(src) }); continue; }
        for (const [k, c] of CON) if (w.startsWith(k, i)) { hit = { c, len: k.length }; break; }
        if (hit) { if (hit.c) seg.push({ c: hit.c }); i += hit.len; continue; }
        i++; // 모르는 기호는 건너뛰어요
      }
      // 2) 모음 뒤 r(퍼서비어의 'r')은 소리 내지 않아요(모음 앞 r만 ㄹ)
      const s2 = [];
      seg.forEach((x, k) => {
        if (x.c === 'r' && k > 0 && seg[k - 1].v && !(seg[k + 1] && seg[k + 1].v)) {
          const pv = seg[k - 1];
          if (/^(ɪ|ɛ|e|ʊ|aɪ|aʊ|i|u)$/.test(pv.src) && !/ㅓ$/.test(pv.v)) s2[s2.length - 1] = { ...pv, v: pv.v + 'ㅓ', short: false };
          else s2[s2.length - 1] = { ...pv, short: false };
          return;
        }
        s2.push(x);
      });
      // 3) 음절 만들기
      let res = ''; let k = 0;
      const lastIdx = () => res.length - 1;
      const addCoda = t => { const ch = res.charCodeAt(lastIdx()) - 0xAC00; if (ch < 0 || ch % 28) return false; res = res.slice(0, -1) + String.fromCharCode(0xAC00 + ch + T[t]); return true; };
      const prevShort = k0 => k0 > 0 && s2[k0 - 1].v && s2[k0 - 1].short;
      const vowelSyl = (on, vs, glide) => {
        // vs: 한글 모음 줄. 첫 모음에 초성, 나머지는 'ㅇ'
        let v0 = vs[0];
        if (glide === 'w') v0 = { 'ㅏ': 'ㅘ', 'ㅐ': 'ㅙ', 'ㅓ': 'ㅝ', 'ㅔ': 'ㅞ', 'ㅣ': 'ㅟ', 'ㅗ': 'ㅝ', 'ㅜ': 'ㅜ' }[v0] || v0;
        if (glide === 'y') v0 = { 'ㅏ': 'ㅑ', 'ㅐ': 'ㅒ', 'ㅓ': 'ㅕ', 'ㅔ': 'ㅖ', 'ㅗ': 'ㅛ', 'ㅜ': 'ㅠ', 'ㅣ': 'ㅣ' }[v0] || v0;
        res += syl(on || 'ㅇ', v0);
        for (let q = 1; q < vs.length; q++) res += syl('ㅇ', vs[q]);
      };
      while (k < s2.length) {
        const x = s2[k], nx = s2[k + 1], nn = s2[k + 2];
        if (x.v) { vowelSyl('ㅇ', x.v); k++; continue; }
        const c = x.c;
        if (c === 'w' || c === 'y') {
          if (nx && nx.v) { vowelSyl('ㅇ', nx.v, c); k += 2; } else { res += c === 'w' ? '우' : '이'; k++; }
          continue;
        }
        // 자음 + (w|y) + 모음: 퀸(kwin), 과, 화, 큐(kju). 그 밖의 자음 + w 는 '스워'처럼 나눠요
        if (nx && (nx.c === 'y' || (nx.c === 'w' && ['k', 'g', 'h'].includes(c))) && nn && nn.v) {
          if (c === 'l' && res && addCoda('ㄹ')) {}
          vowelSyl(ON[c] || 'ㅇ', nn.v, nx.c); k += 3; continue;
        }
        // 자음 + l + 모음: 블러, 클래스, 플레이 (앞 음절에 ㄹ 받침)
        if (nx && nx.c === 'l' && nn && nn.v && (c === 'p' || c === 'k') && prevShort(k) && res && addCoda({ p: 'ㅂ', k: 'ㄱ' }[c])) { k++; continue; } // 블랙리스트
        if (nx && nx.c === 'l' && nn && nn.v && SOLO[c] && c !== 'sh' && c !== 'ch' && c !== 'j' && c !== 'zh') {
          res += SOLO[c]; addCoda('ㄹ'); vowelSyl('ㄹ', nn.v); k += 3; continue;
        }
        // 끝의 '자음 + ə + l/m/n': 애플, 리듬, 퍼슨 ('으' 모음)
        if (nx && nx.v && nx.src === 'ə' && nn && ['l', 'm', 'n'].includes(nn.c) && !s2[k + 3] && SOLO[c] && !['sh', 'ch', 'j', 'zh'].includes(c)) {
          res += SOLO[c]; addCoda({ l: 'ㄹ', m: 'ㅁ', n: 'ㄴ' }[nn.c]); k += 3; continue;
        }
        if (nx && nx.v) {
          // sh + 모음: 샤 · 셔 · 쇼 · 슈 · 시
          if (c === 'sh' || c === 'zh') { vowelSyl(c === 'sh' ? 'ㅅ' : 'ㅈ', nx.v, nx.v[0] === 'ㅣ' ? '' : 'y'); k += 2; continue; }
          // 모음 사이 l은 ㄹㄹ(컬러, 헬로)
          if (c === 'l' && res && k > 0 && s2[k - 1].v) addCoda('ㄹ');
          vowelSyl(ON[c] || 'ㅇ', nx.v); k += 2; continue;
        }
        // 받침 또는 '으' 음절
        const atEnd = !nx;
        if (res && (c === 'm' || c === 'n' || c === 'ng' || c === 'l') && addCoda({ m: 'ㅁ', n: 'ㄴ', ng: 'ㅇ', l: 'ㄹ' }[c])) { k++; continue; }
        if (res && (c === 'p' || c === 'k' || c === 't') && prevShort(k) && (atEnd || !['l', 'r', 'w', 'y'].includes(nx.c)) && addCoda({ p: 'ㅂ', k: 'ㄱ', t: 'ㅅ' }[c])) { k++; continue; }
        if (res && (c === 'b' || c === 'g') && (atEnd || !['l', 'r', 'w', 'y'].includes(nx.c)) && prevShort(k) && addCoda({ b: 'ㅂ', g: 'ㄱ' }[c])) { k++; continue; }
        if (c === 'l' || c === 'r') { res += c === 'l' ? '을' : '르'; k++; continue; }
        if (c === 'm' || c === 'n' || c === 'ng') { res += { m: '음', n: '은', ng: '응' }[c]; k++; continue; }
        res += SOLO[c] || ''; k++;
      }
      if (res) out.push(res);
    }
    return out.join(' ');
  }
  const koLen = t => String(t || '').replace(/[^가-힣]/g, '').length;
  // AI가 준 발음을 다듬어요: 한글 발음에 섞인 영어 · 기호를 빼고, 숙어는 단어 수와 한글 덩어리 수가 다르면(크라이 아웃 투 섹) 사전 발음으로 바꿔요.
  async function polish(word, r) {
    if (!r || isHanWord(word)) return r;
    const o = { ...r };
    let ph = str(o.phonetic).replace(/[\[\]]/g, '').trim();
    if (/[가-힣]/.test(ph)) ph = '';
    if (ph && !/^\/.*\/$/.test(ph)) ph = '/' + ph.replace(/^\/+|\/+$/g, '') + '/';
    o.phonetic = ph;
    let ko = str(o.koreanPron).replace(/[\[\]()（）]/g, ' ').replace(/[^가-힣\s-]/g, ' ').replace(/\s+/g, ' ').trim();
    const toks = String(word).trim().split(/\s+/).filter(Boolean);
    if (toks.length > 1) {
      const c = await composePron(word);
      if (c) { o.koreanPron = c.koreanPron; if (!o.phonetic || o.phonetic.split(/\s+/).length !== toks.length) o.phonetic = c.phonetic; return o; }
      if (ko && ko.split(' ').length > toks.length) ko = ko.split(' ').slice(0, toks.length).join(' ');
    }
    // 한글 발음이 없거나, 발음기호로 만든 것과 길이가 크게 다르면(없는 소리가 붙음) 발음기호에서 만들어요
    if (o.phonetic) {
      const made = ipaToKo(o.phonetic), a = koLen(ko), b = koLen(made), groups = t => String(t).split(' ').filter(Boolean).length;
      if (made && (!a || Math.abs(a - b) > Math.max(2, Math.round(b * .4)) || groups(ko) > groups(made))) ko = made;
    }
    o.koreanPron = ko;
    return o;
  }
  // 발음기호가 비면 AI에게 발음만 한 번 더 물어요(여러 단어를 한 번에)
  const buildPronPrompt = words => `Give the American English pronunciation of each word or phrase below for Korean students.
Return ONLY one JSON object (no markdown): {"items":[{"word":"<same word as given>","phonetic":"/IPA/","koreanPron":"한글 발음 (예: 퍼서비어)"}]}
Use standard IPA between slashes. Keep the same order. WORDS: ${JSON.stringify(words)}`;
  async function pronFill(entries) {
    // entries: [{ word, r }] 중 발음기호가 빈 것만 채워요(사전으로 먼저, 그다음 AI)
    const need = [];
    for (const e of entries) {
      if (!e.r || e.r.phonetic || isHanWord(e.word)) continue;
      const c = /\s/.test(e.word.trim()) ? await composePron(e.word) : null;
      if (c) { e.r.phonetic = c.phonetic; if (!e.r.koreanPron) e.r.koreanPron = c.koreanPron; } else need.push(e);
    }
    if (!need.length || !aiReady()) return;
    for (let i = 0; i < need.length; i += 8) { // 서버는 한 번에 8개까지
      const ch = need.slice(i, i + 8);
      try {
        const m = await callAi(buildPronPrompt(ch.map(e => e.word)), o => o && Array.isArray(o.items) ? o.items : null, { task: 'batch', words: ch.map(e => e.word), lang: undefined }, { once: true });
        for (const e of ch) {
          const it = (m || []).find(x => x && String(x.word || '').trim().toLowerCase() === e.word.trim().toLowerCase());
          if (!it) continue;
          const p2 = await polish(e.word, { phonetic: str(it.phonetic), koreanPron: str(it.koreanPron) });
          if (p2.phonetic) e.r.phonetic = p2.phonetic;
          if (p2.koreanPron) e.r.koreanPron = p2.koreanPron;
        }
      } catch (err) {}
    }
  }
  async function aiWord(word, full) {
    const hit = aicGet(word);
    if (hit && (hit.example || !full)) { const h = await polish(word, hit); if (!h.phonetic && !isHanWord(word)) { await pronFill([{ word, r: h }]); if (h.phonetic) aicSet(word, h); } return h; }
    const r = await polish(word, await callAi(buildPrompt(word, full), normalizeResult, { task: 'word', word, full: !!full, lang: aiLang(word) }));
    if (!r.phonetic || !r.koreanPron) await pronFill([{ word, r }]);
    if (full) aicSet(word, r); return r;
  }
  // 사전에 있어도 발음 · 예문이 비어 있으면(변화형, 일부 숙어) AI로 빈칸만 채워요
  async function lookupWord(word, full) {
    const own = await dictGet(word);
    if (own && (!full || (own.phonetic && own.koreanPron && own.example) || !aiReady())) return own;
    let ai;
    try { ai = await aiWord(word, full); } catch (e) { if (own) return own; throw e; }
    if (!own) return ai;
    const o = { ...own }; ['phonetic', 'koreanPron', 'example', 'exampleKo', 'synonyms'].forEach(k => { if (!o[k] && ai && ai[k]) o[k] = ai[k]; });
    return o;
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
      let r = await dictGet(query), fromDict = !!r;
      if (!r || (aiReady() && (!r.phonetic || !r.koreanPron || !r.example))) { const r2 = await lookupWord(query, true); if (r2 !== r) fromDict = false; r = r2; }
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
    const nw = sanitizeWord({ id: uid(), word: synData.word, meaning: synData.meaning, phonetic: synData.phonetic, koreanPron: synData.koreanPron, example: synData.example || '', exampleKo: synData.exampleKo || '', synonyms: synData.synonyms || '' });
    cat.words.unshift(nw);
    syncStorage(); autoFill([nw]); closeSheet(); renderBookDynamic(); toast(`'${synData.word}' 을(를) 추가했어요.`);
  };

