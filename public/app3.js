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
      <div class="book${bookSel ? ' sel' + (bookSel.has(b.id) ? ' on' : '') : ''}" style="--bk:${bookColor(b.id)}" data-act="${bookSel ? 'book-pick' : 'open-book'}" data-id="${esc(b.id)}" role="${bookSel ? 'checkbox' : 'button'}"${bookSel ? ` aria-checked="${bookSel.has(b.id)}"` : ''} tabindex="0" aria-label="${esc(b.name)} 단어장 ${bookSel ? '고르기' : '열기'}">${bookSel ? `<span class="bk-chk">${IC.tick}</span>` : ''}
        <div class="book-spine"><b>${total}</b><small>단어</small></div>
        <div class="book-body">
          <div class="book-top"><span class="book-name">${esc(b.name)}</span>${due ? `<span class="badge b-learn">복습 ${due}</span>` : ''}</div>
          <div class="book-meta">마스터 ${mastered}개 · ${pct}%</div>
          <div class="bar"><i style="width:${pct}%"></i></div>
        </div>
      </div>`;
  }
  // 단어장 여러 개 골라 지우기: bookSel 이 있으면 카드를 누를 때 열지 않고 골라요
  let bookSel = null;
  function renderBooks() {
    if (bookSel) bookSel.forEach(id => { if (!findBook(id)) bookSel.delete(id); });
    const eb = $('bkEdit'); if (eb) { eb.textContent = bookSel ? '취소' : '여러 개 지우기'; eb.hidden = !bookSel && !categories.length; }
    $('folderContainer').innerHTML = (bookSel && categories.length ? `<div class="bk-bar"><button class="btn btn-sm btn-soft" data-act="book-all">${bookSel.size === categories.length ? '모두 풀기' : '모두 고르기'}</button><span>${bookSel.size}개 골랐어요</span><button class="btn btn-sm btn-soft cl-danger" data-act="books-del"${bookSel.size ? '' : ' disabled'}>지우기</button></div>` : '') +
      (categories.map(bookCardHtml).join('') || emptyHtml('단어장이 없어요', '위에서 이름을 입력하고 만들기를 눌러 보세요.'));
  }
  ACTIONS['books-edit'] = () => { bookSel = bookSel ? null : new Set(); renderBooks(); };
  ACTIONS['book-pick'] = el => { if (!bookSel) return; const id = el.dataset.id; if (bookSel.has(id)) bookSel.delete(id); else bookSel.add(id); renderBooks(); const c = document.querySelector(`.book[data-id="${CSS.escape(id)}"]`); if (c) c.focus(); };
  ACTIONS['book-all'] = () => { if (!bookSel) return; bookSel = bookSel.size === categories.length ? new Set() : new Set(categories.map(c => c.id)); renderBooks(); };
  ACTIONS['books-del'] = async () => {
    if (!bookSel || !bookSel.size) return;
    const pick = categories.filter(c => bookSel.has(c.id)), nw = pick.reduce((a, c) => a + c.words.length, 0);
    if (!await ask(`단어장 ${pick.length}개와 안의 단어 ${nw}개를 모두 삭제할까요?\n${pick.slice(0, 5).map(c => '· ' + c.name).join('\n')}${pick.length > 5 ? `\n· 그 밖에 ${pick.length - 5}개` : ''}\n지운 단어장은 되돌릴 수 없어요.`, { ok: `${pick.length}개 삭제`, danger: true })) return;
    const ids = new Set(pick.map(c => c.id)); categories = categories.filter(c => !ids.has(c.id));
    if (ids.has(currentCategoryId)) currentCategoryId = null;
    bookSel = null; syncStorage(); renderBooks(); toast(`단어장 ${pick.length}개를 삭제했어요.`);
  };
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
        <input type="text" id="searchFilter" placeholder="단어나 뜻 검색" data-input="search">
        <button class="icon-btn" data-act="shuffle" aria-label="섞기">${IC.shuffle}</button>
        <button class="icon-btn ${document.body.classList.contains('hide-content') ? 'on' : ''}" id="btnBlurToggle" data-act="blur" aria-label="뜻 가리기">${IC.eyeoff}</button>
      </div>
      <div class="chips" id="bookChips"></div>
      <div class="word-list" id="wordCardStream"></div>
      <button class="fab" data-act="add-sheet" aria-label="단어 추가">${IC.plus}</button>`;
  }
  function onSearch(v) { currentFilter = v.trim(); renderWordList(); }

  const FILTERS = [['all', '전체'], ['new', '새 단어'], ['learning', '학습 중'], ['mastered', '마스터'], ['star', '즐겨찾기'], ['miss', '오답']];
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
        ? emptyHtml('첫 단어를 추가해 볼까요?', '오른쪽 아래 + 버튼을 눌러 단어를 넣으면 뜻과 예문을 채워줘요.', 'happy')
        : emptyHtml('조건에 맞는 단어가 없어요', '필터나 검색어를 바꿔 보세요.', 'think');
      return;
    }
    box.innerHTML = list.map((w, i) => {
      const syns = w.synonyms.split(',').map(s => s.trim()).filter(Boolean);
      const open = openDrawers.has(w.id);
      return `
      <div class="wcard ${w.box >= 5 ? 'mastered' : ''} ${open ? 'open' : ''}" data-wid="${esc(w.id)}">
        <div class="w-row">
          <span class="w-no">${String(i + 1).padStart(3, '0')}</span>
          <div class="w-main" data-act="expand" role="button" tabindex="0" aria-expanded="${open}">
            <div class="w-head"><span class="w-word ${w.star ? 'hl' : ''}">${esc(w.word)}</span>${w.phonetic ? `<span class="w-pron">${esc(w.phonetic)}</span>` : ''}${w.koreanPron ? `<span class="w-kpron">[${esc(w.koreanPron)}]</span>` : ''}</div>
            <div class="w-mean">${w.meaning ? esc(w.meaning) : '<span class="muted">뜻이 비어 있어요 · 더보기에서 채울 수 있어요</span>'}</div>
            <div class="w-badges">${lvlBadge(w)}${w.miss > 0 ? '<span class="badge b-bad">오답</span>' : ''}</div>
          </div>
          <div class="w-side">
            <button class="w-star ${w.star ? 'on' : ''}" data-act="star" aria-label="즐겨찾기">${IC.star}</button>
            <button class="w-speak" data-act="speak" data-text="${esc(w.word)}" aria-label="발음 듣기">${IC.speaker}</button>
          </div>
        </div>
        ${open ? `
        <div class="w-detail">
          ${w.example ? `<div class="w-ex"><h4>예문</h4><p class="ex-en">${esc(w.example)} <button class="ex-say" data-act="speak" data-text="${esc(w.example)}" aria-label="예문 듣기">${IC.speaker}</button></p>${exPyHtml(w)}${w.exampleKo ? `<p class="ex-ko">${esc(w.exampleKo)}</p>` : '<button class="btn btn-soft btn-sm" data-act="fill-exko">예문 해석 채우기</button>'}</div>` : ''}
          ${syns.length ? `<div><h4>비슷한 단어 (눌러서 뜻 보기)</h4><div class="syn-chips">${syns.map(s => `<button class="syn" data-act="syn" data-word="${esc(s)}">${esc(s)}</button>`).join('')}</div></div>` : ''}
          <div class="muted w-due">${dueText(w)}${w.wrong ? ` · 틀린 횟수 ${w.wrong}` : ''}</div>
          <div class="w-tools">
            <button class="btn btn-soft btn-sm" data-act="edit-word">${IC.edit} 수정</button>
            <button class="btn btn-soft btn-sm" data-act="mem">${w.box >= 5 ? '마스터 취소' : '이미 알아요'}</button>
            <button class="btn btn-soft btn-sm danger" data-act="del-word">삭제</button>
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
    const had = document.activeElement === el; renderWordList();
    if (had) { const n = [...document.querySelectorAll('.wcard')].find(c => c.dataset.wid === w.id); if (n && n.querySelector('.w-main')) n.querySelector('.w-main').focus(); } // 키보드 포커스 유지
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
  let sheetTok = 0; // 시트를 열고 닫을 때마다 바뀌어요 — 늦게 끝난 불러오기가 다른 시트를 덮지 않게
  function openSheet(title, html) {
    sheetTok++; spEnd(); // 발음 평가 화면을 떠나면 마이크 · 재생 정리
    $('sheetTitle').textContent = title;
    $('sheetBody').innerHTML = html;
    $('sheetOv').classList.add('open');
    document.body.classList.add('no-scroll');
  }
  function closeSheet() {
    bulkCancel = true; sheetTok++; spEnd();
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
        <button data-act="gx-open" data-from="book">글·사진에서</button>
      </div>
      <div id="addOne" class="form-stack">${wordFormHtml(null)}</div>
      <div id="addBulk" class="form-stack" style="display:none;">
        <textarea id="bulkText" placeholder="한 줄에 단어 하나씩 붙여넣으세요.&#10;&#10;${isZh() ? '学习&#10;朋友&#10;苹果, 사과' : 'consistent&#10;reluctant&#10;apple, 사과'}&#10;&#10;뜻을 같이 적으면(쉼표, 탭, ' - ' 구분) 그 뜻을 쓰고 나머지는 AI가 채워요."></textarea>
        <div class="bulk-status" id="bulkStatus">한 번에 최대 60개까지 넣을 수 있어요.</div>
        <button class="btn btn-primary btn-block" id="btnBulk" data-act="bulk-run">AI로 한꺼번에 채우고 저장</button>
      </div>`);
    if (!bulkBusy) bulkCancel = false;
    setTimeout(() => { const f = $('fieldWord'); if (f) f.focus(); }, 250);
  };
  const FIELDS = ['fieldWord', 'fieldMeaning', 'fieldPhonetic', 'fieldKoreanPron', 'fieldExample', 'fieldExampleKo', 'fieldSynonyms'];
  function wordFormHtml(w) {
    const v = k => esc(w ? w[k] : ''); formEditId = w ? w.id : null; aiRun++;
    return `
        <label class="f-lab" for="fieldWord">${isZh() ? '중국어 단어 (한자 또는 병음)' : '영단어'}</label>
        <div class="row f-ai">
          <input type="text" id="fieldWord" value="${v('word')}" placeholder="${isZh() ? '예: 学习 또는 xuexi' : '예: consistent'}" autocomplete="off" autocapitalize="none" spellcheck="false" data-enter="ai-fill">
          <button class="btn btn-primary" id="btnRunAi" data-act="ai-fill">AI 완성</button>
        </div>
        <div class="ai-state" id="aiState"></div>
        <label class="f-lab" for="fieldMeaning">뜻</label>
        <input type="text" id="fieldMeaning" value="${v('meaning')}" placeholder="한국어 뜻">
        <div class="row">
          <div><label class="f-lab" for="fieldPhonetic">${isZh() ? '병음' : '발음기호'}</label><input type="text" id="fieldPhonetic" value="${v('phonetic')}" placeholder="${isZh() ? 'xuéxí' : '/kənˈsɪstənt/'}"></div>
          <div><label class="f-lab" for="fieldKoreanPron">한글 발음</label><input type="text" id="fieldKoreanPron" value="${v('koreanPron')}" placeholder="${isZh() ? '쉬에시' : '컨시스턴트'}"></div>
        </div>
        <label class="f-lab" for="fieldExample">예문 (${LN()})</label>
        <textarea id="fieldExample" class="short" rows="2" placeholder="${isZh() ? '我每天学习汉语。' : 'Be consistent and results will come.'}">${v('example')}</textarea>
        <label class="f-lab" for="fieldExampleKo">예문 해석</label>
        <div class="row f-ai">
          <textarea id="fieldExampleKo" class="short" rows="2" placeholder="${isZh() ? '나는 매일 중국어를 공부해요.' : '꾸준히 하면 결과가 따라와요.'}">${v('exampleKo')}</textarea>
          <button class="btn btn-soft" id="btnExKo" data-act="form-exko">번역</button>
        </div>
        <label class="f-lab" for="fieldSynonyms">비슷한 단어</label>
        <input type="text" id="fieldSynonyms" value="${v('synonyms')}" placeholder="${isZh() ? '쉼표로 구분 (学, 读书)' : '쉼표로 구분 (steady, constant)'}">
        <button class="btn btn-primary btn-block" style="margin-top:10px;" data-act="word-save"${w ? ` data-id="${esc(w.id)}"` : ''}>${w ? '수정 저장' : '단어 저장'}</button>`;
  }
  const formVals = () => ({ word: $('fieldWord').value.trim(), meaning: $('fieldMeaning').value.trim(), phonetic: $('fieldPhonetic').value, koreanPron: $('fieldKoreanPron').value, example: $('fieldExample').value, exampleKo: $('fieldExampleKo').value, synonyms: $('fieldSynonyms').value });
  ACTIONS['edit-word'] = el => {
    const w = wordFromEl(el); if (!w) return;
    openSheet('단어 수정', `<div class="form-stack">${wordFormHtml(w)}</div>`);
  };
  function saveEditWord(id) {
    const cat = curCat(), w = cat && cat.words.find(x => x.id === id); if (!w) return closeSheet();
    const v = formVals();
    if (!v.word || !v.meaning) return toast('단어와 뜻은 꼭 필요해요.');
    if (cat.words.some(x => x.id !== id && x.word.toLowerCase() === v.word.toLowerCase())) return toast(`'${v.word}' 는 이 단어장에 이미 있어요.`);
    const n = sanitizeWord({ ...w, ...v });
    Object.assign(w, { word: n.word, meaning: n.meaning, phonetic: n.phonetic, koreanPron: n.koreanPron, example: n.example, exampleKo: n.exampleKo, synonyms: n.synonyms });
    syncStorage(); closeSheet(); renderBookDynamic(); toast('수정했어요.');
  }
  ACTIONS['form-exko'] = async el => {
    const en = ($('fieldExample').value || '').trim();
    if (!en) return toast(`먼저 ${LN()} 예문을 입력해 주세요.`);
    el.disabled = true; el.textContent = '번역 중';
    try { const r = await translateText(en, true); if ($('fieldExampleKo')) $('fieldExampleKo').value = r.t; }
    catch (e) { toast('번역하지 못했어요. 잠시 후 다시 해 주세요.'); }
    finally { el.disabled = false; el.textContent = '번역'; }
  };
  ACTIONS['fill-exko'] = async el => {
    const w = wordFromEl(el); if (!w || !w.example) return;
    el.disabled = true; el.textContent = '해석 채우는 중...';
    try { const r = await translateText(w.example, true); w.exampleKo = str(r.t); syncStorage(); renderWordList(); }
    catch (e) { el.disabled = false; el.textContent = '예문 해석 채우기'; toast('번역하지 못했어요. 잠시 후 다시 해 주세요.'); }
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
    const v = formVals();
    if (!v.word || !v.meaning) return toast('단어와 뜻은 꼭 필요해요.');
    if (cat.words.some(w => w.word.toLowerCase() === v.word.toLowerCase())) return toast(`'${v.word}' 는 이 단어장에 이미 있어요.`);
    cat.words.unshift(sanitizeWord({ id: uid(), ...v }));
    syncStorage();
    FIELDS.forEach(id => { $(id).value = ''; });
    aiState('');
    renderBookDynamic();
    toast('저장했어요.');
    $('fieldWord').focus();
  }

  let bulkCancel = false, bulkBusy = false;
  ACTIONS['bulk-run'] = async () => {
    const btn = $('btnBulk');
    if (bulkBusy) { bulkCancel = true; if (btn.dataset.running !== '1') toast('이전 작업을 마무리하는 중이에요. 잠시 후 다시 눌러 주세요.'); return; }
    const cat = curCat(); if (!cat) return;
    const seen = new Set(cat.words.map(w => w.word.toLowerCase()));
    let skipped = 0; const entries = [];
    $('bulkText').value.split('\n').map(s => s.trim()).filter(Boolean).slice(0, 60).forEach(line => {
      const parts = line.split(/\t|\s+[-–—]\s+|\s*[,;，；、]\s*/);
      const word = parts[0].trim(); if (!word) return;
      if (seen.has(word.toLowerCase())) { skipped++; return; }
      seen.add(word.toLowerCase()); entries.push({ word, um: parts.slice(1).join(', ').trim() });
    });
    if (!entries.length) return toast(skipped ? '모두 이미 있는 단어예요.' : '단어를 한 줄에 하나씩 입력하세요.');
    bulkBusy = true; btn.dataset.running = '1'; btn.textContent = '중지'; bulkCancel = false;
    const status = $('bulkStatus'); let stopped = '', done = 0;
    const res = new Map(); const need = [];
    entries.forEach(e => { const h = aicGet(e.word); if (h) res.set(e.word.toLowerCase(), h); else need.push(e); });
    const chunks = []; for (let i = 0; i < need.length; i += 6) chunks.push(need.slice(i, i + 6));
    const upd = () => { status.textContent = `${Math.min(entries.length, entries.length - need.length + done)} / ${entries.length} 처리 중...`; };
    let ci = 0; upd();
    const worker = async () => {
      while (!bulkCancel && !stopped) {
        const ch = chunks[ci++]; if (!ch) return;
        try {
          const m = await callAi(buildBatchPrompt(ch.map(e => e.word)), normalizeBatch, { task: 'batch', words: ch.map(e => e.word), lang: aiLang(ch[0].word) });
          ch.forEach(e => { const r = m[e.word.toLowerCase()]; if (r) { res.set(e.word.toLowerCase(), r); aicSet(e.word, r); } });
        } catch (err) { if ([401, 403, 429].includes(err.status) || /AI를 쓸 수 없|한도|준비되지/.test(err.message)) stopped = err.message.split('\n')[0]; }
        done += ch.length; upd();
      }
    };
    await Promise.all([worker(), worker(), worker()]);
    let retry = entries.filter(e => !res.has(e.word.toLowerCase())).slice(0, 10);
    for (const e of retry) {
      if (bulkCancel || stopped) break;
      try { const r = await lookupWord(e.word, true); res.set(e.word.toLowerCase(), r); } catch (err) { if ([401, 403, 429].includes(err.status)) stopped = err.message.split('\n')[0]; }
    }
    if (bulkCancel && !stopped) stopped = '중지했어요.';
    const items = [], failed = [];
    entries.forEach(e => {
      const r = res.get(e.word.toLowerCase());
      if (r) items.push(sanitizeWord({ id: uid(), ...r, word: e.word, meaning: e.um || r.meaning }));
      else if (e.um) items.push(sanitizeWord({ id: uid(), word: e.word, meaning: e.um }));
      else failed.push(e.word);
    });
    cat.words.unshift(...items);
    syncStorage(); bulkBusy = false; bulkCancel = false;
    btn.dataset.running = '0'; btn.textContent = 'AI로 한꺼번에 채우고 저장';
    renderBookDynamic();
    let msg = `${items.length}개 저장했어요.`;
    if (skipped) msg += `\n이미 있어서 건너뜀 ${skipped}개`;
    if (failed.length) msg += `\n실패 ${failed.length}개: ${failed.join(', ')}`;
    if (stopped) msg += `\n${stopped}`;
    status.textContent = msg;
    if (items.length) toast(`${items.length}개 단어를 저장했어요.`);
  };

  ACTIONS['book-split'] = () => {
    const cat = curCat(); if (!cat) return;
    if (cat.words.length < 11) return toast('단어가 11개 이상일 때 나눌 수 있어요.');
    openSheet('Day별로 나누기', `<div class="form-stack">
      <p class="muted" style="margin:0;font-size:.86rem;line-height:1.6;">'${esc(cat.name)}' 단어 ${cat.words.length}개를 하루 분량씩 새 단어장으로 나눠요. 원래 단어장과 학습 기록은 그대로 남아요.</p>
      <label class="setting-label">하루에 몇 개씩?</label>
      <div class="seg" id="spN">${[10, 20, 30, 50].filter(k => k < cat.words.length).map(k => `<button class="${k === 20 || (k === 10 && cat.words.length <= 20) ? 'on' : ''}" data-act="pt-opt" data-g="spN" data-v="${k}">${k}개</button>`).join('')}</div>
      <button class="btn btn-primary btn-block" data-act="split-go">나누기</button></div>`);
  };
  ACTIONS['split-go'] = () => {
    const cat = curCat(), b = document.querySelector('#spN .on'), n = b ? +b.dataset.v : 10; if (!cat) return;
    const days = Math.ceil(cat.words.length / n);
    for (let d = 0; d < days; d++) categories.push({ id: 'c' + uid(), name: `${cat.name} Day ${d + 1}`.slice(0, 40), words: cat.words.slice(d * n, d * n + n).map(w => ({ ...w, id: uid() })) });
    syncStorage(); closeSheet(); toast(`Day 1부터 Day ${days}까지 ${days}개 단어장을 만들었어요.`); go('tabBooks');
  };
  /* ----- 단어장 메뉴 / CSV ----- */
  ACTIONS['book-menu'] = () => {
    openSheet('단어장 관리', `<div class="menu-list">
      <button data-act="book-fill">비어 있는 뜻·발음·예문 채우기</button>
      <button data-act="exam-open">이 단어장으로 실전 시험 보기</button>
      <button data-act="present">수업용 큰 화면으로 보기</button>
      <button data-act="book-print">단어 시험지 만들기 (인쇄, PDF)</button>
      <button data-act="book-share">링크로 공유하기</button>
      <button data-act="book-split">Day별로 나누기 (하루 분량씩)</button>
      <button data-act="book-rename">이름 바꾸기</button>
      <button data-act="csv-export">CSV로 내보내기</button>
      <button data-act="csv-import">CSV 가져오기 (엑셀, Quizlet 등)</button>
      <button data-act="book-del" class="danger">단어장 삭제</button></div>
      <p class="muted" style="font-size:.78rem;margin-top:12px;line-height:1.6;">CSV 열 순서: 단어, 뜻, 발음기호, 한글 발음, 예문, 비슷한 단어, 예문 해석. 앞 두 열(단어, 뜻)만 있어도 가져올 수 있어요.</p>`);
  };
  ACTIONS['book-rename'] = async () => {
    const cat = curCat(); if (!cat) return;
    const name = await ask('새 이름을 입력하세요.', { input: cat.name });
    if (name && name.trim()) { cat.name = name.trim().slice(0, 40); syncStorage(); closeSheet(); headText(cat.name); }
  };
  ACTIONS['book-del'] = async () => {
    const cat = curCat(); if (!cat) return;
    if (!await ask(`'${cat.name}' 단어장과 안의 단어 ${cat.words.length}개를 모두 삭제할까요?`, { ok: '삭제', danger: true })) return;
    categories = categories.filter(c => c.id !== cat.id);
    syncStorage(); closeSheet(); go('tabBooks');
  };
  ACTIONS['csv-export'] = () => {
    const cat = curCat(); if (!cat) return;
    const q = v => { let x = String(v == null ? '' : v); if (/^[=+\-@\t\r]/.test(x)) x = "'" + x; return '"' + x.replace(/"/g, '""') + '"'; }; // 엑셀 수식으로 실행되지 않게
    const rows = [['word', 'meaning', 'phonetic', 'koreanPron', 'example', 'synonyms', 'exampleKo'].join(',')]
      .concat(cat.words.map(w => [w.word, w.meaning, w.phonetic, w.koreanPron, w.example, w.synonyms, w.exampleKo].map(q).join(',')));
    download(`${cat.name.replace(/[\\/:*?"<>|]/g, '_')}.csv`, '﻿' + rows.join('\r\n'), 'text/csv;charset=utf-8');
    closeSheet(); toast('CSV 파일을 내려받았어요.');
  };
  ACTIONS['csv-import'] = () => { closeSheet(); $('csvFile').click(); };
  let fillBusy = false;
  // 비어 있는 칸만 내장 사전으로 채우고, 채운 단어 수를 돌려줘요.
  async function dictFill(words) {
    await dictPreload(words.map(w => w.word));
    let n = 0;
    for (const w of words) {
      const d = await dictGet(w.word); if (!d) continue;
      let hit = false;
      ['meaning', 'phonetic', 'koreanPron', 'example', 'exampleKo', 'synonyms', 'exPy'].forEach(k => { if (!w[k] && d[k]) { w[k] = d[k]; hit = true; } });
      if (hit) n++;
    }
    return n;
  }
  ACTIONS['book-fill'] = async () => {
    const cat = curCat(); if (!cat || fillBusy) return;
    const empty = w => !w.meaning || !w.phonetic || !w.example;
    if (!cat.words.some(empty)) { closeSheet(); return toast('비어 있는 칸이 없어요.'); }
    closeSheet(); fillBusy = true;
    const fromDict = await dictFill(cat.words.filter(empty));
    if (fromDict) { syncStorage(); if (curTab === 'paneBook') renderWordList(); }
    const need = cat.words.filter(empty).slice(0, 60);
    if (!need.length) { fillBusy = false; return say(`${fromDict}개 단어를 내장 사전으로 채웠어요.`); }
    if (!aiReady()) { fillBusy = false; return say(`${fromDict ? `${fromDict}개 단어를 내장 사전으로 채웠어요.\n` : ''}남은 ${cat.words.filter(empty).length}개는 AI가 필요해요.\n로그인한 계정으로 쓰거나, 설정에서 내 API 키를 입력해 주세요.`); }
    let done = fromDict, fail = 0, stop = '';
    toast(`단어 ${need.length}개를 채우는 중이에요...`);
    for (let i = 0; i < need.length && !stop; i += 6) {
      const ch = need.slice(i, i + 6);
      try {
        const m = await callAi(buildBatchPrompt(ch.map(w => w.word)), normalizeBatch, { task: 'batch', words: ch.map(w => w.word), lang: aiLang(ch[0].word) });
        ch.forEach(w => {
          const r = m[w.word.toLowerCase()]; if (!r) { fail++; return; }
          aicSet(w.word, r);
          ['meaning', 'phonetic', 'koreanPron', 'example', 'exampleKo', 'synonyms'].forEach(k => { if (!w[k] && r[k]) w[k] = r[k]; });
          done++;
        });
        syncStorage(); if (curTab === 'paneBook') renderWordList();
      } catch (e) { fail += ch.length; if ([401, 403, 429].includes(e.status)) stop = e.message.split('\n')[0]; }
    }
    fillBusy = false;
    say(`${done}개 단어를 채웠어요.${fail ? `\n채우지 못한 단어 ${fail}개` : ''}${stop ? '\n' + stop : ''}`);
  };

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
          cat.words.push(sanitizeWord({ id: uid(), word, meaning, phonetic: c[2], koreanPron: c[3], example: c[4], synonyms: c[5], exampleKo: c[6] }));
          added++;
        });
        syncStorage(); renderBookDynamic();
        toast(`${added}개 가져왔어요${skipped ? ` (건너뜀 ${skipped}개)` : ''}.`);
      } catch (err) { say('CSV 파일을 읽지 못했어요. 형식을 확인해 주세요.'); }
      e.target.value = '';
    };
    r.readAsArrayBuffer(f);
  }

