  /* =========================================================
   * 단어 맞추기 대결: 60초 동안 4지선다를 최대한 많이 맞혀요. 영어·중국어, 4단계, 랭킹(이번 주 · 역대, 전체 · 우리 반)
   * 랭킹은 서버 SQL v9(voca_game_*)를 써요. 없거나 로컬 계정이면 이 기기의 내 기록만 보여 줘요.
   * ======================================================= */
  const WQ_SEC = 60, WQ_PEN = 3;
  const WQ_LV = {
    en: [['l1', '기초', '초등 · 기초 단어', ['basic']], ['l2', '중학교', '중학교 필수 단어', ['mid']], ['l3', '고등학교', '고등학교 필수 단어', ['high']], ['l4', '수능 · 토익', '수능 · 토익 · 토플 단어', ['csat', 'toeic', 'toefl']]],
    zh: [['l1', 'HSK 1~2급', '입문 단어', ['hsk1', 'hsk2']], ['l2', 'HSK 3~4급', '초중급 단어', ['hsk3', 'hsk4']], ['l3', 'HSK 5~6급', '고급 단어', ['hsk5', 'hsk6']], ['l4', '신HSK 7~9급', '최상급 단어', ['nhsk7']]]
  };
  const wqLvName = (lang, lv) => lv === 'my' ? '내 단어장' : ((WQ_LV[lang] || []).find(x => x[0] === lv) || [])[1] || '';
  const wqKey = () => 'vocapro_wq:' + currentUser;
  const wqLocal = () => loadJson(wqKey()) || {};
  const wqCloud = () => clOk() && !kidMode;
  let WQ = null;
  // 랭킹 이름: 정하지 않았으면 이름 가운데를 가려서 보여 줘요(김주원 -> 김*원).
  function wqMask(s) {
    const a = [...String(s || '').trim()];
    if (!a.length) return '익명';
    if (a.length <= 2) return a[0] + '*';
    return a[0] + '*'.repeat(Math.min(a.length - 2, 3)) + a[a.length - 1];
  }
  const wqName = () => (config.gameName && String(config.gameName).trim()) || wqMask(myName());
  const wqShort = m => { const s = String(m || '').split(/[;]/)[0].trim(); return s.length > 26 ? s.slice(0, 25) + '…' : s; };

  function wqPool(lang, lv) {
    if (lv === 'my') return allWords().map(x => x.w).filter(w => w.word && w.meaning).map(w => ({ w: w.word, m: wqShort(w.meaning), p: isHanWord(w.word) ? w.phonetic || '' : '' }));
    const row = (WQ_LV[lang] || []).find(x => x[0] === lv); if (!row) return [];
    const seen = new Set(), out = [];
    row[3].forEach(k => gradeWords(k).forEach(e => { if (!e.w || !e.m || seen.has(e.w)) return; seen.add(e.w); out.push({ w: e.w, m: wqShort(e.m), p: e.p || '' }); }));
    return out;
  }
  function wqOpen() {
    wqClose();
    const ov = document.createElement('div'); ov.className = 'mg wq'; ov.id = 'wqOv'; document.body.appendChild(ov); document.body.classList.add('no-scroll');
    WQ = { lang: LANG, lv: (wqLocal().last || {})[LANG] || 'l2', view: 'lobby', rk: { per: 'week', scope: 'all' } };
    ov.addEventListener('click', wqClick);
    wqLobby();
    if (isZh()) zhLoad().then(() => { if (WQ && WQ.view === 'lobby') wqLobby(); });
  }
  function wqClose() { if (WQ) { clearInterval(WQ.timer); clearTimeout(WQ.cd); } WQ = null; const o = $('wqOv'); if (o) o.remove(); if (!$('sheetOv').classList.contains('open') && !S.active) document.body.classList.remove('no-scroll'); }
  const wqTop = (title, right) => `<div class="mg-top"><button class="round-btn" data-wq="${WQ && WQ.view !== 'lobby' && WQ.view !== 'play' ? 'lobby' : 'x'}" aria-label="${WQ && WQ.view !== 'lobby' && WQ.view !== 'play' ? '뒤로' : '닫기'}">${WQ && WQ.view !== 'lobby' && WQ.view !== 'play' ? '<i class="wq-back"></i>' : IC.x}</button><b>${esc(title)}</b>${right || '<span></span>'}</div>`;

  function wqLobby() {
    const ov = $('wqOv'); if (!ov || !WQ) return; WQ.view = 'lobby';
    const L = wqLocal(), lang = WQ.lang, best = lv => ((L.best || {})[lang + ':' + lv] || {}).score || 0;
    const zhWait = lang === 'zh' && !zhIdx;
    const myN = lang === LANG ? allWords().filter(x => x.w.word && x.w.meaning).length : 0;
    const lvs = WQ_LV[lang].map(([k, n, d]) => `<button class="wq-lv${WQ.lv === k ? ' on' : ''}" data-wq="lv" data-k="${k}"><b>${esc(n)}</b><small>${esc(d)}</small>${best(k) ? `<em>${IC.trophy}${best(k).toLocaleString()}</em>` : ''}</button>`).join('')
      + `<button class="wq-lv my${WQ.lv === 'my' ? ' on' : ''}" data-wq="lv" data-k="my"${myN >= 4 ? '' : ' disabled'}><b>내 단어장</b><small>${myN >= 4 ? `${myN.toLocaleString()}개 · 연습(랭킹 없음)` : lang === LANG ? '단어가 4개 이상 있어야 해요' : `${lang === 'zh' ? '중국어' : '영어'} 모드에서 쓸 수 있어요`}</small>${best('my') ? `<em>${IC.trophy}${best('my').toLocaleString()}</em>` : ''}</button>`;
    ov.innerHTML = `${wqTop('단어 맞추기 대결', `<button class="wq-rkbtn" data-wq="rank" aria-label="랭킹">${IC.podium}</button>`)}
      <div class="wq-scroll"><div class="wq-hero ${lang}">
        <div class="wq-hero-t"><small>60초 스피드 퀴즈</small><h2>몇 개나 맞힐 수 있을까요?</h2><p>연속으로 맞히면 점수가 커지고, 틀리면 ${WQ_PEN}초가 줄어요.</p></div>
        <div class="wq-badge">${lang === 'zh' ? '中' : 'EN'}</div></div>
        <div class="seg wq-lang"><button class="${lang === 'en' ? 'on' : ''}" data-wq="lang" data-l="en">영어</button><button class="${lang === 'zh' ? 'on' : ''}" data-wq="lang" data-l="zh">중국어</button></div>
        <h4 class="syn-h">단계</h4><div class="wq-lvs">${lvs}</div>
        <p class="muted wq-note">${wqCloud() ? `랭킹 이름: <b>${esc(wqName())}</b> <button class="link-btn" data-wq="rename">바꾸기</button>` : kidMode ? '이 기기에만 저장하는 계정이라 랭킹에는 오르지 않고 내 기록만 남아요.' : '로그인한 서버 계정이면 전체 랭킹에 올라가요. 지금은 내 기록만 남아요.'}</p>
      </div>
      <button class="btn btn-primary btn-block wq-go" data-wq="go"${zhWait ? ' disabled' : ''}>${zhWait ? '중국어 단어 불러오는 중...' : `${IC.play} 시작`}</button>`;
  }

  function wqQuestion() {
    const g = WQ, pool = g.pool;
    let cur; for (let t = 0; t < 8; t++) { cur = pool[Math.floor(Math.random() * pool.length)]; if (!g.recent.includes(cur.w)) break; }
    g.recent.push(cur.w); if (g.recent.length > Math.min(12, pool.length - 1)) g.recent.shift();
    const a = Math.random() < 0.5 ? 'm' : 'w', f = a === 'm' ? 'm' : 'w', seen = new Set([cur[f]]), d = [];
    for (let t = 0; t < 60 && d.length < 3; t++) { const o = pool[Math.floor(Math.random() * pool.length)]; if (o !== cur && o[f] && !seen.has(o[f])) { seen.add(o[f]); d.push(o); } }
    for (const o of pool) { if (d.length >= 3) break; if (o !== cur && o[f] && !seen.has(o[f])) { seen.add(o[f]); d.push(o); } }
    g.q = { cur, a, opts: shuffled([cur, ...d]) }; g.lock = false; g.qAt = Date.now();
  }
  function wqStart() {
    const g = WQ; if (!g) return;
    const pool = wqPool(g.lang, g.lv);
    if (pool.length < 4) return toast(g.lang === 'zh' && !zhIdx ? '중국어 단어를 불러오는 중이에요. 잠시 뒤 다시 눌러 주세요.' : '단어가 4개 이상 있어야 해요.');
    const L = wqLocal(); L.last = Object.assign(L.last || {}, { [g.lang]: g.lv }); try { LS.setItem(wqKey(), JSON.stringify(L)); } catch (e) {}
    Object.assign(g, { view: 'cd', pool, score: 0, ok: 0, n: 0, combo: 0, maxCombo: 0, wrong: [], recent: [], q: null, lock: true, sent: null });
    let c = 3; const ov = $('wqOv');
    const draw = () => { ov.innerHTML = `${wqTop(wqLvName(g.lang, g.lv))}<div class="wq-cd"><b>${c}</b><small>${g.lang === 'zh' ? '准备!' : 'Ready!'}</small></div>`; };
    draw();
    const tick = () => { if (WQ !== g) return; c--; if (c > 0) { draw(); g.cd = setTimeout(tick, 700); } else wqGo(); };
    g.cd = setTimeout(tick, 700);
  }
  function wqGo() {
    const g = WQ; if (!g) return;
    g.view = 'play'; g.t0 = Date.now(); g.end = g.t0 + WQ_SEC * 1000; g.log = [];
    // 랭킹 판이면 서버에서 입장권을 받아요. 점수는 서버가 답한 기록(맞음/틀림, 시각)으로 다시 계산해요.
    g.run = g.lv !== 'my' && wqCloud() ? Cloud.call('voca_game_start', { p_lang: g.lang, p_lvl: g.lv }).then(r => r, e => ({ err: (e && e.code) || 'server' })) : null;
    wqQuestion(); wqDraw();
    clearInterval(g.timer);
    g.timer = setInterval(() => { if (WQ !== g) return clearInterval(g.timer); wqTime(); }, 100);
  }
  function wqTime() {
    const g = WQ, left = Math.max(0, g.end - Date.now()), bar = $('wqBar'), num = $('wqLeft');
    if (bar) { bar.style.width = (left / (WQ_SEC * 1000) * 100) + '%'; bar.parentElement.classList.toggle('low', left < 10000); }
    if (num) num.textContent = Math.ceil(left / 1000);
    if (left <= 0) { clearInterval(g.timer); wqEnd(); }
  }
  function wqDraw() {
    const ov = $('wqOv'), g = WQ; if (!ov || !g || !g.q) return;
    const q = g.q, zh = g.lang === 'zh', f = q.a === 'm' ? 'm' : 'w';
    ov.innerHTML = `<div class="mg-top"><button class="round-btn" data-wq="quit" aria-label="그만하기">${IC.x}</button><b class="wq-clock">${IC.clock}<span id="wqLeft">${Math.ceil(Math.max(0, g.end - Date.now()) / 1000)}</span></b><span id="wqScore">${g.score.toLocaleString()}점</span></div>
      <div class="wq-time"><i id="wqBar" style="width:${Math.max(0, g.end - Date.now()) / (WQ_SEC * 1000) * 100}%"></i></div>
      <div class="wq-play">
        <div class="wq-combo${g.combo >= 2 ? ' on' : ''}" id="wqCombo">${IC.flame}<b>${g.combo}</b>연속${g.combo >= 2 ? ` <small>+${Math.min(g.combo, 10) * 2}</small>` : ''}</div>
        <div class="wq-q" id="wqQ"><small>${q.a === 'm' ? '이 단어의 뜻은?' : `이 뜻의 ${zh ? '중국어' : '영어'}는?`}</small><b class="${q.a === 'm' ? (zh ? 'zh' : 'en') : ''}">${esc(q.a === 'm' ? q.cur.w : q.cur.m)}</b>${q.a === 'm' && zh && q.cur.p ? `<span class="wq-py">${esc(q.cur.p)}</span>` : ''}</div>
        <div class="wq-opts">${q.opts.map((o, i) => `<button class="opt wq-opt${f === 'w' ? (zh ? ' zh' : ' en') : ''}" data-wq="pick" data-i="${i}"><span class="opt-n">${i + 1}</span><span>${esc(o[f])}</span></button>`).join('')}</div>
      </div>`;
  }
  function wqPick(i) {
    const g = WQ; if (!g || g.view !== 'play' || g.lock || !g.q) return;
    if (Date.now() - (g.qAt || 0) < 150) return; // 문제가 뜬 직후 0.15초 동안의 눌림(두 번 누름)은 무시해요. 서버도 답 사이 0.4초 미만은 받지 않아요.
    const q = g.q, ok = q.opts[i] === q.cur, btns = document.querySelectorAll('#wqOv .wq-opt');
    g.lock = true; g.n++; g.log.push([ok ? 1 : 0, Date.now() - g.t0]);
    if (ok) {
      const add = 10 + Math.min(g.combo, 10) * 2;
      g.score += add; g.ok++; g.combo++; g.maxCombo = Math.max(g.maxCombo, g.combo);
      if (btns[i]) { btns[i].classList.add('correct'); const p = document.createElement('em'); p.className = 'wq-plus'; p.textContent = '+' + add; btns[i].appendChild(p); }
    } else {
      g.combo = 0; g.end -= WQ_PEN * 1000;
      if (!g.wrong.some(x => x.w === q.cur.w)) g.wrong.push(q.cur);
      if (btns[i]) btns[i].classList.add('wrong');
      const ci = q.opts.indexOf(q.cur); if (btns[ci]) btns[ci].classList.add('correct');
      const t = document.createElement('em'); t.className = 'wq-pen'; t.textContent = `-${WQ_PEN}초`; const tp = document.querySelector('#wqOv .wq-clock'); if (tp) tp.appendChild(t);
    }
    const b = document.body; b.classList.remove('ans-ok', 'ans-no'); void b.offsetWidth; b.classList.add(ok ? 'ans-ok' : 'ans-no'); clearTimeout(fxTimer); fxTimer = setTimeout(() => b.classList.remove('ans-ok', 'ans-no'), 600);
    haptic(ok);
    const sc = $('wqScore'); if (sc) sc.textContent = g.score.toLocaleString() + '점';
    wqTime(); if (g.view !== 'play') return;
    setTimeout(() => { if (WQ !== g || g.view !== 'play') return; wqQuestion(); wqDraw(); }, ok ? 260 : 750);
  }
  function wqEnd() {
    const g = WQ, ov = $('wqOv'); if (!g || !ov) return;
    g.view = 'end'; clearInterval(g.timer);
    const L = wqLocal(), k = g.lang + ':' + g.lv; L.best = L.best || {}; L.hist = L.hist || {};
    const prev = (L.best[k] || {}).score || 0, nb = g.score > prev;
    if (nb) L.best[k] = { score: g.score, ok: g.ok, n: g.n, combo: g.maxCombo, at: Date.now() };
    L.hist[k] = (L.hist[k] || []).concat([{ score: g.score, ok: g.ok, n: g.n, combo: g.maxCombo, at: Date.now() }]).sort((a, b) => b.score - a.score).slice(0, 10);
    try { LS.setItem(wqKey(), JSON.stringify(L)); } catch (e) {}
    g.nb = nb && g.score > 0; g.prev = prev;
    const ranked = !!g.run && g.score > 0;
    g.sent = ranked ? 'wait' : null;
    wqEndDraw();
    if (g.nb) confetti();
    if (ranked) g.run.then(t => t && t.id ? Cloud.call('voca_game_submit', { p_run: t.id, p_log: g.log, p_name: wqName() }) : { err: (t && t.err) || 'server' })
      .then(r => { g.sent = r; }, e => { g.sent = { err: e && e.code }; }).then(() => { if (WQ === g && g.view === 'end') wqEndDraw(); });
  }
  const WQ_ERR = { missing: '랭킹은 아직 준비 중이에요. 운영자가 서버 설정을 마치면 올라가요.', too_fast: '너무 빨리 다시 시작해서 이번 판은 랭킹에 올리지 않았어요.', too_many: '오늘은 랭킹 판을 다 썼어요. 내일 다시 올라가요.', bad_input: '기록이 올바르지 않아 랭킹에 올리지 않았어요.', bad_run: '게임 시간이 너무 지나 랭킹에 올리지 않았어요.', used: '이미 올린 판이에요.', network: '인터넷 연결이 없어 랭킹에 올리지 못했어요.', auth: '로그인이 만료돼 랭킹에 올리지 못했어요.' };
  function wqEndDraw() {
    const g = WQ, ov = $('wqOv'); if (!g || !ov) return;
    const acc = g.n ? Math.round(g.ok / g.n * 100) : 0, s = g.sent;
    const rk = !s ? (g.lv === 'my' ? '내 단어장은 연습이라 랭킹에 올리지 않아요.' : '') : s === 'wait' ? '랭킹에 올리는 중...' : s.err ? (WQ_ERR[s.err] || '랭킹에 올리지 못했어요.') : '';
    const rkBox = s && s !== 'wait' && !s.err ? `<div class="wq-rkres"><div><small>이번 주 순위</small><b>${s.rank.toLocaleString()}위</b><span>${s.total.toLocaleString()}명 중</span></div><div><small>역대 순위</small><b>${s.arank.toLocaleString()}위</b><span>최고 ${(+s.best || 0).toLocaleString()}점</span></div></div>` : rk ? `<p class="muted wq-note">${esc(rk)}</p>` : '';
    ov.innerHTML = `${wqTop(wqLvName(g.lang, g.lv) + ' · 결과')}
      <div class="wq-scroll"><div class="wq-end">
        <div class="result-art">${MASCOT(g.nb ? 'cheer' : g.ok ? 'happy' : 'think')}</div>
        <small>${g.nb ? '새 최고 기록!' : g.prev ? `최고 기록 ${g.prev.toLocaleString()}점` : '첫 기록'}</small>
        <h2>${g.score.toLocaleString()}<span>점</span></h2>
        <div class="wq-kv"><span><b>${g.ok}</b>맞힘</span><span><b>${acc}%</b>정답률</span><span><b>${g.maxCombo}</b>최대 연속</span></div>
        ${rkBox}
        ${g.wrong.length ? `<h4 class="syn-h">틀린 단어</h4><div class="wq-wrong">${g.wrong.slice(0, 12).map(w => `<span><b class="${g.lang === 'zh' ? 'zh' : 'en'}">${esc(w.w)}</b><small>${esc(w.m)}</small></span>`).join('')}</div>` : ''}
      </div></div>
      <button class="link-btn res-share" data-wq="share">${IC.users} 점수 자랑하기</button>
      <div class="row wq-btns"><button class="btn btn-soft" data-wq="rank">${IC.podium} 랭킹</button><button class="btn btn-primary" data-wq="go">${IC.repeat} 다시 하기</button></div>`;
  }
  function wqShareText() {
    const g = WQ; if (!g) return '';
    const s = g.sent && g.sent !== 'wait' && !g.sent.err ? g.sent : null;
    return `VocaPro 단어 맞추기 대결 ${wqLvName(g.lang, g.lv)}에서 ${g.score.toLocaleString()}점 받았어${s ? ` (이번 주 ${(+s.rank).toLocaleString()}위)` : ''}! 60초 안에 나보다 많이 맞힐 수 있어?`;
  }

  /* ----- 랭킹 화면 ----- */
  async function wqRank() {
    const g = WQ, ov = $('wqOv'); if (!g || !ov) return;
    g.view = 'rank'; if (g.lv === 'my') g.lv = 'l2';
    const r = g.rk, lang = g.lang, lv = g.lv, key = [lang, lv, r.per, r.scope].join(':');
    const head = `${wqTop((lang === 'zh' ? '중국어' : '영어') + ' 랭킹')}
      <div class="wq-scroll"><div class="seg wq-lang"><button class="${lang === 'en' ? 'on' : ''}" data-wq="rk-lang" data-l="en">영어</button><button class="${lang === 'zh' ? 'on' : ''}" data-wq="rk-lang" data-l="zh">중국어</button></div>
      <div class="rk-ms wq-ms">${WQ_LV[lang].map(([k, n]) => `<button class="${k === lv ? 'on' : ''}" data-wq="rk-lv" data-k="${k}">${esc(n)}</button>`).join('')}</div>
      ${wqCloud() ? `<div class="wq-filt"><div class="seg"><button class="${r.per === 'week' ? 'on' : ''}" data-wq="rk-per" data-v="week">이번 주</button><button class="${r.per === 'all' ? 'on' : ''}" data-wq="rk-per" data-v="all">역대</button></div><div class="seg"><button class="${r.scope === 'all' ? 'on' : ''}" data-wq="rk-scope" data-v="all">전체</button><button class="${r.scope === 'class' ? 'on' : ''}" data-wq="rk-scope" data-v="class">우리 반</button></div></div>` : ''}`;
    const foot = `</div><button class="btn btn-primary btn-block wq-go" data-wq="go-lv">${IC.play} ${esc(wqLvName(lang, lv))} 도전하기</button>`;
    if (!wqCloud()) { ov.innerHTML = head + wqLocalRank(lang, lv, kidMode ? '이 기기에만 저장하는 계정이라 내 기록만 보여요.' : '로그인한 서버 계정이면 전체 랭킹을 볼 수 있어요. 지금은 내 기록만 보여요.') + foot; return; }
    ov.innerHTML = head + `<div class="cl-load">${MASCOT('think')}<span>랭킹 불러오는 중...</span></div>` + foot;
    let d; try { d = await Cloud.call('voca_game_top', { p_lang: lang, p_lvl: lv, p_period: r.per, p_scope: r.scope }); }
    catch (e) { if (WQ !== g || g.view !== 'rank' || [g.lang, g.lv, g.rk.per, g.rk.scope].join(':') !== key) return; ov.innerHTML = head + wqLocalRank(lang, lv, e && e.code === 'missing' ? WQ_ERR.missing + ' 지금은 내 기록만 보여요.' : (WQ_ERR[e && e.code] || '랭킹을 불러오지 못했어요.')) + foot; return; }
    if (WQ !== g || g.view !== 'rank' || [g.lang, g.lv, g.rk.per, g.rk.scope].join(':') !== key) return;
    ov.innerHTML = head + wqBoard(d, r) + foot;
  }
  function wqLocalRank(lang, lv, msg) {
    const h = (wqLocal().hist || {})[lang + ':' + lv] || [];
    return `<p class="muted wq-note">${esc(msg)}</p>${h.length ? `<h4 class="syn-h">내 최고 기록</h4><div class="rk-list">${h.map((x, i) => `<div class="rk-row"><span>${i + 1}</span><b>${esc(clDate(new Date(x.at).toISOString()))} <small class="muted">${x.ok}개 맞힘 · 최대 ${x.combo}연속</small></b><em>${(+x.score || 0).toLocaleString()}점</em></div>`).join('')}</div>` : `<div class="cl-load">${MASCOT('happy')}<span>아직 기록이 없어요. 첫 기록을 세워 보세요!</span></div>`}`;
  }
  function wqBoard(d, r) {
    const list = (d && Array.isArray(d.list) ? d.list : []).map(x => ({ name: String(x.name || '익명'), v: +x.score || 0, ok: +x.ok || 0, combo: +x.combo || 0, me: !!x.me }));
    if (d && d.noclass) return `<div class="cl-load">${MASCOT('think')}<span>참여한 반이 없어요. 홈의 '우리 반'에서 선생님께 받은 코드로 참여하면 반 친구들과 겨룰 수 있어요.</span></div>`;
    const me = d && d.me, myLine = me ? `<div class="wq-me"><span>내 순위</span><b>${(+me.rank || 0).toLocaleString()}위</b><em>${(+me.score || 0).toLocaleString()}점</em><button class="link-btn" data-wq="rename">이름: ${esc(wqName())}</button><button class="link-btn" data-wq="share-rank" data-r="${(+me.rank || 0).toLocaleString()}" aria-label="내 순위 공유">공유</button></div>`
      : `<div class="wq-me"><span>${r.per === 'week' ? '이번 주' : '아직'} 기록이 없어요</span><button class="link-btn" data-wq="rename">이름: ${esc(wqName())}</button></div>`;
    if (!list.length) return myLine + `<div class="cl-load">${MASCOT('happy')}<span>${r.per === 'week' ? '이번 주' : ''} 첫 1등이 되어 보세요!</span></div>`;
    const top = [list[1], list[0], list[2]], medal = ['#9aa5b1', '#f5a524', '#c8783a'];
    const pod = `<div class="rk-pod">${top.map((x, i) => { const n = [2, 1, 3][i]; return x ? `<div class="rk-p r${n}${x.me ? ' me' : ''}"><div class="rk-av" style="background:${rkColor(x.name)}">${esc([...x.name][0] || '?')}<i style="background:${medal[i]}">${n}</i></div><b>${esc(x.name)}</b><small>${x.v.toLocaleString()}점</small><div class="rk-ped">${n}</div></div>` : '<div></div>'; }).join('')}</div>`;
    const max = list[0].v || 1;
    const rest = list.slice(3).map((x, i) => `<div class="rk-row${x.me ? ' me' : ''}"><span>${i + 4}</span><b>${esc(x.name)} <small class="muted">${x.ok}개 · ${x.combo}연속</small></b><em>${x.v.toLocaleString()}점</em><div class="rk-bar"><i style="width:${Math.round(x.v / max * 100)}%"></i></div></div>`).join('');
    return `${myLine}${pod}${rest ? `<div class="rk-list">${rest}</div>` : ''}<p class="muted wq-note">${r.per === 'week' ? '월요일마다 새로 시작해요. ' : ''}${(+d.total || 0).toLocaleString()}명 참가 · 같은 점수면 먼저 세운 기록이 앞서요.</p>`;
  }
  async function wqRename() {
    const v = await ask('랭킹에 보일 이름 (12자까지)\n다른 사람도 볼 수 있으니 실명 대신 별명을 써도 좋아요.', { input: wqName(), ok: '저장' });
    if (v == null) return;
    const nm = String(v).replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 12);
    if (!nm) return toast('이름을 적어 주세요.');
    config.gameName = nm; syncStorage();
    if (wqCloud()) { try { await Cloud.call('voca_game_name', { p_name: nm }); } catch (e) {} }
    toast('랭킹 이름을 바꿨어요.');
    if (WQ) (WQ.view === 'rank' ? wqRank : WQ.view === 'lobby' ? wqLobby : () => {})();
  }
  function wqClick(e) {
    const b = e.target.closest('[data-wq]'); if (!b || b.disabled || !WQ) return;
    const a = b.dataset.wq, g = WQ;
    if (a === 'x') return wqClose();
    if (a === 'quit') { clearInterval(g.timer); return wqEnd(); }
    if (a === 'lobby') { clearInterval(g.timer); clearTimeout(g.cd); return wqLobby(); }
    if (a === 'lv') { g.lv = b.dataset.k; return wqLobby(); }
    if (a === 'lang' || a === 'rk-lang') {
      g.lang = b.dataset.l === 'zh' ? 'zh' : 'en'; if (g.lv === 'my' && g.lang !== LANG) g.lv = 'l2';
      if (g.lang === 'zh' && !zhIdx) zhLoad().then(() => { if (WQ === g && g.view === 'lobby') wqLobby(); });
      return a === 'lang' ? wqLobby() : wqRank();
    }
    if (a === 'go') return wqStart();
    if (a === 'go-lv') return wqStart();
    if (a === 'pick') return wqPick(+b.dataset.i);
    if (a === 'rank') return wqRank();
    if (a === 'rk-lv') { g.lv = b.dataset.k; return wqRank(); }
    if (a === 'rk-per') { g.rk.per = b.dataset.v; return wqRank(); }
    if (a === 'rk-scope') { g.rk.scope = b.dataset.v; return wqRank(); }
    if (a === 'rename') return wqRename();
    if (a === 'share') return shareOut(wqShareText(), 'VocaPro 단어 대결');
    if (a === 'share-rank') return shareOut(`VocaPro ${wqLvName(g.lang, g.lv)} 랭킹 ${b.dataset.r}위! 나랑 겨뤄 볼래?`, 'VocaPro 랭킹');
  }
  ACTIONS.wordquiz = wqOpen;
  function wqEntryHtml() {
    const L = loadJson(wqKey()) || {}, b = Object.entries(L.best || {}).filter(([k]) => k.startsWith(LANG + ':') && !k.endsWith(':my')).reduce((m, [, v]) => Math.max(m, +v.score || 0), 0);
    return `<button class="mg-entry wq-entry" data-act="wordquiz"><span class="mg-ico">${IC.trophy}</span><span class="mg-txt"><b>단어 맞추기 대결</b><small>60초 스피드 퀴즈${b ? ` · 내 최고 ${b.toLocaleString()}점` : ', 랭킹에 도전해요'}</small></span><span class="wq-tag">랭킹</span><span class="mg-chev"></span></button>`;
  }
  ACTIONS['wq-rank'] = () => { wqOpen(); wqRank(); };
  document.addEventListener('keydown', e => {
    if (!WQ || !$('wqOv') || document.querySelector('.dlg-ov')) return;
    if (WQ.view === 'play' && /^[1-4]$/.test(e.key)) { e.preventDefault(); e.stopImmediatePropagation(); wqPick(+e.key - 1); }
    else if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); if (WQ.view === 'play') { clearInterval(WQ.timer); wqEnd(); } else if (WQ.view === 'lobby') wqClose(); else { clearInterval(WQ.timer); clearTimeout(WQ.cd); wqLobby(); } }
    else if (e.key === 'Enter' && (WQ.view === 'lobby' || WQ.view === 'end') && !(e.target.closest && e.target.closest('button, input, a, select, textarea'))) { e.preventDefault(); e.stopImmediatePropagation(); wqStart(); }
  }, true);

  /* ----- 문장 빈칸 ----- */
  const reEsc = x => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  function clozeOf(w) {
    const ex = String(w.example || ''), wd = String(w.word || '').trim(); if (!ex || !wd) return null;
    if (isHanWord(wd)) { const i = ex.indexOf(wd); return i < 0 ? null : { before: ex.slice(0, i), hit: wd, after: ex.slice(i + wd.length) }; }
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
          <div class="cloze-s">${esc(c.before)}<span class="cloze-b">${'_'.repeat(Math.min(10, Math.max(4, isHanWord(c.hit) ? c.hit.length * 2 : c.hit.length)))}</span>${esc(c.after)}</div>
          ${w.exampleKo ? `<div class="q-sub">${esc(w.exampleKo)}</div>` : ''}
        </div>
        <div class="opts">${S.options.map((o, i) => `<button class="opt" data-act="opt" data-i="${i}"><span class="opt-n">${i + 1}</span><span>${esc(o.word)}</span></button>`).join('')}</div>
      </div>`;
    return true;
  }

  /* ----- 문장 배열: 예문을 단어 조각으로 섞어 두고, 순서대로 눌러 문장을 완성해요 (클래스카드 문장 학습) ----- */
  function senTokens(w) {
    const ex = String(w.example || '').trim(), wd = String(w.word || '').trim(); if (!ex || !wd) return null;
    let t;
    if (isHanWord(wd)) {
      // 띄어쓰기가 없는 중국어는 HSK 사전에서 가장 긴 단어부터 잘라요(최대 4글자). 문장부호는 앞 조각에 붙여요.
      const x = ex.replace(/\s+/g, ''); t = []; let i = 0;
      while (i < x.length) {
        let L = 1;
        if (x.startsWith(wd, i)) L = wd.length;
        else if (zhMap) { L = Math.min(4, x.length - i); while (L > 1 && !zhMap.has(x.substr(i, L))) L--; }
        const piece = x.substr(i, L); i += L;
        if (/^[\p{P}\p{S}]+$/u.test(piece) && t.length) t[t.length - 1] += piece; else t.push(piece);
      }
    } else t = ex.split(/\s+/).filter(Boolean);
    return t.length >= 3 && t.length <= 14 ? t : null;
  }
  function renderSentence(item) {
    const w = item.w, toks = senTokens(w);
    if (!toks) return renderChoice(item, false);
    let order = shuffled(toks.map((_, i) => i)); if (order.every((v, i) => v === i)) order = order.slice().reverse();
    S.sen = { toks, order, picked: [] };
    $('stBody').innerHTML = `
      <div class="q-wrap">
        <div class="q-card sen-card">
          <div class="q-label">${isHanWord(w.word) ? '조각을 순서대로 눌러 중국어 문장을 만드세요' : '단어를 순서대로 눌러 영어 문장을 만드세요'}</div>
          ${w.exampleKo ? `<div class="sen-ko">${esc(w.exampleKo)}</div>` : ''}
          <div class="sen-key"><b>${esc(w.word)}</b><span>${esc(w.meaning)}</span></div>
        </div>
        <div class="sen-line" id="senLine" aria-live="polite"></div>
        <div class="sen-tiles" id="senTiles"></div>
        <div id="typeFeedback"></div>
        <div class="row q-foot"><button class="btn btn-soft" data-act="sen-reset">처음부터</button><button class="btn btn-soft" data-act="sen-skip">모르겠어요</button></div>
      </div>`;
    senDraw();
  }
  function senDraw() {
    const s = S.sen, line = $('senLine'); if (!line) return;
    line.classList.toggle('on', s.picked.length > 0);
    line.innerHTML = s.picked.length ? s.picked.map((i, k) => `<button class="sen-chip" data-act="sen-unpick" data-k="${k}">${esc(s.toks[i])}</button>`).join('') : '<span class="sen-ph">여기에 문장이 만들어져요</span>';
    $('senTiles').innerHTML = s.order.map(i => `<button class="sen-chip" data-act="sen-pick" data-i="${i}"${s.picked.includes(i) ? ' disabled' : ''}>${esc(s.toks[i])}</button>`).join('');
  }
  ACTIONS['sen-pick'] = el => {
    if (!S.active || S.locked || !S.sen) return;
    const s = S.sen, i = +el.dataset.i; if (s.picked.includes(i)) return;
    s.picked.push(i); senDraw();
    if (s.picked.length === s.toks.length) senDone(s.picked.map(j => s.toks[j]).join(' ') === s.toks.join(' '));
  };
  ACTIONS['sen-unpick'] = el => { if (!S.active || S.locked || !S.sen) return; S.sen.picked.splice(+el.dataset.k, 1); senDraw(); };
  ACTIONS['sen-reset'] = () => { if (!S.active || S.locked || !S.sen) return; S.sen.picked = []; senDraw(); };
  ACTIONS['sen-skip'] = () => { if (!S.active || S.locked || !S.sen) return; senDone(false); };
  function senDone(ok) {
    S.locked = true; const item = S.queue[S.idx], w = item.w, s = S.sen;
    $('stBody').querySelectorAll('.sen-chip, .q-foot .btn').forEach(b => { b.disabled = true; });
    $('senLine').classList.add(ok ? 'ok' : 'bad');
    const hl = s.toks.map(x => { const hit = isHanWord(w.word) ? x.startsWith(w.word) : x.toLowerCase().replace(/[^a-z'-]/g, '').startsWith(w.word.toLowerCase().slice(0, Math.max(3, w.word.length - 2))); return hit ? `<u>${esc(x)}</u>` : esc(x); }).join(isHanWord(w.word) ? '' : ' ');
    $('typeFeedback').innerHTML = ok ? `<div class="fb ok"><span class="ans-ic">${IC.tick}</span><div>완벽한 문장이에요!<div class="fb-sub sen-ans">${hl}</div></div></div>`
      : `<div class="fb bad"><span class="ans-ic">${IC.x}</span><div>이렇게 써요<div class="fb-sub sen-ans">${hl}</div></div></div>`;
    playAudio(w.example); recordResult(item, ok);
    const my = S.idx; setTimeout(() => { if (S.active && S.idx === my) nextQuestion(); }, ok ? 1500 : 2600);
  }

  /* ----- 기기 음성 AI (영어): asr/vp-asr.js 를 Web Worker 로 돌려요. 처음 한 번 모델(약 57MB)을 받아 이 기기에 저장해요 ----- */
  const VPA = (() => {
    // 언어마다 모델이 따로예요(영어 · 중국어). 쓰는 언어만 받아요
    let w = null, seq = 0; const initP = {}, ready = {}, prog = { en: 0, zh: 0 }, wait = new Map(), subs = { en: new Set(), zh: new Set() };
    const L = l => l === 'zh' ? 'zh' : 'en';
    const ok = () => typeof Worker === 'function' && typeof WebAssembly === 'object' && typeof BigInt64Array === 'function' && 'caches' in window && typeof TextDecoder === 'function';
    function fail(msg) { const e = new Error(msg || '기기 음성 AI를 시작하지 못했어요.'); wait.forEach(x => x.no(e)); wait.clear(); return e; }
    const tell = (l, p) => subs[l].forEach(f => { try { f(p); } catch (x) {} });
    function worker() {
      if (w) return w;
      w = new Worker('asr/vp-asr.js');
      w.onmessage = e => {
        const m = e.data || {}, l = L(m.lang);
        if (m.type === 'progress') { prog[l] = m.p; tell(l, m.p); }
        else if (m.type === 'ready') { ready[l] = true; prog[l] = 100; tell(l, 100); const x = wait.get('init:' + l); if (x) { wait.delete('init:' + l); x.ok(); } }
        else if (m.type === 'result' || m.type === 'error') {
          const k = m.id != null ? m.id : 'init:' + l, x = wait.get(k); if (!x) return; wait.delete(k);
          if (m.type === 'result') x.ok(m); else x.no(new Error(m.msg || '음성 AI 오류'));
        }
      };
      w.onerror = () => { fail(); try { w.terminate(); } catch (x) {} w = null; for (const k of ['en', 'zh']) { initP[k] = null; ready[k] = false; } };
      return w;
    }
    function init(onProg, lang) {
      const l = L(lang);
      if (onProg) { subs[l].add(onProg); onProg(prog[l]); }
      if (ready[l]) return Promise.resolve();
      if (!ok()) return Promise.reject(new Error('이 브라우저에서는 기기 음성 AI를 쓸 수 없어요. 최신 Chrome · Edge · Safari에서 열어 주세요.'));
      if (!initP[l]) initP[l] = new Promise((res, rej) => { wait.set('init:' + l, { ok: res, no: rej }); worker().postMessage({ cmd: 'init', lang: l }); }).catch(e => { initP[l] = null; throw e; });
      return initP[l];
    }
    // pcm: 16kHz Float32Array, items: [{ text, kind: 'w' | 's', idx }], lang: 'en' | 'zh' -> { items: [{ score, acc, flu, comp, heard, tips, problems, words }], heard }
    async function score(pcm, items, lang) {
      const l = L(lang); await init(null, l);
      return new Promise((res, rej) => { const id = ++seq; wait.set(id, { ok: res, no: rej }); const y = new Float32Array(pcm); worker().postMessage({ cmd: 'score', id, lang: l, pcm: y, items }, [y.buffer]); });
    }
    const off = (f, lang) => { if (lang) subs[L(lang)].delete(f); else { subs.en.delete(f); subs.zh.delete(f); } };
    return { ok, init, score, off, isReady: lang => !!ready[L(lang)], get ready() { return !!ready.en; } };
  })();
  // 처음 한 번 받는 크기(MB): 영어 모델 + 실행기 57, 중국어 모델 63(+ 실행기 11, 영어를 먼저 받았으면 빼요)
  const vpaMB = lang => lang === 'zh' ? (VPA.isReady('en') ? 63 : 74) : (VPA.isReady('zh') ? 46 : 57);
  const vpaLang = text => /[\u3400-\u9fff]/.test(String(text || '')) ? 'zh' : 'en';
  // 연습용 마이크: 말이 끝나면(0.7초 조용하면) 자동으로 멈춰요. 최대 maxSec 초
  const VPM = { ctx: null, stream: null, R: null };
  async function vpMicStart(maxSec, onLevel, onEnd) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || !window.isSecureContext) throw { code: 'unsupported' };
    if (!VPM.ctx) VPM.ctx = new AC();
    if (VPM.ctx.state === 'suspended') await VPM.ctx.resume().catch(() => {});
    try { VPM.stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true } }); }
    catch (e) { throw { code: e && (e.name === 'NotAllowedError' || e.name === 'SecurityError') ? 'denied' : e && (e.name === 'NotFoundError' || e.name === 'OverconstrainedError') ? 'nomic' : 'unsupported' }; }
    if (VPM.ctx.state !== 'running') await VPM.ctx.resume().catch(() => {});
    const ctx = VPM.ctx, src = ctx.createMediaStreamSource(VPM.stream), proc = ctx.createScriptProcessor(4096, 1, 1), mute = ctx.createGain();
    mute.gain.value = 0;
    const R = { chunks: [], n: 0, max: Math.ceil(maxSec * ctx.sampleRate), spoke: false, quiet: 0, onEnd };
    proc.onaudioprocess = e => {
      if (VPM.R !== R) return;
      const d = e.inputBuffer.getChannelData(0); let sq = 0; for (let i = 0; i < d.length; i += 4) sq += d[i] * d[i];
      const lv = Math.min(1, Math.sqrt(sq / (d.length / 4)) * 6); if (onLevel) onLevel(lv);
      if (R.n < R.max) { const c = d.subarray(0, Math.min(d.length, R.max - R.n)); R.chunks.push(new Float32Array(c)); R.n += c.length; }
      if (lv > 0.12) { R.spoke = true; R.quiet = 0; } else if (R.spoke) R.quiet += d.length / ctx.sampleRate;
      if (R.n >= R.max || (R.spoke && R.quiet > 0.7)) vpMicStop();
    };
    src.connect(proc); proc.connect(mute); mute.connect(ctx.destination);
    Object.assign(R, { src, proc, mute }); VPM.R = R;
  }
  function vpMicStop(drop) {
    const R = VPM.R; if (!R) return; VPM.R = null;
    try { R.src.disconnect(); R.proc.disconnect(); R.mute.disconnect(); } catch (e) {}
    R.proc.onaudioprocess = null;
    if (VPM.stream) { VPM.stream.getTracks().forEach(t => t.stop()); VPM.stream = null; }
    if (!drop && R.onEnd) R.onEnd(spPcm(R.chunks, VPM.ctx.sampleRate));
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
    if (isHanWord(target)) { const h = String(heard || '').replace(HAN_G, ''), t = String(target).replace(HAN_G, ''); return !!t && h.includes(t); }
    const h = spkNorm(spkWords(heard)), t = spkNorm(target);
    if (!h || !t) return false;
    const hs = h.replace(/ /g, ''), ts = t.replace(/ /g, '');
    if (hs === ts || h.split(' ').includes(t) || (t.includes(' ') && h.includes(t))) return true;
    const parts = t.includes(' ') ? [h] : h.split(' ').concat(h);
    return parts.some(p => { const ps = p.replace(/ /g, ''); if (!ps) return false; if (spkSame(ps, ts)) return true; return ts.length >= 5 && spkDist(ps, ts) <= (ts.length >= 9 ? 2 : 1); });
  }
  const SPK_FATAL = { 'not-allowed': '마이크 사용이 막혀 있어요. 주소창의 자물쇠를 눌러 마이크를 허용해 주세요.', 'service-not-allowed': '이 브라우저는 음성 인식을 막아 두었어요.', network: '음성 인식 서버에 연결하지 못했어요.', 'audio-capture': '마이크를 찾지 못했어요.', 'language-not-supported': '이 기기는 이 언어의 음성 인식을 지원하지 않아요.' };
  let spkSelf = false;
  // 영어 단어는 기기 음성 AI로 들어요(서버 · 구글 음성 인식 없이). 중국어나 기기 AI를 못 쓰면 브라우저 음성 인식, 그것도 안 되면 스스로 확인
  const spkLocal = w => !spkSelf && VPA.ok() && !S.vpaOff;
  function renderSpeak(item) {
    const w = item.w; S.tries = 0;
    if (spkLocal(w)) VPA.init(null, vpaLang(w.word)).catch(() => {}); // 미리 받아 둬요
    const self = !spkLocal(w) && (spkSelf || !SR);
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
  // 말하기 연습 점수 아래: 정확성 · 유창성 (문장은 일치도도)
  const spkAFHtml = x => x && typeof x.acc === 'number' ? `<div class="sp-sub spk-af"><span>정확성 <b>${esc(x.acc)}</b></span><span>유창성 <b>${esc(x.flu)}</b></span>${x.comp != null && x.comp < 100 ? `<span class="sp-comp part">일치도 <b>${esc(x.comp)}%</b></span>` : ''}</div>` : '';
  function spkStop() { const r = SPK; SPK = null; clearTimeout(S.spkT); vpMicStop(true); if (S.vpaProg) { VPA.off(S.vpaProg); S.vpaProg = null; } if (r) { try { r.onresult = r.onerror = r.onend = null; r.abort(); } catch (e) {} } }
  function spkLocalFail(msg) {
    S.vpaOff = true;
    if (!SR) return spkFallback(msg);
    toast(msg + ' 브라우저 음성 인식으로 바꿀게요.'); if (S.active && S.mode === 'speak' && !S.locked) renderSpeak(S.queue[S.idx]);
  }
  // 기기 AI로 듣기: 누르면 녹음(말이 끝나면 자동으로 멈춤) -> 채점 -> 맞으면 다음 문제
  async function spkLocalGo(item) {
    const out = $('spkOut'), btn = $('micBtn'); if (!out || !btn) return;
    const mine = () => S.active && S.queue[S.idx] === item && !S.locked;
    if (VPM.R) { vpMicStop(); return; } // 말하는 중에 다시 누르면 바로 멈춰요
    const lang = vpaLang(item.w.word);
    if (!VPA.isReady(lang)) {
      btn.disabled = true;
      const mb = vpaMB(lang), pg = p => { if (mine() && $('spkOut')) $('spkOut').innerHTML = `${lang === 'zh' ? '중국어 ' : ''}음성 AI 준비 중 <b>${p}%</b><br><small>처음 한 번만 받아요(약 ${mb}MB). 와이파이를 권해요.</small>`; };
      S.vpaProg = pg;
      try { await VPA.init(pg, lang); } catch (e) { VPA.off(pg); S.vpaProg = null; if (!mine()) return; btn.disabled = false; return spkLocalFail((e && e.message) || '음성 AI를 받지 못했어요.'); }
      VPA.off(pg); S.vpaProg = null; if (!mine()) return;
      btn.disabled = false;
    }
    try { window.speechSynthesis.cancel(); } catch (e) {}
    try {
      await vpMicStart(sentLike(item.w.word) ? 10 : /\s/.test(item.w.word.trim()) ? 8 : 4, lv => { const b = $('micBtn'); if (b) b.style.setProperty('--lv', lv.toFixed(2)); }, async pcm => {
        const b = $('micBtn'), o = $('spkOut'); if (b) b.classList.remove('on');
        if (!mine() || !o) return;
        if (!pcm) { o.textContent = '소리가 들리지 않았어요. 마이크 가까이에서 다시 눌러 말해 주세요.'; return; }
        o.textContent = '듣고 확인하는 중...'; if (b) b.disabled = true;
        let r; try { r = await VPA.score(pcm.y, [{ text: item.w.word, kind: sentLike(item.w.word) || /\s/.test(item.w.word.trim()) || (lang === 'zh' && [...item.w.word].length > 4) ? 's' : 'w' }], lang); }
        catch (e) { if (mine() && $('micBtn')) { $('micBtn').disabled = false; $('spkOut').textContent = '확인하지 못했어요. 다시 눌러 주세요.'; } return; }
        if (!mine()) return;
        if (b) b.disabled = false;
        const x = r.items && r.items[0], sc = x ? x.score : 0, heard = (x && x.heard) || r.heard || '';
        const ok = sc >= 55 || (sc >= 35 && spkMatch(heard, item.w.word));
        S.tries = (S.tries || 0) + 1;
        if (ok) {
          S.locked = true; $('spkOut').innerHTML = `<b class="ok">정확해요!</b> 발음 ${esc(sc)}점${heard ? ` · "${esc(heard)}"` : ''}${spkAFHtml(x)}`; recordResult(item, true);
          const my = S.idx; setTimeout(() => { if (S.active && S.idx === my) nextQuestion(); }, 1800);
        } else $('spkOut').innerHTML = `<b class="bad">${heard ? `"${esc(heard)}"(으)로 들렸어요.` : '잘 들리지 않았어요.'}</b> 발음 ${esc(sc)}점 · ${S.tries >= 3 ? '넘어가도 괜찮아요.' : '원어민 발음을 듣고 다시 말해 볼까요?'}${spkAFHtml(x)}`;
      });
      btn.classList.add('on'); out.textContent = '듣고 있어요... 말이 끝나면 자동으로 멈춰요';
    } catch (e) {
      if (!mine()) return;
      if (e && e.code === 'denied') return spkFallback(SP_MIC_ERR.denied);
      spkLocalFail(SP_MIC_ERR[(e && e.code) || 'unsupported'] || '마이크를 시작하지 못했어요.');
    }
  }
  function spkFallback(why) {
    spkStop(); spkSelf = true; S.spkWhy = why + ' 이번에는 스스로 확인하는 방식으로 바꿀게요.';
    if (S.active && S.mode === 'speak' && !S.locked) renderSpeak(S.queue[S.idx]);
  }
  ACTIONS['spk-go'] = () => {
    if (!S.active || S.locked) return;
    if (spkLocal(S.queue[S.idx].w)) return spkLocalGo(S.queue[S.idx]);
    if (!SR) return;
    const item = S.queue[S.idx], out = $('spkOut'), btn = $('micBtn'); if (!out || !btn) return;
    spkStop();
    try { window.speechSynthesis.cancel(); } catch (e) {}
    let r; try { r = new SR(); } catch (e) { return spkFallback('이 브라우저에서는 음성 인식을 시작할 수 없어요.'); }
    SPK = r; r.lang = ttsLang(item.w.word); r.maxAlternatives = 5; r.interimResults = false; r.continuous = false;
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
  // 중국어 단어는 한자로 써도, 병음으로 써도 맞아요 (성조와 띄어쓰기는 안 봐요).
  function answerOk(typed, w) {
    if (!isHanWord(w.word)) return norm(typed) === norm(w.word);
    const t = String(typed || '').trim(); if (!t) return false;
    if (HAN.test(t)) return t.replace(HAN_G, '') === w.word.replace(HAN_G, '');
    return !!w.phonetic && !!pyPlain(t) && pyPlain(t) === pyPlain(w.phonetic);
  }
  const spellOk = w => isHanWord(w.word) ? /^[\u3400-\u9fff]{1,6}$/.test(w.word) : /^[a-z][a-z'-]{0,13}$/i.test(w.word);
  function renderTyping(item, dictation) {
    const w = item.w;
    const zh = isHanWord(w.word);
    const hint = zh ? '□'.repeat(w.word.length) : w.word.split('').map((ch, i) => ch === ' ' ? '  ' : (i === 0 ? ch : '_')).join(' ');
    $('stBody').innerHTML = `
      <div class="q-wrap">
        <div class="q-card">
          ${dictation
            ? `<div class="q-label">들리는 단어를 입력하세요</div><button class="q-speak big" data-act="speak" data-text="${esc(w.word)}" aria-label="다시 듣기">${IC.speaker}</button><div class="q-sub">눌러서 다시 들을 수 있어요</div>`
            : `<div class="q-label">이 뜻의 ${zh ? '중국어' : '영어'} 단어를 쓰세요</div><div class="q-meaning">${esc(w.meaning)}</div><div class="q-hint">${esc(hint)}</div>${zh ? '<div class="q-sub">병음(성조 없이)이나 한자로 써요</div>' : ''}`}
        </div>
        <input type="text" id="typeInput" class="type-input" autocomplete="off" autocapitalize="none" autocorrect="off" spellcheck="false" placeholder="${zh ? '병음(예: xuexi) 또는 한자' : '여기에 입력'}">
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
      ? `<div class="fb ok"><span class="ans-ic">${IC.tick}</span><div>정답이에요! <b>${esc(w.word)}</b>${isHanWord(w.word) && w.phonetic ? ` ${esc(w.phonetic)}` : ''}<div class="fb-sub">${esc(w.meaning)}</div></div></div>`
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
    showTypeResult(answerOk(typed, S.queue[S.idx].w), typed);
  };
  ACTIONS['type-skip'] = () => { if (!S.active || S.answered) return; if (S.mode === 'test') return examType(''); showTypeResult(false, ''); };
  function examType(typed) {
    const item = S.queue[S.idx], ok = !!typed && answerOk(typed, item.w);
    S.answered = true; S.log.push({ w: item.w, t: item.t, ok, your: typed.trim() });
    recordResult(item, ok); nextQuestion();
  }
  document.addEventListener('keydown', e => {
    if (e.key === 'Enter' && S.active && (S.mode === 'spell' || S.mode === 'dict' || ((S.mode === 'test' || S.mode === 'mix') && $('typeInput'))) && !S.finished) {
      if (e.target.id === 'typeInput' || S.answered) { e.preventDefault(); ACTIONS['type-submit'](); }
    }
  });

  /* ----- 결과 ----- */
  function finishGuideAdvance(answeredCount, examPct) {
    const gr = S.guideRun;
    if (!gr || gr.mode !== S.mode || answeredCount < 1) return { msg: '', nextStep: null };
    const i = gr.step;
    if (S.mode === 'test' && examPct < 80) {
      return { msg: '80점을 넘으면 완료돼요. 한 번 더 도전해 봐요!', nextStep: null };
    }
    const next = Math.min(7, i + 1);
    if (guideStepFor(gr.key) <= i) setGuideStep(gr.key, next);
    const msg = next < 7 ? `추천 ${i + 1}단계 완료! 다음은 ${GUIDE[next][1]}예요.` : '추천 7단계를 모두 완료했어요!';
    return { msg, nextStep: next < 7 ? next : null, key: gr.key };
  }
  ACTIONS['guide-next-step'] = el => {
    const step = parseInt(el.dataset.step, 10), key = el.dataset.key || studyPrefs.src;
    if (!GUIDE[step]) return exitSession(true);
    const mode = GUIDE[step][0];
    pendingGuideRun = { key, step, mode };
    startSession(mode, parseSrc(key), S.baseCount != null ? S.baseCount : S.count);
  };

  function finishSession() {
    if (S.mode === 'test') return finishExam();
    S.finished = true;
    kbdHint('');
    try { window.speechSynthesis.cancel(); } catch (e) {}
    $('stProg').style.width = '100%';
    $('stCount').textContent = '';
    const first = S.ok + S.no;
    const pct = first ? Math.round(S.ok / first * 100) : 0;
    const gRes = finishGuideAdvance(first, pct);
    const mRes = S.course != null ? mcAdvance() : null;
    const mood = pct >= 90 ? 'cheer' : pct >= 70 ? 'happy' : 'think';
    const title = pct >= 90 ? '완벽해요!' : pct >= 70 ? '아주 잘했어요' : pct >= 40 ? '조금만 더 하면 돼요' : '괜찮아요, 다시 해봐요';
    const st = streak();
    const goal = config.goal || 20;
    const todayN = (stats.days[dayKey()] || { n: 0 }).n;
    const goalHit = todayN >= goal;
    const wrongs = [...S.wrong.values()];
    const label = S.mode === 'card' ? '알아요' : '정답';
    $('stBody').innerHTML = `
      <div class="result">
        <div class="result-art">${MASCOT(mood)}</div>
        <h2>${title}</h2>
        ${gRes.msg ? `<div class="res-guide-msg">${esc(gRes.msg)}</div>` : ''}
        <div class="score">${S.ok} / ${first}</div>
        <div class="result-stats"><div><b>${pct}%</b><span>${label}</span></div><div class="st-streak"><b>${st}일</b><span>연속 학습</span></div><div class="${goalHit ? 'hit' : ''}"><b>${todayN}/${goal}</b><span>${goalHit ? '목표 달성!' : '오늘 목표'}</span></div></div>
        ${wrongs.length ? `<div class="card result-box"><div class="res-wrong-head"><b style="font-size:.95rem;">틀린 단어 ${wrongs.length}개</b><small>오답노트에 담았어요</small></div>${wrongs.map(it => `<div class="wrong-item"><b>${esc(it.w.word)}</b><span>${esc(it.w.meaning)}</span><button class="w-speak" data-act="speak" data-text="${esc(it.w.word)}" aria-label="발음 듣기">${IC.speaker}</button></div>`).join('')}</div>` : '<div class="card result-box" style="text-align:center;">틀린 단어가 없어요. 대단해요!</div>'}
        <button class="link-btn res-share" data-act="share-result" data-text="${esc(`VocaPro에서 영어 단어 ${first}개를 공부했어요. 정답률 ${pct}%${st > 1 ? `, ${st}일 연속 공부 중` : ''}! 같이 할래?`)}">${IC.users} 결과 공유하기</button>
        <div class="row" style="margin-top:6px;">
          ${wrongs.length ? '<button class="btn btn-soft" data-act="retry-wrong">틀린 것만 다시</button>' : '<button class="btn btn-soft" data-act="again">한 번 더</button>'}
          ${mRes && mRes.next != null
            ? `<button class="btn btn-primary" data-act="mc-next">다음: ${esc(mRes.name)}</button>`
            : mRes ? '<button class="btn btn-primary" data-act="exit-session">오늘 맞춤 학습 끝</button>'
            : gRes.nextStep != null
            ? `<button class="btn btn-primary" data-act="guide-next-step" data-step="${gRes.nextStep}" data-key="${esc(gRes.key)}">다음 단계 하기</button>`
            : '<button class="btn btn-primary" data-act="exit-session">마치기</button>'}
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
    const gRes = finishGuideAdvance(n, pct);
    S.wrong = new Map(S.log.filter(x => !x.ok).map(x => [x.w.id, { w: x.w }]));
    $('stBody').innerHTML = `
      <div class="result exam-result">
        <div class="exam-badge g-${g}"><b>${g}</b><span>${gt}</span></div>
        ${gRes.msg ? `<div class="res-guide-msg">${esc(gRes.msg)}</div>` : ''}
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
    const base = S.baseCount != null ? S.baseCount : S.count;
    startSession(S.mode, S.src, 0, items); S.baseCount = base;
  };
  // 다시 하기: 반 과제였으면 다시 푼 결과도 선생님에게 보내요(가장 높은 점수가 남아요)
  ACTIONS.again = () => { const a = S.assign; startSession(S.mode, S.src, S.baseCount != null ? S.baseCount : S.count); if (S.active && a) S.assign = a; };

  async function exitSession(force) {
    if (!force && S.active && !S.finished && S.idx > 0 && S.mode !== 'listen') {
      if (!await ask('학습을 그만할까요?\n지금까지 푼 결과는 저장돼 있어요.', { ok: '그만하기' })) return;
    }
    L.token++;
    try { window.speechSynthesis.cancel(); } catch (e) {}
    S.active = false; spkStop(); listenKeep(false);
    $('studyScreen').classList.remove('open');
    if (!$('sheetOv').classList.contains('open')) document.body.classList.remove('no-scroll');
    go(curTab); clPing(true);
  }
  ACTIONS['exit-session'] = () => exitSession(false);

  /* ----- 듣기 모드 ----- */
  let L = { token: 0, items: [], i: 0, playing: false, example: true, exKo: false };
  function startListen() {
    L = { token: L.token + 1, items: S.queue, i: 0, playing: true, example: L.example !== false, exKo: !!L.exKo };
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
          ${w.example ? `<div class="q-sub">${esc(w.example)}${exPyHtml(w)}${w.exampleKo ? `<br><span class="ex-ko">${esc(w.exampleKo)}</span>` : ''}</div>` : ''}
        </div>
        <div class="player">
          <button data-act="l-prev" aria-label="이전">${IC.prev}</button>
          <button class="play" data-act="l-toggle" aria-label="재생/일시정지">${L.playing ? IC.pause : IC.play}</button>
          <button data-act="l-next" aria-label="다음">${IC.next}</button>
        </div>
        <div class="l-speed" role="group" aria-label="읽기 속도">
          <span>속도</span><button data-act="l-rate" data-d="-1" aria-label="느리게">−</button><b>${clampN(config.ttsRate, .5, 2, .9).toFixed(2)}x</b><button data-act="l-rate" data-d="1" aria-label="빠르게">+</button>
          <i class="l-br"></i>${[.6, .8, 1, 1.2, 1.5].map(r => `<button class="chip${Math.abs(r - clampN(config.ttsRate, .5, 2, .9)) < .001 ? ' on' : ''}" data-act="l-rate" data-v="${r}">${r}x</button>`).join('')}
        </div>
        <div class="l-opts">
          <label class="switch-row"><input type="checkbox" ${L.example ? 'checked' : ''} data-change="listen-ex"> 예문도 읽어주기</label>
          <label class="switch-row"><input type="checkbox" ${L.exKo ? 'checked' : ''} data-change="listen-exko"> 예문 해석도</label>
        </div>
        <p class="l-bg muted">${/iPhone|iPad|iPod/.test(navigator.userAgent) ? '아이폰은 화면이 켜져 있는 동안 읽어요. 듣는 동안은 화면이 저절로 꺼지지 않아요.' : '다른 앱으로 가거나 화면을 꺼도 이어서 읽어요. 잠금 화면에서 멈춤 · 다음을 누를 수 있어요.'}</p>
      </div>`;
  }
  // 화면을 끄거나 다른 앱으로 가도 이어서 읽어요: 소리 없는 오디오를 함께 틀어 두면 브라우저가 이 페이지를 재우지 않아요.
  // 잠금 화면 · 알림의 재생/멈춤/이전/다음 버튼(Media Session), 켜져 있는 동안은 화면이 저절로 꺼지지 않게(Wake Lock)
  let lsKeep = null, lsLock = null, lsUrl = '';
  function lsSilent() {
    if (lsUrl) return lsUrl;
    const n = 8000, b = new ArrayBuffer(44 + n), v = new DataView(b), str = (o, t) => [...t].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
    str(0, 'RIFF'); v.setUint32(4, 36 + n, true); str(8, 'WAVEfmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
    v.setUint32(24, 8000, true); v.setUint32(28, 8000, true); v.setUint16(32, 1, true); v.setUint16(34, 8, true); str(36, 'data'); v.setUint32(40, n, true);
    new Uint8Array(b, 44).fill(128);
    return (lsUrl = URL.createObjectURL(new Blob([b], { type: 'audio/wav' })));
  }
  function listenKeep(on) {
    const ms = 'mediaSession' in navigator ? navigator.mediaSession : null;
    if (on) {
      try { if (!lsKeep) { lsKeep = new Audio(lsSilent()); lsKeep.loop = true; lsKeep.setAttribute('playsinline', ''); } const p = lsKeep.play(); if (p && p.catch) p.catch(() => {}); } catch (e) {}
      if (ms) {
        try { ms.playbackState = 'playing'; } catch (e) {}
        const h = { play: () => { if (!L.playing) ACTIONS['l-toggle'](); }, pause: () => { if (L.playing) ACTIONS['l-toggle'](); }, nexttrack: () => ACTIONS['l-next'](), previoustrack: () => ACTIONS['l-prev'](), stop: () => { if (L.playing) ACTIONS['l-toggle'](); } };
        Object.keys(h).forEach(k => { try { ms.setActionHandler(k, h[k]); } catch (e) {} });
      }
      if ('wakeLock' in navigator && !lsLock && !document.hidden) navigator.wakeLock.request('screen').then(l => { lsLock = l; l.addEventListener('release', () => { if (lsLock === l) lsLock = null; }); }).catch(() => {});
    } else {
      try { if (lsKeep) lsKeep.pause(); } catch (e) {}
      if (ms) try { ms.playbackState = S.active && S.mode === 'listen' ? 'paused' : 'none'; } catch (e) {}
      if (lsLock) { try { lsLock.release(); } catch (e) {} lsLock = null; }
    }
  }
  function listenMeta(w) {
    if (!('mediaSession' in navigator) || typeof MediaMetadata !== 'function') return;
    try { navigator.mediaSession.metadata = new MediaMetadata({ title: w.word, artist: w.meaning, album: `VocaPro 듣기 ${L.i + 1}/${L.items.length}`, artwork: [{ src: 'icon-192.png', sizes: '192x192', type: 'image/png' }, { src: 'icon-512.png', sizes: '512x512', type: 'image/png' }] }); } catch (e) {}
  }
  document.addEventListener('visibilitychange', () => { if (!document.hidden && S.active && S.mode === 'listen' && L.playing) listenKeep(true); });
  async function listenLoop(token) {
    const alive = () => L.token === token && L.playing;
    if (alive()) listenKeep(true);
    while (alive() && L.i < L.items.length) {
      const w = L.items[L.i].w, wl = ttsLang(w.word), ref = voiceFor(wl), gap = clampN(config.gap, 0, 5, .9) * 1000, rep = Math.round(clampN(config.wordRep, 1, 3, 1));
      renderListen(); listenMeta(w);
      for (let k = 0; k < rep && alive(); k++) { if (k) await sleep(Math.max(250, gap / 2)); await speak(w.word, wl, { ref }); }
      if (!alive()) return;
      await sleep(Math.max(200, gap / 2));
      await speak(w.meaning.replace(/[()\[\]~]/g, ' ').replace(/;/g, ','), 'ko-KR', { ref });
      if (!alive()) return;
      if (L.example && w.example) {
        await sleep(Math.max(200, gap / 2.5));
        await speak(w.example, ttsLang(w.example), { ref });
        if (!alive()) return;
        if (L.exKo && w.exampleKo) { await sleep(Math.max(200, gap / 2.5)); await speak(w.exampleKo, 'ko-KR', { ref }); if (!alive()) return; }
      }
      await sleep(gap);
      if (!alive()) return;
      L.i++;
    }
    if (L.token === token && L.i >= L.items.length) {
      L.playing = false; L.i = L.items.length - 1; listenKeep(false);
      $('stProg').style.width = '100%';
      toast('한 바퀴 끝! 다시 들으려면 재생을 누르세요.');
      renderListen();
      L.i = 0;
    }
  }
  function listenRestart() { L.token++; try { window.speechSynthesis.cancel(); } catch (e) {} renderListen(); if (L.playing) listenLoop(L.token); }
  ACTIONS['l-toggle'] = () => {
    L.playing = !L.playing;
    if (!L.playing) { L.token++; try { window.speechSynthesis.cancel(); } catch (e) {} listenKeep(false); renderListen(); }
    else { L.token++; listenLoop(L.token); }
  };
  // 단어·예문 속도는 0.05씩, 한국어 뜻 속도도 같은 비율로 따라 움직여요.
  ACTIONS['l-rate'] = el => {
    const cur = clampN(config.ttsRate, .5, 2, .9), nx = el.dataset.v ? +el.dataset.v : Math.round((cur + (+el.dataset.d) * .05) * 100) / 100;
    config.ttsRate = clampN(nx, .5, 2, .9); syncStorage(); renderListen();
  };
  ACTIONS['l-next'] = () => { if (L.i < L.items.length - 1) { L.i++; listenRestart(); } };
  ACTIONS['l-prev'] = () => { if (L.i > 0) { L.i--; listenRestart(); } };

