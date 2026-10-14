  /* =========================================================
   * 발음 평가 (수행평가): 학생 녹음 -> 16kHz MP3 -> 서버 저장 -> 선생님 보드(10초마다) -> 선생님 AI 채점 · 점수 · 받은 파일 채점
   * ======================================================= */
  const SP_MAX = 20, SP_RATE = 16000, SP_KBPS = 32, SP_FILE_SEC = 180, SP_POLL = 10000;
  const SP_MISSING = '발음 평가는 서버 설정이 필요해요. 운영자(선생님)가 Supabase SQL Editor에서 supabase_update_v11.sql을 실행하면 바로 쓸 수 있어요.';
  const SP_AI_OLD = 'AI 채점은 서버의 AI 함수를 새로 배포(v9)하면 쓸 수 있어요. 녹음 듣기와 점수 매기기는 지금도 돼요.';
  const spMsg = e => e && e.code === 'missing' ? SP_MISSING : clMsg(e);
  const spAiMsg = e => e && e.code === 'missing' ? SP_MISSING : e && (e.status === 400 || e.status === 413) && e.code !== 'bad_input' ? SP_AI_OLD : (e && e.message) || '잠시 후 다시 시도해 주세요.';
  const spCap = it => it[3] === 's' ? 10 : 4; // 녹음 최대 길이(초): 단어 4초, 문장 10초
  const spTone = v => v == null ? '' : v >= 80 ? ' good' : v >= 60 ? ' mid' : ' low';
  const spLang = it => it[2] === 'zh' ? 'zh' : 'en';
  const spItems = a => (Array.isArray(a.words) ? a.words : []).slice(0, SP_MAX).map(x => Array.isArray(x) ? x : [String(x || '')]);
  const spAvg = v => v.length ? Math.round(v.reduce((s, x) => s + x, 0) / v.length) : null;
  const spBySno = (a, b) => String(a.sno || '~').localeCompare(String(b.sno || '~'), 'ko', { numeric: true }) || String(a.name || '').localeCompare(String(b.name || ''), 'ko');
  const spTime = s => { const d = new Date(s); return !s || isNaN(d) ? '' : `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
  let SP = null; // 학생 녹음 화면 상태
  let SPT = null; // 선생님 보드 상태
  const spUrls = new Set();
  let spAudio = null, spSeq = 0;

  /* ----- 재생: 하나 또는 여러 개를 차례로 (전체 듣기) ----- */
  const spBtn = (b, on) => { b.classList.toggle('on', on); if (!b.classList.contains('sp-bi')) b.innerHTML = on ? IC.pause : IC.play; };
  function spStopAudio() {
    spSeq++; const a = spAudio; spAudio = null; if (a) { try { a.pause(); } catch (e) {} }
    document.querySelectorAll('.sp-play.on, .sp-bi.on').forEach(b => spBtn(b, false));
  }
  // url 하나 재생: 끝까지 들으면 true, 멈추거나 못 틀면 false
  const spPlayOne = url => new Promise(res => {
    const au = new Audio(url); spAudio = au; let done = false;
    const end = v => { if (done) return; done = true; if (spAudio === au) spAudio = null; res(v); };
    au.addEventListener('ended', () => end(true)); au.addEventListener('pause', () => end(au.ended));
    au.play().catch(() => { end(false); toast('이 기기에서 녹음을 재생하지 못했어요.'); });
  });
  async function spPlay(gets, btn) {
    spStopAudio(); try { window.speechSynthesis.cancel(); } catch (e) {}
    const my = ++spSeq; if (btn) spBtn(btn, true);
    for (const get of gets) {
      let url; try { url = await get(); } catch (e) { if (my === spSeq) toast(spMsg(e)); break; }
      if (my !== spSeq || !await spPlayOne(url) || my !== spSeq) break;
      await new Promise(r => setTimeout(r, 350));
    }
    if (my !== spSeq) return;
    if (btn) spBtn(btn, false);
    if (SPT && SPT.later) spTRender(); // 듣는 동안 미뤄 둔 보드 새로 그리기
  }
  const spBlobUrl = (u8, type) => { const url = URL.createObjectURL(new Blob([u8], { type: type || 'audio/mpeg' })); spUrls.add(url); return url; };
  const spB64 = u8 => { let s = ''; for (let i = 0; i < u8.length; i += 8192) s += String.fromCharCode.apply(null, u8.subarray(i, i + 8192)); return btoa(s); };
  const spUnB64 = b => { const s = atob(b), u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return u; };
  // 시트를 닫거나 다른 화면으로 가면: 녹음 중지, 마이크 끄기, 보드 새로 고침 멈춤, 재생 멈춤, blob 주소 반납
  function spEnd() {
    if (SP) { spRecStop(true); if (SP.stream) SP.stream.getTracks().forEach(t => t.stop()); if (SP.ctx) SP.ctx.close().catch(() => {}); SP = null; }
    if (SPT) { clearInterval(SPT.timer); if (SPT.q) SPT.q.stop = true; SPT = null; }
    document.body.classList.remove('sp-drag'); spStopAudio(); spUrls.forEach(u => URL.revokeObjectURL(u)); spUrls.clear();
  }

  /* ----- 라이브러리: 쓸 때만 같은 주소에서 불러와요 (lame.min.js = MP3 만들기, fflate.min.js = zip 풀기) ----- */
  const spLibP = {};
  function spLib(file, name) {
    if (window[name]) return Promise.resolve(window[name]);
    if (!spLibP[file]) spLibP[file] = new Promise((ok, no) => {
      const s = document.createElement('script'); s.src = file;
      s.addEventListener('load', () => window[name] ? ok(window[name]) : no(new Error(file)));
      s.addEventListener('error', () => { delete spLibP[file]; s.remove(); no(new Error(file)); });
      document.head.appendChild(s);
    });
    return spLibP[file];
  }

  /* ----- 소리 -> 16kHz 모노 -> 앞뒤 무음 자르기 -> MP3 (32kbps, 단어 2초 ≈ 8KB) ----- */
  // 16kHz로 바꾸기: 줄일 때는 구간 평균(잡음 줄이기), 늘릴 때는 가까운 값
  function spResample(x, rate) {
    if (rate === SP_RATE) return x;
    const n = x.length, r = rate / SP_RATE, m = Math.floor(n / r), y = new Float32Array(m);
    for (let i = 0; i < m; i++) {
      const a = Math.floor(i * r), b = Math.min(n, Math.max(a + 1, Math.floor((i + 1) * r)));
      let s = 0; for (let k = a; k < b; k++) s += x[k]; y[i] = s / (b - a);
    }
    return y;
  }
  // 20ms 단위 소리 크기로 앞뒤 무음 자르기 (앞 0.15초, 뒤 0.2초 여유). 너무 작게 녹음됐으면 키워요(최대 4배)
  function spTrim(y) {
    const m = y.length, F = 320, fr = [];
    for (let i = 0; i + F <= m; i += F) { let s = 0; for (let k = i; k < i + F; k++) s += y[k] * y[k]; fr.push(Math.sqrt(s / F)); }
    let peak = 0; fr.forEach(v => { if (v > peak) peak = v; }); if (peak < 0.006) return null;
    const th = Math.max(0.005, peak * 0.12), first = fr.findIndex(v => v >= th);
    let last = fr.length - 1; while (last > first && fr[last] < th) last--;
    const s0 = Math.max(0, (first - 8) * F), s1 = Math.min(m, (last + 11) * F), len = s1 - s0;
    if (len < SP_RATE * 0.15) return null;
    let mx = 0; for (let i = s0; i < s1; i++) mx = Math.max(mx, Math.abs(y[i]));
    const g = Math.min(4, 0.9 / (mx || 1)), out = new Float32Array(len);
    for (let i = 0; i < len; i++) out[i] = Math.max(-1, Math.min(1, y[s0 + i] * g));
    return { y: out, ms: Math.round(len / SP_RATE * 1000) };
  }
  function spPcm(chunks, rate) {
    let n = 0; chunks.forEach(c => { n += c.length; });
    const x = new Float32Array(n); let o = 0; chunks.forEach(c => { x.set(c, o); o += c.length; });
    return spTrim(spResample(x, rate));
  }
  // 16kHz 모노 -> MP3. 긴 파일은 조금씩 쉬며 만들어 화면이 멈추지 않게
  async function spMp3(y) {
    const L = await spLib('lame.min.js', 'lamejs'), enc = new L.Mp3Encoder(1, SP_RATE, SP_KBPS), out = [], B = 1152 * 16;
    const pcm = new Int16Array(y.length);
    for (let i = 0; i < y.length; i++) { const s = Math.max(-1, Math.min(1, y[i])); pcm[i] = s < 0 ? s * 0x8000 : s * 0x7fff; }
    for (let i = 0, k = 0; i < pcm.length; i += B, k++) { const b = enc.encodeBuffer(pcm.subarray(i, i + B)); if (b.length) out.push(b); if (k % 40 === 39) await new Promise(r => setTimeout(r)); }
    const f = enc.flush(); if (f.length) out.push(f);
    let n = 0; out.forEach(b => { n += b.length; });
    const u8 = new Uint8Array(n); let o = 0; out.forEach(b => { u8.set(new Uint8Array(b.buffer, b.byteOffset, b.length), o); o += b.length; });
    return u8;
  }
  // 받은 소리 파일 풀기: 16kHz로 바로 풀고(안 되면 44.1kHz로 풀어 직접 바꿔요) 채널을 섞어 모노로. 앞 3분까지만
  async function spDecode(buf) {
    const OC = window.OfflineAudioContext || window.webkitOfflineAudioContext; if (!OC) throw new Error('이 브라우저에서는 소리 파일을 읽을 수 없어요.');
    let ctx; try { ctx = new OC(1, 1, SP_RATE); } catch (e) { ctx = new OC(1, 1, 44100); }
    const ab = await new Promise((ok, no) => { const p = ctx.decodeAudioData(buf, ok, no); if (p && p.then) p.then(ok, no); });
    const n = Math.min(ab.length, Math.ceil(SP_FILE_SEC * ab.sampleRate)), ch = ab.numberOfChannels, x = new Float32Array(n);
    for (let c = 0; c < ch; c++) { const d = ab.getChannelData(c); for (let i = 0; i < n; i++) x[i] += d[i] / ch; }
    return { y: spResample(x, ab.sampleRate), sec: ab.duration };
  }
  // MP3 첫 프레임 위치와 머리글 (ID3 태그는 건너뛰어요)
  function spMp3Head(u8) {
    let p = 0; if (u8[0] === 0x49 && u8[1] === 0x44 && u8[2] === 0x33) p = 10 + (u8[6] & 127) * 2097152 + (u8[7] & 127) * 16384 + (u8[8] & 127) * 128 + (u8[9] & 127);
    return u8[p] === 255 && (u8[p + 1] & 0xe6) === 0xe2 && ((u8[p + 2] >> 2) & 3) === 2 ? { pos: p, h: u8.subarray(p, p + 4) } : null;
  }
  // 무음 MP3 프레임(같은 머리글, 내용 0): 문항 사이에 넣어요. 다시 만들지 않아 빨라요
  function spSilence(h, sec) {
    const kb = [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160][h[2] >> 4], fl = 72 * kb * 1000 / SP_RATE, n = Math.ceil(sec * SP_RATE / 576), out = new Uint8Array(fl * n);
    for (let i = 0; i < n; i++) out.set([255, h[1] | 1, h[2] & 0xfd, h[3]], i * fl);
    return out;
  }
  const spSafe = s => String(s || '').replace(/[\\/:*?"<>|\u0000-\u001f]+/g, ' ').replace(/\s+/g, ' ').trim();

  /* ----- 학생: 마이크 · 녹음 ----- */
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
  // 녹음 멈춤 -> 16kHz로 줄이고 앞뒤 무음 자르기 -> MP3 -> 바로 올리기 (drop 이면 버리기)
  function spRecStop(drop) {
    const R = SP && SP.rec; if (!R) return;
    SP.rec = null;
    try { R.src.disconnect(); R.proc.disconnect(); R.mute.disconnect(); } catch (e) {}
    R.proc.onaudioprocess = null;
    // 녹음이 끝나면 마이크를 꺼요(주소창 마이크 표시가 계속 켜져 있지 않게). 다음 녹음 때 다시 켜요
    if (SP.stream) { SP.stream.getTracks().forEach(t => t.stop()); SP.stream = null; }
    if (drop) return;
    const pcm = spPcm(R.chunks, SP.ctx.sampleRate);
    if (!pcm) { SP.note = '소리가 들리지 않았어요. 마이크 가까이에서 또렷하게 다시 읽어 주세요.'; return spDraw(); }
    spUpload(R.idx, pcm);
  }
  async function spUpload(idx, pcm) {
    const sp = SP; sp.busy = idx; sp.note = ''; spDraw();
    try {
      let u8; try { u8 = await spMp3(pcm.y); } catch (e) { throw { code: 'mp3' }; }
      const r = await Cloud.call('voca_speak_put', { p_assign: sp.a.id, p_idx: idx, p_b64: spB64(u8) });
      if (SP !== sp) return;
      const old = sp.local[idx]; if (old) { URL.revokeObjectURL(old); spUrls.delete(old); }
      sp.local[idx] = spBlobUrl(u8, 'audio/mpeg'); sp.raw[idx] = u8;
      sp.mine[idx] = Object.assign(sp.mine[idx] || {}, { idx, dur_ms: r.dur_ms, bytes: r.bytes, audio: true, t_score: null, t_note: null });
      sp.dirty = true;
    } catch (e) { if (SP !== sp) return; sp.note = e && e.code === 'mp3' ? '녹음을 MP3로 바꾸지 못했어요. 인터넷 연결을 확인하고 다시 녹음해 주세요.' : '녹음을 올리지 못했어요. ' + spMsg(e); }
    sp.busy = null; spDraw();
  }

  /* ----- 학생: 발음 평가 열기 · 녹음 화면 · 제출 완료 화면 (AI 점수는 보이지 않아요) ----- */
  async function spOpen(a) {
    spEnd();
    const items = spItems(a).filter(x => x[0]);
    if (!items.length) return say('과제에 문항이 없어요.');
    openSheet(a.title, clLoading()); const tok = sheetTok;
    let m; try { m = await Cloud.call('voca_speak_mine', { p_assign: a.id }); } catch (e) { return tok === sheetTok && clFail(e && e.code === 'missing' ? { code: 'sp_missing' } : e, 'cl-home'); }
    if (tok !== sheetTok) return;
    SP = { a, items, i: 0, mine: {}, local: {}, raw: {}, submitted: !!m.submitted, at: m.at, score: m.score, tnote: m.note || '', view: m.submitted ? 'done' : 'rec', rec: null, busy: null, note: '' };
    (m.items || []).forEach(x => { SP.mine[x.idx] = x; });
    if (!SP.submitted) { const k = items.findIndex((_, i) => !SP.mine[i]); SP.i = k < 0 ? 0 : k; }
    spDraw();
  }
  const spDone = () => SP.items.filter((_, i) => SP.mine[i]).length;
  function spDraw() {
    const sp = SP; if (!sp || !$('sheetOv').classList.contains('open')) return;
    $('sheetTitle').textContent = sp.a.title;
    if (sp.view === 'done') return spDoneDraw();
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
      ${r ? `<div class="sp-mine"><button class="sp-play" data-act="sp-play" data-i="${sp.i}" aria-label="내 녹음 듣기"${r.audio === false ? ' disabled' : ''}>${IC.play}</button><span>내 녹음 <small>${r.audio === false ? '파일 지워짐' : (r.dur_ms / 1000).toFixed(1) + '초'}</small></span>${r.t_score != null ? `<em class="sp-sc sp-t">선생님 ${esc(r.t_score)}점</em>` : ''}</div>` : ''}
      <div class="row sp-nav"><button class="btn btn-soft" data-act="sp-go" data-i="${sp.i - 1}"${sp.i && !rec ? '' : ' disabled'}>이전</button>${last
        ? `<button class="btn btn-primary" data-act="sp-submit"${n < sp.items.length || sp.busy != null || rec ? ' disabled' : ''}>${n < sp.items.length ? `${sp.items.length - n}개 더 녹음해요` : sp.submitted && !sp.dirty ? '제출 완료 보기' : sp.submitted ? '다시 제출하기' : '선생님께 제출하기'}</button>`
        : `<button class="btn btn-primary" data-act="sp-go" data-i="${sp.i + 1}"${rec ? ' disabled' : ''}>다음</button>`}</div>
      <p class="muted cl-p sp-foot">녹음은 선생님만 들을 수 있고 60일 뒤 자동으로 지워져요.</p></div>`;
  }
  function spDoneDraw() {
    const sp = SP;
    $('sheetBody').innerHTML = `<div class="sp">
      <div class="sp-sum sp-done"><i class="sp-ok">${IC.check}</i><b>제출 완료</b><span>${sp.at ? esc(spTime(sp.at)) + ' 제출 · ' : ''}${sp.items.length}문항 · 선생님께 녹음이 모였어요</span></div>
      ${sp.score != null || sp.tnote ? `<div class="sp-tbox"><small>선생님 점수</small>${sp.score != null ? `<b class="${spTone(sp.score).trim()}">${esc(sp.score)}<em>점</em></b>` : ''}${sp.tnote ? `<p>${esc(sp.tnote)}</p>` : ''}</div>`
        : '<p class="sp-wait-t">선생님이 녹음을 듣고 점수를 매기면 여기에 보여요.</p>'}
      ${sp.note ? `<p class="sp-note">${esc(sp.note)}</p>` : ''}
      <div class="sp-list">${sp.items.map((it, i) => { const r = sp.mine[i] || {}; return `<div class="sp-ri">
        <div class="sp-ri-top"><button class="sp-play" data-act="sp-play" data-i="${i}" aria-label="${i + 1}번 내 녹음 듣기"${r.idx == null || r.audio === false ? ' disabled' : ''}>${IC.play}</button>
          <div class="sp-ri-t"><b lang="${spLang(it) === 'zh' ? 'zh-CN' : 'en'}">${esc(it[0])}</b><small>${esc([it[1], r.audio === false ? '녹음 파일 지워짐' : r.dur_ms ? (r.dur_ms / 1000).toFixed(1) + '초' : ''].filter(Boolean).join(' · '))}</small></div>
          ${r.t_score != null ? `<em class="sp-sc${spTone(r.t_score)}">${esc(r.t_score)}</em>` : ''}</div>
        ${r.t_note ? `<p class="sp-tnote">선생님 · ${esc(r.t_note)}</p>` : ''}</div>`; }).join('')}</div>
      <button class="btn btn-soft btn-block" data-act="sp-save">${IC.download} 내 녹음 저장 (MP3)</button>
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
      if (!await ask('녹음 안내\n녹음은 선생님만 들을 수 있고 60일 뒤 자동으로 지워져요.\n선생님이 채점할 때 AI(Google Gemini)로 보낼 수 있어요.\n다음 화면에서 마이크 사용을 허락해 주세요.', { ok: '녹음 시작' })) return;
      try { LS.setItem(k, '1'); } catch (e) {}
    }
    if (SP !== sp) return;
    spLib('lame.min.js', 'lamejs').catch(() => {}); // MP3 만들 준비 (녹음하는 동안 받아요)
    try { await spMic(); } catch (e) { if (SP === sp) { sp.note = SP_MIC_ERR[e.code] || SP_MIC_ERR.unsupported; spDraw(); } return; }
    if (SP !== sp || sp.rec) return;
    try { window.speechSynthesis.cancel(); } catch (e) {} spStopAudio();
    try { await spRecStart(); } catch (e) { sp.note = SP_MIC_ERR.unsupported; spDraw(); }
  };
  // 내 녹음 받기 (기기에 없으면 서버에서)
  async function spMineU8(sp, i) {
    if (sp.raw[i]) return sp.raw[i];
    const r = await Cloud.call('voca_speak_audio', { p_assign: sp.a.id, p_uid: String(currentUser), p_idx: i });
    return (sp.raw[i] = spUnB64(r.b64));
  }
  ACTIONS['sp-play'] = el => {
    const sp = SP, i = +el.dataset.i; if (!sp || !sp.mine[i]) return;
    if (el.classList.contains('on')) return spStopAudio();
    spPlay([async () => sp.local[i] || (sp.local[i] = spBlobUrl(await spMineU8(sp, i), spMp3Head(sp.raw[i]) ? 'audio/mpeg' : 'audio/wav'))], el);
  };
  // 내 녹음 저장: 문항 녹음을 0.6초 무음으로 이어 붙여 '학번_이름_과제명.mp3'
  ACTIONS['sp-save'] = async el => {
    const sp = SP; if (!sp) return; el.disabled = true;
    try {
      const parts = [];
      for (let i = 0; i < sp.items.length; i++) {
        if (!sp.mine[i] || sp.mine[i].audio === false) continue;
        const u8 = await spMineU8(sp, i); if (SP !== sp) return;
        const h = spMp3Head(u8); if (!h) continue; // 예전 WAV 녹음은 빼요
        if (parts.length) parts.push(spSilence(h.h, 0.6));
        parts.push(u8.subarray(h.pos));
      }
      if (!parts.length) throw { code: 'no_rec' };
      const p = config.profile || {};
      download([p.sno, p.name || currentLabel, sp.a.title].map(spSafe).filter(Boolean).join('_').slice(0, 120) + '.mp3', new Blob(parts, { type: 'audio/mpeg' }), 'audio/mpeg');
      toast('내 녹음을 MP3 파일로 받았어요.');
    } catch (e) { toast(spMsg(e)); }
    el.disabled = false;
  };
  ACTIONS['sp-redo'] = () => { if (!SP) return; SP.view = 'rec'; SP.i = 0; SP.note = ''; spStopAudio(); spDraw(); };
  ACTIONS['sp-submit'] = async el => {
    const sp = SP; if (!sp) return;
    if (sp.submitted && !sp.dirty) { sp.view = 'done'; return spDraw(); }
    el.disabled = true;
    let r; try { r = await Cloud.call('voca_speak_submit', { p_assign: sp.a.id }); }
    catch (e) { el.disabled = false; return say(spMsg(e)); }
    if (SP !== sp) return;
    const first = !sp.submitted; sp.submitted = true; sp.dirty = false; sp.at = r.at || new Date().toISOString(); sp.view = 'done';
    if (first) { const c = clCache(); if (c.pending > 0) { c.pending--; try { LS.setItem(clKey(), JSON.stringify(c)); } catch (e) {} } }
    toast('선생님께 제출했어요.'); spStopAudio(); spDraw();
  };

  /* ----- 선생님: 발음 평가 보드 (제출 카드 · 결과 목록 · 받은 파일 채점) ----- */
  async function spResults(id) {
    spEnd();
    openSheet('발음 평가', clLoading()); const tok = sheetTok;
    let r; try { r = await Cloud.call('voca_speak_results', { p_assign: id }); } catch (e) { return tok === sheetTok && clFail(e && e.code === 'missing' ? { code: 'sp_missing' } : e, 'cl-back'); }
    if (tok !== sheetTok) return;
    const t = SPT = { id, r, v: r.v, tab: 'board', open: null, cache: {}, busy: new Set(), fresh: new Set(), seen: new Map(), q: null, files: spfLoad(id), src: 'asg', book: '', bookS: false, text: '' };
    (r.rows || []).forEach(x => { if (x.submitted) t.seen.set(x.uid, x.at); });
    spTDraw();
    t.timer = setInterval(() => spPoll(t), SP_POLL); // 10초마다 바뀐 게 있는지만 물어요
  }
  async function spPoll(t, force) {
    if (SPT !== t || (t.polling && !force)) return;
    if (!force && (document.visibilityState === 'hidden' || !$('sheetOv').classList.contains('open'))) return;
    t.polling = true;
    let r = null; try { r = await Cloud.call('voca_speak_results', { p_assign: t.id, p_since: force ? null : t.v }); } catch (e) {}
    t.polling = false;
    if (SPT !== t || !r) return;
    if (r.same) { if (t.later) spTRender(); return; }
    const neu = (r.rows || []).filter(x => x.submitted && t.seen.get(x.uid) !== x.at);
    neu.forEach(x => { t.seen.set(x.uid, x.at); t.fresh.add(x.uid); });
    if (neu.length && !force) toast(neu.length === 1 ? `${neu[0].name || '학생'} 학생이 제출했어요.` : `${neu.length}명이 새로 제출했어요.`);
    t.r = r; t.v = r.v; spTRender();
  }
  // 점수를 쓰는 중이거나 녹음을 듣는 중이면 새로 그리기를 미뤄요(끊기지 않게)
  function spTRender() {
    const t = SPT; if (!t) return;
    const a = document.activeElement;
    if (spAudio || (a && a.closest && a.closest('#sheetBody') && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName))) { t.later = true; return; }
    t.later = false; const sh = document.querySelector('.sheet'), pos = sh ? sh.scrollTop : 0;
    spTDraw(); if (sh) sh.scrollTop = pos;
  }
  // 최종 점수: 선생님 전체 점수 > (문항마다 선생님, 없으면 AI) 평균
  function spFin(x) {
    const m = x.m, f = x.f;
    if (m && m.submitted) {
      if (m.mark && m.mark.score != null) return { v: m.mark.score, by: '선생님' };
      if (m.ai_n || m.t_avg != null) return { v: m.score, by: m.t_avg != null ? (m.ai_n ? 'AI · 선생님' : '선생님') : 'AI' };
      return { v: null, by: `앱 · ${m.n}문항`, e: '채점 전' };
    }
    if (f) { const v = f.ts != null ? f.ts : spAvg((f.res || []).map(y => y.score)); return { v, by: f.ts != null ? '선생님 · 파일' : 'AI · 파일' }; }
    return { v: null, by: m && m.n ? `녹음 ${m.n}개` : '', e: '미제출' };
  }
  // 결과 목록 = 반 학생 + 받은 파일 결과. 앱으로 안 낸 학생은 학번이 같은 파일 결과를 붙여요
  function spRows(t) {
    const files = t.files.filter(f => f.st === 'done'), used = new Set(), out = [];
    (t.r.rows || []).forEach(m => {
      let f = null;
      if (!m.submitted) { f = files.find(y => !used.has(y.id) && (m.sno ? y.sno === m.sno : y.nm && y.nm === m.name)); if (f) used.add(f.id); }
      out.push({ k: 'u:' + m.uid, m, f, sno: m.sno || '', name: m.name || '' });
    });
    files.filter(f => !used.has(f.id)).forEach(f => out.push({ k: 'f:' + f.id, f, sno: f.sno || '', name: f.nm || '' }));
    return out.sort(spBySno);
  }
  function spTDraw() {
    const t = SPT; if (!t) return;
    const a = t.r.assign, rows = t.r.rows || [], items = spItems(a), sub = rows.filter(x => x.submitted), q = t.q;
    const todo = sub.filter(x => x.n > (x.ai_n || 0)).length, nf = t.files.filter(f => f.st === 'done').length;
    $('sheetTitle').textContent = a.title;
    const head = `<div class="cl-kv sp-kv"><span>발음 평가 · ${items.length}문항</span>${a.due ? `<span>${clDue(a.due)}</span>` : ''}<span>제출 <b>${sub.length}/${rows.length}</b></span>${nf ? `<span>파일 <b>${nf}</b></span>` : ''}<span class="sp-live"><i></i>10초마다 새로 고쳐요</span></div>
      <div class="sp-acts">${q ? `<button class="btn btn-primary" data-act="sp-gstop">${q.stop ? '멈추는 중...' : `AI 채점 중 ${Math.min(q.i + 1, q.list.length)}/${q.list.length} · 멈추기`}</button>`
        : `<button class="btn btn-primary" data-act="sp-gall"${todo ? '' : ' disabled'}>${IC.sparkles} ${todo ? `전체 AI 채점 (${todo}명)` : sub.length ? '모두 AI 채점했어요' : '전체 AI 채점'}</button>`}<button class="btn btn-soft" data-act="sp-csv">${IC.download} CSV</button></div>
      ${q ? `<div class="sp-prog" role="progressbar" aria-valuenow="${q.i}" aria-valuemax="${q.list.length}"><i style="width:${Math.round(q.i / q.list.length * 100)}%"></i></div>` : ''}
      <div class="seg sp-tabs"><button class="${t.tab === 'board' ? 'on' : ''}" data-act="sp-tab" data-t="board">제출 ${sub.length}</button><button class="${t.tab === 'list' ? 'on' : ''}" data-act="sp-tab" data-t="list">결과 목록</button><button class="${t.tab === 'file' ? 'on' : ''}" data-act="sp-tab" data-t="file">파일로 채점</button></div>`;
    const body = t.tab === 'list' ? spListHtml(t, items) : t.tab === 'file' ? spFileHtml(t, items) : spBoardHtml(t, items, rows);
    $('sheetBody').innerHTML = `<div class="form-stack cl sp sp-wide">${head}${body}
      <div class="row cl-foot sp-foot2"><button class="btn btn-soft" data-act="cl-back">돌아가기</button><button class="btn btn-soft cl-danger" data-act="sp-delall">녹음 파일 지우기</button><button class="btn btn-soft cl-danger" data-act="cl-adel" data-id="${a.id}">과제 삭제</button></div></div>`;
    t.fresh.clear();
  }
  function spBoardHtml(t, items, rows) {
    const sub = rows.filter(x => x.submitted).sort(spBySno), left = rows.filter(x => !x.submitted).sort(spBySno);
    return `${sub.length ? `<div class="sp-grid">${sub.map(x => spCardHtml(t, x, items)).join('')}</div>`
        : `<div class="cl-load">${MASCOT('think')}<span>아직 제출한 학생이 없어요. 학생이 앱에서 녹음해 제출하면 여기에 바로 나타나요.</span></div>`}
      ${left.length ? `<h4 class="syn-h">아직 안 낸 학생 ${left.length}명</h4><div class="cl-chips">${left.map(x => `<span>${esc(x.sno || '')} ${esc(x.name || '이름 없음')}${x.n ? ` <small>녹음 ${esc(x.n)}/${items.length}</small>` : ''}</span>`).join('')}</div>` : ''}
      <p class="muted cl-p">카드의 ▶는 전체 듣기, 숫자는 문항 하나 듣기예요. AI 채점은 선생님만 볼 수 있고, 학생에게는 선생님이 매긴 점수만 보여요. 카카오톡으로 받은 녹음은 '파일로 채점'에 넣어요.</p>`;
  }
  function spCardHtml(t, x, items) {
    const busy = t.busy.has(x.uid), all = x.n > 0 && x.ai_n >= x.n, ts = x.mark && x.mark.score != null ? x.mark.score : null, by = new Map((x.items || []).map(r => [r.idx, r]));
    return `<div class="sp-bc${t.fresh.has(x.uid) ? ' arrive' : ''}" data-uid="${esc(x.uid)}">
      <button class="sp-bc-h" data-act="sp-open" data-k="u:${esc(x.uid)}"><span class="sp-no">${esc(x.sno || '')}</span><b>${esc(x.name || '이름 없음')}</b>${ts != null ? `<em class="sp-bc-fin${spTone(ts)}"><small>선생님</small>${esc(ts)}</em>` : ''}</button>
      <small class="sp-bc-t">${esc(spTime(x.at))} 제출 · ${esc(x.n)}/${items.length}문항</small>
      <div class="sp-bc-p"><button class="sp-play" data-act="sp-pall" data-uid="${esc(x.uid)}" aria-label="${esc(x.name)} 전체 듣기">${IC.play}</button><div class="sp-bis">${items.map((_, i) => { const r = by.get(i); const v = r ? (r.t_score != null ? r.t_score : r.ai_score) : null; return `<button class="sp-bi${spTone(v)}" data-act="sp-tplay" data-uid="${esc(x.uid)}" data-i="${i}"${r && r.audio ? '' : ' disabled'} aria-label="${i + 1}번 듣기">${i + 1}</button>`; }).join('')}</div></div>
      <div class="sp-bc-f"><span class="sp-bc-sc">${x.ai_n ? `<em class="sp-sc${spTone(x.ai_avg)}">AI ${esc(x.ai_avg)}${all ? '' : ` · ${esc(x.ai_n)}/${esc(x.n)}`}</em>` : '<em class="sp-sc">AI 전</em>'}</span>
        <button class="btn btn-sm ${all ? 'btn-soft' : 'btn-primary'}" data-act="sp-grade1" data-uid="${esc(x.uid)}"${busy || t.q ? ' disabled' : ''}>${busy ? '채점 중...' : all ? '다시 채점' : 'AI 채점'}</button></div></div>`;
  }
  function spListHtml(t, items) {
    const list = spRows(t);
    if (!list.length) return '<p class="muted cl-p">아직 반에 학생이 없어요.</p>';
    return `<div class="sp-lt">${list.map(x => { const f = spFin(x), open = t.open === x.k; return `<button class="sp-lr${open ? ' on' : ''}${f.v == null ? ' dim' : ''}" data-act="sp-open" data-k="${esc(x.k)}" aria-expanded="${open}"><span class="sp-no">${esc(x.sno || '-')}</span><b>${esc(x.name || '이름 없음')}</b><small>${esc(f.by)}</small><em class="${spTone(f.v).trim()}">${f.v != null ? esc(f.v) + '점' : esc(f.e || '')}</em></button>${open ? spDetHtml(t, x, items) : ''}`; }).join('')}</div>
      <p class="muted cl-p">최종 점수 = 선생님 점수, 없으면 AI 점수 평균. 줄을 누르면 문항마다 점수 · AI가 들은 말 · 조언을 보고 점수를 고칠 수 있어요.</p>`;
  }
  // 문항 하나: 앱 녹음(ai_score, ai_detail) 또는 파일 결과(score, heard, tips)
  const spDetItem = (it, i, r, play) => { const d = (r && r.ai_detail) || r || {}, sc = r ? (r.ai_score != null ? r.ai_score : r.score) : null; return `<div class="sp-ri">
      <div class="sp-ri-top">${play || ''}<div class="sp-ri-t"><b lang="${spLang(it) === 'zh' ? 'zh-CN' : 'en'}">${i + 1}. ${esc(it[0])}</b>${it[1] ? `<small>${esc(it[1])}</small>` : ''}</div>
        <em class="sp-sc${spTone(sc)}">${sc != null ? 'AI ' + esc(sc) : r ? '채점 전' : '-'}</em></div>
      ${d.heard ? `<p class="sp-heard">AI가 들은 말 <b>${esc(d.heard)}</b></p>` : ''}${d.tips ? `<p class="sp-tip">${esc(d.tips)}</p>` : ''}
      ${Array.isArray(d.problems) && d.problems.length ? `<div class="sp-prob">${d.problems.map(y => `<span>${esc(y)}</span>`).join('')}</div>` : ''}`; };
  const spMarkHtml = (sc, note, act, key) => `<div class="sp-mark"><b>선생님 최종 점수 · 한마디</b><small>${act === 'sp-msave' ? '학생에게 보여요. 넣으면 AI 점수 대신 이 점수가 최종 점수예요.' : '이 기기에만 저장해요.'}</small>
      <div class="sp-tform"><input type="number" id="spMS" min="0" max="100" inputmode="numeric" placeholder="점수" value="${sc != null ? esc(sc) : ''}" aria-label="최종 점수"><input type="text" id="spMN" maxlength="300" placeholder="한마디 (예: 강세가 아주 좋아요)" value="${esc(note || '')}" aria-label="한마디"><button class="btn btn-sm btn-primary" data-act="${act}" ${key}>저장</button></div></div>`;
  function spDetHtml(t, x, items) {
    const m = x.m;
    if (!(m && m.submitted) && x.f) return spFileDetHtml(x.f);
    if (!m) return '';
    if (!m.n) return '<div class="sp-det"><p class="muted cl-p">아직 녹음이 없어요. 카카오톡으로 받았다면 \'파일로 채점\'에 넣어 주세요.</p></div>';
    const by = new Map((m.items || []).map(r => [r.idx, r])), all = m.ai_n >= m.n, u = esc(m.uid);
    return `<div class="sp-det">
      <div class="sp-det-h"><button class="sp-play" data-act="sp-pall" data-uid="${u}" aria-label="전체 듣기">${IC.play}</button><span>전체 듣기 <small>${m.submitted ? esc(spTime(m.at)) + ' 제출' : '아직 제출 전'} · 녹음 ${esc(m.n)}/${items.length}</small></span></div>
      <div class="sp-list">${items.map((it, i) => { const r = by.get(i); return spDetItem(it, i, r, `<button class="sp-play" data-act="sp-tplay" data-uid="${u}" data-i="${i}" aria-label="${i + 1}번 녹음 듣기"${r && r.audio ? '' : ' disabled'}>${IC.play}</button>`)
        + (r ? `<div class="sp-tform"><input type="number" id="spT${i}" min="0" max="100" inputmode="numeric" placeholder="점수" value="${r.t_score != null ? esc(r.t_score) : ''}" aria-label="${i + 1}번 선생님 점수"><input type="text" id="spN${i}" maxlength="200" placeholder="문항 메모 (학생에게 보여요)" value="${esc(r.t_note || '')}" aria-label="${i + 1}번 메모"><button class="btn btn-sm btn-soft" data-act="sp-tsave" data-uid="${u}" data-i="${i}">저장</button></div>` : '') + '</div>'; }).join('')}</div>
      ${spMarkHtml(m.mark && m.mark.score, m.mark && m.mark.note, 'sp-msave', `data-uid="${u}"`)}
      <div class="row"><button class="btn btn-soft" data-act="sp-grade1" data-uid="${u}"${t.busy.has(m.uid) || t.q ? ' disabled' : ''}>${IC.sparkles} ${t.busy.has(m.uid) ? '채점 중...' : all ? 'AI 다시 채점' : 'AI 채점'}</button><button class="btn btn-soft cl-danger" data-act="sp-del1" data-uid="${u}"${(m.items || []).some(r => r.audio) ? '' : ' disabled'}>녹음 파일 지우기</button></div></div>`;
  }
  function spFileDetHtml(f) {
    const res = new Map((f.res || []).map(r => [r.idx, r]));
    return `<div class="sp-det"><p class="muted cl-p sp-fsrc">파일 <b>${esc(f.file)}</b> · ${esc(spTime(f.at))} 채점${f.long ? ' · 앞 3분만' : ''} (파일은 저장하지 않아요)</p>
      <div class="sp-list">${(f.q || []).map((txt, i) => spDetItem([txt, '', /[㐀-鿿]/.test(txt) ? 'zh' : 'en'], i, res.get(i) || null, '') + '</div>').join('')}</div>
      ${spMarkHtml(f.ts, f.tn, 'sp-fmsave', `data-f="${esc(f.id)}"`)}
      <div class="row"><button class="btn btn-soft cl-danger" data-act="sp-fdel" data-f="${esc(f.id)}">이 결과 지우기</button></div></div>`;
  }
  ACTIONS['sp-tab'] = el => { if (!SPT) return; spStopAudio(); SPT.tab = el.dataset.t; spTDraw(); };
  ACTIONS['sp-open'] = el => {
    const t = SPT; if (!t) return; spStopAudio();
    t.open = t.tab === 'list' && t.open === el.dataset.k ? null : el.dataset.k; t.tab = 'list'; spTDraw();
    const r = document.querySelector(`.sp-lr[data-k="${CSS.escape(el.dataset.k)}"]`); if (r) r.scrollIntoView({ block: 'nearest' });
  };
  // 선생님: 녹음 받기 (다시 녹음하면 주소가 바뀌게 녹음 시각까지 붙여 기억해요)
  async function spTUrl(t, uid, i) {
    const m = (t.r.rows || []).find(x => x.uid === uid), r = m && (m.items || []).find(x => x.idx === i), k = uid + ':' + i + ':' + (r && r.at);
    if (t.cache[k]) return t.cache[k];
    const x = await Cloud.call('voca_speak_audio', { p_assign: t.id, p_uid: uid, p_idx: i });
    return (t.cache[k] = spBlobUrl(spUnB64(x.b64), x.type || 'audio/mpeg'));
  }
  ACTIONS['sp-tplay'] = el => { const t = SPT; if (!t) return; if (el.classList.contains('on')) return spStopAudio(); spPlay([() => spTUrl(t, el.dataset.uid, +el.dataset.i)], el); };
  ACTIONS['sp-pall'] = el => {
    const t = SPT, uid = el.dataset.uid, m = t && (t.r.rows || []).find(x => x.uid === uid); if (!m) return;
    if (el.classList.contains('on')) return spStopAudio();
    const idx = (m.items || []).filter(r => r.audio).map(r => r.idx).sort((a, b) => a - b);
    if (!idx.length) return toast('들을 녹음이 없어요.');
    spPlay(idx.map(i => () => spTUrl(t, uid, i)), el);
  };
  async function spAiOne(t, uid, all) {
    t.busy.add(uid); spTRender();
    try { return await Cloud.ai(undefined, { task: 'pron', assign: t.id, student: uid, all: !!all }, 80000); }
    finally { t.busy.delete(uid); }
  }
  ACTIONS['sp-grade1'] = async el => {
    const t = SPT, uid = el.dataset.uid, x = t && (t.r.rows || []).find(y => y.uid === uid); if (!x || t.busy.has(uid) || t.q) return;
    const all = x.n > 0 && x.ai_n >= x.n;
    if (all && !await ask(`${x.name || '이 학생'} 학생의 녹음을 AI로 다시 채점할까요?\n선생님이 넣은 점수는 그대로 남아요. AI 1회를 써요.`, { ok: '다시 채점' })) return;
    try { await spAiOne(t, uid, all); if (SPT === t) toast(`${x.name || '학생'} 학생을 AI로 채점했어요.`); }
    catch (e) { if (SPT === t) say('AI 채점을 하지 못했어요. ' + spAiMsg(e)); }
    if (SPT === t) await spPoll(t, true);
  };
  // 전체 AI 채점: 채점 안 된 문항이 있는 제출 학생을 학번 순서로 한 명씩 (학생마다 Gemini 1번 = AI 1회)
  ACTIONS['sp-gall'] = async () => {
    const t = SPT; if (!t || t.q) return;
    const list = (t.r.rows || []).filter(x => x.submitted && x.n > (x.ai_n || 0)).sort(spBySno);
    if (!list.length) return toast('채점할 녹음이 없어요.');
    if (!await ask(`제출한 학생 ${list.length}명의 녹음을 AI로 채점할까요?\n학생마다 AI 1회씩 모두 ${list.length}회를 써요(선생님 하루 200회까지). 한 명에 10~30초쯤 걸려요. 이 화면을 열어 두세요.`, { ok: '채점하기' }) || SPT !== t || t.q) return;
    const q = t.q = { list, i: 0, ok: 0, fail: 0, stop: false }; spTRender();
    for (const x of list) {
      if (q.stop || SPT !== t) break;
      try { await spAiOne(t, x.uid, false); q.ok++; }
      catch (e) {
        if (SPT !== t) return;
        q.fail++;
        if (e && (e.status === 429 || e.status === 403 || e.status === 400 || e.status === 413 || e.code === 'missing')) { q.stop = true; say('AI 채점을 멈췄어요. ' + spAiMsg(e)); }
      }
      q.i++; if (SPT === t) await spPoll(t, true);
    }
    if (SPT !== t) return;
    t.q = null; spTRender();
    toast(q.fail ? `${q.ok}명을 채점했어요. ${q.fail}명은 하지 못했어요. 다시 누르면 남은 학생만 채점해요.` : `${q.ok}명을 AI로 채점했어요.`);
  };
  ACTIONS['sp-gstop'] = () => { if (SPT && SPT.q && !SPT.q.stop) { SPT.q.stop = true; toast('지금 학생까지만 채점하고 멈춰요.'); spTRender(); } };
  ACTIONS['sp-tsave'] = async el => {
    const t = SPT; if (!t) return;
    const i = +el.dataset.i, raw = (($('spT' + i) || {}).value || '').trim(), note = (($('spN' + i) || {}).value || '').trim();
    const sc = raw === '' ? null : Math.round(+raw);
    if (sc != null && !(sc >= 0 && sc <= 100)) return toast('점수는 0부터 100까지 적어 주세요.');
    el.disabled = true;
    try { await Cloud.call('voca_speak_teacher', { p_assign: t.id, p_uid: el.dataset.uid, p_idx: i, p_score: sc, p_note: note }); toast('문항 점수를 저장했어요.'); el.blur(); if (SPT === t) await spPoll(t, true); }
    catch (e) { el.disabled = false; say(spMsg(e)); }
  };
  ACTIONS['sp-msave'] = async el => {
    const t = SPT; if (!t) return;
    const raw = (($('spMS') || {}).value || '').trim(), note = (($('spMN') || {}).value || '').trim(), sc = raw === '' ? null : Math.round(+raw);
    if (sc != null && !(sc >= 0 && sc <= 100)) return toast('점수는 0부터 100까지 적어 주세요.');
    el.disabled = true;
    try { await Cloud.call('voca_speak_mark', { p_assign: t.id, p_uid: el.dataset.uid, p_score: sc, p_note: note }); toast(sc == null && !note ? '최종 점수를 지웠어요.' : '최종 점수를 저장했어요. 학생에게 보여요.'); el.blur(); if (SPT === t) await spPoll(t, true); }
    catch (e) { el.disabled = false; say(spMsg(e)); }
  };
  ACTIONS['sp-del1'] = async el => {
    const t = SPT, m = t && (t.r.rows || []).find(x => x.uid === el.dataset.uid); if (!m) return;
    if (!await ask(`${m.name || '이 학생'} 학생의 녹음 파일을 지울까요?\n점수와 AI가 들은 말은 남아요. 지운 녹음은 되돌릴 수 없어요.`, { ok: '지우기', danger: true })) return;
    try { const r = await Cloud.call('voca_speak_delete', { p_assign: t.id, p_uid: m.uid }); toast(`녹음 ${r.n}개를 지웠어요.`); if (SPT === t) await spPoll(t, true); } catch (e) { say(spMsg(e)); }
  };
  ACTIONS['sp-delall'] = async () => {
    const t = SPT; if (!t) return;
    if (!await ask(`'${t.r.assign.title}' 과제의 녹음 파일을 모두 지울까요?\n점수와 AI가 들은 말은 남아요. 지운 녹음은 되돌릴 수 없어요. (녹음은 60일이 지나면 자동으로도 지워져요)`, { ok: '모두 지우기', danger: true })) return;
    try { const r = await Cloud.call('voca_speak_delete', { p_assign: t.id, p_uid: null }); toast(`녹음 ${r.n}개를 지웠어요.`); if (SPT === t) await spPoll(t, true); } catch (e) { say(spMsg(e)); }
  };
  // 이 과제 결과 엑셀(CSV): 한 줄에 학생 한 명, 학번 순서. 앱 제출과 받은 파일 결과를 함께
  ACTIONS['sp-csv'] = () => {
    const t = SPT; if (!t) return;
    const a = t.r.assign, items = spItems(a);
    const q = x => { const s = String(x == null ? '' : x); return /[",\n]/.test(s) || /^[=+\-@\t\r]/.test(s) ? `"${s.replace(/^([=+\-@\t\r])/, "'$1").replace(/"/g, '""')}"` : s; };
    const head = ['학번', '이름', '출처', '제출 시각', '녹음', 'AI 평균', '선생님 점수', '최종 점수', '선생님 한마디'].concat(items.map((it, i) => `${i + 1}. ${String(it[0]).slice(0, 40)}`));
    const rows = spRows(t).map(x => {
      const m = x.m, f = x.f, fin = spFin(x);
      if (m && m.submitted) { const by = new Map((m.items || []).map(r => [r.idx, r])); return [x.sno, x.name, '앱', spTime(m.at), `${m.n}/${items.length}`, m.ai_n ? m.ai_avg : '', m.mark && m.mark.score != null ? m.mark.score : m.t_avg != null ? m.t_avg : '', fin.v != null ? fin.v : '', (m.mark && m.mark.note) || ''].concat(items.map((_, i) => { const r = by.get(i); return r ? (r.t_score != null ? r.t_score : r.ai_score != null ? r.ai_score : '') : ''; })); }
      if (f) { const res = new Map((f.res || []).map(r => [r.idx, r])); return [x.sno, x.name, '파일 ' + f.file, spTime(f.at), '', spAvg((f.res || []).map(r => r.score)), f.ts != null ? f.ts : '', fin.v != null ? fin.v : '', f.tn || ''].concat(items.map((_, i) => res.has(i) ? res.get(i).score : '')); }
      return [x.sno, x.name, '미제출', '', m && m.n ? `${m.n}/${items.length}` : '', '', '', '', ''].concat(items.map(() => ''));
    });
    download(`${spSafe(a.title)}_발음평가_${dayKey()}.csv`, '﻿' + [head].concat(rows).map(r => r.map(q).join(',')).join('\r\n'), 'text/csv;charset=utf-8');
    toast('엑셀에서 열 수 있는 파일로 받았어요.');
  };

  /* ----- 선생님: 받은 녹음 파일 채점 (카카오톡 등). 브라우저에서 16kHz MP3로 바꿔 AI 함수로만 보내고 저장하지 않아요 ----- */
  const SPF_EXT = /\.(m4a|mp3|wav|aac|ogg|oga|opus|webm|mp4|3gp|flac)$/i, SPF_MAX = 60;
  const SPF_ACCEPT = 'audio/*,.m4a,.mp3,.wav,.aac,.ogg,.opus,.webm,.zip,application/zip';
  const spfKey = id => `vocapro_spf:${currentUser}:${id}`;
  const spfLoad = id => { const v = loadJson(spfKey(id)); return (Array.isArray(v) ? v : []).filter(f => f && f.id && Array.isArray(f.res)).map(f => Object.assign(f, { st: 'done' })); };
  function spfSave(t) { try { LS.setItem(spfKey(t.id), JSON.stringify(t.files.filter(f => f.st === 'done').map(({ id, file, sno, nm, res, q, at, ts, tn, long }) => ({ id, file, sno, nm, res, q, at, ts, tn, long })))); } catch (e) {} }
  // 파일 이름에서 학번(5자리)과 이름(한글 2~4자): 30211_김주원_발음.m4a, 30211 김주원.mp3, 김주원_30211.wav, 녹음30211김주원.m4a
  const SPF_SKIP = /^(녹음|음성|파일|발음|평가|발음평가|수행|수행평가|과제|제출|영어|중국어|카카오톡|카톡|보이스|메모|음성메모|녹음본|녹음파일|새로운|사본|복사본|통화|최종|단어|문장|읽기|학년|학번|이름)$/;
  function spfParse(fn) {
    const b = String(fn || '').normalize('NFC').replace(/^.*[\\/]/, '').replace(/\.[^.]+$/, '');
    const sno = (b.match(/(?:^|\D)(\d{5})(?!\d)/) || [])[1] || '';
    const name = (b.replace(/\d+/g, ' ').match(/[가-힣]{2,4}/g) || []).find(w => !SPF_SKIP.test(w)) || '';
    return { sno, name };
  }
  // zip 안 파일 이름: UTF-8 표시가 없으면(윈도우 기본 압축) 한국어 윈도우 글자(CP949)로 다시 읽어요
  function spfZipName(n) {
    if (!/[\u0080-ÿ]/.test(n) || /[^\u0000-ÿ]/.test(n)) return n;
    const b = Uint8Array.from(n, c => c.charCodeAt(0));
    try { return new TextDecoder('utf-8', { fatal: true }).decode(b); } catch (e) { try { return new TextDecoder('euc-kr').decode(b); } catch (x) { return n; } }
  }
  async function spfUnzip(file) {
    const ff = await spLib('fflate.min.js', 'fflate'), u8 = new Uint8Array(await file.arrayBuffer());
    const out = ff.unzipSync(u8, { filter: f => !/(^|\/)(__MACOSX|\.)/.test(f.name) && SPF_EXT.test(spfZipName(f.name)) && f.originalSize <= 60 << 20 });
    return Object.keys(out).map(n => ({ file: spfZipName(n).replace(/^.*\//, ''), data: out[n] }));
  }
  let spfN = 0;
  async function spfAdd(list) {
    const t = SPT; if (!t || !list.length) return;
    let add = [], skip = 0, bad = 0;
    for (const fl of list) {
      if (/\.zip$/i.test(fl.name) || /zip/.test(fl.type)) {
        if (fl.size > 300 << 20) { skip++; continue; }
        try { add = add.concat(await spfUnzip(fl)); } catch (e) { bad++; }
      } else if (SPF_EXT.test(fl.name) || /^audio\//.test(fl.type)) { if (fl.size > 60 << 20) skip++; else add.push({ file: fl.name, data: fl }); }
      else skip++;
    }
    if (SPT !== t) return;
    const room = Math.max(0, SPF_MAX - t.files.filter(f => f.st !== 'done').length); if (add.length > room) { skip += add.length - room; add = add.slice(0, room); }
    add.forEach(x => { const p = spfParse(x.file); t.files.push({ id: 'f' + Date.now().toString(36) + (++spfN), file: String(x.file).normalize('NFC'), data: x.data, sno: p.sno, nm: p.name, st: 'wait' }); });
    t.tab = 'file'; spTDraw();
    toast(add.length ? `파일 ${add.length}개를 넣었어요.${skip ? ` ${skip}개는 소리 파일이 아니거나 너무 커서 뺐어요.` : ''}` : bad ? 'zip 파일을 풀지 못했어요.' : '넣을 수 있는 소리 파일이 없어요. m4a · mp3 · wav · zip 파일을 넣어 주세요.');
  }
  // 채점할 문장: 과제 문항(기본) · 단어장 · 직접 입력
  function spfItems(t) {
    const zh = s => /[㐀-鿿]/.test(s);
    if (t.src === 'text') return t.text.split(/\r?\n/).map(s => s.trim()).filter(Boolean).slice(0, SP_MAX).map(s => ({ text: s.slice(0, 200), lang: zh(s) ? 'zh' : 'en', kind: (zh(s) ? s.length > 6 : /\s/.test(s)) ? 's' : 'w' }));
    if (t.src === 'book') { const c = findBook(t.book); return c ? c.words.slice(0, SP_MAX).map(w => t.bookS && w.example ? { text: w.example.slice(0, 200), lang: zh(w.example) ? 'zh' : 'en', kind: 's' } : { text: w.word.slice(0, 200), lang: isHanWord(w.word) ? 'zh' : 'en', kind: 'w' }) : []; }
    return spItems(t.r.assign).filter(it => it[0]).map(it => ({ text: String(it[0]).slice(0, 200), lang: spLang(it), kind: it[3] === 's' ? 's' : 'w' }));
  }
  const spfSt = f => f.st === 'done' ? `<em class="sp-sc${spTone(f.ts != null ? f.ts : spAvg((f.res || []).map(r => r.score)))}">${esc(f.ts != null ? f.ts : spAvg((f.res || []).map(r => r.score)))}점</em>`
    : f.st === 'err' ? `<small class="sp-ferr">${esc(f.msg || '실패')}</small>` : f.st === 'read' ? '<small>MP3로 바꾸는 중</small>' : f.st === 'grade' ? '<small class="sp-fgo">AI 채점 중</small>' : '<small>대기</small>';
  function spfSet(f, st) { f.st = st; const el = $('spfS' + f.id); if (el) el.innerHTML = spfSt(f); }
  function spFileHtml(t) {
    const q = spfItems(t), w = t.files, wait = w.filter(f => f.st === 'wait' || f.st === 'err').length, books = categories.filter(c => c.words.length);
    if (t.src === 'book' && !findBook(t.book) && books[0]) t.book = books[0].id;
    return `<div class="sp-drop${w.length ? ' has' : ''}" id="spDrop" role="button" tabindex="0" data-act="spf-open"><i>${IC.upload}</i><span><b><span class="sp-pc">녹음 파일을 여기에 끌어 놓거나 눌러서 고르세요</span><span class="sp-touch">눌러서 녹음 파일을 고르세요</span></b>
        <small>m4a · mp3 · wav · aac · ogg · webm · zip을 여러 개 한 번에 넣을 수 있어요. 카카오톡으로 받은 녹음도 돼요. 파일은 서버에 저장하지 않고 채점에만 써요.</small></span></div>
      <input type="file" id="spfIn" multiple accept="${SPF_ACCEPT}" data-change="spf-pick" hidden>
      <h4 class="syn-h">학생이 읽은 내용 (채점 기준)</h4>
      <div class="seg" id="spfSrc"><button class="${t.src === 'asg' ? 'on' : ''}" data-act="spf-src" data-v="asg">과제 문항</button><button class="${t.src === 'book' ? 'on' : ''}" data-act="spf-src" data-v="book">단어장</button><button class="${t.src === 'text' ? 'on' : ''}" data-act="spf-src" data-v="text">직접 입력</button></div>
      ${t.src === 'book' ? (books.length ? `<div class="sp-frow"><select data-change="spf-book" aria-label="단어장">${books.map(c => `<option value="${esc(c.id)}"${c.id === t.book ? ' selected' : ''}>${esc(c.name)} (${c.words.length}개)</option>`).join('')}</select><div class="seg"><button class="${t.bookS ? '' : 'on'}" data-act="spf-bs" data-v="w">단어</button><button class="${t.bookS ? 'on' : ''}" data-act="spf-bs" data-v="s">예문</button></div></div>` : '<p class="muted cl-p">단어가 있는 단어장이 없어요.</p>') : ''}
      ${t.src === 'text' ? `<textarea id="spfText" rows="5" maxlength="4000" data-input="spf-text" placeholder="학생이 읽은 순서대로 한 줄에 하나씩 (20줄까지)&#10;예) I eat an apple every day.">${esc(t.text)}</textarea>` : ''}
      <p class="sp-fq" id="spfQ">${spfQHtml(q)}</p>
      ${w.length ? `<h4 class="syn-h">파일 ${w.length}개</h4><div class="sp-ft">${w.map(f => `<div class="sp-fr" id="spf${esc(f.id)}"><span class="sp-fn" title="${esc(f.file)}">${esc(f.file)}</span>
          <input type="text" inputmode="numeric" maxlength="10" placeholder="학번" value="${esc(f.sno || '')}" data-input="spf-sno" data-f="${esc(f.id)}" aria-label="학번"><input type="text" maxlength="20" placeholder="이름" value="${esc(f.nm || '')}" data-input="spf-nm" data-f="${esc(f.id)}" aria-label="이름">
          <span class="sp-fs" id="spfS${esc(f.id)}">${spfSt(f)}</span><button class="icon-btn sp-fx" data-act="spf-x" data-f="${esc(f.id)}" aria-label="빼기">${IC.x}</button></div>`).join('')}</div>
        <button class="btn btn-primary btn-block" data-act="spf-go"${wait && q.length && !t.frun ? '' : ' disabled'}>${IC.sparkles} ${t.frun ? '채점 중...' : wait ? `파일 ${wait}개 AI 채점` : '모두 채점했어요'}</button>
        <p class="muted cl-p">파일 하나 = AI 1회(선생님 하루 200회까지), 한 파일 3분까지. 학번 · 이름을 못 찾은 파일은 칸에 적어 주세요. 결과는 '결과 목록'과 CSV에 앱 제출과 함께 나오고 이 기기에 저장돼요.</p>` : ''}`;
  }
  const spfQHtml = q => q.length ? `<b>${q.length}문항</b> ${q.slice(0, 6).map(x => esc(x.text)).join(' · ')}${q.length > 6 ? ' …' : ''}` : '채점할 문장을 넣어 주세요.';
  ACTIONS['spf-open'] = () => { const i = $('spfIn'); if (i) i.click(); };
  ON.change['spf-pick'] = el => { const fs = [...(el.files || [])]; el.value = ''; spfAdd(fs); };
  ACTIONS['spf-src'] = el => { if (!SPT) return; SPT.src = el.dataset.v; spTDraw(); };
  ACTIONS['spf-bs'] = el => { if (!SPT) return; SPT.bookS = el.dataset.v === 's'; spTDraw(); };
  ON.change['spf-book'] = el => { if (!SPT) return; SPT.book = el.value; spTDraw(); };
  ON.input['spf-text'] = el => { if (!SPT) return; SPT.text = el.value; const q = $('spfQ'); if (q) q.innerHTML = spfQHtml(spfItems(SPT)); };
  const spfOf = el => SPT && SPT.files.find(f => f.id === el.dataset.f);
  ON.input['spf-sno'] = el => { const f = spfOf(el); if (f) { f.sno = el.value.trim(); if (f.st === 'done') spfSave(SPT); } };
  ON.input['spf-nm'] = el => { const f = spfOf(el); if (f) { f.nm = el.value.trim(); if (f.st === 'done') spfSave(SPT); } };
  ACTIONS['spf-x'] = el => { const t = SPT, f = spfOf(el); if (!f || f.st === 'read' || f.st === 'grade') return; t.files = t.files.filter(x => x !== f); spfSave(t); spTDraw(); };
  ACTIONS['sp-fdel'] = async el => {
    const t = SPT, f = spfOf(el); if (!f) return;
    if (!await ask(`'${f.file}' 채점 결과를 지울까요?`, { ok: '지우기', danger: true })) return;
    t.files = t.files.filter(x => x !== f); t.open = null; spfSave(t); spTDraw();
  };
  ACTIONS['sp-fmsave'] = el => {
    const t = SPT, f = spfOf(el); if (!f) return;
    const raw = (($('spMS') || {}).value || '').trim(), sc = raw === '' ? null : Math.round(+raw);
    if (sc != null && !(sc >= 0 && sc <= 100)) return toast('점수는 0부터 100까지 적어 주세요.');
    f.ts = sc; f.tn = (($('spMN') || {}).value || '').trim().slice(0, 300); spfSave(t); el.blur(); toast('최종 점수를 저장했어요(이 기기).'); spTDraw();
  };
  ACTIONS['spf-go'] = async () => {
    const t = SPT; if (!t || t.frun) return;
    const q = spfItems(t); if (!q.length) return toast('채점할 문장을 넣어 주세요.');
    const list = t.files.filter(f => f.st === 'wait' || f.st === 'err'); if (!list.length) return;
    if (list.length > 1 && (!await ask(`파일 ${list.length}개를 AI로 채점할까요?\n파일마다 AI 1회씩 모두 ${list.length}회를 써요(선생님 하루 200회까지). 이 화면을 열어 두세요.`, { ok: '채점하기' }) || SPT !== t || t.frun)) return;
    t.frun = true; spTDraw();
    for (const f of list) {
      if (SPT !== t) return;
      if (!f.data) { f.msg = '파일을 다시 넣어 주세요.'; spfSet(f, 'err'); continue; }
      try {
        spfSet(f, 'read');
        let d; try { const buf = f.data instanceof Uint8Array ? f.data.slice().buffer : await f.data.arrayBuffer(); d = await spDecode(buf); } catch (e) { throw { msg: '이 파일은 읽지 못했어요' }; }
        const pcm = spTrim(d.y); if (!pcm) throw { msg: '소리가 거의 없어요' };
        let u8; try { u8 = await spMp3(pcm.y); } catch (e) { throw { msg: 'MP3로 바꾸지 못했어요' }; }
        if (SPT !== t) return;
        spfSet(f, 'grade');
        const j = JSON.parse(await Cloud.ai(undefined, { task: 'pron', assign: t.id, file: spB64(u8), items: q }, 90000));
        if (!Array.isArray(j.items) || !j.items.length) throw { msg: 'AI가 채점하지 못했어요' };
        Object.assign(f, { res: j.items, q: q.map(x => x.text), at: Date.now(), long: d.sec > SP_FILE_SEC, kb: Math.round(u8.length / 1024) }); delete f.data;
        spfSet(f, 'done'); spfSave(t);
      } catch (e) {
        if (SPT !== t) return;
        f.msg = e && e.msg ? e.msg : spAiMsg(e); spfSet(f, 'err');
        if (e && (e.status === 429 || e.status === 403 || e.status === 400 || e.status === 413 || e.code === 'missing')) { say('파일 채점을 멈췄어요. ' + spAiMsg(e)); break; }
      }
    }
    if (SPT !== t) return;
    t.frun = false; spTRender();
  };
  // 끌어 놓기: 보드가 열려 있으면 시트 어디에 놓아도 '파일로 채점'에 들어가요
  const spDragOk = e => SPT && $('sheetOv').classList.contains('open') && e.dataTransfer && [...(e.dataTransfer.types || [])].includes('Files');
  document.addEventListener('dragover', e => { if (!spDragOk(e)) return; e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; document.body.classList.add('sp-drag'); });
  document.addEventListener('dragleave', e => { if (!e.relatedTarget) document.body.classList.remove('sp-drag'); });
  document.addEventListener('drop', e => { if (!spDragOk(e)) return; e.preventDefault(); document.body.classList.remove('sp-drag'); spfAdd([...e.dataTransfer.files]); });

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

