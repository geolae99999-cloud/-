// S1 · 0–2초 · 훅: 우리 반 / 단어왕은 / 누구?  (푸시 스택 슬램 -> 파란 블록 -> 왕관 -> '?' 점으로 밀고 들어가기)
// HO.s1.qDot() -> {cx, cy, d}  '?' 점(최종 자세, 1.75 푸시 전), HO.s1.push(t) -> {ox, oy, s}
const S1_LAY = L({
  slamFs: [300, 300], slamC: [960, 540],
  stackFs: 126, mode: 'line', lineC: [960, 290],
  qFs: 420, qC: [960, 660], crown: [120, 92],
}, {
  slamFs: [260, 230], slamC: [540, 880],
  stackFs: 140, mode: 'two', slots: [[540, 470], [540, 700]],
  qFs: 340, qC: [512, 1066], crown: [110, 84],   // 380 px 이면 '?'가 x>900 (플랫폼 버튼 자리)에 들어가서 340 px, 살짝 왼쪽
});
const S1_INK = [25, 31, 40];
const S1_CROWN_SVG = `<svg viewBox="0 0 120 92">
  <g stroke="#f59f00" stroke-width="5" stroke-linejoin="round">
    <circle cx="10" cy="27" r="7.5" fill="#ffc93c"/><circle cx="60" cy="12" r="8.5" fill="#ffc93c"/><circle cx="110" cy="27" r="7.5" fill="#ffc93c"/>
    <path d="M19 74 L10 31 L38 52 L60 18 L82 52 L110 31 L101 74 Z" fill="#ffc93c"/>
    <rect x="15" y="66" width="90" height="20" rx="6" fill="#ffc93c"/>
  </g>
  <rect x="24" y="73" width="72" height="6" rx="3" fill="#fff" opacity=".3"/>
  <path d="M24 40 L33 47" stroke="#fff" stroke-opacity=".3" stroke-width="5" stroke-linecap="round"/>
</svg>`;

// 글자 잉크 상자 재기: 캔버스로 글리프 하나씩 재고, DOM 글자 위치(offsetLeft)와 기준선(probe)에 맞춰요. 변환 없는 상태에서만.
const s1Ink = (w) => {
  const cs = getComputedStyle(w), fs = parseFloat(cs.fontSize);
  const cx = document.createElement('canvas').getContext('2d'); cx.font = `${cs.fontWeight} ${fs}px P`;
  const b = w.querySelector('.s1-probe').offsetTop;
  const chars = [...w.querySelectorAll('.ch')].map(c => {
    const ch = c.textContent, m = cx.measureText(ch), x = c.offsetLeft;
    return { el: c, ch, x, adv: c.offsetWidth, l: x - m.actualBoundingBoxLeft, r: x + m.actualBoundingBoxRight, t: b - m.actualBoundingBoxAscent, b: b + m.actualBoundingBoxDescent };
  });
  const ink = chars.filter(c => c.ch.trim());
  const l = Math.min(...ink.map(c => c.l)), r = Math.max(...ink.map(c => c.r)), t = Math.min(...ink.map(c => c.t)), bt = Math.max(...ink.map(c => c.b));
  return { fs, b, chars, l, r, t, bt, icx: (l + r) / 2, icy: (t + bt) / 2, adv: w.offsetWidth };
};
// 글리프 '?'의 점: 캔버스에 그려서 아래쪽 덩어리를 찾아요. 기준선 원점(펜 x=0, 기준선 y=0) 좌표.
const s1Dot = (fs, wt) => {
  const S = Math.ceil(fs * 1.6), c = document.createElement('canvas'); c.width = S; c.height = S;
  const g = c.getContext('2d'); g.font = `${wt} ${fs}px P`; g.fillStyle = '#000'; g.textBaseline = 'alphabetic';
  const ox = Math.round(fs * .3), oy = Math.round(fs * 1.2); g.fillText('?', ox, oy);
  const d = g.getImageData(0, 0, S, S).data, row = y => { let a = 1e9, b = -1; for (let x = 0; x < S; x++) if (d[(y * S + x) * 4 + 3] > 127) { if (x < a) a = x; b = x; } return [a, b]; };
  let y = S - 1; while (y > 0 && row(y)[1] < 0) y--;
  const yb = y; let x0 = 1e9, x1 = -1;
  while (y > 0) { const [a, b] = row(y); if (b < 0) break; x0 = Math.min(x0, a); x1 = Math.max(x1, b); y--; }
  const yt = y + 1;
  if (x1 < 0 || yb - yt < 4) return null;
  return { cx: (x0 + x1 + 1) / 2 - ox, cy: (yt + yb + 1) / 2 - oy, d: Math.max(x1 - x0 + 1, yb - yt + 1) };
};
const s1Shake = (t, a, amp) => { const d = t - a; if (d < 0 || d > .25) return [0, 0]; const k = amp * Math.exp(-d / .08); return [k * Math.sin(90 * d), k * Math.cos(77 * d)]; };
const s1Slam = (t, a) => { const p = prog(t, a, a + .14), e = E.out5(p); return { s: t < a ? 1.35 : lerp(1.35, 1, e), blur: t < a ? 8 : 8 * (1 - e), op: clamp((t - a) / .03) }; };
// 2D 변환 (합성 레이어를 만들지 않아 큰 글자도 매 프레임 선명하게 다시 그려져요)
const s1Tf = (e, o) => {
  const { x = 0, y = 0, s = 1, sx = 1, sy = 1, r = 0 } = o;
  e.style.transform = `translate(${x}px,${y}px) rotate(${r}deg) scale(${s * sx},${s * sy})`;
  if (o.op !== undefined) e.style.opacity = o.op;
  if (o.blur !== undefined) e.style.filter = o.blur > .05 ? `blur(${o.blur}px)` : 'none';
};
const S1 = { words: [], m: [], q: null, wang: null, dot: null };

SCENE({
  id: 's1', start: 0, end: 2, inDur: 0,
  build(root) {
    S1.block = el('div', 's1-block', null, root);
    S1.shake = el('div', 's1-shake', null, root);
    const mk = (text, fs) => { const w = el('div', 's1-w', null, S1.shake); split(w, text); el('i', 's1-probe', null, w); w.style.fontSize = fs + 'px'; return w; };
    S1.words = [mk('우리 반', S1_LAY.slamFs[0]), mk('단어왕은', S1_LAY.slamFs[1]), mk('누구?', S1_LAY.qFs)];
    S1.words[2].style.color = '#fff'; S1.words[2].style.letterSpacing = '-0.012em';  // 420 px '누' 가로획이 '구'에 붙지 않게
    S1.wang = S1.words[1].querySelectorAll('.ch')[2];
    S1.q = S1.words[2].querySelectorAll('.ch')[2];
    S1.crown = el('div', 's1-crown', S1_CROWN_SVG, S1.shake);
    S1.crown.style.width = S1_LAY.crown[0] + 'px'; S1.crown.style.height = S1_LAY.crown[1] + 'px';
    S1.crown.style.transformOrigin = '50% 100%';
    S1.sparks = [0, 1, 2, 3].map(() => el('div', 's1-spark', null, S1.shake));
    // 측정 전 기본값 (측정이 실패해도 장면이 그려지게)
    S1.dot = L({ cx: 1240, cy: 800, d: 60 }, { cx: 790, cy: 1200, d: 56 });
    const hoS1 = HO.s1 = HO.s1 || {};
    hoS1.qDot = () => ({ ...S1.dot });
    hoS1.push = t => ({ ox: S1.dot.cx, oy: S1.dot.cy, s: 1 + .12 * E.in3(prog(t, 1.75, 2)) });
  },
  measure(root) {
    S1.words.forEach(w => { w.style.transform = ''; w.style.filter = ''; });
    S1.m = S1.words.map(s1Ink);
    const [m1, m2, m3] = S1.m;
    // 쌓인 자리(slot): 잉크 중심과 배율
    if (S1_LAY.mode === 'line') {
      // '우리 반 단어왕은' 한 줄, 126 px, 가운데 정렬. 폭은 126 px 기준 (= 300 px 측정값 비례)
      const k1 = S1_LAY.stackFs / m1.fs, k2 = S1_LAY.stackFs / m2.fs;
      const sp = m1.chars[2].adv * k1;                 // 띄어쓰기 한 칸 (126 px)
      const a1 = m1.adv * k1, inkL = m1.l * k1, inkR = a1 + sp + m2.r * k2;
      const pen = S1_LAY.lineC[0] - (inkL + inkR) / 2;
      // 기준선 공통: 두 단어 잉크를 합친 세로 중심을 lineC[1]에
      const tTop = Math.min((m1.t - m1.b) * k1, (m2.t - m2.b) * k2), tBot = Math.max((m1.bt - m1.b) * k1, (m2.bt - m2.b) * k2);
      const base = S1_LAY.lineC[1] - (tTop + tBot) / 2;
      S1.slot = [
        { c: [pen + m1.icx * k1, base + (m1.icy - m1.b) * k1], k: k1 },
        { c: [pen + a1 + sp + m2.icx * k2, base + (m2.icy - m2.b) * k2], k: k2 },
      ];
    } else {
      S1.slot = S1_LAY.slots.map((c, i) => ({ c, k: S1_LAY.stackFs / S1.m[i].fs }));
    }
    // '왕' 잉크 위 가운데 (쌓인 자리, 무대 좌표)
    const wc = m2.chars[2], s2 = S1.slot[1];
    S1.wangTop = [s2.c[0] + ((wc.l + wc.r) / 2 - m2.icx) * s2.k, s2.c[1] + (wc.t - m2.icy) * s2.k];
    // '?' 흔들기 중심 = 글자 기준선 가운데
    const qc = m3.chars[2];
    S1.q.style.transformOrigin = `${qc.adv / 2}px ${m3.b - S1.q.offsetTop}px`;
    // '?' 점: 최종 자세(배율 1, 잉크 중심 = qC)
    const dot = s1Dot(m3.fs, 900);
    if (dot) S1.dot = { cx: S1_LAY.qC[0] + (qc.x + dot.cx - m3.icx), cy: S1_LAY.qC[1] + (m3.b + dot.cy - m3.icy), d: dot.d };
  },
  draw(t, lt, root) {
    if (!S1.slot) return;
    const m = S1.m;
    // 흔들기 (슬램마다)
    const sh = [s1Shake(t, 0, 10), s1Shake(t, .5, 10), s1Shake(t, 1, 12)].reduce((a, b) => [a[0] + b[0], a[1] + b[1]], [0, 0]);
    S1.shake.style.transform = `translate(${sh[0]}px,${sh[1]}px)`;
    // 파란 블록이 아래에서 올라와요 (1.00, 0.14 s)
    const bp = E.outExpo(prog(t, 1, 1.14));
    S1.block.style.clipPath = `inset(${(1 - bp) * 100}% 0 0 0)`;
    // 잉크 -> 흰색 (1.00-1.08)
    const cp = prog(t, 1, 1.08), col = `rgb(${S1_INK.map(v => Math.round(lerp(v, 255, cp))).join(',')})`;
    const place = (i, c, k, o = {}) => {
      const w = S1.words[i], mi = m[i];
      w.style.transformOrigin = `${mi.icx}px ${mi.icy}px`;
      s1Tf(w, { ...o, x: c[0] - mi.icx, y: c[1] - mi.icy, s: k * (o.s || 1) });
    };
    const slamC = S1_LAY.slamC;
    // 1) '우리 반': -0.10 슬램, 0.50 자리로
    {
      const sl = s1Slam(t, -.1), p = E.outExpo(prog(t, .5, .72)), sl0 = S1.slot[0];
      place(0, [lerp(slamC[0], sl0.c[0], p), lerp(slamC[1], sl0.c[1], p)], lerp(1, sl0.k, p), { s: sl.s, blur: sl.blur, op: sl.op });
      S1.words[0].style.color = col;
    }
    // 2) '단어왕은': 0.48 슬램, 1.00 자리로
    {
      const sl = s1Slam(t, .48), p = E.outExpo(prog(t, 1, 1.22)), sl1 = S1.slot[1];
      place(1, [lerp(slamC[0], sl1.c[0], p), lerp(slamC[1], sl1.c[1], p)], lerp(1, sl1.k, p), { s: sl.s, blur: sl.blur, op: sl.op });
      S1.words[1].style.color = col;
    }
    // 3) '누구?': 1.00 STRETCH (sx .7 / sy 1.6 -> 1, 스프링 0.45 s), 흐림 12 -> 0
    {
      const p = prog(t, 1, 1.45), sp = t < 1 ? 0 : E.spring(p);
      place(2, S1_LAY.qC, 1, { sx: lerp(.7, 1, sp), sy: lerp(1.6, 1, sp), blur: 12 * (1 - E.out3(prog(t, 1, 1.22))), op: clamp((t - 1) / .03) });
      // '?' 흔들기 1.25: -14 -> +9 -> 0
      const d = t - 1.25; let r = 0;
      if (d > 0 && d < .06) r = -14 * E.out3(d / .06);
      else if (d >= .06 && d < .46) { const q = (d - .06) / .4; r = -14 * Math.exp(-.66 * q) * Math.cos(Math.PI * 1.5 * q); }
      S1.q.style.transform = `rotate(${r}deg)`;
    }
    // 4) 왕관: 1.50-1.64 260 px 위에서 떨어져 '왕' 위에, -12도. 착지 찌그러짐 + 불꽃 4개
    {
      const [cw, ch] = S1_LAY.crown, rest = [S1.wangTop[0] - cw / 2, S1.wangTop[1] - ch + ch * .1];
      const fp = prog(t, 1.5, 1.64), fy = -260 * (1 - E.in3(fp));
      const lp = prog(t, 1.64, 1.84), sq = t < 1.64 ? 0 : E.spring(lp, 3, 5);
      const sx = t < 1.64 ? 1 : lerp(1.12, 1, sq), sy = t < 1.64 ? 1 : lerp(.82, 1, sq);
      S1.crown.style.opacity = t < 1.5 ? 0 : clamp((t - 1.5) / .04);
      S1.crown.style.transform = `translate(${rest[0]}px,${rest[1] + fy}px) rotate(-12deg) scale(${sx},${sy})`;
      const ang = L([-158, -122, -58, -22], [-172, -146, -34, -8]), cx = S1.wangTop[0] - ch * .1, cy = S1.wangTop[1] - ch * .45;
      const spP = prog(t, 1.64, 1.84);
      S1.sparks.forEach((s, i) => {
        if (t < 1.64 || spP >= 1) { s.style.opacity = 0; s.style.transform = 'translate(-999px,0)'; return; }
        const a = ang[i] * Math.PI / 180, e = E.out3(spP), dist = lerp(cw * .62, cw * L(1.0, .9), e);
        s.style.opacity = 1 - E.in3(spP);
        s.style.transform = `translate(${cx + Math.cos(a) * dist}px,${cy + Math.sin(a) * dist}px) rotate(${ang[i]}deg) scale(${lerp(1, .55, e)},1)`;
      });
    }
    // 5) 1.75-2.00 '?' 점을 중심으로 1 -> 1.12 밀고 들어가기
    if (t > 1.75) {
      const ps = HO.s1.push(t);
      root.style.transformOrigin = `${ps.ox}px ${ps.oy}px`;
      root.style.transform = `scale(${ps.s})`;
    }
  },
});
