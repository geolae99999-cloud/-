  /* =========================================================
   * 테마 / 라우팅
   * ======================================================= */
  ACTIONS.theme = () => { config.darkMode = !config.darkMode; applyTheme(); syncStorage(); };
  function applyTheme() {
    document.body.classList.toggle('dark', !!config.darkMode);
    $('btnTheme').innerHTML = config.darkMode ? IC.sun : IC.moon;
    const m = document.querySelector('meta[name="theme-color"]');
    if (m) m.setAttribute('content', config.darkMode ? '#17171c' : '#f2f4f6');
  }
  /* 영어 ↔ 중국어 전환: 머리글의 EN/中 스위치나 설정에서 바꿔요. 단어장과 기록은 언어마다 따로예요. */
  function applyLang() {
    document.body.classList.toggle('lang-zh', isZh());
    const b = $('btnLang'); if (b) { b.setAttribute('aria-pressed', isZh() ? 'true' : 'false'); b.title = isZh() ? '영어 단어장으로 바꾸기' : '중국어 단어장으로 바꾸기'; }
    const d = $('btnDict'); if (d) d.setAttribute('aria-label', LN() + '사전');
    if (isZh()) zhLoad();
  }
  function setLang(l) {
    l = l === 'zh' ? 'zh' : 'en';
    if (l === LANG || !currentUser) return;
    if (S.active) return toast('학습을 마친 뒤에 바꿀 수 있어요.');
    const cur = { categories, stats };
    categories = altSet.categories; stats = altSet.stats; altSet = cur;
    LANG = l; config.lang = l;
    currentCategoryId = null; viewOrder = null; openDrawers.clear(); studyPrefs.src = 'due'; recShown = true;
    const rv = $('recOv'); if (rv) rv.remove();
    applyLang(); langSplash(l); syncStorage();
    go(curTab === 'paneBook' ? 'tabBooks' : curTab);
  }
  function langSplash(l) {
    const old = $('langSplash'); if (old) old.remove();
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return toast(l === 'zh' ? '중국어 단어장으로 바꿨어요.' : '영어 단어장으로 바꿨어요.');
    const el = document.createElement('div'); el.className = 'lang-splash ' + l; el.id = 'langSplash'; el.setAttribute('aria-hidden', 'true');
    el.innerHTML = `<div class="ls-card"><b>${l === 'zh' ? '中' : 'EN'}</b><span>${l === 'zh' ? '중국어 단어장' : '영어 단어장'}</span><small>${l === 'zh' ? '你好! 오늘도 한 걸음' : 'Hello! 오늘도 한 걸음'}</small></div>`;
    document.body.appendChild(el);
    setTimeout(() => el.classList.add('out'), 650);
    setTimeout(() => el.remove(), 1050);
  }
  ACTIONS.lang = () => setLang(isZh() ? 'en' : 'zh');
  ACTIONS['lang-set'] = el => setLang(el.dataset.l);

  let curTab = 'tabHome';
  const TITLES = { tabBooks: '단어장', tabStudy: '학습', tabStats: '통계', tabSettings: '설정' };
  function go(id) {
    curTab = id;
    document.body.dataset.tab = id;
    renderNavCard();
    if (id !== 'tabHome') { const rv = $('recOv'); if (rv) rv.remove(); }
    document.querySelectorAll('.view-pane').forEach(el => el.classList.remove('active'));
    $(id).classList.add('active');
    const navFor = id === 'paneBook' ? 'tabBooks' : id;
    document.querySelectorAll('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.t === navFor));
    $('btnBackHome').style.display = id === 'paneBook' ? 'flex' : 'none';
    if (id === 'tabHome') $('headTitle').innerHTML = '<i class="brand-mark">V</i><span><b>Voca</b>Pro</span>';
    else if (id === 'paneBook') $('headTitle').textContent = (curCat() || {}).name || '단어장';
    else $('headTitle').textContent = TITLES[id] || 'VocaPro';

    if (id === 'tabHome') renderHome();
    else if (id === 'tabBooks') renderBooks();
    else if (id === 'paneBook') renderBookDynamic();
    else if (id === 'tabStudy') renderStudy();
    else if (id === 'tabStats') renderStats();
    else if (id === 'tabSettings') loadSettingsUI();
    window.scrollTo(0, 0);
  }
  ACTIONS.tab = el => go(el.dataset.t);
  ACTIONS.back = () => go('tabBooks');

  /* =========================================================
   * 홈
   * ======================================================= */
  function ringSvg(pct) {
    const r = 34, c = 2 * Math.PI * r;
    return `<svg class="ring" viewBox="0 0 84 84"><circle class="ring-bg" cx="42" cy="42" r="${r}"/><circle class="ring-fg" cx="42" cy="42" r="${r}" stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${(c * (1 - pct)).toFixed(1)}" transform="rotate(-90 42 42)"/></svg>`;
  }

  function renderHome() {
    const c = counts();
    const goal = config.goal || 20;
    const today = stats.days[dayKey()] || { n: 0, ok: 0 };
    const pct = Math.min(1, today.n / goal);
    const st = streak();

    let cta;
    if (c.total === 0) cta = { big: '0', unit: '개', label: '오늘의 복습', sub: '단어를 추가하면 복습 일정이 자동으로 만들어져요.', btn: '단어 추가하기', attrs: 'data-act="tab" data-t="tabBooks"' };
    else if (c.due > 0) cta = { big: c.due, unit: '개', label: '오늘의 복습', sub: '잊어버리기 직전에 복습하면 오래 기억돼요.', btn: '복습 시작', attrs: 'data-act="start" data-mode="card" data-src="due"' };
    else if (c.newW > 0) cta = { big: c.newW, unit: '개', label: '새 단어', sub: '오늘 복습은 끝났어요. 새 단어를 배워볼까요?', btn: '새 단어 학습', attrs: 'data-act="start" data-mode="card" data-src="new"' };
    else cta = { big: c.total, unit: '개', label: '전체 단어', sub: '모든 단어를 학습했어요. 새 단어를 더 추가해 보세요.', btn: '단어 추가하기', attrs: 'data-act="tab" data-t="tabBooks"' };

    const labels = ['일', '월', '화', '수', '목', '금', '토'];
    let week = '';
    for (let i = 6; i >= 0; i--) {
      const t = addDays(startOfDay(), -i);
      const d = stats.days[dayKey(t)];
      week += `<div class="day ${d && d.n > 0 ? 'done' : ''} ${i === 0 ? 'today' : ''}"><i>${d && d.n > 0 ? IC.tick : ''}</i>${labels[new Date(t).getDay()]}</div>`;
    }

    const hour = new Date().getHours();
    const hello = hour < 6 ? '늦은 밤이에요' : hour < 12 ? '좋은 아침이에요' : hour < 18 ? '오늘도 한 걸음 더' : '하루 마무리 복습 어때요?';
    const gname = GRADE_NAMES[config.grade];
    const books = categories.slice(0, 3).map(bookCardHtml).join('');

    $('tabHome').innerHTML = `
      <div class="home-grid">
      <div class="h-hello"><div class="hello"><div class="hello-who">${MASCOT(today.n >= goal ? 'cheer' : 'happy')}<div><div class="hello-sub">${hello}</div><div class="hello-name">${esc(myName())}${isTeacher() ? ' 선생님' : '님'}</div>${schoolLine() ? `<div class="hello-school">${esc(schoolLine())}</div>` : ''}</div></div>
        ${isZh() && !isTeacher() ? '<button class="grade-chip" data-act="pack-open">HSK 단어</button>' : `<button class="grade-chip" data-act="grade-pick">${isTeacher() ? '선생님' : gname ? esc(gname) : '학년 설정'}</button>`}</div></div>
      <div class="h-hero"><section class="hero">
        <div class="hero-top">
          <div>
            <div class="hero-label">${cta.label}</div>
            <div class="hero-num">${cta.big}<small>${cta.unit}</small></div>
          </div>
          <div class="ring-box">${ringSvg(pct)}<div class="ring-txt"><b>${Math.min(today.n, 999)}</b>/${goal}</div></div>
        </div>
        <div class="hero-sub">${cta.sub}</div>
        <div class="hero-mission"><span>복습 <b>${c.due}</b></span><span>새 단어 <b>${c.newW}</b></span><span>마스터 <b>${c.mastered}</b></span></div>
        <button class="btn hero-btn btn-block" ${cta.attrs}>${cta.btn}</button>
      </section></div>

      <div class="h-streak"><div class="card streak-card">
        <div class="streak-fire ${st > 0 ? '' : 'off'}">${st > 0 ? IC.flame : IC.sprout}</div>
        <div class="streak-txt"><div class="streak-n">${st}일 연속</div><div class="muted">${st > 0 ? '학습 중이에요' : '오늘 시작해요'}</div></div>
        <div class="week">${week}</div>
      </div>${wotdHtml()}</div>

      <div class="h-quick"><div class="section-title"><span>바로 학습</span></div>
      <div class="tiles">
        <button class="tile" data-act="start" data-mode="card" data-src="new"><div class="tile-ico t-new">${IC.sprout}</div><div><div class="tile-name">새 단어</div><div class="tile-n">${c.newW}개</div></div></button>
        <button class="tile" data-act="start" data-mode="choice" data-src="wrong"><div class="tile-ico t-wrong">${IC.bookx}</div><div><div class="tile-name">오답노트</div><div class="tile-n">${c.miss}개</div></div></button>
        <button class="tile" data-act="start" data-mode="card" data-src="star"><div class="tile-ico t-star">${IC.star}</div><div><div class="tile-name">즐겨찾기</div><div class="tile-n">${c.star}개</div></div></button>
        <button class="tile" data-act="start" data-mode="listen" data-src="due"><div class="tile-ico t-listen">${IC.headphones}</div><div><div class="tile-name">듣기 모드</div><div class="tile-n">복습 단어 듣기</div></div></button>
      </div></div>

      <div class="h-tools">${isTeacher() ? teachToolsHtml() : ''}<div class="section-title"><span>학습 도구</span></div>
      <div class="tool-list">${isTeacher() ? '' : classEntryHtml()}${todayHtml()}${flowEntryHtml()}<button class="mg-entry" data-act="match"><span class="mg-ico i-grape">${IC.cards}</span><span class="mg-txt"><b>짝 맞추기</b><small>${LN()}와 뜻을 빠르게 연결해요</small></span><span class="mg-chev"></span></button><button class="mg-entry" data-act="rain"><span class="mg-ico i-teal">${IC.play}</span><span class="mg-txt"><b>단어 비</b><small>떨어지는 뜻이 닿기 전에 단어를 골라요</small></span><span class="mg-chev"></span></button><button class="mg-entry" data-act="exam-open"><span class="mg-ico i-coral">${IC.trophy}</span><span class="mg-txt"><b>실전 시험</b><small>섞인 문제를 풀고 점수와 등급을 받아요</small></span><span class="mg-chev"></span></button><button class="mg-entry" data-act="dict-open"><span class="mg-ico i-teal">${IC.search}</span><span class="mg-txt"><b>${LN()}사전</b><small>${isZh() ? '한자, 병음, 한글 뜻으로 바로 찾아요' : '뜻, 예문, 비슷한 단어를 바로 찾아요'}</small></span><span class="mg-chev"></span></button>${recEntryHtml()}${packEntryHtml()}${ltEntryHtml()}</div></div>

      <div class="h-books"><div class="section-title"><span>내 단어장</span><button data-act="tab" data-t="tabBooks">전체 보기</button></div>
      <div class="book-list">${books || emptyHtml('아직 단어장이 없어요', '단어장 탭에서 새로 만들어 보세요.')}</div></div>
      </div>
    `;
    recMaybeShow(); wotdFill();
  }

  ACTIONS.start = el => startSession(el.dataset.mode, parseSrc(el.dataset.src), el.dataset.count !== undefined ? parseInt(el.dataset.count, 10) : SESSION_DEFAULT);

