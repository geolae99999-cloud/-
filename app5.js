
  /* =========================================================
   * 번역
   * ======================================================= */
  const HANGUL = /[\u3131-\u318e\uac00-\ud7a3]/, WORDRE = /^[A-Za-z][A-Za-z' -]{0,38}$/;
  let trBusy = false, trLast = null;
  function closeTranslator() { const o = $('trOv'); if (o) o.remove(); }
  function openTranslator(prefill) {
    if ($('trOv')) return;
    const ov = document.createElement('div'); ov.className = 'tr-ov'; ov.id = 'trOv';
    ov.innerHTML = `<div class="tr-sheet" role="dialog" aria-modal="true" aria-label="번역"><div class="tr-grab"></div>
      <div class="tr-head"><b>번역</b><span id="trDir" class="tr-dir">자동 감지</span><button class="tr-x" data-act="tr-close" aria-label="닫기">${IC.x}</button></div>
      <textarea id="trIn" rows="4" maxlength="1000" placeholder="영어 또는 한국어 문장을 입력하세요" spellcheck="false"></textarea>
      <div class="tr-actions"><button class="btn btn-soft" data-act="tr-clear">지우기</button><button class="btn btn-primary" id="trGo" data-act="tr-go" style="flex:1">번역하기</button></div>
      <div id="trOut" class="tr-out" style="display:none"></div></div>`;
    document.body.appendChild(ov);
    const inp = $('trIn');
    const dir = () => { $('trDir').textContent = inp.value.trim() ? (HANGUL.test(inp.value) ? '한국어 → English' : 'English → 한국어') : '자동 감지'; };
    ov.addEventListener('click', e => { if (e.target === ov) closeTranslator(); });
    inp.addEventListener('input', dir);
    inp.addEventListener('keydown', e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); ACTIONS['tr-go'](); } });
    if (prefill) { inp.value = prefill; dir(); }
    setTimeout(() => inp.focus(), 80);
  }
  async function translateText(text, toKo) {
    const from = toKo ? 'English' : 'Korean', to = toKo ? 'Korean' : 'English';
    if (cleanKey(config.keys && config.keys[config.provider]) || (cloudMode && window.Cloud && Cloud.ai)) {
      try {
        const r = await callAi(`Translate the text below from ${from} to ${to}. Natural and accurate; keep the meaning and tone. Reply with JSON only, no markdown: {"t":"<translation>"}\n\nTEXT: ${JSON.stringify(text)}`,
          o => (o && typeof o.t === 'string' && o.t.trim() ? { t: o.t.trim() } : null));
        return { t: r.t, by: 'AI 번역' };
      } catch (e) { /* 기본 번역으로 대체 */ }
    }
    const ctl = new AbortController(), tm = setTimeout(() => ctl.abort(), 12000);
    try {
      const res = await fetch('https://api.mymemory.translated.net/get?q=' + encodeURIComponent(text) + '&langpair=' + (toKo ? 'en|ko' : 'ko|en'), { signal: ctl.signal });
      const j = await res.json();
      let t = j && j.responseData && j.responseData.translatedText;
      if (!res.ok || !t || String(j.responseStatus) !== '200' || /MYMEMORY WARNING|INVALID/i.test(t)) throw new Error('fail');
      const d = document.createElement('textarea'); d.innerHTML = t; t = d.value.trim();
      if (!t) throw new Error('empty');
      return { t, by: '기본 번역' };
    } finally { clearTimeout(tm); }
  }
  ACTIONS['tr-close'] = closeTranslator;
  ACTIONS['tr-clear'] = () => { const i = $('trIn'); if (!i) return; i.value = ''; i.dispatchEvent(new Event('input')); $('trOut').style.display = 'none'; i.focus(); };
  ACTIONS['tr-go'] = async () => {
    const inp = $('trIn'); if (!inp || trBusy) return;
    const text = inp.value.trim(); if (!text) return toast('번역할 내용을 입력해 주세요.');
    const toKo = !HANGUL.test(text), btn = $('trGo'), out = $('trOut');
    trBusy = true; btn.disabled = true; btn.textContent = '번역 중...';
    out.style.display = 'block'; out.innerHTML = '<div class="tr-load"><i></i><i></i><i></i></div>';
    try {
      const r = await translateText(text, toKo);
      if (!$('trOut')) return;
      trLast = { toKo, en: toKo ? text : r.t, ko: toKo ? r.t : text, t: r.t };
      const single = WORDRE.test(trLast.en.trim());
      $('trOut').innerHTML = `<div class="tr-lang">${toKo ? 'KOREAN' : 'ENGLISH'} · ${esc(r.by)}</div><div class="tr-text">${esc(r.t)}</div>
        <div class="tr-actions"><button class="btn btn-soft" data-act="tr-speak">${IC.speaker} 영어 발음</button><button class="btn btn-soft" data-act="tr-copy">복사</button></div>
        ${single ? `<div class="tr-add"><select id="trBook">${categories.map(c => `<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('')}</select><button class="btn btn-primary" data-act="tr-add">단어장에 추가</button></div>` : ''}`;
    } catch (e) { if ($('trOut')) $('trOut').innerHTML = '<div class="tr-err">번역하지 못했어요. 인터넷을 확인하거나 잠시 뒤 다시 시도해 주세요.</div>'; }
    finally { trBusy = false; const b = $('trGo'); if (b) { b.disabled = false; b.textContent = '번역하기'; } }
  };
  ACTIONS['tr-speak'] = () => { if (trLast) speak(trLast.en, 'en-US'); };
  ACTIONS['tr-copy'] = async () => { try { await navigator.clipboard.writeText(trLast.t); toast('복사했어요.'); } catch (e) { toast('복사하지 못했어요. 직접 선택해서 복사해 주세요.'); } };
  ACTIONS['tr-add'] = () => {
    const sel = $('trBook'), cat = sel && categories.find(c => c.id === sel.value); if (!cat || !trLast) return;
    const en = trLast.en.trim(), ko = trLast.ko.trim();
    if (cat.words.some(w => w.word.toLowerCase() === en.toLowerCase())) return toast('이미 있는 단어예요.');
    cat.words.unshift(sanitizeWord({ id: uid(), word: en, meaning: ko }));
    syncStorage(); try { go(curTab); } catch (e) {}
    toast(`'${en}'를 ${cat.name}에 추가했어요.`);
  };
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && $('trOv') && !document.querySelector('.dlg-ov')) closeTranslator(); });
  (function () {
    const fab = document.createElement('button');
    fab.className = 'tr-fab'; fab.setAttribute('aria-label', '번역'); fab.innerHTML = IC.translate;
    fab.addEventListener('click', () => openTranslator());
    document.body.appendChild(fab);
  })();

  const WOD = [["resilient", "회복력 있는", "She is resilient in the face of failure."], ["meticulous", "꼼꼼한", "He is meticulous about every detail."], ["inevitable", "피할 수 없는", "Change is inevitable in life."], ["ambiguous", "모호한", "The instructions were ambiguous."], ["persevere", "끈기 있게 계속하다", "You must persevere to reach your goal."], ["authentic", "진짜의, 진정한", "I want an authentic experience."], ["reluctant", "꺼리는", "He was reluctant to speak up."], ["vivid", "생생한", "She has a vivid imagination."], ["thrive", "번창하다", "Plants thrive in bright light."], ["compelling", "설득력 있는", "He made a compelling argument."], ["diligent", "부지런한", "A diligent student reviews daily."], ["subtle", "미묘한", "There is a subtle difference."], ["overwhelm", "압도하다", "Don't let stress overwhelm you."], ["flourish", "번성하다", "Small businesses flourish here."], ["candid", "솔직한", "Thanks for your candid feedback."], ["endeavor", "노력, 시도", "We admire your endeavor."], ["profound", "깊은, 심오한", "It had a profound effect on me."], ["elaborate", "자세히 설명하다", "Could you elaborate on that?"], ["trivial", "사소한", "Don't worry about trivial things."], ["insight", "통찰력", "Her talk gave me real insight."], ["hesitate", "망설이다", "Don't hesitate to ask questions."], ["genuine", "진짜의, 진심의", "She showed genuine concern."], ["adapt", "적응하다", "Humans adapt to new places."], ["consistent", "꾸준한, 일관된", "Be consistent and results will come."], ["anticipate", "예상하다", "We anticipate a busy weekend."], ["embrace", "받아들이다", "Embrace new challenges."]];
  function wodToday() { const d = new Date(); return WOD[Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 864e5) % WOD.length]; }
  function wodHtml() {
    const [w, m, e] = wodToday();
    return `<div class="wod"><div class="wod-top"><span class="wod-tag">오늘의 단어</span><button class="wod-btn" data-act="wod-speak" aria-label="발음 듣기">${IC.speaker}</button></div><div class="wod-word">${esc(w)}</div><div class="wod-mean">${esc(m)}</div><div class="wod-ex">${esc(e)}</div><button class="btn btn-soft btn-block" data-act="wod-add" style="margin-top:14px;">내 단어장에 추가</button></div><button class="mg-entry" data-act="match"><span class="mg-ico">${IC.cards}</span><span class="mg-txt"><b>짝 맞추기</b><small>영어와 뜻을 빠르게 연결해요</small></span><span class="mg-chev"></span></button>${flowEntryHtml()}${ltEntryHtml()}`;
  }
  ACTIONS['wod-speak'] = () => speak(wodToday()[0], 'en-US');
  ACTIONS['wod-add'] = () => {
    const [w, m, e] = wodToday();
    let cat = categories.find(c => c.name === '오늘의 단어');
    if (!cat) { cat = { id: 'c' + uid(), name: '오늘의 단어', words: [] }; categories.push(cat); }
    if (cat.words.some(x => x.word.toLowerCase() === w)) return toast('이미 추가한 단어예요.');
    cat.words.unshift(sanitizeWord({ id: uid(), word: w, meaning: m, example: e }));
    syncStorage(); try { go(curTab); } catch (x) {}
    toast(`'${w}'를 '오늘의 단어' 단어장에 추가했어요.`);
  };
  const OB = [[IC.sprout, '매일 조금씩, 끝까지', '하루 목표만큼만 외워요. 복습할 시기는 앱이 알아서 챙겨 드려요.'], [IC.repeat, '잊을 때쯤 다시 만나요', '틀린 단어는 더 자주, 아는 단어는 천천히. 검증된 반복 학습 방식이에요.'], [IC.headphones, '눈으로, 귀로, 손으로', '플래시카드, 퀴즈, 받아쓰기, 듣기 모드로 질리지 않게 외워요.']];
  function showOnboarding() {
    if (LS.getItem('vocapro_onboarded') || $('obOv')) return;
    let i = 0; const ov = document.createElement('div'); ov.className = 'ob'; ov.id = 'obOv'; document.body.appendChild(ov);
    const draw = () => {
      const [ic, t, d] = OB[i];
      ov.innerHTML = `<button class="ob-skip" data-ob="skip">건너뛰기</button><div class="ob-body"><div class="ob-ic">${ic}</div><h2>${t}</h2><p>${d}</p></div><div class="ob-foot"><div class="ob-dots">${OB.map((_, k) => `<i class="${k === i ? 'on' : ''}"></i>`).join('')}</div><button class="btn btn-primary btn-block" data-ob="next">${i === OB.length - 1 ? '시작하기' : '다음'}</button></div>`;
    };
    const done = () => { try { LS.setItem('vocapro_onboarded', '1'); } catch (e) {} ov.remove(); setTimeout(() => { try { ltOpen(true); } catch (e) {} }, 150); };
    ov.addEventListener('click', e => { const b = e.target.closest('[data-ob]'); if (!b) return; if (b.dataset.ob === 'skip' || i === OB.length - 1) return done(); i++; draw(); });
    draw();
  }
  ACTIONS['pw-change'] = async () => {
    const o = await ask('현재 비밀번호를 입력하세요.', { input: '', pw: true, ok: '다음' }); if (!o) return;
    const n = await ask('새 비밀번호를 입력하세요. (6자 이상)', { input: '', pw: true, ok: '변경' }); if (!n) return;
    if (n.length < 6) return say('새 비밀번호는 6자 이상이어야 해요.');
    try { await Cloud.changePw(o, n); toast('비밀번호를 바꿨어요.'); } catch (e) { say(e.code === 'invalid' ? '현재 비밀번호가 맞지 않아요.' : cloudMsg(e)); }
  };

  /* ----- 복습 알림 ----- */
  const rmKey = () => 'vocapro_rm:' + currentUser;
  const rmGet = () => loadJson(rmKey()) || { on: false, time: '20:00', last: '' };
  const rmSet = o => { try { LS.setItem(rmKey(), JSON.stringify(o)); } catch (e) {} };
  const dueCount = () => counts().due;
  function rmUI() {
    const r = rmGet(), on = $('rmOn'); if (!on) return;
    on.checked = !!r.on; $('rmTime').value = r.time;
    $('rmNote').textContent = r.on ? `복습할 단어가 있는 날, ${r.time} 이후에 앱을 열면 알려 드려요.` : '복습할 단어가 있는 날, 정한 시간 이후에 알려 드려요.';
  }
  async function rmSave() {
    const r = rmGet(); r.on = $('rmOn').checked; r.time = $('rmTime').value || '20:00';
    if (r.on) {
      if (!('Notification' in window)) { r.on = false; say('이 브라우저는 알림을 지원하지 않아요.\n홈 화면에 설치한 앱에서 사용해 보세요.'); }
      else if (Notification.permission !== 'granted') {
        let perm = 'denied'; try { perm = await Notification.requestPermission(); } catch (e) {}
        if (perm !== 'granted') { r.on = false; say('알림이 허용되지 않았어요.\n브라우저 설정에서 이 사이트의 알림을 허용해 주세요.'); }
      }
    }
    rmSet(r); rmUI(); rmCheck();
  }
  async function rmCheck() {
    if (!currentUser) return;
    const r = rmGet(), n = dueCount();
    try { if (navigator.setAppBadge) { if (r.on && n > 0) navigator.setAppBadge(n); else navigator.clearAppBadge(); } } catch (e) {}
    if (!r.on || !('Notification' in window) || Notification.permission !== 'granted' || r.last === dayKey()) return;
    const d = new Date(), [h, m] = r.time.split(':').map(Number);
    if (d.getHours() * 60 + d.getMinutes() < h * 60 + m || n === 0 || (stats.days[dayKey()] || { n: 0 }).n > 0) return;
    r.last = dayKey(); rmSet(r);
    const opt = { body: `오늘 복습할 단어 ${n}개가 기다리고 있어요.`, icon: 'icon-192.png', badge: 'icon-192.png', tag: 'vocapro-review' };
    try { const reg = 'serviceWorker' in navigator && await navigator.serviceWorker.getRegistration(); if (reg) await reg.showNotification('VocaPro', opt); else new Notification('VocaPro', opt); } catch (e) {}
  }
  setInterval(rmCheck, 60000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) rmCheck(); });

  /* ----- 짝 맞추기 ----- */
  let mgT = null;
  function closeMatch() { clearInterval(mgT); const o = $('mgOv'); if (o) o.remove(); }
  function openMatch() {
    const ws = allWords().map(x => x.w).filter(w => w.word && w.meaning);
    if (ws.length < 4) return toast('단어가 4개 이상 있어야 해요.');
    closeMatch();
    const pick = ws.slice().sort(() => Math.random() - .5).slice(0, 6), tiles = [];
    pick.forEach((w, i) => { tiles.push({ id: i, t: w.word, en: true }, { id: i, t: String(w.meaning).split(/[,;/]/)[0].trim() || w.meaning, en: false }); });
    tiles.sort(() => Math.random() - .5);
    const ov = document.createElement('div'); ov.className = 'mg'; ov.id = 'mgOv';
    ov.innerHTML = `<div class="mg-top"><button class="round-btn" data-mg="x" aria-label="닫기">${IC.x}</button><b>짝 맞추기</b><span id="mgTime">0.0초</span></div><p class="mg-sub">영어와 뜻을 짝지어 눌러 보세요</p><div class="mg-grid">${tiles.map((t, i) => `<button class="mg-tile" data-i="${i}">${esc(t.t)}</button>`).join('')}</div>`;
    document.body.appendChild(ov);
    let sel = -1, done = 0, wrong = 0, locked = false, over = false; const t0 = Date.now();
    mgT = setInterval(() => { const e = $('mgTime'); if (e) e.textContent = ((Date.now() - t0) / 1000).toFixed(1) + '초'; }, 100);
    const finish = () => {
      over = true; const sec = ((Date.now() - t0) / 1000).toFixed(1);
      ov.innerHTML = `<div class="mg-done"><div class="mg-medal">${IC.trophy}</div><h2>${wrong === 0 ? '완벽해요!' : '모두 맞췄어요'}</h2><p>${sec}초 · 오답 ${wrong}번</p><button class="btn btn-primary btn-block" data-mg="again">한 번 더</button><button class="btn btn-soft btn-block" data-mg="x" style="margin-top:8px;">닫기</button></div>`;
    };
    ov.addEventListener('click', e => {
      const k = e.target.closest('[data-mg]');
      if (k) { if (k.dataset.mg === 'again') { closeMatch(); openMatch(); } else closeMatch(); return; }
      const b = e.target.closest('.mg-tile'); if (!b || locked || over || b.classList.contains('ok')) return;
      const i = +b.dataset.i;
      if (sel === i) { b.classList.remove('sel'); sel = -1; return; }
      if (sel < 0) { sel = i; b.classList.add('sel'); if (tiles[i].en) speak(tiles[i].t, 'en-US'); return; }
      const a = tiles[sel], c = tiles[i], ba = ov.querySelector(`[data-i="${sel}"]`);
      if (a.id === c.id && a.en !== c.en) {
        [ba, b].forEach(x => { x.classList.remove('sel'); x.classList.add('ok'); }); sel = -1; done++;
        if (done === pick.length) { clearInterval(mgT); setTimeout(finish, 450); }
      } else {
        wrong++; locked = true; [ba, b].forEach(x => x.classList.add('no'));
        setTimeout(() => { [ba, b].forEach(x => x.classList.remove('no', 'sel')); sel = -1; locked = false; }, 450);
      }
    });
  }
  ACTIONS.match = openMatch;
