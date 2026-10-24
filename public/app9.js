  /* =========================================================
   * TTS
   * ======================================================= */
  // 목소리는 기기마다 늦게 들어와요(voiceschanged). 한 번 모아 두고, 언어마다 고른 목소리를 써요.
  // 뜻(한국어)은 단어를 읽은 목소리와 같은 회사·같은 성별 목소리를 골라서 목소리가 확 바뀌지 않게 해요.
  let VOICES = [];
  const vLang = v => String(v.lang || '').toLowerCase().replace('_', '-');
  const vId = v => v.voiceURI || v.name;
  function loadVoices() { try { const v = window.speechSynthesis.getVoices(); if (v && v.length) VOICES = v; } catch (e) {} return VOICES; }
  if ('speechSynthesis' in window) {
    loadVoices();
    try { window.speechSynthesis.addEventListener('voiceschanged', () => { loadVoices(); if ($('ttsBox') && curTab === 'tabSettings') ttsUI(); }); } catch (e) {}
  }
  const VQ = /natural|neural|online|google|siri|premium|enhanced|multilingual/i;
  const VF = /samantha|aria|jenny|ava\b|allison|zira|emma|michelle|susan|karen|moira|tessa|serena|kate|victoria|sunhi|sun-hi|yuna|heami|seoyeon|jimin|soonbok|seohyeon|xiaoxiao|xiaoyi|xiaohan|xiaomo|xiaochen|tingting|ting-ting|huihui|yaoyao|lili|meijia|sinji|female|여성|google/i;
  const VM = /daniel|alex\b|guy\b|davis|andrew|brian|christopher|eric\b|roger|steffan|fred\b|tom\b|aaron|arthur|ryan|injoon|hyunsu|bongjin|gookmin|yunxi|yunjian|yunyang|yunze|kangkang|liang|male|남성/i;
  const VJUNK = /novelty|whisper|bells|bad news|bahh|boing|bubbles|cellos|jester|organ|superstar|trinoids|wobble|zarvox|albert|grandma|grandpa|eddy|flo\b|reed|rocko|sandy|shelley|good news|hysterical|deranged|pipe/i;
  const vGender = v => !v ? '' : VM.test(v.name) ? 'm' : VF.test(v.name) ? 'f' : '';
  const vVendor = v => /google/i.test(v.name) ? 'g' : /microsoft/i.test(v.name) ? 'ms' : /siri|com\.apple/i.test(v.name + ' ' + v.voiceURI) ? 'a' : v.localService ? 'local' : 'net';
  const vFam = lang => String(lang || '').slice(0, 2).toLowerCase();
  function voicesOf(fam) {
    const ok = fam === 'zh' ? v => /^(zh|cmn|yue)/.test(vLang(v)) : v => vLang(v).startsWith(fam);
    return loadVoices().filter(ok);
  }
  function voiceFor(lang, ref) {
    try {
      const L2 = String(lang || '').toLowerCase(), fam = vFam(L2), list = voicesOf(fam), pick = config.voice && config.voice[fam];
      if (pick) { const v = list.find(x => vId(x) === pick); if (v) return v; }
      const match = config.matchVoice !== false;
      // 여러 언어를 읽는 목소리(예: Microsoft …Multilingual)면 뜻도 같은 목소리로 읽어요.
      if (fam === 'ko' && ref && match && /multilingual/i.test(ref.name)) return ref;
      let best = null, bs = -1e9;
      for (const v of list) {
        let sc = 0;
        if (vLang(v) === L2) sc += 6; else if (fam === 'zh' && /^zh-(hans|cn)|^cmn/.test(vLang(v))) sc += 5;
        if (VQ.test(v.name)) sc += 3;
        if (VJUNK.test(v.name)) sc -= 30;
        if (ref && match) {
          if (vVendor(v) === vVendor(ref)) sc += 4;
          const g = vGender(ref), gv = vGender(v);
          if (g && gv === g) sc += 5; else if (g && gv && gv !== g) sc -= 5;
          if (!!v.localService === !!ref.localService) sc += 1;
        } else if (vGender(v) === 'f') sc += 1;
        if (v.default) sc += .5;
        if (sc > bs) { bs = sc; best = v; }
      }
      return best;
    } catch (e) { return null; }
  }
  const clampN = (x, lo, hi, d) => { x = parseFloat(x); return isFinite(x) ? Math.min(hi, Math.max(lo, x)) : d; };
  const ttsRateFor = lang => vFam(lang) === 'ko' ? clampN(config.koRate, .5, 2, 1) : clampN(config.ttsRate, .5, 2, .9);
  // 이 기기에 그 언어 목소리가 없을 때 한 번만 알려 줘요(중국어 목소리가 없는 컴퓨터 · 폰이 많아요)
  const ttsWarned = {};
  function ttsHelp(fam) {
    const ua = navigator.userAgent, nm = fam === 'zh' ? '중국어' : fam === 'ko' ? '한국어' : '영어';
    return /iPhone|iPad|Macintosh/.test(ua) ? `설정 > 손쉬운 사용 > 읽기 및 말하기 > 음성에서 ${nm} 음성을 받아 주세요.`
      : /SamsungBrowser|SM-[A-Z0-9]/.test(ua) ? `삼성 폰: 설정 > 일반 > 텍스트 음성 변환(TTS)에서 기본 엔진을 'Google 음성 인식 및 합성'으로 바꾸고, 옆 톱니바퀴 > 음성 데이터 설치에서 ${nm}를 받아 주세요(삼성 TTS 엔진을 쓰면 그 엔진 설정에서 ${nm} 음성을 받아요). 삼성 인터넷보다 Chrome으로 열면 잘 돼요.`
      : /Android/.test(ua) ? `휴대폰 설정에서 '텍스트 음성 변환(TTS)'을 찾아 기본 엔진을 Google로 바꾸고, ${nm} 음성 데이터를 설치해 주세요. Chrome으로 열면 잘 돼요.`
      : /Windows/.test(ua) ? `Chrome이나 Edge 브라우저로 열거나, Windows 설정 > 시간 및 언어 > 음성 > 음성 추가에서 '${nm}${fam === 'zh' ? '(간체, 중국)' : ''}'를 설치해 주세요.`
      : `기기 설정에서 ${nm} 음성을 설치하거나 Chrome · Edge 브라우저를 써 주세요.`;
  }
  // 소리 버튼을 직접 눌렀을 때만 설치 방법 창을 띄워요. 저절로 읽어 주다 실패하면(카드 넘김 · 단어 추가 등) 하던 일을 막지 않게 짧은 알림만 한 번
  function ttsNoVoice(fam, ask) {
    const nm = fam === 'zh' ? '중국어' : fam === 'ko' ? '한국어' : '영어';
    if (!ask) { if (!ttsWarned[fam] && !ttsWarned[fam + ':t']) { ttsWarned[fam + ':t'] = true; toast(`이 기기에서 ${nm} 소리가 안 나요. 스피커 버튼을 누르면 해결 방법을 알려 드려요.`); } return; }
    if (ttsWarned[fam]) return; ttsWarned[fam] = true;
    say(`이 기기에서 ${fam === 'zh' ? '중국어' : fam === 'ko' ? '한국어' : '영어'} 소리를 낼 목소리를 찾지 못했어요. ${ttsHelp(fam)}`);
  }
  // o: { rate, voice, ref, keep(앞 문장 안 끊기) }
  // 고른 목소리가 소리를 못 내면(인터넷 목소리가 막힌 학교 등) 다른 목소리 → 브라우저 기본 목소리 순서로 한 번씩 더 해 봐요
  // 원어민 목소리: 서버 함수 tts 가 Cloudflare 의 자연스러운 목소리(영어 Deepgram Aura, 중국어 MeloTTS)로 MP3 를 만들어
  // Storage 에 저장해 둬요. 앱은 공개 주소(tts/<언어>/<sha256>.mp3)를 먼저 보고, 없을 때만 만들어 달라고 해요.
  // 기기 목소리(특히 Windows 기본 목소리)는 로봇처럼 들려서 영어 · 중국어는 이 목소리를 먼저 써요. 실패하면 기기 목소리로 읽어요.
  let olAudio = null, olToken = 0;
  function olStop() { olToken++; if (olAudio) { try { olAudio.pause(); } catch (e) {} olAudio = null; } }
  if ('speechSynthesis' in window) {
    try { const c0 = window.speechSynthesis.cancel.bind(window.speechSynthesis); window.speechSynthesis.cancel = () => { olStop(); c0(); }; } catch (e) {}
  }
  function olChunks(t) {
    const out = []; let s = String(t).replace(/\s+/g, ' ').trim();
    while (s.length > 380) {
      let cut = Math.max(s.lastIndexOf('. ', 380), s.lastIndexOf('? ', 380), s.lastIndexOf('! ', 380), s.lastIndexOf('。', 380), s.lastIndexOf('；', 380));
      if (cut < 80) cut = Math.max(s.lastIndexOf(', ', 380), s.lastIndexOf('，', 380));
      if (cut < 80) cut = s.lastIndexOf(' ', 380); if (cut < 80) cut = 380;
      out.push(s.slice(0, cut + 1).trim()); s = s.slice(cut + 1).trim();
    }
    if (s) out.push(s); return out;
  }
  const TTS_MEM = new Map(), TTS_PEND = new Map();
  let ttsDevBad = false; // 이 기기 목소리가 소리를 못 낸 적이 있으면 원어민 소리를 끝까지 기다려요
  // 원어민 목소리는 마침표 없이 짧은 숙어(cry out to)를 받으면 끝에 없는 소리(섹)를 붙일 때가 있어요. 여러 단어인데 문장부호가 없으면 마침표를 붙여요.
  // 한 단어(his)도 마찬가지예요(히스하우처럼 뒤에 소리가 붙어요). 영어는 끝에 문장부호가 없으면 마침표를 붙여요. 주소가 바뀌니 예전에 잘못 만든 소리 대신 새로 만들어져요.
  const ttsText = (text, lang) => { const t = String(text).replace(/\s+/g, ' ').trim(); return lang === 'en' && /[a-z0-9]$/i.test(t) ? t + '.' : t; };
  // 짧은 단어 소리가 글자 수에 비해 너무 길면(뒤에 없는 소리가 붙음) 버리고 기기 목소리로 읽어요
  const ttsTooLong = (text, lang, dur, rate) => {
    const t = String(text).trim(); if (lang !== 'en' || !isFinite(dur) || !dur || t.split(/\s+/).length > 3) return false;
    return dur / Math.max(.5, rate || 1) > (0.6 + 0.1 * t.replace(/[^a-z]/gi, '').length) / Math.max(.5, rate || 1) + 0.3;
  };
  const TTS_BAD = new Set();
  // 다음 카드 소리를 미리 받아 둬요(카드가 뜨자마자 바로 읽게)
  function ttsPrefetch(text) {
    try {
      if (!text || !neuralOk() || (config.voice && config.voice[vFam(ttsLang(text))])) return;
      const lang = ttsLang(text) === 'zh-CN' ? 'zh' : 'en'; const p = olChunks(text)[0]; if (p) neuralUrl(p, lang).catch(() => null);
    } catch (e) {}
  }
  const neuralOk = () => !!(window.VOCA_CLOUD && VOCA_CLOUD.url && window.crypto && crypto.subtle) && navigator.onLine !== false && config.neural !== false;
  function neuralUrl(text, lang) {
    text = ttsText(text, lang);
    const mk = lang + '|' + text; if (TTS_MEM.has(mk)) return Promise.resolve(TTS_MEM.get(mk));
    if (TTS_PEND.has(mk)) return TTS_PEND.get(mk);
    const p = neuralFetch(text, lang, mk).finally(() => TTS_PEND.delete(mk));
    TTS_PEND.set(mk, p); return p;
  }
  async function neuralFetch(text, lang, mk) {
    const base = String(VOCA_CLOUD.url).replace(/\/+$/, '');
    const hb = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`v1|${lang}|${text}`)));
    const key = [...hb].map(x => x.toString(16).padStart(2, '0')).join('');
    const get = async (url, init) => { const ctl = new AbortController(), tm = setTimeout(() => ctl.abort(), 20000); try { const r = await fetch(url, { ...(init || {}), signal: ctl.signal }); return r.ok && /audio/.test(r.headers.get('content-type') || '') ? await r.blob() : null; } catch (e) { return null; } finally { clearTimeout(tm); } };
    let blob = await get(`${base}/storage/v1/object/public/tts/${lang}/${key}.mp3`);
    if (!blob) blob = await get(`${base}/functions/v1/tts`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(VOCA_CLOUD.apiKey ? { apikey: VOCA_CLOUD.apiKey } : {}) }, body: JSON.stringify({ text, lang }) });
    if (!blob) return null;
    const url = URL.createObjectURL(blob);
    TTS_MEM.set(mk, url); if (TTS_MEM.size > 300) { const k0 = TTS_MEM.keys().next().value; URL.revokeObjectURL(TTS_MEM.get(k0)); TTS_MEM.delete(k0); }
    return url;
  }
  // 성공하면 true, 다른 소리로 바뀌어 멈췄으면 'cancel', 실패하면 false
  function olSpeak(text, L2, rate, patient) {
    const lang = vFam(L2) === 'zh' ? 'zh' : 'en', tok = ++olToken, parts = olChunks(text);
    return new Promise(async res => {
      let nextUrl = neuralUrl(parts[0], lang);
      // 처음 만드는 소리는 서버에서 몇 초 걸려요. 0.7초 안에 안 오면 기기 목소리로 바로 읽고, 원어민 소리는 뒤에서 받아 다음부터 써요.
      const wait = patient || ttsDevBad ? 0 : 1500;
      const first = !wait || TTS_MEM.has(lang + '|' + ttsText(parts[0], lang)) ? await nextUrl : await Promise.race([nextUrl, new Promise(r => setTimeout(() => r('slow'), wait))]);
      if (first === 'slow') return res(tok === olToken ? 'slow' : 'cancel');
      for (let i = 0; i < parts.length; i++) {
        const url = await nextUrl;
        if (tok !== olToken) return res('cancel');
        if (!url) return res(i > 0 ? true : false);
        if (i + 1 < parts.length) nextUrl = neuralUrl(parts[i + 1], lang); // 다음 조각을 미리 받아요
        const ok = await new Promise(done => {
          if (TTS_BAD.has(url) && !ttsDevBad) return done(false);
          const a = new Audio(url); olAudio = a;
          a.playbackRate = Math.min(2, Math.max(.5, rate || 1)); try { a.preservesPitch = true; } catch (e) {}
          let fin = false; const end = v => { if (fin) return; fin = true; clearTimeout(tm); done(v); };
          const tm = setTimeout(() => end(false), 30000);
          if (parts.length === 1 && !ttsDevBad) a.onloadedmetadata = () => { if (ttsTooLong(parts[0], lang, a.duration, a.playbackRate)) { TTS_BAD.add(url); try { a.pause(); } catch (e) {} end(false); } };
          a.onended = () => end(true); a.onerror = () => end(false); a.onpause = () => { if (tok !== olToken) end(true); };
          a.play().catch(() => end(false));
        });
        if (tok !== olToken) return res('cancel');
        if (!ok) return res(i > 0 ? true : false);
      }
      res(true);
    });
  }
  function speak(text, lang, o) {
    o = o || {};
    return new Promise(async res => {
      if (!('speechSynthesis' in window) || !text) return res();
      if (!o.keep) { try { window.speechSynthesis.cancel(); } catch (e) {} }
      const L2 = lang || 'en-US', fam = vFam(L2), rate = o.rate || ttsRateFor(L2), list = voicesOf(fam);
      // 영어 · 중국어는 원어민 목소리(서버)를 먼저 써요. 설정에서 기기 목소리를 직접 골랐으면 그 목소리로 읽어요.
      let slow = false;
      if ((fam === 'en' || fam === 'zh') && !o.voice && !(config.voice && config.voice[fam]) && neuralOk()) {
        const r = await olSpeak(text, L2, rate); if (r === 'slow') slow = true; else if (r) return res();
      }
      if (fam === 'zh' && loadVoices().length && !list.length) ttsNoVoice('zh', o.ask);
      const first = o.voice || voiceFor(L2, o.ref), cand = [first].concat(list.filter(v => v !== first).sort((x, y) => (+!!y.localService) - (+!!x.localService)), [null]).filter((v, i, a) => a.indexOf(v) === i).slice(0, 3);
      const attempt = k => {
        const u = new SpeechSynthesisUtterance(text), v = cand[k];
        u.lang = L2; u.rate = rate; u.pitch = clampN(config.ttsPitch, .5, 1.5, 1);
        if (v) { try { u.voice = v; } catch (e) {} }
        // 일부 폰(삼성 TTS 엔진에 그 언어가 없을 때 등)은 오류 없이 바로 '끝'만 보내요: 시작 신호 없이 0.3초 안에 끝나면 실패로 봐요
        let over = false, started = false; const t0 = Date.now();
        u.onstart = () => { started = true; };
        const tm = setTimeout(() => end(true), (6000 + text.length * 160) / Math.min(1, rate));
        const end = ok => {
          if (over) return; over = true; clearTimeout(tm);
          if (ok) return res();
          if (k + 1 < cand.length) return attempt(k + 1);
          // 기기 목소리가 모두 실패했어요: 원어민 소리를 기다렸다가 읽어요
          if (fam !== 'ko') ttsDevBad = true;
          if (slow) return olSpeak(text, L2, rate, true).then(r => { if (!r && fam !== 'ko') ttsNoVoice(fam, o.ask); res(); });
          if (fam !== 'ko') ttsNoVoice(fam, o.ask); res();
        };
        u.onend = () => end(started || Date.now() - t0 > 300);
        u.onerror = e => end(!!(e && /interrupted|canceled/.test(e.error || '')));
        try { window.speechSynthesis.speak(u); } catch (e) { end(false); }
      };
      attempt(0);
    });
  }
  function playAudio(text, ask) { speak(text, ttsLang(text), { ask }); }
  /* ----- 읽어주기 설정 화면 ----- */
  const TTS_K = {
    ttsRate: { label: '단어·예문 속도', min: .5, max: 2, step: .05, d: .9, fmt: x => x.toFixed(2) + 'x', chips: [.6, .75, .9, 1, 1.25, 1.5] },
    koRate: { label: '한국어 뜻 속도', min: .5, max: 2, step: .05, d: 1, fmt: x => x.toFixed(2) + 'x', chips: [.8, 1, 1.2, 1.5] },
    ttsPitch: { label: '목소리 높이', min: .5, max: 1.5, step: .05, d: 1, fmt: x => Math.abs(x - 1) < .001 ? '보통' : (x > 1 ? '높게 ' : '낮게 ') + x.toFixed(2) },
    gap: { label: '듣기 모드 쉬는 시간', min: 0, max: 5, step: .1, d: .9, fmt: x => x.toFixed(1) + '초', chips: [.3, .9, 1.5, 3] },
    wordRep: { label: '듣기 모드 단어 반복', min: 1, max: 3, step: 1, d: 1, fmt: x => x + '번' }
  };
  const ttsVal = k => clampN(config[k], TTS_K[k].min, TTS_K[k].max, TTS_K[k].d);
  function ttsSet(k, v, fromRange) {
    const t = TTS_K[k]; if (!t) return;
    config[k] = Math.round(clampN(v, t.min, t.max, t.d) / t.step) * t.step;
    config[k] = Math.round(config[k] * 100) / 100;
    syncStorage();
    const lab = $(`tts_${k}V`); if (lab) lab.textContent = t.fmt(config[k]);
    const r = $(`tts_${k}`); if (r && !fromRange) r.value = config[k];
    document.querySelectorAll(`[data-act="tts-chip"][data-k="${k}"]`).forEach(b => b.classList.toggle('on', Math.abs(+b.dataset.v - config[k]) < .001));
    const fill = r && r.closest('.tts-row'); if (fill) fill.style.setProperty('--p', ((config[k] - t.min) / (t.max - t.min) * 100) + '%');
  }
  function ttsUI() {
    const box = $('ttsBox'); if (!box) return;
    const row = k => { const t = TTS_K[k], v = ttsVal(k); return `<div class="tts-row" style="--p:${(v - t.min) / (t.max - t.min) * 100}%">
      <div class="tts-top"><span>${t.label}</span><b id="tts_${k}V">${t.fmt(v)}</b></div>
      <div class="tts-ctl"><button class="tts-step" data-act="tts-step" data-k="${k}" data-d="-1" aria-label="${t.label} 줄이기">−</button><input type="range" id="tts_${k}" min="${t.min}" max="${t.max}" step="${t.step}" value="${v}" data-input="tts-range" data-k="${k}" aria-label="${t.label}"><button class="tts-step" data-act="tts-step" data-k="${k}" data-d="1" aria-label="${t.label} 늘리기">+</button></div>
      ${t.chips ? `<div class="tts-chips">${t.chips.map(c => `<button class="chip${Math.abs(c - v) < .001 ? ' on' : ''}" data-act="tts-chip" data-k="${k}" data-v="${c}">${t.fmt(c)}</button>`).join('')}</div>` : ''}</div>`; };
    const vsel = (fam, label) => {
      const list = voicesOf(fam), pick = (config.voice || {})[fam] || '', auto = voiceFor(fam === 'en' ? 'en-US' : fam === 'zh' ? 'zh-CN' : 'ko-KR', fam === 'ko' ? voiceFor(LANG === 'zh' ? 'zh-CN' : 'en-US') : null);
      return `<div class="tts-voice"><span>${label}</span><select data-change="tts-voice" data-l="${fam}" aria-label="${label}">
        <option value="">자동${auto ? ' (' + esc(auto.name.replace(/^(Microsoft|Google)\s+/, '').slice(0, 28)) + ')' : ''}</option>
        ${list.map(v => `<option value="${esc(vId(v))}"${vId(v) === pick ? ' selected' : ''}>${esc(v.name.slice(0, 40))} · ${esc(v.lang)}${vGender(v) ? (vGender(v) === 'f' ? ' · 여성' : ' · 남성') : ''}</option>`).join('')}
      </select><button class="tts-play" data-act="tts-try" data-l="${fam}" aria-label="${label} 들어 보기">${IC.speaker}</button></div>`;
    };
    const has = 'speechSynthesis' in window;
    box.innerHTML = `${has ? '' : '<p class="muted tts-note">이 브라우저는 소리 내어 읽기를 지원하지 않아요.</p>'}
      ${row('ttsRate')}${row('koRate')}${row('ttsPitch')}
      <div class="tts-sep"></div>
      ${vsel(LANG === 'zh' ? 'zh' : 'en', LANG === 'zh' ? '중국어 목소리' : '영어 목소리')}${vsel('ko', '한국어(뜻) 목소리')}
      <label class="switch-row tts-match"><input type="checkbox" data-change="tts-match" ${config.matchVoice !== false ? 'checked' : ''}> 뜻도 단어와 비슷한 목소리로 맞추기 <small class="muted">(같은 회사·같은 성별)</small></label>
      ${VOICES.length ? '' : '<p class="muted tts-note">목소리 목록을 불러오는 중이에요. 잠시 뒤 다시 열면 고를 수 있어요.</p>'}
      <div class="tts-sep"></div>
      ${row('gap')}${row('wordRep')}
      <div class="tts-btns"><button class="btn btn-soft" data-act="tts-reset">기본값으로</button><button class="btn btn-primary" data-act="tts-try" data-l="all">${IC.speaker} 단어와 뜻 들어 보기</button></div>`;
  }
  const TTS_SAMPLE = { en: ['apple', '사과'], zh: ['苹果', '사과'] };
  async function ttsTry(fam) {
    const f = LANG === 'zh' ? 'zh' : 'en', [w, m] = TTS_SAMPLE[f], wl = f === 'zh' ? 'zh-CN' : 'en-US', ref = voiceFor(wl);
    if (fam === 'ko') return speak('안녕하세요. 이 목소리로 뜻을 읽어 드려요.', 'ko-KR', { ref, ask: true });
    await speak(w, wl, { ref, ask: true });
    if (fam === 'all') { await sleep(Math.max(200, ttsVal('gap') * 500)); await speak(m, 'ko-KR', { ref, keep: true }); }
  }
  ACTIONS['tts-step'] = el => { const k = el.dataset.k, t = TTS_K[k]; if (t) ttsSet(k, ttsVal(k) + (+el.dataset.d) * t.step); };
  ACTIONS['tts-chip'] = el => ttsSet(el.dataset.k, +el.dataset.v);
  ACTIONS['tts-try'] = el => ttsTry(el.dataset.l);
  ACTIONS['tts-reset'] = () => { Object.keys(TTS_K).forEach(k => { config[k] = TTS_K[k].d; }); config.matchVoice = true; config.voice = { en: '', zh: '', ko: '' }; syncStorage(); ttsUI(); toast('읽어주기 설정을 기본값으로 돌렸어요.'); };

