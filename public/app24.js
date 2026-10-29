  /* =========================================================
   * 공유 · 친구 초대
   * 결과 · 대결 점수 · 랭킹을 카톡 · 인스타 등으로 보내요(휴대폰 공유 창, 없으면 복사).
   * 서버 계정이면 링크에 내 초대 코드(?ref=)가 붙고, 그 링크로 친구가 새로 가입하면 둘 다 연속 보호권 1장 (supabase_update_v21.sql)
   * ======================================================= */
  const REF_IN = 'vocapro_ref_in';
  let refOk = false; // 서버에 초대 기능(v21)이 있고 서버 계정으로 로그인했을 때만 보상을 약속해요
  (function refCapture() {
    try {
      const q = new URLSearchParams(location.search), r = (q.get('ref') || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12);
      if (!r) return;
      LS.setItem(REF_IN, JSON.stringify({ c: r, at: Date.now() }));
      q.delete('ref'); history.replaceState(null, '', location.pathname + (q.toString() ? '?' + q : '') + location.hash);
    } catch (e) {}
  })();
  const siteUrl = () => /^https?:/.test(location.origin) ? location.origin + '/' : 'https://vocapro.kro.kr/';
  let refCodeP = null;
  function refCode() {
    if (!clOk()) return Promise.resolve('');
    if (config.refCode) return Promise.resolve(config.refCode);
    if (!refCodeP) refCodeP = Cloud.call('voca_ref_code', {}).then(r => { if (r && r.code) { config.refCode = String(r.code).slice(0, 12); syncStorage(); return config.refCode; } return ''; }).catch(() => '').finally(() => { refCodeP = null; });
    return refCodeP;
  }
  async function shareLink() { const c = await refCode(); return siteUrl() + (c ? '?ref=' + encodeURIComponent(c) : ''); }
  async function shareOut(text, title) {
    const url = await shareLink();
    if (navigator.share) { try { await navigator.share({ title: title || 'VocaPro', text, url }); return; } catch (e) { if (e && e.name === 'AbortError') return; } }
    const all = `${text}\n${url}`;
    try { await navigator.clipboard.writeText(all); toast('공유할 글과 링크를 복사했어요. 카톡이나 인스타에 붙여 넣어 주세요.'); }
    catch (e) { say('아래 글을 길게 눌러 복사해 주세요.\n\n' + all); }
  }
  function addBonusFrz(n, why) {
    if (!(n > 0)) return;
    stats.bonus = (stats.bonus || []).concat([{ d: dayKey(), n: Math.min(5, n) }]).slice(-50);
    syncStorage();
    toast(why);
    if (curTab === 'tabHome' && !S.active) { try { renderHome(); } catch (e) {} }
  }
  // 로그인 직후: 초대 링크로 새로 가입했으면 보상 받기, 내가 초대한 친구가 가입했으면 보상 받기
  async function refSync(isNew) {
    if (!clOk()) return;
    let inv = null; try { inv = JSON.parse(LS.getItem(REF_IN) || 'null'); } catch (e) {}
    if (inv && inv.c) {
      if (isNew && Date.now() - (+inv.at || 0) < 30 * DAY) {
        try {
          const r = await Cloud.call('voca_ref_claim', { p_code: inv.c });
          if (r && r.ok) setTimeout(() => addBonusFrz(1, '친구 초대로 가입했어요. 연속 학습 보호권 1장을 받았어요.'), 1500);
          try { LS.removeItem(REF_IN); } catch (e) {}
        } catch (e) { if (e && e.code !== 'offline') { try { LS.removeItem(REF_IN); } catch (x) {} } }
      } else { try { LS.removeItem(REF_IN); } catch (e) {} }
    }
    try {
      const st = await Cloud.call('voca_ref_status', {});
      if (st && st.code) config.refCode = String(st.code).slice(0, 12);
      if (st && !st.err) { config.refTotal = Math.max(0, +st.total || 0); refOk = true; }
      if (st && +st.fresh > 0) setTimeout(() => addBonusFrz(+st.fresh, `초대한 친구 ${+st.fresh}명이 가입했어요. 보호권 ${Math.min(5, +st.fresh)}장을 받았어요.`), 2500);
    } catch (e) {}
  }
  function inviteEntryHtml() {
    if (isTeacher()) return '';
    const n = config.refTotal || 0;
    return `<button class="mg-entry" data-act="invite"><span class="mg-ico i-sun">${IC.users}</span><span class="mg-txt"><b>${clOk() && refOk ? '친구 초대하고 보호권 받기' : '친구 초대하기'}</b><small>${clOk() && refOk ? (n ? `지금까지 ${n}명 초대 · ` : '') + '친구가 가입하면 둘 다 연속 보호권 1장' : '링크를 보내 함께 공부해요'}</small></span><span class="mg-chev"></span></button>`;
  }
  ACTIONS.invite = async () => { const c = refOk ? await refCode() : ''; shareOut(c ? '나랑 VocaPro로 영어 단어 같이 외우자! 내 링크로 가입하면 우리 둘 다 연속 학습 보호권을 받아.' : '나랑 VocaPro로 영어 단어 같이 외우자! 수준이랑 목적에 맞춰서 매일 조금씩 공부할 수 있어.', 'VocaPro 초대'); };
  ACTIONS['share-result'] = el => shareOut(el.dataset.text || 'VocaPro로 영어 단어 공부 중!', 'VocaPro');
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
      cat.words.push(sanitizeWord({ ...(full || {}), id: uid(), word: w, meaning: m || (full && full.meaning) || '' }));
    }
    categories.push(cat); syncStorage(); autoFill(cat.words); shareIn = null; closeSheet();
    toast(`'${nm}' 단어장에 ${cat.words.length}개를 담았어요.`);
    try { openBook(cat.id); } catch (e) { go('tabBooks'); }
  };

