// S5 · 12–14초 · 랭킹: 우리 반 단어왕은 바로 나!
// 들어오기: 11.75-12.00 엘리베이터 문 닫힘 (위아래 띠가 가운데로, 이 장면 소유). 핸드오프: 없음.
// 패널은 앱 wqRank 순서: 머리줄, 영어|중국어, 레벨 칩, 이번 주|역대 · 전체|우리 반, 내 순위, 시상대.
const S5_LAY = L({
  align: 'left',
  h1: { x: 140, top: 360, fs: 72 }, h2: { x: 140, top: 450, fs: 220 },
  panel: { x: 900, y: 98, w: 880, h: 864, r: 48, pad: 32 },
  rows: { head: 52, g1: 16, seg: 60, g2: 14, chips: 56, g3: 14, filt: 64, g4: 18, me: 88, g5: 18, pod: 400 },
  fs: { head: 40, chev: 20, chevW: 4.8, seg: 28, chip: 28, chipPad: 28, chipGap: 12, filtGap: 16, me: 28, meRank: 44, meScore: 32, meGap: 22, mePad: 32 },
  segR: 22, segPad: 6, meR: 32, podR: 36, podPadX: 20, podGap: 16,
  av: 104, av1: 132, avFs: 44, av1Fs: 56, badge: 42, badgeFs: 22, nameFs: 32, scoreFs: 26, ped: { 1: 138, 2: 104, 3: 78 }, pedFs: 60, pedR: 28, entGap: 10,
  crown: { w: 96, h: 74, sink: 30 },
  slide: { x: 300, y: 0 },
  conf: { w: 10, h: 16 },
  bug: { x0: 1600, y0: 975, x1: 1920, y1: 1080 },
}, {
  align: 'center',
  h1: { x: 540, cy: 300, fs: 64 }, h2: { x: 540, cy: 470, fs: 180 },
  panel: { x: 84, y: 605, w: 912, h: 820, r: 48, pad: 28 },
  rows: { head: 48, g1: 12, seg: 56, g2: 12, chips: 52, g3: 12, filt: 60, g4: 14, me: 84, g5: 14, pod: 400 },
  fs: { head: 36, chev: 18, chevW: 4.4, seg: 28, chip: 28, chipPad: 24, chipGap: 10, filtGap: 14, me: 28, meRank: 42, meScore: 32, meGap: 18, mePad: 28 },
  segR: 22, segPad: 6, meR: 32, podR: 36, podPadX: 16, podGap: 14,
  av: 100, av1: 126, avFs: 42, av1Fs: 54, badge: 40, badgeFs: 21, nameFs: 32, scoreFs: 26, ped: { 1: 136, 2: 102, 3: 76 }, pedFs: 58, pedR: 28, entGap: 10,
  crown: { w: 92, h: 71, sink: 28 },
  slide: { x: 0, y: 200 },
  conf: { w: 10, h: 16 },
  bug: { x0: 50, y0: 1420, x1: 380, y1: 1520 },
});
const S5_POD = [
  { r: 2, name: '이*준', v: '974점', av: '#e64980', badge: '#9aa5b1', a: 12.5, c: 1.6, d: .3 },
  { r: 1, name: '하늘별', v: '1,030점', av: '#fe9800', badge: '#f5a524', a: 13.0, c: 1.8, d: .35, me: true },
  { r: 3, name: '박*연', v: '912점', av: '#1b64da', badge: '#c8783a', a: 12.25, c: 1.6, d: .3 },
];
const S5_CROWN = '<svg viewBox="0 0 120 92"><path d="M13 80 L10 31 L37 53 L60 18 L83 53 L110 31 L107 80 Z" fill="#ffc93c" stroke="#f59f00" stroke-width="5" stroke-linejoin="round"/><rect x="17" y="62" width="86" height="8" rx="4" fill="#fff" fill-opacity=".3"/><circle cx="10" cy="24" r="8" fill="#ffc93c" stroke="#f59f00" stroke-width="5"/><circle cx="60" cy="11" r="9" fill="#ffc93c" stroke="#f59f00" stroke-width="5"/><circle cx="110" cy="24" r="8" fill="#ffc93c" stroke="#f59f00" stroke-width="5"/></svg>';
const S5_CONF_C = ['#ffc93c', '#f59f00', '#ffffff', '#3182f6', '#ffc93c', '#e8f3ff', '#3182f6', '#ffffff'];
const S5 = {};
const s5Shake = (t, a, amp) => { const d = t - a; if (d < 0 || d > .25) return [0, 0]; const k = amp * Math.exp(-d / .08); return [k * Math.sin(90 * d), k * Math.cos(77 * d)]; };

SCENE({
  id: 's5', start: 11.75, end: 14, inDur: 0.25,
  build(root) {
    __seed = 105;
    const A = S5_LAY, F = A.fs, P = A.panel, R = A.rows;
    // 헤드라인
    S5.h1 = el('div', 's5-h s5-h1', `<span class="ln"><span>우리 반 단어왕은<i class="s5-probe"></i></span></span>`, root, `font-size:${A.h1.fs}px`);
    S5.h2 = el('div', 's5-h s5-h2', `<span class="s5-h2in">바로 나!<i class="s5-probe"></i></span>`, root, `font-size:${A.h2.fs}px`);
    S5.h2in = S5.h2.firstChild;
    // 패널
    const pn = S5.panel = el('div', 's5-panel', null, root, `left:${P.x}px;top:${P.y}px;width:${P.w}px;height:${P.h}px;border-radius:${P.r}px;padding:${P.pad}px`);
    const row = (cls, h, mt, html) => el('div', 's5-row ' + cls, html, pn, `height:${h}px;margin-top:${mt}px`);
    const head = row('s5-top', R.head, 0, `<b style="font-size:${F.head}px">영어 랭킹</b>`);
    el('i', 's5-chev', null, head, `width:${F.chev}px;height:${F.chev}px;border-width:0 0 ${F.chevW}px ${F.chevW}px;left:${F.chev * .45}px;top:${(R.head - F.chev) / 2}px`);
    const seg = (parent, a, b, on, h) => {
      const s = el('div', 's5-seg', null, parent, `height:${h}px;border-radius:${A.segR}px;padding:${A.segPad}px`);
      const k = el('i', 's5-knob', null, s, `top:${A.segPad}px;height:${h - A.segPad * 2}px;border-radius:${A.segR - A.segPad + 2}px`);
      const x = el('span', on === 0 ? 'on' : '', a, s, `font-size:${F.seg}px`), y = el('span', on === 1 ? 'on' : '', b, s, `font-size:${F.seg}px`);
      return { s, k, x, y };
    };
    S5.lang = seg(row('', R.seg, R.g1), '영어', '중국어', 0, R.seg);
    const chips = row('s5-chips', R.chips, R.g2);
    chips.style.gap = F.chipGap + 'px';
    ['기초', '중학교', '고등학교', '수능 · 토익'].forEach((c, i) => el('span', i === 1 ? 'on' : '', c, chips, `font-size:${F.chip}px;padding:0 ${F.chipPad}px;height:100%`));
    const filt = row('s5-filt', R.filt, R.g3);
    filt.style.gap = F.filtGap + 'px';
    S5.per = seg(filt, '이번 주', '역대', 0, R.filt);
    S5.scope = seg(filt, '전체', '우리 반', 0, R.filt);
    S5.me = row('s5-me', R.me, R.g4, `<span>내 순위</span><b style="font-size:${F.meRank}px">1위</b><em style="font-size:${F.meScore}px">1,030점</em><span class="s5-nm">이름: 하늘별</span>`);
    S5.me.style.cssText += `;border-radius:${A.meR}px;padding:0 ${F.mePad}px;gap:${F.meGap}px;font-size:${F.me}px`;
    // 시상대 (2-1-3)
    const pod = S5.pod = row('s5-pod', R.pod, R.g5);
    pod.style.cssText += `;border-radius:${A.podR}px;padding:0 ${A.podPadX}px;column-gap:${A.podGap}px`;
    S5.cols = S5_POD.map(d => {
      const big = d.r === 1, av = big ? A.av1 : A.av, col = el('div', `s5-col r${d.r}${d.me ? ' me' : ''}`, null, pod);
      const up = el('div', 's5-up', null, col);
      const ent = el('div', 's5-ent', null, up);
      const avEl = el('div', 's5-av', `${d.name[0]}<i style="width:${A.badge}px;height:${A.badge}px;font-size:${A.badgeFs}px;border-width:4px;right:${-A.badge * .12}px;bottom:${-A.badge * .12}px;background:${d.badge}">${d.r}</i>`, ent, `width:${av}px;height:${av}px;font-size:${big ? A.av1Fs : A.avFs}px;background:${d.av}`);
      const nm = el('b', '', `${d.me ? '<i class="s5-hl"></i>' : ''}${d.name}`, ent, `font-size:${A.nameFs}px;margin-top:${A.entGap + 4}px`);
      el('small', '', d.v, ent, `font-size:${A.scoreFs}px`);
      const ped = el('div', 's5-ped', String(d.r), col, `height:${A.ped[d.r]}px;margin-top:${A.entGap}px;font-size:${A.pedFs}px;border-radius:${A.pedR}px ${A.pedR}px 0 0`);
      const o = { d, col, up, ent, avEl, nm, ped, h: A.ped[d.r] + A.entGap };
      if (big) {
        o.crown = el('div', 's5-crown', S5_CROWN, ent, `width:${A.crown.w}px;height:${A.crown.h}px;margin-left:${-A.crown.w / 2}px;top:${-A.crown.h + A.crown.sink}px`);
        o.hl = nm.firstChild;
      }
      return o;
    });
    S5.c1 = S5.cols[1];
    // 탭 고리, 색종이, 문 가장자리, 이음선
    S5.tap = el('div', 's5-tap', null, root, 'width:72px;height:72px;opacity:0');
    S5.confL = el('div', 's5-conf', null, root);
    S5.conf = Array.from({ length: 40 }, (_, i) => ({
      e: el('i', '', null, S5.confL, `width:${A.conf.w}px;height:${A.conf.h}px;background:${S5_CONF_C[i % S5_CONF_C.length]}`),
      dx: (rnd() * 2 - 1) * 60, vx: (rnd() * 2 - 1) * 650, vy: -(700 + rnd() * 700), spin: (rnd() * 2 - 1) * 720, r0: rnd() * 360,
      fl: 6 + rnd() * 8, ph: rnd() * Math.PI * 2, d: rnd() * .04,
    }));
    S5.edgeT = el('i', 's5-edge', null, root); S5.edgeB = el('i', 's5-edge', null, root);
    S5.seam = el('i', 's5-seam', null, root, `top:${H / 2 - 3}px;height:6px;opacity:0`);
  },
  measure(root) {
    const A = S5_LAY;
    [S5.h1.querySelector('.ln > span'), S5.h2in, S5.panel, S5.me, ...S5.cols.flatMap(c => [c.up, c.ent, c.ped])].forEach(e => { e.style.transform = ''; e.style.filter = ''; });
    S5.h1.querySelector('.ln > span').style.transform = 'none';
    // 헤드라인: 잉크 기준 배치 (가로는 cap-top, 세로는 가운데)
    const g = document.createElement('canvas').getContext('2d');
    const put = (e, spec, text, wt) => {
      const cs = getComputedStyle(e), fs = parseFloat(cs.fontSize);
      g.font = `${wt} ${fs}px P`; if ('letterSpacing' in g) g.letterSpacing = cs.letterSpacing;
      e.style.left = '0px'; e.style.top = '0px';
      const er = e.getBoundingClientRect(), pr = e.querySelector('.s5-probe').getBoundingClientRect();
      const base = pr.top - er.top, m = g.measureText(text), x0 = (e.querySelector('.ln > span') || e.firstChild).getBoundingClientRect().left - er.left;
      const l = x0 - m.actualBoundingBoxLeft, r = x0 + m.actualBoundingBoxRight, tp = base - m.actualBoundingBoxAscent, bt = base + m.actualBoundingBoxDescent;
      const x = A.align === 'left' ? spec.x - l : spec.x - (l + r) / 2;
      const y = spec.top !== undefined ? spec.top - tp : spec.cy - (tp + bt) / 2;
      e.style.left = x + 'px'; e.style.top = y + 'px';
      return { l: x + l, r: x + r, t: y + tp, b: y + bt, base: y + base };
    };
    S5.r1 = put(S5.h1, A.h1, '우리 반 단어왕은', 800);
    S5.r2 = put(S5.h2, A.h2, '바로 나!', 900);
    S5.h2in.style.transformOrigin = `${A.align === 'left' ? '0px' : '50%'} ${S5.r2.t - parseFloat(S5.h2.style.top)}px`;   // 잉크 위 끝 기준: 위 줄을 덮지 않게 아래로 늘어나요
    // 분할 버튼 손잡이 자리
    [S5.lang, S5.per, S5.scope].forEach(s => {
      const sr = s.s.getBoundingClientRect();
      s.pos = [s.x, s.y].map(b => { const r = b.getBoundingClientRect(); return { x: r.left - sr.left, w: r.width }; });
      s.k.style.left = '0px'; s.k.style.width = s.pos[0].w + 'px';
      s.k.style.transform = `translateX(${s.pos[0].x}px)`;
    });
    const yr = S5.scope.y.getBoundingClientRect();
    S5.tapAt = { x: yr.left + yr.width / 2, y: yr.top + yr.height / 2 };
    const pr = S5.c1.ped.getBoundingClientRect();
    S5.confAt = { x: pr.left + pr.width / 2, y: pr.top + 10 };
  },
  draw(t, lt, root, prev) {
    const A = S5_LAY;
    // 11.75-12.00 문 닫힘: 위아래 띠가 가운데로, 이전 장면은 살짝 작아지고 어두워져요
    if (t < 12) {
      const p = E.inOutExpo(prog(t, 11.75, 12)), h = p * H / 2;
      let d = `M0 0H${W}V${h.toFixed(2)}H0Z M0 ${(H - h).toFixed(2)}H${W}V${H}H0Z`;
      if (t >= 11.96) d += ` M0 ${H / 2 - 3}H${W}V${H / 2 + 3}H0Z`;
      root.style.clipPath = `path('${d}')`;
      if (prev) {   // 이전 장면 0.96 + 어둡게. S4 는 자기 내용을 직접 0.96 으로 줄이므로(검은 틈 방지) 여기서는 S4 가 아닐 때만 크기를 바꿔요
        if (prev.id !== 'sc-s4') prev.style.transform = `scale(${1 - .04 * p})`;
        prev.style.filter = `brightness(${1 - .2 * p})`;
      }
      S5.edgeT.style.top = (h - 3) + 'px'; S5.edgeB.style.top = (H - h) + 'px';
      S5.edgeT.style.opacity = S5.edgeB.style.opacity = 1;
    } else { S5.edgeT.style.opacity = S5.edgeB.style.opacity = 0; }
    S5.seam.style.opacity = t < 11.96 ? 0 : 1 - E.out2(prog(t, 12, 12.12));
    // 헤드라인 1줄: 12.00 마스크 업
    reveal(S5.h1.firstElementChild, t, 12, .55);
    // 헤드라인 2줄 '바로 나!': 13.00 STRETCH + SHAKE 10 px
    {
      const p = prog(t, 13, 13.45), e = E.spring(p, 2.2, 6);
      const sx = lerp(.7, 1, e), sy = lerp(1.6, 1, e), [kx, ky] = s5Shake(t, 13, 10);
      S5.h2in.style.opacity = clamp((t - 13) / .03);
      S5.h2in.style.transform = `translate(${kx.toFixed(2)}px,${ky.toFixed(2)}px) scale(${sx.toFixed(4)},${sy.toFixed(4)})`;
    }
    // 패널 등장 12.00
    {
      const p = E.outExpo(prog(t, 12, 12.35));
      S5.panel.style.opacity = clamp(prog(t, 12, 12.12));
      S5.panel.style.transform = `translate(${(A.slide.x * (1 - p)).toFixed(2)}px,${(A.slide.y * (1 - p)).toFixed(2)}px)`;
    }
    // '전체' -> '우리 반' 12.25 (탭 + 손잡이)
    {
      const s = S5.scope, p = prog(t, 12.25, 12.47), e = p ? E.back(p, 1.7) : 0;
      const x = lerp(s.pos[0].x, s.pos[1].x, e), w = lerp(s.pos[0].w, s.pos[1].w, clamp(e));
      s.k.style.width = w + 'px'; s.k.style.transform = `translateX(${x}px)`;
      const on = t >= 12.33; s.x.className = on ? '' : 'on'; s.y.className = on ? 'on' : '';
      // 탭 고리: 0.08 s 전에 나타나 박에서 0.82로 눌리고 +0.25 s 에 사라져요
      const tp = S5.tap, a = 12.25;
      if (t >= a - .08 && t < a + .25) {
        const press = t < a ? lerp(1.1, 1, E.out3(prog(t, a - .08, a))) : lerp(.82, 1, E.out3(prog(t, a, a + .2)));
        const sc = t < a ? press : (t < a + .03 ? .82 : press);
        tp.style.opacity = t < a ? E.out3(prog(t, a - .08, a - .02)) : 1 - E.in3(prog(t, a + .1, a + .25));
        tp.style.transform = `translate(${S5.tapAt.x - 36}px,${S5.tapAt.y - 36}px) scale(${sc})`;
      } else tp.style.opacity = 0;
    }
    // 시상대: 받침대가 아래에서 자라고, 그 위 아바타 · 이름 · 점수가 올라타며 POP
    S5.cols.forEach(c => {
      const d = c.d, p = prog(t, d.a, d.a + d.d), sY = p ? Math.max(0, E.back(p, d.c)) : 0;
      c.ped.style.transform = `scaleY(${sY.toFixed(4)})`;
      c.up.style.transform = `translateY(${((1 - sY) * c.h).toFixed(2)}px)`;
      const q = prog(t, d.a + .04, d.a + .34);
      c.ent.style.opacity = clamp(q * 4);
      c.ent.style.transform = `scale(${q ? E.back(q, 2) : .001})`;
    });
    // 1등: 금색 고리 + 왕관 낙하 (13.15 착지, 찌그러짐) + 13.75 부터 둥실
    {
      const c = S5.c1, rp = E.out3(prog(t, 13, 13.2));
      c.avEl.style.boxShadow = `0 0 0 ${(6 * rp).toFixed(2)}px #ffc93c, 0 12px 32px rgba(0,0,0,.12)`;
      const cp = prog(t, 13.0, 13.15), y = -260 * (1 - E.in3(cp));
      const sq = t >= 13.15 ? lerp(.78, 1, E.spring(prog(t, 13.15, 13.45), 2.5, 5)) : 1;
      const bob = t >= 13.75 ? -4 * Math.sin(2 * Math.PI * 1.6 * (t - 13.75)) : 0;
      c.crown.style.opacity = t < 13.0 ? 0 : clamp((t - 13) / .04);
      c.crown.style.transform = `translateY(${(y + bob).toFixed(2)}px) rotate(${(-8 * (1 - E.out3(prog(t, 13.1, 13.3)))).toFixed(2)}deg) scale(${(1 + (1 - sq) * .5).toFixed(4)},${sq.toFixed(4)})`;
      // 13.50 이름 반짝
      const hp = prog(t, 13.5, 13.9);
      c.hl.style.opacity = t < 13.5 ? 0 : (1 - E.in3(hp));
      c.nm.style.transform = `scale(${(1 + .14 * (t >= 13.5 ? 1 - E.out3(prog(t, 13.5, 13.75)) : 0)).toFixed(4)})`;
    }
    // 내 순위: 13.50 SLAM + 파란 빛
    {
      const p = prog(t, 13.5, 13.64);
      S5.me.style.opacity = clamp((t - 13.5) / .03);
      const bl = 8 * (1 - E.out5(p));
      S5.me.style.transform = `scale(${lerp(1.1, 1, E.out5(p)).toFixed(4)})`;
      S5.me.style.filter = t >= 13.5 && bl > .05 ? `blur(${bl.toFixed(2)}px)` : '';
      const gp = prog(t, 13.5, 13.9);
      S5.me.style.boxShadow = t >= 13.5 ? `0 0 0 ${(12 * (1 - E.out2(gp))).toFixed(2)}px rgba(49,130,246,${(.25 * (1 - gp)).toFixed(3)})` : '';
    }
    // 색종이 40개: 13.00 금 받침대에서
    {
      const o = S5.confAt, bug = A.bug;
      S5.conf.forEach(c => {
        const dt = t - 13 - c.d;
        if (dt <= 0) { c.e.style.opacity = 0; return; }
        const k = .8, ex = 1 - Math.exp(-dt / k);
        const x = o.x + c.dx + c.vx * k * ex, y = o.y + c.vy * k * ex + 2400 * k * (dt - k * ex);
        const hid = (x > bug.x0 && x < bug.x1 && y > bug.y0 && y < bug.y1) || y > H + 40;
        c.e.style.opacity = hid ? 0 : clamp(dt / .04) * (1 - E.inOut3(prog(t, 13.55, 13.8)));
        c.e.style.transform = `translate(${(x - A.conf.w / 2).toFixed(1)}px,${(y - A.conf.h / 2).toFixed(1)}px) rotate(${(c.r0 + c.spin * dt).toFixed(1)}deg) scaleY(${(.25 + .75 * Math.abs(Math.cos(c.fl * dt + c.ph))).toFixed(3)})`;
      });
    }
  },
});
