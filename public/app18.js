  /* =========================================================
   * 우리 반 실시간 (학생 접속·학습 상태 -> 선생님 실시간 화면)
   * ======================================================= */
  let clPingAt = 0, clPingOff = false;
  function clLiveState() {
    const t = (stats.days[dayKey()] || { n: 0 }).n;
    if (document.visibilityState === 'hidden') return { s: 'away', t };
    if (S && S.active) {
      const base = { m: S.mode, i: Math.min(S.idx, S.total), n: S.total, ok: S.ok, no: S.no, src: String(srcLabel(S.src) || '').slice(0, 40), a: S.assign ? String(S.assign.title).slice(0, 60) : '' };
      return Object.assign({ s: S.finished ? 'done' : 'study', t }, base);
    }
    return { s: 'app', t };
  }
  async function clPing(force) {
    if (clPingOff || !clOk() || isTeacher() || !clCache().joined) return;
    const now = Date.now(); if (!force && now - clPingAt < 5000) return; clPingAt = now;
    try { await Cloud.call('voca_class_ping', { p_live: clLiveState() }); }
    catch (e) { if (e && e.code === 'missing') clPingOff = true; }
  }
  setInterval(() => { if (document.visibilityState !== 'hidden') clPing(true); }, 15000);
  document.addEventListener('visibilitychange', () => clPing(true));

  let LV = null;
  const LV_MODE = m => (MODES[m] && MODES[m].name) || '학습';
  function lvStatus(m) {
    const l = m.live || {}, ago = m.ago;
    if (ago == null) return { k: 'off', t: '아직 접속 기록 없음' };
    if (ago > 60 || l.s === 'away') return { k: ago > 60 ? 'off' : 'away', t: ago > 3600 ? (ago > 86400 ? `${Math.floor(ago / 86400)}일 전 접속` : `${Math.floor(ago / 3600)}시간 전 접속`) : ago > 60 ? `${Math.floor(ago / 60)}분 전 접속` : '잠시 다른 화면' };
    if (l.s === 'study') return { k: 'study', t: `${l.a ? l.a + ' · ' : ''}${LV_MODE(l.m)} ${l.i}/${l.n}`, p: l.n ? l.i / l.n : 0, ok: l.ok, no: l.no };
    if (l.s === 'done') { const f = (l.ok || 0) + (l.no || 0); return { k: 'on', t: `${l.a ? l.a + ' · ' : ''}${LV_MODE(l.m)} 끝냄${f ? ` · 정답 ${Math.round((l.ok || 0) / f * 100)}%` : ''}` }; }
    return { k: 'on', t: '앱을 보고 있어요' };
  }
  ACTIONS['cl-live'] = async () => {
    const id = CLV.id; if (!id) return;
    closeSheet();
    const ov = document.createElement('div'); ov.id = 'lvOv'; ov.className = 'pv lv'; document.body.appendChild(ov); document.body.classList.add('no-scroll');
    LV = { id, seen: new Map(), feed: [], timer: null, first: true };
    ov.innerHTML = `<div class="cl-load">${MASCOT('think')}<span>학생들을 불러오는 중...</span></div>`;
    await lvTick();
    LV && (LV.timer = setInterval(lvTick, 5000));
  };
  function lvClose() { if (!LV) return; clearInterval(LV.timer); LV = null; const o = $('lvOv'); if (o) o.remove(); document.body.classList.remove('no-scroll'); }
  ACTIONS['lv-close'] = () => { const id = CLV.id; lvClose(); if (id) clDetail(id, true); };
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && $('lvOv') && !document.querySelector('.dlg-ov')) { e.stopImmediatePropagation(); ACTIONS['lv-close'](); } }, true);
  async function lvTick() {
    if (!LV) return; const lv = LV;
    let r; try { r = await Cloud.call('voca_class_live', { p_class: lv.id }); }
    catch (e) {
      if (LV !== lv) return;
      const o = $('lvOv'); if (o && (lv.first || e.code === 'missing')) { clearInterval(lv.timer); o.innerHTML = `<div class="lv-top"><b>실시간 보기</b><button class="icon-btn" data-act="lv-close" aria-label="닫기">${IC.x}</button></div><div class="cl-load">${MASCOT('sleep')}<span>${esc(e.code === 'missing' ? '실시간 보기는 서버 설정(supabase_update_v7.sql)을 마치면 쓸 수 있어요.' : clMsg(e))}</span></div>`; }
      return;
    }
    if (LV !== lv) return;
    const list = r.members.map(m => Object.assign(m, { st: lvStatus(m) }));
    list.forEach(m => {
      const was = lv.seen.get(m.uid), on = m.st.k === 'on' || m.st.k === 'study';
      if (!lv.first && on && was !== true) { m.arrive = true; lv.feed.unshift([Date.now(), `${m.name || '학생'} 학생이 들어왔어요`]); }
      if (!lv.first && m.st.k === 'study' && m.live.i === 0 && m.live.n) { const k = 'start:' + m.uid + ':' + m.live.a + m.live.m; if (!lv.seen.has(k)) { lv.seen.set(k, 1); lv.feed.unshift([Date.now(), `${m.name || '학생'} 학생 '${m.live.a || LV_MODE(m.live.m)}' 시작`]); } }
      lv.seen.set(m.uid, on);
    });
    lv.feed = lv.feed.slice(0, 6); lv.first = false;
    const on = list.filter(m => m.st.k === 'on' || m.st.k === 'study').length, study = list.filter(m => m.st.k === 'study').length;
    const order = { study: 0, on: 1, away: 2, off: 3 };
    list.sort((a, b) => order[a.st.k] - order[b.st.k] || String(a.sno).localeCompare(String(b.sno)) || String(a.name).localeCompare(String(b.name)));
    const c = r.class, o = $('lvOv'); if (!o) return;
    o.innerHTML = `<div class="lv-top"><div class="lv-title"><small>${esc(c.school || '')}</small><b>${esc(c.name)} 실시간</b></div>
        <div class="lv-nums"><span><b>${on}</b>접속</span><span><b>${study}</b>공부 중</span><span><b>${list.length}</b>전체</span></div>
        <div class="lv-code"><small>초대 코드</small><b>${esc(c.code)}</b></div>
        <button class="icon-btn" data-act="lv-close" aria-label="닫기">${IC.x}</button></div>
      ${lv.feed.length ? `<div class="lv-feed">${lv.feed.map(([t, s]) => `<span>${esc(s)} <small>${new Date(t).toLocaleTimeString('ko-KR', { hour: 'numeric', minute: '2-digit' })}</small></span>`).join('')}</div>` : ''}
      ${list.length ? `<div class="lv-grid">${list.map(m => `<div class="lv-card k-${m.st.k}${m.arrive ? ' arrive' : ''}"><div class="lv-name"><i></i><b>${esc(m.name || '이름 없음')}</b><small>${esc(m.sno || '')}</small></div>
          <div class="lv-act">${esc(m.st.t)}</div>
          ${m.st.k === 'study' ? `<div class="lv-bar"><div style="width:${Math.round(m.st.p * 100) || 0}%"></div></div><div class="lv-ok"><span class="ok">맞음 ${esc(m.st.ok || 0)}</span><span class="no">틀림 ${esc(m.st.no || 0)}</span></div>` : ''}
          <div class="lv-today">오늘 ${Math.max(+m.today || 0, +(m.live && m.live.t) || 0)}단어</div></div>`).join('')}</div>`
        : `<div class="cl-load">${MASCOT('happy')}<span>아직 들어온 학생이 없어요. 초대 코드 <b>${esc(c.code)}</b>를 칠판에 적어 주세요.</span></div>`}
      <div class="lv-foot">5초마다 새로 고쳐요. 학생 앱이 열려 있으면 '접속'으로 보여요.</div>`;
  }

  /* =========================================================
   * 보안문자 · 약관 · 개인정보 처리방침
   * ======================================================= */
  let capText = '', authFails = 0;
  const capRnd = n => { try { const a = new Uint32Array(1); crypto.getRandomValues(a); return a[0] % n; } catch (e) { return Math.floor(Math.random() * n); } };
  function drawCaptcha() {
    const c = $('capCv'); if (!c) return;
    const W = c.width = 160, H = c.height = 52, x = c.getContext('2d'); if (!x) return;
    const set = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; capText = '';
    for (let i = 0; i < 5; i++) capText += set[capRnd(set.length)];
    x.fillStyle = '#eef1f5'; x.fillRect(0, 0, W, H);
    for (let i = 0; i < 7; i++) { x.strokeStyle = `hsl(${capRnd(360)},40%,60%)`; x.lineWidth = 1 + capRnd(2); x.beginPath(); x.moveTo(capRnd(W), capRnd(H)); x.bezierCurveTo(capRnd(W), capRnd(H), capRnd(W), capRnd(H), capRnd(W), capRnd(H)); x.stroke(); }
    for (let i = 0; i < capText.length; i++) {
      x.save(); x.translate(20 + i * 28, 28 + capRnd(8) - 4); x.rotate((capRnd(60) - 30) / 100);
      x.font = `800 ${26 + capRnd(6)}px sans-serif`; x.fillStyle = `hsl(${capRnd(360)},55%,28%)`; x.textAlign = 'center'; x.fillText(capText[i], 0, 0); x.restore();
    }
    for (let i = 0; i < 40; i++) { x.fillStyle = `rgba(60,60,60,${(capRnd(40) + 10) / 100})`; x.fillRect(capRnd(W), capRnd(H), 2, 2); }
  }
  function authExtraHtml(su) {
    return `<div id="capBox" style="display:${su || authFails >= 3 ? 'block' : 'none'}"><div class="cap-row"><canvas id="capCv" width="160" height="52" aria-label="보안문자"></canvas><button type="button" class="btn btn-soft" data-act="cap-refresh">새로고침</button></div><input type="text" id="capIn" placeholder="위 문자를 입력하세요" maxlength="5" autocapitalize="characters" autocomplete="off" spellcheck="false"></div>${su ? `<label class="switch-row"><input type="checkbox" id="auTerms"><span>(필수) ${kidMode ? '보호자와 함께 ' : ''}<a class="lg-a" data-act="legal" data-k="terms">이용약관</a> 및 <a class="lg-a" data-act="legal" data-k="privacy">개인정보 처리방침</a>${kidMode ? '을 읽고 ' : '에 '}동의해요</span></label>` : ''}`;
  }
  function authGate() {
    const su = authMode === 'signup';
    if (su) { const t = $('auTerms'); if (!t || !t.checked) return '이용약관과 개인정보 처리방침에 동의해 주세요.'; }
    if (su || authFails >= 3) {
      const v = (($('capIn') && $('capIn').value) || '').trim().toUpperCase();
      if (!capText || v !== capText) { drawCaptcha(); if ($('capIn')) $('capIn').value = ''; return '보안문자가 맞지 않아요. 새 문자로 다시 입력해 주세요.'; }
    }
    return '';
  }
  ACTIONS['cap-refresh'] = () => { drawCaptcha(); const i = $('capIn'); if (i) { i.value = ''; i.focus(); } };

