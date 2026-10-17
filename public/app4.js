  /* =========================================================
   * 학습 탭 (소스 + 모드 선택)
   * ======================================================= */
  const MODES = {
    card:    { name: '플래시카드', ico: IC.cards, desc: '밀어서 외웠음 / 모름' },
    choice:  { name: '뜻 고르기', ico: IC.check, desc: '단어를 보고 뜻 맞히기' },
    rchoice: { name: '단어 고르기', ico: IC.repeat, desc: '뜻을 보고 단어 맞히기' },
    spell:   { name: '스펠링', ico: IC.keyboard, desc: '뜻을 보고 직접 쓰기' },
    dict:    { name: '듣고 쓰기', ico: IC.headphones, desc: '발음을 듣고 타이핑' },
    listen:  { name: '듣기 모드', ico: IC.speaker, desc: '자동으로 이어 듣기' },
    cloze:   { name: '문장 빈칸', ico: IC.quote, desc: '예문 속 빈칸 단어 고르기' },
    sentence:{ name: '문장 배열', ico: IC.rows, desc: '예문 단어를 순서대로 놓기' },
    speak:   { name: '말하기', ico: IC.mic, desc: '소리 내어 발음 확인' },
    lchoice: { name: '듣고 고르기', ico: IC.headphones, desc: '발음만 듣고 뜻 맞히기' },
    scramble:{ name: '철자 퍼즐', ico: IC.shuffle, desc: '글자 조각을 눌러 단어 완성' },
    mix:     { name: '섞어 풀기', ico: IC.sparkles, desc: '5가지 문제 유형을 섞어서' },
    test:    { name: '실전 시험', ico: IC.trophy, desc: '섞인 문제를 풀고 점수 받기' }
  };
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const studyPrefs = { src: 'due', count: SESSION_DEFAULT };
  const parseSrc = s => (s && s.startsWith('cat:')) ? { type: 'cat', id: s.slice(4) } : { type: s || 'all' };
  const srcKey = src => src.type === 'cat' ? 'cat:' + src.id : src.type;

  function poolFor(src) {
    const end = startOfDay() + DAY - 1, all = allWords();
    switch (src.type) {
      case 'cat': return all.filter(x => x.catId === src.id);
      case 'due': return all.filter(x => x.w.box >= 1 && x.w.due <= end);
      case 'new': return all.filter(x => x.w.box === 0);
      case 'wrong': return all.filter(x => x.w.miss > 0);
      case 'star': return all.filter(x => x.w.star);
      case 'today': return all.filter(x => (x.w.box >= 1 && x.w.due <= end) || x.w.box === 0);
      default: return all;
    }
  }
  const EMPTY_MSG = { due: '오늘 복습할 단어가 없어요. 잘하고 있어요!', new: '새 단어가 없어요. 단어를 추가해 보세요.', wrong: '오답노트가 비어 있어요.', star: '즐겨찾기한 단어가 없어요. 단어 카드의 별 아이콘을 눌러 보세요.', today: '오늘 할 단어가 없어요.', cat: '이 단어장에 단어가 없어요.', all: '단어가 없어요. 먼저 단어를 추가해 보세요.' };

  const GUIDE = [
    ['card', '눈으로 익히기', '뜻과 발음을 보며 처음 만나요'],
    ['choice', '뜻 떠올리기', '단어를 보고 뜻을 골라요'],
    ['rchoice', '단어 떠올리기', '뜻을 보고 단어를 골라요'],
    ['lchoice', '귀로 익히기', '발음만 듣고 뜻을 맞혀요'],
    ['spell', '손으로 쓰기', '직접 써야 진짜 외운 거예요'],
    ['cloze', '문장 속에서', '예문 속 빈칸을 채워요'],
    ['test', '확인 시험', '80점을 넘으면 완료예요']
  ];
  let studyPrefsUser = null, pendingGuideRun = null;
  function guideStepFor(key) {
    const g = (config && config.guide) || {};
    const v = g[key];
    return Number.isFinite(+v) ? Math.max(0, Math.min(7, Math.floor(+v))) : 0;
  }
  function setGuideStep(key, step) {
    if (!key || key.length > 48) return;
    if (!config.guide || typeof config.guide !== 'object') config.guide = {};
    config.guide[key] = Math.max(0, Math.min(7, Math.floor(+step || 0)));
    syncStorage();
  }

  function renderStudy() {
    if (studyPrefsUser !== currentUser) {
      studyPrefsUser = currentUser;
      studyPrefs.count = Number.isFinite(+config.studyCount) ? config.studyCount : SESSION_DEFAULT;
    }
    const c = counts();
    const srcs = [
      { k: 'due', n: '오늘 복습', c: c.due }, { k: 'new', n: '새 단어', c: c.newW },
      { k: 'wrong', n: '오답노트', c: c.miss }, { k: 'star', n: '즐겨찾기', c: c.star }, { k: 'all', n: '전체', c: c.total }
    ].concat(categories.map(b => ({ k: 'cat:' + b.id, n: b.name, c: b.words.length })));
    if (!srcs.some(s => s.k === studyPrefs.src)) studyPrefs.src = 'all';
    const counts4 = [[10, '10개'], [20, '20개'], [50, '50개'], [0, '전체']];
    const isCustom = !counts4.some(([v]) => v === studyPrefs.count);
    const gStep = guideStepFor(studyPrefs.src);
    const gSub = gStep >= 7 ? '모든 단계 완료 · 다시 하기' : `7단계 중 ${gStep + 1}단계 · ${GUIDE[gStep][1]}`;
    const recKeys = ['card', 'choice', 'spell', 'mix'];
    const moreKeys = Object.keys(MODES).filter(k => !recKeys.includes(k));
    const modesOpen = LS.getItem('vocapro_modes_open') === '1';
    const modeBtn = k => `<button class="mode" data-act="study-start" data-mode="${k}"><span class="ico">${MODES[k].ico}</span><b>${MODES[k].name}</b><span>${MODES[k].desc}</span></button>`;
    $('tabStudy').innerHTML = `
      <h2 class="page-title">무엇을 공부할까요?</h2>
      <div class="src-row">${srcs.map(s => `<button class="src ${studyPrefs.src === s.k ? 'on' : ''}" data-act="pick-src" data-k="${esc(s.k)}"><span>${esc(s.n)}</span><b>${s.c}</b></button>`).join('')}</div>
      <div class="section-title" style="margin-top:14px;"><span>한 번에 학습할 개수</span></div>
      <div class="seg">
        ${counts4.map(([v, n]) => `<button class="${studyPrefs.count === v ? 'on' : ''}" data-act="pick-count" data-v="${v}">${n}</button>`).join('')}
        <button class="${isCustom ? 'on' : ''}" data-act="pick-count-custom">${isCustom ? `직접 ${studyPrefs.count}개` : '직접'}</button>
      </div>
      <button class="guide-card" data-act="guide-open">
        <span class="guide-ico">${IC.trend}</span>
        <span class="guide-txt"><b>추천 순서로 공부하기</b><small>${esc(gSub)}</small></span>
        <span class="guide-arr">&gt;</span>
      </button>
      <div class="section-title"><span>추천 학습 방법</span></div>
      <div class="modes modes-rec">${recKeys.map(modeBtn).join('')}</div>
      <button class="modes-more-btn${modesOpen ? ' open' : ''}" data-act="modes-toggle"><span>${modesOpen ? '학습 방법 접기' : `더 많은 학습 방법 ${moreKeys.length}개`}</span><i></i></button>
      <div class="modes modes-more" id="moreModesBox"${modesOpen ? '' : ' hidden'}>${moreKeys.map(modeBtn).join('')}</div>`;
  }
  ACTIONS['pick-src'] = el => { studyPrefs.src = el.dataset.k; renderStudy(); };
  ACTIONS['pick-count'] = el => {
    const v = parseInt(el.dataset.v, 10);
    studyPrefs.count = v; config.studyCount = v; syncStorage(); renderStudy();
  };
  ACTIONS['pick-count-custom'] = async () => {
    const cur = studyPrefs.count > 0 ? studyPrefs.count : SESSION_DEFAULT;
    const ans = await ask('한 번에 몇 개씩 학습할까요? (1~500)', { input: String(cur), ok: '정하기' });
    if (ans === null || ans === false) return;
    const n = parseInt(String(ans).trim(), 10);
    if (!Number.isFinite(n) || n < 1 || n > 500 || String(n) !== String(ans).trim()) {
      return say('1부터 500 사이의 숫자로 적어 주세요.');
    }
    studyPrefs.count = n; config.studyCount = n; syncStorage(); renderStudy();
  };
  ACTIONS['modes-toggle'] = el => {
    const box = $('moreModesBox'); if (!box) return;
    const open = box.hidden;
    box.hidden = !open;
    try { LS.setItem('vocapro_modes_open', open ? '1' : '0'); } catch (e) {}
    el.classList.toggle('open', open);
    const sp = el.querySelector('span'); if (sp) sp.textContent = open ? '학습 방법 접기' : '더 많은 학습 방법 9개';
  };
  ACTIONS['study-start'] = el => { pendingGuideRun = null; startSession(el.dataset.mode, parseSrc(studyPrefs.src), studyPrefs.count); };

  function openGuideSheet() {
    const key = studyPrefs.src, step = guideStepFor(key), curIdx = step >= 7 ? 0 : step;
    const label = srcLabel(parseSrc(key));
    const bars = GUIDE.map((_, i) => `<i class="${i < step ? 'done' : i === curIdx && step < 7 ? 'cur' : ''}"></i>`).join('');
    const rows = GUIDE.map(([m, title, desc], i) => {
      const isDone = i < step, isCur = step < 7 && i === curIdx;
      const sub = `${MODES[m].name} · ${isDone ? '완료' : isCur ? desc : desc}`;
      return `<div class="gs-row${isDone ? ' done' : ''}${isCur ? ' cur' : ''}">
        <span class="gs-num">${isDone ? IC.tick : i + 1}</span>
        <div class="gs-info"><b>${esc(title)}</b><small>${esc(sub)}</small></div>
        ${isCur
          ? `<button class="gs-go" data-act="guide-run" data-i="${i}">시작</button>`
          : `<button class="gs-play" data-act="guide-run" data-i="${i}" aria-label="${esc(title)} 시작">${IC.play}</button>`}
      </div>`;
    }).join('');
    openSheet('추천 순서로 공부하기', `
      <div class="gs-top"><b>${esc(label)}</b><span>${step >= 7 ? '모든 단계 완료' : `7단계 중 ${step + 1}단계`}</span></div>
      <div class="gs-bars">${bars}</div>
      <div class="gs-list">${rows}</div>
      <div class="gs-tip"><b>이렇게 하면 더 잘 외워져요</b>하루 20개씩 · 다음 날 복습부터 · 틀린 단어는 오답노트에서 한 번 더</div>
      ${step > 0 ? '<button class="gs-reset" data-act="guide-reset">처음 단계부터 다시 하기</button>' : ''}`);
  }
  ACTIONS['guide-open'] = openGuideSheet;
  ACTIONS['guide-run'] = el => {
    const i = parseInt(el.dataset.i, 10);
    if (!GUIDE[i]) return;
    const key = studyPrefs.src, mode = GUIDE[i][0];
    closeSheet();
    pendingGuideRun = { key, step: i, mode };
    startSession(mode, parseSrc(key), studyPrefs.count);
  };
  ACTIONS['guide-reset'] = () => {
    setGuideStep(studyPrefs.src, 0);
    openGuideSheet();
    if (curTab === 'tabStudy') renderStudy();
  };

