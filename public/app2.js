  /* =========================================================
   * 데이터 모델 / 저장소
   * ======================================================= */
  let KEY_DATA = '', KEY_CFG = '', currentUser = null, currentLabel = '', cloudTimer = null;
  const cloudAvail = !!(window.VOCA_CLOUD && window.VOCA_CLOUD.apiKey);
  // 만 14세 미만은 서버 계정 없이 이 기기에만 저장하는 계정(kidMode)으로 써요. 운영자가 아동 개인정보를 모으지 않도록.
  const KEY_KID = 'vocapro_kid';
  let kidMode = false, cloudMode = cloudAvail;
  function setKidMode(on) { kidMode = !!on && cloudAvail; cloudMode = cloudAvail && !kidMode; }
  const KEY_USERS = 'vocapro_users', KEY_SESS = 'vocapro_session';

  const DEFAULT_CFG = {
    provider: 'gemini',
    keys: { gemini: '', xai: '', openai: '', anthropic: '' },
    models: { gemini: '', xai: '', openai: '', anthropic: '' },
    modelLists: { gemini: [], xai: [], openai: [], anthropic: [] },
    ttsRate: 0.9, koRate: 1, ttsPitch: 1, gap: 0.9, wordRep: 1, matchVoice: true, voice: { en: '', zh: '', ko: '' },
    goal: 20, darkMode: false, grade: '', lang: 'en', haptic: true
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
  /* 예전 데이터의 "영어 예문 (한국어 해석)" 을 예문/해석 두 칸으로 나눠요 */
  function splitExample(en, ko) {
    en = str(en); ko = str(ko);
    if (!ko && en) {
      const m = en.match(/^(.*?[A-Za-z].*?)\s*[(（]([^()（）]*[가-힣][^()（）]*)[)）]\s*$/);
      if (m) { en = m[1].trim(); ko = m[2].trim(); }
      else { const k = en.search(/[가-힣]/); if (k > 0 && /[A-Za-z]/.test(en.slice(0, k))) { ko = en.slice(k).replace(/^[\s/\-–—:]+/, '').trim(); en = en.slice(0, k).replace(/[\s/\-–—:(（]+$/, '').trim(); } }
    }
    return { en, ko };
  }
  function sanitizeWord(w) {
    const n = x => (Number.isFinite(+x) ? +x : 0);
    const box = (w.box !== undefined && Number.isFinite(+w.box)) ? Math.max(0, Math.min(5, Math.floor(+w.box))) : (w.memorized ? 5 : 0);
    let due = n(w.due);
    if (box > 0 && due <= 0) due = addDays(startOfDay(), INTERVALS[box]);
    if (box === 0) due = 0;
    const ex = splitExample(w.example, w.exampleKo);
    return {
      id: safeId(w.id) || uid(), word: str(w.word), meaning: str(w.meaning), phonetic: str(w.phonetic),
      koreanPron: str(w.koreanPron), example: ex.en, exampleKo: ex.ko, synonyms: str(w.synonyms), exPy: str(w.exPy).slice(0, 200),
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
      const o = { id, name: str(c.name).slice(0, 40) || '이름 없음', words };
      if (/^\d+$/.test(String(c.asg))) o.asg = +c.asg; // 과제로 만든 단어장 표시
      return o;
    });
  }
  function sanitizeStats(s) {
    const days = {};
    if (s && typeof s.days === 'object' && s.days) {
      for (const k of Object.keys(s.days)) {
        if (/^\d{4}-\d{2}-\d{2}$/.test(k)) {
          const d = s.days[k] || {};
          days[k] = { n: Math.max(0, Math.floor(+d.n) || 0), ok: Math.max(0, Math.floor(+d.ok) || 0) };
          if (+d.m > 0) days[k].m = Math.floor(+d.m); // 그날 새로 마스터한 단어 수(주간 리포트)
        }
      }
    }
    const tests = Array.isArray(s && s.tests) ? s.tests.filter(t => t && +t.d > 0 && +t.n > 0).slice(-30).map(t => ({ d: +t.d, n: Math.floor(+t.n), ok: Math.max(0, Math.floor(+t.ok) || 0), sec: Math.max(0, Math.floor(+t.sec) || 0), src: String(t.src || '').slice(0, 40) })) : [];
    const o = { days };
    if (tests.length) o.tests = tests;
    if (s && /^\d{4}-\d{2}-\d{2}$/.test(s.frzSeen)) o.frzSeen = s.frzSeen; // 보호권 알림을 이미 보여 준 날
    return o;
  }
  const defaultCats = () => [
    { id: 'cat_today', name: '오늘 (Day 1)', words: [] },
    { id: 'cat_review', name: '누적 복습', words: [] }
  ];

  const cleanProfile = p => ({ name: String((p && p.name) || '').trim().slice(0, 20), school: String((p && p.school) || '').trim().slice(0, 30), sno: String((p && p.sno) || '').trim().slice(0, 12) });
  // 읽어주기 설정(속도·높이·쉬는 시간·목소리)을 저장본에서 안전하게 읽어요.
  function ttsCfgIn(cfg, d) {
    if (!d) return;
    const n = (k, lo, hi) => { const x = parseFloat(d[k]); if (isFinite(x)) cfg[k] = Math.min(hi, Math.max(lo, x)); };
    n('ttsRate', .5, 2); n('koRate', .5, 2); n('ttsPitch', .5, 1.5); n('gap', 0, 5); n('wordRep', 1, 3);
    if (typeof d.matchVoice === 'boolean') cfg.matchVoice = d.matchVoice;
    if (d.voice && typeof d.voice === 'object') cfg.voice = { en: String(d.voice.en || '').slice(0, 200), zh: String(d.voice.zh || '').slice(0, 200), ko: String(d.voice.ko || '').slice(0, 200) };
  }
  const ttsCfgOut = () => ({ ttsRate: config.ttsRate, koRate: config.koRate, ttsPitch: config.ttsPitch, gap: config.gap, wordRep: config.wordRep, matchVoice: config.matchVoice });
  function loadConfig() {
    const cfg = JSON.parse(JSON.stringify(DEFAULT_CFG));
    const saved = loadJson(KEY_CFG);
    if (saved) {
      cfg.provider = saved.provider || cfg.provider;
      cfg.ttsRate = saved.ttsRate || cfg.ttsRate;
      ttsCfgIn(cfg, saved);
      cfg.goal = saved.goal || cfg.goal;
      cfg.darkMode = !!saved.darkMode;
      if (typeof saved.haptic === 'boolean') cfg.haptic = saved.haptic;
      cfg.lang = saved.lang === 'zh' ? 'zh' : 'en';
      cfg.grade = GRADE_NAMES[saved.grade] ? saved.grade : '';
      cfg.role = saved.role === 'teacher' ? 'teacher' : '';
      cfg.profile = cleanProfile(saved.profile);
      if (saved.gameName) cfg.gameName = String(saved.gameName).replace(/[\u0000-\u001f<>]/g, '').slice(0, 12);
      for (const p of Object.keys(cfg.keys)) {
        if (saved.keys && saved.keys[p]) cfg.keys[p] = saved.keys[p];
        if (saved.models && saved.models[p]) cfg.models[p] = saved.models[p];
        if (saved.modelLists && Array.isArray(saved.modelLists[p])) cfg.modelLists[p] = saved.modelLists[p];
      }
    }
    return cfg;
  }
  function loadDb() { const d = loadJson(KEY_DATA); useBlob(d && Array.isArray(d.categories) ? d : null); }

  let config = JSON.parse(JSON.stringify(DEFAULT_CFG));
  let categories = defaultCats();
  let stats = { days: {} };
  /* 영어와 중국어는 단어장과 학습 기록을 따로 가져요. 저장할 때는 영어를 예전 자리(categories, stats)에,
     중국어를 zh 안에 넣어서 예전 앱과 백업 파일도 그대로 읽혀요. altSet 은 지금 안 보고 있는 언어 쪽이에요. */
  const emptySet = () => ({ categories: defaultCats(), stats: { days: {} } });
  let altSet = emptySet();
  function dataBlob() {
    const cur = { categories, stats }, en = isZh() ? altSet : cur, zh = isZh() ? cur : altSet;
    return { categories: en.categories, stats: en.stats, zh: { categories: zh.categories, stats: zh.stats } };
  }
  function useBlob(d) {
    const en = { categories: (d && sanitizeCategories(d.categories)) || defaultCats(), stats: sanitizeStats(d && d.stats) };
    const z = d && d.zh && typeof d.zh === 'object' ? d.zh : null;
    const zh = { categories: (z && sanitizeCategories(z.categories)) || defaultCats(), stats: sanitizeStats(z && z.stats) };
    LANG = config.lang === 'zh' ? 'zh' : 'en';
    const cur = isZh() ? zh : en; altSet = isZh() ? en : zh;
    categories = cur.categories; stats = cur.stats;
  }

  function syncStorage() {
    if (!currentUser) return;
    try {
      LS.setItem(KEY_DATA, JSON.stringify(dataBlob()));
      LS.setItem(KEY_CFG, JSON.stringify(config));
      LS.setItem(KEY_DATA + ':ts', String(Date.now())); if (cloudMode) LS.setItem(KEY_DATA + ':dirty', '1'); cloudQueue();
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
      if (w.last !== key) {
        const was = w.box; w.box = Math.min(5, w.box + 1); w.due = addDays(today, INTERVALS[w.box]);
        if (was < 5 && w.box === 5) { const d = stats.days[key] || (stats.days[key] = { n: 0, ok: 0 }); d.m = (d.m || 0) + 1; }
      }
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
  /* 연속 학습 + 보호권(Duolingo 의 스트릭 프리즈처럼): 7일 연속을 채울 때마다 1장(최대 2장)을 받고,
     딱 하루를 빠지면 갖고 있던 보호권이 저절로 그날을 지켜 줘요(보호된 날은 연속 일수에 더하지 않아요).
     따로 저장하지 않고 stats.days 만으로 처음부터 다시 세서, 다른 기기·반 리포트에서도 같은 숫자가 나와요. */
  const FRZ_EVERY = 7, FRZ_MAX = 2;
  const dNum = k => Date.UTC(+k.slice(0, 4), +k.slice(5, 7) - 1, +k.slice(8, 10)) / DAY;
  const dKeyOf = n => new Date(n * DAY).toISOString().slice(0, 10);
  function streakInfo() {
    const keys = Object.keys(stats.days).filter(k => stats.days[k].n > 0).sort(), prot = [];
    let cur = 0, best = 0, frz = 0, prev = null;
    keys.forEach(k => {
      const t = dNum(k), g = prev === null ? 0 : t - prev;
      if (g === 1) cur++;
      else if (g === 2 && frz > 0) { frz--; prot.push(dKeyOf(t - 1)); cur++; }
      else cur = 1;
      if (cur % FRZ_EVERY === 0) frz = Math.min(FRZ_MAX, frz + 1);
      best = Math.max(best, cur); prev = t;
    });
    const g = prev === null ? 99 : dNum(dayKey()) - prev;
    let n = g <= 1 ? cur : 0;
    if (g === 2 && frz > 0) { frz--; prot.push(dKeyOf(prev + 1)); n = cur; } // 어제를 빠졌어요: 오늘 하면 이어져요
    return { n, best, frz, prot };
  }
  function streak() { return streakInfo().n; }
  function bestStreak() { return streakInfo().best; }
  // 보호권이 새로 쓰였으면 한 번만 알려 줘요(오래된 기록은 조용히 넘어가요)
  function frzNotice(si) {
    const last = si.prot[si.prot.length - 1];
    if (!last || last <= (stats.frzSeen || '') || dNum(dayKey()) - dNum(last) > 7) return;
    stats.frzSeen = last; syncStorage();
    const when = last === dayKey(addDays(startOfDay(), -1)) ? '어제' : `${+last.slice(5, 7)}월 ${+last.slice(8, 10)}일`;
    toast(`보호권이 ${when}${when === '어제' ? '를' : '을'} 지켜 줬어요. ${si.n}일 연속 그대로예요!`);
  }
  function recordStat(ok) {
    const k = dayKey();
    if (!stats.days[k]) stats.days[k] = { n: 0, ok: 0 };
    stats.days[k].n++;
    if (ok) stats.days[k].ok++;
    renderNavCard();
  }
  function renderNavCard() {
    const el = $('navCard'); if (!el) return;
    try {
      const goal = config.goal || 20, n = (stats.days[dayKey()] || { n: 0 }).n, st = streak();
      el.innerHTML = `${MASCOT(n >= goal ? 'cheer' : 'happy')}<b>오늘 ${Math.min(n, 999)} / ${goal}</b><div class="bar"><i style="width:${Math.min(100, Math.round(n / goal * 100))}%"></i></div><small>${st > 0 ? `${st}일 연속 학습 중` : '오늘 첫 학습을 시작해요'}</small>`;
    } catch (e) { el.innerHTML = ''; }
  }

  const BOOK_COLORS = ['#3182f6', '#03b26c', '#ff8a1f', '#7b61ff', '#f04f8a', '#00a5b8'];
  const bookColor = id => { let h = 0; for (const ch of String(id)) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return BOOK_COLORS[h % BOOK_COLORS.length]; };

  /* =========================================================
   * 테마 / 라우팅
   * ======================================================= */
  ACTIONS.theme = () => { config.darkMode = !config.darkMode; applyTheme(); syncStorage(); };
  function applyTheme() {
    document.body.classList.toggle('dark', !!config.darkMode);
    $('btnTheme').innerHTML = config.darkMode ? IC.sun : IC.moon;
    const m = document.querySelector('meta[name="theme-color"]');
    if (m) m.setAttribute('content', config.darkMode ? '#101113' : '#f2f4f6');
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
  // 위 제목: 길면 말줄임(…)이 되게 span 안에 넣어요
  function headText(t) { $('headTitle').innerHTML = `<span class="brand-t">${esc(t)}</span>`; }
  function go(id) {
    curTab = id;
    if (id !== 'tabBooks') bookSel = null;
    document.body.dataset.tab = id;
    renderNavCard();
    if (id !== 'tabHome') { const rv = $('recOv'); if (rv) rv.remove(); }
    document.querySelectorAll('.view-pane').forEach(el => el.classList.remove('active'));
    $(id).classList.add('active');
    const navFor = id === 'paneBook' ? 'tabBooks' : id;
    document.querySelectorAll('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.t === navFor));
    $('btnBackHome').style.display = id === 'paneBook' ? 'flex' : 'none';
    if (id === 'tabHome') $('headTitle').innerHTML = '<i class="brand-mark">V</i><span><b>Voca</b>Pro</span>';
    else if (id === 'paneBook') headText((curCat() || {}).name || '단어장');
    else headText(TITLES[id] || 'VocaPro');

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
    const si = streakInfo(), st = si.n, prot = new Set(si.prot);

    let cta;
    if (c.total === 0) cta = { big: '0', unit: '개', label: '오늘의 복습', sub: '단어를 추가하면 복습 일정이 자동으로 만들어져요.', btn: '단어 추가하기', attrs: 'data-act="tab" data-t="tabBooks"' };
    else if (c.due > 0) cta = { big: c.due, unit: '개', label: '오늘의 복습', sub: '잊어버리기 직전에 복습하면 오래 기억돼요.', btn: '복습 시작', attrs: 'data-act="start" data-mode="card" data-src="due"' };
    else if (c.newW > 0) cta = { big: c.newW, unit: '개', label: '새 단어', sub: '오늘 복습은 끝났어요. 새 단어를 배워볼까요?', btn: '새 단어 학습', attrs: 'data-act="start" data-mode="card" data-src="new"' };
    else cta = { big: c.total, unit: '개', label: '전체 단어', sub: '모든 단어를 학습했어요. 새 단어를 더 추가해 보세요.', btn: '단어 추가하기', attrs: 'data-act="tab" data-t="tabBooks"' };

    const labels = ['일', '월', '화', '수', '목', '금', '토'];
    let week = '';
    for (let i = 6; i >= 0; i--) {
      const t = addDays(startOfDay(), -i);
      const d = stats.days[dayKey(t)], fz = prot.has(dayKey(t)); // 보호권이 지켜 준 날은 방패로 표시해요
      week += `<div class="day ${d && d.n > 0 ? 'done' : fz ? 'frz' : ''} ${i === 0 ? 'today' : ''}"${fz ? ' title="보호됨" aria-label="보호됨"' : ''}><i>${d && d.n > 0 ? IC.tick : fz ? IC.shield : ''}</i>${fz ? '보호됨' : labels[new Date(t).getDay()]}</div>`;
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
        <div class="streak-fire ${st > 0 ? '' : 'off'}">${st > 0 ? IC.flame : IC.sprout}${si.frz ? `<span class="frz-badge" title="연속 학습 보호권 ${si.frz}장" aria-label="보호권 ${si.frz}장">${IC.shield}<b>${si.frz}</b></span>` : ''}</div>
        <div class="streak-txt"><div class="streak-n">${st}일 연속</div><div class="muted">${st > 0 && today.n === 0 && prot.has(dayKey(addDays(startOfDay(), -1))) ? '어제 보호됨' : si.frz ? `보호권 ${si.frz}장` : st > 0 ? `보호권까지 ${FRZ_EVERY - st % FRZ_EVERY}일` : '오늘 시작해요'}</div></div>
        <div class="week">${week}</div>
      </div>${wotdHtml()}</div>

      <div class="h-quick"><div class="section-title"><span>바로 학습</span></div>
      <div class="tiles">
        <button class="tile" data-act="start" data-mode="card" data-src="new"><div class="tile-ico t-new">${IC.sprout}</div><div><div class="tile-name">새 단어</div><div class="tile-n">${c.newW}개</div></div></button>
        <button class="tile" data-act="start" data-mode="choice" data-src="wrong"><div class="tile-ico t-wrong">${IC.bookx}</div><div><div class="tile-name">오답노트</div><div class="tile-n">${c.miss}개</div></div></button>
        <button class="tile" data-act="start" data-mode="card" data-src="star"><div class="tile-ico t-star">${IC.star}</div><div><div class="tile-name">즐겨찾기</div><div class="tile-n">${c.star}개</div></div></button>
        <button class="tile" data-act="start" data-mode="listen" data-src="due"><div class="tile-ico t-listen">${IC.headphones}</div><div><div class="tile-name">듣기 모드</div><div class="tile-n">복습 단어 듣기</div></div></button>
      </div></div>

      ${shelfHtml()}

      <div class="h-tools">${isTeacher() ? teachToolsHtml() : ''}<div class="section-title"><span>학습 도구</span></div>
      <div class="tool-list">${isTeacher() ? '' : classEntryHtml()}${todayHtml()}${flowEntryHtml()}${wqEntryHtml()}<button class="mg-entry" data-act="gx-open"><span class="mg-ico i-mint">${IC.scan}</span><span class="mg-txt"><b>글·사진에서 단어 뽑기</b><small>기사, 유튜브 자막, 유인물 사진 속 모르는 단어만</small></span><span class="mg-chev"></span></button><button class="mg-entry" data-act="match"><span class="mg-ico i-grape">${IC.cards}</span><span class="mg-txt"><b>짝 맞추기</b><small>${LN()}와 뜻을 빠르게 연결해요</small></span><span class="mg-chev"></span></button><button class="mg-entry" data-act="rain"><span class="mg-ico i-teal">${IC.play}</span><span class="mg-txt"><b>단어 비</b><small>떨어지는 뜻이 닿기 전에 단어를 골라요</small></span><span class="mg-chev"></span></button><button class="mg-entry" data-act="exam-open"><span class="mg-ico i-coral">${IC.trophy}</span><span class="mg-txt"><b>실전 시험</b><small>섞인 문제를 풀고 점수와 등급을 받아요</small></span><span class="mg-chev"></span></button><button class="mg-entry" data-act="dict-open"><span class="mg-ico i-teal">${IC.search}</span><span class="mg-txt"><b>${LN()}사전</b><small>${isZh() ? '한자, 병음, 한글 뜻으로 바로 찾아요' : '뜻, 예문, 비슷한 단어를 바로 찾아요'}</small></span><span class="mg-chev"></span></button>${recEntryHtml()}${packEntryHtml()}${ltEntryHtml()}</div></div>

      <div class="h-books"><div class="section-title"><span>내 단어장</span><button data-act="tab" data-t="tabBooks">전체 보기</button></div>
      <div class="book-list">${books || emptyHtml('아직 단어장이 없어요', '단어장 탭에서 새로 만들어 보세요.')}</div></div>
      </div>
    `;
    recMaybeShow(); wotdFill(); frzNotice(si);
  }

  ACTIONS.start = el => startSession(el.dataset.mode, parseSrc(el.dataset.src), el.dataset.count !== undefined ? parseInt(el.dataset.count, 10) : SESSION_DEFAULT);

