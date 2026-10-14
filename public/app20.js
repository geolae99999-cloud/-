  /* =========================================================
   * 발음 평가 (수행평가): 학생 녹음 -> 16kHz WAV -> 서버 저장 -> AI 채점 -> 선생님 듣기·점수
   * ======================================================= */
  const SP_MAX = 20, SP_RATE = 16000;
  const SP_MISSING = '발음 평가는 서버 설정이 필요해요. 운영자(선생님)가 Supabase SQL Editor에서 supabase_update_v11.sql을 실행하면 바로 쓸 수 있어요.';
  const SP_AI_OLD = 'AI 채점은 서버의 AI 함수를 새로 배포하면 돼요. 녹음은 선생님께 그대로 제출됐어요.';
  const spMsg = e => e && e.code === 'missing' ? SP_MISSING : clMsg(e);
  const spCap = it => it[3] === 's' ? 10 : 4; // 녹음 최대 길이(초): 단어 4초, 문장 10초
  const spTone = v => v == null ? '' : v >= 80 ? ' good' : v >= 60 ? ' mid' : ' low';
  const spLang = it => it[2] === 'zh' ? 'zh' : 'en';
  let SP = null; // 학생 녹음 화면 상태
  let SPT = null; // 선생님 결과 화면 상태
  const spUrls = new Set();
  let spAudio = null;
  const spBtn = (b, on) => { b.classList.toggle('on', on); b.innerHTML = on ? IC.pause : IC.play; };
  function spStopAudio() { if (spAudio) { try { spAudio.pause(); } catch (e) {} spAudio = null; } document.querySelectorAll('.sp-play.on').forEach(b => spBtn(b, false)); }
  function spPlayUrl(url, btn) {
    spStopAudio(); try { window.speechSynthesis.cancel(); } catch (e) {}
    const au = new Audio(url); spAudio = au;
    if (btn) spBtn(btn, true);
    const off = () => { if (spAudio === au) spAudio = null; if (btn) spBtn(btn, false); };
    au.addEventListener('ended', off); au.addEventListener('pause', off);
    au.play().catch(() => { off(); toast('이 기기에서 녹음을 재생하지 못했어요.'); });
  }
  const spBlobUrl = u8 => { const url = URL.createObjectURL(new Blob([u8], { type: 'audio/wav' })); spUrls.add(url); return url; };
  const spB64 = u8 => { let s = ''; for (let i = 0; i < u8.length; i += 8192) s += String.fromCharCode.apply(null, u8.subarray(i, i + 8192)); return btoa(s); };
  const spUnB64 = b => { const s = atob(b), u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return u; };
  // 시트를 닫거나 다른 화면으로 가면: 녹음 중지, 마이크 끄기, 재생 멈춤, blob 주소 반납
  function spEnd() {
    if (SP) { spRecStop(true); if (SP.stream) SP.stream.getTracks().forEach(t => t.stop()); if (SP.ctx) SP.ctx.close().catch(() => {}); SP = null; }
    SPT = null; spStopAudio(); spUrls.forEach(u => URL.revokeObjectURL(u)); spUrls.clear();
  }

  /* ----- 녹음 -> WAV (16kHz · 모노 · 16비트, 앞뒤 무음 자르기) ----- */
  function spWav(chunks, rate) {
    let n = 0; chunks.forEach(c => { n += c.length; });
    const x = new Float32Array(n); let o = 0; chunks.forEach(c => { x.set(c, o); o += c.length; });
    // 16kHz로 바꾸기: 줄일 때는 구간 평균(잡음 줄이기), 늘릴 때는 가까운 값
    const r = rate / SP_RATE, m = Math.floor(n / r), y = new Float32Array(m);
    for (let i = 0; i < m; i++) {
      const a = Math.floor(i * r), b = Math.min(n, Math.max(a + 1, Math.floor((i + 1) * r)));
      let s = 0; for (let k = a; k < b; k++) s += x[k]; y[i] = s / (b - a);
    }
    // 20ms 단위 소리 크기로 앞뒤 무음 자르기 (앞 0.15초, 뒤 0.2초 여유)
    const F = 320, fr = [];
    for (let i = 0; i + F <= m; i += F) { let s = 0; for (let k = i; k < i + F; k++) s += y[k] * y[k]; fr.push(Math.sqrt(s / F)); }
    const peak = Math.max(0, ...fr); if (peak < 0.006) return null;
    const th = Math.max(0.005, peak * 0.12), first = fr.findIndex(v => v >= th);
    let last = fr.length - 1; while (last > first && fr[last] < th) last--;
    const s0 = Math.max(0, (first - 8) * F), s1 = Math.min(m, (last + 11) * F), len = s1 - s0;
    if (len < SP_RATE * 0.15) return null;
    let mx = 0; for (let i = s0; i < s1; i++) mx = Math.max(mx, Math.abs(y[i]));
    const g = Math.min(4, 0.9 / (mx || 1)); // 너무 작게 녹음됐으면 키워요(최대 4배)
    const buf = new ArrayBuffer(44 + len * 2), v = new DataView(buf), w = (p, t) => { for (let i = 0; i < t.length; i++) v.setUint8(p + i, t.charCodeAt(i)); };
    w(0, 'RIFF'); v.setUint32(4, 36 + len * 2, true); w(8, 'WAVE'); w(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
    v.setUint32(24, SP_RATE, true); v.setUint32(28, SP_RATE * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, len * 2, true);
    for (let i = 0; i < len; i++) { const s = Math.max(-1, Math.min(1, y[s0 + i] * g)); v.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true); }
    return { u8: new Uint8Array(buf), ms: Math.round(len / SP_RATE * 1000) };
  }
  async function spMic() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || !window.isSecureContext) throw { code: 'unsupported' };
    if (!SP.ctx) SP.ctx = new AC();
    if (SP.ctx.state === 'suspended') await SP.ctx.resume().catch(() => {});
    if (!SP.stream || !SP.stream.getAudioTracks().some(t => t.readyState === 'live')) {
      try { SP.stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true } }); }
      catch (e) { throw { code: e && (e.name === 'NotAllowedError' || e.name === 'SecurityError') ? 'denied' : e && (e.name === 'NotFoundError' || e.name === 'OverconstrainedError') ? 'nomic' : 'unsupported' }; }
      if (SP.ctx.state !== 'running') await SP.ctx.resume().catch(() => {}); // 아이폰: 마이크를 켠 뒤 소리 처리가 멈춰 있을 수 있어요
    }
  }
  const SP_MIC_ERR = {
    denied: '마이크를 쓸 수 없어요. 브라우저 주소창의 자물쇠(또는 설정 > 사이트 권한)에서 마이크를 허용한 뒤 다시 눌러 주세요.',
    nomic: '마이크를 찾지 못했어요. 이어폰 마이크나 기기 마이크가 연결됐는지 확인해 주세요.',
    unsupported: '이 브라우저에서는 녹음할 수 없어요. 최신 Chrome, Safari(iPhone은 iOS 14.3 이상)에서 열어 주세요.'
  };
  async function spRecStart() {
    const it = SP.items[SP.i], cap = spCap(it), ctx = SP.ctx;
    const src = ctx.createMediaStreamSource(SP.stream), proc = ctx.createScriptProcessor(4096, 1, 1), mute = ctx.createGain();
    mute.gain.value = 0; // 내 목소리가 스피커로 다시 나오지 않게
    const R = { chunks: [], n: 0, lv: 0, t0: performance.now(), cap, src, proc, mute, idx: SP.i, max: Math.ceil(cap * ctx.sampleRate) };
    proc.onaudioprocess = e => {
      if (SP.rec !== R) return;
      const d = e.inputBuffer.getChannelData(0); let s = 0; for (let i = 0; i < d.length; i += 4) s += d[i] * d[i];
      R.lv = Math.min(1, Math.sqrt(s / (d.length / 4)) * 6);
      if (R.n < R.max) { const c = d.subarray(0, Math.min(d.length, R.max - R.n)); R.chunks.push(new Float32Array(c)); R.n += c.length; }
      if (R.n >= R.max) spRecStop();
    };
    src.connect(proc); proc.connect(mute); mute.connect(ctx.destination);
    SP.rec = R; spDraw();
    const tick = () => {
      if (SP && SP.rec === R) {
        const left = Math.max(0, cap - (performance.now() - R.t0) / 1000), lv = $('spLv'), cd = $('spCd'), ring = $('spRing');
        if (lv) lv.style.transform = `scaleX(${R.lv.toFixed(3)})`;
        if (ring) ring.style.setProperty('--p', (left / cap).toFixed(3));
        if (cd) cd.textContent = `${left.toFixed(1)}초 남았어요 · 다 읽으면 버튼을 눌러요`;
        if (left <= 0) spRecStop(); else requestAnimationFrame(tick);
      }
    };
    requestAnimationFrame(tick);
  }
  // 녹음 멈춤 -> WAV 만들기 -> 바로 올리기 (drop 이면 버리기)
  function spRecStop(drop) {
    const R = SP && SP.rec; if (!R) return;
    SP.rec = null;
    try { R.src.disconnect(); R.proc.disconnect(); R.mute.disconnect(); } catch (e) {}
    R.proc.onaudioprocess = null;
    // 녹음이 끝나면 마이크를 꺼요(주소창 마이크 표시가 계속 켜져 있지 않게). 다음 녹음 때 다시 켜요
    if (SP.stream) { SP.stream.getTracks().forEach(t => t.stop()); SP.stream = null; }
    if (drop) return;
    const wav = spWav(R.chunks, SP.ctx.sampleRate);
    if (!wav) { SP.note = '소리가 들리지 않았어요. 마이크 가까이에서 또렷하게 다시 읽어 주세요.'; return spDraw(); }
    spUpload(R.idx, wav);
  }
  async function spUpload(idx, wav) {
    const sp = SP; sp.busy = idx; sp.note = ''; spDraw();
    try {
      const r = await Cloud.call('voca_speak_put', { p_assign: sp.a.id, p_idx: idx, p_b64: spB64(wav.u8) });
      if (SP !== sp) return;
      const old = sp.local[idx]; if (old) { URL.revokeObjectURL(old); spUrls.delete(old); }
      sp.local[idx] = spBlobUrl(wav.u8);
      sp.mine[idx] = Object.assign(sp.mine[idx] || {}, { idx, dur_ms: r.dur_ms, audio: true, ai_score: null, ai_detail: null });
      sp.dirty = true;
    } catch (e) { if (SP !== sp) return; sp.note = '녹음을 올리지 못했어요. ' + spMsg(e); }
    sp.busy = null; spDraw();
  }

  /* ----- 학생: 발음 평가 열기 ----- */
  async function spOpen(a) {
    spEnd();
    const items = (Array.isArray(a.words) ? a.words : []).filter(x => Array.isArray(x) && x[0]).slice(0, SP_MAX);
    if (!items.length) return say('과제에 문항이 없어요.');
    openSheet(a.title, clLoading()); const tok = sheetTok;
    let m; try { m = await Cloud.call('voca_speak_mine', { p_assign: a.id }); } catch (e) { return tok === sheetTok && clFail(e && e.code === 'missing' ? { code: 'sp_missing' } : e, 'cl-home'); }
    if (tok !== sheetTok) return;
    SP = { a, items, i: 0, mine: {}, local: {}, submitted: !!m.submitted, score: m.score, view: 'rec', rec: null, busy: null, note: '' };
    (m.items || []).forEach(x => { SP.mine[x.idx] = x; });
    const graded = items.every((_, i) => SP.mine[i] && SP.mine[i].ai_score != null);
    if (SP.submitted && graded) SP.view = 'res';
    else { const k = items.findIndex((_, i) => !SP.mine[i]); SP.i = k < 0 ? 0 : k; }
    spDraw();
    // 제출했는데 채점이 안 된 문항이 있으면(예: AI가 바빴음) 다시 채점해요
    if (SP.submitted && !graded && items.every((_, i) => SP.mine[i])) spGrade();
  }
  const spDone = () => SP.items.filter((_, i) => SP.mine[i]).length;
  function spDraw() {
    const sp = SP; if (!sp || !$('sheetOv').classList.contains('open')) return;
    $('sheetTitle').textContent = sp.a.title;
    if (sp.view === 'grading') { $('sheetBody').innerHTML = `<div class="sp">${clLoading('AI가 발음을 듣고 채점하고 있어요. 1분 정도 걸릴 수 있어요...')}</div>`; return; }
    if (sp.view === 'res') return spResDraw();
    const it = sp.items[sp.i], r = sp.mine[sp.i], rec = sp.rec && sp.rec.idx === sp.i, busy = sp.busy === sp.i, n = spDone(), last = sp.i === sp.items.length - 1;
    const zh = spLang(it) === 'zh', cap = spCap(it);
    $('sheetBody').innerHTML = `<div class="sp">
      <div class="sp-top"><span class="sp-step"><b>${sp.i + 1}</b> / ${sp.items.length}</span><span class="sp-got">녹음 ${n}/${sp.items.length}</span></div>
      <div class="sp-dots">${sp.items.map((_, i) => `<button class="${i === sp.i ? 'cur ' : ''}${sp.mine[i] ? 'ok' : ''}" data-act="sp-go" data-i="${i}" aria-label="${i + 1}번 문항"></button>`).join('')}</div>
      <div class="sp-card">
        <small class="sp-kind">${it[3] === 's' ? '문장' : '단어'} · ${zh ? '중국어' : '영어'}</small>
        <b class="sp-text${zh ? ' zh' : ''}${it[3] === 's' ? ' long' : ''}" lang="${zh ? 'zh-CN' : 'en'}">${esc(it[0])}</b>
        ${it[1] ? `<span class="sp-mean">${esc(it[1])}</span>` : ''}
        <button class="btn btn-sm btn-soft sp-listen" data-act="sp-listen">${IC.speaker} 원어민 발음 듣기</button>
      </div>
      <div class="sp-recbox${rec ? ' on' : ''}">
        <button class="sp-mic${rec ? ' on' : ''}" id="spRing" data-act="sp-rec"${busy ? ' disabled' : ''} aria-label="${rec ? '녹음 멈추기' : r ? '다시 녹음하기' : '녹음 시작'}">${rec ? '<i class="sp-stop"></i>' : IC.mic}</button>
        <div class="sp-meter"><i id="spLv"></i></div>
        <p class="sp-hint" id="spCd">${rec ? `${cap}초 남았어요` : busy ? '올리는 중...' : r ? '다시 누르면 새로 녹음해요' : `버튼을 누르고 읽어 주세요 · 최대 ${cap}초`}</p>
      </div>
      ${sp.note ? `<p class="sp-note">${esc(sp.note)}</p>` : ''}
      ${r ? `<div class="sp-mine"><button class="sp-play" data-act="sp-play" data-i="${sp.i}" aria-label="내 녹음 듣기">${IC.play}</button><span>내 녹음 <small>${(r.dur_ms / 1000).toFixed(1)}초</small></span>${r.ai_score != null ? `<em class="sp-sc${spTone(r.ai_score)}">${esc(r.ai_score)}점</em>` : ''}</div>` : ''}
      <div class="row sp-nav"><button class="btn btn-soft" data-act="sp-go" data-i="${sp.i - 1}"${sp.i && !rec ? '' : ' disabled'}>이전</button>${last
        ? `<button class="btn btn-primary" data-act="sp-submit"${n < sp.items.length || sp.busy != null || rec ? ' disabled' : ''}>${n < sp.items.length ? `${sp.items.length - n}개 더 녹음해요` : sp.submitted && !sp.dirty ? '채점 결과 보기' : '제출하고 채점받기'}</button>`
        : `<button class="btn btn-primary" data-act="sp-go" data-i="${sp.i + 1}"${rec ? ' disabled' : ''}>다음</button>`}</div>
      <p class="muted cl-p sp-foot">녹음은 선생님만 들을 수 있고 60일 뒤 자동으로 지워져요.</p></div>`;
  }
  function spResDraw() {
    const sp = SP, list = sp.items.map((it, i) => ({ it, i, r: sp.mine[i] || {} }));
    const fin = list.map(x => x.r.t_score != null ? x.r.t_score : x.r.ai_score).filter(v => v != null);
    const avg = fin.length ? Math.round(fin.reduce((s, v) => s + v, 0) / fin.length) : null;
    $('sheetBody').innerHTML = `<div class="sp">
      <div class="sp-sum"><small>발음 점수</small><b class="${spTone(avg).trim()}">${avg != null ? avg : '-'}<em>점</em></b><span>${fin.length}/${sp.items.length}문항 채점${list.some(x => x.r.t_score != null) ? ' · 선생님 점수 반영' : ''}</span></div>
      ${sp.note ? `<p class="sp-note">${esc(sp.note)}</p>${fin.length < sp.items.length ? '<button class="btn btn-soft btn-block" data-act="sp-grade">AI 채점 다시 하기</button>' : ''}` : ''}
      <div class="sp-list">${list.map(({ it, i, r }) => { const d = r.ai_detail || {}, sc = r.t_score != null ? r.t_score : r.ai_score; return `<div class="sp-ri">
        <div class="sp-ri-top"><button class="sp-play" data-act="sp-play" data-i="${i}" aria-label="내 녹음 듣기"${r.idx == null ? ' disabled' : ''}>${IC.play}</button>
          <div class="sp-ri-t"><b lang="${spLang(it) === 'zh' ? 'zh-CN' : 'en'}">${esc(it[0])}</b>${it[1] ? `<small>${esc(it[1])}</small>` : ''}</div>
          <em class="sp-sc${spTone(sc)}">${sc != null ? esc(sc) : '-'}</em></div>
        ${d.heard ? `<p class="sp-heard">AI가 들은 말 <b>${esc(d.heard)}</b></p>` : ''}${d.tips ? `<p class="sp-tip">${esc(d.tips)}</p>` : ''}
        ${Array.isArray(d.problems) && d.problems.length ? `<div class="sp-prob">${d.problems.map(x => `<span>${esc(x)}</span>`).join('')}</div>` : ''}
        ${r.t_score != null || r.t_note ? `<p class="sp-tnote">선생님${r.t_score != null ? ` <b>${esc(r.t_score)}점</b>` : ''}${r.t_note ? ` · ${esc(r.t_note)}` : ''}${r.ai_score != null && r.t_score != null ? ` <small>(AI ${esc(r.ai_score)}점)</small>` : ''}</p>` : ''}</div>`; }).join('')}</div>
      <p class="muted cl-p">AI 점수는 참고용이에요. 선생님이 녹음을 듣고 점수를 고칠 수 있어요.</p>
      <div class="row"><button class="btn btn-soft" data-act="sp-redo">다시 녹음하기</button><button class="btn btn-primary" data-act="cl-home">반 목록</button></div></div>`;
  }
  ACTIONS['sp-go'] = el => { if (!SP || SP.rec) return; const i = +el.dataset.i; if (i < 0 || i >= SP.items.length) return; SP.i = i; SP.note = ''; spStopAudio(); spDraw(); };
  ACTIONS['sp-listen'] = () => { if (!SP) return; const it = SP.items[SP.i]; spStopAudio(); speak(it[0], spLang(it) === 'zh' ? 'zh-CN' : 'en-US'); };
  ACTIONS['sp-rec'] = async () => {
    const sp = SP; if (!sp || sp.busy != null) return;
    if (sp.rec) return spRecStop();
    // 처음 한 번: 녹음 안내 + 마이크 허락
    const k = 'vocapro_sp_ok:' + currentUser;
    if (!LS.getItem(k)) {
      if (!await ask('녹음 안내\n녹음은 선생님만 들을 수 있고 60일 뒤 자동으로 지워져요.\n제출하면 AI가 발음을 채점해요(녹음을 Google Gemini로 보내요).\n다음 화면에서 마이크 사용을 허락해 주세요.', { ok: '녹음 시작' })) return;
      try { LS.setItem(k, '1'); } catch (e) {}
    }
    if (SP !== sp) return;
    try { await spMic(); } catch (e) { if (SP === sp) { sp.note = SP_MIC_ERR[e.code] || SP_MIC_ERR.unsupported; spDraw(); } return; }
    if (SP !== sp || sp.rec) return;
    try { window.speechSynthesis.cancel(); } catch (e) {} spStopAudio();
    try { await spRecStart(); } catch (e) { sp.note = SP_MIC_ERR.unsupported; spDraw(); }
  };
  ACTIONS['sp-play'] = async el => {
    const sp = SP, i = +el.dataset.i; if (!sp || !sp.mine[i]) return;
    if (el.classList.contains('on')) return spStopAudio();
    let url = sp.local[i];
    if (!url) {
      el.disabled = true;
      try { const r = await Cloud.call('voca_speak_audio', { p_assign: sp.a.id, p_uid: String(currentUser), p_idx: i }); url = sp.local[i] = spBlobUrl(spUnB64(r.b64)); }
      catch (e) { el.disabled = false; return toast(spMsg(e)); }
      el.disabled = false;
    }
    spPlayUrl(url, el);
  };
  ACTIONS['sp-redo'] = () => { if (!SP) return; SP.view = 'rec'; SP.i = 0; SP.note = ''; spDraw(); };
  ACTIONS['sp-submit'] = async el => {
    const sp = SP; if (!sp) return;
    if (sp.submitted && !sp.dirty && sp.items.every((_, i) => sp.mine[i] && sp.mine[i].ai_score != null)) { sp.view = 'res'; return spDraw(); }
    el.disabled = true;
    try { await Cloud.call('voca_speak_submit', { p_assign: sp.a.id }); }
    catch (e) { el.disabled = false; return say(spMsg(e)); }
    if (SP !== sp) return;
    const first = !sp.submitted; sp.submitted = true; sp.dirty = false;
    if (first) { const c = clCache(); if (c.pending > 0) { c.pending--; try { LS.setItem(clKey(), JSON.stringify(c)); } catch (e) {} } }
    spGrade();
  };
  ACTIONS['sp-grade'] = () => spGrade();
  // AI 채점: 서버가 채점 안 된 녹음을 꺼내 Gemini로 한 번에 채점하고 점수를 저장해요
  async function spGrade() {
    const sp = SP; if (!sp) return;
    sp.view = 'grading'; sp.note = ''; spDraw();
    try {
      const t = await Cloud.ai(undefined, { task: 'pron', assign: sp.a.id }, 75000);
      if (SP !== sp) return;
      let j = {}; try { j = JSON.parse(t); } catch (e) {}
      (Array.isArray(j.items) ? j.items : []).forEach(x => { const r = sp.mine[x.idx]; if (r) { r.ai_score = x.score; r.ai_detail = { heard: x.heard, tips: x.tips, problems: x.problems }; } });
      if (sp.items.some((_, i) => sp.mine[i] && sp.mine[i].ai_score == null)) sp.note = 'AI가 일부 문항을 채점하지 못했어요. 잠시 뒤 다시 해 주세요.';
    } catch (e) {
      if (SP !== sp) return;
      sp.note = 'AI 채점을 하지 못했어요. ' + (e && e.code === 'missing' ? SP_MISSING : e && e.status === 400 ? SP_AI_OLD : (e && e.message) || '') + ' 녹음은 선생님께 제출됐어요.';
    }
    sp.view = 'res'; spDraw();
  }

  /* ----- 선생님: 발음 평가 결과 (학생별 -> 문항별 듣기 · 점수) ----- */
  async function spResults(id, keepUid) {
    spEnd();
    openSheet('발음 평가', clLoading()); const tok = sheetTok;
    let r; try { r = await Cloud.call('voca_speak_results', { p_assign: id }); } catch (e) { return tok === sheetTok && clFail(e && e.code === 'missing' ? { code: 'sp_missing' } : e, 'cl-back'); }
    if (tok !== sheetTok) return;
    SPT = { id, r, open: keepUid || null, cache: {} };
    spTDraw();
  }
  function spTDraw() {
    const t = SPT; if (!t) return;
    const a = t.r.assign, rows = t.r.rows || [], items = (Array.isArray(a.words) ? a.words : []).slice(0, SP_MAX);
    $('sheetTitle').textContent = a.title;
    const m = t.open != null && rows.find(x => x.uid === t.open);
    if (m) {
      $('sheetBody').innerHTML = `<div class="form-stack cl sp">
        <div class="sp-who"><button class="icon-btn" data-act="sp-tlist" aria-label="목록으로">${IC.back}</button><div><b>${esc(m.name || '이름 없음')}</b><small>${esc(m.sno || '')} · 녹음 ${esc(m.n)}/${items.length}${m.submitted ? ' · 제출함' : ' · 아직 제출 전'}</small></div>
          <span class="sp-who-sc"><small>점수</small><b class="${spTone(m.submitted ? m.score : null).trim()}">${m.submitted && m.score != null ? esc(m.score) : '-'}</b></span></div>
        <div class="sp-list">${items.map((it, i) => { const r = (m.items || []).find(x => x.idx === i), d = (r && r.ai_detail) || {}; return `<div class="sp-ri">
          <div class="sp-ri-top"><button class="sp-play" data-act="sp-tplay" data-i="${i}" aria-label="${i + 1}번 녹음 듣기"${r && r.audio ? '' : ' disabled'}>${IC.play}</button>
            <div class="sp-ri-t"><b lang="${spLang(it) === 'zh' ? 'zh-CN' : 'en'}">${esc(it[0])}</b><small>${esc([it[1], r ? (r.audio ? `${(r.dur_ms / 1000).toFixed(1)}초` : '녹음 파일 지워짐(60일)') : '녹음 없음'].filter(Boolean).join(' · '))}</small></div>
            <em class="sp-sc${spTone(r && r.ai_score)}" title="AI 점수">${r && r.ai_score != null ? 'AI ' + esc(r.ai_score) : r ? '채점 전' : '-'}</em></div>
          ${d.heard ? `<p class="sp-heard">AI가 들은 말 <b>${esc(d.heard)}</b></p>` : ''}${d.tips ? `<p class="sp-tip">${esc(d.tips)}</p>` : ''}
          ${Array.isArray(d.problems) && d.problems.length ? `<div class="sp-prob">${d.problems.map(x => `<span>${esc(x)}</span>`).join('')}</div>` : ''}
          ${r ? `<div class="sp-tform"><input type="number" id="spT${i}" min="0" max="100" inputmode="numeric" placeholder="점수" value="${r.t_score != null ? esc(r.t_score) : ''}" aria-label="${i + 1}번 선생님 점수"><input type="text" id="spN${i}" maxlength="200" placeholder="한 줄 메모 (학생에게 보여요)" value="${esc(r.t_note || '')}" aria-label="${i + 1}번 메모"><button class="btn btn-sm btn-primary" data-act="sp-tsave" data-i="${i}">저장</button></div>` : ''}</div>`; }).join('')}</div>
        <p class="muted cl-p">선생님 점수를 넣으면 그 문항은 AI 점수 대신 선생님 점수로 계산해요. 비우고 저장하면 AI 점수로 돌아가요.</p>
        <button class="btn btn-soft btn-block" data-act="sp-regrade"${m.n ? '' : ' disabled'}>${IC.sparkles} AI 다시 채점</button>
        <button class="btn btn-soft btn-block" data-act="sp-tlist">학생 목록</button></div>`;
      return;
    }
    const sub = rows.filter(x => x.submitted), avg = v => v.length ? Math.round(v.reduce((s, x) => s + x, 0) / v.length) : null;
    const total = avg(sub.map(x => x.score).filter(v => v != null)), ai = avg(rows.map(x => x.ai_avg).filter(v => v != null));
    $('sheetBody').innerHTML = `<div class="form-stack cl sp">
      <div class="cl-kv"><span>발음 평가</span><span>${items.length}문항</span>${a.due ? `<span>${clDue(a.due)}</span>` : ''}<span>제출 <b>${sub.length}/${rows.length}</b></span>${total != null ? `<span>평균 <b>${total}점</b></span>` : ''}${ai != null ? `<span>AI 평균 <b>${ai}점</b></span>` : ''}</div>
      ${rows.length ? `<div class="cl-table sp-tt"><div class="cl-tr cl-th"><span>이름</span><span>녹음</span><span>AI</span><span>선생님</span><span>점수</span></div>
        ${rows.map(x => `<button class="cl-tr" data-act="sp-stu" data-uid="${esc(x.uid)}"><span><b>${esc(x.name || '이름 없음')}</b>${x.sno ? `<small>${esc(x.sno)}</small>` : ''}</span><span class="${x.n >= items.length ? 'sp-full' : ''}">${esc(x.n)}/${items.length}</span><span>${x.ai_avg != null ? esc(x.ai_avg) : '-'}</span><span>${x.t_avg != null ? esc(x.t_avg) : '-'}</span><span>${x.submitted && x.score != null ? `<b class="sp-sc${spTone(x.score)}">${esc(x.score)}</b>` : '<small>미제출</small>'}</span></button>`).join('')}</div>`
        : '<p class="muted cl-p">아직 반에 학생이 없어요.</p>'}
      <p class="muted cl-p">학생을 누르면 문항마다 녹음을 듣고 점수를 고칠 수 있어요. AI 점수는 참고용이에요.</p>
      <div class="row cl-foot"><button class="btn btn-soft" data-act="cl-back">돌아가기</button><button class="btn btn-soft cl-danger" data-act="cl-adel" data-id="${a.id}">과제 삭제</button></div></div>`;
  }
  ACTIONS['sp-stu'] = el => { if (!SPT) return; spStopAudio(); SPT.open = el.dataset.uid; spTDraw(); $('sheetBody').scrollTop = 0; };
  ACTIONS['sp-tlist'] = () => { if (!SPT) return; spStopAudio(); SPT.open = null; spTDraw(); };
  ACTIONS['sp-tplay'] = async el => {
    const t = SPT; if (!t || t.open == null) return;
    if (el.classList.contains('on')) return spStopAudio();
    const i = +el.dataset.i, key = t.open + ':' + i;
    if (!t.cache[key]) {
      el.disabled = true;
      try { const r = await Cloud.call('voca_speak_audio', { p_assign: t.id, p_uid: t.open, p_idx: i }); t.cache[key] = spBlobUrl(spUnB64(r.b64)); }
      catch (e) { el.disabled = false; return toast(spMsg(e)); }
      el.disabled = false; if (SPT !== t) return;
    }
    spPlayUrl(t.cache[key], el);
  };
  ACTIONS['sp-tsave'] = async el => {
    const t = SPT; if (!t || t.open == null) return;
    const i = +el.dataset.i, raw = (($('spT' + i) || {}).value || '').trim(), note = (($('spN' + i) || {}).value || '').trim();
    const sc = raw === '' ? null : Math.round(+raw);
    if (sc != null && !(sc >= 0 && sc <= 100)) return toast('점수는 0부터 100까지 적어 주세요.');
    el.disabled = true;
    try {
      await Cloud.call('voca_speak_teacher', { p_assign: t.id, p_uid: t.open, p_idx: i, p_score: sc, p_note: note });
      toast('점수를 저장했어요.');
      const pos = $('sheetBody').scrollTop; await spResults(t.id, t.open); $('sheetBody').scrollTop = pos;
    } catch (e) { el.disabled = false; say(spMsg(e)); }
  };
  ACTIONS['sp-regrade'] = async el => {
    const t = SPT; if (!t || t.open == null) return;
    if (!await ask('이 학생의 녹음을 AI로 다시 채점할까요?\n선생님이 넣은 점수는 그대로 남아요. AI 사용 1회로 세요.', { ok: '다시 채점' })) return;
    el.disabled = true; el.textContent = 'AI가 듣는 중... (1분 정도)';
    try { await Cloud.ai(undefined, { task: 'pron', assign: t.id, student: t.open }, 75000); toast('AI가 다시 채점했어요.'); }
    catch (e) { say('AI 채점을 하지 못했어요. ' + (e && e.code === 'missing' ? SP_MISSING : e && e.status === 400 ? 'AI 함수를 새로 배포하면 쓸 수 있어요.' : (e && e.message) || '')); }
    if (SPT === t) { const pos = $('sheetBody').scrollTop; await spResults(t.id, t.open); $('sheetBody').scrollTop = pos; }
  };

  /* ----- 학생: 과제 풀기 · 결과 제출 ----- */
  ACTIONS['cl-do'] = async el => {
    const id = +el.dataset.id; el.disabled = true;
    let a; try { a = await Cloud.call('voca_assign_get', { p_assign: id }); } catch (e) { el.disabled = false; return say(clMsg(e)); }
    if (a.kind === 'speak') return spOpen(a);
    const list = (Array.isArray(a.words) ? a.words : []).filter(x => Array.isArray(x) && x[0] && x[1]);
    if (!list.length) { el.disabled = false; return say('과제에 단어가 없어요.'); }
    const name = `${a.class} · ${a.title}`.slice(0, 60);
    // 이름이 아니라 과제 번호로 찾아요(이름은 40자로 잘리고 같은 이름 단어장이 있을 수 있어요). 비었으면 다시 채워요
    let cat = categories.find(c => c.asg === a.id);
    if (!cat || !cat.words.length) {
      el.textContent = '단어장 준비 중...';
      await dictPreload(list.map(x => x[0]));
      const isNew = !cat; if (isNew) cat = { id: 'c' + uid(), name, words: [], asg: a.id }; const seen = new Set();
      for (const [w, m] of list) {
        const k = String(w).toLowerCase(); if (seen.has(k)) continue; seen.add(k);
        let full = null; try { full = await dictGet(w); } catch (e) {}
        cat.words.push(sanitizeWord({ ...(full || {}), id: uid(), word: String(w), meaning: String(m) }));
      }
      if (isNew) categories.push(cat); syncStorage();
    }
    closeSheet();
    if (allWords().length < 4) return say('시험과 뜻 고르기는 전체 단어가 4개 이상 있어야 해요.');
    if (a.kind === 'test') startSession('test', { type: 'cat', id: cat.id }, Math.min(a.n || 20, cat.words.length));
    else startSession('choice', { type: 'cat', id: cat.id }, 0);
    if (S.active) S.assign = { id: a.id, title: a.title };
  };
  async function clSubmit(asg, ok, n, sec, wrong) {
    const box = document.createElement('div'); box.className = 'cl-sub'; box.textContent = `'${asg.title}' 결과를 선생님에게 보내는 중...`;
    const res = document.querySelector('#stBody .result'); if (res) res.insertBefore(box, res.firstChild);
    try {
      const r = await Cloud.call('voca_assign_submit', { p_assign: asg.id, p_ok: ok, p_n: Math.max(1, n), p_sec: sec, p_wrong: wrong.slice(0, 100) });
      box.classList.add('ok'); box.textContent = `과제를 제출했어요. 이번 ${r.score}점${r.tries > 1 ? `, 최고 ${r.best}점(${r.tries}번째)` : ''}`;
      const c = clCache(); if (r.tries === 1 && c.pending > 0) { c.pending--; try { LS.setItem(clKey(), JSON.stringify(c)); } catch (e) {} }
      clReport(true);
    } catch (e) { box.classList.add('bad'); box.textContent = '제출하지 못했어요. ' + clMsg(e) + ' 과제를 다시 풀면 다시 제출돼요.'; }
  }

  /* ----- 학생: 학습 요약 올리기 ----- */
  let clLastReport = 0;
  async function clReport(force) {
    if (!clOk() || isTeacher() && !force) return;
    if (!clCache().joined) return;
    if (!force && Date.now() - clLastReport < 180000) return;
    clLastReport = Date.now();
    const c = counts(); let n7 = 0, ok7 = 0, last = '';
    for (let i = 0; i < 7; i++) { const d = stats.days[dayKey(addDays(startOfDay(), -i))]; if (d) { n7 += d.n || 0; ok7 += d.ok || 0; } }
    Object.keys(stats.days).forEach(k => { if ((stats.days[k].n || 0) > 0 && k > last) last = k; });
    const weak = allWords().filter(x => x.w.miss > 0).sort((a, b) => b.w.miss - a.w.miss).slice(0, 10).map(x => [x.w.word.slice(0, 60), (x.w.meaning || '').slice(0, 40), x.w.miss]);
    const tests = (stats.tests || []).slice(-5).reverse().map(t => [t.d, Math.round(t.ok / t.n * 100), String(t.src || '').slice(0, 40)]);
    const p = { total: c.total, mastered: c.mastered, due: c.due, streak: streak(), today: (stats.days[dayKey()] || { n: 0 }).n, n7, acc7: n7 ? Math.round(ok7 / n7 * 100) : null, last, weak, tests, at: Date.now() };
    try { await Cloud.call('voca_class_report', { p_progress: p }); } catch (e) {}
  }

