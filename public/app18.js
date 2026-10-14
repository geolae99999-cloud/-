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
    const words = (Array.isArray(o.w) ? o.w : []).filter(a => Array.isArray(a) && a[0]).slice(0, 2000).map(a => [String(a[0]).slice(0, 80), String(a[1] == null ? '' : a[1]).slice(0, 200)]); // 뜻이 빈 단어도 남겨요
    if (!words.length) throw new Error('empty');
    return { name: String(o.n || '공유받은 단어장').slice(0, 40), words };
  }
  ACTIONS['book-share'] = async () => {
    const cat = curCat(); if (!cat) return;
    if (!cat.words.length) return toast('단어를 먼저 담아 주세요.');
    const url = location.origin + location.pathname + '#s=' + await shareEncode(cat);
    openSheet('단어장 공유', `<div class="form-stack">
      <div class="share-card"><span class="mg-ico i-mint">${IC.book}</span><div><b>${esc(cat.name)}</b><small>단어 ${cat.words.length}개 · 받는 사람도 VocaPro에서 바로 공부할 수 있어요</small></div></div>
      <input id="shareUrl" readonly value="${esc(url)}" data-act="select-all">
      <div class="row"><button class="btn btn-soft" data-act="share-copy">링크 복사</button>${navigator.share ? '<button class="btn btn-primary" data-act="share-send">보내기</button>' : ''}</div>
      <p class="muted" style="font-size:.78rem;line-height:1.6;margin:0;">링크 안에 단어와 뜻이 들어 있어요. 서버에 따로 저장되지 않고, 학습 기록은 함께 보내지 않아요.${url.length > 8000 ? ' 단어가 많아서 링크가 길어요. 메신저에 따라 잘릴 수 있으니 CSV 내보내기도 함께 써 보세요.' : ''}${cat.words.length > 2000 ? ` <b>공유 링크로는 앞의 2000개만 받을 수 있어요(나머지 ${cat.words.length - 2000}개는 CSV로 보내 주세요).</b>` : ''}</p></div>`);
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
      cat.words.push(sanitizeWord({ ...(full || {}), id: uid(), word: w, meaning: m || (full && full.meaning) || '' }));
    }
    categories.push(cat); syncStorage(); shareIn = null; closeSheet();
    toast(`'${nm}' 단어장에 ${cat.words.length}개를 담았어요.`);
    try { openBook(cat.id); } catch (e) { go('tabBooks'); }
  };

