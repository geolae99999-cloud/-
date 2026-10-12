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
    const head = `<div class="pt-head"><h1>${esc(cat.name)}</h1><div class="pt-meta">${config.profile && config.profile.school ? `<span>${esc(config.profile.school)}</span>` : ''}<span>학번 __________</span><span>이름 ________________</span><span>날짜 ____________</span><span>점수 ______ / ${qs.length}</span></div><p class="pt-guide">${type === 'm' ? '영어 단어의 뜻을 쓰세요.' : type === 'w' ? '우리말 뜻에 맞는 영어 단어를 쓰세요.' : '영어 단어는 뜻을, 우리말은 영어 단어를 쓰세요.'}</p></div>`;
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
    ['exam-open', IC.trophy, 'i-coral', '실전 시험 미리 풀기', '학생이 보는 시험을 직접 확인해요']
  ];
  function teachToolsHtml() {
    return `<div class="section-title"><span>수업 도구</span></div>${classEntryHtml() ? `<div class="tool-list cl-entry">${classEntryHtml()}</div>` : ''}<div class="teach-grid">${TEACH.map(([k, ic, c, t, d]) => `<button class="teach-card" data-act="teach" data-next="${k}"><span class="mg-ico ${c}">${ic}</span><b>${t}</b><small>${d}</small></button>`).join('')}</div>`;
  }
  ACTIONS.teach = el => {
    const next = el.dataset.next, books = categories.filter(c => c.words.length);
    if (next === 'exam-open') return ACTIONS['exam-open']();
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

  /* =========================================================
   * 단어장 공유 (링크 하나로 반 친구, 선생님과 나눠요)
   * ======================================================= */
  const b64u = u8 => { let s = ''; for (let i = 0; i < u8.length; i += 8192) s += String.fromCharCode.apply(null, u8.subarray(i, i + 8192)); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
  const unb64u = t => { const s = atob(t.replace(/-/g, '+').replace(/_/g, '/')); const u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return u; };
  async function zipBytes(u8, inflate) {
    const cs = inflate ? new DecompressionStream('deflate-raw') : new CompressionStream('deflate-raw');
    return new Uint8Array(await new Response(new Blob([u8]).stream().pipeThrough(cs)).arrayBuffer());
  }
  async function shareEncode(cat) {
    const raw = new TextEncoder().encode(JSON.stringify({ n: cat.name, w: cat.words.map(w => [w.word, w.meaning]) }));
    if (typeof CompressionStream === 'function') { try { return 'z' + b64u(await zipBytes(raw)); } catch (e) {} }
    return 'j' + b64u(raw);
  }
  async function shareDecode(code) {
    const t = String(code || ''), body = unb64u(t.slice(1));
    const raw = t[0] === 'z' ? await zipBytes(body, true) : body;
    const o = JSON.parse(new TextDecoder().decode(raw));
    const words = (Array.isArray(o.w) ? o.w : []).filter(a => Array.isArray(a) && a[0] && a[1]).slice(0, 2000).map(a => [String(a[0]).slice(0, 80), String(a[1]).slice(0, 200)]);
    if (!words.length) throw new Error('empty');
    return { name: String(o.n || '공유받은 단어장').slice(0, 40), words };
  }
  ACTIONS['book-share'] = async () => {
    const cat = curCat(); if (!cat) return;
    if (!cat.words.length) return toast('단어를 먼저 담아 주세요.');
    const url = location.origin + location.pathname + '#s=' + await shareEncode(cat);
    openSheet('단어장 공유', `<div class="form-stack">
      <div class="share-card"><span class="mg-ico i-mint">${IC.book}</span><div><b>${esc(cat.name)}</b><small>단어 ${cat.words.length}개 · 받는 사람도 VocaPro에서 바로 공부할 수 있어요</small></div></div>
      <input id="shareUrl" readonly value="${esc(url)}" onclick="this.select()">
      <div class="row"><button class="btn btn-soft" data-act="share-copy">링크 복사</button>${navigator.share ? '<button class="btn btn-primary" data-act="share-send">보내기</button>' : ''}</div>
      <p class="muted" style="font-size:.78rem;line-height:1.6;margin:0;">링크 안에 단어와 뜻이 들어 있어요. 서버에 따로 저장되지 않고, 학습 기록은 함께 보내지 않아요.${url.length > 8000 ? ' 단어가 많아서 링크가 길어요. 메신저에 따라 잘릴 수 있으니 CSV 내보내기도 함께 써 보세요.' : ''}</p></div>`);
  };
  ACTIONS['share-copy'] = async () => { const i = $('shareUrl'); if (!i) return; try { await navigator.clipboard.writeText(i.value); toast('링크를 복사했어요.'); } catch (e) { i.select(); toast('링크를 길게 눌러 복사해 주세요.'); } };
  ACTIONS['share-send'] = async () => { const i = $('shareUrl'), cat = curCat(); if (!i) return; try { await navigator.share({ title: 'VocaPro 단어장', text: `${cat ? cat.name : '단어장'} (VocaPro)`, url: i.value }); } catch (e) {} };

  // 공유 링크로 들어오면: 로그인 뒤에 담을지 물어봐요
  const SHARE_KEY = 'vocapro_share_in';
  (function shareCapture() {
    try {
      const m = location.hash.match(/^#s=([A-Za-z0-9_-]+)$/); if (!m) return;
      sessionStorage.setItem(SHARE_KEY, m[1]); history.replaceState(null, '', location.pathname + location.search);
    } catch (e) {}
  })();
  let shareWait = 0;
  function shareCheck() {
    let code = ''; try { code = sessionStorage.getItem(SHARE_KEY) || ''; } catch (e) {}
    if (!code || !currentUser) return;
    clearTimeout(shareWait);
    if ($('pfOv') || $('obOv') || $('ltOv') || document.querySelector('#recOv.show') || $('sheetOv').classList.contains('open') || S.active) { shareWait = setTimeout(shareCheck, 800); return; }
    shareDecode(code).then(d => {
      shareIn = d;
      openSheet('공유받은 단어장', `<div class="form-stack">
        <div class="share-card"><span class="mg-ico i-mint">${IC.book}</span><div><b>${esc(d.name)}</b><small>단어 ${d.words.length}개</small></div></div>
        <div class="share-prev">${d.words.slice(0, 8).map(([w, m]) => `<div><b>${esc(w)}</b><span>${esc(m)}</span></div>`).join('')}${d.words.length > 8 ? `<div class="muted">외 ${d.words.length - 8}개</div>` : ''}</div>
        <button class="btn btn-primary btn-block" data-act="share-take">내 단어장으로 담기</button>
        <button class="btn btn-soft btn-block" data-act="share-skip">담지 않기</button></div>`);
    }).catch(() => { try { sessionStorage.removeItem(SHARE_KEY); } catch (e) {} toast('공유 링크를 읽지 못했어요. 링크가 잘리지 않았는지 확인해 주세요.'); });
  }
  let shareIn = null;
  ACTIONS['share-skip'] = () => { try { sessionStorage.removeItem(SHARE_KEY); } catch (e) {} shareIn = null; closeSheet(); };
  ACTIONS['share-take'] = async el => {
    const d = shareIn; if (!d) return; el.disabled = true; el.textContent = '담는 중...';
    try { sessionStorage.removeItem(SHARE_KEY); } catch (e) {}
    await dictPreload(d.words.map(a => a[0]));
    let nm = d.name, k = 2; while (categories.some(c => c.name === nm)) nm = `${d.name} (${k++})`;
    const cat = { id: 'c' + uid(), name: nm, words: [] }, seen = new Set();
    for (const [w, m] of d.words) {
      if (seen.has(w.toLowerCase())) continue; seen.add(w.toLowerCase());
      let full = null; try { full = await dictGet(w); } catch (e) {}
      cat.words.push(sanitizeWord({ ...(full || {}), id: uid(), word: w, meaning: m }));
    }
    categories.push(cat); syncStorage(); shareIn = null; closeSheet();
    toast(`'${nm}' 단어장에 ${cat.words.length}개를 담았어요.`);
    try { openBook(cat.id); } catch (e) { go('tabBooks'); }
  };

