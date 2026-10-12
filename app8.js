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
  let authMode = 'login', pendingGrade = '', pendingProfile = null, ageOk = false;
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
        ${su ? `<input type="password" id="auPw2" placeholder="비밀번호 확인" autocomplete="new-password"><select id="auGrade" aria-label="학년 또는 선생님" onchange="authRoleChange()"><option value="">학년 또는 선생님을 골라 주세요</option>${roleOptions('')}</select>
        <input type="text" id="auName" placeholder="이름" autocomplete="name" maxlength="20">
        <input type="text" id="auSchool" placeholder="학교 (예: 한빛중학교)" autocomplete="organization" maxlength="30">
        <input type="text" id="auSno" placeholder="학번 (예: 20315)" inputmode="numeric" maxlength="12">` : ''}
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
  // 이름, 학교, 학번이 비어 있는 계정은 로그인하면 먼저 입력받아요
  const profileMissing = () => { const p = config.profile || {}; return !p.name || !p.school || (!isTeacher() && !p.sno); };
  function profileCheck() {
    if (!currentUser || !profileMissing() || $('pfOv')) return;
    const p = config.profile || cleanProfile(), role = isTeacher() ? 'teacher' : config.grade;
    const ov = document.createElement('div'); ov.id = 'pfOv'; ov.className = 'dlg-ov pf-ov';
    ov.innerHTML = `<div class="dlg pf-dlg" role="dialog" aria-modal="true" aria-labelledby="pfT">
      <div class="pf-art">${MASCOT('happy')}</div>
      <h3 id="pfT">내 정보를 알려 주세요</h3>
      <p class="muted">학교에서 함께 쓰려면 이름, 학교, 학번이 필요해요. 내 앱 안에서만 쓰고 다른 사람에게 보여주지 않아요.</p>
      <div class="form-stack">
        <select id="pqRole" onchange="pqRoleChange()" aria-label="학년 또는 선생님"><option value="">학년 또는 선생님을 골라 주세요</option>${roleOptions(role)}</select>
        <input type="text" id="pqName" placeholder="이름" maxlength="20" value="${esc(p.name)}" aria-label="이름">
        <input type="text" id="pqSchool" placeholder="학교 (예: 한빛중학교)" maxlength="30" value="${esc(p.school)}" aria-label="학교">
        <input type="text" id="pqSno" placeholder="학번 (예: 20315)" inputmode="numeric" maxlength="12" value="${esc(p.sno)}" aria-label="학번" style="${role === 'teacher' ? 'display:none' : ''}">
        <div id="pqMsg" class="pf-msg"></div>
        <button class="btn btn-primary btn-block" data-act="pq-save">저장하고 시작</button>
      </div></div>`;
    document.body.appendChild(ov);
    setTimeout(() => { const i = ov.querySelector('input:not([value]), #pqName'); if (i) i.focus(); }, 80);
  }
  function pqRoleChange() { const t = ($('pqRole') || {}).value === 'teacher', sn = $('pqSno'); if (sn) { sn.style.display = t ? 'none' : ''; if (t) sn.value = ''; } }
  ACTIONS['pq-save'] = () => {
    const role = $('pqRole').value, nm = $('pqName').value.trim(), sc = $('pqSchool').value.trim(), sn = role === 'teacher' ? '' : $('pqSno').value.trim();
    const msg = t => { $('pqMsg').textContent = t; };
    if (!GRADE_NAMES[role] && role !== 'teacher') return msg('학년이나 선생님을 골라 주세요.');
    if (!nm) return msg('이름을 입력해 주세요.');
    if (!sc) return msg('학교 이름을 입력해 주세요.');
    if (role !== 'teacher' && !sn) return msg('학번을 입력해 주세요. (예: 2학년 3반 15번이면 20315)');
    if (sn && !/^[0-9A-Za-z-]{1,12}$/.test(sn)) return msg('학번은 숫자로 입력해 주세요.');
    if (role === 'teacher') { config.role = 'teacher'; config.grade = ''; } else { config.role = ''; config.grade = role; }
    config.profile = cleanProfile({ name: nm, school: sc, sno: sn }); syncStorage();
    $('pfOv').remove(); toast('내 정보를 저장했어요.'); go(curTab); recShown = false; recMaybeShow(); shareCheck();
  };
  ACTIONS['pf-save'] = () => {
    const nm = $('pfName').value.trim(), sc = $('pfSchool').value.trim(), sn = isTeacher() ? '' : $('pfSno').value.trim();
    if (!nm) return toast('이름을 입력해 주세요.');
    if (!sc) return toast('학교 이름을 입력해 주세요.');
    if (!isTeacher() && !sn) return toast('학번을 입력해 주세요.');
    if (sn && !/^[0-9A-Za-z-]{1,12}$/.test(sn)) return toast('학번은 숫자로 입력해 주세요.');
    config.profile = cleanProfile({ name: nm, school: sc, sno: sn }); syncStorage(); toast('내 정보를 저장했어요.');
  };
  ACTIONS['auth-mode'] = el => { authMode = el.dataset.m; renderAuth(); };
  function authRoleChange() {
    const g = $('auGrade'), sn = $('auSno'), sc = $('auSchool'); if (!g || !sn) return;
    const t = g.value === 'teacher'; sn.style.display = t ? 'none' : ''; if (t) sn.value = '';
    if (sc) sc.placeholder = t ? '근무하는 학교 (예: 한빛중학교)' : '학교 (예: 한빛중학교)';
  }
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
    if (authMode === 'signup') { const gr = $('auGrade') && $('auGrade').value; if (!GRADE_NAMES[gr] && gr !== 'teacher') return fail('학년이나 선생님을 골라 주세요. 학년에 맞는 단어를 추천해 드려요.');
      const nm = $('auName').value.trim(), sc = $('auSchool').value.trim(), sn = gr === 'teacher' ? '' : $('auSno').value.trim();
      if (!nm) return fail('이름을 입력해 주세요.');
      if (!sc) return fail('학교 이름을 입력해 주세요.');
      if (gr !== 'teacher' && !sn) return fail('학번을 입력해 주세요. (예: 2학년 3반 15번이면 20315)');
      if (sn && !/^[0-9A-Za-z-]{1,12}$/.test(sn)) return fail('학번은 숫자로 입력해 주세요. (예: 20315)');
      pendingGrade = gr; pendingProfile = cleanProfile({ name: nm, school: sc, sno: sn }); } else { pendingGrade = ''; pendingProfile = null; }
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
    if (pendingGrade) { if (pendingGrade === 'teacher') { config.role = 'teacher'; config.grade = ''; } else { config.role = ''; config.grade = pendingGrade; } pendingGrade = ''; applied = false; }
    if (pendingProfile) { config.profile = pendingProfile; pendingProfile = null; applied = false; }
    recShown = false; applyTheme(); if (!applied) syncStorage(); go('tabHome'); if (profileMissing()) profileCheck(); else showOnboarding(); rmCheck(); setTimeout(shareCheck, 700);
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
    const json = JSON.stringify({ categories, stats, cfg: { ttsRate: config.ttsRate, goal: config.goal, darkMode: config.darkMode, provider: config.provider, grade: config.grade, role: config.role || '', profile: config.profile || cleanProfile() } });
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
      if (d.cfg.role !== undefined) config.role = d.cfg.role === 'teacher' ? 'teacher' : '';
      if (d.cfg.profile) config.profile = cleanProfile(d.cfg.profile);
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

  /* =========================================================
   * 레벨 테스트 · 맞춤 시작
   * ======================================================= */
  const LT_BANK = [
    [["apple","사과"],["friend","친구"],["happy","행복한"],["school","학교"],["water","물"],["family","가족"],["morning","아침"],["travel","여행하다"],["bright","밝은"],["borrow","빌리다"]],
    [["improve","향상시키다"],["decide","결정하다"],["expensive","비싼"],["ordinary","평범한"],["advice","조언"],["habit","습관"],["support","지지하다"],["prepare","준비하다"],["environment","환경"],["communicate","의사소통하다"]],
    [["reluctant","꺼리는"],["ambiguous","모호한"],["inevitable","피할 수 없는"],["authentic","진짜의"],["enhance","높이다"],["restrict","제한하다"],["acquire","습득하다"],["tolerate","참아내다"],["controversy","논란"],["prosperity","번영"]],
    [["ubiquitous","어디에나 있는"],["ephemeral","덧없는"],["pragmatic","실용적인"],["meticulous","꼼꼼한"],["scrutinize","면밀히 조사하다"],["alleviate","덜어주다"],["exacerbate","악화시키다"],["indigenous","토착의"],["ostensible","표면상의"],["scarce","드문, 부족한"]]
  ];
  const LT_LV = [
    { name: '입문', goal: 10, desc: '기초 단어부터 차근차근 시작해요.' },
    { name: '초급', goal: 10, desc: '일상 단어는 익숙해요. 핵심 단어를 늘려가요.' },
    { name: '중급', goal: 20, desc: '탄탄한 기본기가 있어요. 꾸준히 확장해요.' },
    { name: '상급', goal: 30, desc: '어려운 단어도 잘 알고 있어요. 고난도에 도전해요.' },
    { name: '최상급', goal: 50, desc: '최상위 수준이에요. 고난도 단어로 완성해요.' }
  ];
  const ltKey = () => 'vocapro_level:' + currentUser;
  let LT = null;
  function ltBuild() {
    const qs = [];
    LT_BANK.forEach((pool, lv) => {
      shuffled(pool.slice()).slice(0, 3).forEach(([w, m]) => {
        const wrong = shuffled(pool.filter(x => x[1] !== m)).slice(0, 3).map(x => x[1]);
        qs.push({ lv, w, m, opts: shuffled([m, ...wrong]) });
      });
    });
    return qs;
  }
  function ltOpen(intro) {
    if ($('ltOv')) return;
    LT = { qs: ltBuild(), i: 0, ok: [0, 0, 0, 0], locked: false };
    const ov = document.createElement('div'); ov.className = 'ob lt'; ov.id = 'ltOv'; document.body.appendChild(ov);
    ltIntro(ov, intro);
  }
  function ltIntro(ov, intro) {
    ov.innerHTML = `<button class="ob-skip" data-lt="close">${intro ? '나중에 할게요' : '닫기'}</button>
      <div class="ob-body"><div class="ob-art">${MASCOT('think')}</div><h2>내 영어 수준 알아보기</h2>
      <p>12문제, 약 2분이면 끝나요.<br>결과에 맞춰 하루 목표와 시작 단어를 추천해 드려요.</p></div>
      <div class="ob-foot"><button class="btn btn-primary btn-block" data-lt="start">테스트 시작</button></div>`;
  }
  function ltDraw() {
    const ov = $('ltOv'); if (!ov || !LT) return;
    if (LT.i >= LT.qs.length) return ltResult();
    const q = LT.qs[LT.i];
    ov.innerHTML = `<button class="ob-skip" data-lt="close">그만하기</button>
      <div class="lt-bar"><i style="width:${Math.round(LT.i / LT.qs.length * 100)}%"></i></div>
      <div class="ob-body lt-q"><div class="muted" style="font-weight:700;margin-bottom:10px;">${LT.i + 1} / ${LT.qs.length}</div>
      <h2 style="font-size:2.1rem;">${esc(q.w)}</h2><p style="margin-bottom:22px;">이 단어의 뜻은?</p>
      <div class="opts" style="width:100%;">${q.opts.map((o, k) => `<button class="opt" data-lt="opt" data-v="${esc(o)}"><span class="opt-n">${k + 1}</span><span>${esc(o)}</span></button>`).join('')}</div></div>
      <div class="ob-foot"><button class="btn btn-soft btn-block" data-lt="opt" data-v="">잘 모르겠어요</button></div>`;
    LT.locked = false;
  }
  function ltAnswer(v) {
    if (!LT || LT.locked) return; LT.locked = true;
    const q = LT.qs[LT.i];
    if (v === q.m) LT.ok[q.lv]++;
    const ov = $('ltOv');
    ov.querySelectorAll('.opt').forEach(b => { if (b.dataset.v === q.m) b.classList.add('correct'); else if (b.dataset.v === v) b.classList.add('wrong'); });
    setTimeout(() => { if (LT) { LT.i++; ltDraw(); } }, v === q.m ? 450 : 900);
  }
  function ltLevel() { let r = 0; for (let l = 0; l < 4; l++) { if (LT.ok[l] >= 2) r++; else break; } return r; }
  function ltResult() {
    const ov = $('ltOv'); if (!ov) return;
    const r = ltLevel(), info = LT_LV[r], total = LT.ok.reduce((a, b) => a + b, 0);
    LT.r = r;
    try { LS.setItem(ltKey(), JSON.stringify({ lv: r, score: total, at: Date.now() })); } catch (e) {}
    ov.innerHTML = `<div class="ob-body"><div class="ob-art">${MASCOT('cheer')}</div>
      <div class="muted" style="font-weight:700;">내 수준은</div><h2 style="font-size:2.4rem;">${info.name}</h2>
      <p>${info.desc}<br>12문제 중 <b>${total}</b>문제를 맞혔어요.</p>
      <div class="card" style="width:100%;margin-top:22px;text-align:left;"><b>추천 하루 목표 ${info.goal}개</b><div class="muted" style="font-size:.85rem;margin-top:4px;">'${info.name} 시작 단어' 단어장 ${LT_BANK[Math.min(r, 3)].length}개도 만들어 드려요.</div></div></div>
      <div class="ob-foot"><button class="btn btn-primary btn-block" data-lt="apply">추천대로 시작하기</button>
      <button class="btn btn-soft btn-block" data-lt="goal" style="margin-top:8px;">목표만 적용하기</button></div>`;
  }
  function ltApply(withBook) {
    if (!LT || LT.r === undefined) return;
    const info = LT_LV[LT.r]; config.goal = info.goal;
    let id = null;
    if (withBook) {
      const nm = info.name + ' 시작 단어';
      let cat = categories.find(c => c.name === nm);
      if (!cat) {
        cat = { id: 'c' + uid(), name: nm, words: LT_BANK[Math.min(LT.r, 3)].map(([w, m]) => sanitizeWord({ id: uid(), word: w, meaning: m })) };
        categories.push(cat);
      }
      id = cat.id;
    }
    syncStorage(); const ov = $('ltOv'); if (ov) ov.remove(); LT = null;
    try { go(curTab); } catch (e) {}
    toast(withBook ? '추천 단어장을 만들었어요.' : '하루 목표를 ' + info.goal + '개로 바꿨어요.');
    if (id) { try { ACTIONS.start({ dataset: { mode: 'card', src: 'cat:' + id } }); } catch (e) {} }
  }
  document.addEventListener('click', e => {
    const b = e.target.closest && e.target.closest('#ltOv [data-lt]'); if (!b) return;
    const a = b.dataset.lt;
    if (a === 'close') { const ov = $('ltOv'); if (ov) ov.remove(); LT = null; }
    else if (a === 'start') ltDraw();
    else if (a === 'opt') ltAnswer(b.dataset.v);
    else if (a === 'apply') ltApply(true);
    else if (a === 'goal') ltApply(false);
  });
  ACTIONS['level-test'] = () => ltOpen(false);
  function ltEntryHtml() {
    let s = null; try { s = JSON.parse(LS.getItem(ltKey()) || 'null'); } catch (e) {}
    const t = s && LT_LV[s.lv] ? '내 수준: ' + LT_LV[s.lv].name + ' · 다시 테스트' : '내 영어 수준 알아보기';
    const sub = s ? '실력이 늘었다면 다시 측정해 보세요' : '12문제로 하루 목표와 시작 단어를 추천받아요';
    return `<button class="mg-entry" data-act="level-test"><span class="mg-ico i-coral">${IC.sprout}</span><span class="mg-txt"><b>${esc(t)}</b><small>${sub}</small></span><span class="mg-chev"></span></button>`;
  }

