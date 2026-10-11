  /* =========================================================
   * 영어사전 · 오늘의 단어 · 단어 시험지
   * ======================================================= */
  let dictView = null, dictTimer = 0, dictSeq = 0;
  function dictOpen(q) {
    dictView = null;
    openSheet('영어사전', `<div class="dsearch">${IC.search}<input type="search" id="dictQ" placeholder="영어 단어를 입력하세요 (예: happy, went)" autocomplete="off" autocapitalize="none" spellcheck="false" enterkeyhint="search" value="${esc(q || '')}" oninput="dictType()" onkeydown="if(event.key==='Enter'){event.preventDefault();dictType(true);}"></div>
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
    if (!/^[a-z][a-z' .-]*$/i.test(q)) { out.innerHTML = '<div class="dict-hint">영어 단어로 찾아 주세요. 한글 뜻으로 찾을 때는 위의 번역 버튼을 써 보세요.</div>'; return; }
    const c = dictLetter(q), shard = c ? await dictShard(c) : {};
    const hit = await dictGet(q);
    if (seq !== dictSeq || !$('dictOut')) return;
    const sug = Object.keys(shard).filter(k => k !== q && k.startsWith(q) && Array.isArray(shard[k])).slice(0, 8);
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
    } else if (!sug.length) {
      h += `<div class="dict-none"><b>'${esc(raw)}'은(는) 내장 사전에 없어요.</b>${aiReady() ? '<button class="btn btn-soft" data-act="dict-ai">AI로 뜻 찾기</button>' : '<span class="muted">철자를 확인해 보세요.</span>'}</div>`;
    }
    if (sug.length) h += `<div class="dict-sug"><h4 class="syn-h">${hit ? '이런 단어도 있어요' : '혹시 이 단어인가요?'}</h4>${sug.map(k => `<button class="dict-row" data-act="dict-go" data-word="${esc(k)}"><b>${esc(shard[k][0])}</b><span>${esc(shard[k][1])}</span></button>`).join('')}</div>`;
    out.innerHTML = h;
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
    const list = gradeWords(GRADE_NAMES[config.grade] ? config.grade : 'm1'); if (!list.length) return null;
    const d = new Date(), n = Math.floor(new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() / 864e5);
    return list[(n * 37) % list.length];
  }
  function wotdHtml() {
    const e = wotdPick(); if (!e) return '';
    return `<div class="card wotd"><div class="wotd-top"><span class="wotd-tag">오늘의 단어</span><button class="wotd-sp" data-act="speak" data-text="${esc(e.w)}" aria-label="발음 듣기">${IC.speaker}</button></div>
      <button class="wotd-body" data-act="dict-open" data-word="${esc(e.w)}"><b>${esc(e.w)}</b><span>${esc(e.m)}</span></button><div class="wotd-ex" id="wotdEx"></div></div>`;
  }
  async function wotdFill() {
    const e = wotdPick(); if (!e || !$('wotdEx')) return;
    try { const d = await dictGet(e.w); const el = $('wotdEx'); if (d && d.example && el) el.innerHTML = `${esc(d.example)}<small>${esc(d.exampleKo || '')}</small>`; } catch (err) {}
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
    const head = `<div class="pt-head"><h1>${esc(cat.name)}</h1><div class="pt-meta"><span>이름 ________________</span><span>날짜 ____________</span><span>점수 ______ / ${qs.length}</span></div><p class="pt-guide">${type === 'm' ? '영어 단어의 뜻을 쓰세요.' : type === 'w' ? '우리말 뜻에 맞는 영어 단어를 쓰세요.' : '영어 단어는 뜻을, 우리말은 영어 단어를 쓰세요.'}</p></div>`;
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
   * 보안문자 · 약관 · 개인정보 처리방침
   * ======================================================= */
  let capText = '', authFails = 0;
  const capRnd = n => { try { const a = new Uint32Array(1); crypto.getRandomValues(a); return a[0] % n; } catch (e) { return Math.floor(Math.random() * n); } };
  function drawCaptcha() {
    const c = $('capCv'); if (!c) return;
    const W = c.width = 160, H = c.height = 52, x = c.getContext('2d'); if (!x) return;
    const set = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; capText = '';
    for (let i = 0; i < 5; i++) capText += set[capRnd(set.length)];
    x.fillStyle = '#eef1f5'; x.fillRect(0, 0, W, H);
    for (let i = 0; i < 7; i++) { x.strokeStyle = `hsl(${capRnd(360)},40%,60%)`; x.lineWidth = 1 + capRnd(2); x.beginPath(); x.moveTo(capRnd(W), capRnd(H)); x.bezierCurveTo(capRnd(W), capRnd(H), capRnd(W), capRnd(H), capRnd(W), capRnd(H)); x.stroke(); }
    for (let i = 0; i < capText.length; i++) {
      x.save(); x.translate(20 + i * 28, 28 + capRnd(8) - 4); x.rotate((capRnd(60) - 30) / 100);
      x.font = `800 ${26 + capRnd(6)}px sans-serif`; x.fillStyle = `hsl(${capRnd(360)},55%,28%)`; x.textAlign = 'center'; x.fillText(capText[i], 0, 0); x.restore();
    }
    for (let i = 0; i < 40; i++) { x.fillStyle = `rgba(60,60,60,${(capRnd(40) + 10) / 100})`; x.fillRect(capRnd(W), capRnd(H), 2, 2); }
  }
  function authExtraHtml(su) {
    return `<div id="capBox" style="display:${su || authFails >= 3 ? 'block' : 'none'}"><div class="cap-row"><canvas id="capCv" width="160" height="52" aria-label="보안문자"></canvas><button type="button" class="btn btn-soft" data-act="cap-refresh">새로고침</button></div><input type="text" id="capIn" placeholder="위 문자를 입력하세요" maxlength="5" autocapitalize="characters" autocomplete="off" spellcheck="false"></div>${su ? `<label class="switch-row"><input type="checkbox" id="auTerms"><span>(필수) ${kidMode ? '보호자와 함께 ' : ''}<a class="lg-a" data-act="legal" data-k="terms">이용약관</a> 및 <a class="lg-a" data-act="legal" data-k="privacy">개인정보 처리방침</a>${kidMode ? '을 읽고 ' : '에 '}동의해요</span></label>` : ''}`;
  }
  function authGate() {
    const su = authMode === 'signup';
    if (su) { const t = $('auTerms'); if (!t || !t.checked) return '이용약관과 개인정보 처리방침에 동의해 주세요.'; }
    if (su || authFails >= 3) {
      const v = (($('capIn') && $('capIn').value) || '').trim().toUpperCase();
      if (!capText || v !== capText) { drawCaptcha(); if ($('capIn')) $('capIn').value = ''; return '보안문자가 맞지 않아요. 새 문자로 다시 입력해 주세요.'; }
    }
    return '';
  }
  ACTIONS['cap-refresh'] = () => { drawCaptcha(); const i = $('capIn'); if (i) { i.value = ''; i.focus(); } };

