  /* =========================================================
   * 유틸
   * ======================================================= */
  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const str = v => (v == null ? '' : String(v)).trim();
  const uid = () => 'w' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const shuffled = arr => { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const safeId = v => str(v).replace(/[^\w-]/g, '');

  const DAY = 86400000;
  const INTERVALS = [0, 1, 3, 7, 14, 30];   // 박스(레벨)별 복습 간격(일)
  const SESSION_DEFAULT = 20;
  const startOfDay = (t = Date.now()) => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };
  const endOfToday = () => { const d = new Date(); d.setHours(23, 59, 59, 999); return d.getTime(); };
  const addDays = (t, n) => { const d = new Date(t); d.setDate(d.getDate() + n); d.setHours(0, 0, 0, 0); return d.getTime(); };
  const dayKey = (t = Date.now()) => { const d = new Date(t); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };

  let toastTimer = null;
  function toast(msg) {
    const el = $('toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2300);
  }
  const LS = (() => { try { localStorage.setItem('_t', '1'); localStorage.removeItem('_t'); return localStorage; } catch (e) { const m = {}; return { getItem: k => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); }, removeItem: k => { delete m[k]; } }; } })();
  function loadJson(key) { try { const v = LS.getItem(key); return v ? JSON.parse(v) : null; } catch (e) { return null; } }
  function download(name, text, type) {
    const blob = new Blob([text], { type });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1500);
  }
  function confetti() {
    const wrap = document.createElement('div');
    wrap.className = 'confetti';
    const colors = ['#3a5bff', '#ffcf3f', '#14b890', '#ff5a68', '#9db8ff'];
    for (let i = 0; i < 40; i++) {
      const s = document.createElement('i');
      s.style.left = Math.random() * 100 + '%';
      s.style.background = colors[i % colors.length];
      s.style.animationDelay = (Math.random() * 0.5) + 's';
      s.style.animationDuration = (1.6 + Math.random() * 1.4) + 's';
      wrap.appendChild(s);
    }
    document.body.appendChild(wrap);
    setTimeout(() => wrap.remove(), 3400);
  }

  const ACTIONS = {};
  document.addEventListener('click', e => {
    const el = e.target.closest('[data-act]');
    if (!el) return;
    const fn = ACTIONS[el.dataset.act];
    if (fn) fn(el, e);
  });

  /* =========================================================
   * 데이터 모델 / 저장소
   * ======================================================= */
  let KEY_DATA = '', KEY_CFG = '', currentUser = null, currentLabel = '', cloudTimer = null;
  const cloudMode = !!(window.VOCA_CLOUD && window.VOCA_CLOUD.apiKey);
  const KEY_USERS = 'vocapro_users', KEY_SESS = 'vocapro_session';

  const DEFAULT_CFG = {
    provider: 'gemini',
    keys: { gemini: '', xai: '', openai: '', anthropic: '' },
    models: { gemini: '', xai: '', openai: '', anthropic: '' },
    modelLists: { gemini: [], xai: [], openai: [], anthropic: [] },
    ttsRate: 0.9, goal: 20, darkMode: false
  };

  function sanitizeNote(n) {
    if (!n || typeof n !== 'object') return null;
    const o = {
      etymology: str(n.etymology), tip: str(n.tip),
      examples: (Array.isArray(n.examples) ? n.examples : []).map(str).filter(Boolean).slice(0, 5),
      confusable: (Array.isArray(n.confusable) ? n.confusable : []).map(c => ({ word: str(c && c.word), meaning: str(c && c.meaning), diff: str(c && c.diff) })).filter(c => c.word).slice(0, 4)
    };
    return (o.etymology || o.tip || o.examples.length || o.confusable.length) ? o : null;
  }
  function sanitizeWord(w) {
    const n = x => (Number.isFinite(+x) ? +x : 0);
    const box = (w.box !== undefined && Number.isFinite(+w.box)) ? Math.max(0, Math.min(5, Math.floor(+w.box))) : (w.memorized ? 5 : 0);
    let due = n(w.due);
    if (box > 0 && due <= 0) due = addDays(startOfDay(), INTERVALS[box]);
    if (box === 0) due = 0;
    return {
      id: safeId(w.id) || uid(), word: str(w.word), meaning: str(w.meaning), phonetic: str(w.phonetic),
      koreanPron: str(w.koreanPron), example: str(w.example), synonyms: str(w.synonyms),
      star: !!w.star, box, due, reps: Math.max(0, Math.floor(n(w.reps))), wrong: Math.max(0, Math.floor(n(w.wrong))),
      miss: Math.max(0, Math.min(9, Math.floor(n(w.miss)))), last: str(w.last), created: n(w.created) || Date.now(), note: sanitizeNote(w.note)
    };
  }
  function sanitizeCategories(list) {
    if (!Array.isArray(list)) return null;
    const catIds = new Set();
    return list.filter(c => c && typeof c === 'object').map(c => {
      let id = safeId(c.id) || 'c' + uid();
      if (catIds.has(id)) id = 'c' + uid();
      catIds.add(id);
      const wIds = new Set();
      const words = (Array.isArray(c.words) ? c.words : []).filter(w => w && typeof w === 'object' && str(w.word)).map(sanitizeWord);
      words.forEach(w => { if (wIds.has(w.id)) w.id = uid(); wIds.add(w.id); });
      return { id, name: str(c.name).slice(0, 40) || '이름 없음', words };
    });
  }
  function sanitizeStats(s) {
    const days = {};
    if (s && typeof s.days === 'object' && s.days) {
      for (const k of Object.keys(s.days)) {
        if (/^\d{4}-\d{2}-\d{2}$/.test(k)) {
          const d = s.days[k] || {};
          days[k] = { n: Math.max(0, Math.floor(+d.n) || 0), ok: Math.max(0, Math.floor(+d.ok) || 0) };
        }
      }
    }
    return { days };
  }
  const defaultCats = () => [
    { id: 'cat_today', name: '오늘 (Day 1)', words: [] },
    { id: 'cat_review', name: '누적 복습', words: [] }
  ];

  function loadConfig() {
    const cfg = JSON.parse(JSON.stringify(DEFAULT_CFG));
    const saved = loadJson(KEY_CFG);
    if (saved) {
      cfg.provider = saved.provider || cfg.provider;
      cfg.ttsRate = saved.ttsRate || cfg.ttsRate;
      cfg.goal = saved.goal || cfg.goal;
      cfg.darkMode = !!saved.darkMode;
      for (const p of Object.keys(cfg.keys)) {
        if (saved.keys && saved.keys[p]) cfg.keys[p] = saved.keys[p];
        if (saved.models && saved.models[p]) cfg.models[p] = saved.models[p];
        if (saved.modelLists && Array.isArray(saved.modelLists[p])) cfg.modelLists[p] = saved.modelLists[p];
      }
    }
    return cfg;
  }
  function loadDb() {
    const d = loadJson(KEY_DATA);
    if (d && Array.isArray(d.categories)) return { categories: sanitizeCategories(d.categories), stats: sanitizeStats(d.stats) };
    return { categories: defaultCats(), stats: { days: {} } };
  }

  let config = JSON.parse(JSON.stringify(DEFAULT_CFG));
  let categories = defaultCats();
  let stats = { days: {} };

  function syncStorage() {
    if (!currentUser) return;
    try {
      LS.setItem(KEY_DATA, JSON.stringify({ categories, stats }));
      LS.setItem(KEY_CFG, JSON.stringify(config));
      LS.setItem(KEY_DATA + ':ts', String(Date.now())); cloudQueue();
    } catch (e) {
      toast('저장 공간이 부족하거나 저장이 차단되었어요. 백업을 받아두세요.');
    }
  }

  /* ----- 단어/복습 로직 ----- */
  const allWords = () => { const out = []; categories.forEach(c => c.words.forEach(w => out.push({ w, catId: c.id }))); return out; };
  const curCatId = () => currentCategoryId;
  let currentCategoryId = null;
  const curCat = () => categories.find(c => c.id === currentCategoryId);
  const findBook = id => categories.find(c => c.id === id);

  function counts() {
    const end = endOfToday();
    const c = { total: 0, newW: 0, learning: 0, mastered: 0, due: 0, miss: 0, star: 0 };
    allWords().forEach(({ w }) => {
      c.total++;
      if (w.box === 0) c.newW++; else if (w.box >= 5) c.mastered++; else c.learning++;
      if (w.box >= 1 && w.due <= end) c.due++;
      if (w.miss > 0) c.miss++;
      if (w.star) c.star++;
    });
    return c;
  }

  function grade(w, ok) {
    const today = startOfDay();
    const key = dayKey();
    if (ok) {
      if (w.last !== key) { w.box = Math.min(5, w.box + 1); w.due = addDays(today, INTERVALS[w.box]); }
      w.reps++;
      if (w.miss > 0) w.miss--;
    } else {
      w.box = 1; w.due = addDays(today, 1); w.wrong++; w.miss = 2;
    }
    w.last = key;
  }
  function dueText(w) {
    if (w.box === 0) return '아직 학습 전';
    const diff = Math.round((startOfDay(w.due) - startOfDay()) / DAY);
    if (diff <= 0) return '오늘 복습';
    if (diff === 1) return '내일 복습';
    return diff + '일 뒤 복습';
  }
  function streak() {
    let t = startOfDay();
    const has = x => (stats.days[dayKey(x)] || {}).n > 0;
    if (!has(t)) t = addDays(t, -1);
    let n = 0;
    while (has(t)) { n++; t = addDays(t, -1); }
    return n;
  }
  function bestStreak() {
    const keys = Object.keys(stats.days).filter(k => stats.days[k].n > 0).sort();
    let best = 0, cur = 0, prev = null;
    keys.forEach(k => {
      const t = new Date(k + 'T00:00:00').getTime();
      cur = (prev !== null && Math.round((t - prev) / DAY) === 1) ? cur + 1 : 1;
      best = Math.max(best, cur); prev = t;
    });
    return best;
  }
  function recordStat(ok) {
    const k = dayKey();
    if (!stats.days[k]) stats.days[k] = { n: 0, ok: 0 };
    stats.days[k].n++;
    if (ok) stats.days[k].ok++;
  }

  const BOOK_COLORS = ['#3a5bff', '#14b890', '#ff8a3d', '#a259ff', '#ff5a8a', '#1aa7e8'];
  const bookColor = id => { let h = 0; for (const ch of String(id)) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return BOOK_COLORS[h % BOOK_COLORS.length]; };

  /* =========================================================
   * 테마 / 라우팅
   * ======================================================= */
  ACTIONS.theme = () => { config.darkMode = !config.darkMode; applyTheme(); syncStorage(); };
  function applyTheme() {
    document.body.classList.toggle('dark', !!config.darkMode);
    $('btnTheme').textContent = config.darkMode ? '☀️' : '🌙';
    const m = document.querySelector('meta[name="theme-color"]');
    if (m) m.setAttribute('content', config.darkMode ? '#0d1224' : '#3a5bff');
  }

  let curTab = 'tabHome';
  const TITLES = { tabBooks: '단어장', tabStudy: '학습', tabStats: '통계', tabSettings: '설정' };
  function go(id) {
    curTab = id;
    document.querySelectorAll('.view-pane').forEach(el => el.classList.remove('active'));
    $(id).classList.add('active');
    const navFor = id === 'paneBook' ? 'tabBooks' : id;
    document.querySelectorAll('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.t === navFor));
    $('btnBackHome').style.display = id === 'paneBook' ? 'flex' : 'none';
    if (id === 'tabHome') $('headTitle').innerHTML = '<b>Voca</b>Pro';
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
      week += `<div class="day ${d && d.n > 0 ? 'done' : ''} ${i === 0 ? 'today' : ''}"><i>${d && d.n > 0 ? '✓' : ''}</i>${labels[new Date(t).getDay()]}</div>`;
    }

    const hour = new Date().getHours();
    const hello = hour < 6 ? '늦은 밤이에요' : hour < 12 ? '좋은 아침이에요' : hour < 18 ? '오늘도 한 걸음 더' : '하루 마무리 복습 어때요?';

    const books = categories.slice(0, 3).map(bookCardHtml).join('');

    $('tabHome').innerHTML = `
      <div class="page-title" style="margin-bottom:18px;">${hello}</div>
      <section class="deck">
        <div class="deck-card deck-3"></div><div class="deck-card deck-2"></div>
        <div class="deck-card deck-1">
          <div class="deck-top">
            <div>
              <div class="deck-label">${cta.label}</div>
              <div class="deck-num">${cta.big}<small>${cta.unit}</small></div>
            </div>
            <div class="ring-box">${ringSvg(pct)}<div class="ring-txt"><b>${Math.min(today.n, 999)}</b>/${goal}</div></div>
          </div>
          <div class="deck-sub">${cta.sub}</div>
          <button class="deck-cta" ${cta.attrs}>${cta.btn}</button>
        </div>
      </section>

      <div class="card streak-card">
        <div><div class="streak-fire">${st > 0 ? '🔥' : '🌱'}</div></div>
        <div style="min-width:74px;"><div class="streak-n">${st}일 연속</div><div class="muted" style="font-size:.74rem;font-weight:600;">${st > 0 ? '학습 중이에요' : '오늘 시작해요'}</div></div>
        <div class="week">${week}</div>
      </div>

      <div class="section-title"><span>바로 학습</span></div>
      <div class="tiles">
        <button class="tile" data-act="start" data-mode="card" data-src="new"><div class="tile-ico t-sprout">🌱</div><div><div class="tile-name">새 단어</div><div class="tile-n">${c.newW}개</div></div></button>
        <button class="tile" data-act="start" data-mode="choice" data-src="wrong"><div class="tile-ico t-wrong">📕</div><div><div class="tile-name">오답노트</div><div class="tile-n">${c.miss}개</div></div></button>
        <button class="tile" data-act="start" data-mode="card" data-src="star"><div class="tile-ico t-star">⭐</div><div><div class="tile-name">즐겨찾기</div><div class="tile-n">${c.star}개</div></div></button>
        <button class="tile" data-act="start" data-mode="listen" data-src="due"><div class="tile-ico t-ear">🎧</div><div><div class="tile-name">듣기 모드</div><div class="tile-n">복습 단어 들으며 외우기</div></div></button>
      </div>

      <div class="section-title"><span>내 단어장</span><button data-act="tab" data-t="tabBooks">전체 보기</button></div>
      <div class="book-list">${books || '<div class="empty"><b>아직 단어장이 없어요</b>단어장 탭에서 새로 만들어 보세요.</div>'}</div>
    `;
  }

  ACTIONS.start = el => startSession(el.dataset.mode, parseSrc(el.dataset.src), el.dataset.count !== undefined ? parseInt(el.dataset.count, 10) : SESSION_DEFAULT);
