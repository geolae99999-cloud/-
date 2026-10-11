  /* =========================================================
   * 학년별 추천 단어 (하단 알림 · 오늘 안보기)
   * ======================================================= */
  const GRADES = [['e1', '초1'], ['e2', '초2'], ['e3', '초3'], ['e4', '초4'], ['e5', '초5'], ['e6', '초6'], ['m1', '중1'], ['m2', '중2'], ['m3', '중3'], ['h1', '고1'], ['h2', '고2'], ['h3', '고3']];
  const GRADE_NAMES = Object.fromEntries(GRADES);
  const PACKS = [['basic', '기초'], ['mid', '중학교 필수'], ['high', '고등학교 필수'], ['csat', '수능 필수']];
  const PACK_NAMES = Object.fromEntries(PACKS);
  const listName = k => GRADE_NAMES[k] ? `${GRADE_NAMES[k]} 추천` : (PACK_NAMES[k] || '');
  const gradeFull = k => { const n = GRADE_NAMES[k] || ''; return n ? ({ 초: '초등학교 ', 중: '중학교 ', 고: '고등학교 ' })[n[0]] + n.slice(1) + '학년' : ''; };
  const gradeOptions = sel => GRADES.map(([k]) => `<option value="${k}"${k === sel ? ' selected' : ''}>${gradeFull(k)}</option>`).join('');
  const gwCache = {};
  function gradeWords(k) {
    if (!gwCache[k]) {
      const raw = GW_E[k] || GW_MH[k] || GW_PACK[k] || '';
      gwCache[k] = raw ? raw.split('|').map(x => { const i = x.indexOf(':'); return { w: x.slice(0, i), m: x.slice(i + 1) }; }) : [];
    }
    return gwCache[k];
  }
  let dictMap = null;
  function builtinMeaning(word) {
    if (!dictMap) { dictMap = new Map(); [...GRADES, ...PACKS].forEach(([k]) => gradeWords(k).forEach(e => { const w = e.w.toLowerCase(); if (!dictMap.has(w)) dictMap.set(w, e.m); })); }
    return dictMap.get(String(word || '').trim().toLowerCase()) || '';
  }
  function setGrade(v) {
    config.grade = GRADE_NAMES[v] ? v : ''; syncStorage();
    if (config.grade) toast(`${gradeFull(config.grade)} 단어를 추천해 드릴게요.`);
    if (curTab === 'tabHome') renderHome();
  }

  const recHideKey = () => 'vocapro_rec_hide:' + currentUser;
  const recBookName = k => `${listName(k)} 단어`;
  let recShown = false, recView = '';
  function ownedWords() { const o = new Set(); allWords().forEach(({ w }) => o.add(w.word.toLowerCase())); return o; }
  const recLeft = k => { const o = ownedWords(); return gradeWords(k).filter(e => !o.has(e.w.toLowerCase())); };
  function recMaybeShow() {
    if (recShown || !currentUser) return;
    let hid = ''; try { hid = LS.getItem(recHideKey()) || ''; } catch (e) {}
    if (hid === dayKey()) return;
    recShown = true; setTimeout(() => recOpen(), 500);
  }
  function recOpen(note) {
    if (!currentUser || $('authScreen').style.display !== 'none') return;
    let el = $('recOv');
    if (!el) { el = document.createElement('div'); el.className = 'rec'; el.id = 'recOv'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', '추천 단어'); document.body.appendChild(el); }
    const k = config.grade, g = GRADE_NAMES[k];
    const head = (t, sub) => `<div class="rec-head"><span class="rec-ico">${IC.bell}</span><div class="rec-title"><b>${t}</b><small>${sub}</small></div><button class="rec-x" data-act="rec-close" aria-label="닫기">${IC.x}</button></div>`;
    const foot = '<label class="rec-skip"><input type="checkbox" id="recSkip"> 오늘 하루 보지 않기</label>';
    let body;
    if (!g) {
      body = head('학년을 알려 주세요', '학년에 맞는 단어 100개를 추천해 드려요') +
        `<div class="rec-grade">${GRADES.map(([gk, n]) => `<button class="chip" data-act="rec-grade" data-g="${gk}">${n}</button>`).join('')}</div>`;
    } else if (note) {
      body = head(`${g} 추천 단어`, note) + `<div class="rec-actions"><button class="btn btn-soft" data-act="rec-close">닫기</button><button class="btn btn-primary" data-act="rec-study">지금 외우기</button></div>`;
    } else {
      const left = recLeft(k), today = left.slice(0, 10), done = gradeWords(k).length - left.length;
      body = today.length
        ? head(`${g} 추천 단어 · 오늘의 ${today.length}개`, `100개 중 ${done}개를 담았어요`) +
          `<div class="rec-words">${today.map(e => `<button class="rec-w" data-act="speak" data-text="${esc(e.w)}"><b>${esc(e.w)}</b><span>${esc(e.m)}</span></button>`).join('')}</div>
          <div class="rec-actions"><button class="btn btn-soft" data-act="rec-all">100개 전체 보기</button><button class="btn btn-primary" data-act="rec-add">${today.length}개 담기</button></div>`
        : head(`${g} 추천 단어 100개를 다 담았어요`, '다른 학년 단어도 둘러보세요') + `<div class="rec-actions"><button class="btn btn-primary" data-act="rec-all">다른 학년 보기</button></div>`;
    }
    el.innerHTML = body + foot;
    requestAnimationFrame(() => el.classList.add('show'));
  }
  function recClose() {
    const el = $('recOv'); if (!el) return;
    const skip = $('recSkip');
    if (skip && skip.checked) { try { LS.setItem(recHideKey(), dayKey()); } catch (e) {} toast('내일 다시 알려 드릴게요.'); }
    el.classList.remove('show'); setTimeout(() => el.remove(), 260);
  }
  async function recAddWords(k, list) {
    if (!list.length) return null;
    await dictPreload(list.map(e => e.w));
    const full = {}; for (const e of list) full[e.w.toLowerCase()] = await dictGet(e.w);
    const nm = recBookName(k);
    let cat = categories.find(c => c.name === nm);
    if (!cat) { cat = { id: 'c' + uid(), name: nm, words: [] }; categories.push(cat); }
    const have = new Set(cat.words.map(w => w.word.toLowerCase()));
    list.forEach(e => { if (!have.has(e.w.toLowerCase())) { cat.words.push(sanitizeWord({ ...(full[e.w.toLowerCase()] || {}), id: uid(), word: e.w, meaning: e.m })); have.add(e.w.toLowerCase()); } });
    syncStorage(); recView = cat.id;
    try { if (curTab !== 'paneBook') go(curTab); else renderBookDynamic(); } catch (e) {}
    return cat;
  }
  ACTIONS['rec-close'] = recClose;
  ACTIONS['rec-grade'] = el => { setGrade(el.dataset.g); recOpen(); };
  ACTIONS['rec-add'] = async () => {
    const k = config.grade, list = recLeft(k).slice(0, 10), cat = await recAddWords(k, list);
    if (cat) recOpen(`'${cat.name}' 단어장에 ${list.length}개를 담았어요.`);
  };
  ACTIONS['rec-study'] = () => { const id = recView; recClose(); if (id && findBook(id)) startSession('card', { type: 'cat', id }, 10); };
  ACTIONS['rec-all'] = () => recSheet(config.grade || 'e1');
  ACTIONS['grade-pick'] = () => openSheet('학년 선택', `<p class="muted" style="margin:0 0 12px;font-size:.88rem;">학년에 맞는 단어 100개를 추천해 드려요.</p><div class="grade-grid">${GRADES.map(([k, n]) => `<button class="grade-btn ${k === config.grade ? 'on' : ''}" data-act="grade-set" data-g="${k}"><b>${n}</b><small>${gradeFull(k).replace(/\s.*/, '')}</small></button>`).join('')}</div>`);
  ACTIONS['grade-set'] = el => { closeSheet(); setGrade(el.dataset.g); recShown = false; try { LS.removeItem(recHideKey()); } catch (e) {} recMaybeShow(); };

  let recSheetK = '';
  function recSheet(k) {
    recSheetK = k;
    const own = ownedWords(), list = gradeWords(k), left = list.filter(e => !own.has(e.w.toLowerCase())).length;
    openSheet(`${listName(k)} 단어 ${list.length}`, `
      <div class="rec-tabs">${[...PACKS, ...GRADES].map(([gk, n]) => `<button class="chip ${gk === k ? 'on' : ''}${PACK_NAMES[gk] ? ' pack' : ''}" data-act="rec-tab" data-g="${gk}">${n}</button>`).join('')}</div>
      <div class="rec-list" id="recList">${list.map((e, i) => { const has = own.has(e.w.toLowerCase()); return `<label class="rec-row ${has ? 'has' : ''}"><input type="checkbox" value="${i}" ${has ? 'checked disabled' : ''}><span class="w-no">${String(i + 1).padStart(3, '0')}</span><b>${esc(e.w)}</b><span class="rec-m">${esc(e.m)}</span>${has ? '<em>담음</em>' : ''}</label>`; }).join('')}</div>
      <div class="rec-bar"><button class="btn btn-soft" data-act="rec-pick-add">선택한 단어 담기</button><button class="btn btn-primary" data-act="rec-left-add" ${left ? '' : 'disabled'}>남은 ${left}개 모두 담기</button></div>`);
  }
  ACTIONS['rec-tab'] = el => recSheet(el.dataset.g);
  ACTIONS['rec-pick-add'] = async () => {
    const list = gradeWords(recSheetK), pick = [...document.querySelectorAll('#recList input:checked:not(:disabled)')].map(i => list[+i.value]).filter(Boolean);
    if (!pick.length) return toast('담을 단어를 골라 주세요.');
    const cat = await recAddWords(recSheetK, pick); recSheet(recSheetK); toast(`'${cat.name}'에 ${pick.length}개를 담았어요.`);
    if ($('recOv') && recSheetK === config.grade) recOpen();
  };
  ACTIONS['rec-left-add'] = async () => {
    const own = ownedWords(), pick = gradeWords(recSheetK).filter(e => !own.has(e.w.toLowerCase()));
    if (!pick.length) return;
    const cat = await recAddWords(recSheetK, pick); recSheet(recSheetK); toast(`'${cat.name}'에 ${pick.length}개를 담았어요.`);
    if ($('recOv') && recSheetK === config.grade) recOpen();
  };
  function packEntryHtml() {
    const total = PACKS.reduce((n, [k]) => n + gradeWords(k).length, 0);
    return `<button class="mg-entry" data-act="pack-open"><span class="mg-ico i-mint">${IC.book}</span><span class="mg-txt"><b>기초 · 중학교 · 고등학교 · 수능 단어</b><small>${total.toLocaleString()}개 단어를 골라 담아요</small></span><span class="mg-chev"></span></button>`;
  }
  ACTIONS['pack-open'] = () => recSheet(config.grade === 'h3' ? 'csat' : /^h/.test(config.grade) ? 'high' : /^m/.test(config.grade) ? 'mid' : 'basic');
  function recEntryHtml() {
    const k = config.grade, g = GRADE_NAMES[k];
    const sub = g ? `100개 중 ${gradeWords(k).length - recLeft(k).length}개를 담았어요` : '학년을 고르면 맞춤 단어를 추천해요';
    return `<button class="mg-entry" data-act="${g ? 'rec-all' : 'grade-pick'}"><span class="mg-ico i-sun">${IC.bell}</span><span class="mg-txt"><b>${g ? `${g} 추천 단어 100` : '학년별 추천 단어'}</b><small>${sub}</small></span><span class="mg-chev"></span></button>`;
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

