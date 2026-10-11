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
    return `<button class="mg-entry" data-act="pack-open"><span class="mg-ico">${IC.book}</span><span class="mg-txt"><b>기초 · 중학교 · 고등학교 · 수능 단어</b><small>${total.toLocaleString()}개 단어를 골라 담아요</small></span><span class="mg-chev"></span></button>`;
  }
  ACTIONS['pack-open'] = () => recSheet(config.grade === 'h3' ? 'csat' : /^h/.test(config.grade) ? 'high' : /^m/.test(config.grade) ? 'mid' : 'basic');
  function recEntryHtml() {
    const k = config.grade, g = GRADE_NAMES[k];
    const sub = g ? `100개 중 ${gradeWords(k).length - recLeft(k).length}개를 담았어요` : '학년을 고르면 맞춤 단어를 추천해요';
    return `<button class="mg-entry" data-act="${g ? 'rec-all' : 'grade-pick'}"><span class="mg-ico">${IC.bell}</span><span class="mg-txt"><b>${g ? `${g} 추천 단어 100` : '학년별 추천 단어'}</b><small>${sub}</small></span><span class="mg-chev"></span></button>`;
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
    return `<div id="capBox" style="display:${su || authFails >= 3 ? 'block' : 'none'}"><div class="cap-row"><canvas id="capCv" width="160" height="52" aria-label="보안문자"></canvas><button type="button" class="btn btn-soft" data-act="cap-refresh">새로고침</button></div><input type="text" id="capIn" placeholder="위 문자를 입력하세요" maxlength="5" autocapitalize="characters" autocomplete="off" spellcheck="false"></div>${su ? '<label class="switch-row"><input type="checkbox" id="auTerms"><span>(필수) <a class="lg-a" data-act="legal" data-k="terms">이용약관</a> 및 <a class="lg-a" data-act="legal" data-k="privacy">개인정보 처리방침</a>에 동의해요</span></label>' : ''}`;
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

  const LEGAL = {
    terms: ['이용약관', [
      ['제1조 (목적)', 'VocaPro(이하 "서비스")는 영어 단어 학습을 돕는 앱입니다. 이 약관은 서비스 이용에 관한 운영자(김주원)와 이용자의 권리와 의무를 정합니다.'],
      ['제2조 (계정)', '이용자는 아이디와 비밀번호로 가입합니다. 비밀번호는 이메일 등 복구 수단이 없어, 잊으면 되찾을 수 없습니다. 계정 관리 책임은 이용자에게 있습니다.'],
      ['제3조 (서비스 내용)', '단어장 관리, 반복 학습, 퀴즈, 번역, 학습 통계, 기기 간 동기화 기능을 제공합니다. 일부 기능(AI 자동 채우기, 번역)은 외부 서비스에 의존하며, 이 서비스의 사정으로 제한되거나 중단될 수 있습니다.'],
      ['제4조 (금지 행위)', '타인의 계정을 도용하거나, 서비스를 자동화된 수단으로 과도하게 호출하거나, 서비스의 정상 운영을 방해하는 행위를 금지합니다.'],
      ['제5조 (이용자 데이터)', '이용자가 만든 단어장과 학습 기록은 이용자의 것입니다. 설정에서 언제든 내려받거나 계정과 함께 삭제할 수 있습니다.'],
      ['제6조 (면책)', '학습 결과와 AI·번역 결과의 정확성은 보장되지 않습니다. 천재지변, 외부 서비스 장애 등 운영자가 통제할 수 없는 사유로 인한 손해에는 책임을 지지 않습니다.'],
      ['제7조 (약관 변경)', '약관을 바꿀 때는 앱 안에서 알립니다. 변경 후에도 계속 이용하면 동의한 것으로 봅니다.'],
      ['시행일', '2026년 10월 11일']]],
    privacy: ['개인정보 처리방침', [
      ['1. 수집하는 정보', '아이디, 비밀번호(복호화할 수 없는 해시 형태로 저장), 로그인 세션 정보, 이용자가 입력한 단어장·학습 기록·설정. 이메일, 전화번호, 위치 정보는 수집하지 않습니다.'],
      ['2. 이용 목적', '계정 인증, 기기 간 데이터 동기화, 서비스 제공과 오류 대응.'],
      ['3. 보관 기간', '계정을 삭제할 때까지 보관하며, 설정의 "계정과 데이터 삭제"를 누르면 서버 데이터가 즉시 삭제됩니다.'],
      ['4. 처리 위탁·외부 전송', '데이터 저장: Supabase. 앱 배포: Netlify. 글꼴: jsDelivr. 번역 시 입력한 문장은 번역 서비스(MyMemory 또는 AI 제공자)로 전송됩니다. 이용자가 직접 입력한 AI 키(Google, OpenAI, xAI, Anthropic)는 이 기기에만 저장하며 서버로 보내지 않습니다. 광고와 행태 분석 도구는 사용하지 않습니다.'],
      ['5. 이용자의 권리', '언제든 열람(백업 내려받기), 수정, 삭제할 수 있습니다.'],
      ['6. 만 14세 미만', '만 14세 미만은 법정대리인의 동의를 받아 이용해야 합니다.'],
      ['7. 문의', '개인정보 관련 문의: 개발자 김주원 ([문의 이메일 기재 필요])'],
      ['시행일', '2026년 10월 11일']]]
  };
  ACTIONS.legal = el => {
    const d = LEGAL[el.dataset.k]; if (!d || $('lgOv')) return;
    const ov = document.createElement('div'); ov.className = 'ob lt lg'; ov.id = 'lgOv'; ov.style.zIndex = 700;
    ov.innerHTML = `<button class="ob-skip" data-lg="x">닫기</button><div class="lg-body"><h2>${d[0]}</h2>${d[1].map(([h, t]) => `<h4>${esc(h)}</h4><p>${esc(t)}</p>`).join('')}</div>`;
    ov.addEventListener('click', e => { if (e.target.closest('[data-lg]')) ov.remove(); });
    document.body.appendChild(ov);
  };
  function legalLinksHtml() { return '<div class="legal-links"><a class="lg-a" data-act="legal" data-k="terms">이용약관</a> · <a class="lg-a" data-act="legal" data-k="privacy">개인정보 처리방침</a></div>'; }

  function flowEntryHtml() { return `<button class="mg-entry" data-act="flow"><span class="mg-ico">${IC.repeat}</span><span class="mg-txt"><b>4단계 집중 학습</b><small>보기, 고르기, 쓰기, 시험으로 확실하게</small></span><span class="mg-chev"></span></button>`; }

  /* =========================================================
   * 시작
   * ======================================================= */
  if ('speechSynthesis' in window) { try { window.speechSynthesis.getVoices(); } catch (e) {} }
  try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) {}
  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  let deferredInstall = null;
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredInstall = e; });
  ACTIONS.install = async () => {
    if (!deferredInstall) return say('브라우저 메뉴에서 "홈 화면에 추가"를 눌러 설치할 수 있어요.\n아이폰은 공유 버튼, 홈 화면에 추가예요.');
    deferredInstall.prompt(); try { await deferredInstall.userChoice; } catch (e) {} deferredInstall = null;
  };
  let lastErrAt = 0;
  const softErr = () => { if (Date.now() - lastErrAt > 4000) { lastErrAt = Date.now(); try { toast('일시적인 문제가 생겼어요. 계속 반복되면 새로고침해 주세요.'); } catch (e) {} } };
  window.addEventListener('error', e => { if (e && e.message && !/ResizeObserver/.test(e.message)) softErr(); });
  window.addEventListener('unhandledrejection', e => { e.preventDefault && e.preventDefault(); softErr(); });
  applyTheme();
  let sess = null;
  try { sess = LS.getItem(KEY_SESS) || sessionStorage.getItem(KEY_SESS); } catch (e) {}
  if (cloudMode) bootCloud(); else if (sess && getUsers()[sess]) enterApp(sess); else showAuth();
