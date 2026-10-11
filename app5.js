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
      <textarea id="trIn" rows="4" maxlength="1000" placeholder="영어 또는 한국어 문장을 입력하세요" spellcheck="false"></textarea>
      <div class="tr-actions"><button class="btn btn-soft" data-act="tr-clear">지우기</button><button class="btn btn-primary" id="trGo" data-act="tr-go" style="flex:1">번역하기</button></div>
      <div id="trOut" class="tr-out" style="display:none"></div></div>`;
    document.body.appendChild(ov);
    const inp = $('trIn');
    const dir = () => { $('trDir').textContent = inp.value.trim() ? (HANGUL.test(inp.value) ? '한국어 → English' : 'English → 한국어') : '자동 감지'; };
    ov.addEventListener('click', e => { if (e.target === ov) closeTranslator(); });
    inp.addEventListener('input', dir);
    inp.addEventListener('keydown', e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); ACTIONS['tr-go'](); } });
    if (prefill) { inp.value = prefill; dir(); }
    setTimeout(() => inp.focus(), 80);
  }
  async function translateText(text, toKo) {
    const from = toKo ? 'English' : 'Korean', to = toKo ? 'Korean' : 'English';
    if (aiReady()) {
      try {
        const r = await callAi(`Translate the text below from ${from} to ${to}. Natural and accurate; keep the meaning and tone. Reply with JSON only, no markdown: {"t":"<translation>"}\n\nTEXT: ${JSON.stringify(text)}`,
          o => (o && typeof o.t === 'string' && o.t.trim() ? { t: o.t.trim() } : null), { task: 'translate', text, to: toKo ? 'ko' : 'en' });
        return { t: r.t, by: 'AI 번역' };
      } catch (e) { /* 기본 번역으로 대체 */ }
    }
    const ctl = new AbortController(), tm = setTimeout(() => ctl.abort(), 12000);
    try {
      const res = await fetch('https://api.mymemory.translated.net/get?q=' + encodeURIComponent(text) + '&langpair=' + (toKo ? 'en|ko' : 'ko|en'), { signal: ctl.signal });
      const j = await res.json();
      let t = j && j.responseData && j.responseData.translatedText;
      if (!res.ok || !t || String(j.responseStatus) !== '200' || /MYMEMORY WARNING|INVALID/i.test(t)) throw new Error('fail');
      const d = document.createElement('textarea'); d.innerHTML = t; t = d.value.trim();
      if (!t) throw new Error('empty');
      return { t, by: '기본 번역' };
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
      const single = WORDRE.test(trLast.en.trim());
      $('trOut').innerHTML = `<div class="tr-lang">${toKo ? 'KOREAN' : 'ENGLISH'} · ${esc(r.by)}</div><div class="tr-text">${esc(r.t)}</div>
        <div class="tr-actions"><button class="btn btn-soft" data-act="tr-speak">${IC.speaker} 영어 발음</button><button class="btn btn-soft" data-act="tr-copy">복사</button></div>
        ${single ? `<div class="tr-add"><select id="trBook">${categories.map(c => `<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('')}</select><button class="btn btn-primary" data-act="tr-add">단어장에 추가</button></div>` : ''}`;
    } catch (e) { if ($('trOut')) $('trOut').innerHTML = '<div class="tr-err">번역하지 못했어요. 인터넷을 확인하거나 잠시 뒤 다시 시도해 주세요.</div>'; }
    finally { trBusy = false; const b = $('trGo'); if (b) { b.disabled = false; b.textContent = '번역하기'; } }
  };
  ACTIONS['tr-speak'] = () => { if (trLast) speak(trLast.en, 'en-US'); };
  ACTIONS['tr-copy'] = async () => { try { await navigator.clipboard.writeText(trLast.t); toast('복사했어요.'); } catch (e) { toast('복사하지 못했어요. 직접 선택해서 복사해 주세요.'); } };
  ACTIONS['tr-add'] = () => {
    const sel = $('trBook'), cat = sel && categories.find(c => c.id === sel.value); if (!cat || !trLast) return;
    const en = trLast.en.trim(), ko = trLast.ko.trim();
    if (cat.words.some(w => w.word.toLowerCase() === en.toLowerCase())) return toast('이미 있는 단어예요.');
    cat.words.unshift(sanitizeWord({ id: uid(), word: en, meaning: ko }));
    syncStorage(); try { go(curTab); } catch (e) {}
    toast(`'${en}'를 ${cat.name}에 추가했어요.`);
  };
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && $('trOv') && !document.querySelector('.dlg-ov')) closeTranslator(); });
  ACTIONS.translator = () => openTranslator();

  const OB = [[IC.sprout, '매일 조금씩, 끝까지', '하루 목표만큼만 외워요. 복습할 시기는 앱이 알아서 챙겨 드려요.'], [IC.repeat, '잊을 때쯤 다시 만나요', '틀린 단어는 더 자주, 아는 단어는 천천히. 검증된 반복 학습 방식이에요.'], [IC.headphones, '눈으로, 귀로, 손으로', '플래시카드, 퀴즈, 받아쓰기, 듣기 모드로 질리지 않게 외워요.']];
  function showOnboarding() {
    if (LS.getItem('vocapro_onboarded') || $('obOv')) return;
    let i = 0; const ov = document.createElement('div'); ov.className = 'ob'; ov.id = 'obOv'; document.body.appendChild(ov);
    const draw = () => {
      const [ic, t, d] = OB[i];
      ov.innerHTML = `<button class="ob-skip" data-ob="skip">건너뛰기</button><div class="ob-body"><div class="ob-art">${MASCOT(['happy', 'think', 'cheer'][i])}<span class="ob-badge">${ic}</span></div><h2>${t}</h2><p>${d}</p></div><div class="ob-foot"><div class="ob-dots">${OB.map((_, k) => `<i class="${k === i ? 'on' : ''}"></i>`).join('')}</div><button class="btn btn-primary btn-block" data-ob="next">${i === OB.length - 1 ? '시작하기' : '다음'}</button></div>`;
    };
    const done = () => { try { LS.setItem('vocapro_onboarded', '1'); } catch (e) {} ov.remove(); setTimeout(() => { try { ltOpen(true); } catch (e) {} }, 150); };
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
    const pick = shuffled(ws).slice(0, 6), tiles = [];
    pick.forEach((w, i) => { tiles.push({ id: i, t: w.word, en: true }, { id: i, t: String(w.meaning).split(/[,;/]/)[0].trim() || w.meaning, en: false }); });
    shuffled(tiles).forEach((t, i) => { tiles[i] = t; });
    const ov = document.createElement('div'); ov.className = 'mg'; ov.id = 'mgOv';
    ov.innerHTML = `<div class="mg-top"><button class="round-btn" data-mg="x" aria-label="닫기">${IC.x}</button><b>짝 맞추기</b><span id="mgTime">0.0초</span></div><p class="mg-sub">영어와 뜻을 짝지어 눌러 보세요</p><div class="mg-grid">${tiles.map((t, i) => `<button class="mg-tile" data-i="${i}">${esc(t.t)}</button>`).join('')}</div>`;
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
      if (sel < 0) { sel = i; b.classList.add('sel'); if (tiles[i].en) speak(tiles[i].t, 'en-US'); return; }
      const a = tiles[sel], c = tiles[i], ba = ov.querySelector(`[data-i="${sel}"]`);
      if (a.id === c.id && a.en !== c.en) {
        [ba, b].forEach(x => { x.classList.remove('sel'); x.classList.add('ok'); }); sel = -1; done++;
        if (done === pick.length) { clearInterval(mgT); setTimeout(finish, 450); }
      } else {
        wrong++; locked = true; [ba, b].forEach(x => x.classList.add('no'));
        setTimeout(() => { [ba, b].forEach(x => x.classList.remove('no', 'sel')); sel = -1; locked = false; }, 450);
      }
    });
  }
  ACTIONS.match = openMatch;

  /* =========================================================
   * 대화상자 / 계정
   * ======================================================= */
  function ask(msg, o = {}) {
    return new Promise(res => {
      const ov = document.createElement('div'); ov.className = 'dlg-ov';
      ov.innerHTML = `<div class="dlg" role="alertdialog" aria-modal="true"><p>${esc(msg)}</p>${o.input !== undefined ? `<input type="${o.pw ? 'password' : 'text'}" id="dlgIn" maxlength="72">` : ''}<div class="row">${o.alert ? '' : '<button class="btn btn-soft" style="flex:1" data-d="0">취소</button>'}<button class="btn ${o.danger ? 'btn-bad' : 'btn-primary'}" style="flex:1" data-d="1">${esc(o.ok || '확인')}</button></div></div>`;
      document.body.appendChild(ov);
      const inp = ov.querySelector('#dlgIn');
      if (inp) { inp.value = o.input; setTimeout(() => { inp.focus(); inp.select(); }, 50); } else ov.querySelector('[data-d="1"]').focus();
      const done = v => { ov.remove(); document.removeEventListener('keydown', kd, true); res(v); };
      const kd = e => {
        if (e.key === 'Escape') { e.stopImmediatePropagation(); done(inp ? null : false); }
        else if (e.key === 'Enter') { e.preventDefault(); e.stopImmediatePropagation(); done(inp ? inp.value : true); }
      };
      ov.addEventListener('click', e => { const b = e.target.closest('[data-d]'); if (b) done(b.dataset.d === '1' ? (inp ? inp.value : true) : (inp ? null : false)); });
      document.addEventListener('keydown', kd, true);
    });
  }
  const say = msg => ask(msg, { alert: true });

  const getUsers = () => loadJson(KEY_USERS) || {};
  const saveUsers = u => { try { LS.setItem(KEY_USERS, JSON.stringify(u)); return true; } catch (e) { return false; } };
  const hasCrypto = () => !!(window.crypto && crypto.subtle && window.TextEncoder);
  async function hashPw(pw, salt, m) {
    if (m === 'p') {
      if (!hasCrypto()) throw new Error('이 주소에서는 로그인 암호화를 쓸 수 없어요. https 주소로 열어 주세요.');
      const enc = new TextEncoder();
      const km = await crypto.subtle.importKey('raw', enc.encode(pw), 'PBKDF2', false, ['deriveBits']);
      const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: enc.encode(salt), iterations: 100000, hash: 'SHA-256' }, km, 256);
      return [...new Uint8Array(bits)].map(b => b.toString(16).padStart(2, '0')).join('');
    }
    let h = 5381; const t = salt + pw;
    for (let r = 0; r < 2000; r++) for (let i = 0; i < t.length; i++) h = ((h * 33) ^ t.charCodeAt(i)) >>> 0;
    return String(h);
  }
  let authMode = 'login', pendingGrade = '', ageOk = false;
  function renderAuth() {
    const su = authMode === 'signup';
    $('authScreen').innerHTML = `<div class="auth-box">
      <div class="auth-hero">${MASCOT('happy')}</div>
      <div class="page-title" style="text-align:center;margin-bottom:6px;"><b>Voca</b>Pro</div>
      <p class="muted" style="text-align:center;margin:0 0 18px;">${su ? '새 계정을 만들어요' : '로그인하고 이어서 외워요'}</p>
      ${kidMode ? '<div class="kid-note"><b>만 14세 미만 계정</b>보호자와 함께 만들어 주세요. 단어장과 기록은 이 기기에만 저장되고 서버로 보내지 않아요.</div>' : ''}
      <div class="seg" style="margin-bottom:14px;"><button class="${su ? '' : 'on'}" data-act="auth-mode" data-m="login">로그인</button><button class="${su ? 'on' : ''}" data-act="auth-mode" data-m="signup">회원가입</button></div>
      ${su && cloudAvail && !kidMode ? `<div class="seg age-seg" style="margin-bottom:12px;"><button class="${ageOk ? 'on' : ''}" data-act="auth-age" data-k="0">만 14세 이상</button><button data-act="auth-age" data-k="1">만 14세 미만</button></div>` : ''}
      <div class="form-stack">
        <input type="text" id="auId" placeholder="아이디 (2~20자)" autocomplete="username" autocapitalize="none" spellcheck="false" maxlength="20">
        <input type="password" id="auPw" placeholder="비밀번호 (${cloudMode ? 6 : 4}자 이상)" autocomplete="${su ? 'new-password' : 'current-password'}">
        ${su ? `<input type="password" id="auPw2" placeholder="비밀번호 확인" autocomplete="new-password"><select id="auGrade" aria-label="학년"><option value="">학년을 골라 주세요</option>${gradeOptions('')}</select>` : ''}
        ${authExtraHtml(su)}
        <label class="switch-row"><input type="checkbox" id="auKeep" checked> 로그인 유지</label>
        <div id="auMsg" style="display:none;color:var(--coral);font-weight:600;font-size:.85rem;"></div>
        <button class="btn btn-primary btn-block" id="auGo" data-act="auth-go">${su ? '가입하고 시작' : '로그인'}</button>
        ${cloudAvail ? `<button class="link-btn kid-link" data-act="auth-age" data-k="${kidMode ? 0 : 1}">${kidMode ? '만 14세 이상 계정으로 돌아가기' : (su ? '' : '이 기기의 어린이 계정(만 14세 미만)으로 로그인')}</button>` : ''}
        <p class="muted" style="font-size:.74rem;line-height:1.6;margin:4px 0 0;">${cloudMode ? '같은 아이디로 로그인하면 어느 기기에서든 단어장과 학습 기록이 이어져요. 비밀번호를 잊으면 복구할 수 없어요. API 키는 보안을 위해 기기마다 따로 입력해요.' : '계정은 이 기기의 브라우저에만 저장돼요. 다른 기기와 동기화되지 않고, 비밀번호를 잊으면 복구할 수 없으니 백업 파일을 받아 두세요.'}</p>
      </div></div>`;
    setTimeout(drawCaptcha, 0);
  }
  function showAuth() {
    authMode = cloudMode ? 'login' : (Object.keys(getUsers()).length ? 'login' : 'signup');
    renderAuth();
    $('authScreen').style.display = 'flex';
    setTimeout(() => { const f = $('auId'); if (f) f.focus(); }, 100);
  }
  ACTIONS['auth-mode'] = el => { authMode = el.dataset.m; renderAuth(); };
  ACTIONS['auth-age'] = el => {
    const kid = el.dataset.k === '1';
    if (kid) { setKidMode(true); if (!Object.keys(getUsers()).length) authMode = 'signup'; }
    else if (kidMode) setKidMode(false);
    else ageOk = true;
    renderAuth();
  };
  ACTIONS['auth-go'] = async () => {
    const btn = $('auGo'); if (!btn || btn.disabled) return;
    const fail = m => {
      const e = $('auMsg'); e.textContent = m; e.style.display = 'block'; btn.disabled = false;
      if (authMode !== 'signup' && !/보안문자|동의/.test(m)) { authFails++; if (authFails >= 3) { const cb = $('capBox'); if (cb) cb.style.display = 'block'; drawCaptcha(); } }
    };
    { const g = authGate(); if (g) return fail(g); }
    if (authMode === 'signup') { const gr = $('auGrade') && $('auGrade').value; if (!GRADE_NAMES[gr]) return fail('학년을 골라 주세요. 학년에 맞는 단어를 추천해 드려요.'); pendingGrade = gr; } else pendingGrade = '';
    if (cloudMode) {
      const email = $('auId').value.trim(), pw0 = $('auPw').value, keep0 = $('auKeep').checked, su0 = authMode === 'signup';
      if (!/^[\w가-힣-]{2,20}$/.test(email)) return fail('아이디는 2~20자의 한글, 영문, 숫자, _, - 만 쓸 수 있어요.');
      if (pw0.length < 6) return fail('비밀번호는 6자 이상이어야 해요.');
      if (su0 && pw0 !== $('auPw2').value) return fail('비밀번호 확인이 달라요.');
      if (su0 && !ageOk) return fail('만 14세 이상인지 골라 주세요. 만 14세 미만은 이 기기에만 저장하는 계정으로 만들어요.');
      btn.disabled = true;
      try {
        if (!window.Cloud) throw { code: 'offline' };
        const u = su0 ? await Cloud.signup(email, pw0, keep0) : await Cloud.login(email, pw0, keep0);
        let remote = null;
        try { remote = await Cloud.load(); } catch (e) { toast('서버에서 불러오지 못해 이 기기의 저장본을 써요.'); }
        enterApp(u.uid, remote, u.email);
      } catch (e) { fail(cloudMsg(e)); }
      return;
    }
    const id = $('auId').value.trim(), pw = $('auPw').value, keep = $('auKeep').checked, su = authMode === 'signup';
    if (!/^[\w가-힣-]{2,20}$/.test(id)) return fail('아이디는 2~20자의 한글, 영문, 숫자, _, - 만 쓸 수 있어요.');
    if (pw.length < 4) return fail('비밀번호는 4자 이상이어야 해요.');
    if (su && pw !== $('auPw2').value) return fail('비밀번호 확인이 달라요.');
    btn.disabled = true;
    const key = id.toLowerCase(), users = getUsers();
    try {
      if (su) {
        if (users[key]) return fail('이미 있는 아이디예요.');
        const salt = Math.random().toString(36).slice(2) + Date.now().toString(36), m = hasCrypto() ? 'p' : 'f';
        users[key] = { name: id, s: salt, m, h: await hashPw(pw, salt, m), t: Date.now() };
        if (!saveUsers(users)) return fail('브라우저가 저장을 막고 있어서 가입할 수 없어요. 사이트 데이터/쿠키 차단을 확인해 주세요.');
        if (Object.keys(users).length === 1) {
          try {
            const old = loadJson('vocapro_v11_data');
            if (old) { LS.setItem('vocapro_v11_data:' + key, JSON.stringify(old)); const oc = loadJson('vocapro_v10_cfg'); if (oc) LS.setItem('vocapro_v10_cfg:' + key, JSON.stringify(oc)); }
          } catch (e) {}
        }
      } else {
        const u = users[key];
        if (!u || (await hashPw(pw, u.s, u.m)) !== u.h) return fail('아이디 또는 비밀번호가 맞지 않아요.');
      }
    } catch (e) { return fail(e.message || '오류가 발생했어요.'); }
    try { LS.removeItem(KEY_SESS); sessionStorage.removeItem(KEY_SESS); (keep ? LS : sessionStorage).setItem(KEY_SESS, key); } catch (e) {}
    enterApp(key);
  };
  function enterApp(key, remote, label) {
    currentUser = key; currentLabel = label || key; KEY_DATA = 'vocapro_v11_data:' + key; KEY_CFG = 'vocapro_v10_cfg:' + key;
    if (cloudMode) {
      try {
        LS.setItem('vocapro_last_uid', key); LS.setItem('vocapro_last_label', currentLabel);
        if (!remote && !LS.getItem(KEY_DATA) && !LS.getItem('vocapro_legacy_taken')) {
          const old = loadJson('vocapro_v11_data'), oc = loadJson('vocapro_v10_cfg');
          if (old) { LS.setItem(KEY_DATA, JSON.stringify(old)); if (oc) LS.setItem(KEY_CFG, JSON.stringify(oc)); LS.setItem('vocapro_legacy_taken', '1'); }
        }
      } catch (e) {}
    }
    try { if (kidMode) LS.setItem(KEY_KID, '1'); else LS.removeItem(KEY_KID); } catch (e) {}
    config = loadConfig(); const db = loadDb(); categories = db.categories; stats = db.stats;
    currentCategoryId = null; viewOrder = null; openDrawers.clear(); S = { active: false };
    ['studyScreen', 'sheetOv'].forEach(i => $(i).classList.remove('open'));
    document.body.classList.remove('no-scroll');
    $('authScreen').style.display = 'none';
    let applied = false;
    if (remote && remote.updated > (+LS.getItem(KEY_DATA + ':ts') || 0)) { try { applyRemote(remote); applied = true; } catch (e) { toast('서버 데이터를 읽지 못했어요.'); } }
    if (pendingGrade) { config.grade = pendingGrade; pendingGrade = ''; applied = false; }
    recShown = false; applyTheme(); if (!applied) syncStorage(); go('tabHome'); showOnboarding(); rmCheck();
  }
  ACTIONS.logout = async () => {
    if (cloudTimer) await cloudPush();
    if (cloudMode && window.Cloud) { try { await Cloud.logout(); } catch (e) {} try { LS.removeItem('vocapro_last_uid'); } catch (e) {} }
    L.token++; try { window.speechSynthesis.cancel(); } catch (e) {}
    try { LS.removeItem(KEY_SESS); sessionStorage.removeItem(KEY_SESS); } catch (e) {}
    currentUser = null; S = { active: false };
    ['studyScreen', 'sheetOv'].forEach(i => $(i).classList.remove('open'));
    if (kidMode) { setKidMode(false); try { LS.removeItem(KEY_KID); } catch (e) {} }
    showAuth();
  };
  ACTIONS['acct-del'] = async () => {
    if (!await ask(`'${currentUser}' 계정과 모든 단어, 학습 기록이 삭제돼요.\n되돌릴 수 없어요. 계속할까요?`, { ok: '삭제', danger: true })) return;
    if (cloudMode) {
      try { await Cloud.remove(); } catch (e) { return say(e.code === 'auth/requires-recent-login' ? '보안을 위해 로그인한 직후에만 삭제할 수 있어요. 로그아웃하고 다시 로그인한 뒤 시도해 주세요.' : '삭제하지 못했어요: ' + (e.code || e.message)); }
    } else { const u = getUsers(); delete u[currentUser]; saveUsers(u); }
    try { LS.removeItem(KEY_DATA); LS.removeItem(KEY_CFG); } catch (e) {}
    ACTIONS.logout();
  };
  /* ----- 클라우드 동기화 ----- */
  function cloudMsg(e) {
    const c = (e && e.code) || '';
    return ({ exists: '이미 있는 아이디예요.', invalid: '아이디 또는 비밀번호가 맞지 않아요.', locked: '비밀번호를 여러 번 틀려서 10분간 잠겼어요. 잠시 후 다시 해 주세요.',
      bad_input: '아이디(2~20자)와 비밀번호(6자 이상)를 확인해 주세요.', auth: '로그인이 만료됐어요. 다시 로그인해 주세요.', network: '인터넷 연결을 확인해 주세요.',
      server: '서버 설정에 문제가 있어요. SQL을 실행했는지, config.js 값이 맞는지 확인해 주세요.', offline: '서버에 연결하지 못했어요. 잠시 후 다시 해 주세요.' })[c] || ('오류: ' + (c || (e && e.message) || '알 수 없음'));
  }
  function cloudQueue() { if (!cloudMode || !window.Cloud || !currentUser) return; clearTimeout(cloudTimer); cloudTimer = setTimeout(cloudPush, 1500); }
  async function cloudPush() {
    clearTimeout(cloudTimer); cloudTimer = null;
    if (!cloudMode || !window.Cloud || !currentUser || !Cloud.user()) return;
    const json = JSON.stringify({ categories, stats, cfg: { ttsRate: config.ttsRate, goal: config.goal, darkMode: config.darkMode, provider: config.provider, grade: config.grade } });
    if (json.length > 900000) toast('데이터가 서버 저장 한도(약 1MB)에 가까워요. 단어장을 줄이거나 백업해 두세요.');
    try { await Cloud.save({ data: json, updated: +LS.getItem(KEY_DATA + ':ts') || Date.now() }); }
    catch (e) { toast('서버 저장에 실패했어요. 인터넷을 확인하세요. (' + (e.code || e.message) + ')'); }
  }
  function applyRemote(r) {
    const d = JSON.parse(r.data);
    categories = sanitizeCategories(d.categories) || defaultCats(); stats = sanitizeStats(d.stats);
    if (d.cfg) {
      config.ttsRate = parseFloat(d.cfg.ttsRate) || config.ttsRate; config.goal = parseInt(d.cfg.goal, 10) || config.goal;
      config.darkMode = !!d.cfg.darkMode; if (PROVIDERS[d.cfg.provider]) config.provider = d.cfg.provider;
      if (GRADE_NAMES[d.cfg.grade]) config.grade = d.cfg.grade;
    }
    LS.setItem(KEY_DATA, JSON.stringify({ categories, stats })); LS.setItem(KEY_CFG, JSON.stringify(config)); LS.setItem(KEY_DATA + ':ts', String(r.updated));
    applyTheme();
  }
  async function cloudPull() {
    if (!cloudMode || !window.Cloud || !currentUser || cloudTimer || (S && S.active) || $('sheetOv').classList.contains('open') || !Cloud.user()) return;
    try {
      const r = await Cloud.load();
      if (r && r.updated > (+LS.getItem(KEY_DATA + ':ts') || 0)) { applyRemote(r); go(curTab); toast('다른 기기의 변경 내용을 불러왔어요.'); }
    } catch (e) {}
  }
  window.addEventListener('pagehide', () => { if (cloudTimer) cloudPush(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) { if (cloudTimer) cloudPush(); } else cloudPull(); });
  async function bootCloud() {
    $('authScreen').style.display = 'flex';
    $('authScreen').innerHTML = '<div class="auth-box"><p class="muted" style="text-align:center">불러오는 중...</p></div>';
    const ok = await new Promise(r => { if (window.Cloud) return r(true); window.addEventListener('cloudready', () => r(true), { once: true }); setTimeout(() => r(false), 8000); });
    if (!ok) {
      const last = LS.getItem('vocapro_last_uid');
      if (last) { toast('서버에 연결하지 못해 이 기기의 저장본으로 열었어요.'); return enterApp(last, null, LS.getItem('vocapro_last_label')); }
      showAuth(); const m = $('auMsg'); if (m) { m.textContent = '서버에 연결하지 못했어요. 인터넷을 확인하세요.'; m.style.display = 'block'; } return;
    }
    const u = await Cloud.first;
    if (!u) return showAuth();
    let remote = null; try { remote = await Cloud.load(); } catch (e) {}
    enterApp(u.uid, remote, u.email);
  }
  document.addEventListener('keydown', e => {
    if (e.key === 'Enter' && e.target.closest && e.target.closest('#authScreen')) { e.preventDefault(); ACTIONS['auth-go'](); }
  });

