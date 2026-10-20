(function () {
  const cfg = window.VOCA_CLOUD;
  if (!(cfg && cfg.apiKey && cfg.url)) return;
  const TK = 'vocapro_tok';
  const hdr = { apikey: cfg.apiKey, 'Content-Type': 'application/json' };
  if (/^eyJ/.test(cfg.apiKey)) hdr.Authorization = 'Bearer ' + cfg.apiKey;
  const getTok = () => { try { return localStorage.getItem(TK) || sessionStorage.getItem(TK); } catch (e) { return null; } };
  const setTok = (t, keep) => { try { localStorage.removeItem(TK); sessionStorage.removeItem(TK); if (t) (keep ? localStorage : sessionStorage).setItem(TK, t); } catch (e) {} };
  (function () {
    try {
      const h = location.hash || '';
      if (/^#oauth=/.test(h)) {
        const p = new URLSearchParams(h.slice(1)), t = p.get('oauth') || '';
        if (/^[\w.-]{16,400}$/.test(t)) {
          setTok(t, true);
          if (p.get('new') === '1') sessionStorage.setItem('vocapro_just_signed_up', '1');
        }
        history.replaceState(null, '', location.pathname + location.search);
      } else if (/^#oerr=/.test(h)) {
        const code = new URLSearchParams(h.slice(1)).get('oerr') || '';
        const msg = code === 'cancel' ? '간편 로그인을 취소했어요.'
          : code === 'config' ? '간편 로그인이 아직 준비되지 않았어요. 아이디로 로그인해 주세요.'
          : code === 'busy' ? '지금 가입하는 사람이 많아요. 잠시 뒤에 다시 해 주세요.'
          : '간편 로그인에 실패했어요. 다시 시도해 주세요.';
        sessionStorage.setItem('vocapro_oauth_err', msg);
        history.replaceState(null, '', location.pathname + location.search);
      }
    } catch (e) {}
  })();
  async function rpc(fn, args, ka) {
    let r;
    try { r = await fetch(cfg.url.replace(/\/+$/, '') + '/rest/v1/rpc/' + fn, { method: 'POST', headers: hdr, body: JSON.stringify(args), keepalive: !!ka }); }
    catch (e) { throw { code: 'network', message: String(e.message || e) }; }
    const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch (e) {}
    if (!r.ok) throw { code: r.status === 404 ? 'missing' : 'server', status: r.status, message: (j && (j.message || j.hint)) || t.slice(0, 150) };
    if (j && j.err) throw { code: j.err, message: j.err };
    return j;
  }
  let cur = null;
  const me = j => ({ uid: String(j.id), email: j.username });
  const first = (async () => {
    const t = getTok(); if (!t) return null;
    try { cur = me(await rpc('voca_me', { p_token: t })); return cur; }
    catch (e) {
      if (e.code === 'network') {
        try { const id = localStorage.getItem('vocapro_last_uid'); if (id) { cur = { uid: id, email: localStorage.getItem('vocapro_last_label') || '' }; return cur; } } catch (x) {}
        return null;
      }
      setTok(null); return null;
    }
  })();
  async function enter(fn, e, p, k) { const j = await rpc(fn, { p_user: e, p_pw: p }); setTok(j.token, k !== false); cur = me(j); return cur; }
  window.Cloud = {
    first, user: () => cur,
    signup: (e, p, k) => enter('voca_signup', e, p, k),
    login: (e, p, k) => enter('voca_login', e, p, k),
    async logout() { const t = getTok(); setTok(null); cur = null; if (t) { try { await rpc('voca_logout', { p_token: t }); } catch (e) {} } },
    async reset() { throw { code: 'bad_input' }; },
    async load() { const j = await rpc('voca_load', { p_token: getTok() }); return j && j.data ? { data: j.data, updated: Number(j.updated) } : null; },
    save: (d, o) => rpc('voca_save', { p_token: getTok(), p_data: d.data, p_updated: d.updated }, o && o.keepalive),
    changePw: (o, n) => rpc('voca_change_pw', { p_token: getTok(), p_old: o, p_new: n }),
    // 이메일 인증: 코드는 서버 함수 mail 이 보내고, 확인 · 가입 · 재설정은 DB 함수가 해요.
    async sendCode(email, purpose) {
      let r; try { r = await fetch(cfg.url.replace(/\/+$/, '') + '/functions/v1/mail', { method: 'POST', headers: hdr, body: JSON.stringify({ email, purpose }) }); }
      catch (e) { throw { code: 'network' }; }
      let j = null; try { j = await r.json(); } catch (e) {}
      if (!r.ok || !j || !j.ok) throw { code: (j && j.error) || 'server' };
      return true;
    },
    async signupEmail(u, p, email, code, k) { const j = await rpc('voca_signup_email', { p_user: u, p_pw: p, p_email: email, p_code: code }); setTok(j.token, k !== false); cur = me(j); return cur; },
    resetPw: (email, code, pw) => rpc('voca_pw_reset', { p_email: email, p_code: code, p_new: pw }),
    linkEmail: (email, code) => rpc('voca_email_link', { p_token: getTok(), p_email: email, p_code: code }),
    myEmail: () => rpc('voca_email_mine', { p_token: getTok() }),
    visit: () => rpc('voca_visit', { p_token: getTok(), p_ua: String(navigator.userAgent || '').slice(0, 300) }),
    call: (fn, args) => rpc(fn, Object.assign({ p_token: getTok() }, args || {})),
    async remove() { await rpc('voca_delete', { p_token: getTok() }); setTok(null); cur = null; },
    async ai(prompt, task, ms) {
      const sec = Math.round((ms || 20000) / 1000);
      let r; const ctl = new AbortController(), tm = setTimeout(() => ctl.abort(), ms || 20000);
      // 서버가 프롬프트를 만드는 새 작업(ocr, ctx, pron)은 prompt 를 보내지 않아요. 사진(ocr) · 녹음 파일(pron + file)은 큰 요청용 주소로.
      const t = task && task.task, lean = t === 'ocr' || t === 'ctx' || t === 'pron';
      try { r = await fetch(cfg.url.replace(/\/+$/, '') + '/functions/v1/ai' + (t === 'ocr' ? '?t=ocr' : t === 'pron' && task.file ? '?t=pron' : ''), { method: 'POST', headers: hdr, body: JSON.stringify(Object.assign({ token: getTok() }, lean ? {} : { prompt }, task || {})), signal: ctl.signal }); }
      catch (e) {
        clearTimeout(tm);
        const x = new Error(e && e.name === 'AbortError' ? `AI 응답이 ${sec}초 넘게 없어요. 다시 시도해 주세요.` : '서버에 연결하지 못했어요. 인터넷 연결을 확인해 주세요.');
        x.status = e && e.name === 'AbortError' ? 408 : 0; throw x;
      }
      clearTimeout(tm);
      let j = null; try { j = await r.json(); } catch (e) {}
      if (!r.ok || !j || typeof j.text !== 'string') {
        const m = r.status === 404 ? '서버 AI가 아직 준비되지 않았어요. 설정에서 내 API 키를 입력하면 바로 쓸 수 있어요.' : r.status === 429 ? ((j && j.error) || '오늘 AI 사용 한도를 다 썼어요. 내일 다시 쓸 수 있어요.') : (j && j.error) || 'AI 호출에 실패했어요.';
        const x = new Error(m); x.status = r.status; x.code = j && j.code; throw x;
      }
      return j.text;
    }
  };
  window.dispatchEvent(new Event('cloudready'));
})();
