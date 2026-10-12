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
    if (src.type === 'today') q.sort((a, b) => (a.w.box === 0) - (b.w.box === 0));
    if (mode === 'test') q.forEach((x, i) => { const sp = /^[a-z][a-z'-]{0,13}$/i.test(x.w.word); x.t = ['choice', 'rchoice', sp ? 'spell' : 'choice'][i % 3]; });
    if (mode === 'test') q = shuffled(q);
    if (count > 0) q = q.slice(0, count);
    if (mode === 'mix') mixTypes(q);
    const dpool = poolFor(src).map(x => x.w);
    S = { active: true, finished: false, mode, src, count, queue: q, total: q.length, idx: 0, ok: 0, no: 0, wrong: new Map(), locked: false, answered: false, options: [], dpool: dpool.length >= 4 ? dpool : allWords().map(x => x.w), startN: (stats.days[dayKey()] || { n: 0 }).n, t0: Date.now(), log: [] };
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
    else renderTyping(item, md === 'dict');
    if (S.mode === 'test') { const qc = $('stBody').querySelector('.q-card'); if (qc) qc.insertAdjacentHTML('afterbegin', `<div class="exam-no">문제 ${S.idx + 1}</div>`); }
    $('stBody').scrollTop = 0;
  }
  const pronText = w => `${w.phonetic} ${w.koreanPron ? `[${w.koreanPron}]` : ''}`.trim();

  function recordResult(item, ok) {
    const w = item.w;
    grade(w, ok);
    recordStat(ok);
    if (!item.retry) { ok ? S.ok++ : S.no++; }
    if (!ok) {
      if (!S.wrong.has(w.id)) S.wrong.set(w.id, item);
      if (!item.retry && S.mode !== 'test') S.queue.push({ w, catId: item.catId, retry: true });
    }
    syncStorage(); clPing();
  }
  function nextQuestion() { S.idx++; renderQuestion(); }

  /* ----- 플래시카드 ----- */
  function renderCard(item) {
    const w = item.w;
    $('stBody').innerHTML = `
      <div class="q-wrap">
        <div class="sw-hint"><span class="no">← 아직 몰라요</span><span class="ok">알아요 →</span></div>
        <div class="swipe-area">
          <div class="swipe-wrap" id="swipeWrap" data-dir="">
            <div class="sw-badge ok">알아요</div><div class="sw-badge no">몰라요</div>
            <div class="fc-card-3d" id="fc3d">
              <div class="fc-face">
                <div class="q-word">${esc(w.word)}</div>
                <div class="q-pron">${esc(pronText(w))}</div>
                <button class="q-speak" data-act="speak" data-text="${esc(w.word)}" aria-label="발음 듣기">${IC.speaker}</button>
                <div class="fc-hint">카드를 눌러 뜻 보기</div>
              </div>
              <div class="fc-face fc-back">
                <div class="q-meaning">${esc(w.meaning)}</div>
                ${w.example ? `<div class="fc-ex"><span>${esc(w.example)}</span>${w.exampleKo ? `<small>${esc(w.exampleKo)}</small>` : ''}</div>` : ''}
                <div class="fc-hint">${w.box >= 1 ? esc(dueText(w)) : '새 단어'}</div>
              </div>
            </div>
          </div>
        </div>
        <div class="row q-foot">
          <button class="btn btn-bad" data-act="fly" data-dir="-1">아직 몰라요</button>
          <button class="btn btn-ok" data-act="fly" data-dir="1">알아요</button>
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
    $('stBody').innerHTML = `
      <div class="q-wrap">
        <div class="q-card">
          ${reverse
            ? `<div class="q-label">이 뜻의 영어 단어는?</div><div class="q-meaning">${esc(w.meaning)}</div>`
            : `<div class="q-label">이 단어의 뜻은?</div><div class="q-word">${esc(w.word)}</div><div class="q-pron">${esc(pronText(w))}</div><button class="q-speak" data-act="speak" data-text="${esc(w.word)}" aria-label="발음 듣기">${IC.speaker}</button>`}
        </div>
        <div class="opts">${S.options.map((o, i) => `<button class="opt" data-act="opt" data-i="${i}"><span class="opt-n">${i + 1}</span><span>${esc(reverse ? o.word : o.meaning)}</span></button>`).join('')}</div>
      </div>`;
    if (!reverse) playAudio(w.word);
  }
  const PRAISE = ['정답이에요', '좋아요', '잘했어요', '훌륭해요', '완벽해요'];
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
    const qw = $('stBody').querySelector('.q-wrap');
    if (qw) {
      const bar = document.createElement('div');
      bar.className = 'ans-bar ' + (ok ? 'ok' : 'bad');
      bar.innerHTML = `<span class="ans-ic">${ok ? IC.tick : IC.x}</span><span class="ans-t"><b>${ok ? PRAISE[Math.floor(Math.random() * PRAISE.length)] : '정답은 이거예요'}</b><span>${esc(item.w.word)} · ${esc(item.w.meaning)}</span></span>${ok && S.combo >= 3 ? `<span class="ans-combo">${S.combo}연속 정답</span>` : ''}`;
      qw.appendChild(bar);
    }
    const omd = S.mode === 'mix' ? item.t : S.mode;
    if (omd === 'rchoice' || omd === 'cloze') playAudio(item.w.word);
    recordResult(item, ok);
    const my = S.idx;
    setTimeout(() => { if (S.active && S.idx === my) nextQuestion(); }, ok ? 700 : 1600);
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
  const scrOk = w => /^[a-z][a-z' -]{1,17}$/i.test(w.word) && w.word.replace(/[^a-z]/gi, '').length >= 2;
  function renderScramble(item) {
    const w = item.w, letters = w.word.split('').filter(c => /[a-z']/i.test(c));
    let order = shuffled(letters.map((c, i) => i)); if (letters.length > 1 && order.every((v, i) => v === i)) order = order.slice(1).concat(order[0]);
    S.scr = { letters, order, picked: [] };
    $('stBody').innerHTML = `
      <div class="q-wrap">
        <div class="q-card">
          <div class="q-label">글자를 순서대로 눌러 단어를 완성하세요</div>
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
    $('scrSlots').innerHTML = w.word.split('').map(c => /[a-z']/i.test(c) ? `<span class="${s.picked[k] !== undefined ? 'on' : ''}">${s.picked[k] !== undefined ? esc(s.letters[s.picked[k++]]) : (k++, '')}</span>` : `<i>${c === ' ' ? '&nbsp;' : esc(c)}</i>`).join('');
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
      if (t === 'spell' && !/^[a-z][a-z'-]{0,13}$/i.test(x.w.word)) t = 'choice';
      if (x.w.box === 0 && (t === 'spell' || t === 'scramble')) t = i % 2 ? 'scramble' : 'choice';
      if (t === 'scramble' && !scrOk(x.w)) t = 'choice';
      x.t = t;
    });
  }
  function todayHtml() {
    const c = counts(); if (!c.total) return '';
    const n = Math.min(20, c.due + c.newW);
    return `<button class="mg-entry today-entry" data-act="today-go"><span class="mg-ico i-mint">${IC.sparkle}</span><span class="mg-txt"><b>오늘의 학습</b><small>${n ? `복습 ${Math.min(c.due, 20)}개 + 새 단어, 5가지 문제로 ${n}개` : '오늘 할 단어를 다 했어요. 전체에서 20개를 섞어 풀어요'}</small></span><span class="mg-chev"></span></button>`;
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
    btn.classList.add('correct'); $('rnDrop').classList.add('pop'); $('rnScore').textContent = r.score + '점';
    speak(r.cur.word, 'en-US'); setTimeout(() => RN === r && rnNext(), 450);
  }
  function rnMiss(i) {
    const r = RN; if (!r) return;
    r.lock = true; cancelAnimationFrame(r.raf); r.life--;
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

  /* ----- 문장 빈칸 ----- */
  const reEsc = x => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  function clozeOf(w) {
    const ex = String(w.example || ''), wd = String(w.word || '').trim(); if (!ex || !wd) return null;
    let m = ex.match(new RegExp(`\\b${reEsc(wd)}[a-z]*\\b`, 'i'));
    if (!m && wd.length >= 4 && !wd.includes(' ')) m = ex.match(new RegExp(`\\b${reEsc(wd.slice(0, Math.max(3, wd.length - 2)))}[a-z]*\\b`, 'i'));
    if (!m) return null;
    return { before: ex.slice(0, m.index), hit: m[0], after: ex.slice(m.index + m[0].length) };
  }
  function renderCloze(item) {
    const w = item.w, c = clozeOf(w); if (!c) return false;
    S.options = makeOptions(w, 'word');
    $('stBody').innerHTML = `
      <div class="q-wrap">
        <div class="q-card">
          <div class="q-label">빈칸에 들어갈 단어는?</div>
          <div class="cloze-s">${esc(c.before)}<span class="cloze-b">${'_'.repeat(Math.min(10, Math.max(4, c.hit.length)))}</span>${esc(c.after)}</div>
          ${w.exampleKo ? `<div class="q-sub">${esc(w.exampleKo)}</div>` : ''}
        </div>
        <div class="opts">${S.options.map((o, i) => `<button class="opt" data-act="opt" data-i="${i}"><span class="opt-n">${i + 1}</span><span>${esc(o.word)}</span></button>`).join('')}</div>
      </div>`;
    return true;
  }

  /* ----- 말하기 ----- */
  let SPK = null;
  const spkNorm = x => String(x || '').toLowerCase().replace(/[-_/]+/g, ' ').replace(/[^a-z' ]/g, '').replace(/\s+/g, ' ').trim();
  const SPK_NUM = { 0: 'zero', 1: 'one', 2: 'two', 3: 'three', 4: 'four', 5: 'five', 6: 'six', 7: 'seven', 8: 'eight', 9: 'nine', 10: 'ten', 11: 'eleven', 12: 'twelve', 20: 'twenty', 100: 'hundred' };
  const spkWords = x => String(x || '').toLowerCase().replace(/\d+/g, d => SPK_NUM[d] ? ' ' + SPK_NUM[d] + ' ' : d);
  // 소리가 같은 단어(right/write, see/sea 등)는 맞은 것으로 봐요.
  const SPK_HOMO = (() => { const m = {}; 'right write rite|see sea|know no|knew new|two to too|four for fore|eight ate|one won|son sun|hear here|there their theyre|by buy bye|meet meat|weak week|wait weight|mail male|tail tale|flower flour|pair pear pare|peace piece|plain plane|road rode rowed|sail sale|sell cell|sent cent scent|steal steel|wear where ware|which witch|whole hole|hour our|i eye|blue blew|break brake|dear deer|die dye|fair fare|hair hare|heal heel|made maid|night knight|not knot|red read|sew so sow|some sum|stair stare|wood would|your youre|be bee|allowed aloud|bare bear|berry bury|board bored|cereal serial|course coarse|flew flu flue|grown groan|guessed guest|higher hire|knows nose|lead led|loan lone|pail pale|pause paws|poor pour pore|principal principle|rain reign rein|real reel|ring wring|role roll|root route|scene seen|sight site cite|soul sole|tea tee|threw through|toe tow|waist waste|way weigh|weather whether|wine whine|ant aunt|ball bawl|band banned|bored board|brows browse|ceiling sealing|chews choose|days daze|due dew do|feet feat|find fined|hi high|him hymn|in inn|jeans genes|kernel colonel|mist missed|morning mourning|oh owe|pain pane|past passed|patience patients|prey pray|rap wrap|rays raise|sees seas seize|shoe shoo|stationary stationery|suite sweet|tied tide|vain vein|wade weighed|wee we|yolk yoke'.split('|').forEach(g => { const a = g.split(' ').map(x => x.replace(/'/g, '')); a.forEach(x => { m[x] = a; }); }); return m; })();
  const spkSame = (a, b) => { const x = a.replace(/'/g, ''), y = b.replace(/'/g, ''); return x === y || !!(SPK_HOMO[x] && SPK_HOMO[x].includes(y)); };
  function spkDist(a, b) {
    if (Math.abs(a.length - b.length) > 2) return 9;
    let p = Array.from({ length: b.length + 1 }, (_, i) => i);
    for (let i = 1; i <= a.length; i++) { const c = [i]; for (let j = 1; j <= b.length; j++) c[j] = Math.min(p[j] + 1, c[j - 1] + 1, p[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); p = c; }
    return p[b.length];
  }
  function spkMatch(heard, target) {
    const h = spkNorm(spkWords(heard)), t = spkNorm(target);
    if (!h || !t) return false;
    const hs = h.replace(/ /g, ''), ts = t.replace(/ /g, '');
    if (hs === ts || h.split(' ').includes(t) || (t.includes(' ') && h.includes(t))) return true;
    const parts = t.includes(' ') ? [h] : h.split(' ').concat(h);
    return parts.some(p => { const ps = p.replace(/ /g, ''); if (!ps) return false; if (spkSame(ps, ts)) return true; return ts.length >= 5 && spkDist(ps, ts) <= (ts.length >= 9 ? 2 : 1); });
  }
  const SPK_FATAL = { 'not-allowed': '마이크 사용이 막혀 있어요. 주소창의 자물쇠를 눌러 마이크를 허용해 주세요.', 'service-not-allowed': '이 브라우저는 음성 인식을 막아 두었어요.', network: '음성 인식 서버에 연결하지 못했어요.', 'audio-capture': '마이크를 찾지 못했어요.', 'language-not-supported': '이 기기는 영어 음성 인식을 지원하지 않아요.' };
  let spkSelf = false;
  function renderSpeak(item) {
    const w = item.w; S.tries = 0;
    const self = spkSelf || !SR;
    $('stBody').innerHTML = `
      <div class="q-wrap">
        <div class="q-card">
          <div class="q-label">단어를 소리 내어 말해 보세요</div>
          <div class="q-word">${esc(w.word)}</div>
          <div class="q-pron">${esc(pronText(w))}</div>
          <div class="q-sub">${esc(w.meaning)}</div>
          <button class="q-speak" data-act="speak" data-text="${esc(w.word)}" aria-label="먼저 듣기">${IC.speaker}</button>
        </div>
        ${self ? `<div class="spk-out">발음을 듣고 따라 말한 뒤 스스로 표시해 주세요.${S.spkWhy ? `<br><small>${esc(S.spkWhy)}</small>` : ''}</div>
          <div class="row q-foot"><button class="btn btn-soft" data-act="spk-self" data-ok="0">다시 연습할게요</button><button class="btn btn-primary" data-act="spk-self" data-ok="1">잘 말했어요</button></div>`
        : `<button class="mic-btn" id="micBtn" data-act="spk-go" aria-label="말하기 시작">${IC.mic}</button>
        <div class="spk-out" id="spkOut">버튼을 누르고 또박또박 말해 주세요</div>
        <div class="row q-foot"><button class="btn btn-soft" data-act="spk-skip">넘어가기</button></div>`}
      </div>`;
    if (self) playAudio(w.word);
  }
  function spkStop() { const r = SPK; SPK = null; clearTimeout(S.spkT); if (r) { try { r.onresult = r.onerror = r.onend = null; r.abort(); } catch (e) {} } }
  function spkFallback(why) {
    spkStop(); spkSelf = true; S.spkWhy = why + ' 이번에는 스스로 확인하는 방식으로 바꿀게요.';
    if (S.active && S.mode === 'speak' && !S.locked) renderSpeak(S.queue[S.idx]);
  }
  ACTIONS['spk-go'] = () => {
    if (!S.active || S.locked || !SR) return;
    const item = S.queue[S.idx], out = $('spkOut'), btn = $('micBtn'); if (!out || !btn) return;
    spkStop();
    try { window.speechSynthesis.cancel(); } catch (e) {}
    let r; try { r = new SR(); } catch (e) { return spkFallback('이 브라우저에서는 음성 인식을 시작할 수 없어요.'); }
    SPK = r; r.lang = 'en-US'; r.maxAlternatives = 5; r.interimResults = false; r.continuous = false;
    const mine = () => SPK === r && S.active && S.queue[S.idx] === item;
    btn.classList.add('on'); out.textContent = '듣고 있어요...';
    let got = false;
    S.spkT = setTimeout(() => { if (mine()) { try { r.stop(); } catch (e) {} } }, 8000);
    r.onresult = e => {
      if (!mine()) return;
      got = true; const alts = [...(e.results[0] || [])].map(a => a.transcript);
      const ok = alts.some(a => spkMatch(a, item.w.word));
      S.tries = (S.tries || 0) + 1;
      if (ok) {
        S.locked = true; out.innerHTML = `<b class="ok">정확해요!</b> "${esc(spkNorm(alts[0]) || item.w.word)}"`; recordResult(item, true);
        const my = S.idx; setTimeout(() => { if (S.active && S.idx === my) nextQuestion(); }, 900);
      } else out.innerHTML = `<b class="bad">"${esc(spkNorm(alts[0]) || '...')}"(으)로 들렸어요.</b> ${S.tries >= 3 ? '넘어가도 괜찮아요.' : '한 번 더 말해 볼까요?'}`;
    };
    r.onerror = e => {
      if (!mine()) return;
      if (SPK_FATAL[e.error]) return spkFallback(SPK_FATAL[e.error]);
      out.textContent = e.error === 'no-speech' ? '소리가 들리지 않았어요. 다시 눌러 주세요.' : e.error === 'aborted' ? '다시 눌러서 말해 주세요.' : '인식하지 못했어요. 다시 눌러 주세요.';
    };
    r.onend = () => { if (SPK !== r) return; SPK = null; clearTimeout(S.spkT); btn.classList.remove('on'); if (!got && out.textContent === '듣고 있어요...') out.textContent = '다시 눌러서 말해 주세요.'; };
    try { r.start(); } catch (e) { spkFallback('마이크를 시작하지 못했어요.'); }
  };
  ACTIONS['spk-skip'] = () => { if (!S.active || S.locked) return; spkStop(); S.locked = true; recordResult(S.queue[S.idx], false); nextQuestion(); };
  ACTIONS['spk-self'] = el => {
    if (!S.active || S.locked) return; S.locked = true;
    const item = S.queue[S.idx], ok = el.dataset.ok === '1'; recordResult(item, ok);
    const my = S.idx; setTimeout(() => { if (S.active && S.idx === my) nextQuestion(); }, 250);
  };

  /* ----- 스펠링 / 듣고 쓰기 ----- */
  const norm = s => String(s).toLowerCase().replace(/\s+/g, ' ').replace(/[.,!?]+$/g, '').trim();
  function renderTyping(item, dictation) {
    const w = item.w;
    const hint = w.word.split('').map((ch, i) => ch === ' ' ? '  ' : (i === 0 ? ch : '_')).join(' ');
    $('stBody').innerHTML = `
      <div class="q-wrap">
        <div class="q-card">
          ${dictation
            ? `<div class="q-label">들리는 단어를 입력하세요</div><button class="q-speak big" data-act="speak" data-text="${esc(w.word)}" aria-label="다시 듣기">${IC.speaker}</button><div class="q-sub">눌러서 다시 들을 수 있어요</div>`
            : `<div class="q-label">이 뜻의 영어 단어를 쓰세요</div><div class="q-meaning">${esc(w.meaning)}</div><div class="q-hint">${esc(hint)}</div>`}
        </div>
        <input type="text" id="typeInput" class="type-input" autocomplete="off" autocapitalize="none" autocorrect="off" spellcheck="false" placeholder="여기에 입력">
        <div id="typeFeedback"></div>
        <div class="row q-foot">
          <button class="btn btn-soft" id="typeSkip" data-act="type-skip">모르겠어요</button>
          <button class="btn btn-primary" id="typeBtn" data-act="type-submit">확인</button>
        </div>
      </div>`;
    if (dictation) playAudio(w.word);
    setTimeout(() => { const i = $('typeInput'); if (i) i.focus(); }, 120);
  }
  function showTypeResult(ok, typed) {
    const item = S.queue[S.idx], w = item.w;
    S.answered = true;
    $('typeInput').disabled = true;
    $('typeFeedback').innerHTML = ok
      ? `<div class="fb ok"><span class="ans-ic">${IC.tick}</span><div>정답이에요! <b>${esc(w.word)}</b><div class="fb-sub">${esc(w.meaning)}</div></div></div>`
      : `<div class="fb bad"><span class="ans-ic">${IC.x}</span><div>정답은 <b>${esc(w.word)}</b> ${esc(w.phonetic)}<div class="fb-sub">${esc(w.meaning)}${w.example ? '<br>' + esc(w.example) : ''}${w.exampleKo ? '<br>' + esc(w.exampleKo) : ''}</div></div></div>`;
    $('typeBtn').textContent = '다음';
    $('typeSkip').style.display = 'none';
    playAudio(w.word);
    recordResult(item, ok);
  }
  ACTIONS['type-submit'] = () => {
    if (!S.active) return;
    if (S.answered) return nextQuestion();
    const typed = $('typeInput').value;
    if (!typed.trim()) return toast('답을 입력해 주세요.');
    if (S.mode === 'test') return examType(typed);
    showTypeResult(norm(typed) === norm(S.queue[S.idx].w.word), typed);
  };
  ACTIONS['type-skip'] = () => { if (!S.active || S.answered) return; if (S.mode === 'test') return examType(''); showTypeResult(false, ''); };
  function examType(typed) {
    const item = S.queue[S.idx], ok = !!typed && norm(typed) === norm(item.w.word);
    S.answered = true; S.log.push({ w: item.w, t: item.t, ok, your: typed.trim() });
    recordResult(item, ok); nextQuestion();
  }
  document.addEventListener('keydown', e => {
    if (e.key === 'Enter' && S.active && (S.mode === 'spell' || S.mode === 'dict' || (S.mode === 'test' && $('typeInput'))) && !S.finished) {
      if (e.target.id === 'typeInput' || S.answered) { e.preventDefault(); ACTIONS['type-submit'](); }
    }
  });

  /* ----- 결과 ----- */
  function finishSession() {
    if (S.mode === 'test') return finishExam();
    S.finished = true;
    kbdHint('');
    try { window.speechSynthesis.cancel(); } catch (e) {}
    $('stProg').style.width = '100%';
    $('stCount').textContent = '';
    const first = S.ok + S.no;
    const pct = first ? Math.round(S.ok / first * 100) : 0;
    const mood = pct >= 90 ? 'cheer' : pct >= 70 ? 'happy' : 'think';
    const title = pct >= 90 ? '완벽해요!' : pct >= 70 ? '아주 잘했어요' : pct >= 40 ? '조금만 더 하면 돼요' : '괜찮아요, 다시 해봐요';
    const st = streak();
    const goal = config.goal || 20;
    const todayN = (stats.days[dayKey()] || { n: 0 }).n;
    const goalHit = S.startN < goal && todayN >= goal;
    const wrongs = [...S.wrong.values()];
    const label = S.mode === 'card' ? '알아요' : '정답';
    $('stBody').innerHTML = `
      <div class="result">
        <div class="result-art">${MASCOT(mood)}</div>
        <h2>${title}</h2>
        <div class="score">${S.ok} / ${first}</div>
        <div class="result-stats"><div><b>${pct}%</b><span>${label}</span></div><div><b>${st}일</b><span>연속 학습</span></div><div class="${goalHit ? 'hit' : ''}"><b>${todayN}/${goal}</b><span>${goalHit ? '목표 달성!' : '오늘 목표'}</span></div></div>
        ${wrongs.length ? `<div class="card result-box"><b style="font-size:.95rem;">다시 볼 단어 ${wrongs.length}개</b>${wrongs.map(it => `<div class="wrong-item"><b>${esc(it.w.word)}</b><span>${esc(it.w.meaning)}</span><button class="w-speak" data-act="speak" data-text="${esc(it.w.word)}" aria-label="발음 듣기">${IC.speaker}</button></div>`).join('')}</div>` : '<div class="card result-box" style="text-align:center;">틀린 단어가 없어요. 대단해요!</div>'}
        <div class="row" style="margin-top:6px;">
          ${wrongs.length ? '<button class="btn btn-soft" data-act="retry-wrong">틀린 것만 다시</button>' : '<button class="btn btn-soft" data-act="again">한 번 더</button>'}
          <button class="btn btn-primary" data-act="exit-session">마치기</button>
        </div>
      </div>`;
    if (S.assign) clSubmit(S.assign, S.ok, first, Math.max(1, Math.round((Date.now() - S.t0) / 1000)), wrongs.map(it => it.w.word));
    clPing(true);
    if (pct >= 80 || goalHit) confetti();
  }
  /* ----- 실전 시험 결과 ----- */
  const EXAM_T = { choice: '뜻 고르기', rchoice: '단어 고르기', spell: '철자 쓰기' };
  const examGrade = p => p >= 90 ? ['A', '아주 뛰어나요'] : p >= 80 ? ['B', '잘했어요'] : p >= 70 ? ['C', '조금만 더'] : p >= 60 ? ['D', '복습이 필요해요'] : ['E', '다시 도전해요'];
  const mmss = sec => `${Math.floor(sec / 60)}분 ${String(sec % 60).padStart(2, '0')}초`;
  function srcLabel(src) {
    if (src.type === 'cat') { const c = categories.find(x => x.id === src.id); return c ? c.name : '단어장'; }
    return ({ today: '오늘의 학습', due: '오늘 복습', new: '새 단어', wrong: '오답노트', star: '즐겨찾기', all: '전체 단어' })[src.type] || '전체 단어';
  }
  function finishExam() {
    S.finished = true; kbdHint('');
    try { window.speechSynthesis.cancel(); } catch (e) {}
    $('stProg').style.width = '100%'; $('stCount').textContent = '';
    const n = S.log.length, ok = S.log.filter(x => x.ok).length, pct = n ? Math.round(ok / n * 100) : 0;
    const sec = Math.max(1, Math.round((Date.now() - S.t0) / 1000)), [g, gt] = examGrade(pct);
    const prev = (stats.tests || []).filter(t => t.src === srcLabel(S.src)).slice(-1)[0];
    stats.tests = (stats.tests || []).concat({ d: Date.now(), n, ok, sec, src: srcLabel(S.src) }).slice(-30); syncStorage();
    const by = Object.keys(EXAM_T).map(t => { const l = S.log.filter(x => x.t === t); return l.length ? `<div><b>${l.filter(x => x.ok).length}/${l.length}</b><span>${EXAM_T[t]}</span></div>` : ''; }).join('');
    const diff = prev ? pct - Math.round(prev.ok / prev.n * 100) : null;
    S.wrong = new Map(S.log.filter(x => !x.ok).map(x => [x.w.id, { w: x.w }]));
    $('stBody').innerHTML = `
      <div class="result exam-result">
        <div class="exam-badge g-${g}"><b>${g}</b><span>${gt}</span></div>
        <div class="score">${pct}<small>점</small></div>
        <div class="muted" style="margin-top:-4px;">${esc(srcLabel(S.src))} · ${n}문제 중 ${ok}개 정답${diff !== null ? ` · 지난번보다 ${diff >= 0 ? diff + '점 올랐어요' : -diff + '점 내려갔어요'}` : ''}</div>
        <div class="result-stats"><div><b>${mmss(sec)}</b><span>걸린 시간</span></div>${by}</div>
        <div class="card result-box exam-review"><b style="font-size:.95rem;">문제 다시 보기</b>
          ${S.log.map((x, i) => `<div class="ex-row ${x.ok ? 'ok' : 'bad'}"><span class="ex-n">${i + 1}</span><span class="ex-ic">${x.ok ? IC.tick : IC.x}</span><div class="ex-t"><b>${esc(x.w.word)}</b><span>${esc(x.w.meaning)}</span>${x.ok ? '' : `<small>내 답: ${esc(x.your || '(모름)')}</small>`}</div><button class="w-speak" data-act="speak" data-text="${esc(x.w.word)}" aria-label="발음 듣기">${IC.speaker}</button></div>`).join('')}
        </div>
        <div class="row" style="margin-top:6px;">
          ${ok < n ? '<button class="btn btn-soft" data-act="retry-wrong">틀린 문제 다시</button>' : '<button class="btn btn-soft" data-act="again">다시 시험 보기</button>'}
          <button class="btn btn-primary" data-act="exit-session">마치기</button>
        </div>
      </div>`;
    if (S.assign) clSubmit(S.assign, ok, n, sec, S.log.filter(x => !x.ok).map(x => x.w.word));
    clPing(true);
    if (pct >= 80) confetti();
  }
  ACTIONS['exam-open'] = el => {
    const pre = el && el.dataset && el.dataset.src || (currentCategoryId ? 'cat:' + currentCategoryId : 'all');
    const c = counts(), opts = [['all', '전체 단어', c.total], ['wrong', '오답노트', c.miss], ['star', '즐겨찾기', c.star]].concat(categories.map(b => ['cat:' + b.id, b.name, b.words.length]));
    const recent = (stats.tests || []).slice(-3).reverse();
    openSheet('실전 시험', `<div class="form-stack">
      <p class="muted" style="margin:0;font-size:.86rem;line-height:1.6;">뜻 고르기, 단어 고르기, 철자 쓰기가 섞여 나와요. 정답은 시험이 끝난 뒤에 한꺼번에 보여줘요.</p>
      <label class="setting-label" for="exSrc">시험 범위</label>
      <select id="exSrc">${opts.map(([k, nm, n]) => `<option value="${esc(k)}"${k === pre ? ' selected' : ''}${n ? '' : ' disabled'}>${esc(nm)} (${n}개)</option>`).join('')}</select>
      <label class="setting-label">문제 수</label>
      <div class="seg" id="exNum">${[10, 20, 30, 50].map(k => `<button class="${k === 20 ? 'on' : ''}" data-act="pt-opt" data-g="exNum" data-v="${k}">${k}문제</button>`).join('')}</div>
      <button class="btn btn-primary btn-block" data-act="exam-go">${IC.trophy} 시험 시작</button>
      ${recent.length ? `<div class="exam-hist"><h4 class="syn-h">최근 시험</h4>${recent.map(t => `<div class="eh-row"><span>${esc(t.src)}</span><small>${new Date(t.d).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })}</small><b>${Math.round(t.ok / t.n * 100)}점</b></div>`).join('')}</div>` : ''}
    </div>`);
  };
  ACTIONS['exam-go'] = () => {
    const src = parseSrc(($('exSrc') || {}).value || 'all'), b = document.querySelector('#exNum .on'), n = b ? +b.dataset.v : 20;
    closeSheet(); startSession('test', src, n);
  };
  ACTIONS['retry-wrong'] = () => {
    const items = [...S.wrong.values()].map(i => ({ w: i.w, catId: i.catId }));
    startSession(S.mode, S.src, 0, items);
  };
  ACTIONS.again = () => startSession(S.mode, S.src, S.count);

  async function exitSession(force) {
    if (!force && S.active && !S.finished && S.idx > 0 && S.mode !== 'listen') {
      if (!await ask('학습을 그만할까요?\n지금까지 푼 결과는 저장돼 있어요.', { ok: '그만하기' })) return;
    }
    L.token++;
    try { window.speechSynthesis.cancel(); } catch (e) {}
    S.active = false; spkStop();
    $('studyScreen').classList.remove('open');
    if (!$('sheetOv').classList.contains('open')) document.body.classList.remove('no-scroll');
    go(curTab); clPing(true);
  }
  ACTIONS['exit-session'] = () => exitSession(false);

  /* ----- 듣기 모드 ----- */
  let L = { token: 0, items: [], i: 0, playing: false, example: true };
  function startListen() {
    L = { token: L.token + 1, items: S.queue, i: 0, playing: true, example: true };
    renderListen();
    listenLoop(L.token);
  }
  function renderListen() {
    const it = L.items[L.i];
    if (!it) return;
    const w = it.w;
    $('stProg').style.width = (L.i / L.items.length * 100) + '%';
    $('stCount').textContent = `${L.i + 1}/${L.items.length}`;
    $('stBody').innerHTML = `
      <div class="q-wrap">
        <div class="q-card">
          <div class="q-word">${esc(w.word)}</div>
          <div class="q-pron">${esc(pronText(w))}</div>
          <div class="q-meaning" style="margin-top:10px;">${esc(w.meaning)}</div>
          ${w.example ? `<div class="q-sub">${esc(w.example)}${w.exampleKo ? `<br><span class="ex-ko">${esc(w.exampleKo)}</span>` : ''}</div>` : ''}
        </div>
        <div class="player">
          <button data-act="l-prev" aria-label="이전">${IC.prev}</button>
          <button class="play" data-act="l-toggle" aria-label="재생/일시정지">${L.playing ? IC.pause : IC.play}</button>
          <button data-act="l-next" aria-label="다음">${IC.next}</button>
        </div>
        <label class="switch-row"><input type="checkbox" ${L.example ? 'checked' : ''} onchange="L.example = this.checked"> 예문도 읽어주기</label>
      </div>`;
  }
  async function listenLoop(token) {
    while (L.token === token && L.playing && L.i < L.items.length) {
      const w = L.items[L.i].w;
      renderListen();
      await speak(w.word, 'en-US');
      if (L.token !== token || !L.playing) return;
      await sleep(450);
      await speak(w.meaning.replace(/[()\[\]]/g, ' '), 'ko-KR');
      if (L.token !== token || !L.playing) return;
      if (L.example && w.example) {
        await sleep(350);
        await speak(w.example, 'en-US');
        if (L.token !== token || !L.playing) return;
      }
      await sleep(900);
      if (L.token !== token || !L.playing) return;
      L.i++;
    }
    if (L.token === token && L.i >= L.items.length) {
      L.playing = false; L.i = L.items.length - 1;
      $('stProg').style.width = '100%';
      toast('한 바퀴 끝! 다시 들으려면 재생을 누르세요.');
      renderListen();
      L.i = 0;
    }
  }
  function listenRestart() { L.token++; try { window.speechSynthesis.cancel(); } catch (e) {} renderListen(); if (L.playing) listenLoop(L.token); }
  ACTIONS['l-toggle'] = () => {
    L.playing = !L.playing;
    if (!L.playing) { L.token++; try { window.speechSynthesis.cancel(); } catch (e) {} renderListen(); }
    else { L.token++; listenLoop(L.token); }
  };
  ACTIONS['l-next'] = () => { if (L.i < L.items.length - 1) { L.i++; listenRestart(); } };
  ACTIONS['l-prev'] = () => { if (L.i > 0) { L.i--; listenRestart(); } };

