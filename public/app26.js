  /* =========================================================
   * 키보드 단축키 (PC)
   * ======================================================= */
  const KBD = {
    card: [['Space', '뒤집기'], ['←', '몰라요'], ['→', '알아요'], ['Esc', '나가기']],
    choice: [['1~4', '고르기'], ['Esc', '나가기']],
    spell: [['Enter', '확인 · 다음'], ['Esc', '나가기']],
    listen: [['Space', '재생 · 정지'], ['← →', '이전 · 다음'], ['Esc', '나가기']]
  };
  KBD.lchoice = KBD.choice; KBD.mix = [['1~4', '고르기'], ['Enter', '확인 · 다음'], ['Esc', '나가기']]; KBD.scramble = [['A~Z', '글자 넣기'], ['⌫', '한 글자 지우기'], ['Esc', '나가기']];
  KBD.rchoice = KBD.choice; KBD.dict = KBD.spell; KBD.test = [['1~4', '고르기'], ['Enter', '제출'], ['Esc', '나가기']]; KBD.cloze = KBD.choice;
  // PC: 스크롤하면 위 바에 선, '/' 또는 Ctrl+K 로 단어 검색
  let scrolledOn = false;
  window.addEventListener('scroll', () => { const on = window.scrollY > 4; if (on !== scrolledOn) { scrolledOn = on; document.body.classList.toggle('scrolled', on); } }, { passive: true });
  document.addEventListener('keydown', e => {
    const t = e.target, typing = t && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable);
    const k = (e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey && !typing) || ((e.ctrlKey || e.metaKey) && !e.altKey && (e.key === 'k' || e.key === 'K'));
    if (!k || e.isComposing || document.querySelector('.dlg-ov') || $('authScreen').style.display !== 'none' || $('studyScreen').classList.contains('open') || $('sheetOv').classList.contains('open') || $('trOv') || $('lgOv') || $('obOv')) return;
    e.preventDefault(); ACTIONS['dict-open']();
  });
  function kbdHint(mode) { const el = $('kbdHint'); if (el) el.innerHTML = (KBD[mode] || []).map(([k, t]) => `<span><kbd>${k}</kbd>${t}</span>`).join(''); }
  document.addEventListener('keydown', e => {
    if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey || e.isComposing) return;
    if (document.querySelector('.dlg-ov')) return;
    const t = e.target, tag = t && t.tagName;
    const typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || !!(t && t.isContentEditable);
    const sheetOpen = $('sheetOv').classList.contains('open');
    const study = $('studyScreen').classList.contains('open') && !sheetOpen && !$('flOv') && !$('ltOv') && !$('mgOv');
    if (e.key === 'Escape') {
      if ($('trOv')) return;
      const lg = $('lgOv'); if (lg) { e.preventDefault(); lg.remove(); return; }
      if ($('authScreen').style.display !== 'none' || $('obOv')) return;
      for (const [id, sel] of [['flOv', '[data-fl="close"]'], ['ltOv', '[data-lt="close"]'], ['mgOv', '[data-mg="x"]']]) {
        const ov = $(id); if (!ov) continue;
        const b = ov.querySelector(sel); if (b) { e.preventDefault(); b.click(); }
        return;
      }
      if (sheetOpen) { e.preventDefault(); closeSheet(); return; }
      if (study) { e.preventDefault(); ACTIONS['exit-session'](); }
      return;
    }
    if (typing || $('trOv') || $('lgOv')) return;
    // 철자 퍼즐: 글자를 키보드로 쳐도 그 글자 타일이 눌려요. Backspace는 한 글자 지우기
    if (study && S.active && !S.finished && !S.locked && S.scr && $('scrTiles') && !isHanWord(S.queue[S.idx].w.word)) {
      if (e.key === 'Backspace') { e.preventDefault(); ACTIONS['scr-back'](); return; }
      if ([...e.key].length === 1 && e.key !== ' ') {
        const s = S.scr, k = e.key.toLowerCase(), i = s.order.find(j => !s.picked.includes(j) && s.letters[j].toLowerCase() === k);
        e.preventDefault();
        if (i != null) ACTIONS['scr-pick']({ dataset: { i: String(i) } });
        else { const tl = $('scrTiles'); tl.classList.remove('nope'); void tl.offsetWidth; tl.classList.add('nope'); }
        return;
      }
    }
    if (/^[1-4]$/.test(e.key)) {
      const scope = $('flOv') || $('ltOv') || (study ? $('stBody') : null);
      const b = scope && scope.querySelectorAll('.opt')[+e.key - 1];
      if (b && !b.disabled) { e.preventDefault(); b.click(); }
      return;
    }
    if (!study || !S.active || S.finished) return;
    if (tag === 'BUTTON' && (e.key === ' ' || e.key === 'Enter')) return;
    if (S.mode === 'card') {
      if (e.key === ' ') { e.preventDefault(); const f = $('fc3d'); if (f && !S.locked) f.classList.toggle('is-flipped'); }
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); flyCard(e.key === 'ArrowRight' ? 1 : -1); }
    } else if (S.mode === 'listen') {
      if (e.key === ' ') { e.preventDefault(); ACTIONS['l-toggle'](); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); ACTIONS['l-prev'](); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); ACTIONS['l-next'](); }
    }
  });

  /* =========================================================
   * 시작
   * ======================================================= */
  if ('speechSynthesis' in window) { try { window.speechSynthesis.getVoices(); } catch (e) {} }
  try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) {}
  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  let deferredInstall = null;
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredInstall = e; });
  ACTIONS.install = async () => {
    if (!deferredInstall) return say('브라우저 메뉴에서 "홈 화면에 추가"를 눌러 설치할 수 있어요.\n아이폰은 공유 버튼, 홈 화면에 추가예요.');
    deferredInstall.prompt(); try { await deferredInstall.userChoice; } catch (e) {} deferredInstall = null;
  };
  let lastErrAt = 0;
  const softErr = () => { if (Date.now() - lastErrAt > 4000) { lastErrAt = Date.now(); try { toast('일시적인 문제가 생겼어요. 계속 반복되면 새로고침해 주세요.'); } catch (e) {} } };
  window.addEventListener('error', e => { if (e && e.message && !/ResizeObserver/.test(e.message)) softErr(); });
  window.addEventListener('unhandledrejection', e => { e.preventDefault && e.preventDefault(); softErr(); });
  applyTheme();
  let sess = null;
  try { sess = LS.getItem(KEY_SESS) || sessionStorage.getItem(KEY_SESS); } catch (e) {}
  let kidBoot = false; try { kidBoot = cloudAvail && LS.getItem(KEY_KID) === '1'; } catch (e) {}
  if (kidBoot && sess && getUsers()[sess]) { setKidMode(true); enterApp(sess); }
  else if (cloudMode) bootCloud(); else if (sess && getUsers()[sess]) enterApp(sess); else showAuth();
