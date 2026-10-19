  /* =========================================================
   * 학습 세션 엔진
   * ======================================================= */
  let S = { active: false };

  function startSession(mode, src, count, override) {
    if (!MODES[mode]) return;
    const items = override ? override : poolFor(src);
    if (!items.length) return toast(EMPTY_MSG[src.type] || '학습할 단어가 없어요.');
    if (['choice', 'rchoice', 'test', 'cloze', 'lchoice', 'mix'].includes(mode) && allWords().length < 4) return toast(mode === 'test' ? '시험은 전체 단어가 4개 이상 있어야 해요.' : '4지선다는 전체 단어가 4개 이상 있어야 해요.');
    let q = shuffled(items.map(x => ({ w: x.w, catId: x.catId })));
    if (mode === 'scramble') { q = q.filter(x => scrOk(x.w)); if (!q.length) return toast('철자 퍼즐로 풀 수 있는 단어가 없어요.'); }
    if (mode === 'sentence') { q = q.filter(x => senTokens(x.w)); if (!q.length) return toast('예문이 있는 단어가 없어요. 단어에 예문을 넣거나 AI로 채워 주세요.'); }
    if (src.type === 'today') q.sort((a, b) => (a.w.box === 0) - (b.w.box === 0));
    if (mode === 'test') q.forEach((x, i) => { const sp = spellOk(x.w); x.t = ['choice', 'rchoice', sp ? 'spell' : 'choice'][i % 3]; });
    if (mode === 'test') q = shuffled(q);
    if (count > 0) q = q.slice(0, count);
    if (mode === 'mix') mixTypes(q);
    const dpool = poolFor(src).map(x => x.w);
    const gr = pendingGuideRun && pendingGuideRun.mode === mode && pendingGuideRun.key === srcKey(src) ? pendingGuideRun : null;
    pendingGuideRun = null;
    S = { active: true, finished: false, mode, src, count, queue: q, total: q.length, idx: 0, ok: 0, no: 0, wrong: new Map(), locked: false, answered: false, options: [], dpool: dpool.length >= 4 ? dpool : allWords().map(x => x.w), startN: (stats.days[dayKey()] || { n: 0 }).n, t0: Date.now(), log: [], guideRun: gr };
    $('studyScreen').classList.add('open');
    document.body.classList.add('no-scroll');
    kbdHint(mode);
    if (mode === 'listen') startListen(); else renderQuestion();
    setTimeout(() => clPing(true), 0);
  }

  function renderQuestion() {
    if (S.idx >= S.queue.length) return finishSession();
    S.locked = false; S.answered = false;
    $('stProg').style.width = (S.idx / S.queue.length * 100) + '%';
    $('stCount').textContent = `${S.idx + 1}/${S.queue.length}`;
    const item = S.queue[S.idx];
    const md = S.mode === 'test' || S.mode === 'mix' ? (item.t || 'choice') : S.mode;
    if (md === 'card') renderCard(item);
    else if (md === 'choice') renderChoice(item, false);
    else if (md === 'rchoice') renderChoice(item, true);
    else if (md === 'cloze') { if (!renderCloze(item)) renderChoice(item, true); }
    else if (md === 'speak') renderSpeak(item);
    else if (md === 'lchoice') renderLChoice(item);
    else if (md === 'scramble') renderScramble(item);
    else if (md === 'sentence') renderSentence(item);
    else renderTyping(item, md === 'dict');
    if (S.mode === 'test') { const qc = $('stBody').querySelector('.q-card'); if (qc) qc.insertAdjacentHTML('afterbegin', `<div class="exam-no">문제 ${S.idx + 1}</div>`); }
    $('stBody').scrollTop = 0;
  }
  const pronText = w => `${w.phonetic || ''} ${kpronOf(w) && kpronOn() ? `[${kpronOf(w)}]` : ''}`.trim();

  function recordResult(item, ok) {
    const w = item.w;
    grade(w, ok);
    recordStat(ok);
    if (!item.retry) { ok ? S.ok++ : S.no++; }
    answerFx(ok);
    if (!ok) {
      if (!S.wrong.has(w.id)) S.wrong.set(w.id, item);
      if (!item.retry && S.mode !== 'test') S.queue.push({ w, catId: item.catId, retry: true });
    }
    syncStorage(); clPing();
  }
  function nextQuestion() { S.idx++; renderQuestion(); }
  /* 정답/오답 반응: 화면 테두리가 잠깐 빛나고 휴대폰이 짧게 진동해요. 실전 시험에서는 정답을 미리 알려 주지 않도록 꺼요. */
  let fxTimer = 0;
  function answerFx(ok) {
    if (S.mode === 'test') return;
    const b = document.body; b.classList.remove('ans-ok', 'ans-no'); void b.offsetWidth; b.classList.add(ok ? 'ans-ok' : 'ans-no');
    clearTimeout(fxTimer); fxTimer = setTimeout(() => b.classList.remove('ans-ok', 'ans-no'), 600);
    haptic(ok);
  }
  /* 진동 피드백: 정답은 톡(10ms), 오답은 두 번 부르르. 설정에서 끌 수 있고, 진동이 없는 기기에선 아무 일도 안 해요. */
  function haptic(ok) {
    if (config.haptic === false) return;
    try { if (navigator.vibrate) navigator.vibrate(ok ? 10 : [30, 40, 30]); } catch (e) {}
  }

  /* ----- 플래시카드 ----- */
  function renderCard(item) {
    const w = item.w;
    $('stBody').innerHTML = `
      <div class="q-wrap">
        <div class="fc-badges"><span class="fc-b no">모름 ${S.no}</span><span class="fc-b ok">외웠음 ${S.ok}</span></div>
        <div class="swipe-area">
          <div class="swipe-wrap" id="swipeWrap" data-dir="">
            <div class="sw-badge ok">외웠음</div><div class="sw-badge no">모름</div>
            <div class="fc-card-3d" id="fc3d">
              <div class="fc-face">
                <button class="fc-top-sp" data-act="speak" data-text="${esc(w.word)}" aria-label="발음 듣기">${IC.speaker}</button>
                <div class="q-word">${esc(w.word)}</div>
                <div class="q-pron">${esc(pronText(w))}</div>
                <div class="fc-div"></div>
                <div class="fc-hint">카드를 눌러 뜻과 예문 보기</div>
              </div>
              <div class="fc-face fc-back">
                <button class="fc-top-sp" data-act="speak" data-text="${esc(w.word)}" aria-label="발음 듣기">${IC.speaker}</button>
                <div class="q-word" style="font-size:28px;">${esc(w.word)}</div>
                <div class="q-pron">${esc(pronText(w))}</div>
                <div class="fc-div"></div>
                <div class="q-meaning">${esc(w.meaning)}</div>
                ${w.example ? `<div class="fc-ex"><span>${esc(w.example)}</span>${exPyHtml(w)}${w.exampleKo ? `<small>${esc(w.exampleKo)}</small>` : ''}</div>` : ''}
              </div>
            </div>
          </div>
        </div>
        <div class="fc-guide-txt">왼쪽으로 밀면 모름 · 오른쪽으로 밀면 외웠음</div>
        <div class="row q-foot fc-foot-btns">
          <button class="btn btn-bad" data-act="fly" data-dir="-1">모름</button>
          <button class="btn btn-ok" data-act="fly" data-dir="1">외웠음</button>
        </div>
      </div>`;
    bindSwipe();
    playAudio(w.word);
  }
  function bindSwipe() {
    const wrap = $('swipeWrap'); if (!wrap) return;
    let sx = 0, dx = 0, drag = false, moved = false;
    const reset = () => { wrap.style.transition = 'transform .2s'; wrap.style.transform = ''; wrap.dataset.dir = ''; };
    wrap.addEventListener('pointerdown', e => {
      if (S.locked || e.target.closest('[data-act="speak"]')) return;
      drag = true; moved = false; sx = e.clientX; dx = 0;
      wrap.style.transition = 'none';
      try { wrap.setPointerCapture(e.pointerId); } catch (err) {}
    });
    wrap.addEventListener('pointermove', e => {
      if (!drag) return;
      dx = e.clientX - sx;
      if (Math.abs(dx) > 8) moved = true;
      wrap.style.transform = `translateX(${dx}px) rotate(${dx / 22}deg)`;
      wrap.dataset.dir = dx > 45 ? 'ok' : dx < -45 ? 'no' : '';
    });
    wrap.addEventListener('pointerup', () => {
      if (!drag) return;
      drag = false;
      if (!moved) { reset(); $('fc3d').classList.toggle('is-flipped'); return; }
      if (dx > 100) flyCard(1); else if (dx < -100) flyCard(-1); else reset();
    });
    wrap.addEventListener('pointercancel', () => { drag = false; reset(); });
  }
  function flyCard(dir) {
    const wrap = $('swipeWrap');
    if (!wrap || S.locked) return;
    S.locked = true;
    wrap.dataset.dir = dir > 0 ? 'ok' : 'no';
    wrap.style.transition = 'transform .28s ease, opacity .28s';
    wrap.style.transform = `translateX(${dir * 520}px) rotate(${dir * 22}deg)`;
    wrap.style.opacity = '0';
    const my = S.idx;
    setTimeout(() => {
      if (!S.active || S.idx !== my) return;
      recordResult(S.queue[S.idx], dir > 0);
      nextQuestion();
    }, 260);
  }
  ACTIONS.fly = el => flyCard(parseInt(el.dataset.dir, 10));

  /* ----- 4지선다 ----- */
  function makeOptions(cur, field) {
    const val = x => x[field];
    const seen = new Set([val(cur)]);
    const d = [];
    const take = list => {
      for (const w of shuffled(list)) {
        if (d.length === 3) break;
        if (w.id !== cur.id && val(w) && !seen.has(val(w))) { seen.add(val(w)); d.push(w); }
      }
    };
    take(S.dpool);
    if (d.length < 3) take(allWords().map(x => x.w));
    return shuffled([cur, ...d]);
  }
  function renderChoice(item, reverse) {
    const w = item.w;
    S.options = makeOptions(w, reverse ? 'word' : 'meaning');
    const comboHtml = (S.combo || 0) >= 2 ? `<span class="fc-b combo">${IC.flame} 연속 정답 ${S.combo}</span>` : '';
    $('stBody').innerHTML = `
      <div class="q-wrap q-choice-wrap">
        ${S.mode === 'test' ? '' : `<div class="fc-badges"><span class="fc-b no">오답 ${S.no}</span><span class="fc-b ok">정답 ${S.ok}</span>${comboHtml}</div>`}
        <div class="q-card">
          ${reverse
            ? `<div class="q-label">이 뜻의 ${LN()} 단어는?</div><div class="q-meaning">${esc(w.meaning)}</div>`
            : `<div class="q-label">이 단어의 뜻은?</div><div class="q-word">${esc(w.word)}</div><div class="q-pron">${esc(pronText(w))}</div><button class="q-speak" data-act="speak" data-text="${esc(w.word)}" aria-label="발음 듣기">${IC.speaker}</button>`}
        </div>
        <div class="opts">${S.options.map((o, i) => `<button class="opt" data-act="opt" data-i="${i}"><span class="opt-n">${i + 1}</span><span>${esc(reverse ? o.word : o.meaning)}</span></button>`).join('')}</div>
      </div>`;
    if (!reverse) playAudio(w.word);
  }
  const PRAISE = ['정답이에요', '좋아요', '잘했어요', '훌륭해요', '완벽해요'];
  ACTIONS['opt-next'] = () => { if (S.active && S.locked) nextQuestion(); };
  ACTIONS.opt = el => {
    if (S.locked || !S.active) return;
    S.locked = true;
    const item = S.queue[S.idx];
    const chosen = S.options[parseInt(el.dataset.i, 10)];
    const ok = chosen.id === item.w.id;
    if (S.mode === 'test') {
      el.classList.add('picked'); $('stBody').querySelectorAll('.opt').forEach(b => { b.disabled = true; });
      S.log.push({ w: item.w, t: item.t, ok, your: item.t === 'rchoice' ? chosen.word : chosen.meaning });
      recordResult(item, ok); const my = S.idx;
      setTimeout(() => { if (S.active && S.idx === my) nextQuestion(); }, 280);
      return;
    }
    const btns = [...$('stBody').querySelectorAll('.opt')];
    btns.forEach(b => { b.disabled = true; });
    el.classList.add(ok ? 'correct' : 'wrong');
    if (!ok) { const ci = S.options.findIndex(o => o.id === item.w.id); if (btns[ci]) btns[ci].classList.add('correct'); }
    S.combo = ok ? (S.combo || 0) + 1 : 0;
    const omd = S.mode === 'mix' ? item.t : S.mode;
    const ansText = omd === 'rchoice' || omd === 'cloze' ? item.w.word : item.w.meaning;
    const qw = $('stBody').querySelector('.q-wrap');
    if (qw) {
      if (ok) {
        const bar = document.createElement('div');
        bar.className = 'ans-bar ok';
        bar.innerHTML = `<span class="ans-ic">${IC.tick}</span><span class="ans-t"><b>${PRAISE[Math.floor(Math.random() * PRAISE.length)]}</b><span>${esc(item.w.word)} · ${esc(item.w.meaning)}</span></span>${S.combo >= 2 ? `<span class="ans-combo">${IC.flame} 연속 정답 ${S.combo}</span>` : ''}`;
        qw.appendChild(bar);
      } else {
        const msg = document.createElement('div');
        msg.className = 'q-wrong-msg';
        msg.textContent = `아쉬워요! 정답은 '${ansText}'이에요`;
        const foot = document.createElement('div');
        foot.className = 'q-foot';
        foot.innerHTML = '<button class="btn btn-primary btn-block" data-act="opt-next">다음</button>';
        qw.appendChild(msg);
        qw.appendChild(foot);
      }
    }
    if (omd === 'rchoice' || omd === 'cloze') playAudio(item.w.word);
    recordResult(item, ok);
    const my = S.idx;
    if (ok) setTimeout(() => { if (S.active && S.idx === my) nextQuestion(); }, 700);
  };

  /* ----- 듣고 고르기 ----- */
  function renderLChoice(item) {
    const w = item.w;
    S.options = makeOptions(w, 'meaning');
    $('stBody').innerHTML = `
      <div class="q-wrap">
        <div class="q-card">
          <div class="q-label">들리는 단어의 뜻은?</div>
          <button class="q-speak big" data-act="speak" data-text="${esc(w.word)}" aria-label="다시 듣기">${IC.speaker}</button>
          <div class="q-sub">눌러서 다시 들을 수 있어요</div>
        </div>
        <div class="opts">${S.options.map((o, i) => `<button class="opt" data-act="opt" data-i="${i}"><span class="opt-n">${i + 1}</span><span>${esc(o.meaning)}</span></button>`).join('')}</div>
      </div>`;
    playAudio(w.word);
  }

  /* ----- 철자 퍼즐 (글자 조각을 눌러 단어 완성) ----- */
  const scrOk = w => isHanWord(w.word) ? /^[\u3400-\u9fff]{2,8}$/.test(w.word) : /^[a-z][a-z' -]{1,17}$/i.test(w.word) && w.word.replace(/[^a-z]/gi, '').length >= 2;
  // 중국어는 한자 한 글자씩 조각이 돼요.
  const scrCh = (w, c) => isHanWord(w.word) ? HAN.test(c) : /[a-z']/i.test(c);
  function renderScramble(item) {
    const w = item.w, letters = [...w.word].filter(c => scrCh(w, c));
    let order = shuffled(letters.map((c, i) => i)); if (letters.length > 1 && order.every((v, i) => v === i)) order = order.slice(1).concat(order[0]);
    S.scr = { letters, order, picked: [] };
    $('stBody').innerHTML = `
      <div class="q-wrap">
        <div class="q-card">
          <div class="q-label">${isHanWord(w.word) ? '한자를 순서대로 눌러 단어를 완성하세요' : '글자를 순서대로 눌러 단어를 완성하세요'}</div>
          <div class="q-meaning">${esc(w.meaning)}</div>
          <div class="scr-slots" id="scrSlots"></div>
        </div>
        <div class="scr-tiles" id="scrTiles"></div>
        <div id="typeFeedback"></div>
        <div class="row q-foot"><button class="btn btn-soft" data-act="scr-back">한 글자 지우기</button><button class="btn btn-soft" data-act="scr-skip">모르겠어요</button></div>
      </div>`;
    scrDraw();
  }
  function scrDraw() {
    const s = S.scr, w = S.queue[S.idx].w; let k = 0;
    $('scrSlots').innerHTML = [...w.word].map(c => scrCh(w, c) ? `<span class="${s.picked[k] !== undefined ? 'on' : ''}">${s.picked[k] !== undefined ? esc(s.letters[s.picked[k++]]) : (k++, '')}</span>` : `<i>${c === ' ' ? '&nbsp;' : esc(c)}</i>`).join('');
    $('scrTiles').innerHTML = s.order.map(i => `<button class="scr-t" data-act="scr-pick" data-i="${i}"${s.picked.includes(i) ? ' disabled' : ''}>${esc(s.letters[i].toLowerCase())}</button>`).join('');
  }
  ACTIONS['scr-pick'] = el => {
    if (!S.active || S.locked || !S.scr) return;
    const s = S.scr, i = +el.dataset.i; if (s.picked.includes(i)) return;
    s.picked.push(i); scrDraw();
    if (s.picked.length === s.letters.length) {
      const got = s.picked.map(j => s.letters[j]).join('').toLowerCase(), want = s.letters.join('').toLowerCase();
      scrDone(got === want);
    }
  };
  ACTIONS['scr-back'] = () => { if (!S.active || S.locked || !S.scr) return; S.scr.picked.pop(); scrDraw(); };
  ACTIONS['scr-skip'] = () => { if (!S.active || S.locked) return; scrDone(false); };
  function scrDone(ok) {
    S.locked = true; const item = S.queue[S.idx], w = item.w;
    $('stBody').querySelectorAll('.scr-t, .q-foot .btn').forEach(b => { b.disabled = true; });
    $('scrSlots').classList.add(ok ? 'ok' : 'bad');
    $('typeFeedback').innerHTML = ok ? `<div class="fb ok"><span class="ans-ic">${IC.tick}</span><div>정답이에요! <b>${esc(w.word)}</b></div></div>`
      : `<div class="fb bad"><span class="ans-ic">${IC.x}</span><div>정답은 <b>${esc(w.word)}</b> ${esc(w.phonetic || '')}<div class="fb-sub">${esc(w.meaning)}</div></div></div>`;
    playAudio(w.word); recordResult(item, ok);
    const my = S.idx; setTimeout(() => { if (S.active && S.idx === my) nextQuestion(); }, ok ? 900 : 1900);
  }

  /* ----- 오늘의 학습 (복습 + 새 단어를 여러 문제 유형으로) ----- */
  function mixTypes(q) {
    const seq = ['choice', 'lchoice', 'scramble', 'rchoice', 'spell'];
    q.forEach((x, i) => {
      let t = seq[i % seq.length];
      if (t === 'scramble' && !scrOk(x.w)) t = 'rchoice';
      if (t === 'spell' && !spellOk(x.w)) t = 'choice';
      if (x.w.box === 0 && (t === 'spell' || t === 'scramble')) t = i % 2 ? 'scramble' : 'choice';
      if (t === 'scramble' && !scrOk(x.w)) t = 'choice';
      x.t = t;
    });
  }
  function todayHtml() {
    const c = counts(); if (!c.total) return '';
    const n = Math.min(20, c.due + c.newW);
    return `<button class="mg-entry today-entry" data-act="today-go"><span class="mg-ico i-mint">${IC.sparkles}</span><span class="mg-txt"><b>오늘의 학습</b><small>${n ? `복습 ${Math.min(c.due, 20)}개 + 새 단어, 5가지 문제로 ${n}개` : '오늘 할 단어를 다 했어요. 전체에서 20개를 섞어 풀어요'}</small></span><span class="mg-chev"></span></button>`;
  }
  ACTIONS['today-go'] = () => { const c = counts(); startSession('mix', { type: c.due + c.newW ? 'today' : 'all' }, 20); };

  /* ----- 단어 비 (떨어지는 뜻을 보고 단어 고르기) ----- */
  let RN = null;
  const rnBestKey = () => 'vocapro_rain_best:' + currentUser;
  function rnClose() { if (RN) { cancelAnimationFrame(RN.raf); RN = null; } const o = $('rnOv'); if (o) o.remove(); document.body.classList.remove('no-scroll'); }
  function openRain() {
    const ws = allWords().map(x => x.w).filter(w => w.word && w.meaning);
    if (ws.length < 4) return toast('단어가 4개 이상 있어야 해요.');
    rnClose();
    const ov = document.createElement('div'); ov.className = 'mg rn'; ov.id = 'rnOv'; document.body.appendChild(ov); document.body.classList.add('no-scroll');
    const best = +(LS.getItem(rnBestKey()) || 0);
    ov.innerHTML = `<div class="mg-top"><button class="round-btn" data-rn="x" aria-label="닫기">${IC.x}</button><b>단어 비</b><span id="rnScore">0점</span></div>
      <div class="rn-life" id="rnLife"></div>
      <div class="rn-sky" id="rnSky"><div class="rn-drop" id="rnDrop"></div></div>
      <div class="rn-opts" id="rnOpts"></div>
      <div class="rn-intro" id="rnIntro">${MASCOT('happy')}<b>뜻이 바닥에 닿기 전에 맞는 단어를 고르세요</b><small>맞힐수록 빨라져요. 3번 놓치면 끝나요.${best ? ` 최고 기록 ${best}점` : ''}</small><button class="btn btn-primary btn-block" data-rn="go">시작</button></div>`;
    RN = { ws, score: 0, life: 3, n: 0, cur: null, y: 0, raf: 0, last: 0, lock: false, best };
    ov.addEventListener('click', e => {
      const k = e.target.closest('[data-rn]'); if (k) { const a = k.dataset.rn; if (a === 'x') rnClose(); else if (a === 'go') { const i = $('rnIntro'); if (i) i.remove(); rnNext(); } else if (a === 'again') { rnClose(); openRain(); } return; }
      const b = e.target.closest('.rn-opt'); if (b) rnPick(+b.dataset.i);
    });
  }
  function rnNext() {
    const r = RN; if (!r) return;
    r.cur = r.ws[Math.floor(Math.random() * r.ws.length)];
    const d = [], seen = new Set([r.cur.word.toLowerCase()]);
    for (const w of shuffled(r.ws)) { if (d.length === 3) break; if (!seen.has(w.word.toLowerCase())) { seen.add(w.word.toLowerCase()); d.push(w); } }
    r.opts = shuffled([r.cur, ...d]); r.y = 0; r.lock = false; r.last = performance.now();
    r.speed = Math.min(0.42, 0.12 + r.n * 0.012);
    $('rnDrop').textContent = String(r.cur.meaning).split(/[;]/)[0].trim(); $('rnDrop').className = 'rn-drop'; $('rnDrop').style.left = (8 + Math.random() * 44) + '%';
    $('rnOpts').innerHTML = r.opts.map((w, i) => `<button class="rn-opt opt" data-i="${i}"><span class="opt-n">${i + 1}</span><span>${esc(w.word)}</span></button>`).join('');
    $('rnLife').innerHTML = [0, 1, 2].map(i => `<i class="${i < r.life ? 'on' : ''}"></i>`).join('');
    cancelAnimationFrame(r.raf); r.raf = requestAnimationFrame(rnFrame);
  }
  function rnFrame(t) {
    const r = RN; if (!r || r.lock) return;
    const sky = $('rnSky'), drop = $('rnDrop'); if (!sky || !drop) return;
    r.y += (t - r.last) * r.speed / 1000 * 100; r.last = t;
    const max = sky.clientHeight - drop.offsetHeight;
    drop.style.transform = `translateY(${Math.min(max, r.y / 100 * max)}px)`;
    if (r.y >= 100) return rnMiss(-1);
    r.raf = requestAnimationFrame(rnFrame);
  }
  function rnPick(i) {
    const r = RN; if (!r || r.lock || !r.cur) return;
    const ok = r.opts[i] === r.cur, btn = $('rnOpts').children[i];
    if (!ok) return rnMiss(i);
    r.lock = true; cancelAnimationFrame(r.raf); r.n++; r.score += 10 + Math.max(0, Math.round((100 - r.y) / 10));
    btn.classList.add('correct'); $('rnDrop').classList.add('pop'); haptic(true); $('rnScore').textContent = r.score + '점';
    playAudio(r.cur.word); setTimeout(() => RN === r && rnNext(), 450);
  }
  function rnMiss(i) {
    const r = RN; if (!r) return;
    r.lock = true; cancelAnimationFrame(r.raf); r.life--; haptic(false);
    const btns = $('rnOpts').children; if (i >= 0 && btns[i]) btns[i].classList.add('wrong');
    const ci = r.opts.indexOf(r.cur); if (btns[ci]) btns[ci].classList.add('correct');
    $('rnDrop').classList.add('miss'); $('rnLife').innerHTML = [0, 1, 2].map(k => `<i class="${k < r.life ? 'on' : ''}"></i>`).join('');
    setTimeout(() => { if (RN !== r) return; if (r.life > 0) return rnNext(); rnEnd(); }, 1100);
  }
  function rnEnd() {
    const r = RN, ov = $('rnOv'); if (!r || !ov) return;
    const nb = r.score > r.best; if (nb) { try { LS.setItem(rnBestKey(), String(r.score)); } catch (e) {} }
    ov.innerHTML = `<div class="mg-done"><div class="result-art">${MASCOT(nb ? 'cheer' : 'happy')}</div><h2>${nb ? '최고 기록이에요!' : '끝났어요'}</h2><p>${r.score}점 · ${r.n}개 맞힘${r.best && !nb ? ` · 최고 ${r.best}점` : ''}</p><button class="btn btn-primary btn-block" data-rn="again">한 번 더</button><button class="btn btn-soft btn-block" data-rn="x" style="margin-top:8px;">닫기</button></div>`;
    if (nb && r.score > 0) confetti();
  }
  ACTIONS.rain = openRain;
  document.addEventListener('keydown', e => { if (!RN || !$('rnOv')) return; if (/^[1-4]$/.test(e.key)) { e.preventDefault(); e.stopImmediatePropagation(); rnPick(+e.key - 1); } else if (e.key === 'Escape' && !document.querySelector('.dlg-ov')) { e.preventDefault(); e.stopImmediatePropagation(); rnClose(); } }, true);

