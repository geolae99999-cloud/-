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
    $('authScreen').innerHTML = `<div class="auth-layout">${landingHtml()}<div class="auth-box">
      <div class="auth-hero">${MASCOT('happy')}</div>
      <div class="page-title" style="text-align:center;margin-bottom:6px;"><b>Voca</b>Pro</div>
      <p class="muted" style="text-align:center;margin:0 0 18px;">${su ? '새 계정을 만들어요' : '로그인하고 이어서 외워요'}</p>
      ${kidMode ? '<div class="kid-note"><b>만 14세 미만 계정</b>보호자와 함께 만들어 주세요. 단어장과 기록은 이 기기에만 저장되고 서버로 보내지 않아요.</div>' : ''}
      <div class="seg" style="margin-bottom:14px;"><button class="${su ? '' : 'on'}" data-act="auth-mode" data-m="login">로그인</button><button class="${su ? 'on' : ''}" data-act="auth-mode" data-m="signup">회원가입</button></div>
      ${su && cloudAvail && !kidMode ? `<div class="seg age-seg" style="margin-bottom:12px;"><button class="${ageOk ? 'on' : ''}" data-act="auth-age" data-k="0">만 14세 이상</button><button data-act="auth-age" data-k="1">만 14세 미만</button></div>` : ''}
      <div class="form-stack">
        <input type="text" id="auId" placeholder="아이디 (2~20자)" autocomplete="username" autocapitalize="none" spellcheck="false" maxlength="20">
        <input type="password" id="auPw" placeholder="비밀번호 (${cloudMode ? 6 : 4}자 이상)" autocomplete="${su ? 'new-password' : 'current-password'}">
        ${su ? `<input type="password" id="auPw2" placeholder="비밀번호 확인" autocomplete="new-password"><select id="auGrade" aria-label="학년 또는 선생님" data-change="auth-role"><option value="">학년 또는 선생님을 골라 주세요</option>${roleOptions('')}</select>
        <input type="text" id="auName" placeholder="이름" autocomplete="name" maxlength="20">
        <input type="text" id="auSchool" placeholder="학교 (예: 한빛중학교)" autocomplete="organization" maxlength="30">
        <input type="text" id="auSno" placeholder="학번 (예: 20315)" inputmode="numeric" maxlength="12">` : ''}
        ${authExtraHtml(su)}
        <label class="switch-row"><input type="checkbox" id="auKeep" checked> 로그인 유지</label>
        <div id="auMsg" style="display:none;color:var(--coral);font-weight:600;font-size:.85rem;"></div>
        <button class="btn btn-primary btn-block" id="auGo" data-act="auth-go">${su ? '가입하고 시작' : '로그인'}</button>
        ${cloudAvail ? `<button class="link-btn kid-link" data-act="auth-age" data-k="${kidMode ? 0 : 1}">${kidMode ? '만 14세 이상 계정으로 돌아가기' : (su ? '' : '이 기기의 어린이 계정(만 14세 미만)으로 로그인')}</button>` : ''}
        <p class="muted" style="font-size:.74rem;line-height:1.6;margin:4px 0 0;">${cloudMode ? '같은 아이디로 로그인하면 어느 기기에서든 단어장과 학습 기록이 이어져요. 비밀번호를 잊으면 복구할 수 없어요. API 키는 보안을 위해 기기마다 따로 입력해요.' : '계정은 이 기기의 브라우저에만 저장돼요. 다른 기기와 동기화되지 않고, 비밀번호를 잊으면 복구할 수 없으니 백업 파일을 받아 두세요.'}</p>
        <a class="link-btn lp-mobile-cta" href="#lpIntro">VocaPro가 처음이라면, 소개 영상 보기</a>
      </div></div></div>`;
    setTimeout(drawCaptcha, 0);
    landingVideo();
  }
  /* 첫 화면 소개: 광고 영상(media/ad.mp4)과 핵심 기능. PC에서는 왼쪽, 휴대폰에서는 로그인 아래에 보여요. */
  const LP_SRC = '<source src="media/ad.webm?v=2" type="video/webm"><source src="media/ad.mp4?v=2" type="video/mp4">';
  const LP_FEATS = [
    ['sparkles', '자동 완성', '단어만 넣으면 뜻·발음·예문까지'],
    ['cards', '10가지 학습', '카드, 퀴즈, 말하기, 게임'],
    ['repeat', '간격 반복', '잊을 때쯤 다시 복습'],
    ['users', '우리 반', '과제와 실시간 현황']
  ];
  function landingHtml() {
    return `<section class="lp" id="lpIntro" aria-label="VocaPro 소개">
      <div class="lp-brand"><img src="media/profile.png" alt="" width="36" height="36"><span><b>Voca</b>Pro</span></div>
      <h1 class="lp-h">단어,<br><em>끝까지</em> 외우다</h1>
      <p class="lp-sub">학교 수업용 AI 영어 단어장이에요. 내장 사전으로 뜻이 바로 채워지고, 매일 조금씩 복습해서 끝까지 외우게 도와줘요.</p>
      <div class="lp-video"><video id="lpVid" poster="media/ad-poster.jpg?v=2" muted loop playsinline preload="metadata" aria-label="VocaPro 소개 영상">${LP_SRC}</video></div>
      <ul class="lp-feats">${LP_FEATS.map(([ic, t, d]) => `<li>${IC[ic] || ''}<b>${t}</b><small>${d}</small></li>`).join('')}</ul>
      <p class="lp-foot">문의 vocaproe2@gmail.com</p>
    </section>`;
  }
  // 움직임 줄이기 설정이면 자동 재생하지 않고 첫 장면만 보여 줘요. 화면에 보일 때만 재생해요.
  function landingVideo() {
    const v = $('lpVid'); if (!v) return;
    const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    v.controls = reduce;
    if (reduce || !('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver(es => es.forEach(e => { if (!v.isConnected) return io.disconnect(); if (e.isIntersecting) { const p = v.play(); if (p && p.catch) p.catch(() => { v.controls = true; }); } else v.pause(); }), { threshold: .35 });
    io.observe(v);
  }
  // 어디서든 소개 영상 열기 (설정의 소개 카드)
  ACTIONS['about-video'] = () => {
    const ov = document.createElement('div'); ov.className = 'vid-ov'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-label', 'VocaPro 소개 영상');
    ov.innerHTML = `<button class="icon-btn" data-act="about-video-close" aria-label="닫기">${IC.x}</button><video poster="media/ad-poster.jpg?v=2" controls autoplay playsinline>${LP_SRC}</video>`;
    ov.addEventListener('click', e => { if (e.target === ov) ov.remove(); });
    document.body.appendChild(ov);
  };
  ACTIONS['about-video-close'] = () => { const o = document.querySelector('.vid-ov'); if (o) o.remove(); };
  document.addEventListener('keydown', e => { if (e.key === 'Escape') ACTIONS['about-video-close'](); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && document.querySelector('.vid-ov')) { e.stopImmediatePropagation(); ACTIONS['about-video-close'](); } }, true);
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
        <select id="pqRole" data-change="pq-role" aria-label="학년 또는 선생님"><option value="">학년 또는 선생님을 골라 주세요</option>${roleOptions(role)}</select>
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
    config = loadConfig(); loadDb(); applyLang();
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
      try { await Cloud.call('voca_class_forget'); } catch (e) {}
      try { await Cloud.call('voca_game_forget'); } catch (e) {}
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
    const json = JSON.stringify({ ...dataBlob(), cfg: { ...ttsCfgOut(), goal: config.goal, darkMode: config.darkMode, provider: config.provider, grade: config.grade, role: config.role || '', profile: config.profile || cleanProfile() } });
    if (json.length > 900000) toast('데이터가 서버 저장 한도(약 1MB)에 가까워요. 단어장을 줄이거나 백업해 두세요.');
    try { await Cloud.save({ data: json, updated: +LS.getItem(KEY_DATA + ':ts') || Date.now() }); clReport(); }
    catch (e) { toast('서버 저장에 실패했어요. 인터넷을 확인하세요. (' + (e.code || e.message) + ')'); }
  }
  function applyRemote(r) {
    const d = JSON.parse(r.data);
    useBlob(d);
    if (d.cfg) {
      config.ttsRate = parseFloat(d.cfg.ttsRate) || config.ttsRate; ttsCfgIn(config, d.cfg); config.goal = parseInt(d.cfg.goal, 10) || config.goal;
      config.darkMode = !!d.cfg.darkMode; if (PROVIDERS[d.cfg.provider]) config.provider = d.cfg.provider;
      if (GRADE_NAMES[d.cfg.grade]) config.grade = d.cfg.grade;
      if (d.cfg.role !== undefined) config.role = d.cfg.role === 'teacher' ? 'teacher' : '';
      if (d.cfg.profile) config.profile = cleanProfile(d.cfg.profile);
    }
    LS.setItem(KEY_DATA, JSON.stringify(dataBlob())); LS.setItem(KEY_CFG, JSON.stringify(config)); LS.setItem(KEY_DATA + ':ts', String(r.updated));
    applyTheme(); applyLang();
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

