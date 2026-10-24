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

    const barsWeek = week.map(x => `<div class="bar-col ${x.today ? 'today' : ''}">${x.today ? (x.n || 0) : ''}<i style="height:${Math.max(4, Math.round(x.n / maxN * 100))}%"></i>${labels[new Date(x.t).getDay()]}</div>`).join('');
    const tot = Math.max(1, c.total);
    const allW = allWords().map(x => x.w);
    const freqWrong = allW.filter(w => w.box > 0 && w.box < 5 && w.miss > 0).length;
    const learningPure = Math.max(0, c.learning - freqWrong);
    const top = allW.filter(w => w.wrong > 0).sort((a, b) => b.wrong - a.wrong).slice(0, 5);

    const tests = (stats.tests || []).slice(-8), allT = stats.tests || [], best = bestStreak();
    const recentTests = allT.slice(-5).reverse();
    const badges = [
      [totalN >= 1, IC.sprout, '첫걸음', '처음으로 학습하기'], [totalN >= 100, IC.check, '100번 학습', '문제 100개 풀기'], [totalN >= 1000, IC.sparkles, '1000번 학습', '문제 1,000개 풀기'],
      [best >= 3, IC.flame, '3일 연속', '3일 연속 학습'], [best >= 7, IC.flame, '일주일 연속', '7일 연속 학습'], [best >= 30, IC.flame, '한 달 연속', '30일 연속 학습'],
      [c.mastered >= 10, IC.star, '마스터 10', '단어 10개 마스터'], [c.mastered >= 100, IC.star, '마스터 100', '단어 100개 마스터'], [c.total >= 500, IC.book, '단어 부자', '단어 500개 모으기'],
      [allT.length >= 1, IC.trophy, '첫 시험', '실전 시험 보기'], [allT.some(t => t.ok === t.n && t.n >= 10), IC.trophy, '만점', '10문제 이상 시험 만점'], [allT.length >= 10, IC.trend, '시험 10번', '실전 시험 10번 보기']
    ].map(([on, ic, t, d]) => ({ on, ic, t, d }));
    $('tabStats').innerHTML = `
      <h2 class="page-title">학습 통계</h2>
      <div class="stat-tiles">
        <div class="stat-tile st-total"><b>${c.total}</b><span>전체 단어</span></div>
        <div class="stat-tile st-mem"><b>${c.mastered}</b><span>외운 단어</span></div>
        <div class="stat-tile st-str"><b>${streak()}일</b><span>연속 학습</span></div>
      </div>
      ${weekReportHtml()}
      <div class="card" style="margin-bottom:12px;">
        <b>이번 주 학습</b>
        <div class="bars">${barsWeek}</div>
        <div class="goal-line">하루 목표 ${goal}개 · 총 ${totalN}번 학습 · 정답률 ${acc}%</div>
      </div>
      <div class="card" style="margin-bottom:12px;">
        <b>외우는 정도</b>
        <div class="stack">
          <i style="width:${c.mastered / tot * 100}%;background:var(--mint)"></i>
          <i style="width:${learningPure / tot * 100}%;background:var(--blue)"></i>
          <i style="width:${freqWrong / tot * 100}%;background:var(--sun)"></i>
          <i style="width:${c.newW / tot * 100}%;background:var(--line)"></i>
        </div>
        <div class="legend"><span style="--c:var(--mint)">외웠음 ${c.mastered}</span><span style="--c:var(--blue)">외우는 중 ${learningPure}</span><span style="--c:var(--sun)">자주 틀림 ${freqWrong}</span><span style="--c:var(--line)">새 단어 ${c.newW}</span></div>
      </div>
      <div class="card" style="margin-bottom:12px;">
        <div class="card-head"><b>최근 시험</b><button class="link-btn" data-act="exam-open">시험 보기</button></div>
        ${recentTests.length ? `<div class="exam-hist" style="margin-top:8px;">${recentTests.map(t => { const p = Math.round(t.ok / t.n * 100), [g] = examGrade(p); return `<div class="eh-row"><span class="eh-grade g-${g}">${g}</span><span>${esc(t.src)}</span><small>${new Date(t.d).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })}</small><b>${p}점</b></div>`; }).join('')}</div>` : emptyHtml('아직 본 시험이 없어요', '실전 시험으로 실력을 확인해 보세요.', 'think')}
      </div>
      <div class="card" style="margin-bottom:12px;">
        <b>최근 5주 학습 달력</b>
        <div class="heat">${heat}</div>
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

