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

  function renderStudy() {
    const c = counts();
    const srcs = [
      { k: 'due', n: '오늘 복습', c: c.due }, { k: 'new', n: '새 단어', c: c.newW },
      { k: 'wrong', n: '오답노트', c: c.miss }, { k: 'star', n: '즐겨찾기', c: c.star }, { k: 'all', n: '전체', c: c.total }
    ].concat(categories.map(b => ({ k: 'cat:' + b.id, n: b.name, c: b.words.length })));
    if (!srcs.some(s => s.k === studyPrefs.src)) studyPrefs.src = 'all';
    const counts4 = [[10, '10개'], [20, '20개'], [50, '50개'], [0, '전체']];
    $('tabStudy').innerHTML = `
      <h2 class="page-title">무엇을 공부할까요?</h2>
      <div class="src-row">${srcs.map(s => `<button class="src ${studyPrefs.src === s.k ? 'on' : ''}" data-act="pick-src" data-k="${esc(s.k)}"><span>${esc(s.n)}</span><b>${s.c}</b></button>`).join('')}</div>
      <div class="section-title" style="margin-top:14px;"><span>한 번에 학습할 개수</span></div>
      <div class="seg">${counts4.map(([v, n]) => `<button class="${studyPrefs.count === v ? 'on' : ''}" data-act="pick-count" data-v="${v}">${n}</button>`).join('')}</div>
      <div class="section-title"><span>학습 방법</span></div>
      <div class="modes">${Object.keys(MODES).map(k => `<button class="mode" data-act="study-start" data-mode="${k}"><span class="ico">${MODES[k].ico}</span><b>${MODES[k].name}</b><span>${MODES[k].desc}</span></button>`).join('')}</div>`;
  }
  ACTIONS['pick-src'] = el => { studyPrefs.src = el.dataset.k; renderStudy(); };
  ACTIONS['pick-count'] = el => { studyPrefs.count = parseInt(el.dataset.v, 10); renderStudy(); };
  ACTIONS['study-start'] = el => startSession(el.dataset.mode, parseSrc(studyPrefs.src), studyPrefs.count);

