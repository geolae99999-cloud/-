
  /* =========================================================
   * 단어장 목록 / 단어장 상세
   * ======================================================= */
  function bookCardHtml(b) {
    const total = b.words.length;
    const mastered = b.words.filter(w => w.box >= 5).length;
    const end = endOfToday();
    const due = b.words.filter(w => w.box >= 1 && w.due <= end).length;
    const pct = total ? Math.round(mastered / total * 100) : 0;
    return `
      <div class="book" style="--bk:${bookColor(b.id)}" data-act="open-book" data-id="${esc(b.id)}">
        <div class="book-top"><span class="book-name">${esc(b.name)}</span>${due ? `<span class="badge b-learn">복습 ${due}</span>` : ''}</div>
        <div class="book-meta">${total}개 단어 · 마스터 ${mastered}개 (${pct}%)</div>
        <div class="bar"><i style="width:${pct}%"></i></div>
      </div>`;
  }
  function renderBooks() {
    $('folderContainer').innerHTML = categories.map(bookCardHtml).join('') ||
      '<div class="empty"><b>단어장이 없어요</b>위에서 이름을 입력하고 만들기를 눌러 보세요.</div>';
  }
  ACTIONS['add-book'] = () => {
    const input = $('inCatName');
    const val = input.value.trim();
    if (!val) return toast('단어장 이름을 입력하세요.');
    categories.push({ id: 'c' + uid(), name: val, words: [] });
    input.value = '';
    syncStorage(); renderBooks(); toast('단어장을 만들었어요.');
  };
  ACTIONS['open-book'] = el => openBook(el.dataset.id);

  let bookFilter = 'all', currentFilter = '', viewOrder = null;
  const openDrawers = new Set();

  function openBook(id) {
    if (!findBook(id)) return;
    currentCategoryId = id; bookFilter = 'all'; currentFilter = ''; viewOrder = null; openDrawers.clear();
    buildBookPane();
    go('paneBook');
  }
  function buildBookPane() {
    $('paneBook').innerHTML = `
      <div class="book-sum" id="bookSummary"></div>
      <div class="book-actions">
        <button class="btn btn-primary" data-act="start" data-mode="card" data-src="cat:${esc(currentCategoryId)}">카드 학습</button>
        <button class="btn btn-soft" data-act="start" data-mode="choice" data-src="cat:${esc(currentCategoryId)}">퀴즈</button>
        <button class="btn btn-soft" data-act="book-menu">더보기</button>
      </div>
      <div class="toolbar">
        <input type="text" id="searchFilter" placeholder="단어나 뜻 검색" oninput="onSearch(this.value)">
        <button class="icon-btn" data-act="shuffle" aria-label="섞기">🔀</button>
        <button class="icon-btn ${document.body.classList.contains('hide-content') ? 'on' : ''}" id="btnBlurToggle" data-act="blur" aria-label="뜻 가리기">🙈</button>
      </div>
      <div class="chips" id="bookChips"></div>
      <div class="word-list" id="wordCardStream"></div>
      <button class="fab" data-act="add-sheet" aria-label="단어 추가">＋</button>`;
  }
  function onSearch(v) { currentFilter = v.trim(); renderWordList(); }

  const FILTERS = [['all', '전체'], ['new', '새 단어'], ['learning', '학습 중'], ['mastered', '마스터'], ['star', '⭐ 즐겨찾기'], ['miss', '오답']];
  function renderBookDynamic() {
    const cat = curCat();
    if (!cat) return go('tabBooks');
    const end = endOfToday();
    const total = cat.words.length, mastered = cat.words.filter(w => w.box >= 5).length;
    const due = cat.words.filter(w => w.box >= 1 && w.due <= end).length;
    $('bookSummary').innerHTML = `<div class="sum-box"><b>${total}</b><span>전체</span></div><div class="sum-box"><b>${mastered}</b><span>마스터</span></div><div class="sum-box"><b>${due}</b><span>오늘 복습</span></div>`;
    $('bookChips').innerHTML = FILTERS.map(([k, n]) => `<button class="chip ${bookFilter === k ? 'on' : ''}" data-act="filter" data-f="${k}">${n}</button>`).join('');
    renderWordList();
  }
  ACTIONS.filter = el => { bookFilter = el.dataset.f; renderBookDynamic(); };
  ACTIONS.shuffle = () => {
    const cat = curCat();
    if (!cat || cat.words.length <= 1) return;
    viewOrder = shuffled(cat.words.map(w => w.id));
    renderWordList(); toast('순서를 섞었어요.');
  };
  ACTIONS.blur = () => {
    document.body.classList.toggle('hide-content');
    const b = $('btnBlurToggle');
    if (b) b.classList.toggle('on', document.body.classList.contains('hide-content'));
    renderWordList();
  };

  function visibleWords() {
    const cat = curCat();
    if (!cat) return [];
    let list = [...cat.words];
    if (viewOrder) {
      const pos = new Map(viewOrder.map((id, i) => [id, i]));
      list.sort((a, b) => (pos.has(a.id) ? pos.get(a.id) : -1) - (pos.has(b.id) ? pos.get(b.id) : -1));
    }
    list = list.filter(w => {
      if (bookFilter === 'new') return w.box === 0;
      if (bookFilter === 'learning') return w.box >= 1 && w.box < 5;
      if (bookFilter === 'mastered') return w.box >= 5;
      if (bookFilter === 'star') return w.star;
      if (bookFilter === 'miss') return w.miss > 0;
      return true;
    });
    if (currentFilter) {
      const q = currentFilter.toLowerCase();
      list = list.filter(w => w.word.toLowerCase().includes(q) || w.meaning.toLowerCase().includes(q));
    }
    return list;
  }
  function lvlBadge(w) {
    if (w.box === 0) return '<span class="badge b-new">NEW</span>';
    if (w.box >= 5) return '<span class="badge b-ok">마스터</span>';
    return `<span class="badge b-learn">Lv.${w.box}</span>`;
  }
  function noteHtml(n) {
    if (!n) return '';
    let h = '<div class="note-box">';
    if (n.etymology) h += `<div><h4>어원 · 구조</h4>${esc(n.etymology)}</div>`;
    if (n.tip) h += `<div><h4>암기 팁</h4>${esc(n.tip)}</div>`;
    if (n.examples.length) h += `<div><h4>예문</h4><ul>${n.examples.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>`;
    if (n.confusable.length) h += `<div><h4>헷갈리는 단어</h4><ul>${n.confusable.map(c => `<li><b>${esc(c.word)}</b> ${esc(c.meaning)} · ${esc(c.diff)}</li>`).join('')}</ul></div>`;
    return h + '</div>';
  }

  function renderWordList() {
    const box = $('wordCardStream');
    if (!box) return;
    const list = visibleWords();
    if (!list.length) {
      const cat = curCat();
      box.innerHTML = (cat && cat.words.length === 0)
        ? '<div class="empty"><b>첫 단어를 추가해 볼까요?</b>오른쪽 아래 + 버튼을 눌러 단어를 넣으면 AI가 뜻과 예문을 채워줘요.</div>'
        : '<div class="empty"><b>조건에 맞는 단어가 없어요</b>필터나 검색어를 바꿔 보세요.</div>';
      return;
    }
    box.innerHTML = list.map(w => {
      const syns = w.synonyms.split(',').map(s => s.trim()).filter(Boolean);
      const open = openDrawers.has(w.id);
      return `
      <div class="wcard ${w.box >= 5 ? 'mastered' : ''}" data-wid="${esc(w.id)}">
        <div class="w-row">
          <button class="w-star ${w.star ? 'on' : ''}" data-act="star" aria-label="즐겨찾기">${w.star ? '★' : '☆'}</button>
          <div class="w-main" data-act="expand">
            <div class="w-head"><span class="w-word">${esc(w.word)}</span><span class="w-pron">${esc(w.phonetic)}</span>${w.koreanPron ? `<span class="w-kpron">[${esc(w.koreanPron)}]</span>` : ''}</div>
            <div class="w-mean">${esc(w.meaning)}</div>
          </div>
          <div class="w-side">
            <button class="w-speak" data-act="speak" data-text="${esc(w.word)}" aria-label="발음 듣기">🔊</button>
            <div class="w-badges">${w.miss > 0 ? '<span class="badge b-bad">오답</span>' : ''}${lvlBadge(w)}</div>
          </div>
        </div>
        ${open ? `
        <div class="w-detail">
          ${w.example ? `<div><h4>예문</h4>${esc(w.example)}</div>` : ''}
          ${syns.length ? `<div><h4>비슷한 단어 (눌러서 뜻 보기)</h4><div class="syn-chips">${syns.map(s => `<button class="syn" data-act="syn" data-word="${esc(s)}">${esc(s)}</button>`).join('')}</div></div>` : ''}
          <div class="muted" style="font-size:.78rem;">${dueText(w)}${w.wrong ? ` · 틀린 횟수 ${w.wrong}` : ''}</div>
          <div class="w-tools">
            <button class="btn btn-soft" data-act="mem">${w.box >= 5 ? '마스터 취소' : '이미 알아요'}</button>
            <button class="btn btn-soft danger" data-act="del-word">삭제</button>
          </div>
        </div>` : ''}
      </div>`;
    }).join('');
  }

  function wordFromEl(el) {
    const card = el.closest('[data-wid]');
    const cat = curCat();
    return cat && card ? cat.words.find(w => w.id === card.dataset.wid) : null;
  }
  ACTIONS.star = el => { const w = wordFromEl(el); if (!w) return; w.star = !w.star; syncStorage(); renderWordList(); };
  ACTIONS.expand = (el, e) => {
    const w = wordFromEl(el); if (!w) return;
    const mean = el.querySelector('.w-mean');
    if (document.body.classList.contains('hide-content') && mean && !mean.classList.contains('reveal')) { mean.classList.add('reveal'); return; }
    openDrawers.has(w.id) ? openDrawers.delete(w.id) : openDrawers.add(w.id);
    renderWordList();
  };
  ACTIONS.speak = (el, e) => { e.stopPropagation(); playAudio(el.dataset.text); };
  ACTIONS.mem = el => {
    const w = wordFromEl(el); if (!w) return;
    if (w.box >= 5) { w.box = 0; w.due = 0; w.miss = 0; }
    else { w.box = 5; w.due = addDays(startOfDay(), INTERVALS[5]); w.last = dayKey(); w.miss = 0; }
    syncStorage(); renderBookDynamic();
  };
  ACTIONS['del-word'] = async el => {
    const w = wordFromEl(el), cat = curCat(); if (!w || !cat) return;
    if (!await ask(`'${w.word}' 단어를 삭제할까요?`, { ok: '삭제', danger: true })) return;
    cat.words = cat.words.filter(x => x.id !== w.id);
    syncStorage(); renderBookDynamic();
  };
  ACTIONS.syn = el => inspectSynonym(el.dataset.word);

  /* ----- 시트 ----- */
  function openSheet(title, html) {
    $('sheetTitle').textContent = title;
    $('sheetBody').innerHTML = html;
    $('sheetOv').classList.add('open');
    document.body.classList.add('no-scroll');
  }
  function closeSheet() {
    bulkCancel = true;
    $('sheetOv').classList.remove('open');
    if (!$('studyScreen').classList.contains('open')) document.body.classList.remove('no-scroll');
  }
  ACTIONS['sheet-close'] = closeSheet;
  ACTIONS['sheet-bg'] = (el, e) => { if (e.target === el) closeSheet(); };

  /* ----- 단어 추가 시트 ----- */
  ACTIONS['add-sheet'] = () => {
    openSheet('단어 추가', `
      <div class="seg" style="margin-bottom:14px;">
        <button class="on" data-act="add-tab" data-t="one">한 개씩</button>
        <button data-act="add-tab" data-t="bulk">여러 개 한 번에</button>
      </div>
      <div id="addOne" class="form-stack">
        <div class="row" style="gap:8px;">
          <input type="text" id="fieldWord" placeholder="영단어 (예: consistent)" autocomplete="off" autocapitalize="none" spellcheck="false" onkeydown="if(event.key==='Enter') executeFastAi()" style="flex:2;">
          <button class="btn btn-primary" id="btnRunAi" onclick="executeFastAi()" style="flex:1;">AI 완성</button>
        </div>
        <div class="timer" id="aiTimerBadge">AI 소요 시간 <span id="aiTimerCount">0.0초</span></div>
        <input type="text" id="fieldMeaning" placeholder="한국어 뜻">
        <div class="row" style="gap:8px;">
          <input type="text" id="fieldPhonetic" placeholder="발음기호">
          <input type="text" id="fieldKoreanPron" placeholder="한글 발음">
        </div>
        <input type="text" id="fieldExample" placeholder="예문 (해석)">
        <input type="text" id="fieldSynonyms" placeholder="비슷한 단어 (쉼표로 구분)">
        <button class="btn btn-primary btn-block" style="margin-top:6px;" onclick="saveNewWord()">단어 저장</button>
      </div>
      <div id="addBulk" class="form-stack" style="display:none;">
        <textarea id="bulkText" placeholder="한 줄에 단어 하나씩 붙여넣으세요.&#10;&#10;consistent&#10;reluctant&#10;apple, 사과&#10;&#10;뜻을 같이 적으면(쉼표, 탭, ' - ' 구분) 그 뜻을 쓰고 나머지는 AI가 채워요."></textarea>
        <div class="bulk-status" id="bulkStatus">한 번에 최대 60개까지 넣을 수 있어요.</div>
        <button class="btn btn-primary btn-block" id="btnBulk" data-act="bulk-run">AI로 한꺼번에 채우고 저장</button>
      </div>`);
    if (!bulkBusy) bulkCancel = false;
    setTimeout(() => { const f = $('fieldWord'); if (f) f.focus(); }, 250);
  };
  ACTIONS['add-tab'] = el => {
    const bulk = el.dataset.t === 'bulk';
    $('addOne').style.display = bulk ? 'none' : 'flex';
    $('addBulk').style.display = bulk ? 'flex' : 'none';
    el.parentElement.querySelectorAll('button').forEach(b => b.classList.toggle('on', b === el));
  };

  function saveNewWord() {
    const cat = curCat();
    if (!cat) return;
    const word = $('fieldWord').value.trim();
    const meaning = $('fieldMeaning').value.trim();
    if (!word || !meaning) return toast('단어와 뜻은 꼭 필요해요.');
    if (cat.words.some(w => w.word.toLowerCase() === word.toLowerCase())) return toast(`'${word}' 는 이 단어장에 이미 있어요.`);
    cat.words.unshift(sanitizeWord({
      id: uid(), word, meaning,
      phonetic: $('fieldPhonetic').value, koreanPron: $('fieldKoreanPron').value,
      example: $('fieldExample').value, synonyms: $('fieldSynonyms').value
    }));
    syncStorage();
    ['fieldWord', 'fieldMeaning', 'fieldPhonetic', 'fieldKoreanPron', 'fieldExample', 'fieldSynonyms'].forEach(id => { $(id).value = ''; });
    $('aiTimerBadge').style.display = 'none';
    renderBookDynamic();
    toast('저장했어요.');
    $('fieldWord').focus();
  }

  let bulkCancel = false, bulkBusy = false;
  ACTIONS['bulk-run'] = async () => {
    const btn = $('btnBulk');
    if (bulkBusy) { bulkCancel = true; if (btn.dataset.running !== '1') toast('이전 작업을 마무리하는 중이에요. 잠시 후 다시 눌러 주세요.'); return; }
    const cat = curCat(); if (!cat) return;
    const lines = $('bulkText').value.split('\n').map(s => s.trim()).filter(Boolean).slice(0, 60);
    if (!lines.length) return toast('단어를 한 줄에 하나씩 입력하세요.');

    bulkBusy = true; btn.dataset.running = '1'; btn.textContent = '중지'; bulkCancel = false;
    const status = $('bulkStatus');
    let added = 0, skipped = 0, failed = [], stopped = '';

    for (let i = 0; i < lines.length; i++) {
      if (bulkCancel) { stopped = '중지했어요.'; break; }
      const parts = lines[i].split(/\t|\s+[-–—]\s+|\s*[,;]\s*/);
      const word = parts[0].trim();
      const userMeaning = parts.slice(1).join(', ').trim();
      if (!word) continue;
      if (cat.words.some(w => w.word.toLowerCase() === word.toLowerCase())) { skipped++; continue; }
      status.textContent = `${i + 1} / ${lines.length}  ${word} 처리 중...`;
      let item = null;
      try {
        const ai = await callAi(buildPrompt(word, true));
        item = { ...ai, meaning: userMeaning || ai.meaning };
      } catch (err) {
        if ([401, 403, 429].includes(err.status)) { stopped = err.message.split('\n')[0]; break; }
        if (userMeaning) item = { meaning: userMeaning };
        else failed.push(word);
      }
      if (item) {
        cat.words.splice(added, 0, sanitizeWord({ id: uid(), word, ...item }));
        added++;
        if (added % 5 === 0) syncStorage();
      }
      await sleep(250);
    }
    syncStorage(); bulkBusy = false; bulkCancel = false;
    btn.dataset.running = '0'; btn.textContent = 'AI로 한꺼번에 채우고 저장';
    renderBookDynamic();
    let msg = `${added}개 저장했어요.`;
    if (skipped) msg += `\n이미 있어서 건너뜀 ${skipped}개`;
    if (failed.length) msg += `\n실패 ${failed.length}개: ${failed.join(', ')}`;
    if (stopped) msg += `\n${stopped}`;
    status.textContent = msg;
    if (added) toast(`${added}개 단어를 저장했어요.`);
  };

  /* ----- 단어장 메뉴 / CSV ----- */
  ACTIONS['book-menu'] = () => {
    openSheet('단어장 관리', `<div class="menu-list">
      <button data-act="book-rename">이름 바꾸기</button>
      <button data-act="csv-export">CSV로 내보내기</button>
      <button data-act="csv-import">CSV 가져오기 (엑셀, Quizlet 등)</button>
      <button data-act="book-del" class="danger">단어장 삭제</button></div>
      <p class="muted" style="font-size:.78rem;margin-top:12px;line-height:1.6;">CSV 열 순서: 단어, 뜻, 발음기호, 한글 발음, 예문, 비슷한 단어. 앞 두 열(단어, 뜻)만 있어도 가져올 수 있어요.</p>`);
  };
  ACTIONS['book-rename'] = async () => {
    const cat = curCat(); if (!cat) return;
    const name = await ask('새 이름을 입력하세요.', { input: cat.name });
    if (name && name.trim()) { cat.name = name.trim().slice(0, 40); syncStorage(); closeSheet(); $('headTitle').textContent = cat.name; }
  };
  ACTIONS['book-del'] = async () => {
    const cat = curCat(); if (!cat) return;
    if (!await ask(`'${cat.name}' 단어장과 안의 단어 ${cat.words.length}개를 모두 삭제할까요?`, { ok: '삭제', danger: true })) return;
    categories = categories.filter(c => c.id !== cat.id);
    syncStorage(); closeSheet(); go('tabBooks');
  };
  ACTIONS['csv-export'] = () => {
    const cat = curCat(); if (!cat) return;
    const q = v => '"' + String(v).replace(/"/g, '""') + '"';
    const rows = [['word', 'meaning', 'phonetic', 'koreanPron', 'example', 'synonyms'].join(',')]
      .concat(cat.words.map(w => [w.word, w.meaning, w.phonetic, w.koreanPron, w.example, w.synonyms].map(q).join(',')));
    download(`${cat.name.replace(/[\\/:*?"<>|]/g, '_')}.csv`, '﻿' + rows.join('\r\n'), 'text/csv;charset=utf-8');
    closeSheet(); toast('CSV 파일을 내려받았어요.');
  };
  ACTIONS['csv-import'] = () => { closeSheet(); $('csvFile').click(); };

  function parseCsv(text) {
    text = text.replace(/^﻿/, '');
    const first = text.split(/\r?\n/)[0] || '';
    const delim = first.includes('\t') ? '\t' : ',';
    const rows = []; let row = [], cur = '', q = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (q) {
        if (ch === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += ch;
      } else if (ch === '"' && cur === '') q = true;
      else if (ch === delim) { row.push(cur); cur = ''; }
      else if (ch === '\n' || ch === '\r') {
        if (ch === '\r' && text[i + 1] === '\n') i++;
        row.push(cur); cur = '';
        if (row.some(c => c.trim() !== '')) rows.push(row);
        row = [];
      } else cur += ch;
    }
    row.push(cur);
    if (row.some(c => c.trim() !== '')) rows.push(row);
    return rows;
  }
  function importCsv(e) {
    const f = e.target.files[0]; if (!f) return;
    const cat = curCat();
    const r = new FileReader();
    r.onload = ev => {
      try {
        if (!cat) throw new Error('no book');
        const buf = ev.target.result;
        let txt;
        try { txt = new TextDecoder('utf-8', { fatal: true }).decode(buf); }
        catch (e1) { try { txt = new TextDecoder('euc-kr').decode(buf); } catch (e2) { txt = new TextDecoder('utf-8').decode(buf); } }
        let rows = parseCsv(txt);
        if (rows.length && /^(word|단어|english|term)$/i.test(str(rows[0][0]))) rows.shift();
        let added = 0, skipped = 0;
        rows.forEach(c => {
          const word = str(c[0]), meaning = str(c[1]);
          if (!word || !meaning) { skipped++; return; }
          if (cat.words.some(w => w.word.toLowerCase() === word.toLowerCase())) { skipped++; return; }
          cat.words.push(sanitizeWord({ id: uid(), word, meaning, phonetic: c[2], koreanPron: c[3], example: c[4], synonyms: c[5] }));
          added++;
        });
        syncStorage(); renderBookDynamic();
        toast(`${added}개 가져왔어요${skipped ? ` (건너뜀 ${skipped}개)` : ''}.`);
      } catch (err) { say('CSV 파일을 읽지 못했어요. 형식을 확인해 주세요.'); }
      e.target.value = '';
    };
    r.readAsArrayBuffer(f);
  }

  /* =========================================================
   * 학습 탭 (소스 + 모드 선택)
   * ======================================================= */
  const MODES = {
    card:    { name: '플래시카드', ico: '🃏', desc: '밀어서 외웠음 / 모름' },
    choice:  { name: '뜻 고르기', ico: '✅', desc: '단어를 보고 뜻 맞히기' },
    rchoice: { name: '단어 고르기', ico: '🔁', desc: '뜻을 보고 단어 맞히기' },
    spell:   { name: '스펠링', ico: '⌨️', desc: '뜻을 보고 직접 쓰기' },
    dict:    { name: '듣고 쓰기', ico: '🎧', desc: '발음을 듣고 타이핑' },
    listen:  { name: '듣기 모드', ico: '🔊', desc: '자동으로 이어 듣기' }
  };
  const studyPrefs = { src: 'due', count: SESSION_DEFAULT };
  const parseSrc = s => (s && s.startsWith('cat:')) ? { type: 'cat', id: s.slice(4) } : { type: s || 'all' };
  const srcKey = src => src.type === 'cat' ? 'cat:' + src.id : src.type;

  function poolFor(src) {
    const end = startOfDay() + DAY - 1, all = allWords();
    switch (src.type) {
      case 'cat': return all.filter(x => x.catId === src.id);
      case 'due': return all.filter(x => x.w.box >= 1 && x.w.due <= end);
      case 'new': return all.filter(x => x.w.box === 0);
      case 'wrong': return all.filter(x => x.w.miss > 0);
      case 'star': return all.filter(x => x.w.star);
      default: return all;
    }
  }
  const EMPTY_MSG = { due: '오늘 복습할 단어가 없어요. 잘하고 있어요!', new: '새 단어가 없어요. 단어를 추가해 보세요.', wrong: '오답노트가 비어 있어요.', star: '즐겨찾기한 단어가 없어요. 단어 카드의 ☆를 눌러 보세요.', cat: '이 단어장에 단어가 없어요.', all: '단어가 없어요. 먼저 단어를 추가해 보세요.' };

  function renderStudy() {
    const c = counts();
    const srcs = [
      { k: 'due', n: '오늘 복습', c: c.due }, { k: 'new', n: '새 단어', c: c.newW },
      { k: 'wrong', n: '오답노트', c: c.miss }, { k: 'star', n: '즐겨찾기', c: c.star }, { k: 'all', n: '전체', c: c.total }
    ].concat(categories.map(b => ({ k: 'cat:' + b.id, n: b.name, c: b.words.length })));
    if (!srcs.some(s => s.k === studyPrefs.src)) studyPrefs.src = 'all';
    const counts4 = [[10, '10개'], [20, '20개'], [50, '50개'], [0, '전체']];
    $('tabStudy').innerHTML = `
      <h2 class="page-title">무엇을 공부할까요?</h2>
      <div class="src-row">${srcs.map(s => `<button class="src ${studyPrefs.src === s.k ? 'on' : ''}" data-act="pick-src" data-k="${esc(s.k)}"><span>${esc(s.n)}</span><b>${s.c}</b></button>`).join('')}</div>
      <div class="section-title" style="margin-top:14px;"><span>한 번에 학습할 개수</span></div>
      <div class="seg">${counts4.map(([v, n]) => `<button class="${studyPrefs.count === v ? 'on' : ''}" data-act="pick-count" data-v="${v}">${n}</button>`).join('')}</div>
      <div class="section-title"><span>학습 방법</span></div>
      <div class="modes">${Object.keys(MODES).map(k => `<button class="mode" data-act="study-start" data-mode="${k}"><span class="ico">${MODES[k].ico}</span><b>${MODES[k].name}</b><span>${MODES[k].desc}</span></button>`).join('')}</div>`;
  }
  ACTIONS['pick-src'] = el => { studyPrefs.src = el.dataset.k; renderStudy(); };
  ACTIONS['pick-count'] = el => { studyPrefs.count = parseInt(el.dataset.v, 10); renderStudy(); };
  ACTIONS['study-start'] = el => startSession(el.dataset.mode, parseSrc(studyPrefs.src), studyPrefs.count);
