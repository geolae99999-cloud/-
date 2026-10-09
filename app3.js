
  /* =========================================================
   * 학습 세션 엔진
   * ======================================================= */
  let S = { active: false };

  function startSession(mode, src, count, override) {
    if (!MODES[mode]) return;
    const items = override ? override : poolFor(src);
    if (!items.length) return toast(EMPTY_MSG[src.type] || '학습할 단어가 없어요.');
    if ((mode === 'choice' || mode === 'rchoice') && allWords().length < 4) return toast('4지선다는 전체 단어가 4개 이상 있어야 해요.');
    let q = shuffled(items.map(x => ({ w: x.w, catId: x.catId })));
    if (count > 0) q = q.slice(0, count);
    const dpool = poolFor(src).map(x => x.w);
    S = { active: true, finished: false, mode, src, count, queue: q, total: q.length, idx: 0, ok: 0, no: 0, wrong: new Map(), locked: false, answered: false, options: [], dpool: dpool.length >= 4 ? dpool : allWords().map(x => x.w), startN: (stats.days[dayKey()] || { n: 0 }).n };
    $('studyScreen').classList.add('open');
    document.body.classList.add('no-scroll');
    if (mode === 'listen') startListen(); else renderQuestion();
  }

  function renderQuestion() {
    if (S.idx >= S.queue.length) return finishSession();
    S.locked = false; S.answered = false;
    $('stProg').style.width = (S.idx / S.queue.length * 100) + '%';
    $('stCount').textContent = `${S.idx + 1}/${S.queue.length}`;
    const item = S.queue[S.idx];
    if (S.mode === 'card') renderCard(item);
    else if (S.mode === 'choice') renderChoice(item, false);
    else if (S.mode === 'rchoice') renderChoice(item, true);
    else renderTyping(item, S.mode === 'dict');
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
      if (!item.retry) S.queue.push({ w, catId: item.catId, retry: true });
    }
    syncStorage();
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
                <button class="q-speak" data-act="speak" data-text="${esc(w.word)}" aria-label="발음 듣기">🔊</button>
                <div class="fc-hint">카드를 눌러 뜻 보기</div>
              </div>
              <div class="fc-face fc-back">
                <div class="q-meaning">${esc(w.meaning)}</div>
                ${w.example ? `<div class="fc-ex">${esc(w.example)}</div>` : ''}
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
            : `<div class="q-label">이 단어의 뜻은?</div><div class="q-word">${esc(w.word)}</div><div class="q-pron">${esc(pronText(w))}</div><button class="q-speak" data-act="speak" data-text="${esc(w.word)}" aria-label="발음 듣기">🔊</button>`}
        </div>
        <div class="opts">${S.options.map((o, i) => `<button class="opt" data-act="opt" data-i="${i}"><span class="opt-n">${i + 1}</span><span>${esc(reverse ? o.word : o.meaning)}</span></button>`).join('')}</div>
      </div>`;
    if (!reverse) playAudio(w.word);
  }
  ACTIONS.opt = el => {
    if (S.locked || !S.active) return;
    S.locked = true;
    const item = S.queue[S.idx];
    const chosen = S.options[parseInt(el.dataset.i, 10)];
    const ok = chosen.id === item.w.id;
    const btns = [...$('stBody').querySelectorAll('.opt')];
    btns.forEach(b => { b.disabled = true; });
    el.classList.add(ok ? 'correct' : 'wrong');
    if (!ok) { const ci = S.options.findIndex(o => o.id === item.w.id); if (btns[ci]) btns[ci].classList.add('correct'); }
    if (S.mode === 'rchoice') playAudio(item.w.word);
    recordResult(item, ok);
    const my = S.idx;
    setTimeout(() => { if (S.active && S.idx === my) nextQuestion(); }, ok ? 700 : 1600);
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
            ? `<div class="q-label">들리는 단어를 입력하세요</div><button class="q-speak big" data-act="speak" data-text="${esc(w.word)}" aria-label="다시 듣기">🔊</button><div class="q-sub">눌러서 다시 들을 수 있어요</div>`
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
      ? `<div class="fb ok">정답이에요! <b>${esc(w.word)}</b><div class="fb-sub">${esc(w.meaning)}</div></div>`
      : `<div class="fb bad">정답은 <b>${esc(w.word)}</b> ${esc(w.phonetic)}<div class="fb-sub">${esc(w.meaning)}${w.example ? '<br>' + esc(w.example) : ''}</div></div>`;
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
    showTypeResult(norm(typed) === norm(S.queue[S.idx].w.word), typed);
  };
  ACTIONS['type-skip'] = () => { if (S.active && !S.answered) showTypeResult(false, ''); };
  document.addEventListener('keydown', e => {
    if (e.key === 'Enter' && S.active && (S.mode === 'spell' || S.mode === 'dict') && !S.finished) {
      if (e.target.id === 'typeInput' || S.answered) { e.preventDefault(); ACTIONS['type-submit'](); }
    }
  });

  /* ----- 결과 ----- */
  function finishSession() {
    S.finished = true;
    try { window.speechSynthesis.cancel(); } catch (e) {}
    $('stProg').style.width = '100%';
    $('stCount').textContent = '';
    const first = S.ok + S.no;
    const pct = first ? Math.round(S.ok / first * 100) : 0;
    const emoji = pct >= 90 ? '🏆' : pct >= 70 ? '🎉' : pct >= 40 ? '💪' : '🌱';
    const title = pct >= 90 ? '완벽해요!' : pct >= 70 ? '아주 잘했어요' : pct >= 40 ? '조금만 더 하면 돼요' : '괜찮아요, 다시 해봐요';
    const st = streak();
    const goal = config.goal || 20;
    const todayN = (stats.days[dayKey()] || { n: 0 }).n;
    const goalHit = S.startN < goal && todayN >= goal;
    const wrongs = [...S.wrong.values()];
    const label = S.mode === 'card' ? '알아요' : '정답';
    $('stBody').innerHTML = `
      <div class="result">
        <div class="emoji">${emoji}</div>
        <h2>${title}</h2>
        <div class="score">${S.ok} / ${first}</div>
        <div class="muted" style="font-weight:600;">${label} ${pct}% · 🔥 ${st}일 연속 · 오늘 ${todayN}/${goal}${goalHit ? ' · 🎯 목표 달성!' : ''}</div>
        ${wrongs.length ? `<div class="card result-box"><b style="font-size:.95rem;">다시 볼 단어 ${wrongs.length}개</b>${wrongs.map(it => `<div class="wrong-item"><b>${esc(it.w.word)}</b><span>${esc(it.w.meaning)}</span><button class="w-speak" data-act="speak" data-text="${esc(it.w.word)}" aria-label="발음 듣기">🔊</button></div>`).join('')}</div>` : '<div class="card result-box" style="text-align:center;">틀린 단어가 없어요. 대단해요!</div>'}
        <div class="row" style="margin-top:6px;">
          ${wrongs.length ? '<button class="btn btn-soft" data-act="retry-wrong">틀린 것만 다시</button>' : '<button class="btn btn-soft" data-act="again">한 번 더</button>'}
          <button class="btn btn-primary" data-act="exit-session">마치기</button>
        </div>
      </div>`;
    if (pct >= 80 || goalHit) confetti();
  }
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
    S.active = false;
    $('studyScreen').classList.remove('open');
    if (!$('sheetOv').classList.contains('open')) document.body.classList.remove('no-scroll');
    go(curTab);
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
          ${w.example ? `<div class="q-sub">${esc(w.example)}</div>` : ''}
        </div>
        <div class="player">
          <button data-act="l-prev" aria-label="이전">⏮</button>
          <button class="play" data-act="l-toggle" aria-label="재생/일시정지">${L.playing ? '⏸' : '▶'}</button>
          <button data-act="l-next" aria-label="다음">⏭</button>
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
        await speak(w.example.split('(')[0], 'en-US');
        if (L.token !== token || !L.playing) return;
      }
      await sleep(900);
      if (L.token !== token || !L.playing) return;
      L.i++;
    }
    if (L.token === token && L.i >= L.items.length) {
      L.playing = false; L.i = L.items.length - 1;
      $('stProg').style.width = '100%';
      toast('한 바퀴 끝! 다시 들으려면 ▶를 누르세요.');
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

  /* =========================================================
   * 통계
   * ======================================================= */
  function renderStats() {
    const days = stats.days, goal = config.goal || 20, c = counts();
    let totalN = 0, totalOk = 0;
    Object.keys(days).forEach(k => { totalN += days[k].n; totalOk += days[k].ok; });
    const acc = totalN ? Math.round(totalOk / totalN * 100) : 0;

    const labels = ['일', '월', '화', '수', '목', '금', '토'];
    const week = [];
    for (let i = 6; i >= 0; i--) { const t = addDays(startOfDay(), -i); week.push({ t, n: (days[dayKey(t)] || { n: 0 }).n, today: i === 0 }); }
    const maxN = Math.max(goal, ...week.map(x => x.n), 1);
    const bars = week.map(x => `<div class="bar-col ${x.today ? 'today' : ''}">${x.n || ''}<i style="height:${Math.max(4, Math.round(x.n / maxN * 100))}%"></i>${labels[new Date(x.t).getDay()]}</div>`).join('');

    const dow = new Date().getDay();
    const gridStart = addDays(startOfDay(), -(28 + dow));
    let heat = labels.map(l => `<div class="heat-h">${l}</div>`).join('');
    for (let i = 0; i < 35; i++) {
      const t = addDays(gridStart, i);
      if (t > startOfDay()) { heat += '<div class="cell future"></div>'; continue; }
      const n = (days[dayKey(t)] || { n: 0 }).n;
      const lv = n === 0 ? 0 : n < 5 ? 1 : n < 15 ? 2 : n < 30 ? 3 : 4;
      heat += `<div class="cell l${lv} ${t === startOfDay() ? 'is-today' : ''}" title="${dayKey(t)} · ${n}개"></div>`;
    }

    const tot = Math.max(1, c.total);
    const top = allWords().map(x => x.w).filter(w => w.wrong > 0).sort((a, b) => b.wrong - a.wrong).slice(0, 5);

    $('tabStats').innerHTML = `
      <h2 class="page-title">학습 통계</h2>
      <div class="stat-tiles">
        <div class="stat-tile"><b>${streak()}일</b><span>연속 학습</span></div>
        <div class="stat-tile"><b>${bestStreak()}일</b><span>최고 기록</span></div>
        <div class="stat-tile"><b>${acc}%</b><span>전체 정답률</span></div>
      </div>
      <div class="card" style="margin-bottom:12px;">
        <b>최근 7일</b>
        <div class="bars">${bars}</div>
        <div class="goal-line">하루 목표 ${goal}개 · 총 ${totalN}번 학습했어요</div>
      </div>
      <div class="card" style="margin-bottom:12px;">
        <b>단어 레벨</b>
        <div class="stack">
          <i style="width:${c.mastered / tot * 100}%;background:var(--mint)"></i>
          <i style="width:${c.learning / tot * 100}%;background:var(--blue)"></i>
          <i style="width:${c.newW / tot * 100}%;background:var(--line)"></i>
        </div>
        <div class="legend"><span style="--c:var(--mint)">마스터 ${c.mastered}</span><span style="--c:var(--blue)">학습 중 ${c.learning}</span><span style="--c:var(--line)">새 단어 ${c.newW}</span></div>
      </div>
      <div class="card" style="margin-bottom:12px;">
        <b>최근 5주 학습 달력</b>
        <div class="heat">${heat}</div>
      </div>
      <div class="card">
        <b>자주 틀리는 단어</b>
        ${top.length ? top.map(w => `<div class="miss-item"><b>${esc(w.word)}</b><span>${esc(w.meaning)}</span><span class="badge b-bad" style="flex:none;">${w.wrong}회</span></div>`).join('') : '<div class="empty" style="padding:20px 0 6px;">아직 틀린 단어가 없어요.</div>'}
      </div>`;
  }

  /* =========================================================
   * TTS
   * ======================================================= */
  function voiceFor(lang) {
    try {
      const vs = window.speechSynthesis.getVoices(), L2 = lang.toLowerCase(), n = v => (v.lang || '').toLowerCase().replace('_', '-');
      const exact = vs.filter(v => n(v) === L2);
      if (L2 === 'en-us') return exact.find(v => /samantha|google us|aria|jenny|ava|allison|zira|natural|siri/i.test(v.name)) || exact[0] || null;
      return exact[0] || vs.find(v => n(v).startsWith(L2.slice(0, 2))) || null;
    } catch (e) { return null; }
  }
  function speak(text, lang) {
    return new Promise(res => {
      if (!('speechSynthesis' in window) || !text) return res();
      try { window.speechSynthesis.cancel(); } catch (e) {}
      const u = new SpeechSynthesisUtterance(text);
      u.lang = lang || 'en-US';
      u.rate = parseFloat(config.ttsRate) || 0.9;
      const v = voiceFor(u.lang); if (v) u.voice = v;
      let done = false;
      const fin = () => { if (!done) { done = true; res(); } };
      u.onend = fin; u.onerror = fin;
      setTimeout(fin, 6000 + text.length * 160);
      window.speechSynthesis.speak(u);
    });
  }
  function playAudio(text) { speak(text, 'en-US'); }
