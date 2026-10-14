/* VocaPro 기기 음성 AI (영어 · 중국어): 서버 없이 브라우저 안에서 듣고 채점해요.
 * - 영어 모델: NVIDIA NeMo stt_en_conformer_ctc_small (CC BY 4.0), sherpa-onnx 가 ONNX(int8)로 바꾼 것. 3조각으로 나눠 같은 주소에서 받아요.
 * - 중국어 모델: k2-fsa icefall Zipformer CTC small (중국어, byte-level BPE, int8, Apache-2.0) sherpa-onnx-zipformer-ctc-small-zh-int8-2025-07-16. 4조각.
 *   글자마다 채점해요. 성조가 틀리면 다른 글자로 들리는 만큼 점수가 내려가요.
 * - 실행: ONNX Runtime Web(MIT, wasm). 이 파일은 Web Worker 로 돌아요(화면이 멈추지 않게).
 * - 채점: 목표 글을 CTC 강제 정렬해 단어마다 '그 소리일 확률'(사후확률)과 '가장 그럴듯한 다른 소리와의 차이'(GOP)를 섞어요.
 *   사람 목소리 단어 658개 시험에서 같은 녹음의 맞는 단어가 비슷한 다른 단어(three/tree 등)보다 높게 나온 비율 93%.
 * 메시지: { cmd: 'init', lang } -> { type: 'progress', lang, p } ... { type: 'ready', lang }
 *         { cmd: 'score', id, lang, pcm: Float32Array(16kHz), items: [{ text, kind }] } -> { type: 'result', id, items, heard }
 * lang: 'en'(기본) 또는 'zh'
 */
(function (G) {
  'use strict';
  const SR = 16000, NFFT = 512, FLEN = 400, FSHIFT = 160, NMEL = 80;
  const CACHE = 'vp-asr-1';
  // 언어별 모델: 특징 만드는 법(소리 크기 배율, 높은 주파수 끝, 정규화, 입력 모양)과 빈칸(blank) 번호가 달라요
  const MODELS = {
    en: { parts: ['en-ctc.0.bin', 'en-ctc.1.bin', 'en-ctc.2.bin'], bytes: 46419854, tokens: 'en-ctc.tokens.txt', blank: -1, scale: 32768, hi: 8000, norm: true, tf: false, inp: ['audio_signal', 'length'] },
    zh: { parts: ['zh-ctc.0.bin', 'zh-ctc.1.bin', 'zh-ctc.2.bin', 'zh-ctc.3.bin'], bytes: 62666860, tokens: 'zh-ctc.tokens.txt', blank: 0, scale: 1, hi: 7600, norm: false, tf: true, inp: ['x', 'x_lens'] }
  };
  // 중국어 모델의 글자 조각은 UTF-8 바이트를 글자 하나씩으로 바꾼 것(icefall byte_utils)
  const BCH = (() => { let r = ''; const add = (a, b) => { for (let c = a; c <= b; c++) r += String.fromCharCode(c); }; add(256, 287); add(32, 126); add(288, 305); add(308, 318); add(321, 328); add(330, 382); add(384, 422); return r; })();
  const BID = new Map([...BCH].map((c, i) => [c, i]));
  const benc = s => { let r = ''; for (const b of new TextEncoder().encode(s)) r += BCH[b]; return r; };
  const bdec = s => { const by = []; for (const ch of s) { const v = BID.get(ch); if (v != null) by.push(v); } return new TextDecoder('utf-8', { fatal: false }).decode(new Uint8Array(by)).replace(/\uFFFD/g, ''); };

  /* ----- 소리 특징: Kaldi fbank 와 같게 (80 mel, 25ms/10ms, povey 창, snip_edges=false) ----- */
  const POVEY = new Float32Array(FLEN);
  for (let i = 0; i < FLEN; i++) POVEY[i] = Math.pow(0.5 - 0.5 * Math.cos(2 * Math.PI * i / (FLEN - 1)), 0.85);
  const mel = f => 1127 * Math.log(1 + f / 700);
  const MELS = new Map();
  const melw = hiF => { if (!MELS.has(hiF)) MELS.set(hiF, makeMel(hiF)); return MELS.get(hiF); };
  const makeMel = hiF => {
    const lo = mel(20), hi = mel(hiF), d = (hi - lo) / (NMEL + 1), out = [];
    for (let b = 0; b < NMEL; b++) {
      const l = lo + b * d, c = l + d, r = c + d, w = [];
      for (let i = 0; i < NFFT / 2; i++) {
        const m = mel(SR / NFFT * i);
        if (m > l && m < r) w.push([i, m <= c ? (m - l) / (c - l) : (r - m) / (r - c)]);
      }
      out.push(w);
    }
    return out;
  };
  const REV = (() => { const r = new Uint16Array(NFFT); for (let i = 0, j = 0; i < NFFT; i++) { r[i] = j; let b = NFFT >> 1; while (j & b) { j ^= b; b >>= 1; } j |= b; } return r; })();
  const COS = new Float64Array(NFFT / 2), SIN = new Float64Array(NFFT / 2);
  for (let i = 0; i < NFFT / 2; i++) { COS[i] = Math.cos(2 * Math.PI * i / NFFT); SIN[i] = -Math.sin(2 * Math.PI * i / NFFT); }
  function fft(re, im) {
    for (let i = 0; i < NFFT; i++) { const j = REV[i]; if (j > i) { let t = re[i]; re[i] = re[j]; re[j] = t; t = im[i]; im[i] = im[j]; im[j] = t; } }
    for (let s = 2; s <= NFFT; s <<= 1) {
      const h = s >> 1, st = NFFT / s;
      for (let i = 0; i < NFFT; i += s) for (let k = 0; k < h; k++) {
        const c = COS[k * st], sn = SIN[k * st], a = i + k, b = a + h;
        const tr = re[b] * c - im[b] * sn, ti = re[b] * sn + im[b] * c;
        re[b] = re[a] - tr; im[b] = im[a] - ti; re[a] += tr; im[a] += ti;
      }
    }
  }
  function fbank(y, M) {
    M = M || MODELS.en;
    const MELW = melw(M.hi), SC = M.scale, N = y.length, T = Math.floor((N + FSHIFT / 2) / FSHIFT), out = new Float32Array(T * NMEL);
    const fr = new Float64Array(FLEN), re = new Float64Array(NFFT), im = new Float64Array(NFFT), pw = new Float64Array(NFFT / 2 + 1);
    for (let t = 0; t < T; t++) {
      const st = t * FSHIFT + FSHIFT / 2 - FLEN / 2; let mean = 0;
      for (let i = 0; i < FLEN; i++) {
        let s = st + i; if (s < 0) s = -s - 1; else if (s >= N) s = 2 * N - 1 - s;
        s = Math.max(0, Math.min(N - 1, s)); fr[i] = y[s] * SC; mean += fr[i];
      }
      mean /= FLEN; for (let i = 0; i < FLEN; i++) fr[i] -= mean;
      for (let i = FLEN - 1; i > 0; i--) fr[i] -= 0.97 * fr[i - 1];
      fr[0] -= 0.97 * fr[0];
      re.fill(0); im.fill(0);
      for (let i = 0; i < FLEN; i++) re[i] = fr[i] * POVEY[i];
      fft(re, im);
      for (let i = 0; i <= NFFT / 2; i++) pw[i] = re[i] * re[i] + im[i] * im[i];
      for (let b = 0; b < NMEL; b++) { let e = 0; for (const [i, w] of MELW[b]) e += pw[i] * w; out[t * NMEL + b] = Math.log(Math.max(e, 1.1920929e-7)); }
    }
    if (M.tf) return { x: out, T }; // 중국어: 그대로 (T, 80)
    // 영어: 특징마다 평균 0 · 표준편차 1 (모델이 그렇게 배웠어요). (T, 80) -> (80, T)
    const x = new Float32Array(NMEL * T);
    for (let b = 0; b < NMEL; b++) {
      let m = 0, v = 0; for (let t = 0; t < T; t++) m += out[t * NMEL + b]; m /= T;
      for (let t = 0; t < T; t++) { const d = out[t * NMEL + b] - m; v += d * d; }
      const sd = Math.sqrt(v / T) + 1e-5;
      for (let t = 0; t < T; t++) x[b * T + t] = (out[t * NMEL + b] - m) / sd;
    }
    return { x, T };
  }

  /* ----- 글자 조각(토큰) ----- */
  let TOK = [], TID = new Map(), BLK = 0, LANG = 'en';
  const TOKS = {};
  function setTokens(txt, lang) {
    lang = lang || 'en'; const tok = txt.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
    TOKS[lang] = { tok, tid: new Map(tok.map((t, i) => [t, i])), blk: MODELS[lang].blank < 0 ? tok.length - 1 : MODELS[lang].blank };
    useLang(lang);
  }
  function useLang(lang) { const t = TOKS[lang]; if (!t) return; LANG = lang; TOK = t.tok; TID = t.tid; BLK = t.blk; }
  // 중국어: 한자만 글자 하나씩(문장 부호 · 병음 · 숫자는 빼요)
  const HAN = /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/;
  const words = t => LANG === 'zh' ? [...String(t || '').normalize('NFKC')].filter(c => HAN.test(c)) : wordsEn(t);
  const wordsEn = t => String(t || '').toLowerCase().normalize('NFKC').replace(/[’‘`]/g, "'").replace(/-/g, ' ').replace(/[^a-z' ]/g, ' ').split(/\s+/).map(w => w.replace(/^'+|'+$/g, '')).filter(Boolean);
  // 가장 적은 조각으로 나누기 (▁ 는 단어 시작)
  function tokWord(w) {
    const s = '▁' + (LANG === 'zh' ? benc(w) : w), n = s.length, best = new Array(n + 1).fill(null); best[0] = [];
    for (let i = 0; i < n; i++) {
      if (!best[i]) continue;
      for (let j = i + 1; j <= Math.min(n, i + 14); j++) {
        const id = TID.get(s.slice(i, j));
        if (id != null && id !== BLK && (!best[j] || best[i].length + 1 < best[j].length)) best[j] = best[i].concat(id);
      }
    }
    return best[n] || [];
  }
  function greedy(lp, C, a, b) {
    let out = '', prev = -1;
    for (let t = a; t < b; t++) {
      let k = 0, m = -Infinity; const o = t * C; for (let c = 0; c < C; c++) if (lp[o + c] > m) { m = lp[o + c]; k = c; }
      if (k !== prev && k !== BLK) out += TOK[k];
      prev = k;
    }
    return LANG === 'zh' ? bdec(out.replace(/▁/g, '')) : out.replace(/▁/g, ' ').replace(/\s+/g, ' ').trim();
  }

  /* ----- CTC 강제 정렬 (단어 사이에는 '다른 소리'도 허용: 더듬기·잡음·다른 말) ----- */
  // 문항을 통째로 건너뛰는 길도 있어요(받은 파일에서 학생이 한 문항을 빼먹은 경우). 건너뛰기 벌점 SKIP_PEN
  const SKIP_PEN = 25;
  function align(lp, C, T, seq) {
    const S = [], skipFrom = new Map(); let prevStart = -1;
    for (const s of seq) {
      if (s.is) { if (prevStart >= 0) skipFrom.set(S.length, prevStart); prevStart = S.length; }
      S.push({ b: true, tok: BLK, ws: s.ws }); S.push({ b: false, tok: s.tok });
    }
    if (prevStart >= 0) skipFrom.set(S.length, prevStart);
    S.push({ b: true, tok: BLK, ws: true });
    const N = S.length, NEG = -1e30, mx = new Float32Array(T), fill = new Float32Array(T);
    for (let t = 0; t < T; t++) { let m = -Infinity, mn = -Infinity; const o = t * C; for (let c = 0; c < C; c++) { const v = lp[o + c]; if (v > m) m = v; if (c !== BLK && v > mn) mn = v; } mx[t] = m; fill[t] = mn - 2.0; }
    const em = (t, s) => { const st = S[s], v = lp[t * C + st.tok]; return st.b && st.ws ? Math.max(v, fill[t]) : v; };
    let D = new Float64Array(N).fill(NEG); const B = new Int32Array(T * N);
    D[0] = em(0, 0); if (N > 1) D[1] = em(0, 1);
    for (let k = 0, s = 0; k < 30; k++) { const nx = [...skipFrom].find(([to, fr]) => fr === s); if (!nx) break; D[nx[0]] = Math.max(D[nx[0]], D[s] - SKIP_PEN * (k + 1) + em(0, nx[0]) - em(0, s)); s = nx[0]; }
    for (let t = 1; t < T; t++) {
      const E = new Float64Array(N).fill(NEG);
      for (let s = 0; s < N; s++) {
        let v = D[s], bk = s;
        if (s >= 1 && D[s - 1] > v) { v = D[s - 1]; bk = s - 1; }
        if (s >= 2 && !S[s].b && S[s - 2].tok !== S[s].tok && D[s - 2] > v) { v = D[s - 2]; bk = s - 2; }
        const sk = skipFrom.get(s); if (sk != null && D[sk] - SKIP_PEN > v) { v = D[sk] - SKIP_PEN; bk = sk; }
        if (v > NEG / 2) { E[s] = v + em(t, s); B[t * N + s] = bk; }
      }
      D = E;
    }
    let s = N > 1 && D[N - 2] > D[N - 1] ? N - 2 : N - 1;
    // 첫 문항부터 건너뛴 경우: 시작 상태에서 바로 갈 수 있게 0번 시각에도 건너뛰기를 열어 둬요
    const path = new Int32Array(T);
    for (let t = T - 1; t >= 0; t--) { path[t] = s; s = B[t * N + s]; }
    return { S, path, mx };
  }

  /* ----- 점수 ----- */
  const clamp = v => Math.max(0, Math.min(100, Math.round(v)));
  // 단어 확신도(0~1) -> 점수: 사람 목소리 시험에서 맞게 읽은 단어 중간값 0.94, 비슷한 다른 단어 중간값 0.32
  const MAPX = [0, 0.15, 0.3, 0.45, 0.65, 0.85, 1], MAPY = [0, 10, 35, 60, 78, 92, 100];
  function mapScore(c) { for (let i = 1; i < MAPX.length; i++) if (c <= MAPX[i]) return MAPY[i - 1] + (MAPY[i] - MAPY[i - 1]) * (c - MAPX[i - 1]) / (MAPX[i] - MAPX[i - 1]); return 100; }
  function edit(a, b) { const d = Array.from({ length: b.length + 1 }, (_, j) => j); for (let i = 1; i <= a.length; i++) { let p = d[0]; d[0] = i; for (let j = 1; j <= b.length; j++) { const t = d[j]; d[j] = Math.min(d[j] + 1, d[j - 1] + 1, p + (a[i - 1] === b[j - 1] ? 0 : 1)); p = t; } } return d[b.length]; }
  function completeness(tw, hw) {
    if (!tw.length) return 1;
    const same = (x, y) => x === y || LANG !== 'zh' && edit(x, y) <= Math.max(1, Math.floor(Math.max(x.length, y.length) / 3));
    const L = Array.from({ length: tw.length + 1 }, () => new Array(hw.length + 1).fill(0));
    for (let i = 1; i <= tw.length; i++) for (let j = 1; j <= hw.length; j++) L[i][j] = same(tw[i - 1], hw[j - 1]) ? L[i - 1][j - 1] + 1 : Math.max(L[i - 1][j], L[i][j - 1]);
    return L[tw.length][hw.length] / tw.length;
  }
  // 목표 단어 가운데 들은 말에서 찾은 자리(같은 비교로 되짚어요)
  function matched(tw, hw) {
    const same = (x, y) => x === y || LANG !== 'zh' && edit(x, y) <= Math.max(1, Math.floor(Math.max(x.length, y.length) / 3));
    const L = Array.from({ length: tw.length + 1 }, () => new Array(hw.length + 1).fill(0));
    for (let i = 1; i <= tw.length; i++) for (let j = 1; j <= hw.length; j++) L[i][j] = same(tw[i - 1], hw[j - 1]) ? L[i - 1][j - 1] + 1 : Math.max(L[i - 1][j], L[i][j - 1]);
    const out = new Set();
    for (let i = tw.length, j = hw.length; i > 0 && j > 0;) {
      if (same(tw[i - 1], hw[j - 1]) && L[i][j] === L[i - 1][j - 1] + 1) { out.add(i - 1); i--; j--; } else if (L[i - 1][j] >= L[i][j - 1]) i--; else j--;
    }
    return out;
  }
  const FRAME_SEC = 0.04;
  // 채점할 영어 단어가 없거나(숫자 · 한글만) 소리가 너무 짧으면 0점 결과(빈 값 대신)
  const NOWORD = () => LANG === 'zh' ? '읽을 한자가 없어서 채점하지 않았어요.' : '읽을 영어 단어가 없어서 채점하지 않았어요.';
  const empty = (it, ii, tips) => ({ idx: it.idx != null ? it.idx : ii, score: 0, acc: 0, flu: 0, comp: 0, miss: [], heard: '', tips, problems: [], words: [], model: 'vocapro-local' });
  function score(lp, C, T, items) {
    const seq = [], owner = [], W = items.map(it => words(it.text));
    W.forEach((ws, ii) => ws.forEach((w, wi) => tokWord(w).forEach((tok, k) => { seq.push({ tok, ws: k === 0, is: wi === 0 && k === 0 && items.length > 1 }); owner.push([ii, wi]); })));
    if (!seq.length || T < 2) return items.map((it, ii) => empty(it, ii, W[ii].length ? '소리가 너무 짧아요.' : NOWORD()));
    const { S, path, mx } = align(lp, C, T, seq);
    // 토큰마다 정렬된 프레임
    const tf = seq.map(() => []);
    for (let t = 0; t < T; t++) { const s = path[t]; if (!S[s].b) tf[(s - 1) >> 1].push(t); }
    return items.map((it, ii) => {
      const ws = W[ii]; if (!ws.length) return empty(it, ii, NOWORD());
      const wres = ws.map((w, wi) => {
        const ks = []; owner.forEach((o, k) => { if (o[0] === ii && o[1] === wi) ks.push(k); });
        let lsum = 0; const fr = [];
        for (const k of ks) {
          let p = 0; for (const f of tf[k]) { p = Math.max(p, Math.exp(lp[f * C + seq[k].tok])); fr.push(f); }
          lsum += Math.log(Math.max(p, 1e-4));
        }
        const post = Math.exp(lsum / Math.max(1, ks.length));
        if (!fr.length) return { w, c: 0, a: -1, b: -1 };
        const a = Math.min(...fr), b = Math.max(...fr), kset = new Set(ks);
        // GOP: 이 단어의 조각과 그 앞 빈칸에 정렬된 프레임에서, 정렬된 소리와 가장 그럴듯한 소리의 차이 평균
        let g = 0, gn = 0;
        for (let t = 0; t < T; t++) { const st = path[t], k = S[st].b ? st >> 1 : (st - 1) >> 1; if (kset.has(k)) { g += lp[t * C + S[st].tok] - mx[t]; gn++; } }
        const g2 = Math.exp(g / Math.max(1, gn));
        return { w, c: 0.5 * post + 0.5 * g2, a, b };
      });
      const spanA = Math.min(...wres.filter(x => x.a >= 0).map(x => x.a)), spanB = Math.max(...wres.map(x => x.b));
      const heard = spanB >= 0 ? greedy(lp, C, Math.max(0, spanA - 2), Math.min(T, spanB + 3)) : '';
      const sc = wres.map(x => mapScore(x.c));
      const acc = clamp(sc.reduce((s, v) => s + v, 0) / sc.length);
      // 유창성(문장): 단어 사이 0.6초 넘게 쉰 곳마다, 그리고 아주 느리면 깎아요. 단어(중국어는 두 글자까지)는 정확성과 같게
      const sent = it.kind === 's' || (LANG === 'zh' && ws.length > 2);
      let flu = acc;
      if (sent && wres.length > 1) {
        let gaps = 0; for (let i = 1; i < wres.length; i++) if (wres[i].a >= 0 && wres[i - 1].b >= 0 && (wres[i].a - wres[i - 1].b) * FRAME_SEC > 0.6) gaps++;
        // 영어는 단어, 중국어는 글자 수로 빠르기를 재요(중국어 한 글자 = 한 음절이라 기준을 높게)
        const dur = (spanB - spanA + 1) * FRAME_SEC, rate = ws.length / Math.max(0.3, dur), slow = LANG === 'zh' ? 1.6 : 1.2;
        flu = clamp(100 - gaps * 15 - (rate < slow ? (slow - rate) * (LANG === 'zh' ? 30 : 40) : 0));
      }
      const read = wres.some(x => x.c > 0.12);
      // 일치도: 목표 문장 단어(중국어는 글자) 가운데 읽은 것의 비율. 들은 말에서 찾았거나, 그 자리 소리 확신도가 높으면 읽은 걸로 봐요
      const hit = matched(ws, words(heard)); wres.forEach((x, i) => { if (x.c >= 0.45) hit.add(i); });
      const comp = read ? hit.size / ws.length : 0, miss = ws.map((_, i) => i).filter(i => !read || !hit.has(i));
      // 점수 = 정확성 70% + 유창성 30%. 빠진 단어는 정확성에서 이미 0점이에요. 일치도가 1/4도 안 되면 다른 말을 읽은 것으로 보고 10점까지
      const base = acc * 0.7 + flu * 0.3;
      const total = !read ? 0 : ws.length > 1 && comp < 0.25 ? Math.min(Math.round(base * comp), 10) : clamp(base);
      const weak = wres.map((x, i) => [x.w, sc[i]]).filter(x => x[1] < 60).sort((a, b) => a[1] - b[1]).slice(0, 3);
      const tips = !read ? '이 문항을 읽은 소리를 찾지 못했어요.'
        : ws.length > 1 && comp < 0.25 ? '채점 문장과 다른 말을 읽은 것 같아요.'
        : miss.length ? `빠뜨린 ${LANG === 'zh' ? '글자' : '단어'}가 있어요: ${miss.slice(0, 3).map(i => `'${ws[i]}'`).join(', ')}. 문장을 빠짐없이 읽어 보세요.`
        : total >= 88 ? '또렷하고 정확해요.'
        : weak.length ? `${weak.slice(0, 2).map(x => `'${x[0]}'`).join(', ')} ${LANG === 'zh' ? '발음과 성조를' : '발음을'} 원어민 소리와 비교해 다시 연습해요.`
        : it.kind === 's' && flu < 70 ? '단어 사이에서 오래 멈췄어요. 이어서 읽어 보세요.' : '조금 더 또렷하게 읽어 보세요.';
      return { idx: it.idx != null ? it.idx : ii, score: total, acc: read ? acc : 0, flu: read ? flu : 0, comp: Math.round(comp * 100), miss, heard, tips, problems: weak.map(x => x[0]), words: wres.map((x, i) => [x.w, Math.round(sc[i])]), spans: wres.map(x => [x.a, x.b]), model: 'vocapro-local' };
    });
  }

  /* ----- 모델 실행 ----- */
  const SESS = {}, INITP = {};
  async function getBin(name, onp) {
    let cache = null; try { cache = await caches.open(CACHE); } catch (e) {}
    const url = new URL(name, G.location ? G.location.href : 'http://x/').href;
    if (cache) { const hit = await cache.match(url); if (hit) { const b = await hit.arrayBuffer(); onp(b.byteLength); return b; } }
    const r = await fetch(url); if (!r.ok) throw new Error('모델 파일을 받지 못했어요 (' + r.status + ')');
    const rd = r.body.getReader(), chunks = []; let n = 0;
    for (;;) { const { done, value } = await rd.read(); if (done) break; chunks.push(value); n += value.length; onp(value.length, true); }
    const b = new Uint8Array(n); let o = 0; chunks.forEach(c => { b.set(c, o); o += c.length; });
    if (cache) { try { await cache.put(url, new Response(b.slice().buffer)); } catch (e) {} }
    return b.buffer;
  }
  function init(post, lang) {
    lang = MODELS[lang] ? lang : 'en';
    if (INITP[lang]) return INITP[lang];
    const M = MODELS[lang];
    INITP[lang] = (async () => {
      G.ort.env.wasm.numThreads = 1; G.ort.env.wasm.wasmPaths = new URL('./', G.location.href).href;
      let got = 0; const onp = n => { got += n; post({ type: 'progress', lang, p: Math.min(99, Math.round(got / M.bytes * 100)) }); };
      const tok = await (await fetch(M.tokens)).text(); setTokens(tok, lang);
      const bufs = []; for (const p of M.parts) bufs.push(await getBin(p, onp));
      const all = new Uint8Array(bufs.reduce((s, b) => s + b.byteLength, 0)); let o = 0; bufs.forEach(b => { all.set(new Uint8Array(b), o); o += b.byteLength; });
      if (all.length !== M.bytes) throw new Error('모델 파일이 깨졌어요. 새로고침해 주세요.');
      SESS[lang] = await G.ort.InferenceSession.create(all, { executionProviders: ['wasm'], graphOptimizationLevel: 'all' });
      post({ type: 'ready', lang });
    })().catch(e => { INITP[lang] = null; throw e; });
    return INITP[lang];
  }
  // 긴 소리는 20초씩(앞뒤 1.5초 겹침) 나눠 돌리고 겹친 부분은 가운데만 써요
  async function logprobs(pcm, lang, sess) {
    const M = MODELS[lang || 'en']; sess = sess || SESS[lang || 'en'];
    const CH = 20 * SR, OV = 1.5 * SR, out = []; let C = 0;
    for (let s = 0; s < pcm.length; s += CH) {
      const a = Math.max(0, s - OV), b = Math.min(pcm.length, s + CH + OV);
      const { x, T } = fbank(pcm.subarray(a, b), M), O = G.ort;
      const r = await sess.run({ [M.inp[0]]: new O.Tensor('float32', x, M.tf ? [1, T, NMEL] : [1, NMEL, T]), [M.inp[1]]: new O.Tensor('int64', BigInt64Array.from([BigInt(T)]), [1]) });
      const o = r[sess.outputNames[0]], d = o.data, Tn = o.dims[1]; C = o.dims[2];
      const per = (b - a) / Tn, f0 = Math.round((s - a) / per), f1 = Math.round((Math.min(pcm.length, s + CH) - a) / per);
      out.push(d.subarray(f0 * C, Math.min(Tn, f1) * C));
    }
    const n = out.reduce((k, x) => k + x.length, 0), lp = new Float32Array(n); let o = 0; out.forEach(x => { lp.set(x, o); o += x.length; });
    return { lp, C, T: n / C };
  }
  // 무음 숫자 0 은 특징을 망가뜨려서 아주 작은 잡음을 섞어요(정해진 씨앗이라 같은 소리 = 같은 점수)
  function dither(pcm) {
    const y = new Float32Array(pcm.length); let s = 12345;
    for (let i = 0; i < y.length; i++) { s = (s * 1103515245 + 12345) & 0x7fffffff; y[i] = pcm[i] + ((s / 0x7fffffff) - 0.5) * 2e-3; }
    return y;
  }
  async function run(pcm, items, lang, sess) {
    lang = MODELS[lang] ? lang : 'en';
    const { lp, C, T } = await logprobs(dither(pcm), lang, sess);
    useLang(lang);
    return { items: score(lp, C, T, items), heard: greedy(lp, C, 0, T) };
  }

  const API = { MODELS, fbank, setTokens, useLang, tokWord, words, align, score, greedy, mapScore, completeness, dither, init, run, logprobs, benc, bdec };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (typeof G.importScripts === 'function' && typeof G.document === 'undefined') {
    G.importScripts('ort.wasm.min.js');
    let busy = Promise.resolve();
    G.onmessage = e => {
      const m = e.data || {}, post = x => G.postMessage(x);
      if (m.cmd === 'init') init(post, m.lang).catch(err => post({ type: 'error', lang: m.lang || 'en', msg: String(err && err.message || err) }));
      if (m.cmd === 'score') busy = busy.then(() => init(post, m.lang)).then(() => run(m.pcm, m.items, m.lang)).then(r => post(Object.assign({ type: 'result', id: m.id }, r)), err => post({ type: 'error', id: m.id, msg: String(err && err.message || err) }));
    };
  }
})(typeof self !== 'undefined' ? self : globalThis);
