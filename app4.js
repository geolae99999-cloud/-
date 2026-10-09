
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
  async function http(url, options = {}, timeoutMs = 30000) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    let resp;
    try { resp = await fetch(url, { ...options, signal: ctrl.signal }); }
    catch (e) {
      clearTimeout(timer);
      if (e.name === 'AbortError') throw new ApiError('응답 시간이 초과되었어요 (30초). 네트워크를 확인하세요.', 0);
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
      const body = await http(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders(p, key) },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.2, responseMimeType: 'application/json' } })
      });
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
    const out = { meaning: str(r.meaning), phonetic: str(r.phonetic), koreanPron: str(r.koreanPron), example: str(r.example), synonyms: str(syn) };
    return out.meaning ? out : null;
  }

  async function callAi(prompt, normalize) {
    normalize = normalize || normalizeResult;
    const p = config.provider;
    let key;
    key = cleanKey(config.keys[p]);
    if (!key) throw new ApiError(`설정에서 ${PROVIDERS[p].label} API 키를 입력해 주세요.`, 401);

    let list = config.modelLists[p] || [];
    if (!list.length) {
      try { list = await listModels(p, key); config.modelLists[p] = list; syncStorage(); }
      catch (e) {
        if ([401, 403].includes(e.status)) throw new ApiError(friendlyError(p, e), e.status);
        list = FALLBACK_MODELS[p];
      }
    }
    const candidates = [];
    if (config.models[p]) candidates.push(config.models[p]);
    list.forEach(m => { if (!candidates.includes(m)) candidates.push(m); });

    let lastErr = null;
    for (const model of candidates.slice(0, 4)) {
      try {
        const text = await requestModel(p, key, model, prompt);
        const parsed = normalize(parseJson(text));
        if (!parsed) { lastErr = new ApiError('AI 응답을 해석하지 못했어요. 다시 시도해 주세요.', 0); continue; }
        if (config.models[p] !== model) { config.models[p] = model; syncStorage(); }
        return parsed;
      } catch (e) {
        lastErr = e;
        if ([401, 403, 429].includes(e.status)) break;
      }
    }
    const err = lastErr || new ApiError('알 수 없는 오류', 0);
    throw new ApiError(friendlyError(p, err), err.status);
  }

  const buildPrompt = (word, full) => `You are an English-Korean dictionary. Define the English word or phrase "${word}".
Return ONLY one JSON object (no markdown, no commentary) with exactly these keys:
{"meaning":"가장 핵심적인 한국어 뜻 (품사 포함, 예: 형 일관된)","phonetic":"/IPA 발음기호/","koreanPron":"한글 발음 표기","example":${full ? '"자연스러운 영어 예문 (한국어 해석)"' : '""'},"synonyms":${full ? '"유의어1, 유의어2, 유의어3"' : '""'}}`;

  async function executeFastAi() {
    const query = $('fieldWord').value.trim();
    if (!query) return toast('단어를 입력하세요.');
    const btn = $('btnRunAi');
    btn.disabled = true; btn.textContent = '조회 중';
    const badge = $('aiTimerBadge'); badge.style.display = 'block';
    const start = Date.now();
    const timer = setInterval(() => { const tc = $('aiTimerCount'); if (tc) tc.textContent = ((Date.now() - start) / 1000).toFixed(1) + '초'; }, 100);
    try {
      const r = await callAi(buildPrompt(query, true));
      if (!$('fieldMeaning') || $('fieldWord').value.trim() !== query) return;
      $('fieldMeaning').value = r.meaning; $('fieldPhonetic').value = r.phonetic;
      $('fieldKoreanPron').value = r.koreanPron; $('fieldExample').value = r.example; $('fieldSynonyms').value = r.synonyms;
      playAudio(query);
    } catch (err) { say('조회 실패\n\n' + err.message); }
    finally { clearInterval(timer); btn.disabled = false; btn.textContent = 'AI 완성'; }
  }

  /* ----- 유의어 시트 ----- */
  let synData = null;
  async function inspectSynonym(word) {
    synData = null;
    openSheet(word, `<div id="synBox"><div class="q-meaning" style="font-size:1.2rem;">뜻을 찾는 중...</div></div>
      <div class="row" style="margin-top:16px;"><button class="btn btn-soft" data-act="speak" data-text="${esc(word)}">발음 듣기</button><button class="btn btn-primary" data-act="syn-add">단어장에 추가</button></div>`);
    playAudio(word);
    try {
      const res = await callAi(buildPrompt(word, false));
      if ($('sheetTitle').textContent !== word || !$('synBox')) return;
      synData = { word, ...res };
      $('synBox').innerHTML = `<div class="q-pron" style="margin-bottom:6px;">${esc(pronText(res))}</div><div class="q-meaning" style="font-size:1.4rem;">${esc(res.meaning)}</div>`;
    } catch (e) {
      if ($('synBox')) $('synBox').innerHTML = `<div class="muted">뜻을 가져오지 못했어요.<br>${esc(e.message.split('\n')[0])}</div>`;
    }
  }
  ACTIONS['syn-add'] = () => {
    const cat = curCat();
    if (!synData || !cat) return toast('뜻을 불러온 뒤에 추가할 수 있어요.');
    if (cat.words.some(w => w.word.toLowerCase() === synData.word.toLowerCase())) return toast('이미 이 단어장에 있어요.');
    cat.words.unshift(sanitizeWord({ id: uid(), word: synData.word, meaning: synData.meaning, phonetic: synData.phonetic, koreanPron: synData.koreanPron }));
    syncStorage(); closeSheet(); renderBookDynamic(); toast(`'${synData.word}' 을(를) 추가했어요.`);
  };

  /* =========================================================
   * 설정
   * ======================================================= */
  function setStatus(type, msg) { const el = $('cfgStatus'); el.className = 'cfg-status ' + type; el.textContent = msg; }
  function renderModelSelect() {
    const p = $('cfgProvider').value;
    const list = config.modelLists[p] || [], selected = config.models[p] || '';
    const all = selected && !list.includes(selected) ? [selected, ...list] : list;
    $('cfgModel').innerHTML = '<option value="">자동 선택 (권장)</option>' + all.map(m => `<option value="${esc(m)}">${esc(m)}</option>`).join('');
    $('cfgModel').value = selected;
  }
  function loadSettingsUI() {
    const an = $('acctName'); if (an) an.textContent = '현재 계정: ' + (currentLabel || currentUser || '');
    $('cfgProvider').value = config.provider;
    $('cfgTtsRate').value = String(config.ttsRate);
    $('cfgGoal').value = String(config.goal);
    onProviderChange(config.provider, true);
    $('cfgStatus').className = 'cfg-status';
  }
  function onProviderChange(p, silent) {
    if (!silent) config.provider = p;
    $('cfgKeyLabel').textContent = `${PROVIDERS[p].label} API Key`;
    $('cfgKey').placeholder = PROVIDERS[p].hint;
    $('cfgKey').value = config.keys[p] || '';
    renderModelSelect();
    if (!silent) { $('cfgStatus').className = 'cfg-status'; syncStorage(); }
  }
  $('cfgModel').addEventListener('change', e => { config.models[$('cfgProvider').value] = e.target.value; syncStorage(); });

  async function testConnection() {
    const p = $('cfgProvider').value, btn = $('btnTestConn');
    config.provider = p;
    try {
      const key = cleanKey($('cfgKey').value);
      if (!key) return setStatus('err', 'API 키를 입력해 주세요.');
      config.keys[p] = key; $('cfgKey').value = key; syncStorage();
      btn.disabled = true;
      setStatus('info', '모델 목록을 불러오는 중...');
      let list;
      try { list = await listModels(p, key); }
      catch (e) { if ([401, 403].includes(e.status) || e.status === 0) throw e; list = []; }
      const usedFallback = !list.length;
      if (usedFallback) list = FALLBACK_MODELS[p];
      config.modelLists[p] = list;
      if (config.models[p] && !list.includes(config.models[p]) && !usedFallback) config.models[p] = '';
      syncStorage(); renderModelSelect();

      setStatus('info', `모델 ${list.length}개를 확인했어요. 실제 호출을 테스트하는 중...`);
      const tried = [];
      const order = [config.models[p], ...list].filter(Boolean).filter((m, i, a) => a.indexOf(m) === i).slice(0, 4);
      for (const model of order) {
        try {
          await requestModel(p, key, model, buildPrompt('test', false));
          config.models[p] = model; syncStorage(); renderModelSelect();
          setStatus('ok', `연결에 성공했어요.\n사용 모델: ${model}\n사용 가능한 모델 ${list.length}개를 위 목록에 불러왔어요.`);
          return;
        } catch (e) {
          tried.push(`• ${model}: ${e.message.slice(0, 120)}`);
          if ([401, 403, 429].includes(e.status)) throw e;
        }
      }
      throw new ApiError('시도한 모델이 모두 실패했어요.\n' + tried.join('\n'), 400);
    } catch (e) {
      setStatus('err', friendlyError(p, e instanceof ApiError ? e : new ApiError(e.message, 0)));
    } finally { btn.disabled = false; }
  }

  /* ----- 백업 ----- */
  ACTIONS['export-json'] = () => {
    const data = { app: 'VocaPro', version: 11, settings: { ttsRate: config.ttsRate, darkMode: config.darkMode, goal: config.goal }, categories, stats };
    download(`VocaPro_${dayKey()}.json`, JSON.stringify(data, null, 2), 'application/json');
    toast('백업 파일을 내려받았어요. API 키는 포함되지 않아요.');
  };
  ACTIONS['import-json'] = () => $('importFile').click();
  function importBackup(e) {
    const f = e.target.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = async ev => {
      try {
        const res = JSON.parse(ev.target.result);
        const cats = sanitizeCategories(res.categories);
        if (!cats) throw new Error('형식 오류');
        if (!await ask(`현재 데이터를 지우고 단어장 ${cats.length}개를 복원할까요?`, { ok: '복원', danger: true })) { e.target.value = ''; return; }
        categories = cats;
        if (res.stats) stats = sanitizeStats(res.stats);
        if (res.settings) {
          if (res.settings.ttsRate) config.ttsRate = parseFloat(res.settings.ttsRate) || config.ttsRate;
          if (res.settings.goal) config.goal = parseInt(res.settings.goal, 10) || config.goal;
          if (typeof res.settings.darkMode === 'boolean') config.darkMode = res.settings.darkMode;
        }
        currentCategoryId = null; viewOrder = null; openDrawers.clear();
        applyTheme(); syncStorage(); loadSettingsUI(); toast('복원했어요.');
      } catch (err) { say('올바른 VocaPro 백업 파일이 아니에요.'); }
      e.target.value = '';
    };
    r.readAsText(f);
  }
  ACTIONS['reset-all'] = async () => {
    if (!await ask('모든 단어장, 단어, 학습 기록이 사라져요. 계속할까요?', { ok: '계속', danger: true })) return;
    if (!await ask('정말 지울까요? 되돌릴 수 없어요.', { ok: '지우기', danger: true })) return;
    categories = defaultCats(); stats = { days: {} };
    syncStorage(); toast('초기화했어요.');
  };

