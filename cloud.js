(function () {
  const cfg = window.VOCA_CLOUD;
  if (!(cfg && cfg.apiKey && cfg.url)) return;
  const TK = 'vocapro_tok';
  const hdr = { apikey: cfg.apiKey, 'Content-Type': 'application/json' };
  if (/^eyJ/.test(cfg.apiKey)) hdr.Authorization = 'Bearer ' + cfg.apiKey;
  const getTok = () => { try { return localStorage.getItem(TK) || sessionStorage.getItem(TK); } catch (e) { return null; } };
  const setTok = (t, keep) => { try { localStorage.removeItem(TK); sessionStorage.removeItem(TK); if (t) (keep ? localStorage : sessionStorage).setItem(TK, t); } catch (e) {} };
  async function rpc(fn, args) {
    let r;
    try { r = await fetch(cfg.url.replace(/\/+$/, '') + '/rest/v1/rpc/' + fn, { method: 'POST', headers: hdr, body: JSON.stringify(args) }); }
    catch (e) { throw { code: 'network', message: String(e.message || e) }; }
    const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch (e) {}
    if (!r.ok) throw { code: 'server', message: (j && (j.message || j.hint)) || t.slice(0, 150) };
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
    save: d => rpc('voca_save', { p_token: getTok(), p_data: d.data, p_updated: d.updated }),
    async remove() { await rpc('voca_delete', { p_token: getTok() }); setTok(null); cur = null; }
  };
  window.dispatchEvent(new Event('cloudready'));
})();
