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
