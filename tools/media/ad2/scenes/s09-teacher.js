// S9 · 25-30초 · 선생님은: 반 만들고, 과제 내고, 실시간으로 확인, 수업 도구까지
// 들어오기 24.75-25.00: 가로 줄무늬가 왼쪽/오른쪽에서 번갈아 자라며 회색 화면을 열어요(이 장면 소유).
// 핸드오프: HO.s9.toolRows() -> [5 x {x, y, w, h, r, color}] 수업 도구 줄의 쉬는 자리 (S10 이 이 줄을 파란 띠로 늘려요).
const S9_LAY = L({
  vert: false, stripes: 8,
  pill: { x: 140, y: 110, h: 64, fs: 34, pad: 28 },
  line: { x: 140, top: 470, fs: 100, slots: [0, -80, -150, -220], sc: .6, dot: 14 },
  clip: 944,
  A: {
    name: { x: 1000, y: 150, fs: 44 }, lab: { x: 1000, y: 220, fs: 30 },
    tiles: { x: 1034, y: 260, w: 112, h: 156, gap: 12, fs: 110, r: 20 },
    card: { x: 1000, y: 470, w: 800, h: 330, r: 40, pad: 48, tfs: 52, mfs: 30, sfs: 30, cfs: 40, bar: 16, pfs: 34 },
  },
  B: {
    head: { x: 1000, y: 150, fs: 44 }, nums: { x: 1000, y: 220, h: 80, nfs: 40, lfs: 26, pad: 24, gap: 12 },
    stu: { x: 1000, y: 360, w: 300, h: 400, pad: 24, cfs: 24, ch: 40, pfs: 28, wfs: 64, ah: 60, afs: 30, an: 36, bar: 8 },
    live: { x: 1420, cy: 560, w: 380, h: 440, h2: 300, pad: 32, nfs: 44, ifs: 28, afs: 30, cfs: 56, bar: 14, ofs: 30, tfs: 26, dfs: 34 },
    wire: { x0: 1300, x1: 1420, y: 560 },
    foot: { cx: 1610, y: 820, fs: 26 },
  },
  C: { x: 1000, ys: [200, 340, 480, 620, 760], w: 800, h: 120, r: 30, ic: 76, icS: 40, fs: 50, nx: 126, pl: 22 },
}, {
  vert: true, stripes: 10,
  pill: { cx: 540, cy: 270, h: 60, fs: 32, pad: 26 },
  line: { x: 540, cys: [380, 490, 430, 430], fs: 100, dot: 14 },
  clip: 0,
  A: {
    name: { x: 120, y: 620, fs: 44 }, lab: { x: 120, y: 680, fs: 30 },
    tiles: { x: 120, y: 720, w: 130, h: 176, gap: 12, fs: 120, r: 20 },
    card: { x: 84, y: 940, w: 912, h: 320, r: 40, pad: 44, tfs: 48, mfs: 30, sfs: 30, cfs: 40, bar: 16, pfs: 34 },
  },
  B: {
    head: { x: 84, y: 620, fs: 44 }, nums: { x: 84, y: 680, h: 70, nfs: 40, lfs: 28, pad: 22, gap: 12, row: true },
    stu: { x: 84, y: 800, w: 360, h: 420, pad: 28, cfs: 28, ch: 46, pfs: 30, wfs: 72, ah: 64, afs: 34, an: 40, bar: 8 },
    live: { x: 600, cy: 1010, w: 396, h: 460, h2: 320, pad: 30, nfs: 44, ifs: 28, afs: 30, cfs: 60, bar: 14, ofs: 32, tfs: 28, dfs: 34 },
    wire: { x0: 444, x1: 600, y: 1010 },
    foot: { cx: 798, y: 1290, fs: 26 },
  },
  C: { x: 84, ys: [620, 772, 924, 1076, 1228], w: 912, h: 128, r: 30, ic: 80, icS: 42, fs: 54, nx: 116, pl: 24 },
});
const S9_IC = {
  sparkles: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3z"/><path d="M19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8L19 16z"/>',
  grid: '<rect x="3.5" y="3.5" width="17" height="17" rx="2.5"/><path d="M9.2 3.5v17M14.8 3.5v17M3.5 9.2h17M3.5 14.8h17"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.2a6.5 6.5 0 0 1 3.5 5.8"/>',
  clock: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2.5M9 2.5h6"/>',
  print: '<path d="M6 9V3h12v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M7 14h10v7H7z"/>',
  check: '<circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.7 2.7L16 9.5"/>',
};
const S9_TOOLS = [['퀴즈 쇼', '#fe9800', 'sparkles'], ['단어 빙고판', '#03b26c', 'grid'], ['발표자 뽑기·모둠', '#8b5cf6', 'users'], ['수업 타이머', '#0aa5b4', 'clock'], ['시험지 인쇄', '#3182f6', 'print']];
const S9_LINES = [['반 만들고,', 25], ['과제 내고,', 25.5], ['<b class="s9-g">실시간</b>으로 확인,', 26.5], ['수업 도구까지.', 28]];
const S9_CODE = 'A7K2QX', S9_SET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const S9_LOCK = [25.125, 25.25, 25.375, 25.5, 25.625, 25.75];
const S9_TAP = [26.75, 27, 27.25];
const S9_Q = [['proud', '자랑스러운'], ['honest', '정직한'], ['curious', '호기심이 많은']];
const S9 = {};
const s9Shake = (t, a, amp) => { const d = t - a; if (d < 0 || d > .25) return [0, 0]; const k = amp * Math.exp(-d / .08); return [k * Math.sin(90 * d), k * Math.cos(77 * d)]; };
const s9Ic = (d, sz, sw = 2) => `<span class="s9-ic" style="width:${sz}px;height:${sz}px">${SVG(d, sw)}</span>`;
const s9Slam = (e, t, a, s0 = 1.35) => {
  const d = t - a, p = E.out5(prog(t, a, a + .14));
  e.style.opacity = d < 0 ? 0 : clamp(d / .03);
  e.style.transform = `scale(${s0 - (s0 - 1) * p})`;
  e.style.filter = d >= 0 && p < 1 ? `blur(${(8 * (1 - p)).toFixed(2)}px)` : '';
};
const s9Odo = (parent, str) => {
  const box = el('span', 's9-odo', null, parent), ds = [];
  [...str].forEach((c, k) => {
    const w = el('span', 's9-dg', null, box), s = el('span', 's9-strip', [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map(x => `<i>${x}</i>`).join(''), w);
    ds.push({ s, v: +c, spin: k });
  });
  return { box, ds };
};
const s9OdoDraw = (o, t, a, b) => {
  const p = prog(t, a, b), e = E.outExpo(p);
  o.ds.forEach(d => { const pos = (d.v + 10 * d.spin) * e; d.s.style.transform = `translateY(${(-(pos % 10) / 11 * 100).toFixed(3)}%)`; });
  o.box.style.filter = p > 0 && p < 1 && e < .97 ? `blur(${(3 * (1 - e)).toFixed(2)}px)` : '';
};
const s9G = document.createElement('canvas').getContext('2d');
// 잉크 기준 배치. 반환값은 요소 왼쪽 위 기준 잉크 상자
const s9Put = (e, inner, spec, align) => {
  const probe = el('i', 's9-probe', null, inner);
  const cs = getComputedStyle(inner), fs = parseFloat(cs.fontSize);
  s9G.font = `${cs.fontWeight} ${fs}px ${cs.fontFamily}`; if ('letterSpacing' in s9G) s9G.letterSpacing = cs.letterSpacing;
  e.style.left = '0px'; e.style.top = '0px';
  const er = e.getBoundingClientRect(), pr = probe.getBoundingClientRect(), ir = inner.getBoundingClientRect();
  const m = s9G.measureText(inner.textContent), base = pr.top - er.top, x0 = ir.left - er.left;
  const l = x0 - m.actualBoundingBoxLeft, r = x0 + m.actualBoundingBoxRight, tp = base - m.actualBoundingBoxAscent, bt = base + m.actualBoundingBoxDescent;
  const x = align === 'left' ? spec.x - l : spec.x - (l + r) / 2;
  const y = spec.top !== undefined ? spec.top - tp : spec.cy - (tp + bt) / 2;
  e.style.left = x + 'px'; e.style.top = y + 'px';
  probe.remove();
  return { l, r, t: tp, b: bt };
};
// 탭 고리 (흰 화면용: 4 px 잉크 35% 테두리)
const s9Tap = (e, t, a, x, y) => {
  const d = t - a;
  if (d < -.08 || d > .25) { e.style.opacity = 0; return; }
  const s = d < 0 ? lerp(1.15, 1, E.out3((d + .08) / .08)) : d < .08 ? lerp(1, .82, E.out3(d / .08)) : lerp(.82, 1.1, E.out3((d - .08) / .17));
  e.style.opacity = d < 0 ? E.out3((d + .08) / .08) : 1 - clamp((d - .1) / .15);
  e.style.left = (x - 36) + 'px'; e.style.top = (y - 36) + 'px'; e.style.transform = `scale(${s})`;
};

SCENE({
  id: 's9', start: 24.75, end: 30, inDur: 0.25,
  build(root) {
    __seed = 109;
    const A = S9_LAY;
    window.HO = window.HO || {};
    HO.s9 = { toolRows: () => S9_LAY.C.ys.map((y, i) => ({ x: S9_LAY.C.x, y, w: S9_LAY.C.w, h: S9_LAY.C.h, r: S9_LAY.C.r, color: S9_TOOLS[i][1] })) };
    // ---- 머리글 ----
    const P = A.pill;
    S9.pill = el('div', 's9-pill', '선생님은', root, `height:${P.h}px;font-size:${P.fs}px;padding:0 ${P.pad}px;` + (A.vert ? `top:${P.cy - P.h / 2}px` : `left:${P.x}px;top:${P.y}px`));
    S9.col = el('div', 's9-col', null, root);
    S9.lines = S9_LINES.map(([h, a], i) => {
      const o = el('div', 's9-line', null, S9.col, `font-size:${A.line.fs}px`);
      const inner = el('span', 's9-li', h, o);
      let dot = null;
      if (i === 2) dot = el('i', 's9-dot', null, o, `width:${A.line.dot}px;height:${A.line.dot}px`);
      return { o, inner, dot, a };
    });
    // ---- 무대 ----
    S9.stage = el('div', 's9-stage', null, root);
    if (!A.vert) S9.stage.style.clipPath = `inset(-200px -200px -200px ${A.clip}px)`;
    // A: 반 + 초대 코드 + 과제 카드
    const SA = A.A;
    S9.sA = el('div', 's9-sA', null, S9.stage);
    el('div', 's9-name', '2학년 3반', S9.sA, `left:${SA.name.x}px;top:${SA.name.y}px;font-size:${SA.name.fs}px`);
    el('div', 's9-lab', '초대 코드', S9.sA, `left:${SA.lab.x}px;top:${SA.lab.y}px;font-size:${SA.lab.fs}px`);
    const TL = SA.tiles;
    S9.tiles = [...S9_CODE].map((c, i) => {
      const t = el('div', 's9-tile', null, S9.sA, `left:${TL.x + i * (TL.w + TL.gap)}px;top:${TL.y}px;width:${TL.w}px;height:${TL.h}px;border-radius:${TL.r}px;font-size:${TL.fs}px`);
      const half = (cls) => { const h = el('div', 's9-half ' + cls, null, t); const g = el('div', 's9-gl', '', h, `height:${TL.h}px;line-height:${TL.h}px`); return { h, g }; };
      const o = { t, top: half('top'), bot: half('bot'), ft: half('top flap'), fb: half('bot flap'), fin: c, off: Math.floor(rnd() * 36) };
      el('i', 's9-seam', null, t);
      return o;
    });
    const CA = SA.card;
    S9.card = el('div', 's9-card', null, S9.sA, `left:${CA.x}px;top:${CA.y}px;width:${CA.w}px;height:${CA.h}px;border-radius:${CA.r}px;padding:${CA.pad}px`);
    el('div', 's9-ct', '3과 단어 시험', S9.card, `font-size:${CA.tfs}px`);
    el('div', 's9-cm', '시험 · 20단어 · 10. 17.까지', S9.card, `font-size:${CA.mfs}px`);
    const sub = el('div', 's9-sub', `<span style="font-size:${CA.sfs}px">제출</span>`, S9.card);
    const cnt = el('b', 's9-cnt', null, sub, `font-size:${CA.cfs}px`);
    S9.subOdo = s9Odo(cnt, '21'); el('span', 's9-cntr', '/28', cnt);
    S9.subBar = el('div', 's9-bar', '<i></i>', S9.card, `height:${CA.bar}px`).firstChild;
    S9.avg = el('div', 's9-avg', '평균 86점', S9.card, `font-size:${CA.pfs}px;right:${CA.pad - 4}px;top:${CA.pad - 6}px`);
    // B: 실시간 보기
    const SB = A.B;
    S9.sB = el('div', 's9-sB', null, S9.stage);
    S9.sBhead = el('div', 's9-name s9-lvh', `2학년 3반 실시간<i class="s9-ldot"></i>`, S9.sB, `left:${SB.head.x}px;top:${SB.head.y}px;font-size:${SB.head.fs}px`);
    const N = SB.nums;
    const nums = el('div', 's9-nums', null, S9.sB, `left:${N.x}px;top:${N.y}px;height:${N.h}px;gap:${N.gap}px`);
    [['24', '접속', '#03b26c'], ['18', '공부 중', '#3182f6'], ['28', '전체', '#191f28']].forEach(([n, l, c]) =>
      el('span', N.row ? 'row' : '', `<b style="font-size:${N.nfs}px;color:${c}">${n}</b><small style="font-size:${N.lfs}px">${l}</small>`, nums, `padding:0 ${N.pad}px`));
    // 학생 카드
    const ST = SB.stu;
    S9.stu = el('div', 's9-stu', null, S9.sB, `left:${ST.x}px;top:${ST.y}px;width:${ST.w}px;height:${ST.h}px;padding:${ST.pad}px`);
    const stop = el('div', 's9-stop', null, S9.stu, `height:${ST.ch}px`);
    el('span', 's9-schip', '학생 화면', stop, `font-size:${ST.cfs}px;height:${ST.ch}px;padding:0 ${Math.round(ST.cfs * .6)}px`);
    S9.stuN = el('b', 's9-sn', '17/20', stop, `font-size:${ST.pfs}px`);
    S9.stuBar = el('div', 's9-sbar', '<i></i>', S9.stu, `height:${ST.bar}px;margin-top:${Math.round(ST.pad * .6)}px`).firstChild;
    S9.qbox = el('div', 's9-qbox', null, S9.stu, `left:${ST.pad}px;right:${ST.pad}px;top:${ST.pad + ST.ch + ST.bar + 20}px;bottom:${ST.pad}px`);
    S9.qs = S9_Q.map(([w, m], i) => {
      const g = el('div', 's9-q', null, S9.qbox);
      const word = el('div', 's9-qw', w, g, `font-size:${ST.wfs}px`);
      const opt = el('div', 's9-opt', `<span class="s9-on" style="width:${ST.an}px;height:${ST.an}px;font-size:${Math.round(ST.an * .5)}px">${[2, 3, 1][i]}</span><span class="s9-ot">${m}</span>`, g, `height:${ST.ah}px;font-size:${ST.afs}px`);
      return { g, word, opt };
    });
    S9.done = el('div', 's9-sdone', `${s9Ic(S9_IC.check, Math.round(ST.wfs * .75), 2.2)}<b>과제를 제출했어요.<br>이번 100점</b>`, S9.qbox, `font-size:${Math.round(ST.afs * .92)}px`);
    // 실시간 카드
    const LV = SB.live;
    S9.live = el('div', 's9-live', null, S9.sB, `left:${LV.x}px;width:${LV.w}px;padding:${LV.pad}px`);
    const nm = el('div', 's9-lnm', null, S9.live);
    el('i', 's9-ldot', null, nm);
    el('b', '', '김서연', nm, `font-size:${LV.nfs}px`);
    el('small', '', '20301', nm, `font-size:${LV.ifs}px`);
    S9.lvStudy = el('div', 's9-lst', null, S9.live);
    el('div', 's9-lact', '3과 단어 · 실전 시험', S9.lvStudy, `font-size:${LV.afs}px`);
    S9.lvCnt = el('div', 's9-lcnt', '17/20', S9.lvStudy, `font-size:${LV.cfs}px`);
    S9.lvBar = el('div', 's9-bar', '<i></i>', S9.lvStudy, `height:${LV.bar}px`).firstChild;
    const ok = el('div', 's9-lok', null, S9.lvStudy, `font-size:${LV.ofs}px`);
    S9.lvOk = el('span', 'ok', '맞음 17', ok); el('span', 'no', '틀림 0', ok);
    S9.lvDone = el('div', 's9-ldone', '3과 단어 · 실전 시험<br>끝냄 · 정답 100%', S9.live, `font-size:${LV.dfs}px;left:${LV.pad}px;right:${LV.pad}px;top:${LV.pad + LV.nfs + 26}px`);
    S9.lvToday = el('div', 's9-ltd', '오늘 37단어', S9.live, `font-size:${LV.tfs}px;left:${LV.pad}px;bottom:${LV.pad}px`);
    S9.spk = [[-22, -26, 54, '#03b26c'], [LV.w - 30, -40, 62, '#ffc93c'], [LV.w + 4, 40, 40, '#03b26c']].map(([x, y, s, c]) =>
      el('div', 's9-spk', s9Ic(S9_IC.sparkles, s, 2), S9.live, `left:${x}px;top:${y}px;color:${c}`));
    // 선 + 데이터 점
    const WI = SB.wire;
    S9.wire = el('div', 's9-wire', `<svg width="${WI.x1 - WI.x0}" height="20" viewBox="0 0 ${WI.x1 - WI.x0} 20"><line x1="6" y1="10" x2="${WI.x1 - WI.x0 - 6}" y2="10" stroke="#03b26c" stroke-width="4" stroke-dasharray="2 10" stroke-linecap="round"/></svg>`, S9.sB, `left:${WI.x0}px;top:${WI.y - 10}px`);
    S9.wl = S9.wire.querySelector('line');
    S9.pulse = el('i', 's9-pulse', null, S9.sB);
    S9.foot = el('div', 's9-foot', '5초마다 새로 고쳐요.', S9.sB, `top:${SB.foot.y}px;font-size:${SB.foot.fs}px`);
    S9.tap = el('div', 's9-tap', null, S9.sB);
    // C: 수업 도구
    const C = A.C;
    S9.sC = el('div', 's9-sC', null, S9.stage);
    S9.rows = S9_TOOLS.map(([n, c, ic], i) => {
      const r = el('div', 's9-row', null, S9.sC, `left:${C.x}px;top:${C.ys[i]}px;width:${C.w}px;height:${C.h}px;border-radius:${C.r}px;background:${c};padding-left:${C.pl}px`);
      const icon = el('i', 's9-ricon', s9Ic(S9_IC[ic], C.icS, 2), r, `width:${C.ic}px;height:${C.ic}px`);
      el('b', '', n, r, `font-size:${C.fs}px;left:${C.nx}px`);
      return { r, icon };
    });
  },
  measure() {
    const A = S9_LAY;
    // 머리글 줄: 잉크 기준
    S9.lines.forEach((L0, i) => {
      L0.o.style.transform = ''; L0.inner.style.transform = ''; L0.inner.style.filter = '';
      const spec = A.vert ? { x: A.line.x, cy: A.line.cys[i] } : { x: A.line.x, top: A.line.top };
      const r = s9Put(L0.o, L0.inner, spec, A.vert ? 'center' : 'left');
      L0.ink = r;
      L0.o.style.transformOrigin = `${r.l}px ${r.t}px`;
      L0.inner.style.transformOrigin = `${A.vert ? (r.l + r.r) / 2 : r.l}px ${(r.t + r.b) / 2}px`;
      if (L0.dot) { const d = A.line.dot; L0.dot.style.left = (r.l - d - 22) + 'px'; L0.dot.style.top = ((r.t + r.b) / 2 - d / 2) + 'px'; }
    });
    if (A.vert) { const w = S9.pill.getBoundingClientRect().width; S9.pill.style.left = (540 - w / 2) + 'px'; }
    S9.pill.style.transformOrigin = A.vert ? '50% 50%' : '0 50%';
    // 발자국 가운데
    const fw = S9.foot.getBoundingClientRect().width; S9.foot.style.left = (A.B.foot.cx - fw / 2) + 'px';
    // 학생 카드 단어가 넘치면 줄여요
    S9.qs.forEach(q => {
      const avail = A.B.stu.w - A.B.stu.pad * 2, w = q.word.scrollWidth;
      if (w > avail) q.word.style.fontSize = (parseFloat(q.word.style.fontSize) * avail / w * .98) + 'px';
      const ot = q.opt.querySelector('.s9-ot'), ow = q.opt.clientWidth, need = q.opt.scrollWidth;
      if (need > ow) ot.style.fontSize = (A.B.stu.afs * (1 - (need - ow) / ot.scrollWidth) * .97) + 'px';
    });
    const tr = S9.qs[0].opt.getBoundingClientRect();
    S9.tapAt = { x: tr.left + tr.width / 2, y: tr.top + tr.height / 2 };
  },
  draw(t, lt, root) {
    const A = S9_LAY;
    // ---- 들어오기: 줄무늬 ----
    if (t < 25) {
      const n = A.stripes, sh = H / n, st = Math.min(.006, .05 / (n - 1));
      let d = '';
      for (let i = 0; i < n; i++) {
        const w = E.inOutExpo(prog(t, 24.75 + i * st, 24.75 + i * st + .2)) * (W + 16);   // 8px 넘치게: 끝 무렵 가장자리 실선이 안 남게
        if (w <= 0) continue;
        const y0 = (i * sh).toFixed(2), y1 = ((i + 1) * sh + .5).toFixed(2);
        d += i % 2 === 0 ? `M-8 ${y0}H${(w - 8).toFixed(2)}V${y1}H-8Z` : `M${(W + 8 - w).toFixed(2)} ${y0}H${W + 8}V${y1}H${(W + 8 - w).toFixed(2)}Z`;
      }
      root.style.clipPath = `path('${d || 'M0 0Z'}')`;
    }
    // ---- 머리글 ----
    pop(S9.pill, t, 25, .45);
    const [sx, sy] = s9Shake(t, 25, 8);
    S9.col.style.transform = `translate(${sx.toFixed(2)}px,${sy.toFixed(2)}px)`;
    S9.lines.forEach((L0, i) => {
      s9Slam(L0.inner, t, L0.a);
      if (!A.vert) {
        // 쌓기: 뒤 줄이 나올 때마다 한 칸씩 위로, 60 px(0.6배), 잉크 40%
        let y = 0, s = 1, op = 1;
        for (let k = 1; k < 4 - i; k++) {
          const p = E.outExpo(prog(t, S9_LINES[i + k][1], S9_LINES[i + k][1] + .22));
          y = lerp(y, A.line.slots[k], p); s = lerp(s, A.line.sc, p); op = lerp(op, .4, p);
        }
        L0.o.style.transform = `translate(0,${y.toFixed(2)}px) scale(${s.toFixed(4)})`;
        L0.o.style.opacity = op;
      } else {
        // 세로: 묶음이 바뀌면 옛 줄은 80 px 올라가며 사라져요
        // 새 줄 슬램과 겹치지 않게 박 0.1 s 앞에서 시작해 박 직후에 다 빠져요
        const nb = i < 2 ? 26.5 : i === 2 ? 28 : 99, p = E.out2(prog(t, nb - .12, nb + .01));
        L0.o.style.transform = `translate(0,${(-80 * p).toFixed(2)}px)`;
        L0.o.style.opacity = 1 - p;
      }
      if (L0.dot) { const ph = (t - 26.5) * 1.6; const s = 1.25 + .25 * Math.sin(ph * Math.PI * 2 - Math.PI / 2); L0.dot.style.transform = `scale(${t < 26.5 ? 0 : s})`; L0.dot.style.opacity = t < 26.5 ? 0 : 1; }
    });
    // ---- 무대 A ----
    // 한 판으로 미는 회전목마: A와 B가 같은 곡선으로 붙어서 움직여요(겹쳐 보이지 않게)
    const outA = E.outExpo(prog(t, 26.5, 26.8)), inB = outA;
    const dist = A.vert ? 1100 : 960;
    S9.sA.style.transform = `translateX(${(-dist * outA).toFixed(1)}px)`;
    S9.sA.style.visibility = t >= 26.8 ? 'hidden' : '';
    if (t < 26.8) {
      // 플립 타일
      const ch = k => S9_SET[((k % 36) + 36) % 36];
      S9.tiles.forEach((o, i) => {
        const L1 = S9_LOCK[i];
        let oldC, newC, u;
        if (t >= L1) { const k = Math.floor(L1 * 15); oldC = ch(k + o.off); newC = o.fin; u = (t - L1) / .1; }
        else { const k = Math.floor(t * 15); oldC = ch(k - 1 + o.off); newC = ch(k + o.off); u = (t - k / 15) / .06; }
        u = clamp(u);
        o.top.g.textContent = newC; o.bot.g.textContent = u < 1 ? oldC : newC;
        o.ft.g.textContent = oldC; o.fb.g.textContent = newC;
        o.ft.h.style.display = u < .5 ? '' : 'none'; o.fb.h.style.display = u >= .5 && u < 1 ? '' : 'none';
        o.ft.h.style.transform = `perspective(600px) rotateX(${(-180 * u).toFixed(1)}deg)`;
        o.fb.h.style.transform = `perspective(600px) rotateX(${(90 - 180 * (u - .5)).toFixed(1)}deg)`;
        o.ft.h.style.filter = `brightness(${1 - .35 * u * 2})`;
        o.t.classList.toggle('lock', t >= L1 + .1);
      });
      pop(S9.card, t, 25.5, .5);
      s9OdoDraw(S9.subOdo, t, 25.55, 26);
      S9.subBar.style.width = (75 * E.out3(prog(t, 25.55, 26))).toFixed(2) + '%';
      s9Slam(S9.avg, t, 26, 1.4);
    }
    // ---- 무대 B ----
    // 도구 줄(28.00~)과 겹치지 않게 박 직전에 넘겨 28.03에 다 사라져요
    const flip = E.in3(prog(t, 27.9, 28.03));
    S9.sB.style.visibility = t < 26.5 || t >= 28.03 ? 'hidden' : '';
    S9.sB.style.opacity = t < 26.5 ? 0 : clamp((t - 26.5) / .12);
    S9.sB.style.transform = `translateX(${(dist * (1 - inB)).toFixed(1)}px)` + (flip > 0 ? ` perspective(1600px) rotateX(${(90 * flip).toFixed(2)}deg)` : '');
    if (t >= 26.5 && t < 28.03) {
      const SB = A.B, LV = SB.live, ST = SB.stu;
      const ldot = (t - 26.5) * 1.6 * Math.PI * 2;
      S9.sBhead.lastChild.style.transform = `scale(${1.25 + .25 * Math.sin(ldot)})`;
      const nArr = S9_TAP.filter(a => t >= a + .2).length, nTap = S9_TAP.filter(a => t >= a).length;
      const done = t >= 27.5;
      // 선: 점선이 실시간 카드 쪽으로 흘러요 (60 px/s)
      S9.wl.style.strokeDashoffset = (-60 * (t - 26.5)).toFixed(2);
      // 데이터 점
      let pv = -1;
      S9_TAP.forEach(a => { if (t >= a && t < a + .2) pv = E.inOut3((t - a) / .2); });
      S9.pulse.style.opacity = pv < 0 ? 0 : 1;
      if (pv >= 0) { S9.pulse.style.left = (lerp(SB.wire.x0, SB.wire.x1, pv) - 8) + 'px'; S9.pulse.style.top = (SB.wire.y - 8) + 'px'; }
      // 탭
      const ta = S9_TAP.find(a => t >= a - .08 && t <= a + .25);
      s9Tap(S9.tap, t, ta || 0, S9.tapAt.x, S9.tapAt.y);
      if (!ta) S9.tap.style.opacity = 0;
      // 학생 카드
      S9.stuN.textContent = `${17 + nTap}/20`;
      S9.stuBar.style.width = ((17 + nTap) / 20 * 100) + '%';
      S9.qs.forEach((q, j) => {
        const rin = j === 0 ? 1 : E.out3(prog(t, S9_TAP[j - 1] + .1, S9_TAP[j - 1] + .22));
        const rout = j < 2 ? E.in3(prog(t, S9_TAP[j] + .1, S9_TAP[j] + .2)) : E.out2(prog(t, 27.5, 27.62));
        q.g.style.transform = `translateY(${((1 - rin) * 70 - rout * 70).toFixed(2)}px)`;
        q.g.style.opacity = Math.min(rin, 1 - rout);
        q.g.style.visibility = rin <= 0 || rout >= 1 ? 'hidden' : '';
        q.opt.classList.toggle('ok', t >= S9_TAP[j]);
        const pr = t >= S9_TAP[j] && t < S9_TAP[j] + .12 ? 1 - .03 * Math.sin(Math.PI * (t - S9_TAP[j]) / .12) : 1;
        q.opt.style.transform = `scale(${pr})`;
      });
      pop(S9.done, t, 27.5, .45);
      // 실시간 카드
      const pD = E.out3(prog(t, 27.5, 27.7));
      const h = lerp(LV.h, LV.h2, pD);
      S9.live.style.top = (LV.cy - h / 2) + 'px'; S9.live.style.height = h + 'px';
      const n = 17 + nArr;
      S9.lvCnt.textContent = `${n}/20`; S9.lvOk.textContent = `맞음 ${n}`; S9.lvToday.textContent = `오늘 ${37 + nArr}단어`;
      const lastA = [...S9_TAP].reverse().find(a => t >= a + .2);
      const bw = lastA ? lerp((n - 1) / 20, n / 20, E.out3(prog(t, lastA + .2, lastA + .4))) : n / 20;
      S9.lvBar.style.width = (bw * 100).toFixed(2) + '%';
      const bump = lastA ? 1 + .08 * Math.sin(Math.PI * prog(t, lastA + .2, lastA + .38)) : 1;
      S9.lvCnt.style.transform = `scale(${bump})`;
      S9.lvStudy.style.opacity = 1 - pD; S9.lvStudy.style.transform = `translateY(${-14 * pD}px) scaleY(${1 - .3 * pD})`;
      S9.lvDone.style.opacity = E.out3(prog(t, 27.55, 27.75)); S9.lvDone.style.transform = `translateY(${(1 - E.out3(prog(t, 27.55, 27.75))) * 14}px)`;
      const glowB = lastA && !done ? 1 - prog(t, lastA + .2, lastA + .45) : 0;
      const gD = prog(t, 27.5, 27.75);
      S9.live.style.borderColor = done ? s9Mix('#3182f6', '#03b26c', gD) : '#3182f6';
      S9.live.style.boxShadow = done ? `0 0 0 ${(12 * E.out3(gD)).toFixed(1)}px rgba(3,178,108,.14), 0 16px 40px rgba(3,178,108,.16)`
        : `0 0 0 ${(12 * glowB).toFixed(1)}px rgba(49,130,246,${(.22 * glowB).toFixed(3)}), 0 16px 40px rgba(0,27,55,.08)`;
      const u = prog(t, 27.5, 27.9);
      const ps = !done ? 1 : u < .15 ? lerp(1, .96, E.out3(u / .15)) : u < .5 ? lerp(.96, 1.03, E.inOut3((u - .15) / .35)) : lerp(1.03, 1, E.inOut3((u - .5) / .5));
      S9.live.style.transform = `scale(${ps.toFixed(4)})`;
      S9.spk.forEach((s, i) => {
        const a = 27.5 + i * .0625, p = prog(t, a, a + .35), out = prog(t, 27.95, 28.1);
        s.style.opacity = t < a ? 0 : clamp(p * 4) * (1 - out);
        s.style.transform = `scale(${p ? E.back(p) : 0}) rotate(${(1 - E.out3(p)) * -40}deg)`;
      });
      fadeUp(S9.foot, t, 27.5, .4, 14);
    }
    // ---- 무대 C: 수업 도구 ----
    S9.sC.style.visibility = t < 28 ? 'hidden' : '';
    if (t >= 28) S9.rows.forEach((o, i) => {
      const a = 28 + i * .0625, p = E.outExpo(prog(t, a, a + .18));
      o.r.style.opacity = t < a ? 0 : clamp((t - a) / .03);
      o.r.style.transform = `translateX(${(200 * (1 - p)).toFixed(2)}px) skewX(${(-10 * (1 - p)).toFixed(2)}deg)`;
      const b = 29 + i * .125, q = prog(t, b, b + .2);
      o.icon.style.transform = `translateY(${(-6 * Math.sin(Math.PI * q)).toFixed(2)}px)`;
    });
  },
});
const s9Mix = (a, b, p) => { const h = c => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16)); const x = h(a), y = h(b); return `rgb(${x.map((v, i) => Math.round(lerp(v, y[i], p))).join(',')})`; };
