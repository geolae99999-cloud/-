  /* =========================================================
   * 통계
   * ======================================================= */
  /* 주간 리포트: 이번 주(월~일)와 지난주를 stats.days 로 비교해요. m 은 그날 새로 마스터한 단어 수예요. */
  function weekReport() {
    const t0 = startOfDay(), di = (new Date(t0).getDay() + 6) % 7, mon = addDays(t0, -di);
    const wk = start => {
      const o = { n: 0, ok: 0, days: 0, m: 0, best: null };
      for (let i = 0; i < 7; i++) {
        const t = addDays(start, i), d = stats.days[dayKey(t)] || {}, n = d.n || 0;
        o.n += n; o.ok += d.ok || 0; o.m += d.m || 0;
        if (n > 0) { o.days++; if (!o.best || n > o.best.n) o.best = { t, n }; }
      }
      o.acc = o.n ? Math.round(o.ok / o.n * 100) : null; return o;
    };
    return { mon, left: 6 - di, cur: wk(mon), prev: wk(addDays(mon, -7)) };
  }
  // 바뀐 만큼 한 줄 응원. 숫자만 넣어서 esc 가 필요 없어요.
  function weekMsg(r) {
    const a = r.cur.n, b = r.prev.n, d = a - b;
    if (!a && !b) return '이번 주 첫 학습을 시작해 볼까요?';
    if (!b) return `이번 주 벌써 <em>${a}개</em> 공부했어요. 좋은 출발이에요!`;
    if (d > 0) return `지난주보다 <em>${d}개</em> 더 공부했어요. 대단해요!`;
    if (d === 0) return '지난주만큼 꾸준히 공부했어요. 멋져요!';
    if (!a) return `지난주엔 ${b}개 공부했어요. 이번 주도 시작해 볼까요?`;
    if (r.left > 0) return `지난주 기록까지 <em>${-d}개</em> 남았어요. 조금만 더 힘내요!`;
    return `지난주보다 ${-d}개 적었지만 괜찮아요. 다음 주에 다시 힘내요!`;
  }
  function weekReportHtml() {
    const r = weekReport(), c = r.cur, p = r.prev, mx = Math.max(c.n, p.n, 1);
    const md = t => `${new Date(t).getMonth() + 1}.${new Date(t).getDate()}`;
    // 늘면 초록 +, 줄면 깎아내리지 않고 지난주 값만 보여 줘요
    const delta = (x, y, u, pu = u) => x == null || y == null ? '' : x > y ? `<em class="up">지난주보다 +${x - y}${u}</em>` : x < y ? `<em>지난주 ${y}${pu}</em>` : '<em>지난주와 같아요</em>';
    const DOW = ['일', '월', '화', '수', '목', '금', '토'];
    const row = (lab, o, cls) => `<div class="wr-row ${cls}"><span>${lab}</span><div class="wr-track"><i style="width:${Math.round(o.n / mx * 100)}%"></i></div><b>${o.n}개</b></div>`;
    return `<section class="card wr" aria-label="주간 리포트">
        <div class="card-head"><b>주간 리포트</b><span class="muted wr-range">${md(r.mon)} – ${md(addDays(r.mon, 6))}</span></div>
        <p class="wr-msg">${weekMsg(r)}</p>
        <div class="wr-cmp">${row('이번 주', c, 'cur')}${row('지난주', p, 'prev')}</div>
        <div class="wr-kv">
          <div><span>정답률</span><b>${c.acc == null ? '–' : c.acc + '%'}</b>${delta(c.acc, p.acc, '%p', '%') || '<em>아직 기록이 없어요</em>'}</div>
          <div><span>학습한 날</span><b>${c.days}일</b>${delta(c.days, p.days, '일')}</div>
          <div><span>새로 마스터</span><b>${c.m}개</b>${delta(c.m, p.m, '개')}</div>
          <div><span>최고의 날</span><b>${c.best ? DOW[new Date(c.best.t).getDay()] + '요일' : '–'}</b><em>${c.best ? c.best.n + '개 학습' : '아직 없어요'}</em></div>
        </div>
      </section>`;
  }
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

    const tests = (stats.tests || []).slice(-8), allT = stats.tests || [], best = bestStreak();
    const badges = [
      [totalN >= 1, IC.sprout, '첫걸음', '처음으로 학습하기'], [totalN >= 100, IC.check, '100번 학습', '문제 100개 풀기'], [totalN >= 1000, IC.sparkles, '1000번 학습', '문제 1,000개 풀기'],
      [best >= 3, IC.flame, '3일 연속', '3일 연속 학습'], [best >= 7, IC.flame, '일주일 연속', '7일 연속 학습'], [best >= 30, IC.flame, '한 달 연속', '30일 연속 학습'],
      [c.mastered >= 10, IC.star, '마스터 10', '단어 10개 마스터'], [c.mastered >= 100, IC.star, '마스터 100', '단어 100개 마스터'], [c.total >= 500, IC.book, '단어 부자', '단어 500개 모으기'],
      [allT.length >= 1, IC.trophy, '첫 시험', '실전 시험 보기'], [allT.some(t => t.ok === t.n && t.n >= 10), IC.trophy, '만점', '10문제 이상 시험 만점'], [allT.length >= 10, IC.trend, '시험 10번', '실전 시험 10번 보기']
    ].map(([on, ic, t, d]) => ({ on, ic, t, d }));
    $('tabStats').innerHTML = `
      <h2 class="page-title">학습 통계</h2>
      ${weekReportHtml()}
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
      <div class="card" style="margin-bottom:12px;">
        <div class="card-head"><b>실전 시험 점수</b><button class="link-btn" data-act="exam-open">시험 보기</button></div>
        ${tests.length ? `<div class="tbars">${tests.map(t => { const p = Math.round(t.ok / t.n * 100); return `<div class="tbar" title="${esc(t.src)}"><em>${p}</em><i style="height:${Math.max(4, p)}%" class="${p >= 80 ? 'hi' : p >= 60 ? 'mid' : 'lo'}"></i><small>${new Date(t.d).getMonth() + 1}/${new Date(t.d).getDate()}</small></div>`; }).join('')}</div>
        <div class="goal-line">최근 ${tests.length}번 평균 ${Math.round(tests.reduce((a, t) => a + t.ok / t.n * 100, 0) / tests.length)}점</div>` : emptyHtml('아직 본 시험이 없어요', '실전 시험으로 실력을 확인해 보세요.', 'think')}
      </div>
      <div class="card" style="margin-bottom:12px;">
        <div class="card-head"><b>업적</b><span class="muted" style="font-size:.82rem;">${badges.filter(x => x.on).length} / ${badges.length}</span></div>
        <div class="badges">${badges.map(x => `<div class="bdg ${x.on ? 'on' : ''}" title="${esc(x.d)}"><span class="bdg-ic">${x.ic}</span><b>${x.t}</b><small>${x.d}</small></div>`).join('')}</div>
      </div>
      <div class="card">
        <b>자주 틀리는 단어</b>
        ${top.length ? top.map(w => `<div class="miss-item"><b>${esc(w.word)}</b><span>${esc(w.meaning)}</span><span class="badge b-bad" style="flex:none;">${w.wrong}회</span></div>`).join('') : emptyHtml('아직 틀린 단어가 없어요', '', 'happy')}
      </div>`;
  }

  /* =========================================================
   * TTS
   * ======================================================= */
  // 목소리는 기기마다 늦게 들어와요(voiceschanged). 한 번 모아 두고, 언어마다 고른 목소리를 써요.
  // 뜻(한국어)은 단어를 읽은 목소리와 같은 회사·같은 성별 목소리를 골라서 목소리가 확 바뀌지 않게 해요.
  let VOICES = [];
  const vLang = v => String(v.lang || '').toLowerCase().replace('_', '-');
  const vId = v => v.voiceURI || v.name;
  function loadVoices() { try { const v = window.speechSynthesis.getVoices(); if (v && v.length) VOICES = v; } catch (e) {} return VOICES; }
  if ('speechSynthesis' in window) {
    loadVoices();
    try { window.speechSynthesis.addEventListener('voiceschanged', () => { loadVoices(); if ($('ttsBox') && curTab === 'tabSettings') ttsUI(); }); } catch (e) {}
  }
  const VQ = /natural|neural|online|google|siri|premium|enhanced|multilingual/i;
  const VF = /samantha|aria|jenny|ava\b|allison|zira|emma|michelle|susan|karen|moira|tessa|serena|kate|victoria|sunhi|sun-hi|yuna|heami|seoyeon|jimin|soonbok|seohyeon|xiaoxiao|xiaoyi|xiaohan|xiaomo|xiaochen|tingting|ting-ting|huihui|yaoyao|lili|meijia|sinji|female|여성|google/i;
  const VM = /daniel|alex\b|guy\b|davis|andrew|brian|christopher|eric\b|roger|steffan|fred\b|tom\b|aaron|arthur|ryan|injoon|hyunsu|bongjin|gookmin|yunxi|yunjian|yunyang|yunze|kangkang|liang|male|남성/i;
  const VJUNK = /novelty|whisper|bells|bad news|bahh|boing|bubbles|cellos|jester|organ|superstar|trinoids|wobble|zarvox|albert|grandma|grandpa|eddy|flo\b|reed|rocko|sandy|shelley|good news|hysterical|deranged|pipe/i;
  const vGender = v => !v ? '' : VM.test(v.name) ? 'm' : VF.test(v.name) ? 'f' : '';
  const vVendor = v => /google/i.test(v.name) ? 'g' : /microsoft/i.test(v.name) ? 'ms' : /siri|com\.apple/i.test(v.name + ' ' + v.voiceURI) ? 'a' : v.localService ? 'local' : 'net';
  const vFam = lang => String(lang || '').slice(0, 2).toLowerCase();
  function voicesOf(fam) {
    const ok = fam === 'zh' ? v => /^(zh|cmn|yue)/.test(vLang(v)) : v => vLang(v).startsWith(fam);
    return loadVoices().filter(ok);
  }
  function voiceFor(lang, ref) {
    try {
      const L2 = String(lang || '').toLowerCase(), fam = vFam(L2), list = voicesOf(fam), pick = config.voice && config.voice[fam];
      if (pick) { const v = list.find(x => vId(x) === pick); if (v) return v; }
      const match = config.matchVoice !== false;
      // 여러 언어를 읽는 목소리(예: Microsoft …Multilingual)면 뜻도 같은 목소리로 읽어요.
      if (fam === 'ko' && ref && match && /multilingual/i.test(ref.name)) return ref;
      let best = null, bs = -1e9;
      for (const v of list) {
        let sc = 0;
        if (vLang(v) === L2) sc += 6; else if (fam === 'zh' && /^zh-(hans|cn)|^cmn/.test(vLang(v))) sc += 5;
        if (VQ.test(v.name)) sc += 3;
        if (VJUNK.test(v.name)) sc -= 30;
        if (ref && match) {
          if (vVendor(v) === vVendor(ref)) sc += 4;
          const g = vGender(ref), gv = vGender(v);
          if (g && gv === g) sc += 5; else if (g && gv && gv !== g) sc -= 5;
          if (!!v.localService === !!ref.localService) sc += 1;
        } else if (vGender(v) === 'f') sc += 1;
        if (v.default) sc += .5;
        if (sc > bs) { bs = sc; best = v; }
      }
      return best;
    } catch (e) { return null; }
  }
  const clampN = (x, lo, hi, d) => { x = parseFloat(x); return isFinite(x) ? Math.min(hi, Math.max(lo, x)) : d; };
  const ttsRateFor = lang => vFam(lang) === 'ko' ? clampN(config.koRate, .5, 2, 1) : clampN(config.ttsRate, .5, 2, .9);
  // 이 기기에 그 언어 목소리가 없을 때 한 번만 알려 줘요(중국어 목소리가 없는 컴퓨터 · 폰이 많아요)
  const ttsWarned = {};
  function ttsHelp(fam) {
    const ua = navigator.userAgent, nm = fam === 'zh' ? '중국어' : fam === 'ko' ? '한국어' : '영어';
    return /iPhone|iPad|Macintosh/.test(ua) ? `설정 > 손쉬운 사용 > 읽기 및 말하기 > 음성에서 ${nm} 음성을 받아 주세요.`
      : /SamsungBrowser|SM-[A-Z0-9]/.test(ua) ? `삼성 폰: 설정 > 일반 > 텍스트 음성 변환(TTS)에서 기본 엔진을 'Google 음성 인식 및 합성'으로 바꾸고, 옆 톱니바퀴 > 음성 데이터 설치에서 ${nm}를 받아 주세요(삼성 TTS 엔진을 쓰면 그 엔진 설정에서 ${nm} 음성을 받아요). 삼성 인터넷보다 Chrome으로 열면 잘 돼요.`
      : /Android/.test(ua) ? `휴대폰 설정에서 '텍스트 음성 변환(TTS)'을 찾아 기본 엔진을 Google로 바꾸고, ${nm} 음성 데이터를 설치해 주세요. Chrome으로 열면 잘 돼요.`
      : /Windows/.test(ua) ? `Chrome이나 Edge 브라우저로 열거나, Windows 설정 > 시간 및 언어 > 음성 > 음성 추가에서 '${nm}${fam === 'zh' ? '(간체, 중국)' : ''}'를 설치해 주세요.`
      : `기기 설정에서 ${nm} 음성을 설치하거나 Chrome · Edge 브라우저를 써 주세요.`;
  }
  function ttsNoVoice(fam) {
    if (ttsWarned[fam]) return; ttsWarned[fam] = true;
    say(`이 기기에서 ${fam === 'zh' ? '중국어' : fam === 'ko' ? '한국어' : '영어'} 소리를 낼 목소리를 찾지 못했어요. ${ttsHelp(fam)}`);
  }
  // o: { rate, voice, ref, keep(앞 문장 안 끊기) }
  // 고른 목소리가 소리를 못 내면(인터넷 목소리가 막힌 학교 등) 다른 목소리 → 브라우저 기본 목소리 순서로 한 번씩 더 해 봐요
  function speak(text, lang, o) {
    o = o || {};
    return new Promise(res => {
      if (!('speechSynthesis' in window) || !text) return res();
      if (!o.keep) { try { window.speechSynthesis.cancel(); } catch (e) {} }
      const L2 = lang || 'en-US', fam = vFam(L2), rate = o.rate || ttsRateFor(L2), list = voicesOf(fam);
      if (fam === 'zh' && loadVoices().length && !list.length) ttsNoVoice('zh');
      const first = o.voice || voiceFor(L2, o.ref), cand = [first].concat(list.filter(v => v !== first).sort((x, y) => (+!!y.localService) - (+!!x.localService)), [null]).filter((v, i, a) => a.indexOf(v) === i).slice(0, 3);
      const attempt = k => {
        const u = new SpeechSynthesisUtterance(text), v = cand[k];
        u.lang = L2; u.rate = rate; u.pitch = clampN(config.ttsPitch, .5, 1.5, 1);
        if (v) { try { u.voice = v; } catch (e) {} }
        // 일부 폰(삼성 TTS 엔진에 그 언어가 없을 때 등)은 오류 없이 바로 '끝'만 보내요: 시작 신호 없이 0.3초 안에 끝나면 실패로 봐요
        let over = false, started = false; const t0 = Date.now();
        u.onstart = () => { started = true; };
        const tm = setTimeout(() => end(true), (6000 + text.length * 160) / Math.min(1, rate));
        const end = ok => { if (over) return; over = true; clearTimeout(tm); if (ok || k + 1 >= cand.length) { if (!ok && fam !== 'ko') ttsNoVoice(fam); return res(); } attempt(k + 1); };
        u.onend = () => end(started || Date.now() - t0 > 300);
        u.onerror = e => end(!!(e && /interrupted|canceled/.test(e.error || '')));
        try { window.speechSynthesis.speak(u); } catch (e) { end(false); }
      };
      attempt(0);
    });
  }
  function playAudio(text) { speak(text, ttsLang(text)); }
  /* ----- 읽어주기 설정 화면 ----- */
  const TTS_K = {
    ttsRate: { label: '단어·예문 속도', min: .5, max: 2, step: .05, d: .9, fmt: x => x.toFixed(2) + 'x', chips: [.6, .75, .9, 1, 1.25, 1.5] },
    koRate: { label: '한국어 뜻 속도', min: .5, max: 2, step: .05, d: 1, fmt: x => x.toFixed(2) + 'x', chips: [.8, 1, 1.2, 1.5] },
    ttsPitch: { label: '목소리 높이', min: .5, max: 1.5, step: .05, d: 1, fmt: x => Math.abs(x - 1) < .001 ? '보통' : (x > 1 ? '높게 ' : '낮게 ') + x.toFixed(2) },
    gap: { label: '듣기 모드 쉬는 시간', min: 0, max: 5, step: .1, d: .9, fmt: x => x.toFixed(1) + '초', chips: [.3, .9, 1.5, 3] },
    wordRep: { label: '듣기 모드 단어 반복', min: 1, max: 3, step: 1, d: 1, fmt: x => x + '번' }
  };
  const ttsVal = k => clampN(config[k], TTS_K[k].min, TTS_K[k].max, TTS_K[k].d);
  function ttsSet(k, v, fromRange) {
    const t = TTS_K[k]; if (!t) return;
    config[k] = Math.round(clampN(v, t.min, t.max, t.d) / t.step) * t.step;
    config[k] = Math.round(config[k] * 100) / 100;
    syncStorage();
    const lab = $(`tts_${k}V`); if (lab) lab.textContent = t.fmt(config[k]);
    const r = $(`tts_${k}`); if (r && !fromRange) r.value = config[k];
    document.querySelectorAll(`[data-act="tts-chip"][data-k="${k}"]`).forEach(b => b.classList.toggle('on', Math.abs(+b.dataset.v - config[k]) < .001));
    const fill = r && r.closest('.tts-row'); if (fill) fill.style.setProperty('--p', ((config[k] - t.min) / (t.max - t.min) * 100) + '%');
  }
  function ttsUI() {
    const box = $('ttsBox'); if (!box) return;
    const row = k => { const t = TTS_K[k], v = ttsVal(k); return `<div class="tts-row" style="--p:${(v - t.min) / (t.max - t.min) * 100}%">
      <div class="tts-top"><span>${t.label}</span><b id="tts_${k}V">${t.fmt(v)}</b></div>
      <div class="tts-ctl"><button class="tts-step" data-act="tts-step" data-k="${k}" data-d="-1" aria-label="${t.label} 줄이기">−</button><input type="range" id="tts_${k}" min="${t.min}" max="${t.max}" step="${t.step}" value="${v}" data-input="tts-range" data-k="${k}" aria-label="${t.label}"><button class="tts-step" data-act="tts-step" data-k="${k}" data-d="1" aria-label="${t.label} 늘리기">+</button></div>
      ${t.chips ? `<div class="tts-chips">${t.chips.map(c => `<button class="chip${Math.abs(c - v) < .001 ? ' on' : ''}" data-act="tts-chip" data-k="${k}" data-v="${c}">${t.fmt(c)}</button>`).join('')}</div>` : ''}</div>`; };
    const vsel = (fam, label) => {
      const list = voicesOf(fam), pick = (config.voice || {})[fam] || '', auto = voiceFor(fam === 'en' ? 'en-US' : fam === 'zh' ? 'zh-CN' : 'ko-KR', fam === 'ko' ? voiceFor(LANG === 'zh' ? 'zh-CN' : 'en-US') : null);
      return `<div class="tts-voice"><span>${label}</span><select data-change="tts-voice" data-l="${fam}" aria-label="${label}">
        <option value="">자동${auto ? ' (' + esc(auto.name.replace(/^(Microsoft|Google)\s+/, '').slice(0, 28)) + ')' : ''}</option>
        ${list.map(v => `<option value="${esc(vId(v))}"${vId(v) === pick ? ' selected' : ''}>${esc(v.name.slice(0, 40))} · ${esc(v.lang)}${vGender(v) ? (vGender(v) === 'f' ? ' · 여성' : ' · 남성') : ''}</option>`).join('')}
      </select><button class="tts-play" data-act="tts-try" data-l="${fam}" aria-label="${label} 들어 보기">${IC.speaker}</button></div>`;
    };
    const has = 'speechSynthesis' in window;
    box.innerHTML = `${has ? '' : '<p class="muted tts-note">이 브라우저는 소리 내어 읽기를 지원하지 않아요.</p>'}
      ${row('ttsRate')}${row('koRate')}${row('ttsPitch')}
      <div class="tts-sep"></div>
      ${vsel(LANG === 'zh' ? 'zh' : 'en', LANG === 'zh' ? '중국어 목소리' : '영어 목소리')}${vsel('ko', '한국어(뜻) 목소리')}
      <label class="switch-row tts-match"><input type="checkbox" data-change="tts-match" ${config.matchVoice !== false ? 'checked' : ''}> 뜻도 단어와 비슷한 목소리로 맞추기 <small class="muted">(같은 회사·같은 성별)</small></label>
      ${VOICES.length ? '' : '<p class="muted tts-note">목소리 목록을 불러오는 중이에요. 잠시 뒤 다시 열면 고를 수 있어요.</p>'}
      <div class="tts-sep"></div>
      ${row('gap')}${row('wordRep')}
      <div class="tts-btns"><button class="btn btn-soft" data-act="tts-reset">기본값으로</button><button class="btn btn-primary" data-act="tts-try" data-l="all">${IC.speaker} 단어와 뜻 들어 보기</button></div>`;
  }
  const TTS_SAMPLE = { en: ['apple', '사과'], zh: ['苹果', '사과'] };
  async function ttsTry(fam) {
    const f = LANG === 'zh' ? 'zh' : 'en', [w, m] = TTS_SAMPLE[f], wl = f === 'zh' ? 'zh-CN' : 'en-US', ref = voiceFor(wl);
    if (fam === 'ko') return speak('안녕하세요. 이 목소리로 뜻을 읽어 드려요.', 'ko-KR', { ref });
    await speak(w, wl, { ref });
    if (fam === 'all') { await sleep(Math.max(200, ttsVal('gap') * 500)); await speak(m, 'ko-KR', { ref, keep: true }); }
  }
  ACTIONS['tts-step'] = el => { const k = el.dataset.k, t = TTS_K[k]; if (t) ttsSet(k, ttsVal(k) + (+el.dataset.d) * t.step); };
  ACTIONS['tts-chip'] = el => ttsSet(el.dataset.k, +el.dataset.v);
  ACTIONS['tts-try'] = el => ttsTry(el.dataset.l);
  ACTIONS['tts-reset'] = () => { Object.keys(TTS_K).forEach(k => { config[k] = TTS_K[k].d; }); config.matchVoice = true; config.voice = { en: '', zh: '', ko: '' }; syncStorage(); ttsUI(); toast('읽어주기 설정을 기본값으로 돌렸어요.'); };

