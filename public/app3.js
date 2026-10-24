  /* =========================================================
   * 홈
   * ======================================================= */
  function ringSvg(pct) {
    const r = 34, c = 2 * Math.PI * r;
    return `<svg class="ring" viewBox="0 0 84 84"><circle class="ring-bg" cx="42" cy="42" r="${r}"/><circle class="ring-fg" cx="42" cy="42" r="${r}" stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${(c * (1 - pct)).toFixed(1)}" transform="rotate(-90 42 42)"/></svg>`;
  }

  function renderHome() {
    const c = counts();
    const goal = config.goal || 20;
    const today = stats.days[dayKey()] || { n: 0, ok: 0 };
    const pct = Math.min(1, today.n / goal);
    const si = streakInfo(), st = si.n, prot = new Set(si.prot);

    let cta;
    if (c.total === 0) cta = { big: '0', unit: '개', label: '오늘의 복습', sub: '단어를 추가하면 복습 일정이 자동으로 만들어져요.', btn: '단어 추가하기', attrs: 'data-act="tab" data-t="tabBooks"' };
    else if (c.due > 0) cta = { big: c.due, unit: '개', label: '오늘의 복습', sub: '잊어버리기 직전에 복습하면 오래 기억돼요.', btn: '복습 시작', attrs: 'data-act="start" data-mode="card" data-src="due"' };
    else if (c.newW > 0) cta = { big: c.newW, unit: '개', label: '새 단어', sub: '오늘 복습은 끝났어요. 새 단어를 배워볼까요?', btn: '새 단어 학습', attrs: 'data-act="start" data-mode="card" data-src="new"' };
    else cta = { big: c.total, unit: '개', label: '전체 단어', sub: '모든 단어를 학습했어요. 새 단어를 더 추가해 보세요.', btn: '단어 추가하기', attrs: 'data-act="tab" data-t="tabBooks"' };

    const labels = ['일', '월', '화', '수', '목', '금', '토'];
    let week = '';
    for (let i = 6; i >= 0; i--) {
      const t = addDays(startOfDay(), -i);
      const d = stats.days[dayKey(t)], fz = prot.has(dayKey(t)); // 보호권이 지켜 준 날은 방패로 표시해요
      week += `<div class="day ${d && d.n > 0 ? 'done' : fz ? 'frz' : ''} ${i === 0 ? 'today' : ''}"${fz ? ' title="보호됨" aria-label="보호됨"' : ''}><i>${d && d.n > 0 ? IC.tick : fz ? IC.shield : ''}</i>${fz ? '보호됨' : labels[new Date(t).getDay()]}</div>`;
    }

    const hour = new Date().getHours();
    const hello = hour < 6 ? '늦은 밤이에요' : hour < 12 ? '좋은 아침이에요' : hour < 18 ? '오늘도 한 걸음 더' : '하루 마무리 복습 어때요?';
    const gname = GRADE_NAMES[config.grade];
    const books = categories.slice(0, 3).map(bookCardHtml).join('');

    $('tabHome').innerHTML = `
      <div class="home-grid">
      <div class="h-hello"><div class="hello"><div class="hello-who">${MASCOT(today.n >= goal ? 'cheer' : 'happy')}<div><div class="hello-sub">${hello}</div><div class="hello-name">${esc(myName())}${isTeacher() ? ' 선생님' : '님'}</div>${schoolLine() ? `<div class="hello-school">${esc(schoolLine())}</div>` : ''}</div></div>
        ${isZh() && !isTeacher() ? '<button class="grade-chip" data-act="pack-open">HSK 단어</button>' : `<button class="grade-chip" data-act="grade-pick">${isTeacher() ? '선생님' : gname ? esc(gname) : '학년 설정'}</button>`}</div></div>
      <div class="h-hero"><section class="hero">
        <div class="hero-top">
          <div>
            <div class="hero-label">${cta.label}</div>
            <div class="hero-num">${cta.big}<small>${cta.unit}</small></div>
          </div>
          <div class="ring-box">${ringSvg(pct)}<div class="ring-txt"><b>${Math.min(today.n, 999)}</b>/${goal}</div></div>
        </div>
        <div class="hero-sub">${cta.sub}</div>
        <div class="hero-mission"><span>복습 <b>${c.due}</b></span><span>새 단어 <b>${c.newW}</b></span><span>마스터 <b>${c.mastered}</b></span></div>
        <button class="btn hero-btn btn-block" ${cta.attrs}>${cta.btn}</button>
      </section></div>

      ${mcHomeHtml()}
      <div class="h-streak"><div class="card streak-card">
        <div class="streak-fire ${st > 0 ? '' : 'off'}">${st > 0 ? IC.flame : IC.sprout}${si.frz ? `<span class="frz-badge" title="연속 학습 보호권 ${si.frz}장" aria-label="보호권 ${si.frz}장">${IC.shield}<b>${si.frz}</b></span>` : ''}</div>
        <div class="streak-txt"><div class="streak-n">${st}일 연속</div><div class="muted">${st > 0 && today.n === 0 && prot.has(dayKey(addDays(startOfDay(), -1))) ? '어제 보호됨' : si.frz ? `보호권 ${si.frz}장` : st > 0 ? `보호권까지 ${FRZ_EVERY - st % FRZ_EVERY}일` : '오늘 시작해요'}</div></div>
        <div class="week">${week}</div>
      </div>${wotdHtml()}</div>

      <div class="h-quick"><div class="section-title"><span>바로 학습</span></div>
      <div class="tiles">
        <button class="tile" data-act="start" data-mode="card" data-src="new"><div class="tile-ico t-new">${IC.sprout}</div><div><div class="tile-name">새 단어</div><div class="tile-n">${c.newW}개</div></div></button>
        <button class="tile" data-act="start" data-mode="choice" data-src="wrong"><div class="tile-ico t-wrong">${IC.bookx}</div><div><div class="tile-name">오답노트</div><div class="tile-n">${c.miss}개</div></div></button>
        <button class="tile" data-act="start" data-mode="card" data-src="star"><div class="tile-ico t-star">${IC.star}</div><div><div class="tile-name">즐겨찾기</div><div class="tile-n">${c.star}개</div></div></button>
        <button class="tile" data-act="start" data-mode="listen" data-src="due"><div class="tile-ico t-listen">${IC.headphones}</div><div><div class="tile-name">듣기 모드</div><div class="tile-n">복습 단어 듣기</div></div></button>
      </div></div>

      ${shelfHtml()}

      <div class="h-tools">${isTeacher() ? teachToolsHtml() : ''}<div class="section-title"><span>학습 도구</span></div>
      <div class="tool-list${LS.getItem('vocapro_tools_open') === '1' ? '' : ' tl-fold'}" id="homeToolList">${rdEntryHtml()}${isTeacher() ? '' : classEntryHtml()}${todayHtml()}${flowEntryHtml()}${wqEntryHtml()}<button class="mg-entry" data-act="fsc-open"><span class="mg-ico i-coral">${IC.mic}</span><span class="mg-txt"><b>녹음 파일 채점</b><small>문장을 넣고 녹음 파일로 정확성 · 유창성 점수, 저장 안 함</small></span><span class="mg-chev"></span></button><button class="mg-entry" data-act="gx-open"><span class="mg-ico i-mint">${IC.scan}</span><span class="mg-txt"><b>글·사진에서 단어 뽑기</b><small>기사, 유튜브 자막, 유인물 사진 속 모르는 단어만</small></span><span class="mg-chev"></span></button><button class="mg-entry" data-act="match"><span class="mg-ico i-grape">${IC.cards}</span><span class="mg-txt"><b>짝 맞추기</b><small>${LN()}와 뜻을 빠르게 연결해요</small></span><span class="mg-chev"></span></button><button class="mg-entry" data-act="rain"><span class="mg-ico i-teal">${IC.play}</span><span class="mg-txt"><b>단어 비</b><small>떨어지는 뜻이 닿기 전에 단어를 골라요</small></span><span class="mg-chev"></span></button><button class="mg-entry" data-act="exam-open"><span class="mg-ico i-coral">${IC.trophy}</span><span class="mg-txt"><b>실전 시험</b><small>섞인 문제를 풀고 점수와 등급을 받아요</small></span><span class="mg-chev"></span></button><button class="mg-entry" data-act="dict-open"><span class="mg-ico i-teal">${IC.search}</span><span class="mg-txt"><b>${LN()}사전</b><small>${isZh() ? '한자, 병음, 한글 뜻으로 바로 찾아요' : '뜻, 예문, 비슷한 단어를 바로 찾아요'}</small></span><span class="mg-chev"></span></button>${recEntryHtml()}${packEntryHtml()}${ltEntryHtml()}</div>
      <button class="tl-more-btn${LS.getItem('vocapro_tools_open') === '1' ? ' open' : ''}" data-act="tools-toggle"><span>${LS.getItem('vocapro_tools_open') === '1' ? '접기' : '학습 도구 더 보기'}</span><i></i></button></div>

      <div class="h-books"><div class="section-title"><span>내 단어장</span><button data-act="tab" data-t="tabBooks">전체 보기</button></div>
      <div class="book-list">${books || emptyHtml('아직 단어장이 없어요', '단어장 탭에서 새로 만들어 보세요.')}</div></div>
      </div>
    `;
    recMaybeShow(); wotdFill(); frzNotice(si);
  }

  ACTIONS.start = el => startSession(el.dataset.mode, parseSrc(el.dataset.src), el.dataset.count !== undefined ? parseInt(el.dataset.count, 10) : SESSION_DEFAULT);

