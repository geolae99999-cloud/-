
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
  let authMode = 'login';
  function renderAuth() {
    const su = authMode === 'signup';
    $('authScreen').innerHTML = `<div class="auth-box">
      <div class="page-title" style="text-align:center;margin-bottom:6px;"><b>Voca</b>Pro</div>
      <p class="muted" style="text-align:center;margin:0 0 18px;">${su ? '새 계정을 만들어요' : '로그인하고 이어서 외워요'}</p>
      <div class="seg" style="margin-bottom:14px;"><button class="${su ? '' : 'on'}" data-act="auth-mode" data-m="login">로그인</button><button class="${su ? 'on' : ''}" data-act="auth-mode" data-m="signup">회원가입</button></div>
      <div class="form-stack">
        <input type="text" id="auId" placeholder="아이디 (2~20자)" autocomplete="username" autocapitalize="none" spellcheck="false" maxlength="20">
        <input type="password" id="auPw" placeholder="비밀번호 (${cloudMode ? 6 : 4}자 이상)" autocomplete="${su ? 'new-password' : 'current-password'}">
        ${su ? '<input type="password" id="auPw2" placeholder="비밀번호 확인" autocomplete="new-password">' : ''}
        <label class="switch-row"><input type="checkbox" id="auKeep" checked> 로그인 유지</label>
        <div id="auMsg" style="display:none;color:var(--coral);font-weight:600;font-size:.85rem;"></div>
        <button class="btn btn-primary btn-block" id="auGo" data-act="auth-go">${su ? '가입하고 시작' : '로그인'}</button>
        <p class="muted" style="font-size:.74rem;line-height:1.6;margin:4px 0 0;">${cloudMode ? '같은 아이디로 로그인하면 어느 기기에서든 단어장과 학습 기록이 이어져요. 비밀번호를 잊으면 복구할 수 없어요. API 키는 보안을 위해 기기마다 따로 입력해요.' : '계정은 이 기기의 브라우저에만 저장돼요. 다른 기기와 동기화되지 않고, 비밀번호를 잊으면 복구할 수 없으니 백업 파일을 받아 두세요.'}</p>
      </div></div>`;
  }
  function showAuth() {
    authMode = cloudMode ? 'login' : (Object.keys(getUsers()).length ? 'login' : 'signup');
    renderAuth();
    $('authScreen').style.display = 'flex';
    setTimeout(() => { const f = $('auId'); if (f) f.focus(); }, 100);
  }
  ACTIONS['auth-mode'] = el => { authMode = el.dataset.m; renderAuth(); };
  ACTIONS['auth-go'] = async () => {
    const btn = $('auGo'); if (!btn || btn.disabled) return;
    const fail = m => { const e = $('auMsg'); e.textContent = m; e.style.display = 'block'; btn.disabled = false; };
    if (cloudMode) {
      const email = $('auId').value.trim(), pw0 = $('auPw').value, keep0 = $('auKeep').checked, su0 = authMode === 'signup';
      if (!/^[\w가-힣-]{2,20}$/.test(email)) return fail('아이디는 2~20자의 한글, 영문, 숫자, _, - 만 쓸 수 있어요.');
      if (pw0.length < 6) return fail('비밀번호는 6자 이상이어야 해요.');
      if (su0 && pw0 !== $('auPw2').value) return fail('비밀번호 확인이 달라요.');
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
    config = loadConfig(); const db = loadDb(); categories = db.categories; stats = db.stats;
    currentCategoryId = null; viewOrder = null; openDrawers.clear(); S = { active: false };
    ['studyScreen', 'sheetOv'].forEach(i => $(i).classList.remove('open'));
    document.body.classList.remove('no-scroll');
    $('authScreen').style.display = 'none';
    let applied = false;
    if (remote && remote.updated > (+LS.getItem(KEY_DATA + ':ts') || 0)) { try { applyRemote(remote); applied = true; } catch (e) { toast('서버 데이터를 읽지 못했어요.'); } }
    applyTheme(); if (!applied) syncStorage(); go('tabHome');
  }
  ACTIONS.logout = async () => {
    if (cloudTimer) await cloudPush();
    if (cloudMode && window.Cloud) { try { await Cloud.logout(); } catch (e) {} try { LS.removeItem('vocapro_last_uid'); } catch (e) {} }
    L.token++; try { window.speechSynthesis.cancel(); } catch (e) {}
    try { LS.removeItem(KEY_SESS); sessionStorage.removeItem(KEY_SESS); } catch (e) {}
    currentUser = null; S = { active: false };
    ['studyScreen', 'sheetOv'].forEach(i => $(i).classList.remove('open'));
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
    const json = JSON.stringify({ categories, stats, cfg: { ttsRate: config.ttsRate, goal: config.goal, darkMode: config.darkMode, provider: config.provider } });
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
  ACTIONS['auth-reset'] = async () => {
    const email = ($('auId').value || '').trim();
    if (!/^\S+@\S+\.\S+$/.test(email)) return say('위 칸에 가입한 이메일을 먼저 입력해 주세요.');
    try { await Cloud.reset(email); say('비밀번호 재설정 메일을 보냈어요.\n메일함(스팸함 포함)을 확인해 주세요.'); } catch (e) { say(cloudMsg(e)); }
  };
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

  /* =========================================================
   * 시작
   * ======================================================= */
  if ('speechSynthesis' in window) { try { window.speechSynthesis.getVoices(); } catch (e) {} }
  try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) {}
  applyTheme();
  let sess = null;
  try { sess = LS.getItem(KEY_SESS) || sessionStorage.getItem(KEY_SESS); } catch (e) {}
  if (cloudMode) bootCloud(); else if (sess && getUsers()[sess]) enterApp(sess); else showAuth();
  