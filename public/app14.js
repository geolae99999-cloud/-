  /* =========================================================
   * 레벨 테스트 · 맞춤 시작
   * ======================================================= */
  const LT_BANK = [
    [["apple","사과"],["friend","친구"],["happy","행복한"],["school","학교"],["water","물"],["family","가족"],["morning","아침"],["travel","여행하다"],["bright","밝은"],["borrow","빌리다"]],
    [["improve","향상시키다"],["decide","결정하다"],["expensive","비싼"],["ordinary","평범한"],["advice","조언"],["habit","습관"],["support","지지하다"],["prepare","준비하다"],["environment","환경"],["communicate","의사소통하다"]],
    [["reluctant","꺼리는"],["ambiguous","모호한"],["inevitable","피할 수 없는"],["authentic","진짜의"],["enhance","높이다"],["restrict","제한하다"],["acquire","습득하다"],["tolerate","참아내다"],["controversy","논란"],["prosperity","번영"]],
    [["ubiquitous","어디에나 있는"],["ephemeral","덧없는"],["pragmatic","실용적인"],["meticulous","꼼꼼한"],["scrutinize","면밀히 조사하다"],["alleviate","덜어주다"],["exacerbate","악화시키다"],["indigenous","토착의"],["ostensible","표면상의"],["scarce","드문, 부족한"]]
  ];
  // 중국어 레벨 테스트: HSK 1~2급, 3급, 4급, 5~6급
  const LT_BANK_ZH = [
    [["学校","학교"],["朋友","친구"],["吃","먹다"],["喜欢","좋아하다"],["医生","의사"],["漂亮","예쁘다"],["天气","날씨"],["睡觉","잠을 자다"],["衣服","옷"],["便宜","(값이) 싸다"]],
    [["习惯","습관"],["环境","환경"],["担心","걱정하다"],["简单","간단하다"],["选择","선택하다"],["解决","해결하다"],["健康","건강"],["经常","자주"],["认真","성실하다, 진지하다"],["突然","갑자기"]],
    [["积累","쌓다, 축적하다"],["激动","감격하다"],["详细","상세하다"],["浪费","낭비하다"],["承认","인정하다"],["竞争","경쟁하다"],["鼓励","격려하다"],["尊重","존중하다"],["缺点","단점"],["减少","줄이다"]],
    [["犹豫","망설이다"],["谨慎","신중하다"],["繁荣","번영하다"],["珍惜","소중히 여기다"],["妥协","타협하다"],["弥补","메우다, 보완하다"],["隐私","사생활"],["坦率","솔직하다"],["舆论","여론"],["尴尬","난처하다"]]
  ];
  const ltBank = () => isZh() ? LT_BANK_ZH : LT_BANK;
  const LT_LV = [
    { name: '입문', goal: 10, desc: '기초 단어부터 차근차근 시작해요.' },
    { name: '초급', goal: 10, desc: '일상 단어는 익숙해요. 핵심 단어를 늘려가요.' },
    { name: '중급', goal: 20, desc: '탄탄한 기본기가 있어요. 꾸준히 확장해요.' },
    { name: '상급', goal: 30, desc: '어려운 단어도 잘 알고 있어요. 고난도에 도전해요.' },
    { name: '최상급', goal: 50, desc: '최상위 수준이에요. 고난도 단어로 완성해요.' }
  ];
  const ltKey = () => 'vocapro_level:' + (isZh() ? 'zh:' : '') + currentUser;
  let LT = null;
  function ltBuild() {
    const qs = [];
    ltBank().forEach((pool, lv) => {
      shuffled(pool.slice()).slice(0, 3).forEach(([w, m]) => {
        const wrong = shuffled(pool.filter(x => x[1] !== m)).slice(0, 3).map(x => x[1]);
        qs.push({ lv, w, m, opts: shuffled([m, ...wrong]) });
      });
    });
    return qs;
  }
  function ltOpen(intro) {
    if ($('ltOv')) return;
    LT = { qs: ltBuild(), i: 0, ok: [0, 0, 0, 0], locked: false };
    const ov = document.createElement('div'); ov.className = 'ob lt'; ov.id = 'ltOv'; document.body.appendChild(ov);
    ltIntro(ov, intro);
  }
  function ltIntro(ov, intro) {
    ov.innerHTML = `<button class="ob-skip" data-lt="close">${intro ? '나중에 할게요' : '닫기'}</button>
      <div class="ob-body"><div class="ob-art">${MASCOT('think')}</div><h2>내 ${LN()} 수준 알아보기</h2>
      <p>12문제, 약 2분이면 끝나요.<br>결과에 맞춰 하루 목표와 시작 단어를 추천해 드려요.</p></div>
      <div class="ob-foot"><button class="btn btn-primary btn-block" data-lt="start">테스트 시작</button></div>`;
  }
  function ltDraw() {
    const ov = $('ltOv'); if (!ov || !LT) return;
    if (LT.i >= LT.qs.length) return ltResult();
    const q = LT.qs[LT.i];
    ov.innerHTML = `<button class="ob-skip" data-lt="close">그만하기</button>
      <div class="lt-bar"><i style="width:${Math.round(LT.i / LT.qs.length * 100)}%"></i></div>
      <div class="ob-body lt-q"><div class="muted" style="font-weight:700;margin-bottom:10px;">${LT.i + 1} / ${LT.qs.length}</div>
      <h2 style="font-size:2.1rem;">${esc(q.w)}</h2><p style="margin-bottom:22px;">이 단어의 뜻은?</p>
      <div class="opts" style="width:100%;">${q.opts.map((o, k) => `<button class="opt" data-lt="opt" data-v="${esc(o)}"><span class="opt-n">${k + 1}</span><span>${esc(o)}</span></button>`).join('')}</div></div>
      <div class="ob-foot"><button class="btn btn-soft btn-block" data-lt="opt" data-v="">잘 모르겠어요</button></div>`;
    LT.locked = false;
  }
  function ltAnswer(v) {
    if (!LT || LT.locked) return; LT.locked = true;
    const q = LT.qs[LT.i];
    if (v === q.m) LT.ok[q.lv]++;
    const ov = $('ltOv');
    ov.querySelectorAll('.opt').forEach(b => { if (b.dataset.v === q.m) b.classList.add('correct'); else if (b.dataset.v === v) b.classList.add('wrong'); });
    const lt = LT; setTimeout(() => { if (LT === lt) { LT.i++; ltDraw(); } }, v === q.m ? 450 : 900); // 닫고 새로 연 테스트엔 영향 없게
  }
  function ltLevel() { let r = 0; for (let l = 0; l < 4; l++) { if (LT.ok[l] >= 2) r++; else break; } return r; }
  function ltResult() {
    const ov = $('ltOv'); if (!ov) return;
    const r = ltLevel(), info = LT_LV[r], total = LT.ok.reduce((a, b) => a + b, 0);
    LT.r = r;
    try { LS.setItem(ltKey(), JSON.stringify({ lv: r, score: total, at: Date.now() })); } catch (e) {}
    ov.innerHTML = `<div class="ob-body"><div class="ob-art">${MASCOT('cheer')}</div>
      <div class="muted" style="font-weight:700;">내 수준은</div><h2 style="font-size:2.4rem;">${info.name}</h2>
      <p>${info.desc}<br>12문제 중 <b>${total}</b>문제를 맞혔어요.</p>
      <div class="card" style="width:100%;margin-top:22px;text-align:left;"><b>추천 하루 목표 ${info.goal}개</b><div class="muted" style="font-size:.85rem;margin-top:4px;">'${info.name} 시작 단어' 단어장 ${ltBank()[Math.min(r, 3)].length}개도 만들어 드려요.</div></div></div>
      <div class="ob-foot">${isZh() ? '' : `<button class="btn btn-primary btn-block" data-lt="course">${mcAfterLt ? '이 수준으로 맞춤 코스 만들기' : '목적에 맞춘 코스 만들기 (여행 · 대화 · 시험)'}</button>`}
      ${mcAfterLt ? '' : `<button class="btn ${isZh() ? 'btn-primary' : 'btn-soft'} btn-block" data-lt="apply" style="margin-top:8px;">추천대로 시작하기</button>
      <button class="btn btn-soft btn-block" data-lt="goal" style="margin-top:8px;">목표만 적용하기</button>`}</div>`;
  }
  function ltApply(withBook) {
    if (!LT || LT.r === undefined) return;
    const info = LT_LV[LT.r]; config.goal = info.goal;
    let id = null;
    if (withBook) {
      const nm = info.name + ' 시작 단어';
      let cat = categories.find(c => c.name === nm);
      if (!cat) {
        cat = { id: 'c' + uid(), name: nm, words: ltBank()[Math.min(LT.r, 3)].map(([w, m]) => sanitizeWord({ id: uid(), word: w, meaning: m })) };
        categories.push(cat);
        autoFill(cat.words);
      }
      id = cat.id;
    }
    syncStorage(); const ov = $('ltOv'); if (ov) ov.remove(); LT = null;
    try { go(curTab); } catch (e) {}
    toast(withBook ? '추천 단어장을 만들었어요.' : '하루 목표를 ' + info.goal + '개로 바꿨어요.');
    if (id) { try { ACTIONS.start({ dataset: { mode: 'card', src: 'cat:' + id } }); } catch (e) {} }
  }
  document.addEventListener('click', e => {
    const b = e.target.closest && e.target.closest('#ltOv [data-lt]'); if (!b) return;
    const a = b.dataset.lt;
    if (a === 'close') { const ov = $('ltOv'); if (ov) ov.remove(); LT = null; if (mcAfterLt) { const st = mcAfterLt; mcAfterLt = null; MC = { ...st, step: 1 }; const o = document.createElement('div'); o.className = 'ob mc-ov'; o.id = 'mcOv'; document.body.appendChild(o); mcDraw(); } }
    else if (a === 'start') ltDraw();
    else if (a === 'opt') ltAnswer(b.dataset.v);
    else if (a === 'apply') ltApply(true);
    else if (a === 'goal') ltApply(false);
    else if (a === 'course' && LT && LT.r !== undefined) mcFromLt(LT.r);
  });

  /* =========================================================
   * 맞춤 코스: 목적(여행 · 대화 · 학교 시험 · 토익 · 토플 · 기초) + 수준 + 하루 학습량
   * 매일 새 단어를 코스 단어장에 담고, 목적에 맞는 순서로 학습해요(대화 · 여행은 듣기 · 말하기, 시험은 퀴즈 · 쓰기).
   * 저장: config.course = { goal, lv, daily, catId, day, last, ids, step }
   * ======================================================= */
  const MC_GOALS = {
    travel: { name: '여행 영어', desc: '공항 · 호텔 · 식당에서 바로 쓰는 말', ico: 'sun', c: 'i-sun' },
    talk: { name: '외국인과 대화', desc: '자연스럽게 말하고 알아듣기', ico: 'users', c: 'i-grape' },
    school: { name: '내신 · 수능', desc: '학교 시험과 수능 필수 단어', ico: 'book', c: 'i-mint' },
    toeic: { name: '토익', desc: '토익 빈출 단어로 점수 올리기', ico: 'trophy', c: 'i-coral' },
    toefl: { name: '토플 · 텝스', desc: '유학 · 고급 시험 어휘', ico: 'trend', c: 'i-teal' },
    basic: { name: '기초부터 차근차근', desc: '처음 시작하는 영어 단어', ico: 'sprout', c: 'i-mint' }
  };
  // 하루 공부 시간(분). 단어 하나를 여러 단계로 익히는 데 약 1분이라 새 단어 수도 같아요.
  const MC_DAILY = [[5, '가볍게, 쉬는 시간에'], [10, '꾸준히 (추천)'], [15, '보통'], [20, '열심히'], [30, '시험 준비처럼 집중해서']];
  const mcSpeak = () => SR ? 'speak' : 'dict';
  function mcSteps(goal) {
    if (goal === 'travel') return ['card', 'lchoice', mcSpeak()];
    if (goal === 'talk') return ['card', 'lchoice', 'sentence', mcSpeak()];
    if (goal === 'toeic' || goal === 'toefl') return ['card', 'choice', 'rchoice', 'spell'];
    if (goal === 'basic') return ['card', 'choice', 'lchoice'];
    return ['card', 'choice', 'spell'];
  }
  const mcStepName = m => (GUIDE.find(g => g[0] === m) || [])[1] || (MODES[m] || {}).name || m;
  function mcPacks(goal, lv) {
    const es = 'es-' + Math.min(4, Math.max(1, lv));
    if (goal === 'travel') return ['life', 'es-' + Math.min(2, Math.max(1, lv))];
    if (goal === 'talk') return lv >= 3 ? [es, 'idiom', 'life'] : [es, 'life', 'idiom'];
    if (goal === 'school') return [['basic', 'mid'], ['mid', 'high'], ['high', 'csat'], ['csat', 'idiom'], ['csat', 'toefl']][Math.min(4, lv)];
    if (goal === 'toeic') return lv <= 1 ? ['mid', 'toeic'] : ['toeic', 'idiom'];
    if (goal === 'toefl') return lv <= 2 ? ['high', 'toefl'] : ['toefl', 'csat'];
    return lv <= 1 ? ['basic', 'mid'] : ['mid', 'high'];
  }
  const mcCat = () => { const c = config.course; return c && categories.find(x => x.id === c.catId); };
  const mcLevel = () => { let s = null; try { s = JSON.parse(LS.getItem(ltKey()) || 'null'); } catch (e) {} return s && LT_LV[s.lv] ? s.lv : null; };
  // 코스 묶음에서 아직 없는 단어를 n개 골라요(skip: 이번에 이미 보여 준 단어)
  async function mcCandidates(n, skip) {
    const c = config.course; if (!c) return [];
    const packs = mcPacks(c.goal, c.lv);
    if (packs.some(k => k.startsWith('es-'))) { try { await esLoad(); } catch (e) {} }
    const own = ownedWords(), pick = [];
    (skip || []).forEach(w => own.add(String(w).toLowerCase()));
    for (const k of packs) {
      let list = gradeWords(k, true);
      if (k === packs[0] && (k === 'life' || k === 'toeic') && c.lv >= 2) list = list.slice(Math.floor(list.length * 0.15 * (c.lv - 1)));
      for (const e of list) {
        if (pick.length >= n) break;
        const lw = String(e.w || '').toLowerCase(); if (!lw || own.has(lw)) continue;
        own.add(lw); pick.push(e);
      }
      if (pick.length >= n) break;
    }
    return pick;
  }
  function mcEnsureCat() {
    const c = config.course; let cat = mcCat();
    if (!cat) { cat = { id: 'c' + uid(), name: `맞춤 코스 · ${MC_GOALS[c.goal].name}`, words: [] }; categories.unshift(cat); c.catId = cat.id; }
    return cat;
  }
  const mcWord = (e, box) => sanitizeWord({ id: uid(), word: e.w, meaning: e.m, example: e.ex || '', exampleKo: e.exKo || '', box: box || 0 });
  // 오늘 배울 새 단어를 코스 단어장에 담아요(하루에 한 번). chosen: 아는 단어 체크에서 고른 '모르는 단어'
  async function mcToday(chosen) {
    const c = config.course; if (!c || isZh()) return null;
    if (c.last === dayKey() && Array.isArray(c.ids) && c.ids.length) return c;
    const cat = mcEnsureCat();
    const pick = chosen || await mcCandidates(c.daily);
    const words = pick.map(e => mcWord(e));
    cat.words.unshift(...words);
    c.ids = words.map(w => w.id); c.day = (c.day || 0) + 1; c.last = dayKey(); c.step = 0;
    syncStorage();
    autoFill(words);
    return c;
  }
  function mcItems() {
    const c = config.course, cat = mcCat(); if (!c || !cat) return [];
    const ids = new Set(c.ids || []);
    return cat.words.filter(w => ids.has(w.id)).map(w => ({ w, catId: cat.id }));
  }
  function mcHomeHtml() {
    if (isZh() || isTeacher()) return '';
    const c = config.course;
    if (!c || !MC_GOALS[c.goal]) return `<div class="h-course"><button class="mc-start card" data-act="mc-open">
      <span class="mg-ico i-grape">${IC.sparkles}</span><span class="mc-txt"><b>나에게 맞는 영어 공부</b><small>수준과 목적(여행 · 대화 · 시험)을 고르면 매일 맞춤 학습을 만들어 드려요</small></span><span class="mg-chev"></span></button></div>`;
    const g = MC_GOALS[c.goal], steps = mcSteps(c.goal), today = c.last === dayKey(), step = today ? (c.step || 0) : 0, done = today && step >= steps.length;
    const n = today ? (c.ids || []).length : c.daily;
    return `<div class="h-course"><section class="card mc-card">
      <div class="mc-head"><span class="mg-ico ${g.c}">${IC[g.ico]}</span><div class="mc-t"><small>맞춤 코스 · ${esc(LT_LV[c.lv].name)} · 하루 ${c.daily}분</small><b>${esc(g.name)} · Day ${today ? c.day : (c.day || 0) + 1}</b></div><button class="link-btn" data-act="mc-open">바꾸기</button></div>
      <div class="mc-time"><span>오늘 공부한 시간</span><b>${Math.min(todayMin(), 999)} / ${c.daily}분</b><div class="mc-tbar"><i style="width:${Math.min(100, Math.round(todayMin() / c.daily * 100))}%"></i></div></div>
      <ol class="mc-steps">${steps.map((m, i) => `<li class="${i < step || done ? 'done' : i === step ? 'now' : ''}"><i>${i < step || done ? IC.tick : i + 1}</i><span>${esc(mcStepName(m))}</span></li>`).join('')}</ol>
      ${done ? '<div class="mc-done">오늘 맞춤 학습을 다 했어요. 내일 새 단어가 열려요.</div>' : `<button class="btn btn-primary btn-block" data-act="mc-go">${step ? `${step + 1}단계 이어서 하기` : `오늘의 새 단어 ${n}개 시작`}</button>`}
    </section></div>`;
  }
  ACTIONS['mc-go'] = async () => {
    const c0 = config.course; if (!c0) return;
    // 그날 처음이면 아는 단어부터 걸러요
    if (!(c0.last === dayKey() && Array.isArray(c0.ids) && c0.ids.length) && c0.check !== false) return kcOpen();
    const c = await mcToday(); if (!c) return;
    const steps = mcSteps(c.goal), step = c.step || 0, items = mcItems();
    if (!items.length) { toast('오늘 배울 새 단어가 없어요. 이 코스의 단어를 다 담았어요. 다른 목적이나 수준으로 바꿔 보세요.'); return; }
    if (step >= steps.length) return;
    const cat = mcCat();
    startSession(steps[step], { type: 'cat', id: cat.id }, 0, items);
    if (S && S.active) S.course = step;
  };

  /* ----- 아는 단어 체크: 오늘 후보 단어 중 이미 아는 단어를 눌러 빼요 ----- */
  // 아는 단어는 코스 단어장에 '아는 단어'로 넣고 2주 뒤에 확인 복습으로 다시 나와요(박스 4).
  let KC = null;
  async function kcOpen() {
    const c = config.course; if (!c || $('kcOv')) return;
    const ov = document.createElement('div'); ov.className = 'ob mc-ov kc-ov'; ov.id = 'kcOv'; document.body.appendChild(ov);
    ov.innerHTML = '<div class="ob-body"><p>오늘 단어를 고르는 중이에요</p></div>';
    KC = { want: c.daily, unknown: [], known: [], seen: [], cur: [], round: 0 };
    await kcRound();
  }
  async function kcRound() {
    if (!KC) return;
    const need = KC.want - KC.unknown.length;
    const list = need > 0 ? await mcCandidates(Math.min(30, Math.max(8, need * 2)), KC.seen) : [];
    if (!KC) return;
    if (!list.length) return kcFinish();
    KC.round++; KC.cur = list; KC.mark = new Set(); list.forEach(e => KC.seen.push(e.w));
    kcDraw();
  }
  function kcDraw() {
    const ov = $('kcOv'); if (!ov || !KC) return;
    const left = KC.want - KC.unknown.length;
    ov.innerHTML = `<div class="mc-top"><span></span><button class="ob-skip" data-kc="close">닫기</button></div>
      <div class="ob-body mc-body"><h2>이미 아는 단어를 눌러 주세요</h2>
      <p>아는 단어는 빼고, 모르는 단어 ${left}개로 오늘 공부를 만들어요.${KC.round > 1 ? ' (한 번 더 골라요)' : ''}</p>
      <div class="kc-grid">${KC.cur.map((e, i) => `<button class="kc-w${KC.mark.has(i) ? ' on' : ''}" data-kc="t" data-i="${i}" aria-pressed="${KC.mark.has(i)}"><b>${esc(e.w)}</b><small>${KC.mark.has(i) ? '알아요' : esc(e.m)}</small></button>`).join('')}</div>
      <p class="kc-tip">뜻까지 정확히 아는 단어만 눌러 주세요. 아는 단어도 2주 뒤에 한 번 확인해요.</p></div>
      <div class="ob-foot"><button class="btn btn-primary btn-block" data-kc="ok">${KC.mark.size ? `아는 단어 ${KC.mark.size}개 빼고 시작` : '모두 처음 봐요, 시작'}</button>
      <button class="btn btn-soft btn-block" data-kc="all" style="margin-top:8px;">다 아는 단어예요, 다른 단어 보기</button></div>`;
  }
  async function kcNext(allKnown) {
    if (!KC) return;
    KC.cur.forEach((e, i) => { if (allKnown || KC.mark.has(i)) KC.known.push(e); else if (KC.unknown.length < KC.want) KC.unknown.push(e); });
    if (KC.unknown.length < KC.want) return kcRound();
    kcFinish();
  }
  async function kcFinish() {
    const st = KC; KC = null; const ov = $('kcOv'); if (ov) ov.remove();
    if (!st) return;
    const c = config.course; if (!c) return;
    const cat = mcEnsureCat();
    if (st.known.length) { const kw = st.known.map(e => mcWord(e, 4)); cat.words.push(...kw); autoFill(kw); }
    c.knownN = (c.knownN || 0) + st.known.length;
    if (!st.unknown.length) { syncStorage(); if (curTab === 'tabHome') renderHome(); return toast('이 코스의 새 단어를 다 알고 있어요. 수준을 올리거나 다른 목적으로 바꿔 보세요.'); }
    await mcToday(st.unknown);
    if (st.known.length) toast(`아는 단어 ${st.known.length}개는 빼고, 새 단어 ${st.unknown.length}개로 시작해요.`);
    ACTIONS['mc-go']();
  }
  document.addEventListener('click', e => {
    const b = e.target.closest && e.target.closest('#kcOv [data-kc]'); if (!b || !KC) return;
    const a = b.dataset.kc;
    if (a === 'close') { KC = null; const ov = $('kcOv'); if (ov) ov.remove(); return; }
    if (a === 't') { const i = +b.dataset.i; KC.mark.has(i) ? KC.mark.delete(i) : KC.mark.add(i); return kcDraw(); }
    if (a === 'ok') return kcNext(false);
    if (a === 'all') return kcNext(true);
  });
  // 학습을 끝내면 다음 단계로. finishSession 에서 불러요.
  function mcAdvance() {
    const c = config.course; if (!c || S.course == null || c.last !== dayKey()) return null;
    const steps = mcSteps(c.goal);
    if ((c.step || 0) === S.course) { c.step = S.course + 1; syncStorage(); }
    return { next: c.step < steps.length ? c.step : null, name: c.step < steps.length ? mcStepName(steps[c.step]) : '' };
  }
  ACTIONS['mc-next'] = async () => { try { await exitSession(true); } catch (e) {} ACTIONS['mc-go'](); };

  /* ----- 맞춤 코스 만들기 화면 ----- */
  let MC = null;
  function mcOpen() {
    if ($('mcOv')) return;
    const c = config.course || {};
    MC = { goal: c.goal || '', lv: c.lv != null ? c.lv : mcLevel(), daily: c.daily || 10, step: 0, check: c.check !== false };
    const ov = document.createElement('div'); ov.className = 'ob mc-ov'; ov.id = 'mcOv'; document.body.appendChild(ov);
    mcDraw();
  }
  ACTIONS['mc-open'] = () => mcOpen();
  function mcBar() { return `<div class="lt-bar"><i style="width:${Math.round((MC.step + 1) / 3 * 100)}%"></i></div>`; }
  function mcDraw() {
    const ov = $('mcOv'); if (!ov || !MC) return;
    let body = '', foot = '';
    if (MC.step === 0) {
      body = `<h2>영어를 왜 공부하나요?</h2><p>목적에 맞는 단어와 학습 방법을 골라 드려요.</p>
        <div class="mc-grid">${Object.entries(MC_GOALS).map(([k, g]) => `<button class="mc-opt${MC.goal === k ? ' on' : ''}" data-mc="goal" data-v="${k}"><span class="mg-ico ${g.c}">${IC[g.ico]}</span><b>${esc(g.name)}</b><small>${esc(g.desc)}</small></button>`).join('')}</div>`;
      foot = `<button class="btn btn-primary btn-block" data-mc="next"${MC.goal ? '' : ' disabled'}>다음</button>`;
    } else if (MC.step === 1) {
      const saved = mcLevel();
      body = `<h2>지금 내 영어 수준은?</h2><p>${saved != null ? `레벨 테스트 결과는 <b>${esc(LT_LV[saved].name)}</b>이에요.` : '모르면 12문제 레벨 테스트로 알아봐요 (2분).'}</p>
        <button class="btn btn-soft btn-block mc-lt" data-mc="lt">${saved != null ? '레벨 테스트 다시 하기' : '레벨 테스트로 알아보기'}</button>
        <div class="mc-lv">${LT_LV.map((l, i) => `<button class="mc-opt row${MC.lv === i ? ' on' : ''}" data-mc="lv" data-v="${i}"><b>${esc(l.name)}</b><small>${esc(l.desc)}</small></button>`).join('')}</div>`;
      foot = `<button class="btn btn-primary btn-block" data-mc="next"${MC.lv != null ? '' : ' disabled'}>다음</button>`;
    } else {
      const g = MC_GOALS[MC.goal];
      body = `<h2>하루에 몇 분 공부할까요?</h2><p>시간에 맞춰 새 단어를 담고, ${esc(mcSteps(MC.goal).map(mcStepName).join(' → '))} 순서로 익혀요.</p>
        <div class="mc-lv">${MC_DAILY.map(([n, l]) => `<button class="mc-opt row${MC.daily === n ? ' on' : ''}" data-mc="daily" data-v="${n}"><b>하루 ${n}분 · 새 단어 약 ${n}개</b><small>${l}</small></button>`).join('')}</div>
        <label class="switch-row mc-chk"><input type="checkbox" data-mc="check" ${MC.check !== false ? 'checked' : ''}><span><b>매일 아는 단어 체크</b><small>시작 전에 이미 아는 단어를 눌러 빼요</small></span></label>
        <div class="card mc-sum"><b>${esc(g.name)} · ${esc(LT_LV[MC.lv].name)}</b><small>복습은 잊어버리기 직전에 홈의 '오늘의 복습'으로 자동으로 다시 나와요.</small></div>`;
      foot = `<button class="btn btn-primary btn-block" data-mc="done">맞춤 코스 시작하기</button>`;
    }
    ov.innerHTML = `<div class="mc-top">${MC.step ? '<button class="ob-skip mc-back" data-mc="back">← 이전</button>' : ''}<button class="ob-skip" data-mc="close">닫기</button></div>${mcBar()}
      <div class="ob-body mc-body">${body}</div><div class="ob-foot">${foot}</div>`;
  }
  function mcSave() {
    const old = config.course || {}, same = old.goal === MC.goal && old.lv === MC.lv;
    config.course = { goal: MC.goal, lv: MC.lv, daily: MC.daily, catId: same ? old.catId : null, day: same ? old.day || 0 : 0, last: same ? old.last : '', ids: same ? old.ids || [] : [], step: same ? old.step || 0 : 0, check: MC.check !== false, knownN: same ? old.knownN || 0 : 0 };
    if (!same && old.last === dayKey()) config.course.last = '';
    config.goal = Math.max(config.goal || 0, MC.daily);
    syncStorage();
    const ov = $('mcOv'); if (ov) ov.remove(); MC = null;
    if (curTab === 'tabHome') renderHome();
    ACTIONS['mc-go']();
  }
  document.addEventListener('click', e => {
    const b = e.target.closest && e.target.closest('#mcOv [data-mc]'); if (!b || !MC || b.disabled) return;
    const a = b.dataset.mc;
    if (a === 'close') { const ov = $('mcOv'); if (ov) ov.remove(); MC = null; return; }
    if (a === 'goal') MC.goal = b.dataset.v;
    else if (a === 'lv') MC.lv = +b.dataset.v;
    else if (a === 'daily') MC.daily = +b.dataset.v;
    else if (a === 'check') { MC.check = b.checked; return; }
    else if (a === 'next') MC.step = Math.min(2, MC.step + 1);
    else if (a === 'back') MC.step = Math.max(0, MC.step - 1);
    else if (a === 'done') return mcSave();
    else if (a === 'lt') { const ov = $('mcOv'); if (ov) ov.remove(); mcAfterLt = { ...MC }; MC = null; ltOpen(false); setTimeout(() => { const o = $('ltOv'); if (o) ltDraw(); }, 0); return; }
    mcDraw();
  });
  // 레벨 테스트를 코스 화면에서 열었으면 결과로 수준을 정하고 코스 화면으로 돌아와요
  let mcAfterLt = null;
  function mcFromLt(r) {
    const st = mcAfterLt || { goal: '', daily: 10 }; mcAfterLt = null;
    const ov0 = $('ltOv'); if (ov0) ov0.remove(); LT = null;
    MC = { goal: st.goal, lv: r, daily: st.daily || 10, step: st.goal ? 2 : 0 };
    const ov = document.createElement('div'); ov.className = 'ob mc-ov'; ov.id = 'mcOv'; document.body.appendChild(ov); mcDraw();
  }
  ACTIONS['level-test'] = () => ltOpen(false);
  function ltEntryHtml() {
    let s = null; try { s = JSON.parse(LS.getItem(ltKey()) || 'null'); } catch (e) {}
    const t = s && LT_LV[s.lv] ? '내 수준: ' + LT_LV[s.lv].name + ' · 다시 테스트' : `내 ${LN()} 수준 알아보기`;
    const sub = s ? '실력이 늘었다면 다시 측정해 보세요' : '12문제로 하루 목표와 시작 단어를 추천받아요';
    return `<button class="mg-entry" data-act="level-test"><span class="mg-ico i-coral">${IC.sprout}</span><span class="mg-txt"><b>${esc(t)}</b><small>${sub}</small></span><span class="mg-chev"></span></button>`;
  }

