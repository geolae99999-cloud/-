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
        dictFill(cat.words).then(n => { if (n) syncStorage(); }).catch(() => {});
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
  const MC_DAILY = [[5, '2분', '가볍게'], [10, '5분', '꾸준히'], [20, '10분', '보통'], [30, '15분', '열심히']];
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
  // 오늘 배울 새 단어를 코스 단어장에 담아요(하루에 한 번)
  async function mcToday() {
    const c = config.course; if (!c || isZh()) return null;
    if (c.last === dayKey() && Array.isArray(c.ids) && c.ids.length) return c;
    const packs = mcPacks(c.goal, c.lv);
    if (packs.some(k => k.startsWith('es-'))) { try { await esLoad(); } catch (e) {} }
    let cat = mcCat();
    if (!cat) { cat = { id: 'c' + uid(), name: `맞춤 코스 · ${MC_GOALS[c.goal].name}`, words: [] }; categories.unshift(cat); c.catId = cat.id; }
    const own = ownedWords(), pick = [];
    for (const k of packs) {
      let list = gradeWords(k, true);
      if (k === packs[0] && (k === 'life' || k === 'toeic') && c.lv >= 2) list = list.slice(Math.floor(list.length * 0.15 * (c.lv - 1)));
      for (const e of list) {
        if (pick.length >= c.daily) break;
        const lw = String(e.w || '').toLowerCase(); if (!lw || own.has(lw)) continue;
        own.add(lw); pick.push(e);
      }
      if (pick.length >= c.daily) break;
    }
    const words = pick.map(e => sanitizeWord({ id: uid(), word: e.w, meaning: e.m, example: e.ex || '', exampleKo: e.exKo || '' }));
    cat.words.unshift(...words);
    c.ids = words.map(w => w.id); c.day = (c.day || 0) + 1; c.last = dayKey(); c.step = 0;
    syncStorage();
    dictFill(words).then(n => { if (n) syncStorage(); }).catch(() => {});
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
      <div class="mc-head"><span class="mg-ico ${g.c}">${IC[g.ico]}</span><div class="mc-t"><small>맞춤 코스 · ${esc(LT_LV[c.lv].name)} · 하루 ${c.daily}개</small><b>${esc(g.name)} · Day ${today ? c.day : (c.day || 0) + 1}</b></div><button class="link-btn" data-act="mc-open">바꾸기</button></div>
      <ol class="mc-steps">${steps.map((m, i) => `<li class="${i < step || done ? 'done' : i === step ? 'now' : ''}"><i>${i < step || done ? IC.tick : i + 1}</i><span>${esc(mcStepName(m))}</span></li>`).join('')}</ol>
      ${done ? '<div class="mc-done">오늘 맞춤 학습을 다 했어요. 내일 새 단어가 열려요.</div>' : `<button class="btn btn-primary btn-block" data-act="mc-go">${step ? `${step + 1}단계 이어서 하기` : `오늘의 새 단어 ${n}개 시작`}</button>`}
    </section></div>`;
  }
  ACTIONS['mc-go'] = async () => {
    const c = await mcToday(); if (!c) return;
    const steps = mcSteps(c.goal), step = c.step || 0, items = mcItems();
    if (!items.length) { toast('오늘 배울 새 단어가 없어요. 이 코스의 단어를 다 담았어요. 다른 목적이나 수준으로 바꿔 보세요.'); return; }
    if (step >= steps.length) return;
    const cat = mcCat();
    startSession(steps[step], { type: 'cat', id: cat.id }, 0, items);
    if (S && S.active) S.course = step;
  };
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
    MC = { goal: c.goal || '', lv: c.lv != null ? c.lv : mcLevel(), daily: c.daily || 10, step: 0 };
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
      body = `<h2>하루에 얼마나 할까요?</h2><p>매일 새 단어를 이만큼 담고, ${esc(mcSteps(MC.goal).map(mcStepName).join(' → '))} 순서로 익혀요.</p>
        <div class="mc-lv">${MC_DAILY.map(([n, t, l]) => `<button class="mc-opt row${MC.daily === n ? ' on' : ''}" data-mc="daily" data-v="${n}"><b>하루 ${n}개 · 약 ${t}</b><small>${l}</small></button>`).join('')}</div>
        <div class="card mc-sum"><b>${esc(g.name)} · ${esc(LT_LV[MC.lv].name)}</b><small>복습은 잊어버리기 직전에 홈의 '오늘의 복습'으로 자동으로 다시 나와요.</small></div>`;
      foot = `<button class="btn btn-primary btn-block" data-mc="done">맞춤 코스 시작하기</button>`;
    }
    ov.innerHTML = `<div class="mc-top">${MC.step ? '<button class="ob-skip mc-back" data-mc="back">← 이전</button>' : ''}<button class="ob-skip" data-mc="close">닫기</button></div>${mcBar()}
      <div class="ob-body mc-body">${body}</div><div class="ob-foot">${foot}</div>`;
  }
  function mcSave() {
    const old = config.course || {}, same = old.goal === MC.goal && old.lv === MC.lv;
    config.course = { goal: MC.goal, lv: MC.lv, daily: MC.daily, catId: same ? old.catId : null, day: same ? old.day || 0 : 0, last: same ? old.last : '', ids: same ? old.ids || [] : [], step: same ? old.step || 0 : 0 };
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
    const pool = allWords().map(x => rev ? x.w.word : x.w.meaning).concat(ltBank().flat().map(x => rev ? x[0] : x[1]));
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
      body = `<div class="fl-card"><button class="q-speak" data-act="speak" data-text="${esc(w.word)}" aria-label="발음 듣기">${IC.speaker}</button><div class="fl-word">${esc(w.word)}</div><div class="q-pron">${esc(pronText(w))}</div><div class="fl-mean">${esc(w.meaning)}</div>${w.example ? `<div class="fl-ex">${esc(w.example)}${exPyHtml(w)}${w.exampleKo ? `<span class="ex-ko">${esc(w.exampleKo)}</span>` : ''}</div>` : ''}</div>`;
      foot = `<button class="btn btn-primary btn-block" data-fl="next">${FL.i === FL.items.length - 1 ? '뜻 고르기로' : '다음'}</button>`;
      setTimeout(() => { try { playAudio(w.word); } catch (e) {} }, 150);
    } else if (st === 1 || st === 3) {
      const rev = st === 3, opts = flOpts(w, rev);
      body = `<div class="ob-body lt-q"><div class="muted" style="font-weight:700;margin-bottom:8px;">${rev ? `알맞은 ${LN()} 단어는?` : '이 단어의 뜻은?'}</div><h2 style="font-size:2rem;">${esc(rev ? w.meaning : w.word)}</h2><div class="opts" style="width:100%;margin-top:22px;">${opts.map((o, k) => `<button class="opt" data-fl="opt" data-v="${esc(o)}"><span class="opt-n">${k + 1}</span><span>${esc(o)}</span></button>`).join('')}</div></div>`;
      foot = `<button class="btn btn-soft btn-block" data-fl="opt" data-v="">잘 모르겠어요</button>`;
    } else {
      body = `<div class="ob-body lt-q"><div class="muted" style="font-weight:700;margin-bottom:8px;">뜻에 맞는 단어를 써 보세요</div><h2 style="font-size:2rem;">${esc(w.meaning)}</h2><div class="muted" style="margin:6px 0 18px;letter-spacing:.2em;">${isHanWord(w.word) ? `${'□'.repeat(w.word.length)}` : `${esc(w.word.charAt(0))}${'_'.repeat(Math.max(0, Math.min(w.word.length - 1, 24)))}`}</div><input type="text" id="flIn" class="fl-in" autocomplete="off" autocapitalize="none" spellcheck="false" placeholder="${isHanWord(w.word) ? '병음(예: xuexi) 또는 한자' : '영어 단어'}"><div id="flFb" class="fl-fb"></div></div>`;
      foot = `<button class="btn btn-primary btn-block" id="flGo" data-fl="type">확인</button>`;
      setTimeout(() => { const i = $('flIn'); if (i) i.focus(); }, 80);
    }
    ov.innerHTML = head + (st === 0 ? `<div class="ob-body">${body}</div>` : body) + `<div class="ob-foot">${foot}</div>`;
  }
  function flAdvance(ms) { const fl = FL; setTimeout(() => { if (FL === fl && fl) { FL.i++; flDraw(); } }, ms); }
  function flAnswer(v) {
    if (!FL || FL.locked) return; FL.locked = true;
    const it = FL.items[FL.i], w = it.w, rev = FL.step === 3, ans = rev ? w.word : w.meaning, ok = v === ans;
    if (FL.step === 3) FL.res[w.id] = ok; if (!ok) FL.miss[w.id] = true;
    $('flOv').querySelectorAll('.opt').forEach(b => { if (b.dataset.v === ans) b.classList.add('correct'); else if (b.dataset.v === v) b.classList.add('wrong'); });
    haptic(ok); flAdvance(ok ? 450 : 1000);
  }
  function flType() {
    if (!FL) return; const it = FL.items[FL.i], w = it.w, inp = $('flIn'), fb = $('flFb'), btn = $('flGo'); if (!inp) return;
    if (FL.locked) { FL.i++; return flDraw(); }
    const v = inp.value.trim().toLowerCase(); if (!v) return toast('단어를 입력해 주세요.');
    const ok = answerOk(v, w); if (!ok) FL.miss[w.id] = true;
    FL.locked = true; inp.disabled = true; haptic(ok);
    fb.innerHTML = ok ? `<b style="color:var(--blue)">정답이에요!${w.phonetic && isHanWord(w.word) ? ` ${esc(w.word)} ${esc(w.phonetic)}` : ''}</b>` : `<b style="color:var(--coral)">정답: ${esc(w.word)}${w.phonetic && isHanWord(w.word) ? ` (${esc(w.phonetic)})` : ''}</b>`;
    btn.textContent = '다음';
  }
  function flResult() {
    const ov = $('flOv'); if (!ov) return;
    let good = 0; const wrongs = [];
    FL.items.forEach(it => { const ok = !!FL.res[it.w.id]; grade(it.w, ok); recordStat(ok); if (ok) good++; else wrongs.push(it); });
    syncStorage(); FL.wrongs = wrongs;
    try { go(curTab); } catch (e) {}
    ov.innerHTML = `<div class="ob-body"><div class="ob-art">${MASCOT(wrongs.length ? 'happy' : 'cheer')}</div><div class="muted" style="font-weight:700;">마무리 시험 결과</div><h2 style="font-size:2.4rem;">${good} / ${FL.items.length}</h2><p>${wrongs.length ? '틀린 단어는 내일 다시 복습해요.' : '모두 맞혔어요. 대단해요!'}</p>${wrongs.length ? `<div class="card" style="width:100%;margin-top:18px;text-align:left;">${wrongs.map(it => `<div class="wrong-item"><b>${esc(it.w.word)}</b><span>${esc(it.w.meaning)}</span></div>`).join('')}</div>` : ''}</div><div class="ob-foot">${wrongs.length ? '<button class="btn btn-primary btn-block" data-fl="again">틀린 것만 다시</button><button class="btn btn-soft btn-block" data-fl="close" style="margin-top:8px;">마치기</button>' : '<button class="btn btn-primary btn-block" data-fl="close">마치기</button>'}</div>`;
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
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Enter' && FL && FL.step === 2 && e.target && e.target.id === 'flIn') { e.preventDefault(); flType(); }
  });
