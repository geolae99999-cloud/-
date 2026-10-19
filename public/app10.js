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
    if (!$('creditFoot')) $('tabSettings').insertAdjacentHTML('beforeend', '<div class="foot-credit" id="creditFoot">VocaPro · 개발자 김주원<br><span class="my-ip" hidden></span></div>');
    showMyIp();
    rmUI();
    if (!$('lgLinks') && $('creditFoot')) $('creditFoot').insertAdjacentHTML('beforebegin', legalLinksHtml().replace('class="legal-links"', 'class="legal-links" id="lgLinks"'));
    if (!$('btnLt')) { const g = $('cfgGoal'); if (g && g.parentNode) g.insertAdjacentHTML('afterend', '<button class="btn btn-soft btn-block" id="btnLt" data-act="level-test" style="margin-top:8px;">레벨 테스트로 목표 추천받기</button>'); }
    const bp = $('btnPw'); if (bp) bp.style.display = cloudMode ? '' : 'none';
    const bw = $('btnWipe'); if (bw) bw.style.display = cloudMode ? '' : 'none';
    const an = $('acctName'); if (an) an.textContent = '현재 계정: ' + (currentLabel || currentUser || '');
    { const p = config.profile || cleanProfile(); $('pfName').value = p.name; $('pfSchool').value = p.school; $('pfSno').value = p.sno; $('pfSno').style.display = isTeacher() ? 'none' : ''; }
    document.querySelectorAll('#cfgLang button').forEach(b => b.classList.toggle('on', b.dataset.l === LANG));
    $('cfgProvider').value = config.provider;
    ttsUI();
    $('cfgGoal').value = String(config.goal);
    $('cfgHaptic').checked = config.haptic !== false;
    if (!('vibrate' in navigator)) $('hapticSub').textContent = '이 기기(브라우저)는 진동을 지원하지 않아서 켜 둬도 울리지 않아요.';
    if ($('cfgKpron')) $('cfgKpron').checked = kpronOn();
    if ($('kpronSub')) $('kpronSub').textContent = isZh() ? '단어 옆에 [쉐쉐]처럼 한글로 발음을 보여 줘요 (중국어)' : '단어 옆에 [클라이머]처럼 한글로 발음을 보여 줘요 (영어)';
    $('cfgGrade').innerHTML = `<option value="">선택 안 함</option>${roleOptions(isTeacher() ? 'teacher' : config.grade)}`;
    onProviderChange(config.provider, true);
    $('cfgStatus').className = 'cfg-status';
  }
  function onProviderChange(p, silent) {
    if (!silent) config.provider = p;
    const loc = p === 'local';
    $('cfgKeyRow').style.display = loc ? 'none' : ''; $('cfgModelRow').style.display = loc ? 'none' : ''; $('cfgLocalNote').style.display = loc ? '' : 'none';
    $('btnTestConn').textContent = loc ? (VLM.isReady() ? '기기 AI 테스트' : '기기 AI 받기 · 테스트') : '키 저장하고 연결 테스트';
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
    if (p === 'local') return localTest(btn);
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

  async function localTest(btn) {
    syncStorage();
    if (!VLM.ok()) return setStatus('err', '이 브라우저에서는 기기 AI를 쓸 수 없어요. 최신 Chrome · Edge · Safari에서 열어 주세요.');
    let flag = ''; try { flag = LS.getItem(LLM_OK) || ''; } catch (e) {}
    if (!VLM.isReady() && !flag && !await ask('기기 AI 모델(0.5~0.8GB)을 이 기기에 받아요. 처음 한 번만 받고, 그다음부터는 바로 써요.\n모바일 데이터라면 Wi-Fi에서 받는 걸 권해요. 받을까요?', { ok: '받기' })) return;
    btn.disabled = true;
    const prog = (pc, mb) => setStatus('info', `기기 AI 받는 중... ${pc}%${mb ? ` (${mb}MB)` : ''}\n받는 동안 이 화면을 열어 두세요.`);
    try {
      setStatus('info', VLM.isReady() ? '기기 AI 테스트 중...' : '기기 AI 준비 중...');
      await VLM.init(prog);
      try { LS.setItem(LLM_OK, '1'); } catch (e) {}
      setStatus('info', '기기 AI가 단어 뜻을 만드는 중...');
      const t0 = Date.now(), r = await localAi(buildPrompt('apple', false), normalizeResult, { task: 'word' }, {});
      setStatus('ok', `기기 AI를 쓸 수 있어요. (${VLM.device === 'webgpu' ? '그래픽 가속' : 'CPU'}, ${((Date.now() - t0) / 1000).toFixed(1)}초)\n시험: apple → ${r.meaning}\n이제 AI 버튼을 누르면 이 기기에서 바로 만들어요.`);
    } catch (e) { setStatus('err', e.message || '기기 AI를 시작하지 못했어요.'); }
    finally { VLM.off(prog); btn.disabled = false; onProviderChange('local', true); }
  }

  /* ----- 백업 ----- */
  ACTIONS['export-json'] = () => {
    const data = { app: 'VocaPro', version: 14, settings: { ...ttsCfgOut(), darkMode: config.darkMode, goal: config.goal, grade: config.grade, haptic: config.haptic !== false, kpronEn: config.kpronEn !== false, kpronZh: config.kpronZh !== false, studyCount: config.studyCount, guide: cleanGuide(config.guide) }, ...dataBlob() };
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
        const zc = res.zh && sanitizeCategories(res.zh.categories);
        if (!await ask(`현재 데이터를 지우고 단어장 ${cats.length + (zc ? zc.length : 0)}개를 복원할까요?`, { ok: '복원', danger: true })) { e.target.value = ''; return; }
        // 중국어가 들어 있는 백업은 두 언어를 모두, 예전 백업은 영어 쪽만 바꿔요.
        const now = dataBlob();
        useBlob({ categories: cats, stats: res.stats || now.stats, zh: res.zh || now.zh });
        if (res.settings) {
          if (res.settings.ttsRate) config.ttsRate = parseFloat(res.settings.ttsRate) || config.ttsRate;
          ttsCfgIn(config, res.settings);
          if (res.settings.goal) config.goal = parseInt(res.settings.goal, 10) || config.goal;
          if (typeof res.settings.darkMode === 'boolean') config.darkMode = res.settings.darkMode;
          if (typeof res.settings.haptic === 'boolean') config.haptic = res.settings.haptic;
          if (typeof res.settings.kpronEn === 'boolean') config.kpronEn = res.settings.kpronEn;
          if (typeof res.settings.kpronZh === 'boolean') config.kpronZh = res.settings.kpronZh;
          if (Number.isFinite(+res.settings.studyCount)) config.studyCount = Math.max(0, Math.min(500, Math.floor(+res.settings.studyCount)));
          if (res.settings.guide && typeof res.settings.guide === 'object') config.guide = cleanGuide(res.settings.guide);
          if (GRADE_NAMES[res.settings.grade]) config.grade = res.settings.grade;
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
    categories = defaultCats(); stats = { days: {} }; altSet = emptySet();
    syncStorage(); toast('초기화했어요.');
  };


  /* =========================================================
   * 번역
   * ======================================================= */
  const HANGUL = /[\u3131-\u318e\uac00-\ud7a3]/, WORDRE = /^[A-Za-z][A-Za-z' -]{0,38}$/;
  let trBusy = false, trLast = null;
  function closeTranslator() { const o = $('trOv'); if (o) o.remove(); }
  function openTranslator(prefill) {
    if ($('trOv')) return;
    const ov = document.createElement('div'); ov.className = 'tr-ov'; ov.id = 'trOv';
    ov.innerHTML = `<div class="tr-sheet" role="dialog" aria-modal="true" aria-label="번역"><div class="tr-grab"></div>
      <div class="tr-head"><b>번역</b><span id="trDir" class="tr-dir">자동 감지</span><button class="tr-x" data-act="tr-close" aria-label="닫기">${IC.x}</button></div>
      <textarea id="trIn" rows="4" maxlength="1000" placeholder="${LN()} 또는 한국어 문장을 입력하세요" spellcheck="false"></textarea>
      <div class="tr-actions"><button class="btn btn-soft" data-act="tr-clear">지우기</button><button class="btn btn-primary" id="trGo" data-act="tr-go" style="flex:1">번역하기</button></div>
      <div id="trOut" class="tr-out" style="display:none"></div></div>`;
    document.body.appendChild(ov);
    const inp = $('trIn');
    const dir = () => { $('trDir').textContent = inp.value.trim() ? (HANGUL.test(inp.value) ? (isZh() ? '한국어 → 中文' : '한국어 → English') : (HAN.test(inp.value) ? '中文 → 한국어' : 'English → 한국어')) : '자동 감지'; };
    ov.addEventListener('click', e => { if (e.target === ov) closeTranslator(); });
    inp.addEventListener('input', dir);
    inp.addEventListener('keydown', e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); ACTIONS['tr-go'](); } });
    if (prefill) { inp.value = prefill; dir(); }
    setTimeout(() => inp.focus(), 80);
  }
  // toKo: 외국어 → 한국어. 외국어는 글자를 보고(한자면 중국어), 한국어 → 외국어는 지금 학습 언어로 옮겨요.
  // 순서: Google 번역(빠르고 정확, 단어면 다른 뜻까지) → AI → MyMemory
  const POS_KO = { noun: '명사', verb: '동사', adjective: '형용사', adverb: '부사', preposition: '전치사', pronoun: '대명사', conjunction: '접속사', interjection: '감탄사', abbreviation: '약어', phrase: '구', article: '관사', prefix: '접두사', suffix: '접미사', particle: '조사' };
  async function gtxTranslate(text, from, to) {
    const G = { en: 'en', ko: 'ko', zh: 'zh-CN' }, ctl = new AbortController(), tm = setTimeout(() => ctl.abort(), 10000);
    try {
      const res = await fetch('https://translate.googleapis.com/translate_a/single?client=gtx&hl=ko&sl=' + G[from] + '&tl=' + G[to] + '&dt=t&dt=bd&q=' + encodeURIComponent(text), { signal: ctl.signal });
      if (!res.ok) throw new Error('fail');
      const j = await res.json();
      const t = (Array.isArray(j && j[0]) ? j[0] : []).map(x => (x && typeof x[0] === 'string') ? x[0] : '').join('').trim();
      if (!t) throw new Error('empty');
      const alts = Array.isArray(j[1]) ? j[1].map(x => ({ pos: POS_KO[x && x[0]] || String(x && x[0] || ''), terms: (Array.isArray(x && x[1]) ? x[1] : []).filter(y => typeof y === 'string' && y.trim()).slice(0, 8) })).filter(x => x.terms.length).slice(0, 4) : [];
      return { t, alts, by: 'Google 번역' };
    } finally { clearTimeout(tm); }
  }
  async function translateText(text, toKo) {
    const fl = toKo ? (HAN.test(text) && !/[A-Za-z]{2}/.test(text) ? 'zh' : 'en') : LANG, NAME = { en: 'English', zh: 'Simplified Chinese', ko: 'Korean' };
    const from = toKo ? fl : 'ko', to = toKo ? 'ko' : fl;
    // 결과가 엉뚱한 언어로 오면 다음 방법으로 넘어가요.
    const looksOk = t => to === 'ko' ? HANGUL.test(t) || /^[\d\s.,:;!?%+\-()]+$/.test(t) : to === 'zh' ? HAN.test(t) : /[A-Za-z]/.test(t);
    try { const r = await gtxTranslate(text, from, to); if (looksOk(r.t)) return r; } catch (e) { /* 다음 방법으로 */ }
    if (aiReady()) {
      try {
        const r = await callAi(`Translate the text below from ${NAME[from]} to ${NAME[to]}. Natural and accurate; keep the meaning and tone. If it is a single word, give its most common meaning(s), separated by ", ". Reply with JSON only, no markdown: {"t":"<translation>"}\n\nTEXT: ${JSON.stringify(text)}`,
          o => (o && typeof o.t === 'string' && o.t.trim() && looksOk(o.t) ? { t: o.t.trim() } : null), { task: 'translate', text, to, from });
        return { t: r.t, alts: [], by: 'AI 번역' };
      } catch (e) { /* 기본 번역으로 대체 */ }
    }
    const ctl = new AbortController(), tm = setTimeout(() => ctl.abort(), 12000), MM = { en: 'en', ko: 'ko', zh: 'zh-CN' };
    try {
      const res = await fetch('https://api.mymemory.translated.net/get?q=' + encodeURIComponent(text) + '&langpair=' + MM[from] + '|' + MM[to], { signal: ctl.signal });
      const j = await res.json();
      let t = j && j.responseData && j.responseData.translatedText;
      if (!res.ok || !t || String(j.responseStatus) !== '200' || /MYMEMORY WARNING|INVALID/i.test(t)) throw new Error('fail');
      const d = document.createElement('textarea'); d.innerHTML = t; t = d.value.trim();
      if (!t || !looksOk(t)) throw new Error('empty');
      return { t, alts: [], by: '기본 번역' };
    } finally { clearTimeout(tm); }
  }
  ACTIONS['tr-close'] = closeTranslator;
  ACTIONS['tr-clear'] = () => { const i = $('trIn'); if (!i) return; i.value = ''; i.dispatchEvent(new Event('input')); $('trOut').style.display = 'none'; i.focus(); };
  ACTIONS['tr-go'] = async () => {
    const inp = $('trIn'); if (!inp || trBusy) return;
    const text = inp.value.trim(); if (!text) return toast('번역할 내용을 입력해 주세요.');
    const toKo = !HANGUL.test(text), btn = $('trGo'), out = $('trOut');
    trBusy = true; btn.disabled = true; btn.textContent = '번역 중...';
    out.style.display = 'block'; out.innerHTML = '<div class="tr-load"><i></i><i></i><i></i></div>';
    try {
      const r = await translateText(text, toKo);
      if (!$('trOut')) return;
      trLast = { toKo, en: toKo ? text : r.t, ko: toKo ? r.t : text, t: r.t };
      const fz = isHanWord(trLast.en.trim());
      // 한 단어면 단어장에 담을 수 있어요. 지금 학습 언어와 같은 언어일 때만.
      const single = fz ? isZh() && /^[\u3400-\u9fff]{1,8}$/.test(trLast.en.trim()) : !isZh() && WORDRE.test(trLast.en.trim());
      let dh = null;
      if (single) { try { dh = await dictGet(trLast.en.trim()); } catch (e) {} if (!$('trOut')) return; }
      const alts = (r.alts || []).map(x => `<div class="tr-alt"><em>${esc(x.pos)}</em>${x.terms.map(y => toKo ? `<span>${esc(y)}</span>` : `<button class="syn" data-act="tr-pick" data-w="${esc(y)}">${esc(y)}</button>`).join('')}</div>`).join('');
      $('trOut').innerHTML = `<div class="tr-lang">${toKo ? 'KOREAN' : fz ? 'CHINESE' : 'ENGLISH'} · ${esc(r.by)}</div><div class="tr-text">${esc(r.t)}</div>
        ${alts ? `<div class="tr-alts"><h4 class="syn-h">${toKo ? '다른 뜻' : '이런 단어도 써요'}</h4>${alts}</div>` : ''}
        ${dh ? `<div class="tr-dict"><h4 class="syn-h">${IC.book} 사전</h4><b>${esc(dh.word || trLast.en)}</b> <span class="q-pron">${esc(pronText(dh))}</span><div>${esc(dh.meaning)}</div>${dh.example ? `<small>${esc(dh.example)}${dh.exampleKo ? ' · ' + esc(dh.exampleKo) : ''}</small>` : ''}</div>` : ''}
        <div class="tr-actions"><button class="btn btn-soft" data-act="tr-speak">${IC.speaker} ${fz ? '중국어' : '영어'} 발음</button><button class="btn btn-soft" data-act="tr-copy">복사</button></div>
        ${single ? `<div class="tr-add"><select id="trBook">${categories.map(c => `<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('')}</select><button class="btn btn-primary" data-act="tr-add">단어장에 추가</button></div>` : ''}`;
      if (dh && dh.meaning && toKo) trLast.ko = dh.meaning;
    } catch (e) { if ($('trOut')) $('trOut').innerHTML = '<div class="tr-err">번역하지 못했어요. 인터넷을 확인하거나 잠시 뒤 다시 시도해 주세요.</div>'; }
    finally { trBusy = false; const b = $('trGo'); if (b) { b.disabled = false; b.textContent = '번역하기'; } }
  };
  ACTIONS['tr-speak'] = el => { if (trLast) { playAudio(trLast.en, true); spdPop(el, trLast.en); } };
  // 한국어 → 외국어 번역에서 다른 후보 단어를 누르면 그 단어로 바꿔 담을 수 있게 해요.
  ACTIONS['tr-pick'] = el => { if (!trLast) return; const i = $('trIn'); if (i) { i.value = el.dataset.w; i.dispatchEvent(new Event('input')); } ACTIONS['tr-go'](); };
  ACTIONS['tr-copy'] = async () => { try { await navigator.clipboard.writeText(trLast.t); toast('복사했어요.'); } catch (e) { toast('복사하지 못했어요. 직접 선택해서 복사해 주세요.'); } };
  ACTIONS['tr-add'] = () => {
    const sel = $('trBook'), cat = sel && categories.find(c => c.id === sel.value); if (!cat || !trLast) return;
    const en = trLast.en.trim(), ko = trLast.ko.trim();
    if (cat.words.some(w => w.word.toLowerCase() === en.toLowerCase())) return toast('이미 있는 단어예요.');
    const w = sanitizeWord({ id: uid(), word: en, meaning: ko });
    cat.words.unshift(w);
    syncStorage(); try { go(curTab); } catch (e) {}
    dictFill([w]).then(n => { if (n) syncStorage(); }).catch(() => {});
    toast(`'${en}'를 ${cat.name}에 추가했어요.`);
  };
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && $('trOv') && !document.querySelector('.dlg-ov')) closeTranslator(); });
  ACTIONS.translator = () => openTranslator();

  const OB = [[IC.sprout, '매일 조금씩, 끝까지', '하루 목표만큼만 외워요. 복습할 시기는 앱이 알아서 챙겨 드려요.'], [IC.repeat, '잊을 때쯤 다시 만나요', '틀린 단어는 더 자주, 아는 단어는 천천히. 검증된 반복 학습 방식이에요.'], [IC.headphones, '눈으로, 귀로, 손으로', '플래시카드, 퀴즈, 받아쓰기, 듣기 모드로 질리지 않게 외워요.']];
  function showOnboarding() {
    let justSigned = '';
    try { justSigned = sessionStorage.getItem('vocapro_just_signed_up') || ''; sessionStorage.removeItem('vocapro_just_signed_up'); } catch (e) {}
    if (justSigned !== '1') return;
    if (LS.getItem('vocapro_onboarded') || $('obOv')) return;
    let i = 0; const ov = document.createElement('div'); ov.className = 'ob'; ov.id = 'obOv'; document.body.appendChild(ov);
    const draw = () => {
      const [ic, t, d] = OB[i];
      ov.innerHTML = `<button class="ob-skip" data-ob="skip">건너뛰기</button><div class="ob-body"><div class="ob-art">${MASCOT(['happy', 'think', 'cheer'][i])}<span class="ob-badge">${ic}</span></div><h2>${t}</h2><p>${d}</p></div><div class="ob-foot"><div class="ob-dots">${OB.map((_, k) => `<i class="${k === i ? 'on' : ''}"></i>`).join('')}</div><button class="btn btn-primary btn-block" data-ob="next">${i === OB.length - 1 ? '시작하기' : '다음'}</button></div>`;
    };
    const done = () => { try { LS.setItem('vocapro_onboarded', '1'); } catch (e) {} ov.remove(); if (!isTeacher()) setTimeout(() => { try { ltOpen(true); } catch (e) {} }, 150); };
    ov.addEventListener('click', e => { const b = e.target.closest('[data-ob]'); if (!b) return; if (b.dataset.ob === 'skip' || i === OB.length - 1) return done(); i++; draw(); });
    draw();
  }
  ACTIONS['pw-change'] = async () => {
    const o = await ask('현재 비밀번호를 입력하세요.', { input: '', pw: true, ok: '다음' }); if (!o) return;
    const n = await ask('새 비밀번호를 입력하세요. (6자 이상)', { input: '', pw: true, ok: '변경' }); if (!n) return;
    if (n.length < 6) return say('새 비밀번호는 6자 이상이어야 해요.');
    try { await Cloud.changePw(o, n); toast('비밀번호를 바꿨어요.'); } catch (e) { say(e.code === 'invalid' ? '현재 비밀번호가 맞지 않아요.' : cloudMsg(e)); }
  };

  /* ----- 복습 알림 ----- */
  const rmKey = () => 'vocapro_rm:' + currentUser;
  const rmGet = () => loadJson(rmKey()) || { on: false, time: '20:00', last: '' };
  const rmSet = o => { try { LS.setItem(rmKey(), JSON.stringify(o)); } catch (e) {} };
  const dueCount = () => counts().due;
  function rmUI() {
    const r = rmGet(), on = $('rmOn'); if (!on) return;
    on.checked = !!r.on; $('rmTime').value = r.time;
    $('rmNote').textContent = r.on ? `복습할 단어가 있는 날, ${r.time} 이후에 앱을 열면 알려 드려요.` : '복습할 단어가 있는 날, 정한 시간 이후에 알려 드려요.';
  }
  async function rmSave() {
    const r = rmGet(); r.on = $('rmOn').checked; r.time = $('rmTime').value || '20:00';
    if (r.on) {
      if (!('Notification' in window)) { r.on = false; say('이 브라우저는 알림을 지원하지 않아요.\n홈 화면에 설치한 앱에서 사용해 보세요.'); }
      else if (Notification.permission !== 'granted') {
        let perm = 'denied'; try { perm = await Notification.requestPermission(); } catch (e) {}
        if (perm !== 'granted') { r.on = false; say('알림이 허용되지 않았어요.\n브라우저 설정에서 이 사이트의 알림을 허용해 주세요.'); }
      }
    }
    rmSet(r); rmUI(); rmCheck();
  }
  async function rmCheck() {
    if (!currentUser) return;
    const r = rmGet(), n = dueCount();
    try { if (navigator.setAppBadge) { if (r.on && n > 0) navigator.setAppBadge(n); else navigator.clearAppBadge(); } } catch (e) {}
    if (!r.on || !('Notification' in window) || Notification.permission !== 'granted' || r.last === dayKey()) return;
    const d = new Date(), [h, m] = r.time.split(':').map(Number);
    if (d.getHours() * 60 + d.getMinutes() < h * 60 + m || n === 0 || (stats.days[dayKey()] || { n: 0 }).n > 0) return;
    r.last = dayKey(); rmSet(r);
    const opt = { body: `오늘 복습할 단어 ${n}개가 기다리고 있어요.`, icon: 'icon-192.png', badge: 'icon-192.png', tag: 'vocapro-review' };
    try { const reg = 'serviceWorker' in navigator && await navigator.serviceWorker.getRegistration(); if (reg) await reg.showNotification('VocaPro', opt); else new Notification('VocaPro', opt); } catch (e) {}
  }
  setInterval(rmCheck, 60000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) rmCheck(); });

  /* ----- 짝 맞추기 ----- */
  let mgT = null;
  function closeMatch() { clearInterval(mgT); const o = $('mgOv'); if (o) o.remove(); }
  function openMatch() {
    const ws = allWords().map(x => x.w).filter(w => w.word && w.meaning);
    if (ws.length < 4) return toast('단어가 4개 이상 있어야 해요.');
    closeMatch();
    // 같은 단어·같은 뜻 타일이 두 번 나오면 짝이 모호해져요 → 단어(소문자)·표시 뜻으로 중복 제거
    const mT = w => String(w.meaning).split(/[,;/]/)[0].trim() || String(w.meaning), seenW = new Set(), seenM = new Set(), pick = [], tiles = [];
    for (const w of shuffled(ws)) { const k = w.word.trim().toLowerCase(), m = mT(w); if (seenW.has(k) || seenM.has(m)) continue; seenW.add(k); seenM.add(m); pick.push(w); if (pick.length >= 6) break; }
    if (pick.length < 4) return toast('서로 다른 단어가 4개 이상 있어야 해요.');
    pick.forEach((w, i) => { tiles.push({ id: i, t: w.word, en: true }, { id: i, t: mT(w), en: false }); });
    shuffled(tiles).forEach((t, i) => { tiles[i] = t; });
    const ov = document.createElement('div'); ov.className = 'mg'; ov.id = 'mgOv';
    ov.innerHTML = `<div class="mg-top"><button class="round-btn" data-mg="x" aria-label="닫기">${IC.x}</button><b>짝 맞추기</b><span id="mgTime">0.0초</span></div><p class="mg-sub">${LN()}와 뜻을 짝지어 눌러 보세요</p><div class="mg-grid">${tiles.map((t, i) => `<button class="mg-tile" data-i="${i}">${esc(t.t)}</button>`).join('')}</div>`;
    document.body.appendChild(ov);
    let sel = -1, done = 0, wrong = 0, locked = false, over = false; const t0 = Date.now();
    mgT = setInterval(() => { const e = $('mgTime'); if (e) e.textContent = ((Date.now() - t0) / 1000).toFixed(1) + '초'; }, 100);
    const finish = () => {
      over = true; const sec = ((Date.now() - t0) / 1000).toFixed(1);
      ov.innerHTML = `<div class="mg-done"><div class="result-art">${MASCOT(wrong === 0 ? 'cheer' : 'happy')}</div><h2>${wrong === 0 ? '완벽해요!' : '모두 맞췄어요'}</h2><p>${sec}초 · 오답 ${wrong}번</p><button class="btn btn-primary btn-block" data-mg="again">한 번 더</button><button class="btn btn-soft btn-block" data-mg="x" style="margin-top:8px;">닫기</button></div>`;
    };
    ov.addEventListener('click', e => {
      const k = e.target.closest('[data-mg]');
      if (k) { if (k.dataset.mg === 'again') { closeMatch(); openMatch(); } else closeMatch(); return; }
      const b = e.target.closest('.mg-tile'); if (!b || locked || over || b.classList.contains('ok')) return;
      const i = +b.dataset.i;
      if (sel === i) { b.classList.remove('sel'); sel = -1; return; }
      if (sel < 0) { sel = i; b.classList.add('sel'); if (tiles[i].en) playAudio(tiles[i].t); return; }
      const a = tiles[sel], c = tiles[i], ba = ov.querySelector(`[data-i="${sel}"]`);
      if (a.id === c.id && a.en !== c.en) {
        [ba, b].forEach(x => { x.classList.remove('sel'); x.classList.add('ok'); }); sel = -1; done++; haptic(true);
        if (done === pick.length) { clearInterval(mgT); setTimeout(finish, 450); }
      } else {
        wrong++; locked = true; haptic(false); [ba, b].forEach(x => x.classList.add('no'));
        setTimeout(() => { [ba, b].forEach(x => x.classList.remove('no', 'sel')); sel = -1; locked = false; }, 450);
      }
    });
  }
  ACTIONS.match = openMatch;

