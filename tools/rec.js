  /* =========================================================
   * 학년별 추천 단어 (하단 알림 · 오늘 안보기)
   * ======================================================= */
  const GRADES = [['e1', '초1'], ['e2', '초2'], ['e3', '초3'], ['e4', '초4'], ['e5', '초5'], ['e6', '초6'], ['m1', '중1'], ['m2', '중2'], ['m3', '중3'], ['h1', '고1'], ['h2', '고2'], ['h3', '고3']];
  const GRADE_NAMES = Object.fromEntries(GRADES);
  const gradeFull = k => { const n = GRADE_NAMES[k] || ''; return n ? ({ 초: '초등학교 ', 중: '중학교 ', 고: '고등학교 ' })[n[0]] + n.slice(1) + '학년' : ''; };
  const gradeOptions = sel => GRADES.map(([k]) => `<option value="${k}"${k === sel ? ' selected' : ''}>${gradeFull(k)}</option>`).join('');
  const gwCache = {};
  function gradeWords(k) {
    if (!gwCache[k]) {
      const raw = GW_E[k] || GW_MH[k] || '';
      gwCache[k] = raw ? raw.split('|').map(x => { const i = x.indexOf(':'); return { w: x.slice(0, i), m: x.slice(i + 1) }; }) : [];
    }
    return gwCache[k];
  }
  let dictMap = null;
  function builtinMeaning(word) {
    if (!dictMap) { dictMap = new Map(); GRADES.forEach(([k]) => gradeWords(k).forEach(e => dictMap.set(e.w.toLowerCase(), e.m))); }
    return dictMap.get(String(word || '').trim().toLowerCase()) || '';
  }
  function setGrade(v) {
    config.grade = GRADE_NAMES[v] ? v : ''; syncStorage();
    if (config.grade) toast(`${gradeFull(config.grade)} 단어를 추천해 드릴게요.`);
    if (curTab === 'tabHome') renderHome();
  }

  const recHideKey = () => 'vocapro_rec_hide:' + currentUser;
  const recBookName = k => `${GRADE_NAMES[k]} 추천 단어`;
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
  function recAddWords(k, list) {
    if (!list.length) return null;
    const nm = recBookName(k);
    let cat = categories.find(c => c.name === nm);
    if (!cat) { cat = { id: 'c' + uid(), name: nm, words: [] }; categories.push(cat); }
    const have = new Set(cat.words.map(w => w.word.toLowerCase()));
    list.forEach(e => { if (!have.has(e.w.toLowerCase())) { cat.words.push(sanitizeWord({ id: uid(), word: e.w, meaning: e.m })); have.add(e.w.toLowerCase()); } });
    syncStorage(); recView = cat.id;
    try { if (curTab !== 'paneBook') go(curTab); else renderBookDynamic(); } catch (e) {}
    return cat;
  }
  ACTIONS['rec-close'] = recClose;
  ACTIONS['rec-grade'] = el => { setGrade(el.dataset.g); recOpen(); };
  ACTIONS['rec-add'] = () => {
    const k = config.grade, list = recLeft(k).slice(0, 10), cat = recAddWords(k, list);
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
    openSheet(`${GRADE_NAMES[k]} 추천 단어 100`, `
      <div class="rec-tabs">${GRADES.map(([gk, n]) => `<button class="chip ${gk === k ? 'on' : ''}" data-act="rec-tab" data-g="${gk}">${n}</button>`).join('')}</div>
      <div class="rec-list" id="recList">${list.map((e, i) => { const has = own.has(e.w.toLowerCase()); return `<label class="rec-row ${has ? 'has' : ''}"><input type="checkbox" value="${i}" ${has ? 'checked disabled' : ''}><span class="w-no">${String(i + 1).padStart(3, '0')}</span><b>${esc(e.w)}</b><span class="rec-m">${esc(e.m)}</span>${has ? '<em>담음</em>' : ''}</label>`; }).join('')}</div>
      <div class="rec-bar"><button class="btn btn-soft" data-act="rec-pick-add">선택한 단어 담기</button><button class="btn btn-primary" data-act="rec-left-add" ${left ? '' : 'disabled'}>남은 ${left}개 모두 담기</button></div>`);
  }
  ACTIONS['rec-tab'] = el => recSheet(el.dataset.g);
  ACTIONS['rec-pick-add'] = () => {
    const list = gradeWords(recSheetK), pick = [...document.querySelectorAll('#recList input:checked:not(:disabled)')].map(i => list[+i.value]).filter(Boolean);
    if (!pick.length) return toast('담을 단어를 골라 주세요.');
    const cat = recAddWords(recSheetK, pick); recSheet(recSheetK); toast(`'${cat.name}'에 ${pick.length}개를 담았어요.`);
    if ($('recOv') && recSheetK === config.grade) recOpen();
  };
  ACTIONS['rec-left-add'] = () => {
    const own = ownedWords(), pick = gradeWords(recSheetK).filter(e => !own.has(e.w.toLowerCase()));
    if (!pick.length) return;
    const cat = recAddWords(recSheetK, pick); recSheet(recSheetK); toast(`'${cat.name}'에 ${pick.length}개를 담았어요.`);
    if ($('recOv') && recSheetK === config.grade) recOpen();
  };
  function recEntryHtml() {
    const k = config.grade, g = GRADE_NAMES[k];
    const sub = g ? `100개 중 ${gradeWords(k).length - recLeft(k).length}개를 담았어요` : '학년을 고르면 맞춤 단어를 추천해요';
    return `<button class="mg-entry" data-act="${g ? 'rec-all' : 'grade-pick'}"><span class="mg-ico">${IC.bell}</span><span class="mg-txt"><b>${g ? `${g} 추천 단어 100` : '학년별 추천 단어'}</b><small>${sub}</small></span><span class="mg-chev"></span></button>`;
  }

