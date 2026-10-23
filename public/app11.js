  /* =========================================================
   * 본문 읽기: 영어 · 중국어 글을 붙여 넣으면 문장마다 해석이 나오고, 단어를 누르면 뜻과 발음이 떠요.
   * ======================================================= */
  const RD_MAX = 4000, RD_SENT_MAX = 80;
  const rdKey = () => 'vocapro_reader:' + currentUser;
  let RD = null; // { text, zh, sents: [{ t, toks, ko }], hideKo, seq }
  function rdEntryHtml() { return `<button class="mg-entry" data-act="rd-open"><span class="mg-ico">${IC.book}</span><span class="mg-txt"><b>본문 읽기 · 해석</b><small>글을 붙여 넣으면 문장마다 해석, 단어를 누르면 뜻과 발음</small></span><span class="mg-chev"></span></button>`; }
  const rdRecent = () => { const a = loadJson(rdKey()); return Array.isArray(a) ? a.filter(x => x && typeof x.t === 'string').slice(0, 6) : []; };
  function rdRemember(t) {
    const a = rdRecent().filter(x => x.t !== t); a.unshift({ t, at: Date.now() });
    try { LS.setItem(rdKey(), JSON.stringify(a.slice(0, 6))); } catch (e) {}
  }
  function rdClose() { const o = $('rdOv'); if (o) o.remove(); rdPopHide(); RD = null; }
  function rdShell(inner) {
    let ov = $('rdOv');
    if (!ov) { ov = document.createElement('div'); ov.className = 'rd-ov'; ov.id = 'rdOv'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true'); ov.setAttribute('aria-label', '본문 읽기'); document.body.appendChild(ov); }
    ov.innerHTML = `<div class="rd-top"><b>본문 읽기</b><button class="rd-x" data-act="rd-close" aria-label="닫기">${IC.x}</button></div><div class="rd-body" id="rdBody">${inner}</div>`;
    return ov;
  }
  function rdOpen(prefill) {
    const rec = rdRecent();
    rdShell(`<p class="rd-help">영어나 중국어 본문을 붙여 넣으세요. 문장마다 한국어 해석이 나오고, 단어를 누르면 뜻과 발음이 떠요.</p>
      <textarea id="rdIn" class="rd-in" maxlength="${RD_MAX}" placeholder="예) Plants make their own food. They use sunlight, water and air..." spellcheck="false">${esc(prefill || '')}</textarea>
      <div class="rd-row"><small id="rdCnt" class="muted">0 / ${RD_MAX.toLocaleString()}자</small><button class="btn btn-primary" data-act="rd-go">해석 보기</button></div>
      ${rec.length ? `<h4 class="syn-h rd-rh">최근 본문</h4><div class="rd-recent">${rec.map((x, i) => `<button class="rd-rec" data-act="rd-rec" data-i="${i}">${esc(x.t.slice(0, 90))}${x.t.length > 90 ? '…' : ''}</button>`).join('')}</div>` : ''}`);
    const inp = $('rdIn'), cnt = () => { $('rdCnt').textContent = `${inp.value.length.toLocaleString()} / ${RD_MAX.toLocaleString()}자`; };
    inp.addEventListener('input', cnt); cnt();
    setTimeout(() => inp.focus(), 60);
  }
  ACTIONS['rd-open'] = () => rdOpen();
  ACTIONS['rd-close'] = rdClose;
  ACTIONS['rd-rec'] = el => { const x = rdRecent()[+el.dataset.i]; if (x) rdRun(x.t); };
  ACTIONS['rd-go'] = () => { const t = (($('rdIn') || {}).value || '').trim(); if (!t) return toast('본문을 붙여 넣어 주세요.'); rdRun(t); };
  ACTIONS['rd-edit'] = () => rdOpen(RD ? RD.text : '');

  // 문장 나누기: 영어는 . ! ? 뒤, 중국어는 。！？； 뒤. 줄바꿈도 문장 경계로 봐요.
  function rdSplit(text, zh) {
    const out = [];
    text.replace(/\r/g, '').split(/\n+/).forEach(par => {
      const p = par.trim(); if (!p) return;
      const parts = zh ? p.split(/(?<=[。！？；!?])/) : p.split(/(?<=[.!?]["'”’)]?)\s+(?=["'“‘(]?[A-Z0-9])/);
      parts.forEach(x => { x = x.trim(); if (x) out.push(x); });
    });
    return out.slice(0, RD_SENT_MAX);
  }
  // 단어 나누기: 영어는 글자 묶음, 중국어는 내장 사전에서 가장 긴 단어부터 맞춰요.
  function rdTokens(sent, zh) {
    const toks = [];
    if (!zh) {
      let last = 0;
      sent.replace(/[A-Za-z]+(?:['’-][A-Za-z]+)*/g, (m, i) => { if (i > last) toks.push({ s: sent.slice(last, i) }); toks.push({ s: m, w: m.replace(/’/g, "'") }); last = i + m.length; return m; });
      if (last < sent.length) toks.push({ s: sent.slice(last) });
      return toks;
    }
    const chars = [...sent];
    for (let i = 0; i < chars.length;) {
      if (!HAN.test(chars[i])) { let j = i; while (j < chars.length && !HAN.test(chars[j])) j++; toks.push({ s: chars.slice(i, j).join('') }); i = j; continue; }
      let L = Math.min(6, chars.length - i);
      for (; L > 1; L--) { const c = chars.slice(i, i + L).join(''); if (zhMap && zhMap.has(c)) break; }
      const w = chars.slice(i, i + L).join(''); toks.push({ s: w, w }); i += L;
    }
    return toks;
  }
  async function rdRun(text) {
    text = String(text || '').slice(0, RD_MAX).trim(); if (!text) return;
    const zh = HAN.test(text) && !/[A-Za-z]{3}/.test(text.replace(/[A-Z]{1,3}\d*/g, ''));
    if (zh) await zhLoad();
    rdRemember(text);
    const sents = rdSplit(text, zh).map(t => ({ t, toks: rdTokens(t, zh), ko: null }));
    RD = { text, zh, sents, hideKo: false, seq: (RD && RD.seq || 0) + 1 };
    rdRender();
    // 문장마다 번역해요(동시에 4개씩). 다 끝나기 전에도 끝난 문장부터 보여 줘요.
    const seq = RD.seq; let next = 0;
    const work = async () => {
      while (RD && RD.seq === seq && next < sents.length) {
        const i = next++, s = sents[i];
        try { s.ko = (await translateText(s.t, true)).t; } catch (e) { s.ko = ''; }
        if (!RD || RD.seq !== seq) return;
        const el = document.querySelector(`#rdBody .rd-s[data-i="${i}"] .rd-ko`);
        if (el) { el.textContent = s.ko || '해석을 가져오지 못했어요.'; el.classList.toggle('err', !s.ko); el.classList.remove('load'); }
      }
    };
    await Promise.all([work(), work(), work(), work()]);
  }
  function rdRender() {
    if (!RD) return;
    const own = ownedWords();
    const body = RD.sents.map((s, i) => `<div class="rd-s" data-i="${i}">
        <p class="rd-en" lang="${RD.zh ? 'zh-CN' : 'en'}">${s.toks.map(t => t.w ? `<span class="rd-w${own.has(t.w.toLowerCase()) ? ' own' : ''}" data-act="rd-word" data-w="${esc(t.w)}">${esc(t.s)}</span>` : esc(t.s)).join('')}<button class="rd-sp" data-act="speak" data-text="${esc(s.t)}" aria-label="이 문장 듣기">${IC.speaker}</button></p>
        <p class="rd-ko${s.ko === null ? ' load' : ''}">${s.ko === null ? '해석하는 중…' : esc(s.ko || '해석을 가져오지 못했어요.')}</p></div>`).join('');
    rdShell(`<div class="rd-tools"><button class="btn btn-soft" data-act="rd-edit">본문 바꾸기</button><button class="btn btn-soft${RD.hideKo ? ' on' : ''}" data-act="rd-hide">${RD.hideKo ? '해석 보이기' : '해석 가리기'}</button></div>
      <div class="rd-doc${RD.hideKo ? ' hide-ko' : ''}">${body}</div>
      <p class="rd-note muted">밑줄 친 단어는 내 단어장에 있는 단어예요. 해석은 자동 번역이라 조금 어색할 수 있어요.</p>`);
  }
  ACTIONS['rd-hide'] = el => { if (!RD) return; RD.hideKo = !RD.hideKo; const d = document.querySelector('#rdBody .rd-doc'); if (d) d.classList.toggle('hide-ko', RD.hideKo); el.textContent = RD.hideKo ? '해석 보이기' : '해석 가리기'; el.classList.toggle('on', RD.hideKo); };
  // 숨긴 해석은 그 문장을 누르면 잠깐 보여요.
  document.addEventListener('click', e => { const k = e.target.closest && e.target.closest('.rd-doc.hide-ko .rd-ko'); if (k) k.classList.toggle('peek'); });

  // 단어 누르기 → 아래쪽 카드에 뜻 · 발음 · 듣기 · 단어장에 담기
  let rdPopWord = null, rdPopSeq = 0;
  function rdPopHide() { const p = $('rdPop'); if (p) p.remove(); rdPopWord = null; document.querySelectorAll('.rd-w.sel').forEach(x => x.classList.remove('sel')); }
  ACTIONS['rd-word'] = async (el, e) => {
    if (e) e.stopPropagation();
    document.querySelectorAll('.rd-w.sel').forEach(x => x.classList.remove('sel')); el.classList.add('sel');
    const raw = el.dataset.w, zh = RD && RD.zh, seq = ++rdPopSeq;
    let p = $('rdPop');
    if (!p) { p = document.createElement('div'); p.id = 'rdPop'; p.className = 'rd-pop'; p.setAttribute('role', 'dialog'); p.setAttribute('aria-label', '단어 뜻'); document.body.appendChild(p); }
    p.innerHTML = `<div class="rd-pw"><b>${esc(raw)}</b><button class="rd-x" data-act="rd-pop-x" aria-label="닫기">${IC.x}</button></div><p class="rd-pm load">뜻을 찾는 중…</p>`;
    let d = null;
    try { d = await dictGet(zh ? raw : raw.toLowerCase()); } catch (er) {}
    // 변화형(plants, went)은 원형의 발음을 보여 줘요.
    if (d && d.base && !d.phonetic && !zh) { try { const b = await dictGet(d.base); if (b) { d.phonetic = b.phonetic; d.koreanPron = b.koreanPron; } } catch (er) {} }
    if (!d) { try { const r = await translateText(raw, true); d = { word: raw, meaning: r.t + (r.alts && r.alts.length ? ' · ' + r.alts.map(a => a.terms.slice(0, 3).join(', ')).join(' / ') : ''), phonetic: '', koreanPron: '' }; } catch (er) {} }
    if (seq !== rdPopSeq || !$('rdPop')) return;
    const head = d && d.base && !zh ? d.base : raw;
    rdPopWord = { word: zh ? raw : head.toLowerCase(), meaning: d ? String(d.meaning || '').replace(/\s*\(.+의 [^)]*\)$/, '') : '', d };
    const pr = d ? pronText(d) : '';
    p.innerHTML = `<div class="rd-pw"><b lang="${zh ? 'zh-CN' : 'en'}">${esc(head)}</b>${pr ? `<span class="q-pron">${esc(pr)}</span>` : ''}<button class="rd-x" data-act="rd-pop-x" aria-label="닫기">${IC.x}</button></div>
      <p class="rd-pm">${d && d.meaning ? esc(d.meaning) : '뜻을 찾지 못했어요. 인터넷을 확인해 주세요.'}</p>
      ${d && d.example ? `<p class="rd-pe">${esc(d.example)}${d.exampleKo ? `<small>${esc(d.exampleKo)}</small>` : ''}</p>` : ''}
      <div class="rd-pa"><button class="btn btn-soft" data-act="speak" data-text="${esc(head)}">${IC.speaker} 발음 듣기</button>
      ${d && d.meaning ? `<select id="rdBook" aria-label="담을 단어장">${categories.map(c => `<option value="${esc(c.id)}"${c.id === currentCategoryId ? ' selected' : ''}>${esc(c.name)}</option>`).join('')}</select><button class="btn btn-primary" data-act="rd-add">${IC.plus} 담기</button>` : ''}</div>`;
    playAudio(head, true);
  };
  ACTIONS['rd-pop-x'] = () => rdPopHide();
  ACTIONS['rd-add'] = () => {
    const sel = $('rdBook'), cat = sel && categories.find(c => c.id === sel.value), x = rdPopWord; if (!cat || !x || !x.meaning) return;
    if (cat.words.some(w => w.word.toLowerCase() === x.word.toLowerCase())) return toast('이미 그 단어장에 있는 단어예요.');
    const d = x.d || {}, w = sanitizeWord({ id: uid(), word: x.word, meaning: x.meaning, phonetic: d.phonetic || '', koreanPron: d.koreanPron || '', example: d.example || '', exampleKo: d.exampleKo || '', synonyms: d.synonyms || '' });
    cat.words.unshift(w); syncStorage();
    dictFill([w]).then(n => { if (n) syncStorage(); }).catch(() => {});
    document.querySelectorAll('#rdBody .rd-w').forEach(s => { if (s.dataset.w.toLowerCase() === x.word.toLowerCase()) s.classList.add('own'); });
    toast(`'${x.word}'를 ${cat.name}에 담았어요.`);
  };
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && $('rdOv') && !document.querySelector('.dlg-ov')) { if ($('rdPop')) rdPopHide(); else rdClose(); } });
  document.addEventListener('pointerdown', e => { if ($('rdPop') && !e.target.closest('#rdPop, .rd-w, #spdPop')) rdPopHide(); }, true);

  const OB = [[IC.sprout, '매일 조금씩, 끝까지', '하루 목표만큼만 외워요. 복습할 시기는 앱이 알아서 챙겨 드려요.'], [IC.repeat, '잊을 때쯤 다시 만나요', '틀린 단어는 더 자주, 아는 단어는 천천히. 검증된 반복 학습 방식이에요.'], [IC.headphones, '눈으로, 귀로, 손으로', '플래시카드, 퀴즈, 받아쓰기, 듣기 모드로 질리지 않게 외워요.']];
  function showOnboarding() {
    let justSigned = '';
    try { justSigned = sessionStorage.getItem('vocapro_just_signed_up') || ''; sessionStorage.removeItem('vocapro_just_signed_up'); } catch (e) {}
    if (justSigned !== '1') return;
    if (LS.getItem('vocapro_onboarded') || $('obOv')) return;
    let i = 0; const ov = document.createElement('div'); ov.className = 'ob'; ov.id = 'obOv'; document.body.appendChild(ov);
    const draw = () => {
      const [ic, t, d] = OB[i];
      ov.innerHTML = `<button class="ob-skip" data-ob="skip">건너뛰기</button><div class="ob-body"><div class="ob-art">${MASCOT(['happy', 'think', 'cheer'][i])}<span class="ob-badge">${ic}</span></div><h2>${t}</h2><p>${d}</p></div><div class="ob-foot"><div class="ob-dots">${OB.map((_, k) => `<i class="${k === i ? 'on' : ''}"></i>`).join('')}</div><button class="btn btn-primary btn-block" data-ob="next">${i === OB.length - 1 ? '시작하기' : '다음'}</button></div>`;
    };
    const done = () => { try { LS.setItem('vocapro_onboarded', '1'); } catch (e) {} ov.remove(); if (!isTeacher()) setTimeout(() => { try { ltOpen(true); } catch (e) {} }, 150); };
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
    // 같은 단어·같은 뜻 타일이 두 번 나오면 짝이 모호해져요 → 단어(소문자)·표시 뜻으로 중복 제거
    const mT = w => String(w.meaning).split(/[,;/]/)[0].trim() || String(w.meaning), seenW = new Set(), seenM = new Set(), pick = [], tiles = [];
    for (const w of shuffled(ws)) { const k = w.word.trim().toLowerCase(), m = mT(w); if (seenW.has(k) || seenM.has(m)) continue; seenW.add(k); seenM.add(m); pick.push(w); if (pick.length >= 6) break; }
    if (pick.length < 4) return toast('서로 다른 단어가 4개 이상 있어야 해요.');
    pick.forEach((w, i) => { tiles.push({ id: i, t: w.word, en: true }, { id: i, t: mT(w), en: false }); });
    shuffled(tiles).forEach((t, i) => { tiles[i] = t; });
    const ov = document.createElement('div'); ov.className = 'mg'; ov.id = 'mgOv';
    ov.innerHTML = `<div class="mg-top"><button class="round-btn" data-mg="x" aria-label="닫기">${IC.x}</button><b>짝 맞추기</b><span id="mgTime">0.0초</span></div><p class="mg-sub">${LN()}와 뜻을 짝지어 눌러 보세요</p><div class="mg-grid">${tiles.map((t, i) => `<button class="mg-tile" data-i="${i}">${esc(t.t)}</button>`).join('')}</div>`;
    document.body.appendChild(ov);
    let sel = -1, done = 0, wrong = 0, locked = false, over = false; const t0 = Date.now();
    mgT = setInterval(() => { const e = $('mgTime'); if (e) e.textContent = ((Date.now() - t0) / 1000).toFixed(1) + '초'; }, 100);
    const finish = () => {
      over = true; const sec = ((Date.now() - t0) / 1000).toFixed(1);
      ov.innerHTML = `<div class="mg-done"><div class="result-art">${MASCOT(wrong === 0 ? 'cheer' : 'happy')}</div><h2>${wrong === 0 ? '완벽해요!' : '모두 맞췄어요'}</h2><p>${sec}초 · 오답 ${wrong}번</p><button class="btn btn-primary btn-block" data-mg="again">한 번 더</button><button class="btn btn-soft btn-block" data-mg="x" style="margin-top:8px;">닫기</button></div>`;
    };
    ov.addEventListener('click', e => {
      const k = e.target.closest('[data-mg]');
      if (k) { if (k.dataset.mg === 'again') { closeMatch(); openMatch(); } else closeMatch(); return; }
      const b = e.target.closest('.mg-tile'); if (!b || locked || over || b.classList.contains('ok')) return;
      const i = +b.dataset.i;
      if (sel === i) { b.classList.remove('sel'); sel = -1; return; }
      if (sel < 0) { sel = i; b.classList.add('sel'); if (tiles[i].en) playAudio(tiles[i].t); return; }
      const a = tiles[sel], c = tiles[i], ba = ov.querySelector(`[data-i="${sel}"]`);
      if (a.id === c.id && a.en !== c.en) {
        [ba, b].forEach(x => { x.classList.remove('sel'); x.classList.add('ok'); }); sel = -1; done++; haptic(true);
        if (done === pick.length) { clearInterval(mgT); setTimeout(finish, 450); }
      } else {
        wrong++; locked = true; haptic(false); [ba, b].forEach(x => x.classList.add('no'));
        setTimeout(() => { [ba, b].forEach(x => x.classList.remove('no', 'sel')); sel = -1; locked = false; }, 450);
      }
    });
  }
  ACTIONS.match = openMatch;

