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
    provider: 'gemini', aiv: 2,
    keys: { gemini: '', xai: '', openai: '', anthropic: '' },
    models: { gemini: '', xai: '', openai: '', anthropic: '' },
    modelLists: { gemini: [], xai: [], openai: [], anthropic: [] },
    ttsRate: 0.9, koRate: 1, ttsPitch: 1, gap: 0.9, wordRep: 1, matchVoice: true, voice: { en: '', zh: '', ko: '' },
    goal: 20, darkMode: false, grade: '', lang: 'en', haptic: true,
    kpronEn: true, kpronZh: true, studyCount: SESSION_DEFAULT, guide: {}
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

  const cleanProfile = p => ({ name: String((p && p.name) || '').trim().slice(0, 20), school: String((p && p.school) || '').trim().slice(0, 30), sno: String((p && p.sno) || '').trim().slice(0, 12), scode: String((p && p.scode) || '').replace(/[^A-Za-z0-9:]/g, '').slice(0, 24) });
  function cleanGuide(g) {
    const out = {};
    if (g && typeof g === 'object') {
      for (const k of Object.keys(g)) {
        if (k.length <= 48 && Number.isFinite(+g[k])) out[k] = Math.max(0, Math.min(7, Math.floor(+g[k])));
      }
    }
    return out;
  }
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
      if (typeof saved.kpronEn === 'boolean') cfg.kpronEn = saved.kpronEn;
      if (typeof saved.kpronZh === 'boolean') cfg.kpronZh = saved.kpronZh;
      if (Number.isFinite(+saved.studyCount)) cfg.studyCount = Math.max(0, Math.min(500, Math.floor(+saved.studyCount)));
      if (saved.guide && typeof saved.guide === 'object') cfg.guide = cleanGuide(saved.guide);
      cfg.course = cleanCourse(saved.course);
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
    if (!PROVIDERS[cfg.provider]) cfg.provider = 'gemini';
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
  // 본문 읽기에 저장한 본문(영어 · 중국어 같이). 해석도 같이 저장해서 다시 열면 바로 보여요.
  let passages = [];
  const PSG_MAX = 50;
  function sanitizePassages(a) {
    if (!Array.isArray(a)) return [];
    return a.filter(x => x && typeof x.text === 'string' && x.text.trim()).slice(0, PSG_MAX).map(x => ({
      id: String(x.id || uid()).slice(0, 40), name: String(x.name || '본문').replace(/[\u0000-\u001f]/g, '').slice(0, 40) || '본문',
      text: String(x.text).slice(0, 4000), zh: !!x.zh, at: Number.isFinite(+x.at) ? +x.at : Date.now(),
      ko: Array.isArray(x.ko) ? x.ko.slice(0, 80).map(k => String(k || '').slice(0, 800)) : []
    }));
  }
  function dataBlob() {
    const cur = { categories, stats }, en = isZh() ? altSet : cur, zh = isZh() ? cur : altSet;
    return { categories: en.categories, stats: en.stats, zh: { categories: zh.categories, stats: zh.stats }, passages };
  }
  function useBlob(d) {
    const en = { categories: (d && sanitizeCategories(d.categories)) || defaultCats(), stats: sanitizeStats(d && d.stats) };
    const z = d && d.zh && typeof d.zh === 'object' ? d.zh : null;
    const zh = { categories: (z && sanitizeCategories(z.categories)) || defaultCats(), stats: sanitizeStats(z && z.stats) };
    LANG = config.lang === 'zh' ? 'zh' : 'en';
    const cur = isZh() ? zh : en; altSet = isZh() ? en : zh;
    categories = cur.categories; stats = cur.stats;
    passages = sanitizePassages(d && d.passages);
  }

  // 맞춤 코스 설정 정리 (저장 · 백업 · 서버 동기화에 써요)
  function cleanCourse(c) {
    if (!c || typeof c !== 'object' || !['travel', 'talk', 'school', 'toeic', 'toefl', 'basic'].includes(c.goal)) return null;
    const lv = Math.max(0, Math.min(4, Math.floor(+c.lv || 0))), daily = [5, 10, 20, 30].includes(+c.daily) ? +c.daily : 10;
    return { goal: c.goal, lv, daily, catId: typeof c.catId === 'string' ? c.catId.slice(0, 40) : null, day: Math.max(0, Math.min(9999, Math.floor(+c.day || 0))),
      last: typeof c.last === 'string' ? c.last.slice(0, 12) : '', ids: Array.isArray(c.ids) ? c.ids.filter(x => typeof x === 'string').slice(0, 40) : [], step: Math.max(0, Math.min(9, Math.floor(+c.step || 0))) };
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
  const kpronOn = () => config[isZh() ? 'kpronZh' : 'kpronEn'] !== false;
  // 병음 -> 한글 발음 (국립국어원 중국어 표기 기준). 한글 발음이 비어 있는 중국어 단어도 [셰셰]처럼 보여 줘요.
  const PY_INI = { b: 'ㅂ', p: 'ㅍ', m: 'ㅁ', f: 'ㅍ', d: 'ㄷ', t: 'ㅌ', n: 'ㄴ', l: 'ㄹ', g: 'ㄱ', k: 'ㅋ', h: 'ㅎ', j: 'ㅈ', q: 'ㅊ', x: 'ㅅ', zh: 'ㅈ', ch: 'ㅊ', sh: 'ㅅ', r: 'ㄹ', z: 'ㅉ', c: 'ㅊ', s: 'ㅆ' };
  // 운모 -> [모음, 받침] 음절 목록. 첫 음절에만 성모가 붙어요.
  const PY_FIN = {
    a: [['ㅏ']], ai: [['ㅏ'], ['ㅣ']], ao: [['ㅏ'], ['ㅗ']], an: [['ㅏ', 'ㄴ']], ang: [['ㅏ', 'ㅇ']],
    o: [['ㅗ']], ou: [['ㅓ'], ['ㅜ']], ong: [['ㅜ', 'ㅇ']],
    e: [['ㅓ']], ei: [['ㅔ'], ['ㅣ']], en: [['ㅓ', 'ㄴ']], eng: [['ㅓ', 'ㅇ']], er: [['ㅓ', 'ㄹ']],
    i: [['ㅣ']], ia: [['ㅑ']], ie: [['ㅖ']], iao: [['ㅑ'], ['ㅗ']], iu: [['ㅠ']], ian: [['ㅕ', 'ㄴ']], in: [['ㅣ', 'ㄴ']], iang: [['ㅑ', 'ㅇ']], ing: [['ㅣ', 'ㅇ']], iong: [['ㅠ', 'ㅇ']],
    u: [['ㅜ']], ua: [['ㅘ']], uo: [['ㅝ']], uai: [['ㅘ'], ['ㅣ']], ui: [['ㅜ'], ['ㅣ']], uan: [['ㅘ', 'ㄴ']], un: [['ㅜ', 'ㄴ']], uang: [['ㅘ', 'ㅇ']],
    uei: [['ㅞ'], ['ㅣ']], uen: [['ㅝ', 'ㄴ']], ueng: [['ㅝ', 'ㅇ']],
    v: [['ㅟ']], ve: [['ㅞ']], van: [['ㅟ'], ['ㅏ', 'ㄴ']], vn: [['ㅟ', 'ㄴ']]
  };
  const PY_Y = { yi: 'i', ya: 'ia', ye: 'ie', yao: 'iao', you: 'iu', yan: 'ian', yin: 'in', yang: 'iang', ying: 'ing', yong: 'iong', yu: 'v', yue: 've', yuan: 'van', yun: 'vn', wu: 'u', wa: 'ua', wo: 'uo', wai: 'uai', wei: 'uei', wan: 'uan', wen: 'uen', wang: 'uang', weng: 'ueng' };
  const HJ_CHO = 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ', HJ_JUNG = 'ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ', HJ_JONG = ' ㄱㄲㄳㄴㄵㄶㄷㄹㄺㄻㄼㄽㄾㄿㅀㅁㅂㅄㅅㅆㅇㅈㅊㅋㅌㅍㅎ';
  const PLAIN_V = { 'ㅑ': 'ㅏ', 'ㅕ': 'ㅓ', 'ㅛ': 'ㅗ', 'ㅠ': 'ㅜ', 'ㅒ': 'ㅐ', 'ㅖ': 'ㅔ' };
  function hjMake(cho, jung, jong) {
    if ((cho === 'ㅈ' || cho === 'ㅊ' || cho === 'ㅉ') && PLAIN_V[jung]) jung = PLAIN_V[jung];
    return String.fromCharCode(0xAC00 + (HJ_CHO.indexOf(cho) * 21 + HJ_JUNG.indexOf(jung)) * 28 + Math.max(0, HJ_JONG.indexOf(jong || ' ')));
  }
  function pySyl(s) {
    let r = false;
    let m = s.match(/^(zh|ch|sh|[bpmfdtnlgkhjqxrzcs])?([a-z]+)$/); if (!m) return null;
    let ini = m[1] || '', fin = m[2];
    if (!ini && PY_Y[fin]) fin = PY_Y[fin];
    else if (!ini && /^[yw]/.test(fin)) return null;
    if (!PY_FIN[fin] && fin.length > 1 && fin.endsWith('r')) { fin = fin.slice(0, -1); r = true; } // 얼화 (huār)
    if (/^[jqx]$/.test(ini) && /^u/.test(fin)) fin = 'v' + fin.slice(1);
    let parts = PY_FIN[fin]; if (!parts) return null;
    if (fin === 'i' && /^(zh|ch|sh|r|z|c|s)$/.test(ini)) parts = [['ㅡ']];
    let out = parts.map(([v, j], i) => hjMake(i === 0 && ini ? PY_INI[ini] : 'ㅇ', v, j)).join('');
    return r ? out + '얼' : out;
  }
  const pyKoCache = new Map();
  function pinyinKo(py) {
    py = String(py || '').trim(); if (!py || py.length > 80) return '';
    if (pyKoCache.has(py)) return pyKoCache.get(py);
    const t = py.normalize('NFD').replace(/ü|u:|v/gi, 'v').replace(/ü/g, 'v').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[’'·\-]/g, ' ');
    let res = '';
    for (const w of t.split(/\s+/).filter(Boolean)) {
      // 띄어 쓰지 않은 병음(xuexi)은 앞에서부터 가장 긴 음절로 잘라요.
      let s = w.replace(/[^a-z]/g, ''), i = 0;
      while (i < s.length) {
        let got = null, len = 0;
        for (let L = Math.min(6, s.length - i); L >= 1; L--) { const k = pySyl(s.substr(i, L)); if (k) { got = k; len = L; break; } }
        if (!got) { res = ''; i = s.length; pyKoCache.set(py, ''); return ''; }
        res += got; i += len;
      }
    }
    pyKoCache.set(py, res); return res;
  }
  // 저장된 한글 발음이 없으면 중국어는 병음에서 만들어요.
  const kpronOf = w => (w && w.koreanPron) || (w && isZh() && /[㐀-鿿]/.test(w.word || '') ? pinyinKo(w.phonetic) : '');
  function applyKpron() { document.body.classList.toggle('no-kpron', !kpronOn()); }
  function applyTheme() {
    document.body.classList.toggle('dark', !!config.darkMode);
    $('btnTheme').innerHTML = config.darkMode ? IC.sun : IC.moon;
    const m = document.querySelector('meta[name="theme-color"]');
    if (m) m.setAttribute('content', config.darkMode ? '#101113' : '#f4f5f8');
    applyKpron();
  }
  /* 영어 ↔ 중국어 전환: 머리글의 EN/中 스위치나 설정에서 바꿔요. 단어장과 기록은 언어마다 따로예요. */
  function applyLang() {
    document.body.classList.toggle('lang-zh', isZh());
    applyKpron();
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
  const TITLES = { tabBooks: '단어장', tabTexts: '본문', tabStudy: '학습', tabStats: '통계', tabSettings: '설정' };
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
    else if (id === 'tabTexts') renderTexts();
    else if (id === 'tabStudy') renderStudy();
    else if (id === 'tabStats') renderStats();
    else if (id === 'tabSettings') loadSettingsUI();
    window.scrollTo(0, 0);
  }
  ACTIONS.tab = el => go(el.dataset.t);
  ACTIONS.back = () => go('tabBooks');

