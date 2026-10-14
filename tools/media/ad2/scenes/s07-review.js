// S7 · 17–22.5초 [9.3-12.2] · 간격 반복 복습 + 13가지 학습
// 들어오기 16.75-17.00: 12도 비스듬한 판이 오른쪽 -> 왼쪽으로 쓸며 흰 화면을 열어요(이 장면 소유). 'achieve'는 HO.s6.word() 자리에서 이어받아 17.00에 복습 카드로 FLIP.
// 핸드오프: HO.s7.examChip() -> {x, y, w, h, r}  '실전 시험' 칩의 쉬는 자리 (S8 이 이 칩을 파란 화면으로 키워요. S7 은 22.25 부터 자기 칩을 숨겨요).
const S7_DAYS = [0, 1, 4, 11];                 // 앱 INTERVALS [0,1,3,7] = 복습 사이 간격 -> 누적 0/1/4/11일
const S7_LAND = [17.5, 18, 18.5];
const S7_LAY = L({
  vert: false,
  chip: { x: 140, y: 110, h: 64, fs: 32, ic: 32 },
  head1: { x: 140, fs: 110, caps: [200, 330] },
  track: { a: 260, b: 1600, y: 720, th: 8 },
  today: { fs: 30, y: 770 },
  card: { w: 260, h: 124, gap: 40, wfs: 46, mfs: 28, r: 30 },
  hop: 120,
  pill: { fs: 30, h: 52, y: 470, xs: [321, 565, 1174] },
  head2: { x: 140, fs: 96, caps: [110, 220] },
  grid: { w: 300, h: 92, gap: 16, cx: 960, rows: [400, 508, 616], per: [5, 5, 3], fs: 36, ic: 56, icS: 30, pl: 18, r: 28 },
  mini: { cy: 760, h: 64, fs: 34 },
  fb: { x: 615, y: 501, w: 690, h: 190, fontSize: 190 },
}, {
  vert: true,
  chip: { cx: 540, y: 240, h: 60, fs: 30, ic: 30 },
  head1: { cx: 540, fs: 104, cys: [380, 500] },
  track: { a: 680, b: 1300, x: 230, th: 8 },
  today: { fs: 32, right: 196 },
  card: { w: 280, h: 120, x: 290, wfs: 46, mfs: 28, r: 30 },
  hop: 120,
  pill: { fs: 30, h: 52, cx: 750, ys: [708, 820, 1102] },
  head2: { cx: 540, fs: 96, cys: [300, 410] },
  grid: { w: 290, h: 96, gap: 16, cx: 540, rows: [520, 632, 744, 856, 968], per: [3, 3, 3, 3, 1], fs: 32, ic: 56, icS: 30, pl: 16, r: 28 },
  mini: { cy: 1110, h: 60, fs: 32 },
  fb: { x: 260, y: 540, w: 560, h: 160, fontSize: 160 },
});
const S7_IC = {
  cards: '<rect x="3" y="7" width="14" height="12" rx="2"/><path d="M7 3h12a2 2 0 0 1 2 2v10"/>',
  check: '<circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.7 2.7L16 9.5"/>',
  repeat: '<path d="M17 2l4 4-4 4"/><path d="M3 11V9a3 3 0 0 1 3-3h15"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v2a3 3 0 0 1-3 3H3"/>',
  keyboard: '<rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10"/>',
  headphones: '<path d="M4 15v-3a8 8 0 0 1 16 0v3"/><path d="M4 15h3v5H5a1 1 0 0 1-1-1v-4zM20 15h-3v5h2a1 1 0 0 0 1-1v-4z"/>',
  speaker: '<path d="M11 5 6 9H2v6h4l5 4V5z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/>',
  quote: '<path d="M4 6h16M4 12h7M4 18h16"/><path d="M14 12h6" stroke-dasharray="2 2"/>',
  rows: '<rect x="3" y="4" width="7" height="5" rx="1.5"/><rect x="12" y="4" width="9" height="5" rx="1.5"/><rect x="3" y="15" width="10" height="5" rx="1.5"/><path d="M16 17.5h5M19 15l2.5 2.5L19 20"/>',
  mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>',
  shuffle: '<path d="M16 4h4v4M20 4l-6 6M4 20l5-5M16 20h4v-4M20 20l-5-5M4 4l5 5"/>',
  sparkles: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3z"/><path d="M19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8L19 16z"/>',
  trophy: '<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4z"/><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/>',
  tick: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
};
const S7_MODES = [
  ['플래시카드', '#3182f6', 'cards'], ['뜻 고르기', '#03b26c', 'check'], ['단어 고르기', '#0aa5b4', 'repeat'], ['스펠링', '#fe9800', 'keyboard'],
  ['듣고 쓰기', '#8b5cf6', 'headphones'], ['듣기 모드', '#1b64da', 'speaker'], ['문장 빈칸', '#e64980', 'quote'], ['문장 배열', '#f04452', 'rows'],
  ['말하기', '#0aa5b4', 'mic'], ['듣고 고르기', '#8b5cf6', 'headphones'], ['철자 퍼즐', '#fe9800', 'shuffle'], ['섞어 풀기', '#03b26c', 'sparkles'], ['실전 시험', '#3182f6', 'trophy'],
];
const S7 = {};
const s7Ic = (d, px, sw = 1.8) => SVG(d, sw).replace('<svg ', `<svg width="${px}" height="${px}" `);
const s7At = (e, x, y, w, h) => { e.style.left = x + 'px'; e.style.top = y + 'px'; if (w != null) e.style.width = w + 'px'; if (h != null) e.style.height = h + 'px'; return e; };
const s7Pop = (t, a, d = .3, c = 1.9) => { const p = prog(t, a, a + d); return { s: p > 0 ? E.back(p, c) : 0, op: clamp(p * 5) }; };
// 마스크 등장/퇴장 (퇴장은 0.25 초, 위로)
const s7Mask = (sp, t, a, d, out, od = .2) => { let y = (1 - E.out5(prog(t, a, a + d))) * 110; if (out != null) y -= E.in3(prog(t, out, out + od)) * 115; sp.style.transform = `translateY(${y}%)`; };
// 카드 FLIP 레이아웃 보간
const s7Rect = (a, b, p) => ({ x: lerp(a.x, b.x, p), y: lerp(a.y, b.y, p), w: lerp(a.w, b.w, p), h: lerp(a.h, b.h, p) });

SCENE({
  id: 's7', start: 16.75, end: 22.5, inDur: 0.25,
  build(root) {
    __seed = 107;
    const A = S7_LAY, G = A.grid, T = A.track, Cd = A.card;
    const head = (lines, Hd) => lines.map((txt, i) => {
      const e = el('div', 's7-head', `<span class="ln"><span>${txt}</span></span>`, root, `font-size:${Hd.fs}px`);
      if (Hd.cx != null) { e.style.left = '0px'; e.style.width = W + 'px'; e.style.textAlign = 'center'; e.style.top = (Hd.cys[i] - Hd.fs * .55) + 'px'; }
      else { e.style.left = Hd.x + 'px'; e.style.top = (Hd.caps[i] - Hd.fs * .19) + 'px'; }
      return e;
    });
    // PART 1 ─ 칩 · 헤드라인 · 타임라인
    const C = A.chip;
    S7.chip = el('div', 's7-chip', `${s7Ic(S7_IC.repeat, C.ic, 2)}<span>간격 반복 복습</span>`, root, `height:${C.h}px;padding:0 ${Math.round(C.h * .45)}px 0 ${Math.round(C.h * .36)}px;gap:${Math.round(C.fs * .3)}px;font-size:${C.fs}px;top:${C.y}px;transform-origin:${C.cx != null ? '50%' : '0'} 50%`);
    if (C.cx == null) S7.chip.style.left = C.x + 'px';
    S7.h1 = head(['까먹기 전에,', '딱 맞춰 <b>복습</b>.'], A.head1);
    S7.tl = el('div', 's7-tl', null, root);
    const MP = S7_DAYS.map(d => lerp(T.a, T.b, d / 11));
    S7.mp = MP;
    S7.track = el('div', 's7-track', null, S7.tl);
    S7.fill = el('div', 's7-fill', null, S7.tl);
    if (A.vert) { s7At(S7.track, T.x - T.th / 2, T.a, T.th, T.b - T.a); s7At(S7.fill, T.x - T.th / 2, T.a, T.th, 0); S7.track.style.transformOrigin = '50% 0'; }
    else { s7At(S7.track, T.a, T.y - T.th / 2, T.b - T.a, T.th); s7At(S7.fill, T.a, T.y - T.th / 2, 0, T.th); S7.track.style.transformOrigin = '0 50%'; }
    S7.mk = MP.map(m => { const e = el('div', 's7-mk', null, S7.tl); if (A.vert) s7At(e, T.x - 16, m - 16); else s7At(e, m - 16, T.y - 16); const f = el('i', '', s7Ic(S7_IC.tick, 20, 3.2), e); return { e, f }; });
    const Td = A.today;
    S7.today = el('div', 's7-today', '오늘', S7.tl, `font-size:${Td.fs}px`);
    if (A.vert) { S7.today.style.right = (W - Td.right) + 'px'; S7.today.style.top = (T.a - Td.fs / 2) + 'px'; }
    else { S7.today.style.left = MP[0] + 'px'; S7.today.style.top = Td.y + 'px'; S7.today.style.transform = 'translateX(-50%)'; }
    const P = A.pill;
    S7.pills = ['1일 뒤', '3일 뒤', '7일 뒤'].map((txt, i) => {
      const e = el('div', 's7-pill', txt, S7.tl, `height:${P.h}px;padding:0 ${Math.round(P.h * .42)}px;font-size:${P.fs}px`);
      e.__c = A.vert ? { x: P.cx, y: P.ys[i] } : { x: P.xs[i], y: P.y };
      return e;
    });
    // 카드 쉬는 자리 (표지 i 위)
    S7.rest = i => A.vert ? { x: Cd.x, y: MP[i] - Cd.h / 2, w: Cd.w, h: Cd.h } : { x: MP[i] - Cd.w / 2, y: T.y - Cd.gap - Cd.h, w: Cd.w, h: Cd.h };
    // PART 2 ─ 13가지 칩
    S7.h2 = head(['<b>13가지</b> 방법으로,', '질리지 않게.'], A.head2);
    S7.slots = []; let k = 0;
    G.per.forEach((n, ri) => { const rw = n * G.w + (n - 1) * G.gap, x0 = G.cx - rw / 2; for (let c = 0; c < n; c++) S7.slots[k++] = { x: x0 + c * (G.w + G.gap), y: G.rows[ri], w: G.w, h: G.h }; });
    const inner = (m) => `<div class="s7-mi" style="padding-left:${G.pl}px;gap:${Math.round(G.pl * .9)}px"><i style="width:${G.ic}px;height:${G.ic}px;border-radius:${Math.round(G.ic * .32)}px;background:${m[1]}1f;color:${m[1]}">${s7Ic(S7_IC[m[2]], G.icS, 2)}</i><b style="font-size:${G.fs}px">${m[0]}</b></div>`;
    S7.modes = S7_MODES.map((m, i) => {
      const e = s7At(el('div', 's7-mode', null, root, `border-radius:${G.r}px;box-shadow:inset 0 0 0 1.5px #e5e8eb`), S7.slots[i].x, S7.slots[i].y, G.w, G.h);
      const sh = el('div', 's7-sheen', null, e, 'width:260px;display:none');
      el('div', '', inner(m), e);
      return { e, sh };
    });
    const Mi = A.mini;
    S7.mini = el('div', 's7-mini', `<b style="font-weight:800">+ 미니 게임</b><span style="margin-left:${Math.round(Mi.fs * .6)}px">짝 맞추기 · 단어 비</span>`, root, `height:${Mi.h}px;padding:0 ${Math.round(Mi.h * .46)}px;font-size:${Mi.fs}px;top:${Mi.cy - Mi.h / 2}px`);
    // 복습 카드 (나중에 '플래시카드' 칩이 돼요)
    const r0 = S7.rest(0);
    S7.card = s7At(el('div', 's7-card', null, root), r0.x, r0.y, r0.w, r0.h);
    S7.cw = el('div', 's7-cw', `<b style="font-size:${Cd.wfs}px">achieve</b><span style="font-size:${Cd.mfs}px;margin-top:${Math.round(Cd.mfs * .36)}px">성취하다</span>`, S7.card);
    S7.cc = el('div', '', inner(S7_MODES[0]), S7.card, 'position:absolute;inset:0');
    // 이어받은 'achieve'
    S7.carry = el('div', 's7-carry', 'achieve', root);
    const ho = HO.s7 = HO.s7 || {};
    ho.examChip = () => { const s = S7.slots[12]; return { x: s.x, y: s.y, w: s.w, h: s.h, r: G.r }; };
  },
  measure(root) {
    const A = S7_LAY;
    [S7.card, S7.mini, S7.chip].forEach(e => { e.style.transform = ''; });
    const b = S7.cw.firstChild.getBoundingClientRect();
    S7.slot = { x: b.left, y: b.top, fs: A.card.wfs };
    S7.mini.style.left = (W / 2 - S7.mini.offsetWidth / 2) + 'px';
    if (A.chip.cx != null) S7.chip.style.left = (A.chip.cx - S7.chip.offsetWidth / 2) + 'px';
    S7.pills.forEach(p => { p.style.left = (p.__c.x - p.offsetWidth / 2) + 'px'; p.style.top = (p.__c.y - p.offsetHeight / 2) + 'px'; });
  },
  draw(t, lt, root) {
    const A = S7_LAY, T = A.track, MP = S7.mp, V_ = A.vert;
    // ── 들어오기: 12도 비스듬한 판 (오른쪽 -> 왼쪽)
    if (t < 17) {
      const sk = H * Math.tan(12 * Math.PI / 180) / 2, e = lerp(W + sk, -sk, E.inOutExpo(prog(t, 16.75, 17)));
      root.style.clipPath = `polygon(${e + sk}px 0, ${W + 4}px 0, ${W + 4}px ${H}px, ${e - sk}px ${H}px)`;
    }
    // ── 이어받은 'achieve' (16.75-17.15)
    let ho = null;
    try { if (HO.s6 && HO.s6.word) ho = HO.s6.word(); } catch (e) {}
    if (!ho || !isFinite(ho.x) || !(ho.fontSize > 0)) ho = A.fb;
    if (t < 17.15) {
      const hs = 1.04, fp = E.inOutExpo(prog(t, 17, 17.15));
      const x0 = ho.x + (1 - hs) * ho.w / 2, y0 = ho.y + (1 - hs) * ho.h / 2, s1 = S7.slot ? S7.slot.fs / ho.fontSize : .25;
      const sl = S7.slot || { x: S7.rest(0).x + 40, y: S7.rest(0).y + 20 };
      S7.carry.style.display = 'block';
      S7.carry.style.fontSize = ho.fontSize + 'px';
      S7.carry.style.transform = `translate(${lerp(x0, sl.x, fp)}px,${lerp(y0, sl.y, fp)}px) scale(${lerp(hs, s1, fp)})`;
    } else S7.carry.style.display = 'none';
    // ── PART 1: 칩 · 헤드라인
    const cp = s7Pop(t, 17, .35), co = E.in3(prog(t, 19.25, 19.45));
    S7.chip.style.transform = `translateY(${-30 * co}px) scale(${cp.s})`; S7.chip.style.opacity = cp.op * (1 - co);
    s7Mask(S7.h1[0].firstChild.firstChild, t, 17, .5, 19.25);
    s7Mask(S7.h1[1].firstChild.firstChild, t, 17.25, .5, 19.3);
    // 타임라인: 트랙 그리기, 표지 4개 32분음표로 팝, 19.25 왼쪽으로 빠짐
    const tp = E.out5(prog(t, 17, 17.3)), tlo = E.in3(prog(t, 19.25, 19.45));
    S7.track.style.transform = V_ ? `scaleY(${tp})` : `scaleX(${tp})`;
    S7.tl.style.transform = `translateX(${-220 * tlo}px)`; S7.tl.style.opacity = 1 - tlo;
    S7.mk.forEach((m, i) => {
      const p = s7Pop(t, 17.0625 + i * .0625, .3); m.e.style.transform = `scale(${p.s})`; m.e.style.opacity = p.op;
      const fa = i ? S7_LAND[i - 1] : 17.15, f = s7Pop(t, fa, .3);
      m.f.style.transform = `scale(${f.s})`; m.f.style.opacity = f.op;
    });
    S7.today.style.opacity = clamp((t - 17.0625) / .15);
    // 카드 위치: 17.00-17.15 나타남, 3번 깡충 (0.22 초, 착지 17.50/18.00/18.50)
    let pos = 0, arc = 0, sq = 1;
    S7_LAND.forEach((ld, i) => {
      const p = prog(t, ld - .22, ld);
      if (p > 0) { pos = i + E.inOut3(p); if (p < 1) arc = 4 * p * (1 - p); }
      if (t >= ld) sq = Math.min(sq, 1 - .1 * (1 - E.out3(prog(t, ld, ld + .16))));
    });
    const seg = Math.min(2, Math.floor(pos)), fr = pos - seg;
    const mAt = lerp(MP[seg], MP[seg + 1], fr);   // 카드 가운데가 있는 트랙 위치
    // 파란 진행선: 카드 따라
    const fl = Math.max(0, mAt - T.a) * (t >= 17.28 ? 1 : 0);
    if (V_) S7.fill.style.height = fl + 'px'; else S7.fill.style.width = fl + 'px';
    S7.pills.forEach((p, i) => { const q = s7Pop(t, S7_LAND[i], .3); p.style.transform = `scale(${q.s})`; p.style.opacity = q.op; });
    // 카드 사각형: 쉬는 자리 -> 19.25-19.50 첫 칸('플래시카드')으로 FLIP
    const r0 = S7.rest(0), rr = { ...r0 };
    if (V_) rr.y = mAt - r0.h / 2; else rr.x = mAt - r0.w / 2;
    const mp = E.inOutExpo(prog(t, 19.25, 19.5));
    const R = s7Rect(rr, S7.slots[0], mp);
    const card = S7.card;
    if (t < 19.5) {
      card.style.display = 'block';
      s7At(card, R.x, R.y, R.w, R.h);
      card.style.borderRadius = lerp(A.card.r, A.grid.r, mp) + 'px';
      const ap = E.out3(prog(t, 17, 17.15));
      const hx = V_ ? A.hop * arc : 0, hy = V_ ? 0 : -A.hop * arc;
      card.style.transformOrigin = V_ ? '50% 50%' : '50% 100%';
      card.style.transform = `translate(${hx}px,${hy}px) scale(${lerp(.86, 1, ap)}) scaleY(${sq})`;
      card.style.opacity = ap;
      const bw = lerp(3, 1.5, mp), bc = mp > 0 ? `rgb(${Math.round(lerp(49, 229, mp))},${Math.round(lerp(130, 232, mp))},${Math.round(lerp(246, 235, mp))})` : '#3182f6';
      const gl = .18 * E.out3(prog(t, 18.5, 18.75)) * (1 - mp);
      card.style.boxShadow = `inset 0 0 0 ${bw}px ${bc}, 0 0 0 12px rgba(49,130,246,${gl.toFixed(3)}), 0 ${Math.round(14 * (1 - mp))}px ${Math.round(30 * (1 - mp))}px rgba(0,27,55,${(.1 * (1 - mp)).toFixed(3)})`;
      const xf = prog(t, 19.4, 19.5);
      S7.cw.style.opacity = 1 - xf; S7.cc.style.opacity = xf;
      S7.cw.firstChild.style.visibility = t < 17.15 ? 'hidden' : 'visible';
    } else card.style.display = 'none';
    // ── PART 2: 헤드라인 · 칩 13개 · 미니 게임
    const fo = E.in3(prog(t, 22.25, 22.45));
    s7Mask(S7.h2[0].firstChild.firstChild, t, 19.5, .5);
    s7Mask(S7.h2[1].firstChild.firstChild, t, 19.625, .5);
    S7.h2.forEach(h => { h.style.opacity = 1 - fo; });
    const s0 = S7.slots[0], c0 = { x: s0.x + s0.w / 2, y: s0.y + s0.h / 2 };
    const gc = { x: A.grid.cx, y: (A.grid.rows[0] + A.grid.rows[A.grid.rows.length - 1] + A.grid.h) / 2 };
    const shP = prog(t, 21, 21.5), shX = lerp(S7.slots[0].x - 300, Math.max(...S7.slots.map(s => s.x + s.w)) + 40, E.inOut3(shP));
    S7.modes.forEach((m, i) => {
      const s = S7.slots[i], cx = s.x + s.w / 2, cy = s.y + s.h / 2;
      if (i === 0 ? t < 19.5 : t < 19.5625 + (i - 1) * .0625) { m.e.style.opacity = 0; return; }
      if (i === 12 && t >= 22.25) { m.e.style.opacity = 0; return; }
      let x = 0, y = 0, sc = 1, op = 1;
      if (i) {
        const a = 19.5625 + (i - 1) * .0625, p = prog(t, a, a + .2), e = E.back(p, 1.9);
        const dx = c0.x - cx, dy = c0.y - cy, dl = Math.hypot(dx, dy) || 1;
        x = dx / dl * 40 * (1 - E.out3(p)); y = dy / dl * 40 * (1 - E.out3(p)); sc = lerp(.6, 1, e); op = clamp(p * 5);
      }
      // 22.25 흩어짐 (실전 시험 제외)
      if (i !== 12 && fo > 0) { const dx = cx - gc.x, dy = cy - gc.y, dl = Math.hypot(dx, dy) || 1; x += dx / dl * 80 * fo; y += dy / dl * 80 * fo; op *= 1 - fo; }
      let bw = 1.5, bcol = '#e5e8eb';
      if (i === 12 && t >= 22) { const q = prog(t, 22, 22.06); bw = lerp(1.5, 4, q); bcol = '#3182f6'; sc *= 1 + .04 * (q < 1 ? q : 1 - E.out3(prog(t, 22.06, 22.25))); }
      m.e.style.boxShadow = `inset 0 0 0 ${bw}px ${bcol}`;
      m.e.style.transform = `translate(${x}px,${y}px) scale(${sc})`; m.e.style.opacity = op;
      if (shP > 0 && shP < 1) { m.sh.style.display = 'block'; m.sh.style.transform = `translateX(${shX - s.x}px)`; } else m.sh.style.display = 'none';
    });
    const mq = s7Pop(t, 20.5, .35);
    S7.mini.style.transform = `scale(${mq.s})`; S7.mini.style.opacity = mq.op * (1 - fo);
  },
});
