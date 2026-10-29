  /* =========================================================
   * 학년별 추천 단어 (하단 알림 · 오늘 안보기)
   * ======================================================= */
  const GRADES = [['e1', '초1'], ['e2', '초2'], ['e3', '초3'], ['e4', '초4'], ['e5', '초5'], ['e6', '초6'], ['m1', '중1'], ['m2', '중2'], ['m3', '중3'], ['h1', '고1'], ['h2', '고2'], ['h3', '고3']];
  const GRADE_NAMES = Object.fromEntries(GRADES);
  const PACKS = [['basic', '기초'], ['mid', '중학교 필수'], ['high', '고등학교 필수'], ['csat', '수능 필수'], ['idiom', '필수 숙어·구동사'], ['life', '생활·여행 영어'], ['toeic', '토익 필수'], ['toefl', '토플·텝스 고급']];
  const PACK_NAMES = Object.fromEntries(PACKS);
  const ZH_PACKS = [1, 2, 3, 4, 5, 6].map(n => ['hsk' + n, `HSK ${n}급`]);
  const ZH_PACKS_NEW = [1, 2, 3, 4, 5, 6, 7].map(n => ['nhsk' + n, `신HSK ${n === 7 ? '7~9' : n}급`]);
  const ZH_PACK_NAMES = Object.fromEntries(ZH_PACKS.concat(ZH_PACKS_NEW));
  const ZS_PACKS = [['zs-1', '하'], ['zs-2', '중'], ['zs-3', '상'], ['zs-4', '최상']]; // 중국어 말하기 문장 난이도
  const ES_PACKS = [['es-1', '하'], ['es-2', '중'], ['es-3', '상'], ['es-4', '최상']]; // 영어 말하기 문장 난이도
  const ZS_NAMES = Object.fromEntries(ZS_PACKS.concat(ES_PACKS)); // 말하기 문장 묶음(중국어 zs-, 영어 es-)
  const listName = k => GRADE_NAMES[k] ? `${GRADE_NAMES[k]} 추천` : ZS_NAMES[k] ? `${k[0] === 'e' ? '영어' : '중국어'} 말하기 · ${ZS_NAMES[k]}` : (PACK_NAMES[k] || ZH_PACK_NAMES[k] || '');
  const gradeFull = k => { const n = GRADE_NAMES[k] || ''; return n ? ({ 초: '초등학교 ', 중: '중학교 ', 고: '고등학교 ' })[n[0]] + n.slice(1) + '학년' : ''; };
  const gradeOptions = sel => GRADES.map(([k]) => `<option value="${k}"${k === sel ? ' selected' : ''}>${gradeFull(k)}</option>`).join('');
  const roleOptions = sel => [['초등학생', 'e'], ['중학생', 'm'], ['고등학생', 'h']].map(([lb, p]) => `<optgroup label="${lb}">${GRADES.filter(([k]) => k[0] === p).map(([k]) => `<option value="${k}"${k === sel ? ' selected' : ''}>${gradeFull(k)}</option>`).join('')}</optgroup>`).join('') + `<optgroup label="선생님"><option value="teacher"${sel === 'teacher' ? ' selected' : ''}>선생님 (교사)</option></optgroup><optgroup label="일반"><option value="general"${sel === 'general' ? ' selected' : ''}>일반 (학교 다니지 않아요)</option></optgroup>`;
  const isTeacher = () => config.role === 'teacher';
  const isGeneral = () => config.role === 'general'; // 학생 · 선생님이 아닌 일반 사용자(학교 · 학번 없이)
  const myName = () => (config.profile && config.profile.name) || currentLabel || currentUser || '';
  const schoolLine = () => { const p = config.profile || {}; return [p.school, !isTeacher() && p.sno ? '학번 ' + p.sno : ''].filter(Boolean).join(' · '); };
  let gwCache = {};
  // 중국어 학년별 추천: HSK 1급부터 쉬운 순서로 줄 세운 뒤 초1부터 100개씩 나눠요 (고3까지 1,200개).
  function zhGradeWords(k) {
    if (!zhIdx) return [];
    const key = 'zg:' + k;
    if (!gwCache[key]) {
      const i = GRADES.findIndex(([g]) => g === k);
      const all = gwCache['zg:all'] || (gwCache['zg:all'] = zhIdx.filter(e => e[3] > 0).sort((a, b) => a[3] - b[3]));
      gwCache[key] = i < 0 ? [] : all.slice(i * 100, i * 100 + 100).map(e => ({ w: e[0], m: e[2], p: e[1] }));
    }
    return gwCache[key];
  }
  function gradeWords(k, en) {
    if (GRADE_NAMES[k] && !en && isZh()) return zhGradeWords(k);
    if (ZS_NAMES[k] && k[0] === 'e') { if (!esData) return []; return gwCache[k] || (gwCache[k] = (esData[k.slice(3)] || []).map(e => ({ w: e[0], m: e[1], ex: e[2], exKo: e[3] }))); }
    if (ZS_NAMES[k]) { if (!zsData) return []; return gwCache[k] || (gwCache[k] = (zsData[k.slice(3)] || []).map(e => ({ w: e[0], p: e[1], m: e[2], ex: e[3], exPy: e[4], exKo: e[5] }))); }
    if (ZH_PACK_NAMES[k]) { if (!zhIdx) return []; const nw = k[0] === 'n', lv = +k.replace(/\D/g, ''); return gwCache[k] || (gwCache[k] = zhIdx.filter(e => (nw ? e[4] : e[3]) === lv).map(e => ({ w: e[0], m: e[2], p: e[1] }))); }
    if (!gwCache[k]) {
      const raw = GW_E[k] || GW_MH[k] || GW_PACK[k] || '';
      gwCache[k] = raw ? raw.split('|').map(x => { const i = x.indexOf(':'); return { w: x.slice(0, i), m: x.slice(i + 1) }; }) : [];
    }
    return gwCache[k];
  }
  let dictMap = null;
  function builtinMeaning(word) {
    if (isHanWord(word)) { const e = zhMap && zhMap.get(String(word).trim()); return e ? e[2] : ''; }
    if (!dictMap) { dictMap = new Map(); [...GRADES, ...PACKS].forEach(([k]) => gradeWords(k, true).forEach(e => { const w = e.w.toLowerCase(); if (!dictMap.has(w)) dictMap.set(w, e.m); })); }
    return dictMap.get(String(word || '').trim().toLowerCase()) || '';
  }
  function setGrade(v) {
    if (v === 'teacher') { config.role = 'teacher'; config.grade = ''; syncStorage(); toast('선생님 화면으로 바꿨어요. 홈에 수업 도구가 생겨요.'); if (curTab === 'tabHome') renderHome(); return; }
    if (v === 'general') { config.role = 'general'; config.grade = ''; syncStorage(); toast('일반 사용자로 바꿨어요. 목적에 맞춘 코스를 추천해 드려요.'); if (curTab === 'tabHome') renderHome(); return; }
    config.role = ''; config.grade = GRADE_NAMES[v] ? v : ''; syncStorage();
    if (config.grade) toast(`${gradeFull(config.grade)} 단어를 추천해 드릴게요.`);
    if (curTab === 'tabHome') renderHome();
  }

  const recHideKey = () => 'vocapro_rec_hide:' + currentUser;
  const recBookName = k => ZS_NAMES[k] ? listName(k) : `${listName(k)} 단어`;
  let recShown = false, recView = '';
  function ownedWords() { const o = new Set(); allWords().forEach(({ w }) => o.add(w.word.toLowerCase())); return o; }
  // 말하기 문장은 다른 단어장에 같은 단어가 있어도 문장과 함께 따로 담아요
  function ownedFor(k) { if (!ZS_NAMES[k]) return ownedWords(); const c = categories.find(x => x.name === recBookName(k)); return new Set(c ? c.words.map(w => w.word) : []); }
  const recLeft = k => { const o = ownedWords(); return gradeWords(k).filter(e => !o.has(e.w.toLowerCase())); };
  function recMaybeShow() {
    if (recShown || !currentUser || isTeacher() || isGeneral() || $('pfOv')) return;
    let hid = ''; try { hid = LS.getItem(recHideKey()) || ''; } catch (e) {}
    if (hid === dayKey()) return;
    recShown = true;
    if (isZh() && !zhIdx) { zhLoad().then(d => { if (d && d.length && isZh()) recOpen(); }); return; }
    setTimeout(() => recOpen(), 500);
  }
  function recOpen(note) {
    if (!currentUser || $('authScreen').style.display !== 'none') return;
    let el = $('recOv');
    if (!el) { el = document.createElement('div'); el.className = 'rec'; el.id = 'recOv'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', '추천 단어'); document.body.appendChild(el); }
    const k = config.grade, g = GRADE_NAMES[k];
    const head = (t, sub) => `<div class="rec-head"><span class="rec-ico">${IC.bell}</span><div class="rec-title" data-act="rec-expand"><b>${esc(t)}</b><small>${esc(sub)}</small></div><button class="rec-x" data-act="rec-close" aria-label="닫기">${IC.x}</button></div>`;
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
    el.innerHTML = body + foot; el.classList.remove('mini');
    requestAnimationFrame(() => el.classList.add('show'));
  }
  // 추천 창이 화면 아래를 계속 가리지 않게: 스크롤하거나 다른 탭으로 가면 작은 막대로 접고, 누르면 다시 펼쳐요
  ACTIONS['rec-expand'] = () => { const el = $('recOv'); if (el) el.classList.remove('mini'); };
  const recMini = () => { const el = $('recOv'); if (el && el.classList.contains('show') && !el.classList.contains('mini')) el.classList.add('mini'); };
  window.addEventListener('scroll', () => { if (window.scrollY > 60) recMini(); }, { passive: true });
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
    list.forEach(e => { if (!have.has(e.w.toLowerCase())) { cat.words.push(sanitizeWord({ ...(full[e.w.toLowerCase()] || {}), id: uid(), word: e.w, meaning: e.m, ...(e.ex ? { phonetic: e.p, example: e.ex, exampleKo: e.exKo, exPy: e.exPy } : {}) })); have.add(e.w.toLowerCase()); } });
    syncStorage(); autoFill(cat.words.slice(-list.length)); recView = cat.id;
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
  ACTIONS['rec-all'] = async () => {
    if (isZh() && !zhIdx) { const d = await zhLoad(); if (!d.length) return toast('단어 목록을 불러오지 못했어요. 인터넷을 확인해 주세요.'); }
    recSheet(config.grade || 'e1');
  };
  ACTIONS['grade-pick'] = () => openSheet('학년 선택', `<p class="muted" style="margin:0 0 12px;font-size:.88rem;">학년에 맞는 단어 100개를 추천해 드려요.</p><div class="grade-grid">${GRADES.map(([k, n]) => `<button class="grade-btn ${k === config.grade && !isTeacher() ? 'on' : ''}" data-act="grade-set" data-g="${k}"><b>${n}</b><small>${gradeFull(k).replace(/\s.*/, '')}</small></button>`).join('')}<button class="grade-btn wide ${isTeacher() ? 'on' : ''}" data-act="grade-set" data-g="teacher"><b>선생님</b><small>수업 도구를 먼저 보여줘요</small></button></div>`);
  ACTIONS['grade-set'] = el => { closeSheet(); setGrade(el.dataset.g); if (isTeacher()) return; recShown = false; try { LS.removeItem(recHideKey()); } catch (e) {} recMaybeShow(); };

  let recSheetK = '';
  function recSheet(k) {
    recSheetK = k;
    const own = ownedFor(k), list = gradeWords(k), left = list.filter(e => !own.has(e.w.toLowerCase())).length, zs = ZS_NAMES[k];
    openSheet(zs ? `${listName(k)} 문장 ${list.length}` : `${listName(k)} 단어 ${list.length}`, `${zs ? '<p class="muted rec-zs">단어와 그 단어가 들어간 문장을 함께 담아요. 선생님은 이 단어장으로 발음 평가를 내고 \'예문까지\'를 고르면 학생이 문장을 읽어요.</p>' : ''}
      <div class="rec-tabs">${(zs ? [k[0] === 'e' ? ES_PACKS : ZS_PACKS] : isZh() ? [GRADES, ZH_PACKS, ZH_PACKS_NEW] : [PACKS, GRADES]).map(g => `<div class="rec-tab-row">${g.map(([gk, n]) => `<button class="chip ${gk === k ? 'on' : ''}${PACK_NAMES[gk] ? ' pack' : ''}" data-act="rec-tab" data-g="${gk}">${n}</button>`).join('')}</div>`).join('')}</div>
      <div class="rec-list" id="recList"></div><button class="rec-more" id="recMore" data-act="rec-more" hidden>더 보기</button>
      <div class="rec-bar"><button class="btn btn-soft" data-act="rec-pick-add">선택한 단어 담기</button><button class="btn btn-primary" data-act="rec-left-add" ${left ? '' : 'disabled'}>남은 ${left}개 모두 담기</button></div>`);
    recRowsAt = 0; recOwn = own; recMore();
    // 수천 개를 한 번에 그리면 휴대폰이 멈춰요. 150개씩, 아래로 내리면 이어서 그려요.
    if (recIO) recIO.disconnect();
    if ('IntersectionObserver' in window) { recIO = new IntersectionObserver(es => { if (es.some(x => x.isIntersecting)) recMore(); }, { rootMargin: '400px 0px' }); recIO.observe($('recMore')); }
  }
  ACTIONS['rec-tab'] = async el => {
    const g = el.dataset.g;
    if ((ZH_PACK_NAMES[g] || (GRADE_NAMES[g] && isZh())) && !zhIdx) { const d = await zhLoad(); if (!d.length) return toast('단어 목록을 불러오지 못했어요. 인터넷을 확인해 주세요.'); } // 중국어 책장은 목록부터
    if (ZS_NAMES[g] && !(g[0] === 'e' ? esData : zsData) && !(await spkPackLoad(g))) return toast('문장 목록을 불러오지 못했어요. 인터넷을 확인해 주세요.');
    recSheet(g);
  };
  const REC_STEP = 150;
  let recRowsAt = 0, recOwn = new Set(), recIO = null;
  const recRowHtml = (e, i, has) => `<label class="rec-row ${has ? 'has' : ''}${e.ex ? ' zs' : ''}"><input type="checkbox" value="${i}" ${has ? 'checked disabled' : ''}><span class="w-no">${String(i + 1).padStart(3, '0')}</span><b>${esc(e.w)}</b><span class="rec-m">${e.p ? `<i class="rec-py">${esc(e.p)}</i> ` : ''}${esc(e.m)}</span>${has ? '<em>담음</em>' : ''}${e.ex ? `<span class="rec-ex"><b lang="zh-CN">${esc(e.ex)}</b><i>${esc(e.exPy)}</i><small>${esc(e.exKo)}</small></span>` : ''}</label>`;
  function recMore() {
    const box = $('recList'), btn = $('recMore'); if (!box || !btn) return;
    const list = gradeWords(recSheetK), end = Math.min(list.length, recRowsAt + REC_STEP);
    box.insertAdjacentHTML('beforeend', list.slice(recRowsAt, end).map((e, j) => recRowHtml(e, recRowsAt + j, recOwn.has(e.w.toLowerCase()))).join(''));
    recRowsAt = end; btn.hidden = end >= list.length; btn.textContent = `더 보기 (${(list.length - end).toLocaleString()}개 남음)`;
  }
  ACTIONS['rec-more'] = () => recMore();
  ACTIONS['rec-pick-add'] = async () => {
    const list = gradeWords(recSheetK), pick = [...document.querySelectorAll('#recList input:checked:not(:disabled)')].map(i => list[+i.value]).filter(Boolean);
    if (!pick.length) return toast('담을 단어를 골라 주세요.');
    const cat = await recAddWords(recSheetK, pick); recSheet(recSheetK); toast(`'${cat.name}'에 ${pick.length}개를 담았어요.`);
    if ($('recOv') && recSheetK === config.grade) recOpen();
  };
  ACTIONS['rec-left-add'] = async () => {
    const own = ownedFor(recSheetK), pick = gradeWords(recSheetK).filter(e => !own.has(e.w.toLowerCase()));
    if (!pick.length) return;
    const cat = await recAddWords(recSheetK, pick); recSheet(recSheetK); toast(`'${cat.name}'에 ${pick.length}개를 담았어요.`);
    if ($('recOv') && recSheetK === config.grade) recOpen();
  };
  // 홈의 '추천 단어장' 책장: 표지를 넘겨 보며 바로 열어요. 담은 만큼 표지 아래 막대가 차요.
  const SHELF = {
    basic: ['ABC', '기초 생활 단어', '#22c55e', '#0d9488'], mid: ['중학', '중학교 필수', '#3b82f6', '#6366f1'], high: ['고교', '고등학교 필수', '#8b5cf6', '#d946ef'], csat: ['수능', '수능 필수', '#f43f5e', '#f97316'],
    idiom: ['숙어', '숙어·구동사', '#0ea5e9', '#14b8a6'], life: ['여행', '생활·여행 영어', '#10b981', '#65a30d'], toeic: ['TOEIC', '토익 필수', '#1d4ed8', '#0891b2'], toefl: ['TOEFL', '토플·텝스 고급', '#7c3aed', '#1e40af']
  };
  const ZH_COLORS = [['#f97316', '#ef4444'], ['#ef4444', '#db2777'], ['#e11d48', '#9333ea'], ['#dc2626', '#b45309'], ['#be123c', '#7c2d12'], ['#9f1239', '#4c1d95'], ['#7f1d1d', '#1f2937']];
  function shelfHtml() {
    if (isTeacher()) return '';
    const own = ownedWords(), zh = isZh();
    if (!zh && !esData) esLoad();
    const keys = zh ? ZS_PACKS.concat(ZH_PACKS, ZH_PACKS_NEW).map(p => p[0]) : ES_PACKS.concat(PACKS).map(p => p[0]);
    const cards = keys.map(k => {
      const list = gradeWords(k), n = list.length, mine = ZS_NAMES[k] ? ownedFor(k) : own, has = n ? list.filter(e => mine.has(zh ? e.w : e.w.toLowerCase())).length : 0;
      let tag, name, c1, c2;
      if (ZS_NAMES[k]) { tag = '말하기 ' + ZS_NAMES[k]; name = listName(k); [c1, c2] = { 'zs-1': ['#0ea5e9', '#14b8a6'], 'zs-2': ['#6366f1', '#0ea5e9'], 'zs-3': ['#7c3aed', '#be185d'], 'zs-4': ['#be123c', '#1f2937'], 'es-1': ['#0ea5e9', '#14b8a6'], 'es-2': ['#6366f1', '#0ea5e9'], 'es-3': ['#7c3aed', '#be185d'], 'es-4': ['#be123c', '#1f2937'] }[k]; }
      else if (zh) { const nw = k[0] === 'n', lv = +k.replace(/\D/g, ''); [c1, c2] = ZH_COLORS[(lv - 1) % 7]; tag = nw ? (lv === 7 ? '新7-9' : '新 ' + lv) : 'HSK ' + lv; name = ZH_PACK_NAMES[k]; if (nw) { c1 = '#ca8a04'; c2 = ZH_COLORS[(lv - 1) % 7][1]; } }
      else [tag, name, c1, c2] = SHELF[k] || [k, PACK_NAMES[k], '#64748b', '#334155'];
      return `<button class="shelf-b" data-act="rec-tab" data-g="${k}" style="--c1:${c1};--c2:${c2}" aria-label="${esc(name)} 단어장 열기">
        <span class="shelf-cover"><i class="shelf-spine"></i><b>${esc(tag)}</b><em>${n ? n.toLocaleString() + (ZS_NAMES[k] ? ' sentences' : ' words') : '…'}</em></span>
        <span class="shelf-name">${esc(name)}</span>
        <span class="shelf-bar"><i style="width:${n ? Math.round(has / n * 100) : 0}%"></i></span>
        <small>${n ? (has ? `${has.toLocaleString()} / ${n.toLocaleString()}개 담음` : `${n.toLocaleString()}개`) : '불러오는 중'}</small>
      </button>`;
    }).join('');
    return `<div class="h-shelf"><div class="section-title"><span>추천 단어장</span><button data-act="pack-open">전체 보기</button></div><div class="shelf" role="list">${cards}</div></div>`;
  }
  function packEntryHtml() {
    if (isZh()) return `<button class="mg-entry" data-act="rec-tab" data-g="${/^h/.test(config.grade) ? 'zs-3' : /^e/.test(config.grade) ? 'zs-1' : 'zs-2'}"><span class="mg-ico i-sun">${IC.mic}</span><span class="mg-txt"><b>중국어 말하기 문장 (하 · 중 · 상 · 최상)</b><small>난이도별 문장 ${zsData ? ZS_PACKS.reduce((n, [k]) => n + gradeWords(k).length, 0) + '개' : ''}를 병음 · 해석과 함께 담아요</small></span><span class="mg-chev"></span></button><button class="mg-entry" data-act="pack-open"><span class="mg-ico i-mint">${IC.book}</span><span class="mg-txt"><b>HSK 1~6급 · 신HSK 1~9급 단어</b><small>${zhIdx ? zhIdx.length.toLocaleString() + '개' : '1만 개가 넘는'} 단어를 급수별로 골라 담아요</small></span><span class="mg-chev"></span></button>`;
    const total = PACKS.reduce((n, [k]) => n + gradeWords(k).length, 0);
    if (!esData) esLoad();
    return `<button class="mg-entry" data-act="rec-tab" data-g="${/^h/.test(config.grade) ? 'es-3' : /^e/.test(config.grade) ? 'es-1' : 'es-2'}"><span class="mg-ico i-sun">${IC.mic}</span><span class="mg-txt"><b>영어 말하기 문장 (하 · 중 · 상 · 최상)</b><small>난이도별 문장 ${esData ? ES_PACKS.reduce((n, [k]) => n + gradeWords(k).length, 0) + '개' : ''}를 해석과 함께 담아요</small></span><span class="mg-chev"></span></button><button class="mg-entry" data-act="pack-open"><span class="mg-ico i-mint">${IC.book}</span><span class="mg-txt"><b>학교 · 수능 · 숙어 · 토익 · 토플 단어</b><small>${total.toLocaleString()}개 단어를 골라 담아요</small></span><span class="mg-chev"></span></button>`;
  }
  ACTIONS['pack-open'] = async () => {
    if (isZh()) { const d = await zhLoad(); if (!d.length) return toast('단어 목록을 불러오지 못했어요. 인터넷을 확인해 주세요.'); const own = ownedWords(); return recSheet(ZH_PACKS.map(p => p[0]).find(k => gradeWords(k).some(e => !own.has(e.w))) || 'hsk1'); }
    recSheet(config.grade === 'h3' ? 'csat' : /^h/.test(config.grade) ? 'high' : /^m/.test(config.grade) ? 'mid' : 'basic');
  };
  function recEntryHtml() {
    if (isZh() && !zhIdx) zhLoad();
    const k = config.grade, g = GRADE_NAMES[k];
    const sub = g ? `100개 중 ${gradeWords(k).length - recLeft(k).length}개를 담았어요` : '학년을 고르면 맞춤 단어를 추천해요';
    return `<button class="mg-entry" data-act="${g ? 'rec-all' : 'grade-pick'}"><span class="mg-ico i-sun">${IC.bell}</span><span class="mg-txt"><b>${g ? `${g} 추천 단어 100` : '학년별 추천 단어'}</b><small>${sub}</small></span><span class="mg-chev"></span></button>`;
  }

