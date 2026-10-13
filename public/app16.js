  /* =========================================================
   * 선생님 수업 도구 2 (퀴즈 쇼 · 빙고 · 타이머 · 발표자 뽑기와 모둠 · 반 결과 엑셀)
   * ======================================================= */
  let TT = null;
  function ttOpen(kind, state) {
    ttClose(true);
    const ov = document.createElement('div'); ov.id = 'ttOv'; ov.className = 'pv tt tt-' + kind; document.body.appendChild(ov); document.body.classList.add('no-scroll');
    TT = Object.assign({ kind, timer: null }, state);
    try { const d = document.documentElement; if (d.requestFullscreen && matchMedia('(min-width: 900px)').matches && kind !== 'pick') d.requestFullscreen().catch(() => {}); } catch (e) {}
    ttDraw();
  }
  function ttClose(silent) {
    if (TT) { clearInterval(TT.timer); clearInterval(TT.spin); }
    TT = null; const ov = $('ttOv'); if (ov) ov.remove();
    if (!silent) { if (!$('sheetOv').classList.contains('open') && !S.active) document.body.classList.remove('no-scroll'); try { if (document.fullscreenElement) document.exitFullscreen(); } catch (e) {} }
  }
  const ttTop = (title, right) => `<div class="pv-top"><span class="pv-name">${esc(title)}</span>${right || ''}<button class="pv-x" data-tt="x" aria-label="닫기">${IC.x}</button></div>`;
  function ttDraw() { if (!TT) return; ({ qs: qsDraw, timer: tmDraw, pick: pkDraw, rank: rkDraw })[TT.kind](); }
  function ttBeep(n) {
    try {
      const A = window.AudioContext || window.webkitAudioContext; if (!A) return; const ctx = new A();
      for (let i = 0; i < (n || 3); i++) { const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.value = 880; o.connect(g); g.connect(ctx.destination); const t = ctx.currentTime + i * 0.35; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.3, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.25); o.start(t); o.stop(t + 0.3); }
      setTimeout(() => { try { ctx.close(); } catch (e) {} }, 2000);
    } catch (e) {}
  }

  /* ----- 퀴즈 쇼: 칠판에 4지선다를 띄우고 팀 점수를 매겨요 ----- */
  ACTIONS.quizshow = () => {
    const cat = curCat(); if (!cat || cat.words.length < 4) return toast('퀴즈 쇼는 단어가 4개 이상 있어야 해요.');
    openSheet('퀴즈 쇼', `<div class="form-stack">
      <p class="muted" style="margin:0;font-size:.86rem;line-height:1.6;">칠판이나 TV에 4지선다 문제를 크게 띄워요. 학생은 손을 들거나 보드에 답을 쓰고, 선생님이 정답을 보여 주며 팀 점수를 올려요.</p>
      <label class="setting-label">문제</label>
      <div class="seg" id="qsAsk"><button class="on" data-act="pt-opt" data-g="qsAsk" data-v="m">단어 보고 뜻</button><button data-act="pt-opt" data-g="qsAsk" data-v="w">뜻 보고 단어</button><button data-act="pt-opt" data-g="qsAsk" data-v="x">섞어서</button></div>
      <label class="setting-label">문제 수</label>
      <div class="seg" id="qsNum">${[10, 15, 20].filter(k => k <= cat.words.length).map((k, i) => `<button class="${i === 0 ? 'on' : ''}" data-act="pt-opt" data-g="qsNum" data-v="${k}">${k}문제</button>`).join('')}<button class="${cat.words.length < 10 ? 'on' : ''}" data-act="pt-opt" data-g="qsNum" data-v="${cat.words.length}">전체</button></div>
      <label class="setting-label">제한 시간</label>
      <div class="seg" id="qsSec">${[10, 15, 20, 0].map(k => `<button class="${k === 15 ? 'on' : ''}" data-act="pt-opt" data-g="qsSec" data-v="${k}">${k ? k + '초' : '없음'}</button>`).join('')}</div>
      <label class="setting-label">팀</label>
      <div class="seg" id="qsTeam">${[0, 2, 3, 4].map(k => `<button class="${k === 2 ? 'on' : ''}" data-act="pt-opt" data-g="qsTeam" data-v="${k}">${k ? k + '팀' : '점수 없이'}</button>`).join('')}</div>
      <button class="btn btn-primary btn-block" data-act="qs-go">${IC.play} 퀴즈 쇼 시작</button></div>`);
  };
  ACTIONS['qs-go'] = () => {
    const cat = curCat(); if (!cat) return;
    const v = id => { const b = document.querySelector(`#${id} .on`); return b ? b.dataset.v : ''; };
    const ask = v('qsAsk') || 'm', n = +v('qsNum') || 10, sec = +v('qsSec'), teams = +v('qsTeam');
    const ws = cat.words.filter(w => w.word && w.meaning), list = shuffled(ws).slice(0, n);
    const qs = list.map((w, i) => {
      const a = ask === 'x' ? (i % 2 ? 'w' : 'm') : ask, f = a === 'm' ? 'meaning' : 'word', seen = new Set([w[f]]), d = [];
      for (const o of shuffled(ws)) { if (d.length === 3) break; if (o !== w && o[f] && !seen.has(o[f])) { seen.add(o[f]); d.push(o); } }
      return { w, a, opts: shuffled([w, ...d]) };
    });
    closeSheet();
    ttOpen('qs', { name: cat.name, qs, i: 0, show: false, sec, left: sec, teams: Array.from({ length: teams }, () => 0), scored: false });
    qsTick();
  };
  function qsTick() {
    if (!TT || TT.kind !== 'qs') return; clearInterval(TT.timer);
    if (!TT.sec) return;
    TT.left = TT.sec;
    TT.timer = setInterval(() => {
      if (!TT || TT.kind !== 'qs') return; if (TT.show) return clearInterval(TT.timer);
      TT.left--; const e = $('qsLeft'); if (e) { e.textContent = TT.left; e.parentElement.classList.toggle('low', TT.left <= 3); }
      if (TT.left <= 0) { clearInterval(TT.timer); ttBeep(2); TT.show = true; qsDraw(); }
    }, 1000);
  }
  const QS_L = ['A', 'B', 'C', 'D'];
  function qsDraw() {
    const ov = $('ttOv'); if (!ov || !TT) return;
    const t = TT; if (t.i >= t.qs.length) return qsEnd();
    const q = t.qs[t.i], show = t.show, f = q.a === 'm' ? 'meaning' : 'word';
    ov.innerHTML = `${ttTop(t.name + ' · 퀴즈 쇼', `<span class="pv-n">${t.i + 1} / ${t.qs.length}</span>`)}
      <div class="pv-bar"><i style="width:${(t.i + 1) / t.qs.length * 100}%"></i></div>
      <div class="qs-main">
        <div class="qs-q"><small>${q.a === 'm' ? '이 단어의 뜻은?' : '이 뜻의 단어는?'}</small><b class="${q.a === 'm' ? 'en' : ''}">${esc(q.a === 'm' ? q.w.word : q.w.meaning)}</b></div>
        ${t.sec ? `<div class="qs-clock${show ? ' done' : ''}"><span id="qsLeft">${show ? '' : t.left}</span>${show ? IC.tick : ''}</div>` : ''}
      </div>
      <div class="qs-opts">${q.opts.map((o, k) => `<div class="qs-opt${show ? (o === q.w ? ' ok' : ' dim') : ''}"><i>${QS_L[k]}</i><span>${esc(o[f])}</span></div>`).join('')}</div>
      ${t.teams.length ? `<div class="qs-teams">${t.teams.map((s, k) => `<button class="qs-team t${k}" data-tt="team" data-k="${k}"${show && !t.scored ? '' : ' disabled'}><small>${k + 1}팀</small><b>${s}</b>${show && !t.scored ? '<em>+1</em>' : ''}</button>`).join('')}</div>` : ''}
      <div class="pv-foot">${show ? `<button data-tt="say" aria-label="발음 듣기">${IC.speaker}</button><button class="pv-main-btn" data-tt="next">${t.i === t.qs.length - 1 ? '결과 보기' : '다음 문제'}</button>` : `<button class="pv-main-btn" data-tt="show">정답 보기</button>`}</div>
      <div class="pv-keys"><span><kbd>Space</kbd>${show ? '다음' : '정답'}</span>${t.teams.length ? '<span><kbd>1~4</kbd>팀 점수</span>' : ''}<span><kbd>Esc</kbd>닫기</span></div>`;
    if (show) playAudio(q.w.word);
  }
  function qsEnd() {
    const ov = $('ttOv'), t = TT; if (!ov || !t) return;
    const best = Math.max(0, ...t.teams), win = t.teams.map((s, k) => s === best && best > 0 ? k + 1 : 0).filter(Boolean);
    ov.innerHTML = `${ttTop(t.name + ' · 퀴즈 쇼')}<div class="qs-end">${MASCOT('cheer')}<h2>${t.teams.length ? (win.length ? `${win.join(', ')}팀 우승!` : '모두 수고했어요') : `${t.qs.length}문제 끝!`}</h2>
      ${t.teams.length ? `<div class="qs-teams">${t.teams.map((s, k) => `<div class="qs-team t${k}${win.includes(k + 1) ? ' win' : ''}"><small>${k + 1}팀</small><b>${s}</b></div>`).join('')}</div>` : ''}
      <div class="row" style="max-width:420px;width:100%;"><button class="btn btn-soft" data-tt="x">닫기</button><button class="btn btn-primary" data-tt="again">다시 하기</button></div></div>`;
    if (win.length) confetti();
  }

  /* ----- 수업 타이머 ----- */
  ACTIONS.ctimer = () => ttOpen('timer', { total: 180, left: 180, run: false, end: 0 });
  function tmFmt(s) { s = Math.max(0, Math.ceil(s)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; }
  function tmDraw() {
    const ov = $('ttOv'), t = TT; if (!ov || !t) return;
    const pct = t.total ? Math.max(0, t.left / t.total) : 0, done = t.left <= 0 && t.total > 0;
    ov.innerHTML = `${ttTop('수업 타이머')}
      <div class="tm-main${done ? ' done' : ''}"><svg viewBox="0 0 120 120" class="tm-ring"><circle cx="60" cy="60" r="54" class="bg"/><circle cx="60" cy="60" r="54" class="fg" id="tmRing" style="stroke-dashoffset:${339.3 * (1 - pct)}"/></svg><div class="tm-time" id="tmTime">${done ? '끝!' : tmFmt(t.left)}</div></div>
      <div class="tm-presets">${[1, 3, 5, 10, 15].map(m => `<button data-tt="tm-set" data-s="${m * 60}">${m}분</button>`).join('')}<button data-tt="tm-add" data-s="30">+30초</button><button data-tt="tm-add" data-s="-30">-30초</button></div>
      <div class="pv-foot"><button data-tt="tm-reset" aria-label="처음으로">${IC.repeat}</button><button class="pv-main-btn" data-tt="tm-go">${t.run ? '멈춤' : done ? '다시 시작' : '시작'}</button></div>
      <div class="pv-keys"><span><kbd>Space</kbd>시작 · 멈춤</span><span><kbd>Esc</kbd>닫기</span></div>`;
  }
  function tmTick() {
    const t = TT; if (!t || t.kind !== 'timer') return;
    t.left = (t.end - Date.now()) / 1000;
    const e = $('tmTime'), r = $('tmRing');
    if (t.left <= 0) { clearInterval(t.timer); t.run = false; t.left = 0; ttBeep(4); tmDraw(); return; }
    if (e) e.textContent = tmFmt(t.left); if (r) r.style.strokeDashoffset = 339.3 * (1 - t.left / t.total);
  }
  function tmDo(k, el) {
    const t = TT; if (!t) return;
    if (k === 'tm-go') {
      if (t.run) { clearInterval(t.timer); t.run = false; }
      else { if (t.left <= 0) t.left = t.total; t.end = Date.now() + t.left * 1000; t.run = true; t.timer = setInterval(tmTick, 250); }
    } else if (k === 'tm-set') { clearInterval(t.timer); t.run = false; t.total = t.left = +el.dataset.s; }
    else if (k === 'tm-add') { const d = +el.dataset.s; t.left = Math.max(10, t.left + d); t.total = Math.max(t.total, t.left); if (t.run) t.end = Date.now() + t.left * 1000; }
    else if (k === 'tm-reset') { clearInterval(t.timer); t.run = false; t.left = t.total; }
    tmDraw();
  }

  /* ----- 발표자 뽑기 · 모둠 나누기 ----- */
  ACTIONS.picker = async () => {
    let classes = [];
    if (clOk()) { try { classes = (await Cloud.call('voca_class_mine')).owned || []; } catch (e) {} }
    const saved = (() => { try { return LS.getItem('vocapro_pick_names:' + currentUser) || ''; } catch (e) { return ''; } })();
    openSheet('발표자 뽑기 · 모둠 나누기', `<div class="form-stack">
      <label class="setting-label">누구 중에서 뽑을까요?</label>
      <select id="pkSrc">${classes.map(c => `<option value="c${c.id}">${esc(c.name)} (학생 ${c.members}명)</option>`).join('')}<option value="num">번호로 (1번부터)</option><option value="names"${saved && !classes.length ? ' selected' : ''}>이름 직접 쓰기</option></select>
      <div id="pkNumBox"><label class="setting-label" for="pkNum">우리 반 인원</label><input type="number" id="pkNum" min="2" max="60" value="30"></div>
      <div id="pkNameBox"><label class="setting-label" for="pkNames">이름 (줄바꿈이나 쉼표로 구분)</label><textarea id="pkNames" class="short" rows="4" placeholder="김지우, 이민수, 박하늘">${esc(saved)}</textarea></div>
      <button class="btn btn-primary btn-block" data-act="pk-go">${IC.users} 열기</button>
      <p class="muted" style="margin:0;font-size:.8rem;line-height:1.6;">열린 화면에서 한 명 뽑기와 모둠 나누기를 바로 바꿔 쓸 수 있어요. 이미 뽑힌 학생은 다시 안 나와요.</p></div>`);
  };
  ACTIONS['pk-go'] = async el => {
    const src = ($('pkSrc') || {}).value || 'num'; let names = [];
    if (src[0] === 'c') {
      el.disabled = true;
      try { const d = await Cloud.call('voca_class_detail', { p_class: +src.slice(1) }); names = d.members.map(m => (m.name || '이름 없음') + (m.sno ? ' ' + m.sno.slice(-2) + '번' : '')); }
      catch (e) { el.disabled = false; return say(clMsg(e)); }
    } else if (src === 'num') { const n = Math.max(2, Math.min(60, parseInt(($('pkNum') || {}).value, 10) || 30)); names = Array.from({ length: n }, (_, i) => `${i + 1}번`); }
    else { const raw = ($('pkNames') || {}).value || ''; names = raw.split(/[\n,]+/).map(x => x.trim()).filter(Boolean).slice(0, 80); try { LS.setItem('vocapro_pick_names:' + currentUser, raw); } catch (e) {} }
    names = [...new Set(names)];
    if (names.length < 2) { el.disabled = false; return toast('두 명 이상 있어야 해요.'); }
    closeSheet(); ttOpen('pick', { names, used: [], cur: '', mode: 'one', size: 4, groups: null });
  };
  function pkDraw() {
    const ov = $('ttOv'), t = TT; if (!ov || !t) return;
    const left = t.names.filter(n => !t.used.includes(n));
    const head = `${ttTop(t.mode === 'one' ? '발표자 뽑기' : '모둠 나누기', `<div class="seg pk-seg"><button class="${t.mode === 'one' ? 'on' : ''}" data-tt="pk-mode" data-m="one">한 명 뽑기</button><button class="${t.mode === 'grp' ? 'on' : ''}" data-tt="pk-mode" data-m="grp">모둠 나누기</button></div>`)}`;
    if (t.mode === 'one') {
      ov.innerHTML = `${head}<div class="pk-main"><div class="pk-name${t.cur && !t.spin ? ' hit' : ''}" id="pkName">${esc(t.cur || '?')}</div><div class="pk-left">남은 사람 ${left.length}명 / ${t.names.length}명</div></div>
        ${t.used.length ? `<div class="pk-used">${t.used.map(n => `<span>${esc(n)}</span>`).join('')}</div>` : ''}
        <div class="pv-foot"><button data-tt="pk-reset" aria-label="처음부터">${IC.repeat}</button><button class="pv-main-btn" data-tt="pk-spin"${t.spin ? ' disabled' : ''}>${left.length ? '뽑기' : '모두 뽑았어요 · 처음부터'}</button></div>
        <div class="pv-keys"><span><kbd>Space</kbd>뽑기</span><span><kbd>Esc</kbd>닫기</span></div>`;
    } else {
      ov.innerHTML = `${head}<div class="pk-gopt"><span>한 모둠</span>${[2, 3, 4, 5, 6].map(k => `<button class="${t.size === k ? 'on' : ''}" data-tt="pk-size" data-k="${k}">${k}명</button>`).join('')}<button class="pv-main-btn" data-tt="pk-grp">${t.groups ? '다시 나누기' : '나누기'}</button></div>
        ${t.groups ? `<div class="pk-groups">${t.groups.map((g, i) => `<div class="pk-g"><b>${i + 1}모둠</b>${g.map(n => `<span>${esc(n)}</span>`).join('')}</div>`).join('')}</div>` : `<div class="pk-main"><div class="pk-left">${t.names.length}명을 ${t.size}명씩 나눠요</div></div>`}`;
    }
  }
  function pkDo(k, el) {
    const t = TT; if (!t) return;
    if (k === 'pk-mode') { t.mode = el.dataset.m; return pkDraw(); }
    if (k === 'pk-size') { t.size = +el.dataset.k; t.groups = null; return pkDraw(); }
    if (k === 'pk-reset') { t.used = []; t.cur = ''; return pkDraw(); }
    if (k === 'pk-grp') {
      const list = shuffled(t.names), g = Math.max(1, Math.round(list.length / t.size)), out = Array.from({ length: g }, () => []);
      list.forEach((n, i) => out[i % g].push(n)); t.groups = out; return pkDraw();
    }
    if (k === 'pk-spin') {
      if (t.spin) return;
      let left = t.names.filter(n => !t.used.includes(n)); if (!left.length) { t.used = []; left = t.names.slice(); }
      const win = left[Math.floor(Math.random() * left.length)]; let n = 0;
      t.spin = setInterval(() => {
        const e = $('pkName'); if (!e || !TT) return clearInterval(t.spin);
        e.textContent = left[Math.floor(Math.random() * left.length)]; n++;
        if (n > 18) { clearInterval(t.spin); t.spin = null; t.cur = win; t.used.push(win); ttBeep(1); pkDraw(); }
      }, 70);
      pkDraw();
    }
  }

  // 오버레이 클릭 · 키보드
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-tt]'); if (!b || !$('ttOv') || !TT) return; e.preventDefault();
    const k = b.dataset.tt, t = TT;
    if (k === 'x') return ttClose();
    if (t.kind === 'qs') {
      if (k === 'show') { t.show = true; clearInterval(t.timer); return qsDraw(); }
      if (k === 'next') { t.i++; t.show = false; t.scored = false; qsDraw(); return qsTick(); }
      if (k === 'team') { if (t.scored) return; t.teams[+b.dataset.k]++; t.scored = true; return qsDraw(); }
      if (k === 'say') return playAudio(t.qs[t.i].w.word);
      if (k === 'again') { t.qs = shuffled(t.qs); t.i = 0; t.show = false; t.scored = false; t.teams = t.teams.map(() => 0); qsDraw(); return qsTick(); }
    }
    if (t.kind === 'timer') return tmDo(k, b);
    if (t.kind === 'pick') return pkDo(k, b);
  });
  document.addEventListener('keydown', e => {
    if (!$('ttOv') || !TT || e.ctrlKey || e.metaKey || e.altKey || document.querySelector('.dlg-ov')) return;
    const t = TT, click = sel => { const b = $('ttOv').querySelector(sel); if (b && !b.disabled) b.click(); };
    if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); return ttClose(); }
    if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); e.stopImmediatePropagation(); return click(t.kind === 'qs' ? '[data-tt="show"], [data-tt="next"], [data-tt="again"]' : t.kind === 'timer' ? '[data-tt="tm-go"]' : t.mode === 'one' ? '[data-tt="pk-spin"]' : '[data-tt="pk-grp"]'); }
    if (t.kind === 'qs' && /^[1-4]$/.test(e.key)) { e.preventDefault(); e.stopImmediatePropagation(); click(`[data-tt="team"][data-k="${+e.key - 1}"]`); }
    else if (t.kind === 'qs' && (e.key === 's' || e.key === 'S')) { e.preventDefault(); e.stopImmediatePropagation(); playAudio(t.qs[t.i] && t.qs[t.i].w.word); }
  }, true);

  /* ----- 빙고판 인쇄 ----- */
  ACTIONS.bingo = () => {
    const cat = curCat(); if (!cat) return;
    if (cat.words.length < 9) return toast('빙고는 단어가 9개 이상 있어야 해요.');
    const n = cat.words.length;
    openSheet('단어 빙고판', `<div class="form-stack">
      <p class="muted" style="margin:0;font-size:.86rem;line-height:1.6;">학생마다 단어 배치가 다른 빙고판을 인쇄해요. 선생님이 뜻을 불러 주면 학생이 맞는 단어에 표시해요. 마지막 장에 부를 순서표가 들어가요.</p>
      <label class="setting-label">크기</label>
      <div class="seg" id="bgSize">${[3, 4, 5].map(k => `<button class="${k === (n >= 25 ? 5 : n >= 16 ? 4 : 3) ? 'on' : ''}${k * k > n ? ' off' : ''}" data-act="pt-opt" data-g="bgSize" data-v="${k}"${k * k > n ? ' disabled' : ''}>${k}×${k}</button>`).join('')}</div>
      <label class="setting-label">칸에 쓸 것</label>
      <div class="seg" id="bgShow"><button class="on" data-act="pt-opt" data-g="bgShow" data-v="w">단어 (뜻을 불러 줌)</button><button data-act="pt-opt" data-g="bgShow" data-v="m">뜻 (단어를 불러 줌)</button></div>
      <label class="setting-label" for="bgCopies">장 수 (학생 수)</label>
      <input type="number" id="bgCopies" min="1" max="60" value="30">
      <button class="btn btn-primary btn-block" data-act="bg-go">${IC.print} 인쇄 · PDF 저장</button></div>`);
  };
  ACTIONS['bg-go'] = () => {
    const cat = curCat(); if (!cat) return;
    const v = id => { const b = document.querySelector(`#${id} .on`); return b ? b.dataset.v : ''; };
    const size = +v('bgSize') || 4, show = v('bgShow') || 'w', copies = Math.max(1, Math.min(60, parseInt(($('bgCopies') || {}).value, 10) || 30));
    const ws = cat.words.filter(w => w.word && w.meaning); if (ws.length < size * size) return toast(`${size}×${size} 빙고는 단어가 ${size * size}개 이상 있어야 해요.`);
    const pool = shuffled(ws).slice(0, Math.min(ws.length, size * size + Math.max(4, size * 2)));
    const cell = w => esc(show === 'w' ? w.word : w.meaning);
    const sheets = Array.from({ length: copies }, (_, i) => `<div class="bg-sheet"><div class="bg-head"><b>${esc(cat.name)} 빙고</b><span>이름 ______________</span><span>${i + 1}</span></div><div class="bg-grid s${size}">${shuffled(pool).slice(0, size * size).map(w => `<div>${cell(w)}</div>`).join('')}</div></div>`).join('');
    const call = `<div class="bg-call"><div class="pt-head"><h1>${esc(cat.name)} 빙고 · 부를 순서</h1><p class="pt-guide">${show === 'w' ? '뜻을 불러 주세요.' : '단어를 불러 주세요.'} 빙고판에는 이 ${pool.length}개 중 ${size * size}개가 들어 있어요.</p></div><ol class="pt-list key">${shuffled(pool).map(w => `<li><span class="pt-q">${esc(show === 'w' ? w.meaning : w.word)}</span><span class="pt-a">${esc(show === 'w' ? w.word : w.meaning)}</span></li>`).join('')}</ol></div>`;
    let el = $('printArea'); if (!el) { el = document.createElement('div'); el.id = 'printArea'; document.body.appendChild(el); }
    el.innerHTML = sheets + call;
    closeSheet();
    document.body.classList.add('printing');
    const done = () => { document.body.classList.remove('printing'); window.removeEventListener('afterprint', done); };
    window.addEventListener('afterprint', done);
    setTimeout(() => { try { window.print(); } catch (e) { toast('이 기기에서는 인쇄를 열 수 없어요.'); } setTimeout(done, 1500); }, 80);
  };

  /* ----- 반 결과 엑셀(CSV)로 받기 ----- */
  ACTIONS['cl-csv'] = async el => {
    const d = CLV.data; if (!d) return; el.disabled = true; const old = el.textContent; el.textContent = '만드는 중...';
    try {
      const asg = d.assignments.slice().reverse(), res = [];
      for (const a of asg) res.push(await Cloud.call('voca_assign_results', { p_assign: a.id }));
      const q = x => { const s = String(x == null ? '' : x); return /[",\n]/.test(s) || /^[=+\-@]/.test(s) ? `"${s.replace(/^([=+\-@])/, "'$1").replace(/"/g, '""')}"` : s; };
      const head = ['학번', '이름', '최근 학습', '7일 단어', '7일 정답률(%)', '연속 학습(일)', '전체 단어', '마스터', '과제 완료'].concat(asg.map(a => `${a.title} (${CL_KIND[a.kind]})`));
      const rows = d.members.map(m => {
        const p = m.progress || {};
        const scores = res.map(r => { const x = (r.rows || []).find(y => y.name === m.name && y.sno === m.sno); return x && x.score != null ? x.score : ''; });
        return [m.sno, m.name, p.last || '', p.n7 != null ? p.n7 : '', p.acc7 != null ? p.acc7 : '', p.streak || 0, p.total || 0, p.mastered || 0, `${m.done}/${asg.length}`].concat(scores);
      });
      const csv = '﻿' + [head].concat(rows).map(r => r.map(q).join(',')).join('\r\n');
      download(`${d.class.name}_학습현황_${dayKey()}.csv`, csv, 'text/csv;charset=utf-8');
      toast('엑셀에서 열 수 있는 파일로 받았어요.');
    } catch (e) { say(clMsg(e)); }
    el.disabled = false; el.textContent = old;
  };

  /* =========================================================
   * 단어장 공유 (링크 하나로 반 친구, 선생님과 나눠요)
   * ======================================================= */
  const b64u = u8 => { let s = ''; for (let i = 0; i < u8.length; i += 8192) s += String.fromCharCode.apply(null, u8.subarray(i, i + 8192)); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
  const unb64u = t => { const s = atob(t.replace(/-/g, '+').replace(/_/g, '/')); const u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return u; };
  async function zipBytes(u8, inflate) {
    const cs = inflate ? new DecompressionStream('deflate-raw') : new CompressionStream('deflate-raw');
    return new Uint8Array(await new Response(new Blob([u8]).stream().pipeThrough(cs)).arrayBuffer());
  }
  async function shareEncode(cat) {
    const raw = new TextEncoder().encode(JSON.stringify({ n: cat.name, w: cat.words.map(w => [w.word, w.meaning]) }));
    if (typeof CompressionStream === 'function') { try { return 'z' + b64u(await zipBytes(raw)); } catch (e) {} }
    return 'j' + b64u(raw);
  }
  async function shareDecode(code) {
    const t = String(code || ''), body = unb64u(t.slice(1));
    const raw = t[0] === 'z' ? await zipBytes(body, true) : body;
    const o = JSON.parse(new TextDecoder().decode(raw));
    const words = (Array.isArray(o.w) ? o.w : []).filter(a => Array.isArray(a) && a[0] && a[1]).slice(0, 2000).map(a => [String(a[0]).slice(0, 80), String(a[1]).slice(0, 200)]);
    if (!words.length) throw new Error('empty');
    return { name: String(o.n || '공유받은 단어장').slice(0, 40), words };
  }
  ACTIONS['book-share'] = async () => {
    const cat = curCat(); if (!cat) return;
    if (!cat.words.length) return toast('단어를 먼저 담아 주세요.');
    const url = location.origin + location.pathname + '#s=' + await shareEncode(cat);
    openSheet('단어장 공유', `<div class="form-stack">
      <div class="share-card"><span class="mg-ico i-mint">${IC.book}</span><div><b>${esc(cat.name)}</b><small>단어 ${cat.words.length}개 · 받는 사람도 VocaPro에서 바로 공부할 수 있어요</small></div></div>
      <input id="shareUrl" readonly value="${esc(url)}" data-act="select-all">
      <div class="row"><button class="btn btn-soft" data-act="share-copy">링크 복사</button>${navigator.share ? '<button class="btn btn-primary" data-act="share-send">보내기</button>' : ''}</div>
      <p class="muted" style="font-size:.78rem;line-height:1.6;margin:0;">링크 안에 단어와 뜻이 들어 있어요. 서버에 따로 저장되지 않고, 학습 기록은 함께 보내지 않아요.${url.length > 8000 ? ' 단어가 많아서 링크가 길어요. 메신저에 따라 잘릴 수 있으니 CSV 내보내기도 함께 써 보세요.' : ''}</p></div>`);
  };
  ACTIONS['share-copy'] = async () => { const i = $('shareUrl'); if (!i) return; try { await navigator.clipboard.writeText(i.value); toast('링크를 복사했어요.'); } catch (e) { i.select(); toast('링크를 길게 눌러 복사해 주세요.'); } };
  ACTIONS['share-send'] = async () => { const i = $('shareUrl'), cat = curCat(); if (!i) return; try { await navigator.share({ title: 'VocaPro 단어장', text: `${cat ? cat.name : '단어장'} (VocaPro)`, url: i.value }); } catch (e) {} };

  // 공유 링크로 들어오면: 로그인 뒤에 담을지 물어봐요
  const SHARE_KEY = 'vocapro_share_in';
  (function shareCapture() {
    try {
      const m = location.hash.match(/^#s=([A-Za-z0-9_-]+)$/); if (!m) return;
      sessionStorage.setItem(SHARE_KEY, m[1]); history.replaceState(null, '', location.pathname + location.search);
    } catch (e) {}
  })();
  let shareWait = 0;
  function shareCheck() {
    let code = ''; try { code = sessionStorage.getItem(SHARE_KEY) || ''; } catch (e) {}
    if (!code || !currentUser) return;
    clearTimeout(shareWait);
    if ($('pfOv') || $('obOv') || $('ltOv') || document.querySelector('#recOv.show') || $('sheetOv').classList.contains('open') || S.active) { shareWait = setTimeout(shareCheck, 800); return; }
    shareDecode(code).then(d => {
      shareIn = d;
      openSheet('공유받은 단어장', `<div class="form-stack">
        <div class="share-card"><span class="mg-ico i-mint">${IC.book}</span><div><b>${esc(d.name)}</b><small>단어 ${d.words.length}개</small></div></div>
        <div class="share-prev">${d.words.slice(0, 8).map(([w, m]) => `<div><b>${esc(w)}</b><span>${esc(m)}</span></div>`).join('')}${d.words.length > 8 ? `<div class="muted">외 ${d.words.length - 8}개</div>` : ''}</div>
        <button class="btn btn-primary btn-block" data-act="share-take">내 단어장으로 담기</button>
        <button class="btn btn-soft btn-block" data-act="share-skip">담지 않기</button></div>`);
    }).catch(() => { try { sessionStorage.removeItem(SHARE_KEY); } catch (e) {} toast('공유 링크를 읽지 못했어요. 링크가 잘리지 않았는지 확인해 주세요.'); });
  }
  let shareIn = null;
  ACTIONS['share-skip'] = () => { try { sessionStorage.removeItem(SHARE_KEY); } catch (e) {} shareIn = null; closeSheet(); };
  ACTIONS['share-take'] = async el => {
    const d = shareIn; if (!d) return; el.disabled = true; el.textContent = '담는 중...';
    try { sessionStorage.removeItem(SHARE_KEY); } catch (e) {}
    await dictPreload(d.words.map(a => a[0]));
    let nm = d.name, k = 2; while (categories.some(c => c.name === nm)) nm = `${d.name} (${k++})`;
    const cat = { id: 'c' + uid(), name: nm, words: [] }, seen = new Set();
    for (const [w, m] of d.words) {
      if (seen.has(w.toLowerCase())) continue; seen.add(w.toLowerCase());
      let full = null; try { full = await dictGet(w); } catch (e) {}
      cat.words.push(sanitizeWord({ ...(full || {}), id: uid(), word: w, meaning: m }));
    }
    categories.push(cat); syncStorage(); shareIn = null; closeSheet();
    toast(`'${nm}' 단어장에 ${cat.words.length}개를 담았어요.`);
    try { openBook(cat.id); } catch (e) { go('tabBooks'); }
  };

