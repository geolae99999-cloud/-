  /* =========================================================
   * 영어사전 · 오늘의 단어 · 단어 시험지
   * ======================================================= */
  let dictView = null, dictTimer = 0, dictSeq = 0;
  function dictOpen(q) {
    dictView = null;
    openSheet(LN() + '사전', `<div class="dsearch">${IC.search}<input type="search" id="dictQ" placeholder="${isZh() ? '한자, 병음, 한글 뜻 (예: 学习, xuexi, 공부)' : '영어 단어나 한글 뜻 (예: happy, 행복한)'}" autocomplete="off" autocapitalize="none" spellcheck="false" enterkeyhint="search" value="${esc(q || '')}" data-input="dict" data-enter="dict"></div>
      <div id="dictOut" class="dict-out"><div class="dict-hint">뜻, 발음, 예문, 비슷한 단어를 바로 보여줘요.<br>앱에 들어 있는 사전이라 인터넷이 느려도 빨라요.</div></div>`);
    setTimeout(() => { const i = $('dictQ'); if (!i) return; if (q) dictType(true); else i.focus(); }, 60);
  }
  function dictType(now) {
    clearTimeout(dictTimer);
    dictTimer = setTimeout(dictSearch, now ? 0 : 160);
  }
  async function dictSearch() {
    const inp = $('dictQ'), out = $('dictOut'); if (!inp || !out) return;
    const raw = inp.value.trim(), q = raw.toLowerCase(), seq = ++dictSeq;
    if (!q) { out.innerHTML = '<div class="dict-hint">뜻, 발음, 예문, 비슷한 단어를 바로 보여줘요.</div>'; dictView = null; return; }
    if (isZh()) return dictSearchZh(raw, out, seq);
    if (HANGUL.test(q)) return dictSearchKo(raw, out, seq);
    if (!/^[a-z][a-z' .-]*$/i.test(q)) { out.innerHTML = '<div class="dict-hint">영어 단어나 한글 뜻으로 찾아 주세요.</div>'; return; }
    const c = dictLetter(q), shard = c ? await dictShard(c) : {};
    const hit = await dictGet(q);
    if (seq !== dictSeq || !$('dictOut')) return;
    const keys = Object.keys(shard), stem = hit && hit.base ? hit.base : q;
    const sug = keys.filter(k => k !== q && k.startsWith(q) && !k.includes(' ') && Array.isArray(shard[k])).slice(0, 8);
    const phr = q.includes(' ') ? keys.filter(k => k !== q && k.startsWith(q) && Array.isArray(shard[k])).slice(0, 12) : keys.filter(k => k.startsWith(stem + ' ') && Array.isArray(shard[k])).sort((x, y) => (/ (a|b|one's|oneself|sb|sth)( |$)/.test(x) - / (a|b|one's|oneself|sb|sth)( |$)/.test(y)) || x.length - y.length).slice(0, 12);
    dictView = hit ? { ...hit, word: raw.replace(/\s+/g, ' ') } : null;
    let h = '';
    if (hit) {
      const syns = String(hit.synonyms || '').split(',').map(x => x.trim()).filter(Boolean);
      const pr = pronText(hit);
      const books = categories.map(b => `<option value="${esc(b.id)}"${b.id === currentCategoryId ? ' selected' : ''}>${esc(b.name)}</option>`).join('');
      h += `<div class="dict-card">
        <div class="dict-head"><div><b class="dict-w">${esc(dictView.word)}</b>${pr ? `<div class="q-pron">${esc(pr)}</div>` : ''}</div><button class="dict-sp" data-act="speak" data-text="${esc(dictView.word)}" aria-label="발음 듣기">${IC.speaker}</button></div>
        <div class="dict-m">${esc(hit.meaning)}</div>
        ${hit.base ? `<button class="link-btn" data-act="dict-go" data-word="${esc(hit.base)}">원형 ${esc(hit.base)} 보기</button>` : ''}
        ${hit.example ? `<div class="syn-ex"><div>${esc(hit.example)}</div>${hit.exampleKo ? `<small>${esc(hit.exampleKo)}</small>` : ''}</div>` : ''}
        ${syns.length ? `<h4 class="syn-h">비슷한 단어</h4><div class="syn-chips">${syns.map(x => `<button class="syn" data-act="dict-go" data-word="${esc(x)}">${esc(x)}</button>`).join('')}</div>` : ''}
        <div class="dict-add"><select id="dictBook" aria-label="담을 단어장">${books}<option value="__new">새 단어장: 사전에서 담은 단어</option></select><button class="btn btn-primary" data-act="dict-add">담기</button></div>
      </div>`;
    } else if (!sug.length && !phr.length) {
      h += `<div class="dict-none"><b>'${esc(raw)}'은(는) 내장 사전에 없어요.</b>${aiReady() ? '<button class="btn btn-soft" data-act="dict-ai">AI로 뜻 찾기</button>' : '<span class="muted">철자를 확인해 보세요.</span>'}</div>`;
    }
    if (phr.length) h += `<div class="dict-sug"><h4 class="syn-h">${q.includes(' ') ? '이어지는 숙어' : esc(stem) + ' 관련 숙어'}</h4>${phr.map(k => `<button class="dict-row" data-act="dict-go" data-word="${esc(k)}"><b>${esc(shard[k][0])}</b><span>${esc(shard[k][1])}</span></button>`).join('')}</div>`;
    if (sug.length) h += `<div class="dict-sug"><h4 class="syn-h">${hit ? '이런 단어도 있어요' : '혹시 이 단어인가요?'}</h4>${sug.map(k => `<button class="dict-row" data-act="dict-go" data-word="${esc(k)}"><b>${esc(shard[k][0])}</b><span>${esc(shard[k][1])}</span></button>`).join('')}</div>`;
    out.innerHTML = h;
  }
  // 한글 뜻으로 영어 단어 찾기: dict/ko.json([단어, 뜻, 순위])을 처음 찾을 때 한 번만 받아 와요.
  let koIdx = null, koLoading = null;
  const mTokens = m => String(m).split(/[,;/]/).map(x => x.replace(/\([^)]*\)|\[[^\]]*\]|[~…·.]/g, '').replace(/\s+/g, '')).filter(Boolean);
  function koLoad() {
    if (koIdx) return Promise.resolve(koIdx);
    if (!koLoading) koLoading = fetch('dict/ko.json').then(r => r.ok ? r.json() : Promise.reject(new Error(r.status)))
      .then(a => (koIdx = (Array.isArray(a) ? a : []).map(e => [e[0], e[1], e[2], mTokens(e[1]), String(e[1]).replace(/\s+/g, '')]), koIdx))
      .catch(() => { koLoading = null; return []; });
    return koLoading;
  }
  // 뜻이 딱 그 말이면 0, 그 말로 시작하거나 '-하다/-한' 등만 다르면 1, 뜻 안에 들어 있으면 2
  const KO_END = /(하다|되다|시키다|하게|하는|스러운|스럽다|적인|적으로|적|한|히|이|게|의|을|를|은|는|다)$/;
  function koScore(e, q, qs) {
    const t = e[3];
    if (t.includes(q)) return 0;
    if (t.some(x => x.replace(KO_END, '') === qs || x.startsWith(q))) return 1;
    return e[4].includes(q) ? 2 : 9;
  }
  async function dictSearchKo(raw, out, seq) {
    if (!koIdx) out.innerHTML = '<div class="dict-hint">한글 뜻 목록을 불러오는 중이에요...</div>';
    const idx = await koLoad(); if (seq !== dictSeq || !$('dictOut')) return;
    if (!idx.length) { out.innerHTML = '<div class="dict-hint">뜻 목록을 불러오지 못했어요. 인터넷을 확인해 주세요.</div>'; return; }
    const q = raw.replace(/\s+/g, ''), qs = q.replace(KO_END, '') || q, hits = [];
    for (const e of idx) { const sc = koScore(e, q, qs); if (sc < 9) hits.push([sc, e]); }
    hits.sort((a, b) => a[0] - b[0] || a[1][2] - b[1][2] || a[1][0].length - b[1][0].length);
    dictView = null;
    const top = hits.slice(0, 40);
    out.innerHTML = top.length
      ? `<div class="dict-sug"><h4 class="syn-h">'${esc(raw)}' 뜻의 영어 단어 ${hits.length > 40 ? '40개 (전체 ' + hits.length + '개 중)' : hits.length + '개'}</h4>${top.map(([sc, e]) => `<button class="dict-row" data-act="dict-go" data-word="${esc(e[0])}"><b>${esc(e[0])}</b><span>${esc(e[1])}${sc === 0 && e[2] === 0 ? ' <em class="hsk-tag">기본</em>' : ''}</span></button>`).join('')}</div>`
      : `<div class="dict-none"><b>'${esc(raw)}' 뜻의 단어를 찾지 못했어요.</b><button class="btn btn-soft" data-act="dict-tr">번역기로 찾아보기</button></div>`;
  }
  ACTIONS['dict-tr'] = () => { const q = (($('dictQ') || {}).value || '').trim(); closeSheet(); openTranslator(q); setTimeout(() => ACTIONS['tr-go'](), 120); };
  // 중국어 사전 찾기: 한자(앞부분), 병음(성조 없이도), 한글 뜻으로 HSK 단어 목록에서 찾아요.
  let zhTok = null;
  async function dictSearchZh(raw, out, seq) {
    const idx = await zhLoad(); if (seq !== dictSeq || !$('dictOut')) return;
    if (!idx.length) { out.innerHTML = '<div class="dict-hint">단어 목록을 불러오지 못했어요. 인터넷을 확인해 주세요.</div>'; return; }
    const q = raw.replace(/\s+/g, ''), han = HAN.test(q), hg = HANGUL.test(q), pq = pyPlain(q);
    const hit = han ? await dictGet(q) : null; if (seq !== dictSeq || !$('dictOut')) return;
    let list;
    if (han) list = idx.filter(e => e[0] !== q && e[0].startsWith(q.charAt(0))).sort((a, b) => b[0].startsWith(q) - a[0].startsWith(q) || zhLv(a) - zhLv(b) || a[0].length - b[0].length);
    else if (hg) { if (!zhTok) zhTok = new Map(idx.map(e => [e[0], [mTokens(e[2]), e[2].replace(/\s+/g, '')]])); const qs = q.replace(KO_END, '') || q, sc = e => { const t = zhTok.get(e[0]) || [[], e[2]]; return koScore([0, 0, 0, t[0], t[1]], q, qs); }; list = idx.map(e => [sc(e), e]).filter(x => x[0] < 9).sort((a, b) => a[0] - b[0] || zhLv(a[1]) - zhLv(b[1]) || a[1][0].length - b[1][0].length).map(x => x[1]); }
    else if (pq) list = idx.filter(e => pyPlain(e[1]).startsWith(pq)).sort((a, b) => (pyPlain(b[1]) === pq) - (pyPlain(a[1]) === pq) || zhLv(a) - zhLv(b));
    else list = [];
    list = list.slice(0, 30);
    dictView = hit ? { ...hit, word: q } : null;
    let h = '';
    if (hit) h += dictCardHtml(dictView);
    else if (!list.length) h += `<div class="dict-none"><b>'${esc(raw)}'은(는) HSK 단어에 없어요.</b>${han && aiReady() ? '<button class="btn btn-soft" data-act="dict-ai">AI로 뜻 찾기</button>' : '<span class="muted">한자, 병음(예: xuexi), 한글 뜻으로 찾아 보세요.</span>'}</div>`;
    if (list.length) h += `<div class="dict-sug"><h4 class="syn-h">${hit ? '이 글자로 시작하는 단어' : '찾은 단어'}</h4>${list.map(e => `<button class="dict-row" data-act="dict-go" data-word="${esc(e[0])}"><b>${esc(e[0])}</b><span><i class="rec-py">${esc(e[1])}</i> ${esc(e[2])} <em class="hsk-tag">${zhTag(e[3], e[4])}</em></span></button>`).join('')}</div>`;
    out.innerHTML = h;
  }
  function dictCardHtml(d) {
    const syns = String(d.synonyms || '').split(',').map(x => x.trim()).filter(Boolean), pr = pronText(d);
    const books = categories.map(b => `<option value="${esc(b.id)}"${b.id === currentCategoryId ? ' selected' : ''}>${esc(b.name)}</option>`).join('');
    return `<div class="dict-card">
        <div class="dict-head"><div><b class="dict-w">${esc(d.word)}</b>${pr ? `<div class="q-pron">${esc(pr)}</div>` : ''}</div>${d.hsk || d.hsk3 ? `<em class="hsk-tag">${esc(zhTag(+d.hsk, +d.hsk3))}</em>` : ''}<button class="dict-sp" data-act="speak" data-text="${esc(d.word)}" aria-label="발음 듣기">${IC.speaker}</button></div>
        <div class="dict-m">${esc(d.meaning)}</div>
        ${d.example ? `<div class="syn-ex"><div>${esc(d.example)} <button class="ex-say" data-act="speak" data-text="${esc(d.example)}" aria-label="예문 듣기">${IC.speaker}</button></div>${exPyHtml(d)}${d.exampleKo ? `<small>${esc(d.exampleKo)}</small>` : ''}</div>` : ''}
        ${syns.length ? `<h4 class="syn-h">비슷한 단어</h4><div class="syn-chips">${syns.map(x => `<button class="syn" data-act="dict-go" data-word="${esc(x)}">${esc(x)}</button>`).join('')}</div>` : ''}
        <div class="dict-add"><select id="dictBook" aria-label="담을 단어장">${books}<option value="__new">새 단어장: 사전에서 담은 단어</option></select><button class="btn btn-primary" data-act="dict-add">담기</button></div>
      </div>`;
  }
  ACTIONS['dict-open'] = el => dictOpen(el && el.dataset && el.dataset.word || '');
  ACTIONS['dict-go'] = el => { const i = $('dictQ'); if (!i) return dictOpen(el.dataset.word); i.value = el.dataset.word; dictType(true); const sh = document.querySelector('.sheet'); if (sh) sh.scrollTop = 0; };
  ACTIONS['dict-ai'] = async el => {
    const q = (($('dictQ') || {}).value || '').trim(); if (!q) return;
    el.disabled = true; el.textContent = '찾는 중...';
    try {
      const r = await lookupWord(q, true); if (!$('dictOut')) return;
      dictView = { ...r, word: q };
      $('dictOut').innerHTML = `<div class="dict-card"><div class="dict-head"><div><b class="dict-w">${esc(q)}</b><div class="q-pron">${esc(pronText(r))}</div></div><button class="dict-sp" data-act="speak" data-text="${esc(q)}" aria-label="발음 듣기">${IC.speaker}</button></div><div class="dict-m">${esc(r.meaning)}</div>${r.example ? `<div class="syn-ex"><div>${esc(r.example)}</div><small>${esc(r.exampleKo || '')}</small></div>` : ''}<div class="dict-add"><select id="dictBook">${categories.map(b => `<option value="${esc(b.id)}">${esc(b.name)}</option>`).join('')}<option value="__new">새 단어장: 사전에서 담은 단어</option></select><button class="btn btn-primary" data-act="dict-add">담기</button></div></div>`;
    } catch (e) { el.disabled = false; el.textContent = 'AI로 뜻 찾기'; toast(String(e.message || '뜻을 찾지 못했어요.').split('\n')[0]); }
  };
  ACTIONS['dict-add'] = () => {
    if (!dictView) return;
    const sel = $('dictBook'), v = sel ? sel.value : '__new';
    let cat = v === '__new' ? null : categories.find(c => c.id === v);
    if (!cat) { const nm = '사전에서 담은 단어'; cat = categories.find(c => c.name === nm); if (!cat) { cat = { id: 'c' + uid(), name: nm, words: [] }; categories.push(cat); } }
    if (cat.words.some(w => w.word.toLowerCase() === dictView.word.toLowerCase())) return toast(`'${cat.name}'에 이미 있어요.`);
    const { base, ...d } = dictView;
    cat.words.unshift(sanitizeWord({ ...d, id: uid() }));
    syncStorage(); toast(`'${cat.name}'에 담았어요.`);
    try { if (curTab === 'paneBook') renderBookDynamic(); else if (curTab === 'tabHome' || curTab === 'tabBooks') go(curTab); } catch (e) {}
  };

  // 오늘의 단어: 내 학년 추천 단어 중에서 날마다 하나씩
  function wotdPick() {
    const list = isZh() ? ['hsk1', 'hsk2', 'hsk3'].flatMap(gradeWords) : gradeWords(GRADE_NAMES[config.grade] ? config.grade : 'm1'); if (!list.length) return null;
    const d = new Date(), n = Math.floor(new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() / 864e5);
    return list[(n * 37) % list.length];
  }
  function wotdHtml() {
    const e = wotdPick(); if (!e) return '';
    return `<div class="card wotd"><div class="wotd-top"><span class="wotd-tag">오늘의 단어</span><button class="wotd-sp" data-act="speak" data-text="${esc(e.w)}" aria-label="발음 듣기">${IC.speaker}</button></div>
      <button class="wotd-body" data-act="dict-open" data-word="${esc(e.w)}"><b>${esc(e.w)}</b>${e.p ? `<i class="rec-py">${esc(e.p)}</i>` : ''}<span>${esc(e.m)}</span></button><div class="wotd-ex" id="wotdEx"></div></div>`;
  }
  async function wotdFill() {
    const e = wotdPick(); if (!e || !$('wotdEx')) return;
    try { const d = await dictGet(e.w); const el = $('wotdEx'); if (d && d.example && el) el.innerHTML = `${esc(d.example)}${exPyHtml(d)}<small>${esc(d.exampleKo || '')}</small>`; } catch (err) {}
  }

  // 단어 시험지: 인쇄하거나 PDF로 저장해요
  ACTIONS['book-print'] = () => {
    const cat = curCat(); if (!cat) return;
    if (!cat.words.length) return toast('단어를 먼저 담아 주세요.');
    const n = cat.words.length;
    openSheet('단어 시험지', `<div class="form-stack">
      <label class="setting-label">문제 유형</label>
      <div class="seg" id="ptType"><button class="on" data-act="pt-opt" data-g="ptType" data-v="m">뜻 쓰기</button><button data-act="pt-opt" data-g="ptType" data-v="w">단어 쓰기</button><button data-act="pt-opt" data-g="ptType" data-v="x">섞어서</button></div>
      <label class="setting-label">문제 수 (전체 ${n}개)</label>
      <div class="seg" id="ptNum">${[20, 30, 50].filter(k => k < n).map(k => `<button data-act="pt-opt" data-g="ptNum" data-v="${k}">${k}개</button>`).join('')}<button class="on" data-act="pt-opt" data-g="ptNum" data-v="${n}">전체</button></div>
      <label class="switch-row"><input type="checkbox" id="ptShuffle" checked> 순서 섞기</label>
      <label class="switch-row"><input type="checkbox" id="ptKey" checked> 마지막 장에 정답 넣기</label>
      <button class="btn btn-primary btn-block" data-act="pt-go">${IC.print} 인쇄 · PDF 저장</button>
      <p class="muted" style="font-size:.78rem;line-height:1.6;margin:0;">인쇄 창에서 대상을 'PDF로 저장'으로 바꾸면 파일로 받을 수 있어요.</p></div>`);
  };
  ACTIONS['pt-opt'] = el => { const g = $(el.dataset.g); if (!g) return; g.querySelectorAll('button').forEach(b => b.classList.toggle('on', b === el)); };
  ACTIONS['pt-go'] = () => {
    const cat = curCat(); if (!cat) return;
    const pick = id => { const b = document.querySelector(`#${id} .on`); return b ? b.dataset.v : ''; };
    const type = pick('ptType') || 'm', num = parseInt(pick('ptNum'), 10) || cat.words.length;
    let ws = cat.words.slice(); if ($('ptShuffle') && $('ptShuffle').checked) ws = shuffled(ws);
    ws = ws.slice(0, num);
    const qs = ws.map((w, i) => ({ w, ask: type === 'x' ? (i % 2 ? 'w' : 'm') : type }));
    const row = (q, i, key) => `<li><span class="pt-q">${esc(q.ask === 'm' ? q.w.word : q.w.meaning)}</span><span class="pt-a">${key ? esc(q.ask === 'm' ? q.w.meaning : q.w.word) : ''}</span></li>`;
    const head = `<div class="pt-head"><h1>${esc(cat.name)}</h1><div class="pt-meta">${config.profile && config.profile.school ? `<span>${esc(config.profile.school)}</span>` : ''}<span>학번 __________</span><span>이름 ________________</span><span>날짜 ____________</span><span>점수 ______ / ${qs.length}</span></div><p class="pt-guide">${type === 'm' ? `${LN()} 단어의 뜻을 쓰세요.` : type === 'w' ? `우리말 뜻에 맞는 ${LN()} 단어를 쓰세요.` : `${LN()} 단어는 뜻을, 우리말은 ${LN()} 단어를 쓰세요.`}</p></div>`;
    let el = $('printArea'); if (!el) { el = document.createElement('div'); el.id = 'printArea'; document.body.appendChild(el); }
    el.innerHTML = `${head}<ol class="pt-list">${qs.map((q, i) => row(q, i, false)).join('')}</ol>` +
      ($('ptKey') && $('ptKey').checked ? `<div class="pt-key"><div class="pt-head"><h1>${esc(cat.name)} · 정답</h1></div><ol class="pt-list key">${qs.map((q, i) => row(q, i, true)).join('')}</ol></div>` : '') +
      '<div class="pt-foot">VocaPro 단어 시험지</div>';
    closeSheet();
    document.body.classList.add('printing');
    const done = () => { document.body.classList.remove('printing'); window.removeEventListener('afterprint', done); };
    window.addEventListener('afterprint', done);
    setTimeout(() => { try { window.print(); } catch (e) { toast('이 기기에서는 인쇄를 열 수 없어요.'); } setTimeout(done, 1500); }, 80);
  };

  /* =========================================================
   * 선생님 수업 도구 · 수업용 큰 화면
   * ======================================================= */
  const TEACH = [
    ['present', IC.play, 'i-mint', '수업용 큰 화면', '칠판이나 TV에 단어를 크게 띄워요'],
    ['book-print', IC.print, 'i-teal', '단어 시험지 만들기', '인쇄하거나 PDF로 나눠 줘요'],
    ['book-share', IC.book, 'i-grape', '단어장 링크 공유', '학생들이 링크 하나로 받아 가요'],
    ['exam-open', IC.trophy, 'i-coral', '실전 시험 미리 풀기', '학생이 보는 시험을 직접 확인해요'],
    ['quizshow', IC.sparkles, 'i-sun', '퀴즈 쇼', '4지선다를 크게 띄우고 팀 점수를 매겨요'],
    ['bingo', IC.grid, 'i-mint', '단어 빙고판', '학생마다 배치가 다른 빙고판을 인쇄해요'],
    ['picker', IC.users, 'i-grape', '발표자 뽑기 · 모둠', '번호나 반 명단에서 무작위로 뽑아요'],
    ['ctimer', IC.clock, 'i-teal', '수업 타이머', '활동 시간을 크게 띄우고 끝나면 알려요']
  ];
  function teachToolsHtml() {
    return `<div class="section-title"><span>수업 도구</span></div>${classEntryHtml() ? `<div class="tool-list cl-entry">${classEntryHtml()}</div>` : ''}<div class="teach-grid">${TEACH.map(([k, ic, c, t, d]) => `<button class="teach-card" data-act="teach" data-next="${k}"><span class="mg-ico ${c}">${ic}</span><b>${t}</b><small>${d}</small></button>`).join('')}</div>`;
  }
  ACTIONS.teach = el => {
    const next = el.dataset.next, books = categories.filter(c => c.words.length);
    if (next === 'exam-open' || next === 'picker' || next === 'ctimer') return ACTIONS[next]();
    if (!books.length) return toast('먼저 단어장에 단어를 담아 주세요. 기초 · 중학교 · 고등학교 · 수능 단어에서 바로 담을 수 있어요.');
    const t = TEACH.find(x => x[0] === next);
    openSheet(t ? t[3] : '단어장 고르기', `<p class="muted" style="margin:0 0 12px;font-size:.88rem;">어떤 단어장으로 할까요?</p><div class="menu-list">${books.map(c => `<button data-act="teach-go" data-id="${esc(c.id)}" data-next="${esc(next)}">${esc(c.name)} <span class="muted">· ${c.words.length}개</span></button>`).join('')}</div>`);
  };
  ACTIONS['teach-go'] = el => { currentCategoryId = el.dataset.id; closeSheet(); const f = ACTIONS[el.dataset.next]; setTimeout(() => f && f(), 60); };

  let PV = null;
  ACTIONS.present = () => {
    const cat = curCat(); if (!cat || !cat.words.length) return toast('단어를 먼저 담아 주세요.');
    PV = { name: cat.name, list: cat.words.slice(), i: 0, show: false };
    const ov = document.createElement('div'); ov.id = 'pvOv'; ov.className = 'pv'; document.body.appendChild(ov); document.body.classList.add('no-scroll');
    try { const d = document.documentElement; if (d.requestFullscreen && matchMedia('(min-width: 900px)').matches) d.requestFullscreen().catch(() => {}); } catch (e) {}
    pvDraw();
  };
  function pvDraw() {
    const ov = $('pvOv'); if (!ov || !PV) return;
    const w = PV.list[PV.i], n = PV.list.length;
    ov.innerHTML = `<div class="pv-top"><span class="pv-name">${esc(PV.name)}</span><span class="pv-n">${PV.i + 1} / ${n}</span><button class="pv-x" data-pv="x" aria-label="닫기">${IC.x}</button></div>
      <div class="pv-bar"><i style="width:${(PV.i + 1) / n * 100}%"></i></div>
      <div class="pv-main" data-pv="flip">
        <div class="pv-word">${esc(w.word)}</div>
        <div class="pv-pron">${esc(pronText(w))}</div>
        <div class="pv-back ${PV.show ? 'on' : ''}">${PV.show ? `<div class="pv-mean">${esc(w.meaning)}</div>${w.example ? `<div class="pv-ex">${esc(w.example)}${w.exampleKo ? `<small>${esc(w.exampleKo)}</small>` : ''}</div>` : ''}` : '<div class="pv-hint">눌러서 뜻 보기</div>'}</div>
      </div>
      <div class="pv-foot"><button data-pv="prev" aria-label="이전">${IC.prev}</button><button data-pv="say" aria-label="발음 듣기">${IC.speaker}</button><button class="pv-main-btn" data-pv="flip">${PV.show ? '뜻 숨기기' : '뜻 보기'}</button><button data-pv="mix" aria-label="섞기">${IC.shuffle}</button><button data-pv="next" aria-label="다음">${IC.next}</button></div>
      <div class="pv-keys"><span><kbd>Space</kbd>뜻</span><span><kbd>← →</kbd>이동</span><span><kbd>S</kbd>발음</span><span><kbd>Esc</kbd>닫기</span></div>`;
  }
  function pvDo(k) {
    if (!PV) return;
    if (k === 'x') { const ov = $('pvOv'); if (ov) ov.remove(); PV = null; if (!$('sheetOv').classList.contains('open') && !S.active) document.body.classList.remove('no-scroll'); try { if (document.fullscreenElement) document.exitFullscreen(); } catch (e) {} return; }
    if (k === 'flip') PV.show = !PV.show;
    else if (k === 'next') { if (PV.i < PV.list.length - 1) { PV.i++; PV.show = false; } else return toast('마지막 단어예요.'); }
    else if (k === 'prev') { if (PV.i > 0) { PV.i--; PV.show = false; } }
    else if (k === 'mix') { PV.list = shuffled(PV.list); PV.i = 0; PV.show = false; toast('순서를 섞었어요.'); }
    else if (k === 'say') { playAudio(PV.list[PV.i].word); return; }
    pvDraw();
  }
  document.addEventListener('click', e => { const b = e.target.closest('[data-pv]'); if (b && $('pvOv')) { e.preventDefault(); pvDo(b.dataset.pv); } });
  document.addEventListener('keydown', e => {
    if (!$('pvOv') || e.ctrlKey || e.metaKey || e.altKey) return;
    const m = { Escape: 'x', ' ': 'flip', Enter: 'flip', ArrowRight: 'next', ArrowLeft: 'prev', ArrowDown: 'flip', ArrowUp: 'flip', s: 'say', S: 'say' }[e.key];
    if (m) { e.preventDefault(); e.stopImmediatePropagation(); pvDo(m); }
  }, true);

