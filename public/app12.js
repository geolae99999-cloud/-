  /* =========================================================
   * 본문 읽기: 영어 · 중국어 글을 붙여 넣으면 문장마다 해석이 나오고, 단어를 누르면 뜻과 발음이 떠요.
   * ======================================================= */
  const RD_MAX = 4000, RD_SENT_MAX = 80;
  let RD = null; // { text, zh, sents: [{ t, toks, ko }], hideKo, seq }
  function rdEntryHtml() { return `<button class="mg-entry" data-act="rd-open"><span class="mg-ico">${IC.book}</span><span class="mg-txt"><b>본문 읽기 · 해석</b><small>본문을 넣으면 문장마다 해석, 단어를 누르면 뜻과 원어민 발음</small></span><span class="wq-tag">NEW</span><span class="mg-chev"></span></button>`; }
  function rdClose() { const o = $('rdOv'); if (o) o.remove(); rdPopHide(); RD = null; if (curTab === 'tabTexts') renderTexts(); }
  function rdShell(inner, title, back) {
    let ov = $('rdOv');
    if (!ov) { ov = document.createElement('div'); ov.className = 'rd-ov'; ov.id = 'rdOv'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true'); ov.setAttribute('aria-label', '본문 읽기'); document.body.appendChild(ov); }
    ov.innerHTML = `<div class="rd-top">${back ? `<button class="rd-x" data-act="rd-close" aria-label="본문 목록으로">←</button>` : ''}<b class="rd-title">${esc(title || '본문 읽기')}</b><button class="rd-x" data-act="rd-close" aria-label="닫기">${IC.x}</button></div><div class="rd-body" id="rdBody">${inner}</div>`;
    return ov;
  }
  const psgById = id => passages.find(x => x.id === id);
  const psgNextName = () => { let n = 0; passages.forEach(x => { const m = /^본문 (\d+)$/.exec(x.name); if (m) n = Math.max(n, +m[1]); }); return `본문 ${Math.max(n, passages.length) + 1}`; };
  const psgDate = t => { const d = new Date(t); return `${d.getMonth() + 1}월 ${d.getDate()}일`; };
  // 본문 탭: 단어장처럼 본문 1, 본문 2 … 를 카드로 보여 줘요. 누르면 전체 화면으로 읽어요.
  // 본문 분류(카테고리): 본문마다 cat 이름을 가져요. 아직 본문이 없는 새 분류는 기기에 잠깐 기억해 둬요.
  const tcKey = () => 'vocapro_texts_cat:' + currentUser, tcsKey = () => 'vocapro_texts_cats:' + currentUser;
  const NO_CAT = '\u0000none';
  function textCats() {
    const extra = (loadJson(tcsKey()) || []).filter(x => typeof x === 'string' && x);
    const all = []; passages.forEach(x => { if (x.cat && !all.includes(x.cat)) all.push(x.cat); });
    extra.forEach(x => { if (!all.includes(x)) all.push(x); });
    return all.sort((a, b) => a.localeCompare(b, 'ko'));
  }
  function textCatSel() { let c = ''; try { c = LS.getItem(tcKey()) || ''; } catch (e) {} return c === NO_CAT || textCats().includes(c) ? c : ''; }
  function textCatSet(c) { try { LS.setItem(tcKey(), c); } catch (e) {} }
  function textCatsKeep(list) { try { LS.setItem(tcsKey(), JSON.stringify(list.slice(0, 40))); } catch (e) {} }
  function textsVisible() {
    const sel = textCatSel(), all = passages.slice().sort((a, b) => b.at - a.at);
    return sel === NO_CAT ? all.filter(x => !x.cat) : sel ? all.filter(x => x.cat === sel) : all;
  }
  function textsListHtml() {
    const cats = textCats(), sel = textCatSel();
    const all = passages.slice().sort((a, b) => b.at - a.at);
    const list = textsVisible(), picking = !!TX_SEL;
    const n = c => c === NO_CAT ? all.filter(x => !x.cat).length : all.filter(x => x.cat === c).length;
    const chip = (c, label, cnt) => `<button class="tc-chip${sel === c ? ' on' : ''}" data-act="tc-sel" data-c="${esc(c)}">${esc(label)}<i>${cnt}</i></button>`;
    const chips = `<div class="tc-row" role="tablist" aria-label="본문 분류">${chip('', '전체', all.length)}${cats.map(c => chip(c, c, n(c))).join('')}${cats.length && n(NO_CAT) ? chip(NO_CAT, '분류 없음', n(NO_CAT)) : ''}<button class="tc-chip add" data-act="tc-new">${IC.plus} 분류</button></div>
      ${sel && sel !== NO_CAT ? `<div class="tc-bar"><b>${esc(sel)}</b><button class="link-btn" data-act="tc-rename">이름 바꾸기</button><button class="link-btn danger" data-act="tc-del">분류 지우기</button></div>` : ''}`;
    const allOn = picking && list.length && list.every(x => TX_SEL.has(x.id));
    const selBar = list.length ? (picking
      ? `<div class="tx-selbar"><button class="tx-all${allOn ? ' on' : ''}" data-act="tx-sel-all"><i></i>${sel === NO_CAT ? '분류 없음 ' : ''}전체 선택</button><span>${TX_SEL.size}개 골랐어요</span><button class="link-btn" data-act="tx-sel-off">취소</button></div>`
      : `<div class="tx-selbar"><span class="muted">${list.length}개</span><button class="link-btn" data-act="tx-sel-on">여러 개 선택</button></div>`) : '';
    const dock = picking ? `<div class="tx-dock"><button class="btn btn-soft danger" data-act="tx-sel-del" ${TX_SEL.size ? '' : 'disabled'}>삭제</button><button class="btn btn-primary" data-act="tx-sel-move" ${TX_SEL.size ? '' : 'disabled'}>${TX_SEL.size ? `${TX_SEL.size}개 ` : ''}분류 옮기기</button></div>` : '';
    return `${picking ? '' : `<button class="btn btn-primary btn-block rd-new" data-act="rd-new">${IC.plus} 새 본문 넣기</button>`}${chips}${selBar}
      ${list.length ? `<div class="rd-lib${picking ? ' picking' : ''}">${list.map(x => `<div class="rd-item${picking && TX_SEL.has(x.id) ? ' sel' : ''}">
          <button class="rd-open-p" data-act="${picking ? 'tx-sel-tog' : 'rd-p'}" data-id="${esc(x.id)}" ${picking ? `aria-pressed="${TX_SEL.has(x.id)}"` : ''}>${picking ? '<span class="tx-check" aria-hidden="true"></span>' : ''}<span class="rd-badge ${x.zh ? 'zh' : 'en'}">${x.zh ? '中' : 'EN'}</span><span class="rd-it"><b>${esc(x.name)}</b><small>${!sel && x.cat ? `<span class="tc-tag">${esc(x.cat)}</span>` : ''}${esc(x.text.replace(/\s+/g, ' ').slice(0, 70))}${x.text.length > 70 ? '…' : ''}</small></span><em>${x.best != null ? `<span class="tc-best">${x.best}점</span>` : ''}${psgDate(x.at)}</em></button>
          ${picking ? '' : `<button class="rd-more" data-act="rd-p-menu" data-id="${esc(x.id)}" aria-label="${esc(x.name)} 메뉴">⋯</button>`}</div>`).join('')}</div>${dock}`
        : all.length ? `<div class="rd-empty"><b>이 분류에는 아직 본문이 없어요</b>'새 본문 넣기'를 누르면 이 분류에 저장돼요. 다른 본문은 ⋯ → 분류 옮기기로 옮길 수 있어요.</div>`
        : `<div class="rd-empty"><b>아직 저장한 본문이 없어요</b>교과서 본문이나 기사를 붙여 넣으면 '본문 1'로 저장돼요. 문장마다 해석이 나오고, 단어를 누르면 뜻과 원어민 발음을 들을 수 있어요.</div>`}`;
  }
  ACTIONS['tc-sel'] = el => { textCatSet(el.dataset.c); if (TX_SEL) TX_SEL = new Set(); renderTexts(); };
  async function tcAskName(title, def) {
    const v = await ask(title, { input: def || '', ok: '확인' });
    if (typeof v !== 'string') return null;
    const name = v.replace(/[\u0000-\u001f]/g, '').trim().slice(0, 20);
    if (!name) return null;
    return name;
  }
  ACTIONS['tc-new'] = async () => {
    const name = await tcAskName('새 분류 이름 (예: 교과서 3과, 모의고사, 기사)', ''); if (!name) return;
    const extra = (loadJson(tcsKey()) || []).filter(x => typeof x === 'string'); if (!extra.includes(name)) extra.push(name);
    textCatsKeep(extra); textCatSet(name); renderTexts(); toast(`'${name}' 분류를 만들었어요. 새 본문을 넣으면 여기에 저장돼요.`);
  };
  ACTIONS['tc-rename'] = async () => {
    const old = textCatSel(); if (!old || old === NO_CAT) return;
    const name = await tcAskName('분류 이름 바꾸기', old); if (!name || name === old) return;
    passages.forEach(x => { if (x.cat === old) x.cat = name; });
    textCatsKeep((loadJson(tcsKey()) || []).map(x => x === old ? name : x));
    textCatSet(name); syncStorage(); renderTexts();
  };
  ACTIONS['tc-del'] = async () => {
    const old = textCatSel(); if (!old || old === NO_CAT) return;
    if (!await ask(`'${old}' 분류를 지울까요? 안에 있던 본문은 지워지지 않고 '분류 없음'으로 옮겨져요.`, { ok: '분류 지우기', danger: true })) return;
    passages.forEach(x => { if (x.cat === old) x.cat = ''; });
    textCatsKeep((loadJson(tcsKey()) || []).filter(x => x !== old));
    textCatSet(''); syncStorage(); renderTexts();
  };
  function renderTexts() {
    const el = $('tabTexts'); if (!el) return;
    el.innerHTML = `<div class="texts-pane">${textsListHtml()}</div>`;
  }
  function rdList() { const o = $('rdOv'); if (o) o.remove(); rdPopHide(); RD = null; go('tabTexts'); }
  // 새 본문 · 본문 고치기
  function rdEditor(id) {
    const x = id ? psgById(id) : null;
    rdShell(`<p class="rd-help">영어나 중국어 본문을 붙여 넣으세요. 문장마다 한국어 해석이 나오고, 단어를 누르면 뜻과 발음이 떠요.</p>
      <input id="rdName" class="rd-name" maxlength="40" value="${esc(x ? x.name : psgNextName())}" aria-label="본문 이름">
      <label class="rd-catrow"><span>분류</span><select id="rdCat" aria-label="본문 분류">${rdCatOptions(x ? x.cat : (textCatSel() === NO_CAT ? '' : textCatSel()))}</select></label>
      <textarea id="rdIn" class="rd-in" maxlength="${RD_MAX}" placeholder="예) Plants make their own food. They use sunlight, water and air..." spellcheck="false">${esc(x ? x.text : '')}</textarea>
      <div class="rd-row"><small id="rdCnt" class="muted">0 / ${RD_MAX.toLocaleString()}자</small><button class="btn btn-primary" data-act="rd-save" data-id="${esc(id || '')}">저장하고 해석 보기</button></div>`, x ? '본문 고치기' : '새 본문', true);
    const inp = $('rdIn'), cnt = () => { $('rdCnt').textContent = `${inp.value.length.toLocaleString()} / ${RD_MAX.toLocaleString()}자`; };
    inp.addEventListener('input', cnt); cnt();
    rdCatSelectWire($('rdCat'));
    setTimeout(() => inp.focus(), 60);
  }
  const rdCatOptions = cur => `<option value="">분류 없음</option>${textCats().map(c => `<option value="${esc(c)}"${c === cur ? ' selected' : ''}>${esc(c)}</option>`).join('')}<option value="__new">+ 새 분류 만들기</option>`;
  // '+ 새 분류 만들기'를 고르면 이름을 묻고 그 분류를 골라 둬요.
  function rdCatSelectWire(sel) {
    if (!sel) return; let prev = sel.value;
    sel.addEventListener('change', async () => {
      if (sel.value !== '__new') { prev = sel.value; return; }
      const name = await tcAskName('새 분류 이름 (예: 교과서 3과, 모의고사)', '');
      if (!name) { sel.value = prev; return; }
      const extra = (loadJson(tcsKey()) || []).filter(x => typeof x === 'string'); if (!extra.includes(name)) extra.push(name); textCatsKeep(extra);
      sel.innerHTML = rdCatOptions(name); prev = name;
    });
  }
  ACTIONS['rd-open'] = () => rdList();
  ACTIONS['rd-list'] = () => rdList();
  ACTIONS['rd-close'] = rdClose;
  ACTIONS['rd-new'] = () => { if (passages.length >= PSG_MAX) return toast(`본문은 ${PSG_MAX}개까지 저장할 수 있어요. 안 쓰는 본문을 지워 주세요.`); rdEditor(''); };
  ACTIONS['rd-edit'] = () => { if (RD && RD.id) rdEditor(RD.id); };
  ACTIONS['rd-p'] = el => rdRun(el.dataset.id);
  ACTIONS['rd-save'] = el => {
    const text = (($('rdIn') || {}).value || '').trim().slice(0, RD_MAX); if (!text) return toast('본문을 붙여 넣어 주세요.');
    const name = (($('rdName') || {}).value || '').trim().slice(0, 40) || psgNextName();
    const zh = rdIsZh(text), cv = (($('rdCat') || {}).value || ''), cat = cv === '__new' ? '' : cv.slice(0, 20);
    let x = el.dataset.id ? psgById(el.dataset.id) : null;
    if (x) { if (x.text !== text) { x.ko = []; x.best = null; x.tries = 0; } Object.assign(x, { name, text, zh, cat, at: Date.now() }); }
    else { x = { id: 'p' + uid(), name, text, zh, cat, at: Date.now(), ko: [], best: null, tries: 0 }; passages.push(x); }
    syncStorage(); rdRun(x.id);
  };
  // ⋯ 를 누르면 그 본문 아래에 이름 바꾸기 · 고치기 · 삭제 버튼이 열려요.
  ACTIONS['rd-p-menu'] = el => {
    const item = el.closest('.rd-item'), open = item.nextElementSibling && item.nextElementSibling.classList.contains('rd-acts');
    document.querySelectorAll('.rd-acts').forEach(x => x.remove());
    if (open) return;
    const id = esc(el.dataset.id);
    item.insertAdjacentHTML('afterend', `<div class="rd-acts"><button class="btn btn-soft" data-act="rd-p-rename" data-id="${id}">이름</button><button class="btn btn-soft" data-act="rd-p-cat" data-id="${id}">분류 옮기기</button><button class="btn btn-soft" data-act="rd-p-edit" data-id="${id}">고치기</button><button class="btn btn-soft danger" data-act="rd-p-del" data-id="${id}">삭제</button></div>`);
  };
  ACTIONS['rd-p-rename'] = async el => {
    const x = psgById(el.dataset.id); if (!x) return;
    const v = await ask('본문 이름을 바꿔요.', { input: x.name, ok: '바꾸기' });
    if (typeof v !== 'string' || !v.trim()) return;
    x.name = v.trim().slice(0, 40); syncStorage(); rdList();
  };
  ACTIONS['rd-p-edit'] = el => rdEditor(el.dataset.id);
  // 분류 옮기기: 분류 버튼 중에서 고르거나 새 분류 이름을 써요.
  // 분류 고르기 창: 본문 하나든 여러 개든 같은 창으로 옮겨요.
  function tcMoveDialog(list, title) {
    if (!list.length) return;
    const cats = textCats(), cur = list.every(x => (x.cat || '') === (list[0].cat || '')) ? (list[0].cat || '') : null;
    const ov = document.createElement('div'); ov.className = 'dlg-ov tc-dlg';
    ov.innerHTML = `<div class="dlg" role="dialog" aria-modal="true" aria-label="분류 옮기기"><h3 class="em-t">${esc(title)}</h3>
      <p class="em-s">옮길 분류를 누르세요. 없는 분류는 아래에 이름을 써서 새로 만들 수 있어요.</p>
      <div class="tc-pick">${['', ...cats].map(c => `<button class="tc-chip${cur === c ? ' on' : ''}" data-c="${esc(c)}">${c ? esc(c) : '분류 없음'}</button>`).join('')}</div>
      <input type="text" id="tcNewName" maxlength="20" placeholder="새 분류 이름 (예: 5과)">
      <div class="row"><button class="btn btn-soft" style="flex:1" data-x="1">닫기</button><button class="btn btn-primary" style="flex:1" data-ok="1">새 분류로 옮기기</button></div></div>`;
    document.body.appendChild(ov);
    const done = c => {
      list.forEach(x => { x.cat = c; }); syncStorage(); ov.remove();
      if (TX_SEL) TX_SEL = null; // 여러 개 옮긴 뒤에는 고르기를 끝내요
      textCatSet(c || NO_CAT); renderTexts();
      toast(`${list.length > 1 ? `본문 ${list.length}개를` : `'${list[0].name}'을(를)`} ${c ? `'${c}'` : '분류 없음'}(으)로 옮겼어요.`);
    };
    ov.addEventListener('click', e => {
      const b = e.target.closest('button');
      if (e.target === ov || (b && b.dataset.x)) return ov.remove();
      if (b && b.dataset.c !== undefined) return done(b.dataset.c);
      if (b && b.dataset.ok) { const v = ($('tcNewName').value || '').replace(/[\u0000-\u001f]/g, '').trim().slice(0, 20); if (!v) { $('tcNewName').focus(); return toast('새 분류 이름을 써 주세요.'); } done(v); }
    });
    setTimeout(() => { const b = ov.querySelector('.tc-chip'); if (b) b.focus(); }, 50);
  }
  ACTIONS['rd-p-cat'] = el => { const x = psgById(el.dataset.id); if (x) tcMoveDialog([x], `'${x.name}' 분류 옮기기`); };

  // 여러 개 고르기: 본문을 여러 개 골라 한 번에 분류를 옮기거나 지워요.
  let TX_SEL = null; // Set(id) | null
  ACTIONS['tx-sel-on'] = () => { TX_SEL = new Set(); renderTexts(); };
  ACTIONS['tx-sel-off'] = () => { TX_SEL = null; renderTexts(); };
  ACTIONS['tx-sel-tog'] = el => { if (!TX_SEL) return; const id = el.dataset.id; TX_SEL.has(id) ? TX_SEL.delete(id) : TX_SEL.add(id); renderTexts(); };
  ACTIONS['tx-sel-all'] = () => { if (!TX_SEL) return; const ids = textsVisible().map(x => x.id), all = ids.length && ids.every(id => TX_SEL.has(id)); ids.forEach(id => all ? TX_SEL.delete(id) : TX_SEL.add(id)); renderTexts(); };
  ACTIONS['tx-sel-move'] = () => { if (!TX_SEL || !TX_SEL.size) return toast('옮길 본문을 골라 주세요.'); const list = passages.filter(x => TX_SEL.has(x.id)); tcMoveDialog(list, `본문 ${list.length}개 분류 옮기기`); };
  ACTIONS['tx-sel-del'] = async () => {
    if (!TX_SEL || !TX_SEL.size) return toast('지울 본문을 골라 주세요.');
    const n = TX_SEL.size; if (!await ask(`고른 본문 ${n}개를 지울까요? 되돌릴 수 없어요.`, { ok: `${n}개 삭제`, danger: true })) return;
    passages = passages.filter(x => !TX_SEL.has(x.id)); TX_SEL = null; syncStorage(); renderTexts(); toast(`본문 ${n}개를 지웠어요.`);
  };
  ACTIONS['rd-p-del'] = async el => {
    const x = psgById(el.dataset.id); if (!x) return;
    if (!await ask(`'${x.name}'을(를) 지울까요? 되돌릴 수 없어요.`, { ok: '삭제', danger: true })) return;
    passages = passages.filter(p => p.id !== x.id); syncStorage(); toast('본문을 지웠어요.'); rdList();
  };
  const rdIsZh = text => HAN.test(text) && !/[A-Za-z]{3}/.test(text.replace(/[A-Z]{1,3}\d*/g, ''));

  // 문장 나누기: 영어는 . ! ? 뒤, 중국어는 。！？； 뒤. 줄바꿈도 문장 경계로 봐요.
  // Mr. Dr. U.S. a.m. e.g. 처럼 마침표가 있어도 문장이 끝나지 않는 말
  const RD_ABBR = /(?:^|[\s(“"'])(?:mr|mrs|ms|dr|prof|sr|jr|mt|vs|etc|e\.g|i\.e|a\.m|p\.m|u\.s|u\.k|u\.n|inc|ltd|corp|jan|feb|apr|jun|jul|aug|sept|oct|nov|dec|approx|dept)\.$/i;
  function rdSplit(text, zh) {
    const out = [];
    text.replace(/\r/g, '').split(/\n+/).forEach(par => {
      const p = par.trim(); if (!p) return;
      if (zh) { p.split(/(?<=[。！？；!?…][”」』）)]?)/).forEach(x => { x = x.trim(); if (x) out.push(x); }); return; }
      // 영어: . ! ? (닫는 따옴표 · 괄호 포함) 뒤 + 띄어쓰기 + 대문자 · 숫자 · 여는 따옴표 일 때만 끊어요. 줄임말 뒤에서는 끊지 않아요.
      let start = 0; const re = /[.!?…]+["'”’)\]]*\s+(?=["'“‘(\[]?[A-Z0-9])/g; let m;
      while ((m = re.exec(p))) {
        const end = m.index + m[0].trimEnd().length, chunk = p.slice(start, end);
        if (/\.$/.test(chunk.replace(/["'”’)\]]+$/, '')) && RD_ABBR.test(chunk.replace(/["'”’)\]]+$/, ''))) continue;
        if (/\b[A-Z]\.$/.test(chunk)) continue; // 이름 머리글자 (J. K. Rowling)
        out.push(chunk.trim()); start = m.index + m[0].length;
      }
      const last = p.slice(start).trim(); if (last) out.push(last);
    });
    return out.slice(0, RD_SENT_MAX);
  }
  // 단어 나누기: 영어는 글자 묶음, 중국어는 내장 사전에서 가장 긴 단어부터 맞춰요.
  function rdTokens(sent, zh) {
    const toks = [];
    if (!zh) {
      let last = 0;
      let n = 0, prev = '';
      sent.replace(/[A-Za-z]+(?:['’-][A-Za-z]+)*/g, (m, i) => {
        if (i > last) toks.push({ s: sent.slice(last, i) });
        const t = { s: m, w: m.replace(/’/g, "'") };
        // 문장 첫 단어가 아닌데 대문자로 시작하면 이름일 수 있어요(I 제외). Mr. Dr. 뒤도 이름이에요.
        if (/^[A-Z]/.test(m) && m !== 'I' && (n > 0 || /^(mr|mrs|ms|dr|prof)$/i.test(prev))) t.cap = 1;
        if (/^(mr|mrs|ms|dr|prof|sir|uncle|aunt)$/i.test(prev)) t.title = 1;
        toks.push(t); last = i + m.length; n++; prev = m; return m;
      });
      if (last < sent.length) toks.push({ s: sent.slice(last) });
      return toks;
    }
    const chars = [...sent];
    for (let i = 0; i < chars.length;) {
      if (!HAN.test(chars[i])) { let j = i; while (j < chars.length && !HAN.test(chars[j])) j++; toks.push({ s: chars.slice(i, j).join('') }); i = j; continue; }
      let L = Math.min(6, chars.length - i);
      for (; L > 1; L--) { const c = chars.slice(i, i + L).join(''); if (zhMap && zhMap.has(c)) break; }
      const w = chars.slice(i, i + L).join(''); toks.push({ s: w, w }); i += L;
    }
    return toks;
  }
  async function rdRun(id) {
    const x = psgById(id); if (!x) return rdList();
    const text = x.text, zh = x.zh;
    if (zh) await zhLoad();
    const parts = rdSplit(text, zh), saved = x.ko.length === parts.length ? x.ko : [];
    const sents = parts.map((t, i) => ({ t, toks: rdTokens(t, zh), ko: saved[i] ? saved[i] : null }));
    RD = { id: x.id, name: x.name, text, zh, sents, hideKo: false, seq: (RD && RD.seq || 0) + 1 };
    rdRender();
    const seq = RD.seq;
    // 1) AI 가 본문 전체 문맥을 보고 문장마다 해석해요(40문장씩). 로그인한 서버 모드에서만.
    if (sents.some(s => !s.ko) && cloudMode && window.Cloud && Cloud.ai && Cloud.user && Cloud.user()) {
      const note = document.querySelector('#rdBody .rd-note'); if (note) note.dataset.t = note.textContent, note.textContent = 'AI가 앞뒤 문맥을 보고 해석하는 중이에요…';
      for (let a = 0; a < sents.length; a += 40) {
        const part = sents.slice(a, a + 40); if (part.every(s => s.ko)) continue;
        try {
          const j = parseJson(await Cloud.ai('', { task: 'passage', sents: part.map(s => s.t), lang: zh ? 'zh' : 'en' }, 45000));
          if (!RD || RD.seq !== seq) return;
          if (j && Array.isArray(j.items) && j.items.length === part.length) part.forEach((s, k) => { const t = String(j.items[k] || '').trim().replace(/^\d+[.)]\s*/, ''); if (t && HANGUL.test(t)) { s.ko = t; s.by = 'ai'; rdKoPaint(a + k); } });
        } catch (e) { /* 아래 자동 번역으로 */ }
      }
      const n2 = document.querySelector('#rdBody .rd-note'); if (n2 && n2.dataset.t) n2.textContent = n2.dataset.t;
    }
    // 2) 남은 문장은 자동 번역으로 하나씩(동시에 4개씩). 다 끝나기 전에도 끝난 문장부터 보여 줘요.
    let next = 0;
    const work = async () => {
      while (RD && RD.seq === seq && next < sents.length) {
        const i = next++, s = sents[i];
        if (s.ko) continue; // 저장해 둔 해석
        s.ko = await rdTranslate(s.t);
        if (!RD || RD.seq !== seq) return;
        rdKoPaint(i);
      }
    };
    await Promise.all([work(), work(), work(), work()]);
    rdSaveKo(seq);
  }
  // 해석이 다 나오면 본문과 같이 저장해요(실패한 문장은 빈칸으로 두고 다음에 다시 해석해요).
  function rdSaveKo(seq) {
    if (!RD || (seq && RD.seq !== seq)) return;
    const x = psgById(RD.id); if (!x) return;
    const ko = RD.sents.map(s => s.ko || '');
    if (ko.some(Boolean) && JSON.stringify(ko) !== JSON.stringify(x.ko)) { x.ko = ko; syncStorage(); }
  }
  // 번역은 실패하면 잠깐 쉬었다 두 번 더 해 봐요.
  async function rdTranslate(t) {
    for (let k = 0; k < 3; k++) {
      try { const r = await translateText(t, true); if (r && r.t) return r.t; } catch (e) {}
      await new Promise(r => setTimeout(r, 700 * (k + 1)));
    }
    return '';
  }
  function rdKoPaint(i) {
    const s = RD && RD.sents[i], el = document.querySelector(`#rdBody .rd-s[data-i="${i}"] .rd-ko`); if (!s || !el) return;
    el.classList.remove('load'); el.classList.toggle('err', !s.ko);
    el.innerHTML = s.ko ? esc(s.ko) : `해석을 가져오지 못했어요. <button class="rd-retry" data-act="rd-retry" data-i="${i}">다시 시도</button>`;
  }
  ACTIONS['rd-retry'] = async (el, e) => {
    if (e) e.stopPropagation();
    const i = +el.dataset.i, s = RD && RD.sents[i]; if (!s) return;
    const k = el.closest('.rd-ko'); k.classList.add('load'); k.textContent = '해석하는 중…';
    s.ko = await rdTranslate(s.t); rdKoPaint(i); rdSaveKo();
  };
  function rdRender() {
    if (!RD) return;
    const own = ownedWords();
    const body = RD.sents.map((s, i) => `<div class="rd-s" data-i="${i}">
        <p class="rd-en" lang="${RD.zh ? 'zh-CN' : 'en'}">${s.toks.map(t => t.w ? `<span class="rd-w${own.has(t.w.toLowerCase()) ? ' own' : ''}" data-act="rd-word" data-w="${esc(t.w)}"${t.cap ? ' data-cap="1"' : ''}${t.title ? ' data-title="1"' : ''}>${esc(t.s)}</span>` : esc(t.s)).join('')}<button class="rd-sp" data-act="speak" data-text="${esc(s.t)}" aria-label="이 문장 듣기">${IC.speaker}</button></p>
        <p class="rd-ko${s.ko === null ? ' load' : s.ko ? '' : ' err'}">${s.ko === null ? '해석하는 중…' : s.ko ? esc(s.ko) : `해석을 가져오지 못했어요. <button class="rd-retry" data-act="rd-retry" data-i="${i}">다시 시도</button>`}</p></div>`).join('');
    rdShell(`<div class="rd-tools"><button class="btn btn-soft" data-act="rd-edit">본문 고치기</button><button class="btn btn-soft${RD.hideKo ? ' on' : ''}" data-act="rd-hide">${RD.hideKo ? '해석 보이기' : '해석 가리기'}</button><button class="btn btn-primary" data-act="qz-start">문제 풀기</button></div>
      <div class="rd-doc${RD.hideKo ? ' hide-ko' : ''}">${body}</div>
      <p class="rd-note muted">밑줄 친 단어는 내 단어장에 있는 단어예요. 해석은 자동 번역이라 조금 어색할 수 있어요.</p>`, RD.name, true);
  }
  /* ----- 본문 문제 풀기: 해석 고르기 · 빈칸 채우기 · 순서 배열 (본문과 저장된 해석으로 바로 만들어요) ----- */
  let QZ = null;
  const QZ_STOP = new Set('a an the and or but so to of in on at by for with from as is am are was were be been being it its this that these those he she they we you i me my your his her their our them us do does did not no yes if then than there here very can could will would should may might must have has had just also too him her hers them its mine yours ours theirs who whom what which when where why how all some any each every one two three'.split(' '));
  const qzShuffle = a => { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
  // 순서 배열용 조각: 영어는 띄어쓰기 단위(문장 부호는 앞 단어에 붙여요), 중국어는 단어 단위
  function qzPieces(s, zh) {
    if (!zh) return s.t.split(/\s+/).filter(Boolean);
    const out = [];
    s.toks.forEach(t => { const v = t.s.trim(); if (!v) return; if (!t.w && out.length && !HAN.test(v)) out[out.length - 1] += v; else out.push(v); });
    return out;
  }
  // 동사 형태: 불규칙 동사(원형:과거:과거분사)와 규칙 변화
  const QZ_IRR = Object.fromEntries('be:was:been have:had:had do:did:done go:went:gone come:came:come get:got:gotten make:made:made take:took:taken give:gave:given see:saw:seen know:knew:known think:thought:thought say:said:said tell:told:told find:found:found feel:felt:felt leave:left:left keep:kept:kept bring:brought:brought buy:bought:bought teach:taught:taught catch:caught:caught fight:fought:fought write:wrote:written read:read:read run:ran:run sit:sat:sat stand:stood:stood eat:ate:eaten drink:drank:drunk speak:spoke:spoken break:broke:broken choose:chose:chosen drive:drove:driven ride:rode:ridden rise:rose:risen fall:fell:fallen forget:forgot:forgotten begin:began:begun swim:swam:swum sing:sang:sung ring:rang:rung grow:grew:grown throw:threw:thrown fly:flew:flown draw:drew:drawn wear:wore:worn win:won:won lose:lost:lost meet:met:met pay:paid:paid send:sent:sent spend:spent:spent build:built:built lend:lent:lent hear:heard:heard hold:held:held sell:sold:sold sleep:slept:slept feed:fed:fed lead:led:led light:lit:lit hide:hid:hidden bite:bit:bitten wake:woke:woken become:became:become understand:understood:understood put:put:put cut:cut:cut let:let:let set:set:set hit:hit:hit hurt:hurt:hurt shut:shut:shut cost:cost:cost mean:meant:meant'.split(' ').map(x => { const [b, p2, pp] = x.split(':'); return [b, [p2, pp]]; }));
  const QZ_IRR_REV = (() => { const m = {}; Object.entries(QZ_IRR).forEach(([b, [p2, pp]]) => { m[p2] = m[p2] || b; m[pp] = m[pp] || b; }); Object.assign(m, { am: 'be', is: 'be', are: 'be', was: 'be', were: 'be', been: 'be', being: 'be', has: 'have', does: 'do' }); return m; })();
  const qzCvc = b => /^[^aeiou]*[aeiou][^aeiouwxy]$/.test(b) && b.length <= 4;
  function qzForms(b) {
    if (b === 'be') return ['be', 'is', 'are', 'was', 'were', 'been', 'being'];
    const s3 = b === 'have' ? 'has' : b === 'do' ? 'does' : b === 'go' ? 'goes' : /[^aeiou]y$/.test(b) ? b.slice(0, -1) + 'ies' : /(s|x|z|ch|sh|o)$/.test(b) ? b + 'es' : b + 's';
    const ing = /ie$/.test(b) ? b.slice(0, -2) + 'ying' : /[^e]e$/.test(b) && b !== 'be' ? b.slice(0, -1) + 'ing' : qzCvc(b) ? b + b.slice(-1) + 'ing' : b + 'ing';
    const ed = /e$/.test(b) ? b + 'd' : /[^aeiou]y$/.test(b) ? b.slice(0, -1) + 'ied' : qzCvc(b) ? b + b.slice(-1) + 'ed' : b + 'ed';
    const [p2, pp] = QZ_IRR[b] || [ed, ed];
    return [...new Set([b, s3, p2, pp, ing])];
  }
  const qzVerbSense = m => String(m || '').split(/[;,]/).some(x => /다\s*$/.test(x.replace(/\(.*?\)/g, '').trim()));
  // 문장 속 단어가 동사면 원형을 돌려줘요(사전의 변화형 정보 + 규칙 · 불규칙 변화).
  async function qzVerbBase(tok) {
    const w = tok.toLowerCase(); if (QZ_IRR_REV[w]) return QZ_IRR_REV[w];
    if (QZ_IRR[w]) return w;
    const meaningOf = async c => { let a = null; try { a = await dictRaw(c); } catch (e) {} if (typeof a === 'string') { const b = a.split(':')[0]; return { base: b, m: (await dictRaw(b) || [])[1] }; } return Array.isArray(a) ? { base: c, m: a[1] } : null; };
    const self = await meaningOf(w);
    if (self && self.base !== w && qzVerbSense(self.m)) return self.base; // went → go
    if (/(s|ed|ing)$/.test(w)) for (const c of baseCandidates(w)) { const r = await meaningOf(c); if (r && qzVerbSense(r.m) && qzForms(r.base).includes(w)) return r.base; }
    if (self && self.base === w) { const first = String(self.m || '').split(/[;,]/)[0]; if (/다\s*$/.test(first.replace(/\(.*?\)/g, '').trim())) return w; }
    return null;
  }
  // 해석 채점: 띄어쓰기 · 문장 부호를 빼고 두 글자씩 겹치는 정도(Dice)로 봐요.
  function qzKoSim(a, b) {
    const n = x => String(x || '').replace(/[\s.,!?·"'“”‘’()~\-]/g, '');
    const A = n(a), B = n(b); if (!A || !B) return 0; if (A === B) return 1;
    const bg = x => { const m = new Map(); for (let i = 0; i < x.length - 1; i++) { const k = x.slice(i, i + 2); m.set(k, (m.get(k) || 0) + 1); } return m; };
    const ma = bg(A), mb = bg(B); let inter = 0; ma.forEach((v, k) => { inter += Math.min(v, mb.get(k) || 0); });
    return (2 * inter) / Math.max(1, (A.length - 1) + (B.length - 1));
  }
  async function qzBuild(sents, zh) {
    const ok = sents.filter(s => s.ko);
    const content = t => t.w && (zh ? HAN.test(t.w) : t.w.length >= 3 && !QZ_STOP.has(t.w.toLowerCase()) && !/^[A-Z]/.test(t.w));
    const words = []; ok.forEach(s => s.toks.forEach(t => { if (content(t) && !words.some(x => x.toLowerCase() === t.w.toLowerCase())) words.push(t.w); }));
    // 뜻 고르기용: 사전에 있는 내용어의 뜻
    const meanOf = {};
    try { await dictPreload(words); } catch (e) {}
    for (const w of words.slice(0, 60)) { let d = null; try { d = await dictGet(zh ? w : w.toLowerCase()); } catch (e) {} if (d && d.meaning) meanOf[w] = String(d.meaning).replace(/\s*\(.+?의 [^)]*\)\s*$/, '').split(/;/)[0].split(',').slice(0, 2).join(',').trim(); }
    const meanWords = Object.keys(meanOf).filter(w => meanOf[w]);
    // 동사 형태용 (영어만)
    const verbs = new Map(); // 문장 → [{ tok, base }]
    if (!zh) for (const s of ok) { const vs = []; for (const t of s.toks) { if (!t.w || t.cap || /'/.test(t.w)) continue; const b = await qzVerbBase(t.w); if (b && qzForms(b).length >= 4 && qzForms(b).includes(t.w.toLowerCase())) vs.push({ tok: t.w, base: b }); } if (vs.length) verbs.set(s, vs); }
    const make = (type, s) => {
      if (type === 'tr') { const others = qzShuffle(ok.filter(o => o !== s && o.ko !== s.ko).map(o => o.ko)).slice(0, 3); return others.length ? { type, s, ans: s.ko, opts: qzShuffle([s.ko, ...others]) } : null; }
      if (type === 'blank') { const cand = s.toks.filter(content); if (!cand.length || words.length < 4) return null; const tgt = cand[Math.floor(Math.random() * cand.length)].w; const dis = qzShuffle(words.filter(w => w.toLowerCase() !== tgt.toLowerCase())).slice(0, 3); const re = new RegExp('\\b' + tgt.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b'); return { type, s, ans: tgt, opts: qzShuffle([tgt, ...dis]), shown: zh ? s.t.replace(tgt, '＿＿') : s.t.replace(re, '_____') }; }
      if (type === 'verb') { const vs = verbs.get(s); if (!vs) return null; const v = vs[Math.floor(Math.random() * vs.length)], ans = v.tok.toLowerCase(); const dis = qzShuffle(qzForms(v.base).filter(f => f !== ans)).slice(0, 3); if (dis.length < 3) return null; const re = new RegExp('\\b' + v.tok + '\\b'); return { type, s, ans, base: v.base, opts: qzShuffle([ans, ...dis]), shown: s.t.replace(re, `_____ (${v.base})`) }; }
      if (type === 'mean') { const cand = s.toks.filter(t => t.w && meanOf[t.w] && content(t)); if (!cand.length || meanWords.length < 4) return null; const w = cand[Math.floor(Math.random() * cand.length)].w, ans = meanOf[w]; const dis = qzShuffle(meanWords.filter(x => x !== w && meanOf[x] !== ans).map(x => meanOf[x])).filter((v, i, a) => a.indexOf(v) === i).slice(0, 3); if (dis.length < 3) return null; return { type, s, word: w, ans, opts: qzShuffle([ans, ...dis]) }; }
      if (type === 'order') { const pcs = qzPieces(s, zh); return pcs.length >= 3 && pcs.length <= (zh ? 12 : 14) ? { type, s, ans: pcs.join(zh ? '' : ' '), pcs: qzShuffle(pcs.map((t, i) => ({ t, i }))), picked: [] } : null; }
      if (type === 'write') return s.t.length <= 160 ? { type, s, ans: s.ko } : null;
      return null;
    };
    // 문장마다 한 문제씩, 유형이 골고루 섞이게 돌려 가며 만들어요(최대 12문제).
    const ORDER = zh ? ['tr', 'blank', 'mean', 'order', 'write'] : ['tr', 'verb', 'blank', 'mean', 'order', 'write'];
    const used = {}; ORDER.forEach(t => { used[t] = 0; });
    const qs = [];
    for (const s of qzShuffle(ok)) {
      const tryTypes = ORDER.slice().sort((a, b) => used[a] - used[b] || Math.random() - .5);
      for (const t of tryTypes) { const q = make(t, s); if (q) { qs.push(q); used[t]++; break; } }
      if (qs.length >= 12) break;
    }
    // 문장이 적으면 같은 문장으로 다른 유형을 더 만들어요
    for (const s of qzShuffle(ok)) { if (qs.length >= Math.min(12, ok.length * 3)) break; for (const t of ORDER.slice().sort((a, b) => used[a] - used[b] || Math.random() - .5)) { if (qs.some(q => q.s === s && q.type === t)) continue; const q = make(t, s); if (q) { qs.push(q); used[t]++; break; } } }
    return qzShuffle(qs).slice(0, 12);
  }
  ACTIONS['qz-start'] = async () => {
    if (!RD) return;
    if (RD.sents.some(s => s.ko === null)) return toast('해석이 다 나온 뒤에 문제를 풀 수 있어요. 잠시만 기다려 주세요.');
    toast('문제를 만드는 중이에요…');
    const qs = await qzBuild(RD.sents, RD.zh);
    if (!RD) return;
    if (qs.length < 2) return toast('문제를 만들기에 본문이 너무 짧아요. 두 문장 이상 넣어 주세요.');
    QZ = { id: RD.id, name: RD.name, zh: RD.zh, qs, i: 0, right: 0, wrong: [], answered: false };
    qzRender();
  };
  const QZ_LABEL = { tr: '알맞은 해석 고르기', blank: '빈칸에 알맞은 말 고르기', order: '해석에 맞게 순서대로 놓기', verb: '해석에 맞는 동사 형태 고르기', mean: '문장 속 단어의 뜻 고르기', write: '직접 해석하기' };
  function qzRender() {
    if (!QZ) return;
    const q = QZ.qs[QZ.i], n = QZ.qs.length, L = QZ.zh ? 'zh-CN' : 'en';
    const bar = `<div class="qz-top"><span>${QZ.i + 1} / ${n}</span><div class="qz-bar"><i style="width:${Math.round(QZ.i / n * 100)}%"></i></div><span class="qz-sc">${QZ.right}점</span></div><p class="qz-type">${QZ_LABEL[q.type]}</p>`;
    let body = '';
    if (q.type === 'tr') body = `<div class="qz-q" lang="${L}">${esc(q.s.t)}<button class="rd-sp" data-act="speak" data-text="${esc(q.s.t)}" aria-label="문장 듣기">${IC.speaker}</button></div>
      <div class="qz-opts">${q.opts.map((o, k) => `<button class="qz-opt" data-act="qz-pick" data-k="${k}">${esc(o)}</button>`).join('')}</div>`;
    else if (q.type === 'blank') body = `<div class="qz-q" lang="${L}">${esc(q.shown)}</div><p class="qz-hint">${esc(q.s.ko)}</p>
      <div class="qz-opts grid">${q.opts.map((o, k) => `<button class="qz-opt" data-act="qz-pick" data-k="${k}" lang="${L}">${esc(o)}</button>`).join('')}</div>`;
    else if (q.type === 'verb') body = `<div class="qz-q" lang="${L}">${esc(q.shown)}</div><p class="qz-hint">${esc(q.s.ko)}</p>
      <div class="qz-opts grid">${q.opts.map((o, k) => `<button class="qz-opt" data-act="qz-pick" data-k="${k}" lang="${L}">${esc(o)}</button>`).join('')}</div>`;
    else if (q.type === 'mean') body = `<div class="qz-q" lang="${L}">${q.s.toks.map(t => t.w === q.word ? `<mark class="qz-mark">${esc(t.s)}</mark>` : esc(t.s)).join('')}</div><p class="qz-hint">밑줄 친 <b lang="${L}">${esc(q.word)}</b>의 뜻은?</p>
      <div class="qz-opts">${q.opts.map((o, k) => `<button class="qz-opt" data-act="qz-pick" data-k="${k}">${esc(o)}</button>`).join('')}</div>`;
    else if (q.type === 'write') body = `<div class="qz-q" lang="${L}">${esc(q.s.t)}<button class="rd-sp" data-act="speak" data-text="${esc(q.s.t)}" aria-label="문장 듣기">${IC.speaker}</button></div>
      <textarea id="qzWrite" class="qz-write" rows="3" maxlength="400" placeholder="이 문장을 한국어로 해석해 써 보세요"></textarea>
      <button class="btn btn-primary btn-block" data-act="qz-write">확인</button>`;
    else body = `<p class="qz-hint big">${esc(q.s.ko)}</p>
      <div class="qz-built" lang="${L}">${q.picked.length ? q.picked.map((p, k) => `<button class="qz-pc on" data-act="qz-unpick" data-k="${k}">${esc(p.t)}</button>`).join('') : '<span class="muted">아래 조각을 순서대로 누르세요</span>'}</div>
      <div class="qz-pool" lang="${L}">${q.pcs.map((p, k) => q.picked.includes(p) ? '' : `<button class="qz-pc" data-act="qz-place" data-k="${k}">${esc(p.t)}</button>`).join('')}</div>
      <button class="btn btn-primary btn-block" data-act="qz-check" ${q.picked.length === q.pcs.length ? '' : 'disabled'}>확인</button>`;
    rdShell(`<div class="qz">${bar}${body}<div id="qzFb"></div></div>`, `${QZ.name} · 문제`, false);
    const top = document.querySelector('#rdOv .rd-top'); if (top) top.insertAdjacentHTML('afterbegin', `<button class="rd-x" data-act="qz-quit" aria-label="본문으로">←</button>`);
  }
  function qzAnswer(correct, given) {
    if (!QZ || QZ.answered) return; QZ.answered = true;
    const q = QZ.qs[QZ.i];
    if (correct) QZ.right++; else QZ.wrong.push({ q, given });
    document.querySelectorAll('#rdBody .qz-opt, #rdBody .qz-pc, #rdBody [data-act=qz-check]').forEach(b => { b.disabled = true; });
    if (q.opts) document.querySelectorAll('#rdBody .qz-opt').forEach(b => { const v = q.opts[+b.dataset.k]; if (v === q.ans) b.classList.add('ok'); else if (v === given) b.classList.add('bad'); });
    const fb = $('qzFb'), last = QZ.i + 1 >= QZ.qs.length;
    const extra = q.type === 'write' ? `<span class="qz-ans">${correct ? '' : '모범 해석과 비교해 보세요. '}내 해석: ${esc(given || '')}</span>${correct ? '' : '<button class="link-btn qz-self" data-act="qz-self">뜻이 맞게 썼어요 (정답으로 바꾸기)</button>'}`
      : q.type === 'verb' ? `<span class="qz-ans">${esc(q.base)} → ${esc(q.ans)}</span>` : q.type === 'mean' ? `<span class="qz-ans">${esc(q.word)} = ${esc(q.ans)}</span>` : '';
    fb.innerHTML = `<div class="qz-fb ${correct ? 'ok' : 'bad'}"><b>${correct ? (q.type === 'write' ? '잘 해석했어요!' : '정답이에요!') : '아쉬워요'}</b>
      <p lang="${QZ.zh ? 'zh-CN' : 'en'}">${esc(q.s.t)}</p><small>${esc(q.s.ko)}</small>${extra}</div>
      <button class="btn btn-primary btn-block" data-act="qz-next">${last ? '결과 보기' : '다음 문제'}</button>`;
    try { haptic && haptic(correct ? 'ok' : 'bad'); } catch (e) {}
    playAudio(q.s.t, false);
    const nb = fb.querySelector('[data-act=qz-next]'); if (nb) nb.focus();
  }
  ACTIONS['qz-write'] = () => {
    const q = QZ && QZ.qs[QZ.i], t = (($('qzWrite') || {}).value || '').trim(); if (!q || QZ.answered) return;
    if (!t) { const w = $('qzWrite'); if (w) w.focus(); return toast('해석을 써 주세요.'); }
    qzAnswer(qzKoSim(t, q.ans) >= .45, t);
    const w = $('qzWrite'); if (w) w.disabled = true;
  };
  // 해석하기는 자동 채점이 엄격할 수 있어서, 뜻이 맞으면 스스로 정답으로 바꿀 수 있어요.
  ACTIONS['qz-self'] = el => {
    if (!QZ) return; const q = QZ.qs[QZ.i], k = QZ.wrong.findIndex(w => w.q === q); if (k < 0) return;
    QZ.wrong.splice(k, 1); QZ.right++; const fb = document.querySelector('#qzFb .qz-fb'); if (fb) { fb.classList.remove('bad'); fb.classList.add('ok'); const b = fb.querySelector('b'); if (b) b.textContent = '정답으로 바꿨어요'; } el.remove();
    const sc = document.querySelector('#rdBody .qz-sc'); if (sc) sc.textContent = QZ.right + '점';
  };
  ACTIONS['qz-pick'] = el => { const q = QZ && QZ.qs[QZ.i]; if (!q) return; const v = q.opts[+el.dataset.k]; qzAnswer(v === q.ans, v); };
  ACTIONS['qz-place'] = el => { const q = QZ && QZ.qs[QZ.i]; if (!q || QZ.answered) return; const p = q.pcs[+el.dataset.k]; if (p && !q.picked.includes(p)) { q.picked.push(p); qzRender(); } };
  ACTIONS['qz-unpick'] = el => { const q = QZ && QZ.qs[QZ.i]; if (!q || QZ.answered) return; q.picked.splice(+el.dataset.k, 1); qzRender(); };
  ACTIONS['qz-check'] = () => {
    const q = QZ && QZ.qs[QZ.i]; if (!q || q.picked.length !== q.pcs.length) return;
    const got = q.picked.map(p => p.t).join(QZ.zh ? '' : ' ');
    qzAnswer(got === q.ans, got);
    const built = document.querySelector('#rdBody .qz-built'); if (built) built.classList.add(got === q.ans ? 'ok' : 'bad');
  };
  ACTIONS['qz-next'] = () => {
    if (!QZ) return;
    if (QZ.i + 1 < QZ.qs.length) { QZ.i++; QZ.answered = false; return qzRender(); }
    qzEnd();
  };
  function qzEnd() {
    const n = QZ.qs.length, score = Math.round(QZ.right / n * 100), x = psgById(QZ.id);
    let best = score, isBest = false;
    if (x) { isBest = x.best == null || score > x.best; x.best = Math.max(x.best || 0, score); x.tries = (x.tries || 0) + 1; best = x.best; syncStorage(); }
    rdShell(`<div class="qz qz-end"><div class="qz-score">${score}<small>점</small></div>
      <p class="qz-sum">${n}문제 중 ${QZ.right}개 맞혔어요${isBest && x && x.tries > 1 ? ' · 최고 점수!' : ''}${!isBest ? ` · 최고 ${best}점` : ''}</p>
      ${QZ.wrong.length ? `<h4 class="syn-h">틀린 문제 다시 보기</h4><div class="qz-review">${QZ.wrong.map(w => `<div class="qz-rv"><em>${QZ_LABEL[w.q.type]}</em><p lang="${QZ.zh ? 'zh-CN' : 'en'}">${esc(w.q.s.t)}<button class="rd-sp" data-act="speak" data-text="${esc(w.q.s.t)}" aria-label="문장 듣기">${IC.speaker}</button></p><small>${esc(w.q.s.ko)}</small>${w.q.type === 'write' ? `<span class="qz-ans">내 해석: ${esc(w.given || '')}</span>` : w.q.type !== 'tr' ? `<span class="qz-ans">정답: ${esc(w.q.type === 'mean' ? w.q.word + ' = ' + w.q.ans : w.q.ans)}${w.given ? ` · 내 답: ${esc(w.given)}` : ''}</span>` : ''}</div>`).join('')}</div>` : '<p class="qz-perfect">모두 맞혔어요! 완벽해요 🎉</p>'}
      <div class="rd-tools"><button class="btn btn-soft" data-act="qz-quit">본문으로</button><button class="btn btn-primary" data-act="qz-again">다시 풀기</button></div></div>`, `${QZ.name} · 결과`, true);
  }
  ACTIONS['qz-again'] = () => { if (!QZ) return; const id = QZ.id; QZ = null; rdRun(id).then(() => {}); setTimeout(() => { if (RD && RD.id === id && !RD.sents.some(s => s.ko === null)) ACTIONS['qz-start'](); }, 300); };
  ACTIONS['qz-quit'] = () => { const id = QZ && QZ.id; QZ = null; if (id) rdRun(id); else rdList(); };

  ACTIONS['rd-hide'] = el => { if (!RD) return; RD.hideKo = !RD.hideKo; const d = document.querySelector('#rdBody .rd-doc'); if (d) d.classList.toggle('hide-ko', RD.hideKo); el.textContent = RD.hideKo ? '해석 보이기' : '해석 가리기'; el.classList.toggle('on', RD.hideKo); };
  // 숨긴 해석은 그 문장을 누르면 잠깐 보여요.
  document.addEventListener('click', e => { const k = e.target.closest && e.target.closest('.rd-doc.hide-ko .rd-ko'); if (k) k.classList.toggle('peek'); });

  // 단어 누르기 → 아래쪽 카드에 뜻 · 발음 · 듣기 · 단어장에 담기
  let rdPopWord = null, rdPopSeq = 0;
  // 줄임말: 원래 말과 짧은 설명. 사전에는 원래 말로 찾아요.
  const RD_CONTR = {
    "don't": ['do not', '~하지 않다'], "doesn't": ['does not', '~하지 않다'], "didn't": ['did not', '~하지 않았다'], "isn't": ['is not', '~이 아니다'], "aren't": ['are not', '~이 아니다'],
    "wasn't": ['was not', '~이 아니었다'], "weren't": ['were not', '~이 아니었다'], "won't": ['will not', '~하지 않을 것이다'], "wouldn't": ['would not', '~하지 않을 것이다'], "can't": ['cannot', '~할 수 없다'],
    "couldn't": ['could not', '~할 수 없었다'], "shouldn't": ['should not', '~하면 안 된다'], "haven't": ['have not', '(아직) ~하지 않았다'], "hasn't": ['has not', '(아직) ~하지 않았다'], "hadn't": ['had not', '~하지 않았었다'],
    "mustn't": ['must not', '~하면 안 된다'], "needn't": ['need not', '~할 필요 없다'], "ain't": ['am not / is not', '~이 아니다 (구어)'],
    "i'm": ['I am', '나는 ~이다'], "you're": ['you are', '너는 ~이다'], "we're": ['we are', '우리는 ~이다'], "they're": ['they are', '그들은 ~이다'], "he's": ['he is / he has', '그는 ~이다'], "she's": ['she is / she has', '그녀는 ~이다'],
    "it's": ['it is / it has', '그것은 ~이다'], "that's": ['that is', '그것은 ~이다'], "there's": ['there is', '~이 있다'], "here's": ['here is', '여기 ~이 있다'], "what's": ['what is', '무엇이 ~인가'], "who's": ['who is', '누가 ~인가'],
    "where's": ['where is', '어디에 ~이 있나'], "how's": ['how is', '어떻게 ~인가'], "let's": ['let us', '~하자'], "i've": ['I have', '나는 ~했다'], "you've": ['you have', '너는 ~했다'], "we've": ['we have', '우리는 ~했다'],
    "they've": ['they have', '그들은 ~했다'], "i'll": ['I will', '나는 ~할 것이다'], "you'll": ['you will', '너는 ~할 것이다'], "we'll": ['we will', '우리는 ~할 것이다'], "they'll": ['they will', '그들은 ~할 것이다'],
    "he'll": ['he will', '그는 ~할 것이다'], "she'll": ['she will', '그녀는 ~할 것이다'], "it'll": ['it will', '그것은 ~할 것이다'], "i'd": ['I would / I had', '나는 ~할 텐데 / ~했었다'], "you'd": ['you would / you had', '너는 ~할 텐데'],
    "he'd": ['he would / he had', '그는 ~할 텐데'], "she'd": ['she would / she had', '그녀는 ~할 텐데'], "we'd": ['we would / we had', '우리는 ~할 텐데'], "they'd": ['they would / they had', '그들은 ~할 텐데']
  };
  // 사전에 없는 단어: 사전 → (줄임말 · 소유격 정리) → AI(뜻 · 발음까지) → 자동 번역 순서로 찾아요.
  async function rdName(name) {
    let ko = '';
    // 이름만 번역하면 John → 남자 처럼 엉뚱해져요. 'The name is John.' 으로 번역해서 이름 부분만 꺼내요.
    try {
      const r = await gtxTranslate(`The name is ${name}.`, 'en', 'ko');
      const m = /이름은\s*(.+?)\s*(?:이에요|예요|입니다|이다|다)?[.。]?\s*$/.exec(r.t || '');
      if (m && m[1] && m[1].length <= 20 && !/이름/.test(m[1])) ko = m[1].replace(/['"“”‘’]/g, '');
    } catch (e) {}
    if (!ko) { try { const r = await translateText(name, true); ko = r && r.t && r.t.length <= 20 ? r.t : ''; } catch (e) {} }
    return { word: name, meaning: `${ko ? ko + ' · ' : ''}이름 · 고유명사(사람 · 장소 · 기관 이름)`, phonetic: '', koreanPron: '', name: true };
  }
  async function rdLookup(raw, zh, o = {}) {
    const lw = zh ? raw : raw.toLowerCase();
    let d = null, note = '';
    if (!zh && o.title) return rdName(raw.replace(/'s$/i, '')); // Mr. Smith 의 Smith
    try { d = await dictGet(lw); } catch (e) {}
    // 문장 가운데 대문자 단어가 사전에 없으면 이름으로 봐요 (John's 포함).
    if (!zh && !d && o.cap && !RD_CONTR[lw]) {
      const b = lw.replace(/'s$/, ''); let bd = null; try { bd = b !== lw ? await dictGet(b) : null; } catch (e) {}
      if (!bd) { const n = await rdName(raw.replace(/'s$/i, '')); if (/'s$/i.test(raw)) n.meaning += ` · 's: ~의 (${raw.slice(0, -2)}의)`; return n; }
    }
    if (!d && !zh && RD_CONTR[lw]) {
      const [full, ko] = RD_CONTR[lw];
      return { word: raw, meaning: `${full}의 줄임말 · ${ko}`, phonetic: '', koreanPron: '', contr: full };
    }
    if (!d && !zh && /'s$/.test(lw)) { // 소유격 (John's, the teacher's)
      const b = lw.slice(0, -2); try { d = await dictGet(b); } catch (e) {}
      note = `'s: ~의 (${raw.slice(0, -2)}의)`;
      if (d) { d = { ...d, base: d.base || b }; }
      else raw = raw.slice(0, -2);
    }
    if (d && d.base && !d.phonetic && !zh) { try { const b = await dictGet(d.base); if (b) { d.phonetic = b.phonetic; d.koreanPron = b.koreanPron; } } catch (e) {} }
    if (!d && aiReady()) { try { const r = await lookupWord(zh ? raw : raw.toLowerCase(), false); if (r && r.meaning) d = { ...r, word: raw }; } catch (e) {} }
    if (!d) {
      try {
        const r = await translateText(raw, true);
        d = { word: raw, meaning: r.t + (r.alts && r.alts.length ? ' · ' + r.alts.map(a => a.terms.slice(0, 3).join(', ')).join(' / ') : ''), phonetic: '', koreanPron: '', mt: true };
      } catch (e) {}
    }
    if (d && note) d = { ...d, meaning: `${d.meaning} · ${note}` };
    return d;
  }
  function rdPopHide() { const p = $('rdPop'); if (p) p.remove(); rdPopWord = null; document.querySelectorAll('.rd-w.sel').forEach(x => x.classList.remove('sel')); }
  ACTIONS['rd-word'] = async (el, e) => {
    if (e) e.stopPropagation();
    document.querySelectorAll('.rd-w.sel').forEach(x => x.classList.remove('sel')); el.classList.add('sel');
    const raw = el.dataset.w, zh = RD && RD.zh, seq = ++rdPopSeq;
    let p = $('rdPop');
    if (!p) { p = document.createElement('div'); p.id = 'rdPop'; p.className = 'rd-pop'; p.setAttribute('role', 'dialog'); p.setAttribute('aria-label', '단어 뜻'); document.body.appendChild(p); }
    p.innerHTML = `<div class="rd-pw"><b>${esc(raw)}</b><button class="rd-x" data-act="rd-pop-x" aria-label="닫기">${IC.x}</button></div><p class="rd-pm load">뜻을 찾는 중…</p>`;
    const d = await rdLookup(raw, zh, { cap: el.dataset.cap === '1', title: el.dataset.title === '1' });
    if (seq !== rdPopSeq || !$('rdPop')) return;
    const head = d && d.base && !zh ? d.base : raw;
    rdPopWord = d && !d.contr && !d.name ? { word: zh ? raw : head.toLowerCase(), meaning: String(d.meaning || '').replace(/\s*\(.+의 [^)]*\)$/, '').replace(/ · 's: .*$/, ''), d } : null;
    const pr = d ? pronText(d) : '';
    p.innerHTML = `<div class="rd-pw"><b lang="${zh ? 'zh-CN' : 'en'}">${esc(head)}</b>${pr ? `<span class="q-pron">${esc(pr)}</span>` : ''}<button class="rd-x" data-act="rd-pop-x" aria-label="닫기">${IC.x}</button></div>
      <p class="rd-pm">${d && d.meaning ? esc(d.meaning) : '뜻을 찾지 못했어요. 인터넷 연결을 확인하고 단어를 다시 눌러 주세요.'}</p>${d && d.mt ? '<p class="rd-pe">사전에 없는 단어라 자동 번역으로 찾았어요.</p>' : ''}
      ${d && d.example ? `<p class="rd-pe">${esc(d.example)}${d.exampleKo ? `<small>${esc(d.exampleKo)}</small>` : ''}</p>` : ''}
      <div class="rd-pa"><button class="btn btn-soft" data-act="speak" data-text="${esc(head)}">${IC.speaker} 발음 듣기</button>
      ${rdPopWord ? `<select id="rdBook" aria-label="담을 단어장">${categories.map(c => `<option value="${esc(c.id)}"${c.id === currentCategoryId ? ' selected' : ''}>${esc(c.name)}</option>`).join('')}</select><button class="btn btn-primary" data-act="rd-add">${IC.plus} 담기</button>` : ''}</div>`;
    playAudio(d && d.contr ? raw : head, true);
  };
  ACTIONS['rd-pop-x'] = () => rdPopHide();
  ACTIONS['rd-add'] = () => {
    const sel = $('rdBook'), cat = sel && categories.find(c => c.id === sel.value), x = rdPopWord; if (!cat || !x || !x.meaning) return;
    if (cat.words.some(w => w.word.toLowerCase() === x.word.toLowerCase())) return toast('이미 그 단어장에 있는 단어예요.');
    const d = x.d || {}, w = sanitizeWord({ id: uid(), word: x.word, meaning: x.meaning, phonetic: d.phonetic || '', koreanPron: d.koreanPron || '', example: d.example || '', exampleKo: d.exampleKo || '', synonyms: d.synonyms || '' });
    cat.words.unshift(w); syncStorage();
    autoFill([w]);
    document.querySelectorAll('#rdBody .rd-w').forEach(s => { if (s.dataset.w.toLowerCase() === x.word.toLowerCase()) s.classList.add('own'); });
    toast(`'${x.word}'를 ${cat.name}에 담았어요.`);
  };
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && $('rdOv') && !document.querySelector('.dlg-ov')) { if ($('rdPop')) rdPopHide(); else rdClose(); } });
  document.addEventListener('pointerdown', e => { if ($('rdPop') && !e.target.closest('#rdPop, .rd-w, #spdPop')) rdPopHide(); }, true);

  const OB = [[IC.sprout, '매일 조금씩, 끝까지', '하루 목표만큼만 외워요. 복습할 시기는 앱이 알아서 챙겨 드려요.'], [IC.repeat, '잊을 때쯤 다시 만나요', '틀린 단어는 더 자주, 아는 단어는 천천히. 검증된 반복 학습 방식이에요.'], [IC.headphones, '눈으로, 귀로, 손으로', '플래시카드, 퀴즈, 받아쓰기, 듣기 모드로 질리지 않게 외워요.']];
  function showOnboarding() {
    let justSigned = '';
    try { justSigned = sessionStorage.getItem('vocapro_just_signed_up') || ''; sessionStorage.removeItem('vocapro_just_signed_up'); } catch (e) {}
    if (justSigned !== '1') return;
    if (LS.getItem('vocapro_onboarded') || $('obOv')) return;
    let i = 0; const ov = document.createElement('div'); ov.className = 'ob'; ov.id = 'obOv'; document.body.appendChild(ov);
    const draw = () => {
      const [ic, t, d] = OB[i];
      ov.innerHTML = `<button class="ob-skip" data-ob="skip">건너뛰기</button><div class="ob-body"><div class="ob-art">${MASCOT(['happy', 'think', 'cheer'][i])}<span class="ob-badge">${ic}</span></div><h2>${t}</h2><p>${d}</p></div><div class="ob-foot"><div class="ob-dots">${OB.map((_, k) => `<i class="${k === i ? 'on' : ''}"></i>`).join('')}</div><button class="btn btn-primary btn-block" data-ob="next">${i === OB.length - 1 ? '시작하기' : '다음'}</button></div>`;
    };
    const done = () => { try { LS.setItem('vocapro_onboarded', '1'); } catch (e) {} ov.remove(); if (!isTeacher()) setTimeout(() => { try { ltOpen(true); } catch (e) {} }, 150); };
    ov.addEventListener('click', e => { const b = e.target.closest('[data-ob]'); if (!b) return; if (b.dataset.ob === 'skip' || i === OB.length - 1) return done(); i++; draw(); });
    draw();
  }
  ACTIONS['pw-change'] = async () => {
    const o = await ask('현재 비밀번호를 입력하세요.', { input: '', pw: true, ok: '다음' }); if (!o) return;
    const n = await ask('새 비밀번호를 입력하세요. (6자 이상)', { input: '', pw: true, ok: '변경' }); if (!n) return;
    if (n.length < 6) return say('새 비밀번호는 6자 이상이어야 해요.');
    try { await Cloud.changePw(o, n); toast('비밀번호를 바꿨어요.'); } catch (e) { say(e.code === 'invalid' ? '현재 비밀번호가 맞지 않아요.' : cloudMsg(e)); }
  };

  /* ----- 복습 알림 ----- */
  const rmKey = () => 'vocapro_rm:' + currentUser;
  const rmGet = () => loadJson(rmKey()) || { on: false, time: '20:00', last: '' };
  const rmSet = o => { try { LS.setItem(rmKey(), JSON.stringify(o)); } catch (e) {} };
  const dueCount = () => counts().due;
  function rmUI() {
    const r = rmGet(), on = $('rmOn'); if (!on) return;
    on.checked = !!r.on; $('rmTime').value = r.time;
    $('rmNote').textContent = r.on ? `복습할 단어가 있는 날, ${r.time} 이후에 앱을 열면 알려 드려요.` : '복습할 단어가 있는 날, 정한 시간 이후에 알려 드려요.';
  }
  async function rmSave() {
    const r = rmGet(); r.on = $('rmOn').checked; r.time = $('rmTime').value || '20:00';
    if (r.on) {
      if (!('Notification' in window)) { r.on = false; say('이 브라우저는 알림을 지원하지 않아요.\n홈 화면에 설치한 앱에서 사용해 보세요.'); }
      else if (Notification.permission !== 'granted') {
        let perm = 'denied'; try { perm = await Notification.requestPermission(); } catch (e) {}
        if (perm !== 'granted') { r.on = false; say('알림이 허용되지 않았어요.\n브라우저 설정에서 이 사이트의 알림을 허용해 주세요.'); }
      }
    }
    rmSet(r); rmUI(); rmCheck();
  }
  async function rmCheck() {
    if (!currentUser) return;
    const r = rmGet(), n = dueCount();
    try { if (navigator.setAppBadge) { if (r.on && n > 0) navigator.setAppBadge(n); else navigator.clearAppBadge(); } } catch (e) {}
    if (!r.on || !('Notification' in window) || Notification.permission !== 'granted' || r.last === dayKey()) return;
    const d = new Date(), [h, m] = r.time.split(':').map(Number);
    if (d.getHours() * 60 + d.getMinutes() < h * 60 + m || n === 0 || (stats.days[dayKey()] || { n: 0 }).n > 0) return;
    r.last = dayKey(); rmSet(r);
    const opt = { body: `오늘 복습할 단어 ${n}개가 기다리고 있어요.`, icon: 'icon-192.png', badge: 'icon-192.png', tag: 'vocapro-review' };
    try { const reg = 'serviceWorker' in navigator && await navigator.serviceWorker.getRegistration(); if (reg) await reg.showNotification('VocaPro', opt); else new Notification('VocaPro', opt); } catch (e) {}
  }
  setInterval(rmCheck, 60000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) rmCheck(); });

  /* ----- 짝 맞추기 ----- */
  let mgT = null;
  function closeMatch() { clearInterval(mgT); const o = $('mgOv'); if (o) o.remove(); }
  function openMatch() {
    const ws = allWords().map(x => x.w).filter(w => w.word && w.meaning);
    if (ws.length < 4) return toast('단어가 4개 이상 있어야 해요.');
    closeMatch();
    // 같은 단어·같은 뜻 타일이 두 번 나오면 짝이 모호해져요 → 단어(소문자)·표시 뜻으로 중복 제거
    const mT = w => String(w.meaning).split(/[,;/]/)[0].trim() || String(w.meaning), seenW = new Set(), seenM = new Set(), pick = [], tiles = [];
    for (const w of shuffled(ws)) { const k = w.word.trim().toLowerCase(), m = mT(w); if (seenW.has(k) || seenM.has(m)) continue; seenW.add(k); seenM.add(m); pick.push(w); if (pick.length >= 6) break; }
    if (pick.length < 4) return toast('서로 다른 단어가 4개 이상 있어야 해요.');
    pick.forEach((w, i) => { tiles.push({ id: i, t: w.word, en: true }, { id: i, t: mT(w), en: false }); });
    shuffled(tiles).forEach((t, i) => { tiles[i] = t; });
    const ov = document.createElement('div'); ov.className = 'mg'; ov.id = 'mgOv';
    ov.innerHTML = `<div class="mg-top"><button class="round-btn" data-mg="x" aria-label="닫기">${IC.x}</button><b>짝 맞추기</b><span id="mgTime">0.0초</span></div><p class="mg-sub">${LN()}와 뜻을 짝지어 눌러 보세요</p><div class="mg-grid">${tiles.map((t, i) => `<button class="mg-tile" data-i="${i}">${esc(t.t)}</button>`).join('')}</div>`;
    document.body.appendChild(ov);
    let sel = -1, done = 0, wrong = 0, locked = false, over = false; const t0 = Date.now();
    mgT = setInterval(() => { const e = $('mgTime'); if (e) e.textContent = ((Date.now() - t0) / 1000).toFixed(1) + '초'; }, 100);
    const finish = () => {
      over = true; const sec = ((Date.now() - t0) / 1000).toFixed(1);
      ov.innerHTML = `<div class="mg-done"><div class="result-art">${MASCOT(wrong === 0 ? 'cheer' : 'happy')}</div><h2>${wrong === 0 ? '완벽해요!' : '모두 맞췄어요'}</h2><p>${sec}초 · 오답 ${wrong}번</p><button class="btn btn-primary btn-block" data-mg="again">한 번 더</button><button class="btn btn-soft btn-block" data-mg="x" style="margin-top:8px;">닫기</button></div>`;
    };
    ov.addEventListener('click', e => {
      const k = e.target.closest('[data-mg]');
      if (k) { if (k.dataset.mg === 'again') { closeMatch(); openMatch(); } else closeMatch(); return; }
      const b = e.target.closest('.mg-tile'); if (!b || locked || over || b.classList.contains('ok')) return;
      const i = +b.dataset.i;
      if (sel === i) { b.classList.remove('sel'); sel = -1; return; }
      if (sel < 0) { sel = i; b.classList.add('sel'); if (tiles[i].en) playAudio(tiles[i].t); return; }
      const a = tiles[sel], c = tiles[i], ba = ov.querySelector(`[data-i="${sel}"]`);
      if (a.id === c.id && a.en !== c.en) {
        [ba, b].forEach(x => { x.classList.remove('sel'); x.classList.add('ok'); }); sel = -1; done++; haptic(true);
        if (done === pick.length) { clearInterval(mgT); setTimeout(finish, 450); }
      } else {
        wrong++; locked = true; haptic(false); [ba, b].forEach(x => x.classList.add('no'));
        setTimeout(() => { [ba, b].forEach(x => x.classList.remove('no', 'sel')); sel = -1; locked = false; }, 450);
      }
    });
  }
  ACTIONS.match = openMatch;

