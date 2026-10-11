
  /* =========================================================
   * 4단계 집중 학습 (카드 → 뜻 고르기 → 따라 쓰기 → 시험)
   * ======================================================= */
  const FL_STEPS = ['카드 보기', '뜻 고르기', '따라 쓰기', '마무리 시험'];
  let FL = null;
  function flPick() {
    let it = poolFor({ type: 'due' }); if (!it.length) it = poolFor({ type: 'new' }); if (!it.length) it = poolFor({ type: 'all' });
    return shuffled(it.map(x => ({ w: x.w, catId: x.catId }))).slice(0, 8);
  }
  function flOpts(w, rev) {
    const pool = allWords().map(x => rev ? x.w.word : x.w.meaning).concat(LT_BANK.flat().map(x => rev ? x[0] : x[1]));
    const ans = rev ? w.word : w.meaning, seen = new Set([ans.toLowerCase()]), out = [];
    shuffled(pool).forEach(o => { if (out.length < 3 && o && !seen.has(o.toLowerCase())) { seen.add(o.toLowerCase()); out.push(o); } });
    return shuffled([ans, ...out]);
  }
  ACTIONS.flow = () => flOpen();
  function flOpen(items) {
    if ($('flOv')) return;
    items = items || flPick();
    if (!items.length) return toast('학습할 단어가 없어요. 먼저 단어를 추가해 보세요.');
    FL = { items, step: 0, i: 0, res: {}, locked: false, miss: {} };
    const ov = document.createElement('div'); ov.className = 'ob lt fl'; ov.id = 'flOv'; document.body.appendChild(ov);
    flDraw();
  }
  function flTotal() { return FL.items.length * 4; }
  function flDraw() {
    const ov = $('flOv'); if (!ov || !FL) return;
    if (FL.i >= FL.items.length) { FL.step++; FL.i = 0; if (FL.step >= 4) return flResult(); }
    const it = FL.items[FL.i], w = it.w, st = FL.step;
    const head = `<button class="ob-skip" data-fl="close">그만하기</button><div class="lt-bar"><i style="width:${Math.round((st * FL.items.length + FL.i) / flTotal() * 100)}%"></i></div><div class="muted fl-step"><b>${st + 1}/4 ${FL_STEPS[st]}</b> · ${FL.i + 1}/${FL.items.length}</div>`;
    FL.locked = false; let body = '', foot = '';
    if (st === 0) {
      body = `<div class="fl-card"><button class="q-speak" data-act="speak" data-text="${esc(w.word)}" aria-label="발음 듣기">${IC.speaker}</button><div class="fl-word">${esc(w.word)}</div><div class="q-pron">${esc(pronText(w))}</div><div class="fl-mean">${esc(w.meaning)}</div>${w.example ? `<div class="fl-ex">${esc(w.example)}</div><button class="btn btn-soft" data-fl="trex" data-text="${esc(w.example)}" style="margin-top:12px;">문장 번역</button>` : ''}</div>`;
      foot = `<button class="btn btn-primary btn-block" data-fl="next">${FL.i === FL.items.length - 1 ? '뜻 고르기로' : '다음'}</button>`;
      setTimeout(() => { try { playAudio(w.word); } catch (e) {} }, 150);
    } else if (st === 1 || st === 3) {
      const rev = st === 3, opts = flOpts(w, rev);
      body = `<div class="ob-body lt-q"><div class="muted" style="font-weight:700;margin-bottom:8px;">${rev ? '알맞은 영어 단어는?' : '이 단어의 뜻은?'}</div><h2 style="font-size:2rem;">${esc(rev ? w.meaning : w.word)}</h2><div class="opts" style="width:100%;margin-top:22px;">${opts.map((o, k) => `<button class="opt" data-fl="opt" data-v="${esc(o)}"><span class="opt-n">${k + 1}</span><span>${esc(o)}</span></button>`).join('')}</div></div>`;
      foot = `<button class="btn btn-soft btn-block" data-fl="opt" data-v="">잘 모르겠어요</button>`;
    } else {
      body = `<div class="ob-body lt-q"><div class="muted" style="font-weight:700;margin-bottom:8px;">뜻에 맞는 단어를 써 보세요</div><h2 style="font-size:2rem;">${esc(w.meaning)}</h2><div class="muted" style="margin:6px 0 18px;letter-spacing:.2em;">${esc(w.word.charAt(0))}${'_'.repeat(Math.max(0, Math.min(w.word.length - 1, 24)))}</div><input type="text" id="flIn" class="fl-in" autocomplete="off" autocapitalize="none" spellcheck="false" placeholder="영어 단어"><div id="flFb" class="fl-fb"></div></div>`;
      foot = `<button class="btn btn-primary btn-block" id="flGo" data-fl="type">확인</button>`;
      setTimeout(() => { const i = $('flIn'); if (i) i.focus(); }, 80);
    }
    ov.innerHTML = head + (st === 0 ? `<div class="ob-body">${body}</div>` : body) + `<div class="ob-foot">${foot}</div>`;
  }
  function flAdvance(ms) { setTimeout(() => { if (FL) { FL.i++; flDraw(); } }, ms); }
  function flAnswer(v) {
    if (!FL || FL.locked) return; FL.locked = true;
    const it = FL.items[FL.i], w = it.w, rev = FL.step === 3, ans = rev ? w.word : w.meaning, ok = v === ans;
    if (FL.step === 3) FL.res[w.id] = ok; if (!ok) FL.miss[w.id] = true;
    $('flOv').querySelectorAll('.opt').forEach(b => { if (b.dataset.v === ans) b.classList.add('correct'); else if (b.dataset.v === v) b.classList.add('wrong'); });
    flAdvance(ok ? 450 : 1000);
  }
  function flType() {
    if (!FL) return; const it = FL.items[FL.i], w = it.w, inp = $('flIn'), fb = $('flFb'), btn = $('flGo'); if (!inp) return;
    if (FL.locked) { FL.i++; return flDraw(); }
    const v = inp.value.trim().toLowerCase(); if (!v) return toast('단어를 입력해 주세요.');
    const ok = v === w.word.trim().toLowerCase(); if (!ok) FL.miss[w.id] = true;
    FL.locked = true; inp.disabled = true;
    fb.innerHTML = ok ? '<b style="color:var(--blue)">정답이에요!</b>' : `<b style="color:var(--coral)">정답: ${esc(w.word)}</b>`;
    btn.textContent = '다음';
  }
  function flResult() {
    const ov = $('flOv'); if (!ov) return;
    let good = 0; const wrongs = [];
    FL.items.forEach(it => { const ok = !!FL.res[it.w.id]; grade(it.w, ok); recordStat(ok); if (ok) good++; else wrongs.push(it); });
    syncStorage(); FL.wrongs = wrongs;
    try { go(curTab); } catch (e) {}
    ov.innerHTML = `<div class="ob-body"><div class="ob-ic">${IC.star}</div><div class="muted" style="font-weight:700;">마무리 시험 결과</div><h2 style="font-size:2.4rem;">${good} / ${FL.items.length}</h2><p>${wrongs.length ? '틀린 단어는 내일 다시 복습해요.' : '모두 맞혔어요. 대단해요!'}</p>${wrongs.length ? `<div class="card" style="width:100%;margin-top:18px;text-align:left;">${wrongs.map(it => `<div class="wrong-item"><b>${esc(it.w.word)}</b><span>${esc(it.w.meaning)}</span></div>`).join('')}</div>` : ''}</div><div class="ob-foot">${wrongs.length ? '<button class="btn btn-primary btn-block" data-fl="again">틀린 것만 다시</button><button class="btn btn-soft btn-block" data-fl="close" style="margin-top:8px;">마치기</button>' : '<button class="btn btn-primary btn-block" data-fl="close">마치기</button>'}</div>`;
    if (good === FL.items.length) { try { confetti(); } catch (e) {} }
  }
  document.addEventListener('click', e => {
    const b = e.target.closest && e.target.closest('#flOv [data-fl]'); if (!b) return;
    const a = b.dataset.fl;
    if (a === 'close') { const ov = $('flOv'); if (ov) ov.remove(); FL = null; }
    else if (a === 'next') { FL.i++; flDraw(); }
    else if (a === 'opt') flAnswer(b.dataset.v);
    else if (a === 'type') flType();
    else if (a === 'again') { const w = FL && FL.wrongs; const ov = $('flOv'); if (ov) ov.remove(); FL = null; if (w && w.length) flOpen(w); }
    else if (a === 'trex') ACTIONS['tr-ex'](b);
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Enter' && FL && FL.step === 2 && e.target && e.target.id === 'flIn') { e.preventDefault(); flType(); }
  });
  ACTIONS['tr-ex'] = el => {
    const t = String(el.dataset.text || '').replace(/\s*[(（][^)）]*[가-힣][^)）]*[)）]\s*$/, '').trim();
    openTranslator(t); setTimeout(() => { try { ACTIONS['tr-go'](); } catch (e) {} }, 120);
  };

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
  