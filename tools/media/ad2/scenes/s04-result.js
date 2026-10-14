// S4 · 10–12초 · 결과: 1,030점 · 새 최고 기록!
// 들어오기: 9.75-10.00 S3 시계의 마지막 '0' 속을 통과하는 확대 (이 장면 소유, HO.s3.zero() 사용). 핸드오프: 없음.
// 앱의 진짜 결과 화면(wqEndDraw)을 흰 카드 하나로: 뒤로 + '중학교 · 결과', 응원 마스코트, '새 최고 기록!', 1,030점, kv 3칸, 랭킹 | 다시 하기.
const S4_LAY = L({
  card: { x: 560, y: 80, w: 800, h: 920, r: 48 },
  head: { y: 120, h: 56, fs: 40, chev: 20, chevW: 4.8, chevX: 40 },
  art: { cx: 960, y: 200, d: 200, m: 156 },
  label: { cx: 960, cy: 440, h: 64, fs: 40, pad: 30 },
  score: { cx: 925, cy: 590, fs: 206, unit: 70, gap: 12 },
  kv: { x: 597, y: 740, w: 230, h: 140, gap: 16, r: 28, nfs: 60, lfs: 28 },
  btn: { y: 910, h: 70, w: 330, gap: 20, fs: 30, ic: 34, r: 22 },
  rings: { cx: 960, cy: 540, r0: 470, step: 120 },
  conf: { x: 930, y: 580, w: 12, h: 20 },
  zero: { cx: 772, cy: 94, r: 7 },
  bug: { x0: 1600, y0: 975, x1: 1920, y1: 1080 },
}, {
  card: { x: 72, y: 290, w: 936, h: 1010, r: 48 },
  head: { y: 330, h: 60, fs: 36, chev: 18, chevW: 4.4, chevX: 40 },
  art: { cx: 540, y: 410, d: 220, m: 172 },
  label: { cx: 540, cy: 670, h: 60, fs: 38, pad: 28 },
  score: { cx: 515, cy: 818, fs: 240, unit: 76, gap: 12 },
  kv: { x: 122, y: 960, w: 268, h: 150, gap: 16, r: 28, nfs: 60, lfs: 30 },
  btn: { y: 1160, h: 80, w: 400, gap: 16, fs: 30, ic: 34, r: 24 },
  rings: { cx: 540, cy: 800, r0: 500, step: 120 },
  conf: { x: 540, y: 820, w: 12, h: 20 },
  zero: { cx: 560, cy: 278, r: 6.6 },
  bug: { x0: 50, y0: 1420, x1: 380, y1: 1520 },
});
const S4_IC = {
  podium: '<path d="M9 21V10h6v11M3 21v-6h6M15 21v-8h6v8M2 21h20"/><path d="M12 2.5l.9 1.9 2 .3-1.5 1.4.4 2-1.8-1-1.8 1 .4-2-1.5-1.4 2-.3z"/>',
  repeat: '<path d="M17 2l4 4-4 4"/><path d="M3 11V9a3 3 0 0 1 3-3h15"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v2a3 3 0 0 1-3 3H3"/>',
};
const S4_DIG = [{ d: 1, land: 10.25, cyc: 2 }, { d: 0, land: 10.3125, cyc: 2 }, { d: 3, land: 10.375, cyc: 3 }, { d: 0, land: 10.4375, cyc: 3 }];
const S4_CONF_C = ['#ffc93c', '#ffffff', '#03b26c', '#f04452', '#8b5cf6', '#e8f3ff'];
const S4 = {};

SCENE({
  id: 's4', start: 9.75, end: 12, inDur: 0.25,
  build(root) {
    __seed = 104;
    const A = S4_LAY, C = A.card;
    const at = (e, x, y, w, h) => { e.style.left = x + 'px'; e.style.top = y + 'px'; if (w != null) e.style.width = w + 'px'; if (h != null) e.style.height = h + 'px'; return e; };
    // 뒤 고리 6개 (방금 통과한 '0'의 메아리)
    // 내용 전체 묶음: S5 의 문 닫힘 동안 이 장면이 직접 0.96 으로 줄여요 (루트를 줄이면 가장자리에 검은 틈이 보여서, 파란 바탕은 루트에 남겨요)
    root = S4.all = el('div', 's4-fill', null, root);
    S4.rings = el('div', '', `<svg class="s4-rings" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${Array.from({ length: 6 }, () => `<circle cx="${A.rings.cx}" cy="${A.rings.cy}" r="10" fill="none" stroke="#fff" stroke-opacity=".10" stroke-width="2"/>`).join('')}</svg>`, root).querySelectorAll('circle');
    // 색종이: 반은 카드 뒤, 반은 카드 앞
    S4.confB = el('div', 's4-conf', null, root);
    S4.card = at(el('div', 's4-card', null, root), C.x, C.y, C.w, C.h);
    S4.card.style.borderRadius = C.r + 'px';
    S4.confF = el('div', 's4-conf', null, root);
    S4.conf = Array.from({ length: 70 }, (_, i) => {
      // 앞쪽 반은 진한 색만 (흰 카드 위 흰 조각은 얼룩처럼 보여서), 뒤쪽 반은 여섯 색 모두
      const front = i % 2 === 1, col = front ? S4_CONF_C[[0, 2, 3, 4][(i >> 1) % 4]] : S4_CONF_C[(i >> 1) % 6];
      const p = {
        e: el('i', '', null, front ? S4.confF : S4.confB, `width:${A.conf.w}px;height:${A.conf.h}px;background:${col}`),
        x0: A.conf.x + (rnd() * 2 - 1) * 70, y0: A.conf.y + (rnd() * 2 - 1) * 30,
        vx: (rnd() * 2 - 1) * 700, vy: -(900 + rnd() * 600), spin: (rnd() * 2 - 1) * 720, r0: rnd() * 360,
        fl: 6 + rnd() * 8, ph: rnd() * Math.PI * 2, d: rnd() * .05,
      };
      return p;
    });
    // 카드 안 (카드 기준 좌표)
    const cx0 = C.x, cy0 = C.y, card = S4.card;
    // 머리줄: 뒤로 + '중학교 · 결과'
    const Hd = A.head;
    S4.head = at(el('div', 's4-head', `<b style="font-size:${Hd.fs}px">중학교 · 결과</b>`, card), 0, Hd.y - cy0, null, Hd.h);
    const ch = el('i', 's4-chev', null, S4.head, `width:${Hd.chev}px;height:${Hd.chev}px;border-width:0 0 ${Hd.chevW}px ${Hd.chevW}px;left:${Hd.chevX + 6}px;top:${(Hd.h - Hd.chev) / 2}px`);
    // 결과 그림 자리 + 마스코트 (자리 아래 끝에서 가려져요)
    const Ar = A.art, ax = Ar.cx - Ar.d / 2 - cx0, ay = Ar.y - cy0;
    at(el('div', 's4-art', null, card), ax, ay, Ar.d, Ar.d);
    const pad = Ar.d;
    S4.mask = at(el('div', 's4-artmask', null, card), ax - pad, ay - pad, Ar.d + pad * 2, Ar.d + pad);
    S4.masc = at(el('div', 's4-mascot', '__MASCOT_CHEER__', S4.mask), pad + (Ar.d - Ar.m) / 2, pad + Ar.d - Ar.m - Ar.d * .04, Ar.m, Ar.m);
    // '새 최고 기록!' 알약 + 반짝 4개
    const Lb = A.label;
    S4.label = el('div', 's4-label', '새 최고 기록!', card, `height:${Lb.h}px;padding:0 ${Lb.pad}px;font-size:${Lb.fs}px`);
    S4.sparks = [0, 1, 2, 3].map(() => el('i', 's4-spark', null, card, `height:${Math.round(Lb.h * .09)}px`));
    // 점수: 자릿수 오도미터 + 고정 쉼표 + '점'
    const Sc = A.score;
    S4.score = el('div', 's4-score', null, card, `font-size:${Sc.fs}px`);
    S4.cols = S4_DIG.map((d, i) => {
      if (i === 1) S4.comma = el('div', 's4-col', `<i class="s4-comma">,</i>`, S4.score, 'overflow:visible;-webkit-mask-image:none;mask-image:none');
      const col = el('div', 's4-col', null, S4.score);
      const n = d.cyc * 10 + d.d;
      const strip = el('div', 's4-strip', Array.from({ length: n + 1 }, (_, k) => `<i>${k % 10}</i>`).join(''), col);
      return { col, strip, n, land: d.land };
    });
    S4.probe = el('i', 's4-probe', null, S4.cols[0].strip.firstChild);
    S4.unit = el('div', 's4-unit', `<span class="ln"><span>점<i class="s4-probe"></i></span></span>`, card, `font-size:${Sc.unit}px`);
    // kv 3칸
    const K = A.kv;
    S4.kv = [['38', '맞힘', 38, ''], ['97%', '정답률', 97, '%'], ['38', '최대 연속', 38, '']].map(([, lab, n, suf], i) => {
      const box = at(el('div', 's4-kv', `<b style="font-size:${K.nfs}px">0${suf}</b><span style="font-size:${K.lfs}px;margin-top:${Math.round(K.h * .05)}px">${lab}</span>`, card), K.x + i * (K.w + K.gap) - cx0, K.y - cy0, K.w, K.h);
      box.style.borderRadius = K.r + 'px';
      return { box, num: box.firstChild, n, suf, a: [11, 11.125, 11.25][i] };
    });
    // 버튼 (정지)
    const B = A.btn, bx = C.x + C.w / 2 - (B.w * 2 + B.gap) / 2 - cx0;
    [['s4-soft', S4_IC.podium, '랭킹'], ['s4-pri', S4_IC.repeat, '다시 하기']].forEach(([c, ic, t], i) => {
      const b = at(el('div', 's4-btn ' + c, `${SVG(ic, 1.8)}<span>${t}</span>`, card, `font-size:${B.fs}px;gap:${Math.round(B.fs * .3)}px;border-radius:${B.r}px`), bx + i * (B.w + B.gap), B.y - cy0, B.w, B.h);
      const s = b.querySelector('svg'); s.setAttribute('width', B.ic); s.setAttribute('height', B.ic);
    });
  },
  measure(root) {
    const A = S4_LAY, C = A.card, Sc = A.score, Lb = A.label;
    [S4.card, S4.masc, S4.label, S4.unit.firstChild.firstChild, ...S4.cols.map(c => c.strip)].forEach(e => { e.style.transform = ''; e.style.filter = ''; });
    const g = document.createElement('canvas').getContext('2d');
    g.font = `900 ${Sc.fs}px P`;
    const dw = g.measureText('0').width, cw = g.measureText(',').width * .92, lh = Math.round(Sc.fs * 1.08);
    S4.lh = lh;
    S4.cols.forEach(c => { c.col.style.width = dw + 'px'; c.col.style.height = lh + 'px'; [...c.strip.children].forEach(i => { i.style.height = lh + 'px'; i.style.lineHeight = lh + 'px'; }); });
    S4.comma.style.width = cw + 'px'; S4.comma.style.height = lh + 'px'; S4.comma.firstChild.style.lineHeight = lh + 'px';
    // 숫자 잉크 가운데 = (cx, cy)
    const asc = g.measureText('1030').actualBoundingBoxAscent;
    const base = S4.probe.getBoundingClientRect().top - S4.cols[0].strip.firstChild.getBoundingClientRect().top;
    const sw = dw * 4 + cw, sx = Sc.cx - sw / 2, sy = Sc.cy - (base - asc / 2);
    S4.score.style.left = (sx - C.x) + 'px'; S4.score.style.top = (sy - C.y) + 'px';
    // '점': 숫자와 기준선 맞춤
    const u = S4.unit, up = u.querySelector('.s4-probe');
    u.style.left = '0px'; u.style.top = '0px';
    const ub = up.getBoundingClientRect().top - u.getBoundingClientRect().top;
    u.style.left = (sx + sw + Sc.gap - C.x) + 'px'; u.style.top = (sy + base - ub - C.y) + 'px';
    // 알약 가운데
    const lw = S4.label.offsetWidth;
    S4.label.style.left = (Lb.cx - lw / 2 - C.x) + 'px'; S4.label.style.top = (Lb.cy - Lb.h / 2 - C.y) + 'px';
    S4.lw = lw;
    // 반짝: 알약 양 끝 바깥, 위아래로 비스듬히
    const sl = Lb.h * .42;
    S4.sparkDef = [[-1, -1], [-1, 1], [1, -1], [1, 1]].map(([sxn, syn]) => ({
      x: Lb.cx + sxn * (lw / 2 + Lb.h * .12) - C.x, y: Lb.cy + syn * Lb.h * .34 - C.y,
      a: Math.atan2(syn * .75, sxn) * 180 / Math.PI, len: sl,
    }));
    S4.sparks.forEach((s, i) => { const d = S4.sparkDef[i]; s.style.left = d.x + 'px'; s.style.top = d.y + 'px'; s.style.width = d.len + 'px'; s.style.marginTop = (-s.offsetHeight / 2) + 'px'; });
  },
  draw(t, lt, root, prev) {
    const A = S4_LAY, C = A.card;
    // 9.75-10.00: '0' 속 통과. 이전 장면을 '0' 가운데 기준으로 키우고, 이 장면은 그 구멍 크기의 원으로 보여요.
    if (t < 10) {
      let z = A.zero;
      try { if (HO.s3 && HO.s3.zero) { const q = HO.s3.zero(); if (q && isFinite(q.cx) && isFinite(q.cy) && q.r > 0) z = q; } } catch (e) {}
      const s = 1 + 27 * E.inExpo(prog(t, 9.75, 10));
      if (prev) prev.style.transform = `translate(${(z.cx - W / 2) * (1 - s)}px,${(z.cy - H / 2) * (1 - s)}px) scale(${s})`;
      // 28배 상한에서는 구멍이 200px 남짓이라, 마지막 0.07초 동안 구멍을 화면 끝까지 열어 10.00 컷을 이어 줘요.
      const open = E.in3(prog(t, 9.93, 10)) * Math.hypot(W, H);
      root.style.clipPath = `circle(${(z.r * s + open).toFixed(2)}px at ${z.cx}px ${z.cy}px)`;
    }
    const tt = Math.max(t, 10);   // 구멍 너머로는 10.00 상태를 보여요
    // 고리: 천천히 퍼져요 (+40 px/s)
    S4.rings.forEach((c, i) => c.setAttribute('r', (A.rings.r0 + i * A.rings.step + 40 * (tt - 10)).toFixed(1)));
    // 카드: 10.00 착지 1.04 -> 1 (스프링), 11.50-11.75 숨쉬기 1 -> 1.015
    const cs = (1 + .04 * (1 - E.spring(prog(tt, 10, 10.3), 2.2, 5))) * (1 + .015 * E.inOut3(prog(tt, 11.5, 11.75)));
    S4.card.style.transform = `scale(${cs})`;
    const dp = E.inOutExpo(prog(t, 11.75, 12));
    S4.all.style.transform = dp > 0 ? `scale(${1 - .04 * dp})` : '';
    // 머리줄 0.2 s
    S4.head.style.opacity = E.out3(prog(tt, 10, 10.2));
    // 점수 오도미터
    S4.cols.forEach(c => {
      const p = prog(tt, 10, c.land), e = E.outExpo(p), y = -e * c.n * S4.lh;
      const bl = p > 0 && p < 1 ? 3 * clamp((1 - e) * 3) : 0;
      c.strip.style.transform = `translateY(${y}px)`;
      c.strip.style.filter = bl > .05 ? `blur(${bl.toFixed(2)}px)` : '';
    });
    reveal(S4.unit.firstChild, tt, 10.45, .35);
    // 마스코트: 10.25 아래에서 뛰어올라 10.50 착지 찌그러짐, 그다음 둥실
    {
      const Ar = A.art, p = E.outExpo(prog(tt, 10.25, 10.5));
      const y = (1 - p) * (Ar.m + Ar.d * .1);
      const sq = tt >= 10.5 ? .86 + .14 * E.spring(prog(tt, 10.5, 10.85), 2.5, 5) : (tt >= 10.25 ? 1 + .06 * (1 - p) : 1);
      const sx = tt >= 10.5 ? 1 + (1 - sq) * .6 : 1 / Math.sqrt(sq);
      const bob = 8 * Math.sin(2 * Math.PI * 1.6 * Math.max(0, tt - 10.85)) * E.out3(prog(tt, 10.85, 11.1));
      S4.masc.style.transform = `translateY(${(y - bob).toFixed(2)}px) scale(${sx.toFixed(4)},${sq.toFixed(4)})`;
    }
    // '새 최고 기록!' 10.50 POP 1.8 -> 1
    {
      const p = prog(tt, 10.5, 10.66);
      S4.label.style.opacity = clamp((tt - 10.5) / .05);
      S4.label.style.transform = `scale(${lerp(1.8, 1, E.out5(p))})`;
      S4.sparks.forEach((s, i) => {
        const d = S4.sparkDef[i], g = E.out3(prog(tt, 10.53, 10.7)), o = 1 - E.in3(prog(tt, 10.95, 11.2));
        const push = Math.max(0, (tt - 10.53)) * 12 + g * 10;
        const rad = d.a * Math.PI / 180;
        s.style.opacity = tt < 10.53 ? 0 : o;
        s.style.transform = `translate(${Math.cos(rad) * push}px,${Math.sin(rad) * push}px) rotate(${d.a}deg) scaleX(${Math.max(.001, g * (1 - .4 * prog(tt, 10.8, 11.2)))})`;
      });
    }
    // kv 3칸 POP + 0부터 세기
    S4.kv.forEach(k => {
      const p = prog(tt, k.a, k.a + .22);
      k.box.style.opacity = clamp(p * 4);
      k.box.style.transform = `scale(${p ? E.back(p, 2.2) : .001})`;
      k.num.textContent = Math.round(k.n * E.out3(prog(tt, k.a, k.a + .3))) + k.suf;
    });
    // 색종이 10.50 (해석식, 공기 저항 조금)
    const dt0 = tt - 10.5, bug = A.bug;
    S4.conf.forEach(c => {
      const dt = dt0 - c.d;
      if (dt <= 0) { c.e.style.opacity = 0; return; }
      const k = .9, ex = 1 - Math.exp(-dt / k);
      const x = c.x0 + c.vx * k * ex, y = c.y0 + c.vy * k * ex + 2400 * k * (dt - k * ex);
      const rot = c.r0 + c.spin * dt, fl = Math.cos(c.fl * dt + c.ph);
      const hid = (x > bug.x0 && x < bug.x1 && y > bug.y0 && y < bug.y1) || y > H + 60;
      c.e.style.opacity = hid ? 0 : clamp(dt / .04);
      c.e.style.transform = `translate(${(x - A.conf.w / 2).toFixed(1)}px,${(y - A.conf.h / 2).toFixed(1)}px) rotate(${rot.toFixed(1)}deg) scaleY(${(.25 + .75 * Math.abs(fl)).toFixed(3)})`;
    });
  },
});
