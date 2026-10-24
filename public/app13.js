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
        else if (e.key === 'Enter') {
          const f = document.activeElement, b = f && ov.contains(f) && f.closest('[data-d]');
          e.preventDefault(); e.stopImmediatePropagation();
          if (b && b.dataset.d === '0') done(inp ? null : false); else done(inp ? inp.value : true);
        }
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
  let authMode = 'login', authStep = 1, pendingGrade = '', pendingProfile = null, ageOk = false;
  let auDraft = { id: '', pw: '', pw2: '', email: '', ecode: '', role: 'student', grade: '', school: '', scode: '', skind: '', name: '', sno: '', keep: true };
  const schCache = new Map();
  let schTimer = 0, schActivePfx = '', schItems = [], schIdx = -1;

  function saveAuDraft() {
    const v = id => $(id) ? $(id).value : null;
    if (v('auId') !== null) auDraft.id = v('auId');
    if (v('auPw') !== null) auDraft.pw = v('auPw');
    if (v('auPw2') !== null) auDraft.pw2 = v('auPw2');
    if (v('auEmail') !== null) auDraft.email = v('auEmail');
    if (v('auCode') !== null) auDraft.ecode = v('auCode');
    if (v('auSchool') !== null) auDraft.school = v('auSchool');
    if (v('auSchoolCode') !== null) auDraft.scode = v('auSchoolCode');
    if (v('auSchoolKind') !== null) auDraft.skind = v('auSchoolKind');
    if (v('auGrade') !== null) {
      const g = v('auGrade');
      if (g === 'teacher' || g === 'general') auDraft.role = g;
      else if (g) { auDraft.role = 'student'; auDraft.grade = g; }
    }
    if (v('auName') !== null) auDraft.name = v('auName');
    if (v('auSno') !== null) auDraft.sno = v('auSno');
    if ($('auKeep')) auDraft.keep = $('auKeep').checked;
  }

  function gradesForKind(kind) {
    const k = String(kind || '');
    if (/초등/.test(k)) return GRADES.filter(([c]) => c[0] === 'e');
    if (/중학/.test(k)) return GRADES.filter(([c]) => c[0] === 'm');
    if (/고등/.test(k)) return GRADES.filter(([c]) => c[0] === 'h');
    return GRADES;
  }

  function roleSchoolBlockHtml(pfx, st) {
    const isT = st.role === 'teacher', isG = st.role === 'general';
    const gVal = isT ? 'teacher' : isG ? 'general' : (st.grade || '');
    const gId = pfx === 'au' ? 'auGrade' : 'pqRole';
    const list = gradesForKind(st.skind);
    return `
      <div class="seg role-sw" id="${pfx}RoleSw">
        <button type="button" class="${isT || isG ? '' : 'on'}" data-act="role-pick" data-pfx="${pfx}" data-r="student">학생</button>
        <button type="button" class="${isT ? 'on' : ''}" data-act="role-pick" data-pfx="${pfx}" data-r="teacher">선생님</button>
        <button type="button" class="${isG ? 'on' : ''}" data-act="role-pick" data-pfx="${pfx}" data-r="general">일반</button>
      </div>
      <input type="hidden" id="${gId}" value="${esc(gVal)}">
      <p class="muted gen-note" id="${pfx}GenNote"${isG ? '' : ' hidden'}>학교 없이 혼자 영어를 공부해요. 여행 · 회화 · 토익처럼 목적에 맞춘 코스를 추천해 드려요.</p>
      <div class="sch-wrap" id="${pfx}SchWrap"${isG ? ' hidden' : ''}>
        <span class="sch-lbl" id="${pfx}SchLbl">${isT ? '근무하는 학교' : '학교'}</span>
        <div class="sch-in-box">
          ${IC.search}
          <input type="text" id="${pfx}School" value="${esc(st.school || '')}" placeholder="학교 이름 검색 (예: 한빛중)" autocomplete="off" maxlength="30" data-input="sch-input" data-pfx="${pfx}">
          <span class="sch-st" id="${pfx}SchSt">${st.scode ? `<span class="sch-ok">${IC.tick}</span>` : ''}</span>
        </div>
        <input type="hidden" id="${pfx}SchoolCode" value="${esc(st.scode || '')}">
        <input type="hidden" id="${pfx}SchoolKind" value="${esc(st.skind || '')}">
        <div class="sch-dd" id="${pfx}SchDd" hidden></div>
      </div>
      <div class="grade-grid3 au-hide" id="${pfx}GradeBox"${isT || isG ? ' hidden' : ''}>
        ${list.map(([k, n]) => `<button type="button" class="${st.grade === k ? 'on' : ''}" data-act="grade-btn-pick" data-pfx="${pfx}" data-g="${k}">${n}</button>`).join('')}
      </div>
      <div class="au-row2${isT || isG ? ' one' : ''}" id="${pfx}NameRow">
        <input type="text" id="${pfx}Name" value="${esc(st.name || '')}" placeholder="${isG ? '이름 또는 별명' : '이름'}" autocomplete="name" maxlength="20" aria-label="이름">
        <input type="text" id="${pfx}Sno" class="au-hide" value="${esc(isT || isG ? '' : (st.sno || ''))}" placeholder="학번 (예: 20315)" inputmode="numeric" maxlength="12" aria-label="학번"${isT || isG ? ' hidden' : ''}>
      </div>`;
  }

  function renderGradeGridFor(pfx) {
    const box = $(pfx + 'GradeBox'); if (!box) return;
    const gId = pfx === 'au' ? 'auGrade' : 'pqRole';
    const gIn = $(gId), kind = ($(pfx + 'SchoolKind') || {}).value || '';
    const list = gradesForKind(kind);
    let cur = gIn && gIn.value !== 'teacher' ? gIn.value : '';
    if (cur && !list.some(([k]) => k === cur)) { cur = ''; if (gIn) gIn.value = ''; }
    box.innerHTML = list.map(([k, n]) => `<button type="button" class="${cur === k ? 'on' : ''}" data-act="grade-btn-pick" data-pfx="${pfx}" data-g="${k}">${n}</button>`).join('');
  }

  ACTIONS['role-pick'] = el => {
    const pfx = el.dataset.pfx, isT = el.dataset.r === 'teacher', isG = el.dataset.r === 'general';
    const gId = pfx === 'au' ? 'auGrade' : 'pqRole';
    const sw = $(pfx + 'RoleSw');
    if (sw) sw.querySelectorAll('button').forEach(b => b.classList.toggle('on', b === el));
    const gBox = $(pfx + 'GradeBox'), sn = $(pfx + 'Sno'), row = $(pfx + 'NameRow'), lbl = $(pfx + 'SchLbl'), gIn = $(gId), sw2 = $(pfx + 'SchWrap'), gn = $(pfx + 'GenNote'), nm = $(pfx + 'Name');
    if (gBox) gBox.hidden = isT || isG;
    if (sw2) sw2.hidden = isG;
    if (gn) gn.hidden = !isG;
    if (nm) nm.placeholder = isG ? '이름 또는 별명' : '이름';
    if (sn) { sn.hidden = isT || isG; if (isT || isG) sn.value = ''; }
    if (row) row.classList.toggle('one', isT || isG);
    if (lbl) lbl.textContent = isT ? '근무하는 학교' : '학교';
    const s2t = document.querySelector('.au-s2-title'), s2s = document.querySelector('.au-s2-sub');
    if (pfx === 'au' && s2t) { s2t.textContent = isG ? '나에 대해 알려 주세요' : '어느 학교에 다니나요?'; if (s2s) s2s.textContent = isG ? '이름은 랭킹과 인사에만 쓰여요' : '우리 반 과제와 랭킹에 쓰여요'; }
    if (gIn) {
      if (isT) gIn.value = 'teacher';
      else if (isG) gIn.value = 'general';
      else {
        const onBtn = gBox && gBox.querySelector('button.on');
        gIn.value = onBtn ? onBtn.dataset.g : '';
      }
    }
    if (pfx === 'au') auDraft.role = isT ? 'teacher' : isG ? 'general' : 'student';
  };

  ACTIONS['grade-btn-pick'] = el => {
    const pfx = el.dataset.pfx, g = el.dataset.g;
    const gId = pfx === 'au' ? 'auGrade' : 'pqRole';
    const gBox = $(pfx + 'GradeBox'), gIn = $(gId);
    if (gBox) gBox.querySelectorAll('button').forEach(b => b.classList.toggle('on', b === el));
    if (gIn) gIn.value = g;
    if (pfx === 'au') { auDraft.grade = g; auDraft.role = 'student'; }
  };

  function schBadgeInfo(kind) {
    const k = String(kind || '');
    if (/초등/.test(k)) return ['초', 'k-e'];
    if (/중학/.test(k)) return ['중', 'k-m'];
    if (/고등/.test(k)) return ['고', 'k-h'];
    return ['특', 'k-s'];
  }
  function schHighlight(name, q) {
    const s = String(name || ''), t = String(q || '').trim();
    if (!t) return esc(s);
    const idx = s.toLowerCase().indexOf(t.toLowerCase());
    if (idx < 0) return esc(s);
    return esc(s.slice(0, idx)) + '<em>' + esc(s.slice(idx, idx + t.length)) + '</em>' + esc(s.slice(idx + t.length));
  }
  function schRenderDd(pfx, q, items, errMsg) {
    const dd = $(pfx + 'SchDd'); if (!dd) return;
    schActivePfx = pfx; schItems = items || []; schIdx = -1;
    if (errMsg) {
      dd.innerHTML = `<div class="sch-empty">${esc(errMsg)}</div><div class="sch-foot">학교 정보: 나이스 교육정보개방포털</div>`;
      dd.hidden = false;
      return;
    }
    if (!schItems.length) {
      dd.innerHTML = `<div class="sch-empty">검색 결과가 없어요. 쓴 이름 그대로 저장할 수 있어요.</div><div class="sch-foot">학교 정보: 나이스 교육정보개방포털</div>`;
      dd.hidden = false;
      return;
    }
    dd.innerHTML = schItems.map((it, i) => {
      const [ch, cls] = schBadgeInfo(it.kind);
      const meta = [it.region, it.found, it.coedu].filter(Boolean).join(' · ');
      return `<button type="button" class="sch-item" data-act="sch-pick" data-pfx="${pfx}" data-i="${i}">
        <span class="sch-badge ${cls}">${ch}</span>
        <span class="sch-txt"><b>${schHighlight(it.name, q)}</b><small>${esc(meta)}</small></span>
      </button>`;
    }).join('') + '<div class="sch-foot">학교 정보: 나이스 교육정보개방포털</div>';
    dd.hidden = false;
  }
  function schCloseDd(pfx) {
    const list = pfx ? [pfx] : ['au', 'pq'];
    list.forEach(p => { const dd = $(p + 'SchDd'); if (dd) dd.hidden = true; });
    schItems = []; schIdx = -1;
  }
  function schSelectItem(pfx, it) {
    if (!it) return;
    const inp = $(pfx + 'School'), cIn = $(pfx + 'SchoolCode'), kIn = $(pfx + 'SchoolKind'), st = $(pfx + 'SchSt');
    if (inp) inp.value = it.name;
    if (cIn) cIn.value = it.code || '';
    if (kIn) kIn.value = it.kind || '';
    if (st) st.innerHTML = `<span class="sch-ok">${IC.tick}</span>`;
    if (pfx === 'au') { auDraft.school = it.name; auDraft.scode = it.code || ''; auDraft.skind = it.kind || ''; }
    schCloseDd(pfx);
    renderGradeGridFor(pfx);
  }
  ACTIONS['sch-pick'] = el => {
    const pfx = el.dataset.pfx, it = schItems[+el.dataset.i];
    schSelectItem(pfx, it);
  };
  function schOnInput(el) {
    const pfx = el.dataset.pfx || 'au';
    const cIn = $(pfx + 'SchoolCode'), kIn = $(pfx + 'SchoolKind'), st = $(pfx + 'SchSt');
    if (cIn) cIn.value = '';
    if (kIn) kIn.value = '';
    if (st) st.innerHTML = '';
    renderGradeGridFor(pfx);
    clearTimeout(schTimer);
    if (!cloudMode || !(window.VOCA_CLOUD && VOCA_CLOUD.url && VOCA_CLOUD.apiKey)) {
      schCloseDd(pfx);
      return;
    }
    const q = el.value.replace(/\s+/g, ' ').trim();
    if (q.length < 2) { schCloseDd(pfx); return; }
    if (schCache.has(q)) {
      schRenderDd(pfx, q, schCache.get(q), '');
      return;
    }
    schTimer = setTimeout(async () => {
      const curIn = $(pfx + 'School');
      if (!curIn || curIn.value.replace(/\s+/g, ' ').trim() !== q) return;
      if (st) st.innerHTML = '<i class="sch-spin"></i>';
      try {
        const res = await fetch(VOCA_CLOUD.url.replace(/\/+$/, '') + '/functions/v1/school?q=' + encodeURIComponent(q), {
          headers: { apikey: VOCA_CLOUD.apiKey }
        });
        if (!res.ok) throw new Error('err');
        const data = await res.json();
        const items = Array.isArray(data && data.items) ? data.items.slice(0, 10) : [];
        schCache.set(q, items);
        if ($(pfx + 'School') && $(pfx + 'School').value.replace(/\s+/g, ' ').trim() === q) {
          if (st) st.innerHTML = '';
          schRenderDd(pfx, q, items, '');
        }
      } catch (e) {
        if ($(pfx + 'School') && $(pfx + 'School').value.replace(/\s+/g, ' ').trim() === q) {
          if (st) st.innerHTML = '';
          schRenderDd(pfx, q, [], '학교 검색이 잠시 안 돼요. 학교 이름을 그대로 써 주세요.');
        }
      }
    }, 300);
  }
  document.addEventListener('click', e => {
    if (!e.target.closest || !e.target.closest('.sch-wrap')) schCloseDd();
  });
  document.addEventListener('keydown', e => {
    const pfx = schActivePfx;
    const dd = pfx && $(pfx + 'SchDd');
    if (!dd || dd.hidden) return;
    const btns = [...dd.querySelectorAll('.sch-item')];
    if (e.key === 'ArrowDown') {
      e.preventDefault(); e.stopImmediatePropagation();
      if (!btns.length) return;
      schIdx = (schIdx + 1) % btns.length;
      btns.forEach((b, i) => b.classList.toggle('active', i === schIdx));
      if (btns[schIdx]) btns[schIdx].scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault(); e.stopImmediatePropagation();
      if (!btns.length) return;
      schIdx = (schIdx - 1 + btns.length) % btns.length;
      btns.forEach((b, i) => b.classList.toggle('active', i === schIdx));
      if (btns[schIdx]) btns[schIdx].scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Enter' && schIdx >= 0 && schItems[schIdx]) {
      e.preventDefault(); e.stopImmediatePropagation();
      schSelectItem(pfx, schItems[schIdx]);
    } else if (e.key === 'Escape') {
      e.preventDefault(); e.stopImmediatePropagation();
      schCloseDd(pfx);
    }
  }, true);

  function oauthButtonsHtml(su) {
    if (!cloudMode || kidMode) return '';
    const actTxt = su ? '시작' : '로그인';
    return `<div class="oauth-wrap">
      <div class="oauth-div">${su ? '간편 가입' : '간편 로그인'}</div>
      <button type="button" class="oauth-btn kakao" data-act="oauth" data-p="kakao">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#191919" d="M12 4C6.92 4 2.8 7.23 2.8 11.22c0 2.55 1.7 4.8 4.26 6.08l-.9 3.36c-.06.22.18.4.38.27l3.96-2.62c.49.07 1 .11 1.5.11 5.08 0 9.2-3.23 9.2-7.22S17.08 4 12 4z"/></svg>
        <span>카카오로 ${actTxt}</span>
      </button>
      <button type="button" class="oauth-btn google" data-act="oauth" data-p="google">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.4-.18-2.05H12v3.88h5.38a4.6 4.6 0 0 1-2 3.02v2.5h3.24c1.89-1.74 2.98-4.3 2.98-7.35z"/><path fill="#34A853" d="M12 22c2.7 0 4.96-.9 6.62-2.42l-3.24-2.5c-.9.6-2.04.95-3.38.95-2.6 0-4.8-1.76-5.58-4.12H3.07v2.58A10 10 0 0 0 12 22z"/><path fill="#FBBC05" d="M6.42 13.91a6.02 6.02 0 0 1 0-3.82V7.51H3.07a10 10 0 0 0 0 8.98l3.35-2.58z"/><path fill="#EA4335" d="M12 5.97c1.47 0 2.78.5 3.82 1.5l2.86-2.86C16.95 2.99 14.7 2 12 2A10 10 0 0 0 3.07 7.51l3.35 2.58C7.2 7.73 9.4 5.97 12 5.97z"/></svg>
        <span>구글로 ${actTxt}</span>
      </button>
    </div>`;
  }
  ACTIONS.oauth = el => {
    if (!cloudMode || !(window.VOCA_CLOUD && VOCA_CLOUD.url)) return;
    const p = el.dataset.p;
    location.href = VOCA_CLOUD.url.replace(/\/+$/, '') + '/functions/v1/oauth?p=' + encodeURIComponent(p) + '&r=' + encodeURIComponent(location.origin + location.pathname);
  };

  function authBoxInnerHtml() {
    const su = authMode === 'signup';
    const s2 = su && authStep === 2;
    return `
      ${s2 ? `<div class="au-s2-head">
        <button type="button" class="au-back-btn" data-act="auth-back">← 회원가입 2 / 2</button>
        <div class="au-step-bars"><i class="on"></i><i class="on"></i></div>
        <div class="au-s2-title">${auDraft.role === 'general' ? '나에 대해 알려 주세요' : '어느 학교에 다니나요?'}</div>
        <div class="au-s2-sub">${auDraft.role === 'general' ? '이름은 랭킹과 인사에만 쓰여요' : '우리 반 과제와 랭킹에 쓰여요'}</div>
      </div>` : `<div class="auth-hero">${MASCOT('happy')}</div>
      <div class="page-title" style="text-align:center;margin-bottom:6px;"><b>Voca</b>Pro</div>
      <p class="muted" style="text-align:center;margin:0 0 18px;">${su ? '새 계정을 만들어요 · 1 / 2' : '로그인하고 이어서 외워요'}</p>
      ${kidMode ? '<div class="kid-note"><b>만 14세 미만 계정</b>보호자와 함께 만들어 주세요. 단어장과 기록은 이 기기에만 저장되고 서버로 보내지 않아요.</div>' : ''}
      <div class="seg" style="margin-bottom:14px;"><button class="${su ? '' : 'on'}" data-act="auth-mode" data-m="login">로그인</button><button class="${su ? 'on' : ''}" data-act="auth-mode" data-m="signup">회원가입</button></div>
      ${su && cloudAvail && !kidMode ? `<div class="seg age-seg" style="margin-bottom:12px;"><button class="${ageOk ? 'on' : ''}" data-act="auth-age" data-k="0">만 14세 이상</button><button data-act="auth-age" data-k="1">만 14세 미만</button></div>` : ''}`}
      <div class="form-stack">
        <div class="form-stack au-s1-hid"${s2 ? ' hidden' : ''}>
          <input type="text" id="auId" value="${esc(auDraft.id)}" placeholder="아이디 (2~20자)" autocomplete="username" autocapitalize="none" spellcheck="false" maxlength="20">
          <input type="password" id="auPw" value="${esc(auDraft.pw)}" placeholder="비밀번호 (${cloudMode ? 6 : 4}자 이상)" autocomplete="${su ? 'new-password' : 'current-password'}">
          ${su ? `<input type="password" id="auPw2" value="${esc(auDraft.pw2)}" placeholder="비밀번호 확인" autocomplete="new-password">` : ''}
          ${su && cloudMode && !kidMode ? emailCodeHtml('au', auDraft.email, auDraft.ecode, 'signup') : ''}
        </div>
        ${s2 ? roleSchoolBlockHtml('au', auDraft) : ''}
        ${!su || s2 ? authExtraHtml(su) : ''}
        ${!su || s2 ? `<label class="switch-row"><input type="checkbox" id="auKeep" ${auDraft.keep !== false ? 'checked' : ''}> 로그인 유지</label>` : ''}
        <div id="auMsg" style="display:none;color:var(--coral);font-weight:600;font-size:.85rem;"></div>
        ${su && !s2
          ? `<button class="btn btn-primary btn-block" id="auNext" data-act="auth-next">다음</button>`
          : `<button class="btn btn-primary btn-block" id="auGo" data-act="auth-go">${su ? '가입 완료' : '로그인'}</button>`}
        ${!su && cloudMode && !kidMode ? '<button type="button" class="link-btn au-forgot" data-act="pw-forgot">아이디 · 비밀번호를 잊었어요</button>' : ''}
        ${!s2 ? oauthButtonsHtml(su) : ''}
        ${cloudAvail && !s2 ? `<button class="link-btn kid-link" data-act="auth-age" data-k="${kidMode ? 0 : 1}">${kidMode ? '만 14세 이상 계정으로 돌아가기' : (su ? '' : '이 기기의 어린이 계정(만 14세 미만)으로 로그인')}</button>` : ''}
        <p class="muted" style="font-size:.74rem;line-height:1.6;margin:4px 0 0;">${cloudMode ? '같은 아이디로 로그인하면 어느 기기에서든 단어장과 학습 기록이 이어져요. 비밀번호를 잊으면 등록한 이메일로 다시 정할 수 있어요.' : '계정은 이 기기의 브라우저에만 저장돼요. 다른 기기와 동기화되지 않고, 비밀번호를 잊으면 복구할 수 없으니 백업 파일을 받아 두세요.'}</p>
        <a class="link-btn lp-mobile-cta" href="#lpVidBox">VocaPro가 처음이라면, 소개 영상 보기</a>
        ${legalLinksHtml().replace('class="legal-links"', 'class="legal-links au-legal"')}
        <span class="my-ip"${myIp ? '' : ' hidden'}>${myIp ? '내 IP ' + esc(myIp) : ''}</span>
      </div>`;
  }

  function renderAuth() {
    if (!$('authBox')) {
      $('authScreen').innerHTML = `<div class="auth-layout">${landingHtml()}<div class="auth-box" id="authBox"></div></div>`;
      landingVideo();
    }
    $('authBox').innerHTML = authBoxInnerHtml();
    try {
      const oerr = sessionStorage.getItem('vocapro_oauth_err');
      if (oerr) {
        sessionStorage.removeItem('vocapro_oauth_err');
        const m = $('auMsg'); if (m) { m.textContent = oerr; m.style.display = 'block'; }
      }
    } catch (e) {}
    setTimeout(drawCaptcha, 0);
  }

  /* 5단계 · 웹 첫 화면 (로그인 전 소개) */
  const LP_SRC = '<source src="media/ad.webm?v=3" type="video/webm"><source src="media/ad.mp4?v=3" type="video/mp4">';
  const LP_CHIPS = ['자동 완성', '간격 반복 복습', '플래시카드', '받아쓰기', '발음 평가', '우리 반 과제', '퀴즈 게임', 'HSK 중국어', '시험지 인쇄'];
  const LP_FEATS = [
    ['sparkles', '자동 완성', '단어만 넣으면 뜻·발음·예문까지'],
    ['cards', '13가지 학습', '카드, 퀴즈, 받아쓰기, 말하기'],
    ['repeat', '간격 반복', '잊을 때쯤 다시 복습'],
    ['users', '우리 반', '과제와 실시간 현황']
  ];
  const LP_STEPS = ['눈으로 익히기', '뜻 떠올리기', '단어 떠올리기', '귀로 익히기', '손으로 쓰기', '문장 속에서', '확인 시험'];
  // 제목을 글자마다 나눠 하나씩 떠오르게 해요(화면 읽기 프로그램은 h1 의 aria-label 을 읽어요)
  const lpChars = (t, start) => [...t].map((c, i) => `<span class="lp-ch" style="--i:${start + i}">${c}</span>`).join('');
  // 첫 화면 모션: 스크롤하면 아래 내용이 차례로 나타나고, PC 에서는 데모 카드가 마우스를 따라 살짝 기울어요
  function landingMotion() {
    const root = $('lpIntro'); if (!root || root._motion) return; root._motion = true;
    const els = root.querySelectorAll('.lp-rv');
    // 로그인 화면이 숨겨진 채 그려진 직후에는 감시가 시작되지 않아서, 화면이 보인 다음에 감시를 시작해요
    const watch = () => {
      if (!root.isConnected) return;
      if (!root.offsetParent) return setTimeout(watch, 120);
      if (!('IntersectionObserver' in window)) return els.forEach(el => el.classList.add('in'));
      const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: .15 });
      els.forEach(el => io.observe(el));
    };
    setTimeout(watch, 60);
    const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    const fine = window.matchMedia && matchMedia('(hover: hover) and (pointer: fine)').matches;
    const stage = root.querySelector('.lp-demo-stage');
    if (!stage || reduce || !fine) return;
    let raf = 0;
    stage.addEventListener('pointermove', e => {
      const r = stage.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => { stage.style.setProperty('--ry', (x * 10).toFixed(2) + 'deg'); stage.style.setProperty('--rx', (-y * 8).toFixed(2) + 'deg'); });
    });
    stage.addEventListener('pointerleave', () => { cancelAnimationFrame(raf); stage.style.setProperty('--rx', '0deg'); stage.style.setProperty('--ry', '0deg'); });
  }
  function landingHtml() {
    const chips2 = LP_CHIPS.concat(LP_CHIPS).map(c => `<span class="lp-mq-chip">${c}</span>`).join('');
    return `<section class="lp" id="lpIntro" aria-label="VocaPro 소개">
      <div class="lp-aura" aria-hidden="true"><i></i><i></i><i></i></div>
      <div class="lp-brand"><img src="media/profile.png" alt="" width="36" height="36"><span><b>Voca</b>Pro</span></div>
      <h1 class="lp-h" aria-label="단어, 끝까지 외우다">
        <span class="lp-ln l1" aria-hidden="true">${lpChars('단어,', 0)}</span>
        <span class="lp-ln l2" aria-hidden="true"><em class="lp-hl">${lpChars('끝까지', 3)}</em> ${lpChars('외우다', 7)}</span>
      </h1>
      <p class="lp-sub lp-fade lp-d1">단어만 넣으면 뜻·발음·예문이 채워지고, 잊을 때쯤 다시 복습시켜 줘요. 학교 수업은 물론, 여행 · 회화 · 토익처럼 내 목적에 맞춰 공부하는 영어·중국어 단어장이에요.</p>
      <div class="lp-ctas lp-fade lp-d2">
        <button type="button" class="btn btn-primary" data-act="lp-start">무료로 시작하기 →</button>
        <a class="btn btn-soft" href="#lpVidBox">▶ 30초 영상</a>
      </div>
      <div class="lp-checks lp-fade lp-d3">
        <span><i>${IC.tick}</i>설치 없이 브라우저에서</span>
        <span><i>${IC.tick}</i>휴대폰·태블릿·PC</span>
      </div>
      <div class="lp-demo-stage lp-fade lp-d4" aria-hidden="true">
        <div class="lp-deco-sq"></div>
        <div class="lp-float-card">
          <div class="lp-fc-inner">
            <div class="lp-fc-f front"><small>CARD 12/30</small><b>consistent</b><span>[컨시스턴트]</span></div>
            <div class="lp-fc-f back"><small>뜻</small><b>형 일관된</b><span>외웠음 · 모름</span></div>
          </div>
        </div>
        <div class="lp-demo-panel">
          <div class="lp-dp-head"><span>단어 추가</span><span class="lp-dp-auto">자동 완성</span></div>
          <div class="lp-dp-input"><span class="lp-dp-type">persevere</span></div>
          <div class="lp-dp-rows">
            <div class="lp-dp-row r1"><em>뜻</em><span>동 끝까지 해내다</span></div>
            <div class="lp-dp-row r2"><em>발음</em><span>/ˌpɜːrsəˈvɪər/ [퍼서비어]</span></div>
            <div class="lp-dp-row r3"><em>예문</em><span>She persevered until the end.</span></div>
          </div>
        </div>
        <div class="lp-goal-badge">
          <svg class="lp-goal-ring" viewBox="0 0 48 48"><circle class="bg" cx="24" cy="24" r="20"/><circle class="fg" cx="24" cy="24" r="20"/></svg>
          <div class="lp-goal-txt"><b>오늘 목표 70%</b><span>14 / 20단어</span></div>
        </div>
      </div>
      <div class="lp-mq-wrap lp-fade lp-d4" aria-hidden="true"><div class="lp-mq-track">${chips2}</div></div>
      <div class="lp-video lp-rv" id="lpVidBox"><video id="lpVid" poster="media/ad-poster.jpg?v=3" autoplay muted loop playsinline preload="auto" aria-label="VocaPro 소개 영상">${LP_SRC}</video></div>
      <ul class="lp-feats lp-rv">${LP_FEATS.map(([ic, t, d]) => `<li>${IC[ic] || ''}<b>${t}</b><small>${d}</small></li>`).join('')}</ul>
      <div class="lp-dark-box lp-rv">
        <b>무엇부터 할지 고민하지 마세요</b>
        <p>처음 보는 단어를 시험 볼 수 있을 때까지 7단계로 안내해요</p>
        <div class="lp-step-chips">${LP_STEPS.map((s, i) => `<span class="${i === LP_STEPS.length - 1 ? 'last' : ''}">${i + 1}. ${s}</span>`).join('')}</div>
      </div>
      <p class="lp-foot">문의 vocaproe2@gmail.com</p>
    </section>`;
  }
  ACTIONS['lp-start'] = () => {
    saveAuDraft();
    authMode = 'signup'; authStep = 1;
    renderAuth();
    const box = $('authBox');
    if (box && box.scrollIntoView) box.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setTimeout(() => { const f = $('auId'); if (f) f.focus(); }, 300);
  };

  // 움직임 줄이기 설정이면 자동 재생하지 않고 첫 장면만 보여 줘요. 화면에 보일 때만 재생해요.
  function landingVideo() {
    landingMotion();
    const v = $('lpVid'); if (!v) return;
    // 소리 없는 소개 영상이라 항상 자동 재생해요. 움직임 줄이기 설정이면 멈출 수 있게 조작 버튼도 보여 줘요.
    const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    v.muted = true; v.controls = !!reduce;
    const p0 = v.play(); if (p0 && p0.catch) p0.catch(() => { v.controls = true; });
    if (!('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver(es => es.forEach(e => { if (!v.isConnected) return io.disconnect(); if (e.isIntersecting) { const p = v.play(); if (p && p.catch) p.catch(() => { v.controls = true; }); } else v.pause(); }), { threshold: .35 });
    io.observe(v);
  }
  // 어디서든 소개 영상 열기 (설정의 소개 카드)
  ACTIONS['about-video'] = () => {
    const ov = document.createElement('div'); ov.className = 'vid-ov'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-label', 'VocaPro 소개 영상');
    ov.innerHTML = `<button class="icon-btn" data-act="about-video-close" aria-label="닫기">${IC.x}</button><video poster="media/ad-poster.jpg?v=3" controls autoplay playsinline>${LP_SRC}</video><span class="vid-cap">VocaPro 소개 영상</span>`;
    ov.addEventListener('click', e => { if (e.target === ov) ov.remove(); });
    document.body.appendChild(ov);
  };
  ACTIONS['about-video-close'] = () => { const o = document.querySelector('.vid-ov'); if (o) o.remove(); };
  document.addEventListener('keydown', e => { if (e.key === 'Escape') ACTIONS['about-video-close'](); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && document.querySelector('.vid-ov')) { e.stopImmediatePropagation(); ACTIONS['about-video-close'](); } }, true);
  function showAuth() {
    authMode = cloudMode ? 'login' : (Object.keys(getUsers()).length ? 'login' : 'signup');
    authStep = 1;
    renderAuth();
    $('authScreen').style.display = 'flex';
    setTimeout(() => { const f = $('auId'); if (f) f.focus(); }, 100);
  }
  // 이름, 학교, 학번이 비어 있는 계정은 로그인하면 먼저 입력받아요
  const profileMissing = () => { const p = config.profile || {}; return isGeneral() ? !p.name : (!p.name || !p.school || (!isTeacher() && !p.sno)); };
  function profileCheck() {
    if (!currentUser || !profileMissing() || $('pfOv')) return;
    const p = config.profile || cleanProfile(), role = isTeacher() ? 'teacher' : isGeneral() ? 'general' : 'student';
    const ov = document.createElement('div'); ov.id = 'pfOv'; ov.className = 'dlg-ov pf-ov';
    ov.innerHTML = `<div class="dlg pf-dlg" role="dialog" aria-modal="true" aria-labelledby="pfT">
      <div class="pf-art">${MASCOT('happy')}</div>
      <h3 id="pfT">내 정보를 알려 주세요</h3>
      <p class="muted">학교에서 함께 쓰려면 이름, 학교, 학번이 필요해요. 학교에 다니지 않으면 '일반'을 골라 이름만 적어도 돼요. 내 앱 안에서만 쓰고 다른 사람에게 보여주지 않아요.</p>
      <div class="form-stack">
        ${roleSchoolBlockHtml('pq', { role, grade: config.grade || '', school: p.school || '', scode: p.scode || '', skind: '', name: p.name || '', sno: p.sno || '' })}
        <div id="pqMsg" class="pf-msg"></div>
        <button class="btn btn-primary btn-block" data-act="pq-save">저장하고 시작</button>
      </div></div>`;
    document.body.appendChild(ov);
    setTimeout(() => { const i = ov.querySelector('#pqSchool:placeholder-shown, #pqName'); if (i) i.focus(); }, 80);
  }
  function pqRoleChange() { const v = ($('pqRole') || {}).value, t = v === 'teacher' || v === 'general', sn = $('pqSno'); if (sn) { sn.hidden = t; if (t) sn.value = ''; } }
  ACTIONS['pq-save'] = () => {
    const role = ($('pqRole') || {}).value || '', gen = role === 'general', nm = ($('pqName') || {}).value.trim(), sc = gen ? '' : ($('pqSchool') || {}).value.trim(), scode = gen ? '' : (($('pqSchoolCode') || {}).value || '').trim(), sn = role === 'teacher' || gen ? '' : ($('pqSno') || {}).value.trim();
    const msg = t => { $('pqMsg').textContent = t; };
    if (!GRADE_NAMES[role] && role !== 'teacher' && !gen) return msg('학년이나 선생님을 골라 주세요. 학교에 다니지 않으면 \'일반\'을 골라 주세요.');
    if (!sc && !gen) return msg('학교 이름을 입력해 주세요.');
    if (!nm) return msg(gen ? '이름이나 별명을 입력해 주세요.' : '이름을 입력해 주세요.');
    if (role !== 'teacher' && !gen && !sn) return msg('학번을 입력해 주세요. (예: 2학년 3반 15번이면 20315)');
    if (sn && !/^[0-9A-Za-z-]{1,12}$/.test(sn)) return msg('학번은 숫자로 입력해 주세요.');
    if (role === 'teacher' || gen) { config.role = role; config.grade = ''; } else { config.role = ''; config.grade = role; }
    config.profile = cleanProfile({ name: nm, school: sc, sno: sn, scode }); syncStorage();
    $('pfOv').remove(); toast('내 정보를 저장했어요.'); go(curTab); showOnboarding(); recShown = false; recMaybeShow(); shareCheck();
  };
  ACTIONS['pf-save'] = () => {
    const gen = isGeneral(), nm = $('pfName').value.trim(), sc = $('pfSchool').value.trim(), sn = isTeacher() || gen ? '' : $('pfSno').value.trim();
    if (!nm) return toast('이름을 입력해 주세요.');
    if (!sc && !gen) return toast('학교 이름을 입력해 주세요.');
    if (!isTeacher() && !gen && !sn) return toast('학번을 입력해 주세요.');
    if (sn && !/^[0-9A-Za-z-]{1,12}$/.test(sn)) return toast('학번은 숫자로 입력해 주세요.');
    const prev = config.profile || {};
    config.profile = cleanProfile({ name: nm, school: sc, sno: sn, scode: prev.school === sc ? prev.scode : '' }); syncStorage(); toast('내 정보를 저장했어요.');
  };
  // ===== 이메일 인증코드 (가입 · 비밀번호 찾기 · 이메일 등록) =====
  const EMAIL_RE = /^[A-Za-z0-9._%+-]{1,64}@[A-Za-z0-9.-]{1,185}\.[A-Za-z]{2,24}$/;
  const emailCodeHtml = (pfx, email, code, purpose) => `<div class="em-row"><input type="email" id="${pfx}Email" value="${esc(email || '')}" placeholder="이메일 주소" autocomplete="email" autocapitalize="none" spellcheck="false" maxlength="254"><button type="button" class="btn btn-soft em-send" data-act="em-send" data-f="${pfx}Email" data-c="${pfx}Code" data-p="${purpose}">인증코드 받기</button></div>
    <input type="text" id="${pfx}Code" value="${esc(code || '')}" placeholder="인증코드 6자리" inputmode="numeric" autocomplete="one-time-code" maxlength="6">${purpose === 'signup' ? '<small class="em-hint">이메일은 비밀번호를 잊었을 때 다시 정하는 데만 써요.</small>' : ''}`;
  ACTIONS['em-send'] = async el => {
    const f = $(el.dataset.f), email = f ? f.value.trim().toLowerCase() : '';
    const box = el.closest('.dlg') ? el.closest('.dlg').querySelector('.dlg-msg') : $('auMsg');
    const msg = m => { if (box) { box.textContent = m; box.style.display = m ? 'block' : 'none'; } else if (m) toast(m); };
    if (!EMAIL_RE.test(email)) { msg('이메일 주소를 확인해 주세요.'); if (f) f.focus(); return; }
    if (el.disabled || !window.Cloud || !Cloud.sendCode) return;
    el.disabled = true; el.textContent = '보내는 중...';
    try {
      await Cloud.sendCode(email, el.dataset.p);
      msg(''); toast(`${email} 로 인증코드를 보냈어요. 메일함(스팸함도)을 확인해 주세요.`);
      const c = $(el.dataset.c); if (c) c.focus();
      let left = 60;
      const tick = () => { if (!el.isConnected) return; if (left <= 0) { el.disabled = false; el.textContent = '다시 받기'; return; } el.textContent = `다시 받기 ${left}초`; left--; setTimeout(tick, 1000); };
      tick();
    } catch (e) { el.disabled = false; el.textContent = '인증코드 받기'; msg(cloudMsg(e)); }
  };
  // 작은 입력 창 (비밀번호 찾기 · 이메일 등록)
  function emDialog(title, sub, bodyHtml, okText, onOk) {
    const ov = document.createElement('div'); ov.className = 'dlg-ov em-dlg';
    ov.innerHTML = `<div class="dlg" role="dialog" aria-modal="true" aria-label="${esc(title)}"><h3 class="em-t">${esc(title)}</h3><p class="em-s">${esc(sub)}</p><div class="form-stack">${bodyHtml}</div><div class="dlg-msg"></div><div class="row"><button class="btn btn-soft" style="flex:1" data-em="x">닫기</button><button class="btn btn-primary" style="flex:1" data-em="ok">${esc(okText)}</button></div></div>`;
    document.body.appendChild(ov);
    const close = () => ov.remove();
    const showMsg = m => { const b = ov.querySelector('.dlg-msg'); b.textContent = m; b.style.display = m ? 'block' : 'none'; };
    ov.addEventListener('click', async e => {
      const b = e.target.closest('[data-em]'); if (!b) { if (e.target === ov) close(); return; }
      if (b.dataset.em === 'x') return close();
      if (b.disabled) return; b.disabled = true;
      try { await onOk(ov, showMsg, close); } finally { if (b.isConnected) b.disabled = false; }
    });
    setTimeout(() => { const i = ov.querySelector('input'); if (i) i.focus(); }, 60);
    return ov;
  }
  ACTIONS['pw-forgot'] = () => {
    emDialog('아이디 · 비밀번호 찾기', '가입할 때 등록한 이메일로 인증코드를 보내요. 확인되면 아이디를 알려 주고 새 비밀번호로 바꿔요.',
      emailCodeHtml('fg', '', '', 'reset') + '<input type="password" id="fgPw" placeholder="새 비밀번호 (6자 이상)" autocomplete="new-password" maxlength="72"><input type="password" id="fgPw2" placeholder="새 비밀번호 확인" autocomplete="new-password" maxlength="72">',
      '바꾸기', async (ov, msg, close) => {
        const email = $('fgEmail').value.trim().toLowerCase(), code = $('fgCode').value.trim(), pw = $('fgPw').value;
        if (!EMAIL_RE.test(email)) return msg('이메일 주소를 확인해 주세요.');
        if (!/^\d{6}$/.test(code)) return msg('이메일로 받은 인증코드 6자리를 입력해 주세요.');
        if (pw.length < 6) return msg('새 비밀번호는 6자 이상이어야 해요.');
        if (pw !== $('fgPw2').value) return msg('새 비밀번호 확인이 달라요.');
        let r; try { r = await Cloud.resetPw(email, code, pw); } catch (e) { return msg(cloudMsg(e)); }
        close();
        saveAuDraft(); auDraft.id = r.username || auDraft.id; auDraft.pw = ''; authMode = 'login'; renderAuth();
        // 로그인 화면 위에서는 확인 창이 가려져서, 로그인 카드 안에 바로 알려 줘요.
        const m = $('auMsg'); if (m) { m.textContent = `비밀번호를 바꿨어요. 아이디는 '${r.username}' 예요. 새 비밀번호로 로그인해 주세요.`; m.style.color = 'var(--green, #16a34a)'; m.style.display = 'block'; }
        const pf = $('auPw'); if (pf) pf.focus();
      });
  };
  async function acctEmailLoad() {
    const row = $('acctEmail'); if (!row) return;
    if (!cloudMode || !window.Cloud || !Cloud.myEmail || !currentUser) { row.hidden = true; return; }
    row.hidden = false;
    let em = null; try { em = (await Cloud.myEmail()).email; } catch (e) { $('acctEmailTxt').textContent = '불러오지 못했어요'; return; }
    $('acctEmailTxt').textContent = em || '등록 안 함 · 등록하면 비밀번호를 잊어도 다시 정할 수 있어요';
    const b = row.querySelector('button'); if (b) b.textContent = em ? '변경' : '등록';
  }
  ACTIONS['email-link'] = () => emDialog('이메일 등록', '비밀번호를 잊었을 때 이 이메일로 다시 정할 수 있어요. 받은 인증코드를 넣어 주세요.', emailCodeHtml('lk', '', '', 'link'), '등록', async (ov, msg, close) => {
    const email = $('lkEmail').value.trim().toLowerCase(), code = $('lkCode').value.trim();
    if (!EMAIL_RE.test(email)) return msg('이메일 주소를 확인해 주세요.');
    if (!/^\d{6}$/.test(code)) return msg('이메일로 받은 인증코드 6자리를 입력해 주세요.');
    try { await Cloud.linkEmail(email, code); } catch (e) { return msg(cloudMsg(e)); }
    close(); toast('이메일을 등록했어요.'); acctEmailLoad();
  });
  ACTIONS['auth-mode'] = el => { saveAuDraft(); authMode = el.dataset.m; authStep = 1; renderAuth(); };
  ACTIONS['auth-back'] = () => { saveAuDraft(); authStep = 1; renderAuth(); };
  ACTIONS['auth-next'] = () => {
    saveAuDraft();
    const fail = m => { const e = $('auMsg'); if (e) { e.textContent = m; e.style.display = 'block'; } };
    const id = auDraft.id.trim(), pw = auDraft.pw, pw2 = auDraft.pw2;
    if (cloudMode && !ageOk) return fail('만 14세 이상인지 골라 주세요. 만 14세 미만은 이 기기에만 저장하는 계정으로 만들어요.');
    if (!/^[\w가-힣-]{2,20}$/.test(id)) return fail('아이디는 2~20자의 한글, 영문, 숫자, _, - 만 쓸 수 있어요.');
    const minLen = cloudMode ? 6 : 4;
    if (pw.length < minLen) return fail(`비밀번호는 ${minLen}자 이상이어야 해요.`);
    if (pw !== pw2) return fail('비밀번호 확인이 달라요.');
    if (!cloudMode && getUsers()[id.toLowerCase()]) return fail('이미 있는 아이디예요.');
    if (cloudMode && !kidMode) {
      if (!EMAIL_RE.test(auDraft.email.trim())) return fail('이메일 주소를 확인해 주세요.');
      if (!/^\d{6}$/.test(auDraft.ecode.trim())) return fail('이메일로 받은 인증코드 6자리를 입력해 주세요.');
    }
    authStep = 2; renderAuth();
    setTimeout(() => { const f = $('auSchool'); if (f) f.focus(); }, 60);
  };
  function authRoleChange() {
    const g = $('auGrade'), sn = $('auSno'), sc = $('auSchool'); if (!g || !sn) return;
    const t = g.value === 'teacher'; sn.hidden = t; if (t) sn.value = '';
    if (sc) sc.placeholder = '학교 이름 검색 (예: 한빛중)';
  }
  ACTIONS['auth-age'] = el => {
    saveAuDraft();
    const kid = el.dataset.k === '1';
    if (kid) { setKidMode(true); if (!Object.keys(getUsers()).length) authMode = 'signup'; authStep = 1; }
    else if (kidMode) { setKidMode(false); authStep = 1; }
    else ageOk = true;
    renderAuth();
  };
  ACTIONS['auth-go'] = async () => {
    if (authMode === 'signup' && authStep === 1) return ACTIONS['auth-next']();
    saveAuDraft();
    const btn = $('auGo'); if (!btn || btn.disabled) return;
    const fail = m => {
      const e = $('auMsg'); e.textContent = m; e.style.color = 'var(--coral)'; e.style.display = 'block'; btn.disabled = false;
      if (authMode !== 'signup' && !/보안문자|동의/.test(m)) { authFails++; if (authFails >= 3) { const cb = $('capBox'); if (cb) cb.style.display = 'block'; drawCaptcha(); } }
    };
    { const g = authGate(); if (g) return fail(g); }
    if (authMode === 'signup') {
      const gr = $('auGrade') && $('auGrade').value;
      const sc = ($('auSchool') || {}).value.trim(), scode = (($('auSchoolCode') || {}).value || '').trim();
      const gen = gr === 'general', nm = ($('auName') || {}).value.trim(), sn = gr === 'teacher' || gen ? '' : ($('auSno') || {}).value.trim();
      if (!sc && !gen) return fail('학교 이름을 입력해 주세요.');
      if (!GRADE_NAMES[gr] && gr !== 'teacher' && !gen) return fail('학년이나 선생님을 골라 주세요. 학교에 다니지 않으면 \'일반\'을 골라 주세요.');
      if (!nm) return fail(gen ? '이름이나 별명을 입력해 주세요.' : '이름을 입력해 주세요.');
      if (gr !== 'teacher' && !gen && !sn) return fail('학번을 입력해 주세요. (예: 2학년 3반 15번이면 20315)');
      if (sn && !/^[0-9A-Za-z-]{1,12}$/.test(sn)) return fail('학번은 숫자로 입력해 주세요. (예: 20315)');
      pendingGrade = gr; pendingProfile = cleanProfile(gen ? { name: nm } : { name: nm, school: sc, sno: sn, scode });
    } else { pendingGrade = ''; pendingProfile = null; }
    if (cloudMode) {
      const email = $('auId').value.trim(), pw0 = $('auPw').value, keep0 = $('auKeep').checked, su0 = authMode === 'signup';
      if (!/^[\w가-힣-]{2,20}$/.test(email)) return fail('아이디는 2~20자의 한글, 영문, 숫자, _, - 만 쓸 수 있어요.');
      if (pw0.length < 6) return fail('비밀번호는 6자 이상이어야 해요.');
      if (su0 && pw0 !== $('auPw2').value) return fail('비밀번호 확인이 달라요.');
      if (su0 && !ageOk) return fail('만 14세 이상인지 골라 주세요. 만 14세 미만은 이 기기에만 저장하는 계정으로 만들어요.');
      btn.disabled = true;
      try {
        if (!window.Cloud) throw { code: 'offline' };
        const u = su0 ? await Cloud.signupEmail(email, pw0, auDraft.email.trim().toLowerCase(), auDraft.ecode.trim(), keep0) : await Cloud.login(email, pw0, keep0);
        if (su0) { auDraft.email = auDraft.ecode = ''; try { sessionStorage.setItem('vocapro_just_signed_up', '1'); } catch (e) {} }
        let remote = null, stale = false;
        try { remote = await Cloud.load(); } catch (e) { stale = true; toast('서버에서 불러오지 못해 이 기기의 저장본을 써요.'); }
        enterApp(u.uid, remote, u.email, stale);
      } catch (e) {
        // 이메일 · 인증코드 · 아이디 문제는 첫 단계에서 고쳐야 해서 1단계로 돌아가요.
        if (su0 && e && /^(bad_code|email_taken|exists)$/.test(e.code)) { saveAuDraft(); if (e.code === 'bad_code') auDraft.ecode = ''; authStep = 1; renderAuth(); const m = $('auMsg'); if (m) { m.textContent = cloudMsg(e); m.style.display = 'block'; } return; }
        fail(cloudMsg(e));
      }
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
        // 예전 약한 해시로 만든 계정은 맞게 로그인했을 때 PBKDF2로 바꿔 저장해요.
        if (u.m !== 'p' && hasCrypto()) { try { u.m = 'p'; u.s = Math.random().toString(36).slice(2) + Date.now().toString(36); u.h = await hashPw(pw, u.s, 'p'); saveUsers(users); } catch (e) {} }
      }
    } catch (e) { return fail(e.message || '오류가 발생했어요.'); }
    try { LS.removeItem(KEY_SESS); sessionStorage.removeItem(KEY_SESS); (keep ? LS : sessionStorage).setItem(KEY_SESS, key); if (su) sessionStorage.setItem('vocapro_just_signed_up', '1'); } catch (e) {}
    enterApp(key);
  };
  // 서버에서 불러오지 못한 채 열었으면(cloudStale) 서버 사본을 다시 확인하기 전에는 올리지 않아요. 빈 기기 데이터가 서버를 덮어쓰는 것을 막아요.
  let cloudStale = false, cloudBaseTs = 0;
  // 방문 기록: 서버(voca_visit)에 IP · 시각 · 회원을 남기고, 돌려받은 내 IP를 화면(.my-ip)에 보여 줘요.
  let myIp = '';
  function showMyIp() { document.querySelectorAll('.my-ip').forEach(e => { e.textContent = myIp ? '내 IP ' + myIp : ''; e.hidden = !myIp; }); }
  async function trackVisit() {
    if (!cloudMode || !window.Cloud || !Cloud.visit) return;
    try { const ip = await Cloud.visit(); if (typeof ip === 'string' && /^[0-9a-fA-F:.]{3,64}$/.test(ip)) myIp = ip; } catch (e) {}
    showMyIp();
  }
  function enterApp(key, remote, label, stale) {
    currentUser = key; currentLabel = label || key; KEY_DATA = 'vocapro_v11_data:' + key; KEY_CFG = 'vocapro_v10_cfg:' + key;
    if (cloudMode) trackVisit();
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
    cloudStale = !!(cloudMode && stale); cloudBaseTs = +LS.getItem(KEY_DATA + ':ts') || 0;
    if (remote && remote.updated > (+LS.getItem(KEY_DATA + ':ts') || 0)) { try { applyRemote(remote); applied = true; } catch (e) { toast('서버 데이터를 읽지 못했어요.'); } }
    if (pendingGrade) { if (pendingGrade === 'teacher' || pendingGrade === 'general') { config.role = pendingGrade; config.grade = ''; } else { config.role = ''; config.grade = pendingGrade; } pendingGrade = ''; applied = false; }
    if (pendingProfile) { config.profile = pendingProfile; pendingProfile = null; applied = false; }
    recShown = false; applyTheme(); if (!applied) syncStorage(); let isNew0 = false; try { isNew0 = sessionStorage.getItem('vocapro_just_signed_up') === '1'; } catch (e) {} setTimeout(() => refSync(isNew0), 400); go('tabHome'); if (profileMissing()) profileCheck(); else showOnboarding(); rmCheck(); setTimeout(shareCheck, 700);
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
  // 공용 컴퓨터: 서버에 다 올라간 걸 확인한 뒤 이 기기에 남은 이 계정의 단어 · 설정 · 기록을 지워요.
  ACTIONS['logout-wipe'] = async () => {
    if (!cloudMode || !currentUser) return ACTIONS.logout();
    if (!await ask('이 기기에 저장된 내 단어, 설정, 기록을 지우고 로그아웃해요. 서버에 저장된 건 그대로라 다시 로그인하면 돌아와요.', { ok: '지우고 로그아웃' })) return;
    await cloudPush();
    if (LS.getItem(KEY_DATA + ':dirty')) return say('서버 저장이 끝나지 않아 지우지 않았어요. 인터넷을 확인하고 다시 눌러 주세요.');
    const u = currentUser;
    try {
      const del = [];
      for (let i = 0; i < LS.length; i++) { const k = LS.key(i); if (k && (k.endsWith(':' + u) || k.includes(':' + u + ':') || k === AIC_KEY || k === 'vocapro_last_label')) del.push(k); }
      del.forEach(k => LS.removeItem(k)); aiCache = null;
    } catch (e) {}
    await ACTIONS.logout();
    toast('이 기기에서 지웠어요.');
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
    if (/too_many_signups/.test((e && e.message) || '')) return '지금 가입하는 사람이 너무 많아 잠시 막혔어요. 잠시 후 다시 해 주세요.';
    if (c === 'server' && e.message) return '서버에서 오류가 났어요: ' + String(e.message).slice(0, 120);
    if (c === 'bad_code') return '인증코드가 맞지 않거나 시간이 지났어요. 코드를 다시 받아 주세요.';
    return ({ email_taken: '이미 가입된 이메일이에요. 로그인 화면의 \'아이디 · 비밀번호를 잊었어요\'를 눌러 주세요.', too_many: '인증코드를 너무 자주 보냈어요. 1분쯤 뒤에 다시 해 주세요.', send_failed: '메일을 보내지 못했어요. 주소를 확인하고 다시 해 주세요.', config: '이메일 인증이 아직 준비되지 않았어요. 잠시 후 다시 해 주세요.', exists: '이미 있는 아이디예요.', invalid: '아이디 또는 비밀번호가 맞지 않아요.', locked: '비밀번호를 여러 번 틀려서 10분간 잠겼어요. 잠시 후 다시 해 주세요.',
      bad_input: '아이디(2~20자)와 비밀번호(6자 이상)를 확인해 주세요.', auth: '로그인이 만료됐어요. 다시 로그인해 주세요.', network: '인터넷 연결을 확인해 주세요.',
      server: '서버 설정에 문제가 있어요. SQL을 실행했는지, config.js 값이 맞는지 확인해 주세요.', offline: '서버에 연결하지 못했어요. 잠시 후 다시 해 주세요.' })[c] || ('오류: ' + (c || (e && e.message) || '알 수 없음'));
  }
  function cloudQueue() { if (!cloudMode || !window.Cloud || !currentUser) return; clearTimeout(cloudTimer); cloudTimer = setTimeout(cloudPush, 1500); }
  // 서버에 아직 못 올린 변경이 있는지(:dirty) — 저장 실패 후에도 기기에 남아 있어 다시 시도해요
  const cloudDirty = () => { try { return !!LS.getItem(KEY_DATA + ':dirty'); } catch (e) { return false; } };
  async function cloudPush(ka) {
    clearTimeout(cloudTimer); cloudTimer = null;
    if (!cloudMode || !window.Cloud || !currentUser || !Cloud.user()) return;
    if (cloudStale) {
      let r; try { r = await Cloud.load(); } catch (e) { cloudTimer = setTimeout(cloudPush, 30000); return; }
      cloudStale = false;
      if (r && r.updated > cloudBaseTs) { applyRemote(r); if (!(S && S.active)) go(curTab); toast('서버에 더 새로운 저장본이 있어 그걸 불러왔어요.'); return; }
    }
    const json = JSON.stringify({ ...dataBlob(), cfg: { ...ttsCfgOut(), goal: config.goal, darkMode: config.darkMode, provider: config.provider, aiv: 2, grade: config.grade, role: config.role || '', profile: config.profile || cleanProfile(), gameName: config.gameName || '', haptic: config.haptic !== false, kpronEn: config.kpronEn !== false, kpronZh: config.kpronZh !== false, studyCount: config.studyCount, guide: cleanGuide(config.guide), course: cleanCourse(config.course) } });
    if (json.length > 900000) toast('데이터가 서버 저장 한도(약 1MB)에 가까워요. 단어장을 줄이거나 백업해 두세요.');
    const up = +LS.getItem(KEY_DATA + ':ts') || Date.now(), key = KEY_DATA;
    // 페이지를 떠날 때는 keepalive로 최대한 보내요(본문 64KB 제한이 있어 작을 때만)
    try { await Cloud.save({ data: json, updated: up }, { keepalive: ka === true && json.length < 60000 }); if ((+LS.getItem(key + ':ts') || 0) === up) LS.removeItem(key + ':dirty'); clReport(); }
    catch (e) { toast('서버 저장에 실패했어요. 인터넷을 확인하세요. (' + (e.code || e.message) + ')'); }
  }
  function applyRemote(r) {
    const d = JSON.parse(r.data);
    useBlob(d);
    if (d.cfg) {
      config.ttsRate = parseFloat(d.cfg.ttsRate) || config.ttsRate; ttsCfgIn(config, d.cfg); config.goal = parseInt(d.cfg.goal, 10) || config.goal;
      config.darkMode = !!d.cfg.darkMode; if (typeof d.cfg.haptic === 'boolean') config.haptic = d.cfg.haptic;
      if (typeof d.cfg.kpronEn === 'boolean') config.kpronEn = d.cfg.kpronEn;
      if (typeof d.cfg.kpronZh === 'boolean') config.kpronZh = d.cfg.kpronZh;
      if (Number.isFinite(+d.cfg.studyCount)) { config.studyCount = Math.max(0, Math.min(500, Math.floor(+d.cfg.studyCount))); studyPrefs.count = config.studyCount; }
      if (d.cfg.guide && typeof d.cfg.guide === 'object') config.guide = cleanGuide(d.cfg.guide);
      if (d.cfg.course !== undefined) config.course = cleanCourse(d.cfg.course);
      if (PROVIDERS[d.cfg.provider] && d.cfg.aiv === 2) config.provider = d.cfg.provider;
      if (GRADE_NAMES[d.cfg.grade]) config.grade = d.cfg.grade;
      if (d.cfg.role !== undefined) config.role = d.cfg.role === 'teacher' || d.cfg.role === 'general' ? d.cfg.role : '';
      if (d.cfg.profile) config.profile = cleanProfile(d.cfg.profile);
      if (d.cfg.gameName) config.gameName = String(d.cfg.gameName).replace(/[\u0000-\u001f<>]/g, '').slice(0, 12);
    }
    LS.setItem(KEY_DATA, JSON.stringify(dataBlob())); LS.setItem(KEY_CFG, JSON.stringify(config)); LS.setItem(KEY_DATA + ':ts', String(r.updated)); LS.removeItem(KEY_DATA + ':dirty');
    applyTheme(); applyLang();
  }
  // 단어를 붙잡고 있는 화면(4단계·게임·발표)이 열려 있으면 서버 사본으로 바꾸지 않아요
  const wordOvOpen = () => ['flOv', 'wqOv', 'rnOv', 'mgOv', 'pvOv'].some(i => $(i));
  async function cloudPull() {
    if (!cloudMode || !window.Cloud || !currentUser || cloudTimer || !Cloud.user()) return;
    if (cloudDirty()) return cloudPush(); // 못 올린 변경이 먼저 — 서버 사본으로 덮지 않아요(stale이면 cloudPush가 서버 사본부터 확인)
    if ((S && S.active) || $('sheetOv').classList.contains('open') || wordOvOpen()) return;
    try {
      const r = await Cloud.load();
      if (cloudStale) { cloudStale = false; if (r && r.updated > cloudBaseTs) { applyRemote(r); go(curTab); toast('서버의 저장본을 불러왔어요.'); } else cloudQueue(); return; }
      if (r && r.updated > (+LS.getItem(KEY_DATA + ':ts') || 0)) { applyRemote(r); go(curTab); toast('다른 기기의 변경 내용을 불러왔어요.'); }
    } catch (e) {}
  }
  window.addEventListener('pagehide', () => { if (cloudTimer) cloudPush(true); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) { if (cloudTimer) cloudPush(true); } else cloudPull(); });
  window.addEventListener('online', () => { if (currentUser && !cloudTimer && cloudDirty()) cloudPush(); });
  async function bootCloud() {
    $('authScreen').style.display = 'flex';
    $('authScreen').innerHTML = '<div class="auth-box"><p class="muted" style="text-align:center">불러오는 중...</p></div>';
    const ok = await new Promise(r => { if (window.Cloud) return r(true); window.addEventListener('cloudready', () => r(true), { once: true }); setTimeout(() => r(false), 8000); });
    if (!ok) {
      const last = LS.getItem('vocapro_last_uid');
      if (last) { toast('서버에 연결하지 못해 이 기기의 저장본으로 열었어요.'); return enterApp(last, null, LS.getItem('vocapro_last_label'), true); }
      showAuth(); const m = $('auMsg'); if (m) { m.textContent = '서버에 연결하지 못했어요. 인터넷을 확인하세요.'; m.style.display = 'block'; } return;
    }
    const u = await Cloud.first;
    if (!u) { trackVisit(); return showAuth(); }
    let remote = null, stale = false; try { remote = await Cloud.load(); } catch (e) { stale = true; }
    enterApp(u.uid, remote, u.email, stale);
  }
  document.addEventListener('keydown', e => {
    if (e.key === 'Enter' && /^(INPUT|SELECT)$/.test(e.target.tagName) && e.target.closest('#authScreen')) {
      e.preventDefault();
      if (authMode === 'signup' && authStep === 1) ACTIONS['auth-next']();
      else ACTIONS['auth-go']();
    }
  });

