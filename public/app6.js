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

    const tests = (stats.tests || []).slice(-8), allT = stats.tests || [], best = bestStreak();
    const badges = [
      [totalN >= 1, IC.sprout, '첫걸음', '처음으로 학습하기'], [totalN >= 100, IC.check, '100번 학습', '문제 100개 풀기'], [totalN >= 1000, IC.sparkles, '1000번 학습', '문제 1,000개 풀기'],
      [best >= 3, IC.flame, '3일 연속', '3일 연속 학습'], [best >= 7, IC.flame, '일주일 연속', '7일 연속 학습'], [best >= 30, IC.flame, '한 달 연속', '30일 연속 학습'],
      [c.mastered >= 10, IC.star, '마스터 10', '단어 10개 마스터'], [c.mastered >= 100, IC.star, '마스터 100', '단어 100개 마스터'], [c.total >= 500, IC.book, '단어 부자', '단어 500개 모으기'],
      [allT.length >= 1, IC.trophy, '첫 시험', '실전 시험 보기'], [allT.some(t => t.ok === t.n && t.n >= 10), IC.trophy, '만점', '10문제 이상 시험 만점'], [allT.length >= 10, IC.trend, '시험 10번', '실전 시험 10번 보기']
    ].map(([on, ic, t, d]) => ({ on, ic, t, d }));
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
  function voiceFor(lang) {
    try {
      const vs = window.speechSynthesis.getVoices(), L2 = lang.toLowerCase(), n = v => (v.lang || '').toLowerCase().replace('_', '-');
      const exact = vs.filter(v => n(v) === L2);
      if (L2 === 'zh-cn') return exact.find(v => /tingting|xiaoxiao|google|natural|siri|yaoyao|huihui/i.test(v.name)) || exact[0] || vs.find(v => /^(zh-hans|cmn)/.test(n(v))) || vs.find(v => n(v).startsWith('zh')) || null;
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
  function playAudio(text) { speak(text, ttsLang(text)); }

