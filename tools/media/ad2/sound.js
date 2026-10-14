// VocaPro 광고 2 사운드: storyboard.json 의 music 설명(편곡·합성 레시피)과 cues(효과음)를 그대로 코드로 합성해 out/ad2.wav 를 써요.
// 샘플·npm 없이 순수 Node, 난수는 모두 시드 고정이라 몇 번을 돌려도 같은 파일이 나와요. 48 kHz 스테레오 16비트, 정확히 34.0초.
// 믹스: 음악 버스(-18 LUFS) 위에 효과음(피크 -8 dBFS), 킥·큰 타격에 사이드체인 더킹, 가벼운 글루 컴프, 리미터 -1 dBTP, 통합 -14 LUFS.
// 사용:
//   node tools/media/ad2/sound.js              out/ad2.wav 렌더 (render.js video 가 있으면 자동으로 넣어요)
//   node tools/media/ad2/sound.js stems        위와 같고 out/ad2-music.wav, out/ad2-sfx.wav 도 따로 저장(마스터 전, 확인용)
// 확인: ffmpeg -i tools/media/ad2/out/ad2.wav -af ebur128=peak=true -f null -
'use strict';
const fs = require('fs'), path = require('path');
const DIR = __dirname, OUT = path.join(DIR, 'out');
const SB = JSON.parse(fs.readFileSync(path.join(DIR, 'storyboard.json'), 'utf8'));
const SR = 48000, DUR = SB.duration, N = Math.round(SR * DUR), TAU = Math.PI * 2;
const SILENCE = [3.9375, 4.0], FADE = [33.0, 34.0];
const TARGET_LUFS = -14, CEIL_DBTP = -1.25, MUSIC_LUFS = -18, SFX_PEAK_DB = -8;

// ---------- 기본 도구 ----------
function hashStr(s) { let h = 2166136261 >>> 0; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h; }
function rng(key) { let a = hashStr(String(key)) || 1; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
const cents = c => Math.pow(2, c / 1200);
const dbToLin = d => Math.pow(10, d / 20), linToDb = x => 20 * Math.log10(Math.max(x, 1e-12));
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const sstep = x => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
const NOTE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
function noteMidi(s) { const m = /\b([A-G])(#|b)?(\d)\b/.exec(s); if (!m) return null; return 12 * (+m[3] + 1) + NOTE[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0); }
function mkBus(withPP) { const b = { L: new Float32Array(N), R: new Float32Array(N), send: { L: new Float32Array(N), R: new Float32Array(N) } }; if (withPP) b.pp = new Float32Array(N); return b; }
function panG(p) { const a = (clamp(p, -1, 1) + 1) * Math.PI / 4; return [Math.cos(a) * Math.SQRT2, Math.sin(a) * Math.SQRT2]; }

// 모든 소리는 voice() 로 씀: 짧은 어택/릴리스 램프가 항상 붙어서 클릭이 없음.
function voice(bus, t0, dur, o, fn) {
  const i0 = Math.round(t0 * SR), n = Math.max(1, Math.round(dur * SR));
  const atk = Math.max(1, (o.atk ?? 0.002) * SR), rel = Math.max(1, (o.rel ?? 0.005) * SR);
  const gain = o.gain ?? 1, send = o.send || 0, pp = o.pp || 0, pf = o.panFn;
  let [pl, pr] = panG(o.pan || 0);
  for (let k = 0; k < n; k++) {
    const i = i0 + k; if (i >= N) break;
    const tt = k / SR; let v = fn(tt, k);
    let e = 1; if (k < atk) e = k / atk; const r = n - 1 - k; if (r < rel) e *= r / rel;
    v *= e * gain;
    if (pf) [pl, pr] = panG(pf(tt));
    bus.L[i] += v * pl; bus.R[i] += v * pr;
    if (send) { bus.send.L[i] += v * pl * send; bus.send.R[i] += v * pr * send; }
    if (pp) bus.pp[i] += v * pp;
  }
}

// polyBLEP 대역 제한 오실레이터
function blep(t, dt) { if (t < dt) { t /= dt; return t + t - t * t - 1; } if (t > 1 - dt) { t = (t - 1) / dt; return t * t + t + t + 1; } return 0; }
class Saw { constructor(ph = 0) { this.ph = ph; } next(f) { const dt = f / SR, p = this.ph; const v = 2 * p - 1 - blep(p, dt); this.ph += dt; if (this.ph >= 1) this.ph -= 1; return v; } }
class Sq { constructor(ph = 0) { this.ph = ph; } next(f) { const dt = f / SR, p = this.ph; let p2 = p + 0.5; if (p2 >= 1) p2 -= 1; const v = (p < 0.5 ? 1 : -1) + blep(p, dt) - blep(p2, dt); this.ph += dt; if (this.ph >= 1) this.ph -= 1; return v; } }
class Sine { constructor(ph = 0) { this.ph = ph; } next(f) { this.ph += TAU * f / SR; if (this.ph > TAU) this.ph -= TAU; return Math.sin(this.ph); } }
// TPT 상태변수 필터 (변조해도 안정적). run() 은 LP 를 돌려주고 .bp .hp 도 채움.
class SVF {
  constructor() { this.s1 = 0; this.s2 = 0; this._f = -1; this._q = -1; this.bp = 0; this.hp = 0; }
  run(x, fc, Q = 0.707) {
    if (fc !== this._f || Q !== this._q) { this._f = fc; this._q = Q; const f = clamp(fc, 10, SR * 0.45); const g = Math.tan(Math.PI * f / SR); this.k = 1 / Q; this.a1 = 1 / (1 + g * (g + this.k)); this.a2 = g * this.a1; this.a3 = g * this.a2; }
    const v3 = x - this.s2, v1 = this.a1 * this.s1 + this.a2 * v3, v2 = this.s2 + this.a2 * this.s1 + this.a3 * v3;
    this.s1 = 2 * v1 - this.s1; this.s2 = 2 * v2 - this.s2; this.lp = v2; this.bp = v1; this.hp = x - this.k * v1 - v2; return v2;
  }
}
const noiseFn = R => () => R() * 2 - 1;

// ---------- 화성 ----------
const CH = { Am: { bass: 33, t: [57, 60, 64] }, F: { bass: 29, t: [57, 60, 65] }, G: { bass: 31, t: [59, 62, 67] }, C: { bass: 36, t: [60, 64, 67] } };
const PROG = [[0, 'Am'], [2, 'F'], [3, 'G'], [4, 'C'], [6, 'G'], [8, 'Am'], [10, 'F'], [12, 'C'], [14, 'Am'], [16, 'F'], [18, 'G'], [20, 'Am'], [22, 'F'], [24, 'C'], [26, 'G'], [28, 'F'], [29, 'G'], [30, 'C'], [31, 'F'], [31.5, 'G'], [32, 'C']];
function chordName(t) { let c = PROG[0][1]; for (const [s, n] of PROG) if (s <= t + 1e-9) c = n; return c; }
const chordAt = t => CH[chordName(t)];
function chordSpans(t0, t1) { const out = []; for (let i = 0; i < PROG.length; i++) { const s = PROG[i][0], e = i + 1 < PROG.length ? PROG[i + 1][0] : DUR; const a = Math.max(s, t0), b = Math.min(e, t1); if (b > a + 1e-9) out.push([a, b, CH[PROG[i][1]]]); } return out; }
// 타격음 저음을 그 마디 코드 근음에 맞춤 (43-70 Hz 대역)
function rootHz(t) { let f = mtof(chordAt(t).bass); while (f < 43) f *= 2; while (f > 70) f /= 2; return f; }

// ---------- 킥 사이드체인(펌핑) ----------
const KICKS = [];
function pumpAt(t, depth) {
  let lo = 0, hi = KICKS.length - 1, k = -1; while (lo <= hi) { const m = (lo + hi) >> 1; if (KICKS[m][0] <= t + 1e-9) { k = m; lo = m + 1; } else hi = m - 1; }
  if (k < 0) return 1; const s = t - KICKS[k][0], d = 1 - (1 - depth) * KICKS[k][1];
  if (s < 0.003) return 1 - (1 - d) * (s / 0.003);
  return d + (1 - d) * sstep((s - 0.003) / 0.12);
}

// ---------- 드럼 (레시피 그대로) ----------
function kick(bus, t, vel = 1) {
  KICKS.push([t, vel]); const R = rng('kick' + t); const o = new Sine();
  voice(bus, t, 0.42, { gain: 0.9 * vel, atk: 0.0005, rel: 0.08 }, tt => {
    const f = tt < 0.09 ? 150 * Math.pow(48 / 150, tt / 0.09) : 48;
    let v = o.next(f) * Math.exp(-tt / 0.35);
    if (tt < 0.002) v += (R() * 2 - 1) * 0.45 * (1 - tt / 0.002);
    return Math.tanh(1.6 * v) / Math.tanh(1.6);
  });
}
function clap(bus, t, vel = 1, gain = 0.38) {
  for (const [p, s] of [[-0.35, 'a'], [0.35, 'b']]) {
    const R = rng('clap' + t + s), f = new SVF(), f2 = new SVF();
    voice(bus, t, 0.16, { gain: gain * vel * 0.75, pan: p, send: 0.18, atk: 0.0005, rel: 0.02 }, tt => {
      let e = 0; for (const o of [0, 0.01, 0.02]) if (tt >= o) e = Math.max(e, Math.exp(-(tt - o) / 0.0035));
      if (tt >= 0.02) e = Math.max(e, 0.55 * Math.exp(-(tt - 0.02) / 0.04));
      const x = R() * 2 - 1; f.run(x, 1200, 1.4); f2.run(x, 2400, 1.2); return (f.bp * 2.2 + f2.bp * 0.8) * e;
    });
  }
}
function hat(bus, t, open, vel = 1, gain = 0.13) {
  const R = rng('hat' + t), f = new SVF(), f2 = new SVF(), len = open ? 0.25 : 0.04;
  voice(bus, t, len, { gain: gain * vel, pan: open ? 0.2 : 0.25, send: open ? 0.1 : 0.04, atk: 0.0005, rel: open ? 0.04 : 0.008 }, tt => {
    const x = R() * 2 - 1; f.run(x, 8000, 0.7); f2.run(f.hp, 8000, 0.7); return f2.hp * Math.exp(-tt / (open ? 0.085 : 0.012)) * 1.6;
  });
}
function shaker(bus, t, vel = 1) {
  const R = rng('shk' + t), f = new SVF();
  voice(bus, t, 0.06, { gain: 0.06 * vel, pan: -0.3, atk: 0.006, rel: 0.015 }, tt => { f.run(R() * 2 - 1, 7000, 1.1); return f.bp * 2 * Math.exp(-tt / 0.018); });
}
function snare(bus, t, vel = 1, gain = 0.36, pan = 0) {
  const R = rng('sn' + t), f = new SVF(), o = new Sine();
  voice(bus, t, 0.14, { gain: gain * vel, pan, send: 0.15, atk: 0.0005, rel: 0.03 }, tt => {
    f.run(R() * 2 - 1, 1800, 0.9); const body = o.next(180 * (1 + 0.25 * Math.exp(-tt / 0.01))) * Math.exp(-tt / 0.04);
    return f.bp * 1.7 * Math.exp(-tt / 0.035) + body * 0.7;
  });
}
function tom(bus, t, f0, vel = 1, gain = 0.5, pan = 0) {
  const o = new Sine(), R = rng('tom' + t), f = new SVF();
  voice(bus, t, 0.32, { gain: gain * vel, pan, send: 0.12, atk: 0.0008, rel: 0.05 }, tt => {
    const fr = f0 * (1 + 0.6 * Math.exp(-tt / 0.03)); let v = o.next(fr) * Math.exp(-tt / 0.12);
    if (tt < 0.01) { f.run(R() * 2 - 1, 2500, 0.8); v += f.lp * 0.4 * (1 - tt / 0.01); } return Math.tanh(1.3 * v);
  });
}
function crash(bus, t, vel = 1, gain = 0.26, len = 3.2) {
  for (const [p, s] of [[-0.4, 'a'], [0.4, 'b']]) {
    const R = rng('cr' + t + s), f = new SVF(), f2 = new SVF(), ph = [3200, 4100, 5300, 6700, 8200, 9600].map(() => R() * TAU);
    const fr = [3200, 4100, 5300, 6700, 8200, 9600].map(x => x * (s === 'a' ? 1 : 1.013));
    voice(bus, t, len, { gain: gain * vel, pan: p, send: 0.15, atk: 0.001, rel: 0.4 }, tt => {
      const x = R() * 2 - 1; f.run(x, 5000, 0.7); f2.run(f.hp, 5000, 0.7);
      let s2 = 0; for (let k = 0; k < 6; k++) s2 += Math.sin(ph[k] + TAU * fr[k] * tt) * 0.07 * Math.exp(-tt / (0.5 + k * 0.08));
      return (f2.hp * 1.4 + s2) * Math.exp(-tt / 1.2) * (1 + 0.6 * Math.exp(-tt / 0.03));
    });
  }
}
function riser(bus, t0, t1, gain = 0.3, key = '') {
  const R = rng('ris' + t0 + key), f = new SVF(), f2 = new SVF(), d = t1 - t0;
  voice(bus, t0, d, { gain, atk: 0.01, rel: 0.004, send: 0.2, panFn: tt => 0.35 * Math.sin(TAU * 1.5 * tt) }, tt => {
    const u = tt / d, fc = 300 * Math.pow(2, 5 * u), x = R() * 2 - 1; f.run(x, fc, 2.2); f2.run(x, fc * 1.5, 3);
    return (f.bp * 2.4 + f2.bp * 1.2) * u * u;
  });
}

// ---------- 음악 신스 ----------
function sawStack(R, n) { return Array.from({ length: n }, () => new Saw(R())); }
// 훅 스탭: 디튠 톱니 ±7센트 + 한 옥타브 위 사각, LPF 2.5k, 0.18 s
function stab(bus, t, notes, gain = 1) {
  notes.forEach((m, j) => {
    const R = rng('stab' + t + m), s = sawStack(R, 3), q = new Sq(R()), fL = new SVF(), f = mtof(m), det = [1, cents(7), cents(-7)];
    voice(bus, t, 0.26, { gain: 0.07 * gain, pan: (j - 1.5) * 0.25, send: 0.25, atk: 0.002, rel: 0.06 }, tt => {
      const x = s[0].next(f) + s[1].next(f * det[1]) + s[2].next(f * det[2]) + 0.5 * q.next(2 * f);
      return fL.run(x, 2500, 0.8) * Math.exp(-tt / 0.075);
    });
  });
}
// 패드: 톱니 4개 ±7/±12센트, LPF(기본 1.2k), 어택 0.2 s. 좌우로 디튠을 나눠 폭을 만듦.
function pad(bus, t0, t1, o = {}) {
  const cut = o.cut || (() => 1200), g = o.gain || (() => 1), atk = o.atk ?? 0.2, rel = o.rel ?? 0.25, base = o.base ?? 0.022, hard = o.hardEnd;
  for (const [a, b, ch] of chordSpans(t0, t1)) {
    const notes = o.notes || ch.t, first = a <= t0 + 1e-9, last = b >= t1 - 1e-9;
    for (const m of notes) {
      const f = mtof(m);
      for (const [side, dets] of [[-0.55, [-12, 7]], [0.55, [-7, 12]]]) {
        const R = rng('pad' + a + m + side), s = sawStack(R, 2), fl = new SVF(), r = [cents(dets[0]), cents(dets[1])];
        const end = last && hard ? b : b + rel;
        voice(bus, a, end - a, { gain: base * (o.mul || 1), pan: side, send: o.send ?? 0.3, atk: first ? atk : 0.12, rel: last && hard ? 0.004 : rel }, tt => {
          const T = a + tt, x = s[0].next(f * r[0]) + s[1].next(f * r[1]);
          return fl.run(x, cut(T), 0.75) * g(T) * pumpAt(T, 0.72);
        });
      }
    }
  }
}
// 베이스: 톱니 + 사인 서브, LPF 600, 킥 사이드체인 (0.35x 로 눌렀다 120 ms 에 복귀)
function bassNote(bus, t, dur, m, o = {}) {
  const f = mtof(m), R = rng('bass' + t + m), s = new Saw(R()), sub = new Sine(), fl = new SVF(), depth = o.depth ?? 0.35, cut = o.cut ?? 600;
  voice(bus, t, dur, { gain: (o.gain ?? 0.34), atk: 0.003, rel: o.rel ?? 0.02 }, tt => {
    const x = s.next(f) * 0.8 + sub.next(f) * 0.7; return fl.run(x, cut * (1 + 0.6 * Math.exp(-tt / 0.04)), 0.9) * pumpAt(t + tt, depth);
  });
}
// 리드: 사각 2개(±4센트), 짧은 스탭
function lead(bus, t, m, dur = 0.16, o = {}) {
  const f = mtof(m);
  for (const [p, c] of [[-0.3, -4], [0.3, 4]]) {
    const R = rng('ld' + t + m + p), q = new Sq(R()), fl = new SVF(), fr = f * cents(c), tau = o.tau ?? 0.07;
    voice(bus, t, dur, { gain: (o.gain ?? 0.05), pan: p, send: 0.22, atk: 0.002, rel: o.rel ?? 0.03 }, tt => fl.run(q.next(fr), o.cut ?? 3200, 0.9) * Math.exp(-tt / tau) * pumpAt(t + tt, 0.8));
  }
}
// 브라스 스탭: 톱니 4개 ±5센트, LPF 엔벨로프 600 -> 3000 -> 1200
function brass(bus, t, notes, dur = 0.4, gain = 1) {
  notes.forEach((m, j) => {
    const f = mtof(m), R = rng('br' + t + m), s = sawStack(R, 4), d = [-5, -1.7, 1.7, 5].map(cents), fl = new SVF();
    voice(bus, t, dur, { gain: 0.034 * gain, pan: (j - (notes.length - 1) / 2) * 0.22, send: 0.25, atk: 0.006, rel: 0.12 }, tt => {
      const fc = tt < 0.04 ? 600 * Math.pow(5, tt / 0.04) : 3000 * Math.pow(0.4, Math.min(1, (tt - 0.04) / 0.2));
      let x = 0; for (let k = 0; k < 4; k++) x += s[k].next(f * d[k]); return fl.run(x, fc, 0.8) * (0.75 + 0.25 * Math.exp(-tt / 0.1));
    });
  });
}
// 플럭(삼각 + 사인, 0.2 s), 3/16 핑퐁 딜레이로 보냄
function softPluck(bus, t, m, gain = 0.12, pan = 0) {
  const f = mtof(m), R = rng('pl' + t + m); let ph = R(); const o = new Sine();
  voice(bus, t, 0.22, { gain, pan, send: 0.2, pp: 0.6, atk: 0.002, rel: 0.03 }, tt => {
    ph += f / SR; if (ph >= 1) ph -= 1; const tri = 1 - 4 * Math.abs(ph - 0.5);
    return (tri * 0.7 + o.next(f) * 0.6) * Math.exp(-tt / 0.07);
  });
}
// 카플러스-스트롱 플럭 (올패스로 미세 튜닝)
function ksBuf(f, len, R, bright = 0.6, decay = 0.996) {
  const n = Math.round(len * SR), out = new Float32Array(n), P = SR / f; let L = Math.floor(P - 0.5), d = P - 0.5 - L; if (d < 0.2) { L -= 1; d += 1; }
  const C = (1 - d) / (1 + d), line = new Float64Array(L); let lp = 0, mean = 0;
  for (let i = 0; i < L; i++) { lp += ((R() * 2 - 1) - lp) * bright; line[i] = lp; mean += lp; } mean /= L; for (let i = 0; i < L; i++) line[i] -= mean;
  let idx = 0, prev = 0, x1 = 0, y1 = 0;
  for (let k = 0; k < n; k++) { const y = line[idx]; out[k] = y; const avg = decay * 0.5 * (y + prev); prev = y; const ap = C * avg + x1 - C * y1; x1 = avg; y1 = ap; line[idx] = ap; idx++; if (idx >= L) idx = 0; }
  return out;
}
function ks(bus, t, m, o = {}) {
  const R = rng('ks' + t + m), b = ksBuf(mtof(m), o.len ?? 0.5, R, o.bright ?? 0.6, o.decay ?? 0.995);
  voice(bus, t, o.len ?? 0.5, { gain: o.gain ?? 0.28, pan: o.pan || 0, send: o.send ?? 0.25, pp: o.pp || 0, atk: 0.001, rel: 0.06 }, (tt, k) => b[k] * pumpAt(t + tt, o.depth ?? 1));
}
function subSine(bus, t, f, len, tau, gain) { const o = new Sine(); voice(bus, t, len, { gain, atk: 0.003, rel: Math.min(0.2, len / 3) }, tt => o.next(f * (1 + 0.15 * Math.exp(-tt / 0.03))) * Math.exp(-tt / tau)); }

// ---------- 효과음 신스 (SFX 레시피) ----------
function bell(bus, t, f, o = {}) {
  const tau = o.tau ?? 0.18, len = o.len ?? Math.min(2.5, tau * 6), a = new Sine(), b = new Sine(), c = new Sine();
  voice(bus, t, len, { gain: o.gain ?? 0.42, pan: o.pan || 0, send: o.send ?? 0.25, atk: 0.0015, rel: Math.min(0.15, len / 4) }, tt =>
    a.next(f) * Math.exp(-tt / tau) + 0.5 * b.next(2 * f) * Math.exp(-tt / (tau * 0.6)) + 0.158 * c.next(3 * f) * Math.exp(-tt / (tau * 0.4)));
}
function whoosh(bus, t, dur, o = {}) {
  const R = rng('wh' + t + (o.key || '')), a = new SVF(), b = new SVF(), lp = new SVF(), f0 = o.f0 ?? 600, f1 = o.f1 ?? 3000;
  const pf = o.pan1 != null ? (tt => o.pan0 + (o.pan1 - o.pan0) * clamp(tt / dur, 0, 1)) : null;
  voice(bus, t, dur, { gain: o.gain ?? 0.4, pan: o.pan || 0, panFn: pf, send: o.send ?? 0.15, atk: 0.003, rel: o.rel ?? 0.01 }, tt => {
    const u = tt / dur, fc = f0 * Math.pow(f1 / f0, u), x = R() * 2 - 1; a.run(x, fc, 1.5); b.run(x, fc * 2.2, 2.2); lp.run(x, fc * 0.5, 0.7);
    const env = o.rev ? Math.pow(u, 2.2) : Math.pow(Math.sin(Math.PI * u), 1.5);
    return (a.bp * 2.2 + b.bp * 1.0 + lp.lp * 0.35) * env;
  });
}
function pop(bus, t, o = {}) {
  const f0 = o.f0 ?? 400, f1 = o.f1 ?? 900, gl = o.glide ?? 0.03, tau = o.tau ?? 0.04, s = new Sine();
  voice(bus, t, o.len ?? 0.18, { gain: o.gain ?? 0.42, pan: o.pan || 0, send: o.send ?? 0.1, atk: 0.0008, rel: 0.03 }, tt => {
    const f = tt < gl ? f0 * Math.pow(f1 / f0, tt / gl) : f1; return s.next(f) * Math.exp(-tt / tau);
  });
}
function boing(bus, t, o = {}) {
  const s = new Sine(), h = new Sine(), wob = 9 + rng('boing' + t)() * 3, base = o.f ?? 300; let wp = 0;
  voice(bus, t, 0.55, { gain: o.gain ?? 0.36, pan: o.pan || 0, send: 0.12, atk: 0.002, rel: 0.06 }, tt => {
    wp += TAU * wob / SR; const f = base * (1 + 0.22 * Math.exp(-tt / 0.16) * Math.sin(wp)) * (1 + 0.15 * Math.exp(-tt / 0.03));
    return (s.next(f) + 0.25 * h.next(2 * f)) * Math.exp(-tt / 0.22);
  });
}
function click(bus, t, f, o = {}) {
  const R = rng('clk' + t + f), fl = new SVF(), s = new Sine();
  voice(bus, t, o.len ?? 0.012, { gain: o.gain ?? 0.25, pan: o.pan || 0, send: o.send ?? 0.05, atk: 0.0003, rel: 0.003 }, tt => { fl.run(R() * 2 - 1, f, 2); return (fl.bp * 2 + s.next(f) * 0.6) * Math.exp(-tt / 0.0025); });
}
function key(bus, t) {
  const R = rng('key' + t), fc = 2500 + R() * 1500, pan = (R() - 0.5) * 0.4, fl = new SVF(), s = new Sine();
  voice(bus, t, 0.014, { gain: 0.2, pan, send: 0.05, atk: 0.0003, rel: 0.003 }, tt => { fl.run(R() * 2 - 1, fc, 2.2); return fl.bp * 2.4 * Math.exp(-tt / 0.004); });
  voice(bus, t, 0.008, { gain: 0.3, pan, atk: 0.0005, rel: 0.003 }, tt => s.next(140) * Math.exp(-tt / 0.003));
}
function tick(bus, t, o = {}) { const s = new Sine(), f = o.f ?? 3000; voice(bus, t, 0.006, { gain: o.gain ?? 0.16, pan: o.pan || 0, send: 0.04, atk: 0.0003, rel: 0.002 }, tt => s.next(f) * Math.exp(-tt / 0.0018)); }
function thunk(bus, t, f, o = {}) {
  const s = new Sine(), tau = o.tau ?? 0.06; voice(bus, t, o.len ?? 0.22, { gain: o.gain ?? 0.5, pan: o.pan || 0, send: 0.06, atk: 0.0008, rel: 0.04 }, tt => Math.tanh(1.4 * s.next(f * (1 + 0.5 * Math.exp(-tt / 0.012))) * Math.exp(-tt / tau)));
  click(bus, t, 1500, { gain: (o.gain ?? 0.5) * 0.35, pan: o.pan || 0 });
}
function thock(bus, t, o = {}) { const s = new Sine(); voice(bus, t, 0.05, { gain: o.gain ?? 0.3, pan: o.pan || 0, atk: 0.0005, rel: 0.01 }, tt => s.next(280) * Math.exp(-tt / 0.012)); click(bus, t, 1600, { gain: (o.gain ?? 0.3) * 0.5, pan: o.pan || 0 }); }
function tock(bus, t, o = {}) { const a = new Sine(), b = new Sine(); voice(bus, t, 0.06, { gain: o.gain ?? 0.3, pan: o.pan || 0, send: 0.08, atk: 0.0005, rel: 0.01 }, tt => (a.next(900) + 0.35 * b.next(2300)) * Math.exp(-tt / 0.013)); }
function snap(bus, t, gain = 0.5, f = 1600) {
  for (const p of [-0.3, 0.3]) { const R = rng('snap' + t + p), fl = new SVF(); voice(bus, t, 0.15, { gain: gain * 0.7, pan: p, send: 0.12, atk: 0.0005, rel: 0.03 }, tt => { fl.run(R() * 2 - 1, f, 0.8); return fl.bp * 2 * Math.exp(-tt / 0.03); }); }
}
function impact(bus, t, o = {}) {
  const R = rng('imp' + t + (o.key || '')), lp = new SVF(), s = new Sine(), f = o.f ?? rootHz(t), len = o.len ?? 0.8;
  voice(bus, t, len, { gain: o.gain ?? 1, send: o.send ?? 0.08, atk: 0.0008, rel: 0.12 }, tt => {
    const boom = s.next(f * (1 + 0.8 * Math.exp(-tt / 0.035))) * Math.exp(-tt / (o.tau ?? 0.28));
    let nz = 0; if (tt < 0.05) { lp.run(R() * 2 - 1, 2800, 0.7); nz = lp.lp * 1.8 * Math.exp(-tt / 0.012) * (1 - tt / 0.05); }
    return Math.tanh(1.4 * (boom * 0.95 + nz)) / Math.tanh(1.4);
  });
  DUCKS.push([t, -4]);
}
function slam(bus, t, semis) {
  const s = new Sine(), k = Math.pow(2, semis / 12);
  voice(bus, t, 0.4, { gain: 0.8, send: 0.06, atk: 0.0008, rel: 0.06 }, tt => Math.tanh(1.5 * s.next((60 + 80 * Math.exp(-tt / 0.03)) * k) * Math.exp(-tt / 0.12)));
  snap(bus, t, 0.45, 2200 * k); DUCKS.push([t, -4]);
}
function subBoom(bus, t, f, o = {}) { subSine(bus, t, f, o.len ?? 1.3, o.tau ?? 0.42, o.gain ?? 0.95); DUCKS.push([t, -4]); }
function beep(bus, t, f, len = 0.12, gain = 0.26) { const a = new Sine(), b = new Sine(); voice(bus, t, len, { gain, send: 0.12, atk: 0.003, rel: 0.02 }, () => a.next(f) + 0.15 * b.next(2 * f)); }
function blip(bus, t, f, o = {}) {
  const q = new Sq(), fl = new SVF(); voice(bus, t, o.len ?? 0.09, { gain: o.gain ?? 0.16, pan: o.pan || 0, send: 0.15, atk: 0.001, rel: 0.02 }, tt => fl.run(q.next(f), 4000, 0.7) * Math.exp(-tt / (o.tau ?? 0.035)));
}
function buzz(bus, t) { const a = new Sq(0), b = new Sq(0.3), fl = new SVF(), fl2 = new SVF(); voice(bus, t, 0.28, { gain: 0.3, atk: 0.003, rel: 0.03, send: 0.05 }, () => { const x = a.next(196) + b.next(208); return fl2.run(fl.run(x, 1500, 0.7), 1500, 0.7); }); }
function buzzer(bus, t) { const a = new Saw(0), b = new Saw(0.4), fl = new SVF(); voice(bus, t, 0.45, { gain: 0.26, atk: 0.004, rel: 0.06, send: 0.08 }, tt => fl.run(a.next(140) + b.next(147), 2600, 0.7) * (1 - 0.2 * tt / 0.45)); }
function sparkle(bus, t0, t1, n, o = {}) {
  const R = rng('spk' + t0 + (o.key || ''));
  for (let i = 0; i < n; i++) { const t = t0 + R() * (t1 - t0) * (o.front ? R() : 1), f = (o.fmin ?? 3000) + R() * ((o.fmax ?? 6000) - (o.fmin ?? 3000)), s = new Sine(), p = (R() - 0.5) * 1.4, g = (o.gain ?? 0.09) * (0.5 + 0.5 * R());
    voice(bus, t, 0.2, { gain: g, pan: p, send: 0.35, atk: 0.001, rel: 0.03 }, tt => s.next(f) * Math.exp(-tt / 0.045)); }
}
function shimmer(bus, t, len, gain = 1, key = '') {
  const R = rng('shim' + t + key), notes = [96, 100, 103, 105, 108];
  const n = Math.max(6, Math.round(len * 22));
  for (let i = 0; i < n; i++) { const tt0 = t + Math.pow(R(), 1.3) * len, s = new Sine(), f = mtof(notes[Math.floor(R() * notes.length)]), p = (R() - 0.5) * 1.5;
    voice(bus, tt0, 0.3, { gain: 0.05 * gain * (0.4 + 0.6 * R()), pan: p, send: 0.4, atk: 0.002, rel: 0.05 }, tt => s.next(f) * Math.exp(-tt / 0.07)); }
  const fl = new SVF(); voice(bus, t, len, { gain: 0.05 * gain, send: 0.3, atk: 0.01, rel: 0.05, panFn: tt => 0.4 * Math.sin(TAU * tt / len) }, tt => { fl.run(R() * 2 - 1, 9000, 0.7); return fl.hp * Math.sin(Math.PI * tt / len); });
}
function crackle(bus, t, len, gain = 0.35) {
  const R = rng('fl' + t);
  for (let i = 0; i < 45; i++) { const tg = t + R() * len, d = 0.002 + R() * 0.005, fc = 1000 + R() * 4000, fl = new SVF(), a = gain * (0.3 + 0.7 * R()) * (1 - (tg - t) / len * 0.6), p = (R() - 0.5) * 0.8;
    voice(bus, tg, d, { gain: a, pan: p, send: 0.1, atk: 0.0004, rel: 0.001 }, () => { fl.run(R() * 2 - 1, fc, 1.5); return fl.bp * 2.5; }); }
  const fl = new SVF(); voice(bus, t, len, { gain: gain * 0.25, atk: 0.02, rel: 0.1 }, tt => { fl.run(R() * 2 - 1, 900, 0.6); return fl.lp * Math.exp(-tt / 0.15); });
}
function glassCrack(bus, t) {
  const R = rng('glass' + t);
  for (let i = 0; i < 5; i++) { const tg = t + i * 0.006 + R() * 0.004, fl = new SVF(); voice(bus, tg, 0.012, { gain: 0.22, pan: 0.15 + (R() - 0.5) * 0.3, send: 0.15, atk: 0.0003, rel: 0.003 }, tt => { fl.run(R() * 2 - 1, 5000, 0.7); return fl.hp * 2 * Math.exp(-tt / 0.003); }); }
  for (const f of [3900, 5700]) { const s = new Sine(); voice(bus, t, 0.06, { gain: 0.08, pan: 0.2, send: 0.2, atk: 0.0005, rel: 0.01 }, tt => s.next(f) * Math.exp(-tt / 0.012)); }
}
function whistle(bus, t0, t1) { const s = new Sine(), d = t1 - t0; let vp = 0; voice(bus, t0, d + 0.02, { gain: 0.16, send: 0.2, atk: 0.008, rel: 0.02, panFn: tt => 0.3 - 0.4 * tt / d }, tt => { vp += TAU * 7 / SR; return s.next(2400 * Math.pow(800 / 2400, clamp(tt / d, 0, 1)) * (1 + 0.01 * Math.sin(vp))); }); }
function reverseCymbal(bus, t0, t1) {
  const R = rng('rev' + t0), fl = new SVF(), fl2 = new SVF(), d = t1 - t0;
  voice(bus, t0, d, { gain: 0.32, atk: 0.005, rel: 0.0008, send: 0.05, panFn: tt => -0.2 + 0.4 * tt / d }, tt => { const x = R() * 2 - 1; fl.run(x, 5000, 0.7); fl2.run(fl.hp, 5000, 0.7); const u = tt / d; return fl2.hp * 1.6 * (Math.exp(4 * u) - 1) / (Math.exp(4) - 1); });
}
function zip(bus, t, pan = 0) { whoosh(bus, t, 0.07, { f0: 1200, f1: 7000, gain: 0.22, pan, key: 'zip', send: 0.05 }); }
function hop(bus, t, pan) { const s = new Sine(); voice(bus, t, 0.12, { gain: 0.16, pan, send: 0.1, atk: 0.002, rel: 0.03 }, tt => s.next(350 * Math.pow(1000 / 350, clamp(tt / 0.09, 0, 1))) * Math.exp(-tt / 0.06)); }
function flutter(bus, t) { const R = rng('flut' + t), fl = new SVF(); voice(bus, t, 0.25, { gain: 0.3, send: 0.1, atk: 0.003, rel: 0.02, panFn: tt => -0.5 + 4 * tt }, tt => { fl.run(R() * 2 - 1, 2500, 1.2); return fl.bp * 2 * Math.sin(Math.PI * tt / 0.25) * (0.5 + 0.5 * Math.sign(Math.sin(TAU * 28 * tt))); }); }
function kaChing(bus, t) {
  click(bus, t, 3000, { gain: 0.3, len: 0.02 });
  bell(bus, t + 0.03, 1568, { tau: 0.3, gain: 0.3, pan: -0.15, send: 0.3 }); bell(bus, t + 0.03, 2093, { tau: 0.3, gain: 0.28, pan: 0.15, send: 0.3 });
  const R = rng('kach' + t), fl = new SVF(); voice(bus, t + 0.03, 0.5, { gain: 0.12, send: 0.3, atk: 0.002, rel: 0.08 }, tt => { fl.run(R() * 2 - 1, 7000, 0.7); return fl.hp * Math.exp(-tt / 0.12) * (0.6 + 0.4 * Math.sin(TAU * 31 * tt)); });
}

// ---------- 버스 ----------
const SEGS = [mkBus(true), mkBus(true), mkBus(true), mkBus(true)];   // 음악: 훅+빌드 | 드롭(테이프 스톱) | 결과+랭킹 | 나머지
const [S0, S1, S2, S3] = SEGS;
const SFX = mkBus(false);
const DUCKS = [];                      // [t, dB] 큰 타격에 음악 -4 dB
const MDIPS = [];                      // [t0, t1, dB] 큐가 지시한 음악 더킹

// ---------- 편곡 (music 설명의 마디별 지시) ----------
const Q = [];                          // 킥 목록을 먼저 다 모은 뒤(펌핑 계산용) 나머지를 렌더
const later = f => Q.push(f);
const LEADPAT = [0, 1, 2, 1];
function fourFloor(bus, t0, t1, o = {}) {
  for (let t = t0; t < t1 - 1e-9; t += 0.5) {
    const beat = Math.round(((t % 2) + 2) % 2 / 0.5) % 4, off = t + 0.25;
    kick(bus, t, 1);
    later(() => {
      if (beat === 1 || beat === 3) clap(bus, t);
      if (!(o.noOffAfter != null && off >= o.noOffAfter)) hat(bus, off, beat === 3, 1);
      if (o.shaker !== false) for (let k = 0; k < 4; k++) shaker(bus, t + k * 0.125, k === 2 ? 1 : 0.55);
      if (o.bass !== false) { const ch = chordAt(t); bassNote(bus, t, 0.235, ch.bass); bassNote(bus, off, 0.235, chordAt(off).bass); }
      if (o.lead && !(o.leadSkip || []).some(([a, b]) => off >= a - 1e-9 && off < b)) { const ch = chordAt(off); lead(bus, off, ch.t[LEADPAT[beat]] + 12); }
    });
  }
}
function arrange() {
  // Bar 1 (0-2) 훅: Am 스탭 0 / 0.5 / 1.0 + 킥 + 서브, 3박에 클랩 (크래시는 큐 1.0)
  for (const t of [0, 0.5, 1.0]) { kick(S0, t, 1); later(() => { stab(S0, t, [57, 60, 64, 69]); subSine(S0, t, 55, 0.45, 0.2, 0.35); }); }
  later(() => clap(S0, 1.0, 1));
  // Bar 2 (2-4) 빌드: 패드 LPF 400 -> 4000, 매 박 킥, 스네어 롤 8분 -> 16분 -> 32분, 노이즈 라이저
  for (const t of [2, 2.5, 3, 3.5]) kick(S0, t, 0.95);
  later(() => {
    pad(S0, 2.0, 3.9375, { cut: T => 400 * Math.pow(10, (T - 2) / 1.9375), gain: T => 0.7 + 0.5 * (T - 2) / 1.9375, atk: 0.06, hardEnd: true });
    bassNote(S0, 2.0, 1.0, 29, { depth: 0.45, rel: 0.03 }); bassNote(S0, 3.0, 0.9375, 31, { depth: 0.45, rel: 0.004 });
    const roll = [2.5, 2.75]; for (let k = 0; k < 4; k++) roll.push(3.0 + k * 0.125); for (let k = 0; k < 6; k++) roll.push(3.5 + k * 0.0625);
    roll.forEach(t => snare(S0, t, 0.3 + 0.7 * Math.pow((t - 2.5) / 1.375, 1.4), 0.36));
    riser(S0, 2.0, 3.9375, 0.12, 'build');
  });
  // Bars 3-5 (4-10) 드롭: 포온더플로어 + 클랩 + 오프 하이햇 + 16분 셰이커 + 4박 '앤' 오픈햇, 펌핑 8분 베이스, 오프비트 리드
  fourFloor(S1, 4.0, 9.0, { lead: true });
  kick(S1, 9.0, 1); kick(S1, 9.5, 1);                         // 9.5 킥은 테이프 스톱이 읽는 재료
  later(() => {
    pad(S1, 4.0, 10.0, { gain: () => 0.55, cut: () => 1200, send: 0.25 });
    crash(S1, 8.0, 0.7);
    for (let k = 0; k < 4; k++) bassNote(S1, 9.0 + k * 0.25, 0.235, chordAt(9.0).bass);
    clap(S1, 9.5);
    // 9.0-9.5 16분 탐 + 스네어 필
    const fill = ['T', 'S', 'T', 'S', 'T', 'S', 'S', 'S'], toms = [196, 165, 131];
    let ti = 0; fill.forEach((x, k) => { const t = 9.0 + k * 0.0625; if (x === 'T') tom(S1, t, toms[ti], 0.9, 0.45, 0.3 - ti++ * 0.3); else snare(S1, t, 0.55 + k * 0.06, 0.3); });
    lead(S1, 9.25, 76); lead(S1, 9.75, 72);
  });
  // Bar 6 (10-12) 결과: 그루브 복귀, 10.5 부터 8분 사각 리드 팡파르 G4-C5-E5-G5
  fourFloor(S2, 10.0, 14.0, { lead: true, leadSkip: [[10.5, 11.8], [12.5, 13.5]] });
  later(() => {
    pad(S2, 10.0, 14.0, { gain: () => 0.55, cut: () => 1200, send: 0.25, hardEnd: true });
    [[10.5, 67], [10.75, 72], [11.0, 76]].forEach(([t, m]) => lead(S2, t, m, 0.24, { tau: 0.5, gain: 0.07, cut: 3800 }));
    lead(S2, 11.25, 79, 0.5, { tau: 0.6, gain: 0.07, cut: 3800, rel: 0.12 });
    // Bar 7 (12-14) 랭킹: 13.0 C6 정점 + 브라스 스탭
    [[12.5, 76], [12.75, 79]].forEach(([t, m]) => lead(S2, t, m, 0.24, { tau: 0.5, gain: 0.07, cut: 3800 }));
    lead(S2, 13.0, 84, 0.45, { tau: 0.5, gain: 0.07, cut: 4200, rel: 0.12 });
    brass(S2, 13.0, [72, 76, 79, 84], 0.4, 1.1);
  });
  // Bar 8 (14-16) 브레이크다운: 14.0-14.5 음악 없음(서브 붐은 큐), 14.5 부터 16분 플럭 A3-C4-E4-A4 + 핑퐁
  later(() => {
    for (let k = 0; k < 12; k++) { const t = 14.5 + k * 0.125; softPluck(S3, t, [57, 60, 64, 69][k % 4], 0.09 + 0.05 * k / 11, k % 2 ? 0.2 : -0.2); }
    pad(S3, 15.0, 16.0, { notes: [57, 60, 64], cut: T => 500 * Math.pow(2.8, T - 15), gain: T => 0.2 + 0.5 * (T - 15), atk: 0.6, send: 0.35 });
  });
  // Bars 9-12 (16-24) 기능 그루브(가볍게): 킥 1·3박 + 2박 '앤' 고스트, 클랩 2·4, 16분 하이햇(8분 강세), 지속 베이스 + 옥타브 팝, 플럭 아르페지오 + 로우패스 패드
  for (let b = 16; b < 24; b += 2) { kick(S3, b, 1); kick(S3, b + 0.75, 0.45); kick(S3, b + 1, 1); }
  later(() => {
    for (let b = 16; b < 24; b += 2) {
      clap(S3, b + 0.5, 0.9); clap(S3, b + 1.5, 0.9);
      for (let k = 0; k < 16; k++) hat(S3, b + k * 0.125, false, k % 2 ? 0.45 : (k % 4 === 2 ? 1 : 0.75), 0.11);
      const ch = chordAt(b);
      bassNote(S3, b, 1.98, ch.bass, { depth: 0.55, rel: 0.05, cut: 520 });
      for (const p of [0.75, 1.75]) bassNote(S3, b + p, 0.12, ch.bass + 12, { depth: 1, gain: 0.22, cut: 900 });
      const seq = [ch.t[0], ch.t[1], ch.t[2], ch.t[0] + 12, ch.t[1] + 12, ch.t[0] + 12, ch.t[2], ch.t[1]];
      for (let k = 0; k < 16; k++) { const t = b + k * 0.125; if (b === 22 && t >= 23.0 && t < 23.25) continue; softPluck(S3, t, seq[k % 8], k % 2 ? 0.065 : 0.085, k % 2 ? 0.25 : -0.25); }
    }
    pad(S3, 16.0, 24.0, { cut: T => T < 22 ? 1200 : 1200 * Math.pow(5, Math.min(1, (T - 22) / 1.5)), gain: () => 0.7 });
    // 23.0 펜타토닉 KS 플럭 런 C5 -> E6 (32분)
    [72, 74, 76, 79, 81, 84, 86, 88].forEach((m, k) => ks(S3, 23.0 + k * 0.03125, m, { gain: 0.2, pan: -0.4 + k * 0.1, len: 0.6, send: 0.3 }));
  });
  // Bars 13-15 (24-30) 선생님: 포온더플로어 복귀, 밝은 KS 플럭 8분, 15마디 3박부터 스네어 롤
  fourFloor(S3, 24.0, 29.5, { lead: false });
  kick(S3, 29.5, 1);
  later(() => {
    bassNote(S3, 29.5, 0.235, chordAt(29.5).bass); hat(S3, 29.25, false, 0.8);
    pad(S3, 24.0, 29.75, { cut: () => 1800, gain: () => 0.55, hardEnd: true, rel: 0.1 });
    for (let t = 24.0; t < 29.75 - 1e-9; t += 0.25) {
      const ch = chordAt(t), k = Math.round((t % 2) / 0.25), seq = [ch.t[0], ch.t[1], ch.t[2], ch.t[0] + 12, ch.t[2], ch.t[1], ch.t[0] + 12, ch.t[2]];
      ks(S3, t, seq[k] + 12, { gain: k % 2 ? 0.17 : 0.22, pan: k % 2 ? 0.35 : -0.35, bright: 0.75, len: 0.35, depth: 0.7, pp: 0.25 });
    }
    for (let k = 0; k < 12; k++) snare(S3, 29.0 + k * 0.0625, 0.3 + 0.7 * k / 11, 0.28);
  });
  // Bar 16 (30-32) 피날레: 30.0 C 코드 히트(패드+베이스+크래시+브라스), 박마다 킥, 30.5 / 31.5 클랩, 31.0 F, 31.5 G, 31.75 이후 드럼 멈춤
  for (const t of [30, 30.5, 31, 31.5]) kick(S3, t, 1);
  later(() => {
    crash(S3, 30.0, 1, 0.28); brass(S3, 30.0, [60, 64, 67, 72, 76], 0.45, 1.1);
    pad(S3, 30.0, 32.0, { cut: () => 2500, gain: () => 0.85, atk: 0.01, rel: 0.12, send: 0.3 });
    for (const [a, b] of [[30, 31], [31, 31.5], [31.5, 32]]) bassNote(S3, a, b - a, chordAt(a).bass, { depth: 0.5, rel: 0.03 });
    clap(S3, 30.5); clap(S3, 31.5);
    for (let t = 30.25; t <= 31.75 + 1e-9; t += 0.5) hat(S3, t, false, 0.9);
    for (let t = 30.5; t < 32 - 1e-9; t += 0.25) { const ch = chordAt(t), k = Math.round((t % 2) / 0.25); ks(S3, t, [ch.t[0], ch.t[1], ch.t[2], ch.t[1]][k % 4] + 12, { gain: 0.16, pan: k % 2 ? 0.35 : -0.35, bright: 0.7, len: 0.35 }); }
    // Bar 17 (32-34) 링아웃: 마지막 C 장조 코드(패드 + 서브 + 부드러운 크래시), 긴 리버브 꼬리
    pad(S3, 32.0, 34.0, { notes: [48, 55, 60, 64, 67, 72], cut: T => 2400 * Math.pow(0.4, Math.min(1, (T - 32) / 1.6)), gain: T => Math.exp(-(T - 32) / 1.6), atk: 0.01, send: 0.5, hardEnd: true, mul: 0.95 });
    subSine(S3, 32.0, mtof(36), 2.0, 0.8, 0.45);
    crash(S3, 32.0, 0.5, 0.22, 2.0);
    [60, 64, 67, 72].forEach((m, k) => ks(S3, 32.0 + k * 0.02, m + 12, { gain: 0.12, pan: -0.3 + 0.2 * k, len: 1.4, decay: 0.998, send: 0.5 }));
  });
  for (const f of Q) f();
}

// ---------- 큐 해석 (cues 가 단일 기준) ----------
const toTime = s => { const m = /\bto (\d+(?:\.\d+)?)/.exec(s); return m ? +m[1] : null; };
function series(t, end, step, fn) { let k = 0; for (let x = t; x < end - 1e-6; x += step) fn(x, k++); }
const RULES = [
  [/^silence/i, () => {}],                                                      // 마스터 게이트가 3.9375-4.0 을 완전 무음으로
  [/^tail fade/i, () => {}],                                                    // 마스터 페이드 33-34
  [/tape-stop/i, () => {}],                                                     // 음악 버스에서 처리
  [/^(final c chord|fanfare stab|pluck run|kick)\b/i, () => {}],                // 편곡(음악 버스)에 있음
  [/^music duck -(\d+(?:\.\d+)?) dB (\d+(?:\.\d+)?) s/i, (t, m) => MDIPS.push([t, t + +m[2], -m[1]])],
  [/^slam hit \+(\d+) st/i, (t, m) => slam(SFX, t, +m[1])],
  [/^slam hit/i, t => slam(SFX, t, 0)],
  [/^big c hit/i, t => impact(SFX, t, { f: mtof(36), gain: 1 })],
  [/^big hit/i, t => { impact(SFX, t, { gain: 1 }); snap(SFX, t, 0.5); }],
  [/^combo impact/i, t => { impact(SFX, t, { gain: 1 }); snap(SFX, t, 0.45, 1300); }],
  [/^drums back impact/i, t => impact(SFX, t, { gain: 0.9 })],
  [/^small hit/i, t => { impact(SFX, t, { gain: 0.5, len: 0.4, tau: 0.12, key: 's' }); snap(SFX, t, 0.25, 2000); }],
  [/^impact/i, t => impact(SFX, t, { gain: 0.9 })],
  [/^logo slam/i, t => slam(SFX, t, 0)],
  [/^(soft )?crash/i, (t, m) => crash(SFX, t, m[1] ? 0.5 : 1, 0.3)],
  [/^sub boom(?: (\d+) Hz)?/i, (t, m) => subBoom(SFX, t, m[1] ? +m[1] : rootHz(t))],
  [/^sub hit/i, t => subBoom(SFX, t, rootHz(t), { len: 0.7, tau: 0.22, gain: 0.8 })],
  [/^reverse cymbal/i, (t, m, tok, cue) => reverseCymbal(SFX, t, toTime(cue) ?? t + 0.25)],
  [/^falling whistle/i, (t, m, tok) => whistle(SFX, t, toTime(tok) ?? t + 0.14)],
  [/^crown ting/i, t => { bell(SFX, t, mtof(100), { tau: 0.12, gain: 0.26, pan: 0.2 }); bell(SFX, t + 0.03, mtof(103), { tau: 0.12, gain: 0.2, pan: 0.25 }); }],
  [/boing/i, (t, m, tok) => boing(SFX, t, { pan: /mascot/i.test(tok) ? 0.25 : 0 })],
  [/^12 micro-pops on 32nds/i, (t, m, tok) => { const R = rng('micro'), sc = [84, 86, 88, 91, 93]; series(t, (toTime(tok) ?? t + 0.6875) + 0.01, 0.0625, (x, k) => { const f = mtof(sc[Math.floor(R() * 5)]); pop(SFX, x, { f0: f * 0.5, f1: f, gain: 0.16, tau: 0.02, glide: 0.015, len: 0.08, pan: -0.5 + k / 11 }); }); }],
  [/whoosh|swish/i, (t, m, tok, cue) => {
    let dur = toTime(tok) != null ? toTime(tok) - t : /swish/i.test(tok) ? 0.2 : 0.35, gain = 0.38, f0 = 600, f1 = 2800, o = {};
    if (/up|rising|upward|expand|zoom|push|stripes|tagline/i.test(tok)) { f0 = 400; f1 = 4500; }
    if (/collapse|card-roll/i.test(tok)) { f0 = 3000; f1 = 900; }
    if (/soft/i.test(tok)) gain *= 0.5;
    if (/card-roll/i.test(tok)) { dur = 0.18; gain = 0.24; o.pan = Math.round(t * 2) % 2 ? 0.4 : -0.4; }
    if (/expand|UI|tagline|underline/i.test(tok)) dur = 0.25;
    if (t < SILENCE[0] && t + dur > SILENCE[0]) dur = SILENCE[0] - t;
    if (/skew-wipe|R->L/i.test(tok)) { o.pan0 = 0.8; o.pan1 = -0.8; }
    if (/reverse swish/i.test(tok)) { o.rev = true; dur = 0.25; f0 = 2500; f1 = 6000; gain = 0.28; }
    if (/doors/i.test(tok)) { whoosh(SFX, t, 0.35, { gain: 0.3, pan0: -0.1, pan1: -0.85, key: 'dl', f0: 500, f1: 2500 }); whoosh(SFX, t, 0.35, { gain: 0.3, pan0: 0.1, pan1: 0.85, key: 'dr', f0: 520, f1: 2600 }); return; }
    whoosh(SFX, t, dur, Object.assign({ gain, f0, f1, key: tok }, o));
  }],
  [/pop/i, (t, m, tok) => {
    const n = noteMidi(tok);
    if (n != null) return pop(SFX, t, { f0: mtof(n) * 0.5, f1: mtof(n), gain: 0.3, pan: (n - 79) / 30, send: 0.15 });
    if (/bubble/i.test(tok)) return pop(SFX, t, { f0: 500, f1: 1500, tau: 0.03, gain: 0.34, pan: 0.2 });
    if (/chip|pill/i.test(tok)) return pop(SFX, t, { f0: 600, f1: 1300, tau: 0.03, gain: 0.3, pan: rng('pp' + t)() - 0.5 });
    if (/slam/i.test(tok)) { pop(SFX, t, { f0: 300, f1: 700, gain: 0.42 }); thunk(SFX, t, 110, { gain: 0.35 }); return; }
    pop(SFX, t, { gain: /CTA|lockup/i.test(tok) ? 0.45 : 0.36, pan: /mascot/i.test(tok) ? 0.25 : 0 });
  }],
  [/beep(?: (\d+) Hz)?/i, (t, m, tok) => { const f = m[1] ? +m[1] : 880; beep(SFX, t, f, /GO/.test(tok) ? 0.25 : 0.12, /GO/.test(tok) ? 0.3 : 0.24); }],
  [/^flip-clack/i, t => { click(SFX, t, 2200, { gain: 0.3, pan: -0.15 }); click(SFX, t + 0.018, 1700, { gain: 0.22, pan: 0.15 }); thock(SFX, t + 0.018, { gain: 0.15 }); }],
  [/^riser to/i, (t, m, tok) => riser(SFX, t, toTime(tok), 0.32)],
  [/^tick wave/i, (t, m, tok, cue) => { const end = toTime(cue) ?? t + 0.75; series(t, end, 0.0625, (x, k) => { const u = (x - t) / (end - t); tick(SFX, x, { f: 2000 * Math.pow(2, u), gain: 0.14 * Math.sin(Math.PI * (u + 0.04)), pan: -0.6 + 1.2 * u }); }); }],
  [/^(odometer|score|submission|marker|chip) ticks/i, (t, m, tok) => {
    const f = { odometer: 2200, score: 2600, submission: 3000, marker: 2800, chip: 3400 }[m[1].toLowerCase()];
    const cnt = /x(\d+)/.exec(tok), to = toTime(tok), step = /submission/i.test(tok) ? 0.125 : 0.0625;
    const end = cnt ? t + (+cnt[1] - 0.5) * step : to ?? 9.5;
    series(t, end, step, (x, k) => tick(SFX, x, { f, gain: 0.1, pan: /odometer/i.test(tok) ? 0.3 : -0.2 + 0.1 * k }));
  }],
  [/^glass-crack tick/i, t => glassCrack(SFX, t)],
  [/tick/i, (t, m, tok) => tick(SFX, t, { gain: /pulse|settle/i.test(tok) ? 0.12 : 0.15, pan: (rng('tk' + t)() - 0.5) * 0.5 })],
  [/^tap( click)?$/i, t => { thock(SFX, t, { gain: 0.18 }); click(SFX, t, 2500, { gain: 0.12 }); }],
  [/^WRONG buzz/i, t => buzz(SFX, t)],
  [/^time-up buzzer/i, t => buzzer(SFX, t)],
  [/^(landing )?ding ([A-G]\d)/i, (t, m) => { const n = noteMidi(m[2]); bell(SFX, t, mtof(n), { tau: 0.2, gain: 0.42, pan: clamp((n - 90) / 18, -0.4, 0.4), send: 0.28 }); }],
  [/^processing blips/i, (t, m, tok) => { const R = rng('proc'); series(t + 0.0625, toTime(tok) ?? 16, 0.0625, x => blip(SFX, x, mtof([81, 84, 86, 88][Math.floor(R() * 4)]), { gain: 0.1, len: 0.05, tau: 0.015, pan: (R() - 0.5) * 0.6 })); }],
  [/^success blip ([A-G]\d)\+([A-G]\d)/i, (t, m) => { blip(SFX, t, mtof(noteMidi(m[1])), { gain: 0.18 }); blip(SFX, t + 0.0625, mtof(noteMidi(m[2])), { gain: 0.18 }); }],
  [/^data blip/i, t => blip(SFX, t, mtof(100), { gain: 0.1, len: 0.05, tau: 0.012, pan: 0.3 })],
  [/^knob blip/i, t => { const s = new Sine(); voice(SFX, t, 0.08, { gain: 0.2, pan: -0.2, send: 0.1, atk: 0.001, rel: 0.02 }, tt => s.next(900 * Math.pow(1.6, clamp(tt / 0.05, 0, 1))) * Math.exp(-tt / 0.03)); }],
  [/^blip ([A-G]\d)/i, (t, m) => blip(SFX, t, mtof(noteMidi(m[1])), { gain: 0.2, pan: -0.3 + (t - 9) * 1.2 })],
  [/^ka-ching/i, t => kaChing(SFX, t)],
  [/^flame crackle/i, t => crackle(SFX, t, 0.4)],
  [/^thud/i, t => thunk(SFX, t, 85, { gain: 0.55, tau: 0.07, len: 0.25 })],
  [/^confetti sparkle/i, (t, m, tok) => sparkle(SFX, t, toTime(tok) ?? t + 1, 15, { gain: 0.1, key: 'conf' })],
  [/^(sparkle shimmer|ring shimmer|sheen shimmer|shine)/i, (t, m, tok) => {
    const k = m[1].toLowerCase(), soft = /soft/i.test(tok);
    const len = k === 'ring shimmer' ? (soft ? 0.8 : 1.1) : k === 'sheen shimmer' ? 0.5 : k === 'shine' ? 0.3 : 0.25;
    shimmer(SFX, t, len, soft ? 0.55 : 1, k);
  }],
  [/^sparkle/i, t => sparkle(SFX, t, t + 0.25, 6, { gain: 0.08, fmin: 4000, fmax: 7000, key: 's' })],
  [/^toggle click/i, t => { click(SFX, t, 1800, { gain: 0.25, pan: -0.2 }); click(SFX, t + 0.03, 2600, { gain: 0.2, pan: -0.2 }); }],
  [/^pedestal thunk( \(higher\))?/i, (t, m) => thunk(SFX, t, m[1] ? 150 : 110, { gain: 0.5, pan: m[1] ? 0.3 : -0.3 })],
  [/^big thunk/i, t => { thunk(SFX, t, 75, { gain: 0.75, tau: 0.12, len: 0.4 }); DUCKS.push([t, -4]); }],
  [/^input bar slam/i, t => { thunk(SFX, t, 95, { gain: 0.55 }); snap(SFX, t, 0.2, 2000); }],
  [/^key$/i, t => key(SFX, t)],
  [/^button click/i, t => { click(SFX, t, 2000, { gain: 0.28 }); thock(SFX, t, { gain: 0.2 }); }],
  [/zip/i, t => zip(SFX, t, -0.4 + (t - 16) * 2)],
  [/^hop take-off/i, t => hop(SFX, t, -0.4 + (t - 17.28) * 0.8)],
  [/thock/i, t => thock(SFX, t, { gain: 0.32 })],
  [/^tock/i, t => tock(SFX, t, { pan: -0.15 })],
  [/^stripe flutter/i, t => flutter(SFX, t)],
  [/^split-flap clatter/i, (t, m, tok, cue) => { const R = rng('flap'), end = toTime(cue) ?? t + 0.6; for (let x = t; x < end; x += 0.012 + R() * 0.02) click(SFX, x, 1800 + R() * 1500, { gain: 0.1 * (1 - 0.6 * (x - t) / (end - t)), pan: (R() - 0.5) * 0.8 }); }],
  [/^(\d+) lock clacks/i, (t, m, tok, cue) => { const n = +m[1], end = toTime(tok) ?? t + 0.625; for (let k = 0; k < n; k++) { const x = t + k * (end - t) / (n - 1); click(SFX, x, 1400, { gain: 0.26, pan: -0.5 + k * 0.2 }); thock(SFX, x, { gain: 0.14, pan: -0.5 + k * 0.2 }); } }],
  [/^live ping/i, t => { bell(SFX, t, mtof(95), { tau: 0.22, gain: 0.26, pan: 0.3, send: 0.35 }); bell(SFX, t + 0.125, mtof(95), { tau: 0.15, gain: 0.1, pan: -0.3, send: 0.35 }); }],
  [/^(?:tap \+ )?bell ([A-G]\d)/i, (t, m) => { const n = noteMidi(m[1]); bell(SFX, t, mtof(n), n >= 96 ? { tau: 0.55, len: 2.4, gain: 0.4, send: 0.45 } : { tau: 0.16, gain: 0.3, pan: 0.2 }); }],
  [/^done pling ([A-G]\d)/i, (t, m) => bell(SFX, t, mtof(noteMidi(m[1])), { tau: 0.25, gain: 0.36, send: 0.3 })],
  [/^submit arpeggio/i, t => [86, 91, 95, 98].forEach((n, k) => bell(SFX, t + 0.0625 + k * 0.03125, mtof(n), { tau: 0.12, gain: 0.18, pan: -0.3 + k * 0.2 }))],
  [/^sonic logo ([A-G]\d)/i, (t, m) => bell(SFX, t, mtof(noteMidi(m[1])), { tau: 0.45, len: 2.2, gain: 0.48, send: 0.35, pan: (noteMidi(m[1]) - 81) / 40 })],
  [/^tom slam (\d+) Hz/i, (t, m) => tom(SFX, t, +m[1], 1, 0.62, 0.45 - (t - 28) * 3.6)],
  [/^success chime/i, t => [91, 95, 98].forEach((n, k) => bell(SFX, t + k * 0.03125, mtof(n), { tau: 0.22, gain: 0.26, pan: -0.2 + 0.2 * k, send: 0.35 }))],
];
function placeCues() {
  const unmatched = [];
  for (const c of SB.cues) {
    const toks = c.sfx.split(/\s\+\s|;\s*/).map(s => s.trim()).filter(Boolean);
    for (const tok of toks) { const r = RULES.find(([re]) => re.test(tok)); if (!r) { unmatched.push(`${c.t}: ${tok}`); continue; } r[1](c.t, r[0].exec(tok), tok, c.sfx); }
  }
  if (unmatched.length) throw new Error('처리 못 한 큐: ' + unmatched.join(' | '));
}

// ---------- 리버브 (FDN 8줄, 입력 HPF 300 Hz) / 핑퐁 / 테이프 스톱 ----------
function fdn(send, out, o = {}) {
  const rt = o.rt ?? 2.2, wet = o.wet ?? 0.35, lens = [1433, 1601, 1867, 2053, 2251, 2399, 2687, 2903].map(x => Math.round(x * (o.size ?? 1)));
  const lines = lens.map(l => new Float32Array(l)), idx = new Int32Array(8), g = lens.map(l => Math.pow(10, -3 * l / (rt * SR))), lp = new Float64Array(8);
  const dampA = Math.exp(-TAU * (o.damp ?? 5500) / SR), hpL = new SVF(), hpR = new SVF();
  const apL = [142, 107, 379, 277].map(l => ({ b: new Float32Array(l), i: 0 })), pre = new Float32Array(Math.round(0.018 * SR)); let pi = 0;
  const clearAt = new Set((o.clearAt || []).map(t => Math.round(t * SR)));
  const sgnL = [1, -1, 1, -1, 1, -1, 1, -1], sgnR = [1, 1, -1, -1, 1, 1, -1, -1], x = new Float64Array(8);
  const end = Math.min(N, o.end ? Math.round(o.end * SR) : N);
  for (let n = 0; n < end; n++) {
    if (clearAt.has(n)) { lines.forEach(l => l.fill(0)); lp.fill(0); apL.forEach(a => a.b.fill(0)); pre.fill(0); }
    hpL.run(send.L[n], 300, 0.7); hpR.run(send.R[n], 300, 0.7);
    let inp = pre[pi]; pre[pi] = (hpL.hp + hpR.hp) * 0.5; pi = (pi + 1) % pre.length;
    for (const a of apL) { const d = a.b[a.i], v = inp + 0.6 * d; a.b[a.i] = v; inp = d - 0.6 * v; a.i = (a.i + 1) % a.b.length; }
    let sum = 0; for (let k = 0; k < 8; k++) { let y = lines[k][idx[k]]; lp[k] = y * (1 - dampA) + lp[k] * dampA; x[k] = lp[k] * g[k]; sum += x[k]; }
    sum *= 0.25; let oL = 0, oR = 0;
    for (let k = 0; k < 8; k++) { const y = x[k]; oL += y * sgnL[k]; oR += y * sgnR[k]; lines[k][idx[k]] = y - sum + inp * sgnR[(k + 3) & 7] * 0.5; idx[k] = (idx[k] + 1) % lens[k]; }
    out.L[n] += oL * wet * 0.35; out.R[n] += oR * wet * 0.35;
  }
}
function pingPong(bus, fb = 0.3, wet = 0.5) {
  const D = Math.round(0.375 * SR), bl = new Float32Array(D), br = new Float32Array(D); let i = 0, lp = 0;
  for (let n = 0; n < N; n++) { const yl = bl[i], yr = br[i]; lp += (yr - lp) * 0.35; bl[i] = bus.pp[n] + fb * lp; br[i] = yl; i = (i + 1) % D;
    bus.L[n] += yl * wet; bus.R[n] += yr * wet; bus.send.L[n] += yl * wet * 0.3; bus.send.R[n] += yr * wet * 0.3; }
}
function cutAt(bus, t, ramp = 0.003) { const a = Math.round((t - ramp) * SR), b = Math.round(t * SR); for (let n = Math.max(0, a); n < N; n++) { const g = n >= b ? 0 : 1 - (n - a) / (b - a); bus.L[n] *= g; bus.R[n] *= g; } }
// 9.50 테이프 스톱: rate r=(1-u)^2 로 읽고 gain (1-u)^0.5, 9.75-10.0 은 무음
function tapeStop(bus, t0, d) {
  const src = { L: bus.L.slice(), R: bus.R.slice() }, a = Math.round(t0 * SR), b = Math.round((t0 + d) * SR);
  for (let n = a; n < N; n++) {
    if (n >= b) { bus.L[n] = 0; bus.R[n] = 0; continue; }
    const u = (n - a) / (b - a), pos = a + d * SR * (1 - Math.pow(1 - u, 3)) / 3, i = Math.floor(pos), fr = pos - i, g = Math.sqrt(1 - u);
    bus.L[n] = (src.L[i] * (1 - fr) + src.L[i + 1] * fr) * g; bus.R[n] = (src.R[i] * (1 - fr) + src.R[i + 1] * fr) * g;
  }
}

// ---------- 측정: BS.1770 라우드니스 / 4배 오버샘플 트루 피크 ----------
function biq(x, b, a) { const y = new Float64Array(x.length); let x1 = 0, x2 = 0, y1 = 0, y2 = 0; for (let n = 0; n < x.length; n++) { const v = b[0] * x[n] + b[1] * x1 + b[2] * x2 - a[1] * y1 - a[2] * y2; x2 = x1; x1 = x[n]; y2 = y1; y1 = v; y[n] = v; } return y; }
function lufs(L, R) {
  const kw = x => biq(biq(x, [1.53512485958697, -2.69169618940638, 1.19839281085285], [1, -1.69065929318241, 0.73248077421585]), [1, -2, 1], [1, -1.99004745483398, 0.99007225036621]);
  const a = kw(L), b = kw(R), blk = 19200, hop = 4800, zs = [];
  for (let s = 0; s + blk <= a.length; s += hop) { let z = 0; for (let n = s; n < s + blk; n++) z += a[n] * a[n] + b[n] * b[n]; zs.push(z / blk); }
  const ld = z => -0.691 + 10 * Math.log10(z + 1e-30); let g1 = zs.filter(z => ld(z) > -70); if (!g1.length) return -Infinity;
  const rel = ld(g1.reduce((p, c) => p + c, 0) / g1.length) - 10, g2 = g1.filter(z => ld(z) > rel); return ld(g2.reduce((p, c) => p + c, 0) / g2.length);
}
const TP_H = (() => { const H = 16, ph = []; for (let p = 1; p < 4; p++) { const fr = p / 4, h = []; for (let k = -H + 1; k <= H; k++) { const x = fr - k, w = 0.5 + 0.5 * Math.cos(Math.PI * x / H), s = Math.abs(x) < 1e-9 ? 1 : Math.sin(Math.PI * x) / (Math.PI * x); h.push(s * w); } ph.push(h); } return { H, ph }; })();
function tpCurve(L, R) {
  const out = new Float32Array(L.length), { H, ph } = TP_H;
  for (let n = 0; n < L.length; n++) {
    let m = Math.max(Math.abs(L[n]), Math.abs(R[n]));
    if (n >= H - 1 && n + H < L.length) for (const h of ph) { let sl = 0, sr = 0; for (let k = 0; k < h.length; k++) { const j = n - H + 1 + k; sl += L[j] * h[k]; sr += R[j] * h[k]; } m = Math.max(m, Math.abs(sl), Math.abs(sr)); }
    out[n] = m;
  }
  return out;
}
const maxOf = a => { let m = 0; for (let i = 0; i < a.length; i++) m = Math.max(m, Math.abs(a[i])); return m; };

// ---------- 마스터 ----------
function masterEnv(n) {
  const t = n / SR;
  if (t >= SILENCE[0] && t < SILENCE[1]) return 0;
  if (t >= SILENCE[0] - 0.004 && t < SILENCE[0]) return (SILENCE[0] - t) / 0.004;
  if (t >= FADE[0]) return 0.5 * (1 + Math.cos(Math.PI * clamp((t - FADE[0]) / (FADE[1] - FADE[0]), 0, 1)));
  return 1;
}
function glue(L, R, o = {}) {
  const thr = o.thr ?? -10, ratio = o.ratio ?? 2, knee = 6, aA = Math.exp(-1 / (0.01 * SR)), aR = Math.exp(-1 / (0.15 * SR)); let env = 0, maxGr = 0;
  for (let n = 0; n < L.length; n++) {
    const x = Math.max(Math.abs(L[n]), Math.abs(R[n])); env = x > env ? aA * env + (1 - aA) * x : aR * env + (1 - aR) * x;
    const over = linToDb(env) - thr; let gr = 0;
    if (over >= knee / 2) gr = over * (1 - 1 / ratio); else if (over > -knee / 2) gr = (1 - 1 / ratio) * Math.pow(over + knee / 2, 2) / (2 * knee);
    maxGr = Math.max(maxGr, gr); const g = dbToLin(-gr); L[n] *= g; R[n] *= g;
  }
  return maxGr;
}
// 룩어헤드 리미터: 트루 피크 곡선 기준, 5 ms 앞을 보고 선형으로 내리고 80 ms 로 복귀
function limiter(L, R, ceilDb) {
  const c = dbToLin(ceilDb), tp = tpCurve(L, R), n = L.length, LA = Math.round(0.005 * SR), g = new Float32Array(n);
  for (let i = 0; i < n; i++) g[i] = tp[i] > c ? c / tp[i] : 1;
  const m = new Float32Array(n), dq = new Int32Array(n); let h = 0, t = 0;  // m[i] = min(g[i..i+LA-1])
  for (let i = n - 1; i >= 0; i--) { while (t > h && g[dq[t - 1]] >= g[i]) t--; dq[t++] = i; while (dq[h] > i + LA - 1) h++; m[i] = g[dq[h]]; }
  let sum = 0; const aR = Math.exp(-1 / (0.08 * SR)); let r = 1, minG = 1;
  for (let i = 0; i < n; i++) { sum += m[i]; if (i >= LA) sum -= m[i - LA]; const G = sum / Math.min(i + 1, LA); r = G < r ? G : G + (r - G) * aR; minG = Math.min(minG, r); L[i] *= r; R[i] *= r; }
  return linToDb(minG);
}
function hpf(x, fc) { const a = new SVF(), b = new SVF(); for (let n = 0; n < x.length; n++) { a.run(x[n], fc, 0.707); b.run(a.hp, fc, 0.707); x[n] = b.hp; } }

function writeWav(file, L, R) {
  const buf = Buffer.alloc(44 + N * 4);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + N * 4, 4); buf.write('WAVE', 8); buf.write('fmt ', 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22);
  buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(N * 4, 40);
  for (let n = 0; n < N; n++) { buf.writeInt16LE(clamp(Math.round(L[n] * 32767), -32767, 32767), 44 + n * 4); buf.writeInt16LE(clamp(Math.round(R[n] * 32767), -32767, 32767), 46 + n * 4); }
  fs.writeFileSync(file, buf);
}

function main() {
  const t0 = Date.now(), stems = process.argv.includes('stems');
  fs.mkdirSync(OUT, { recursive: true });
  arrange(); placeCues();
  // 음악 버스: 구간마다 핑퐁 -> 리버브 -> 구간 처리(빌드 끝 무음 / 테이프 스톱 / 14.0 드롭아웃)
  SEGS.forEach(s => { pingPong(s); fdn(s.send, s, { rt: 2.2, wet: 0.35 }); });
  cutAt(S0, SILENCE[0], 0.004); tapeStop(S1, 9.5, 0.25); cutAt(S2, 14.0, 0.004);
  const M = { L: new Float32Array(N), R: new Float32Array(N) };
  for (const s of SEGS) for (let n = 0; n < N; n++) { M.L[n] += s.L[n]; M.R[n] += s.R[n]; }
  const mg = dbToLin(MUSIC_LUFS - lufs(M.L, M.R));
  // 음악 더킹: 큐 지시(-9 dB 0.25 s) + 큰 타격 -4 dB (5 ms 어택, 60 ms 홀드, 250 ms 복귀)
  const duck = new Float32Array(N).fill(0);
  for (const [t, db] of DUCKS) { const a = Math.round(t * SR); for (let n = a; n < Math.min(N, a + Math.round(0.6 * SR)); n++) { const s = (n - a) / SR; const w = s < 0.005 ? s / 0.005 : s < 0.065 ? 1 : 1 - sstep((s - 0.065) / 0.25); duck[n] = Math.min(duck[n], db * w); } }
  for (const [ta, tb, db] of MDIPS) { const a = Math.round((ta - 0.01) * SR), b = Math.round((tb + 0.03) * SR); for (let n = a; n < b; n++) { const s = n / SR, w = s < ta ? (s - ta + 0.01) / 0.01 : s < tb ? 1 : 1 - (s - tb) / 0.03; duck[n] = Math.min(duck[n], db * clamp(w, 0, 1)); } }
  for (let n = 0; n < N; n++) { const g = mg * dbToLin(duck[n]); M.L[n] *= g; M.R[n] *= g; }
  // 효과음 버스: 짧은 리버브(1.2 s), 3.9375 무음에서 꼬리 초기화, 피크 -8 dBFS
  const X = { L: SFX.L, R: SFX.R };
  fdn(SFX.send, X, { rt: 1.2, wet: 0.3, size: 0.7, clearAt: [SILENCE[0]] });
  const sg = dbToLin(SFX_PEAK_DB) / Math.max(maxOf(X.L), maxOf(X.R));
  for (let n = 0; n < N; n++) { X.L[n] *= sg; X.R[n] *= sg; }
  if (stems) { writeWav(path.join(OUT, 'ad2-music.wav'), M.L, M.R); writeWav(path.join(OUT, 'ad2-sfx.wav'), X.L, X.R); }
  // 합치기 -> DC 컷(18 Hz) -> -16 LUFS 로 맞춘 뒤 글루 컴프(2:1) -> 메이크업 + 리미터 반복으로 -14 LUFS / -1 dBTP
  const A = { L: new Float32Array(N), R: new Float32Array(N) };
  for (let n = 0; n < N; n++) { A.L[n] = M.L[n] + X.L[n]; A.R[n] = M.R[n] + X.R[n]; }
  hpf(A.L, 18); hpf(A.R, 18);
  let pre = dbToLin(-16 - lufs(A.L, A.R)); for (let n = 0; n < N; n++) { A.L[n] *= pre; A.R[n] *= pre; }
  const gr = glue(A.L, A.R, { thr: -11, ratio: 2 });
  for (let n = 0; n < N; n++) { const e = masterEnv(n); A.L[n] *= e; A.R[n] *= e; }
  let mk = dbToLin(TARGET_LUFS - lufs(A.L, A.R)), F, lim, L1, tp;
  for (let it = 0; it < 5; it++) {
    F = { L: A.L.map(x => x * mk), R: A.R.map(x => x * mk) };
    lim = limiter(F.L, F.R, CEIL_DBTP); L1 = lufs(F.L, F.R);
    if (Math.abs(L1 - TARGET_LUFS) < 0.05) break; mk *= dbToLin(TARGET_LUFS - L1);
  }
  tp = linToDb(maxOf(tpCurve(F.L, F.R)));
  if (tp > -1.05) { const k = dbToLin(-1.05 - tp); for (let n = 0; n < N; n++) { F.L[n] *= k; F.R[n] *= k; } }
  for (let n = 0; n < N; n++) { const e = masterEnv(n); F.L[n] *= e; F.R[n] *= e; }
  let dcL = 0, dcR = 0; for (let n = 0; n < N; n++) { dcL += F.L[n]; dcR += F.R[n]; }
  const file = path.join(OUT, 'ad2.wav'); writeWav(file, F.L, F.R);
  console.log(`ad2.wav  ${(N / SR).toFixed(3)} s  ${lufs(F.L, F.R).toFixed(2)} LUFS  TP ${linToDb(maxOf(tpCurve(F.L, F.R))).toFixed(2)} dBTP  peak ${linToDb(Math.max(maxOf(F.L), maxOf(F.R))).toFixed(2)} dBFS  ` +
    `glue GR max ${gr.toFixed(1)} dB  limiter GR max ${(-lim).toFixed(1)} dB  DC ${(dcL / N).toExponential(1)}/${(dcR / N).toExponential(1)}  cues ${SB.cues.length}  ${((Date.now() - t0) / 1000).toFixed(1)} s`);
}
if (require.main === module) main();
