// S8 · 22.5-25초 · 영어는 기본, 중국어까지 (EN/中 반반 화면)
// 들어오기 22.25-22.50: S7 '실전 시험' 칩(HO.s7.examChip)이 파란 화면 전체로 커져요(이 장면 소유). 핸드오프: 없음.
// 23.00 토글이 EN -> 中 으로 넘어가며 빨간 판이 밀려 들어와 화면이 반은 파랑, 반은 빨강이 돼요.
const S8_LAY = L({
  vert: false, seam: 960,
  tog: { cx: 960, cy: 120, w: 260, h: 100, kw: 120, kh: 84, en: 40, zh: 46 },
  en: {
    align: 'left',
    h: { x: 120, top: 230, fs: 104 }, w: { x: 120, cy: 480, fs: 170 }, m: { x: 120, top: 600, fs: 56 },
    chips: { x: 120, y: 700, h: 52, fs: 26, pad: 22, gap: 12, w: 760 },
    cnt: { x: 120, y: 800, w: 720, h: 140, nfs: 72, lfs: 30, pad: 40, stack: true },
    wm: { cx: 480, cy: 640, fs: 700 },
  },
  zh: {
    align: 'left',
    h: { x: 1080, top: 230, fs: 104 }, w: { x: 1080, cy: 480, fs: 200 }, m: { x: 1080, top: 610, fs: 52 },
    chips: { x: 1080, y: 700, h: 52, fs: 26, pad: 20, gap: 12, w: 730 },
    cnt: { x: 1080, y: 790, w: 720, h: 170, nfs: 72, lfs: 30, xfs: 26, pad: 40, stack: true },
    wm: { cx: 1440, cy: 640, fs: 700 },
  },
  chipFB: { x: 1126, y: 616, w: 300, h: 92, r: 28 },
  ic: { tile: 56, gap: 16, pad: 18, fs: 36, icS: 30 },
}, {
  vert: true, seam: 880,
  tog: { cx: 540, cy: 880, w: 240, h: 92, kw: 110, kh: 76, en: 38, zh: 42 },
  en: {
    align: 'center',
    h: { x: 540, cy: 330, fs: 96 }, w: { x: 540, cy: 500, fs: 150 }, m: { x: 540, cy: 600, fs: 44 },
    chips: { x: 540, cy: 680, h: 52, fs: 28, pad: 22, gap: 12, w: 936 },
    cnt: { x: 540, cy: 772, h: 76, nfs: 56, lfs: 30, pad: 36, stack: false },
    wm: { cx: 540, cy: 470, fs: 520 },
  },
  zh: {
    align: 'center',
    h: { x: 540, cy: 1000, fs: 96 }, w: { x: 540, cy: 1142, fs: 140 }, m: { x: 540, cy: 1252, fs: 40 },
    chips: { x: 540, cy: 1310, h: 52, fs: 28, pad: 18, gap: 10, w: 936 },
    cnt: { x: 540, cy: 1390, h: 72, nfs: 52, lfs: 30, pad: 34, stack: false },
    wm: { cx: 540, cy: 1215, fs: 480 },
  },
  chipFB: { x: 395, y: 968, w: 290, h: 96, r: 28 },
  ic: { tile: 56, gap: 14, pad: 16, fs: 32, icS: 30 },
});
const S8_TROPHY = '<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4z"/><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/>';
const S8 = {};
const s8Shake = (t, a, amp) => { const d = t - a; if (d < 0 || d > .25) return [0, 0]; const k = amp * Math.exp(-d / .08); return [k * Math.sin(90 * d), k * Math.cos(77 * d)]; };
const s8Mix = (a, b, p) => { const h = c => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16)); const x = h(a), y = h(b); return `rgb(${x.map((v, i) => Math.round(lerp(v, y[i], p))).join(',')})`; };
// SLAM: 1.35 -> 1 (E.out5 0.14 s), 흐림 8 -> 0, 불투명 0 -> 1 (0.03 s)
const s8Slam = (e, t, a, s0 = 1.35) => {
  const d = t - a, p = E.out5(prog(t, a, a + .14));
  e.style.opacity = d < 0 ? 0 : clamp(d / .03);
  e.style.transform = `scale(${s0 - (s0 - 1) * p})`;
  e.style.filter = d >= 0 && p < 1 ? `blur(${(8 * (1 - p)).toFixed(2)}px)` : '';
};
// 오도미터: 자리마다 0-9,0 띠
const s8Odo = (parent, str, cls) => {
  const box = el('span', 's8-odo ' + (cls || ''), null, parent), ds = [];
  const n = [...str].filter(c => /\d/.test(c)).length; let k = 0;
  [...str].forEach(c => {
    if (/\d/.test(c)) {
      const w = el('span', 's8-dg', null, box), s = el('span', 's8-strip', [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map(x => `<i>${x}</i>`).join(''), w);
      ds.push({ s, v: +c, spin: 1 + Math.floor(k * 3 / n) }); k++;
    } else el('span', 's8-sep', c, box);
  });
  return { box, ds };
};
const s8OdoDraw = (o, t, a, b) => {
  const p = prog(t, a, b), e = E.outExpo(p);
  o.ds.forEach(d => { const pos = (d.v + 10 * d.spin) * e; d.s.style.transform = `translateY(${(-(pos % 10) / 11 * 100).toFixed(3)}%)`; });
  o.box.style.filter = p > 0 && p < 1 && e < .97 ? `blur(${(3 * (1 - e)).toFixed(2)}px)` : '';
};
// 잉크 기준 배치: 가로는 x(왼쪽 끝) + top(글자 위 끝), 세로는 x(가운데) + cy(잉크 가운데)
const s8G = document.createElement('canvas').getContext('2d');
const s8Put = (e, spec, align, text) => {
  const inner = e.querySelector('.ln > span') || e;
  const probe = el('i', 's8-probe', null, inner);
  const cs = getComputedStyle(inner), fs = parseFloat(cs.fontSize);
  s8G.font = `${cs.fontWeight} ${fs}px ${cs.fontFamily}`; if ('letterSpacing' in s8G) s8G.letterSpacing = cs.letterSpacing;
  e.style.left = '0px'; e.style.top = '0px';
  const er = e.getBoundingClientRect(), pr = probe.getBoundingClientRect(), ir = inner.getBoundingClientRect();
  const m = s8G.measureText(text || inner.textContent), base = pr.top - er.top, x0 = ir.left - er.left;
  const l = x0 - m.actualBoundingBoxLeft, r = x0 + m.actualBoundingBoxRight, tp = base - m.actualBoundingBoxAscent, bt = base + m.actualBoundingBoxDescent;
  const x = align === 'left' ? spec.x - l : spec.x - (l + r) / 2;
  const y = spec.top !== undefined ? spec.top - tp : spec.cy - (tp + bt) / 2;
  e.style.left = x + 'px'; e.style.top = y + 'px';
  probe.remove();
  return { l: l, r: r, t: tp, b: bt };
};

SCENE({
  id: 's8', start: 22.25, end: 25, inDur: 0.25,
  build(root) {
    __seed = 108;
    const A = S8_LAY;
    root.style.background = '#3182f6';
    const half = (k, lang) => {
      const C = A[k], o = {};
      o.wrap = el('div', `s8-half s8-${k}`, null, root);
      o.wmBox = el('div', 's8-wmbox', null, o.wrap);
      o.wm = el('div', 's8-wm' + (k === 'zh' ? ' zh' : ''), k === 'zh' ? '中' : 'A', o.wmBox, `font-size:${C.wm.fs}px`);
      o.c = el('div', 's8-content', null, o.wrap);
      o.h = el('div', 's8-h', k === 'en' ? '영어는 기본,' : '중국어까지.', o.c, `font-size:${C.h.fs}px`);
      o.w = el('div', 's8-w' + (k === 'zh' ? ' zh' : ''), k === 'en' ? 'victory' : '胜利', o.c, `font-size:${C.w.fs}px`);
      o.m = el('div', 's8-m', k === 'en' ? '<span class="ln"><span>승리</span></span>'
        : '<span class="ln"><span><b>shènglì</b> · <em>승리</em></span></span>', o.c, `font-size:${C.m.fs}px`);
      const ch = C.chips;
      o.chips = el('div', 's8-chips', null, o.c, `top:${ch.y !== undefined ? ch.y : ch.cy - ch.h / 2}px;height:${ch.h}px;gap:${ch.gap}px;` +
        (A.vert ? `left:${ch.x - ch.w / 2}px;width:${ch.w}px;justify-content:center` : `left:${ch.x}px;width:${ch.w}px`));
      o.chipEls = lang.map(s => el('span', 's8-chip', s, o.chips, `font-size:${ch.fs}px;padding:0 ${ch.pad}px`));
      const cn = C.cnt;
      if (cn.stack) {
        o.cnt = el('div', 's8-cnt s8-stack', null, o.c, `left:${cn.x}px;top:${cn.y}px;width:${cn.w}px;height:${cn.h}px;padding:0 ${cn.pad}px`);
        const top = el('div', 's8-cnum', null, o.cnt, `font-size:${cn.nfs}px`);
        o.odo = s8Odo(top, k === 'en' ? '44,017' : '11,470');
        el('div', 's8-clab', k === 'en' ? '영어 내장 사전 단어' : '중국어 HSK 단어 · 병음 포함', o.cnt, `font-size:${cn.lfs}px`);
        if (cn.xfs) o.extra = el('div', 's8-cx', 'HSK 1~6급 · 신HSK 1~9급', o.cnt, `font-size:${cn.xfs}px`);
      } else {
        o.cnt = el('div', 's8-cnt s8-line', null, o.c, `top:${cn.cy - cn.h / 2}px;height:${cn.h}px;padding:0 ${cn.pad}px`);
        const top = el('div', 's8-cnum', null, o.cnt, `font-size:${cn.nfs}px`);
        o.odo = s8Odo(top, k === 'en' ? '44,017' : '11,470');
        el('div', 's8-clab', k === 'en' ? '영어 내장 사전 단어' : 'HSK 단어 · 병음 포함', o.cnt, `font-size:${cn.lfs}px`);
      }
      return o;
    };
    S8.en = half('en', ['기초', '중학교', '고등학교', '수능 · 토익']);
    S8.zh = half('zh', ['HSK 1~2급', 'HSK 3~4급', 'HSK 5~6급', '신HSK 7~9급']);
    // 토글 EN | 中 (앱 lang-sw 모양)
    const T = A.tog, pd = (T.h - T.kh) / 2;
    S8.tog = el('div', 's8-tog', null, root, `left:${T.cx - T.w / 2}px;top:${T.cy - T.h / 2}px;width:${T.w}px;height:${T.h}px;padding:${pd}px`);
    S8.knob = el('i', 's8-knob', null, S8.tog, `left:${pd}px;top:${pd}px;width:${T.kw}px;height:${T.kh}px`);
    S8.tEn = el('span', 's8-ten', 'EN', S8.tog, `left:${pd}px;top:${pd}px;width:${T.kw}px;height:${T.kh}px;font-size:${T.en}px`);
    S8.tZh = el('span', 's8-tzh zh', '中', S8.tog, `left:${T.w - pd - T.kw}px;top:${pd}px;width:${T.kw}px;height:${T.kh}px;font-size:${T.zh}px`);
    S8.kx = [0, T.w - pd * 2 - T.kw];
    // 전환용 칩 복제 (S7 '실전 시험' 칩과 같은 모양)
    const I = A.ic;
    S8.rep = el('div', 's8-rep', `<i style="width:${I.tile}px;height:${I.tile}px;border-radius:${Math.round(I.tile * .32)}px"><span style="width:${I.icS}px;height:${I.icS}px">${SVG(S8_TROPHY, 2)}</span></i><b style="font-size:${I.fs}px">실전 시험</b>`, root, `gap:${I.gap}px;padding:0 ${I.pad}px`);
    S8.ring = el('div', 's8-ring', null, root);
  },
  measure() {
    const A = S8_LAY;
    ['en', 'zh'].forEach(k => {
      const o = S8[k], C = A[k];
      [o.h, o.w, o.m, o.wm, o.cnt, o.chips, ...o.chipEls].forEach(e => { e.style.transform = ''; e.style.filter = ''; e.style.opacity = ''; });
      o.m.querySelector('.ln > span').style.transform = 'none';
      const al = C.align;
      const rh = s8Put(o.h, C.h, al), rw = s8Put(o.w, C.w, al), rm = s8Put(o.m, C.m, al);
      const org = (e, r) => { e.style.transformOrigin = `${al === 'left' ? r.l : (r.l + r.r) / 2}px ${(r.t + r.b) / 2}px`; };
      org(o.h, rh); org(o.w, rw);
      const rwm = s8Put(o.wm, { x: C.wm.cx, cy: C.wm.cy }, 'center');
      org(o.wm, { l: rwm.l, r: rwm.r, t: rwm.t, b: rwm.b }); o.wm.style.transformOrigin = `${(rwm.l + rwm.r) / 2}px ${(rwm.t + rwm.b) / 2}px`;
      if (!C.cnt.stack) { const w = o.cnt.getBoundingClientRect().width; o.cnt.style.left = (C.cnt.x - w / 2) + 'px'; }
    });
    S8.chip = null;
  },
  draw(t, lt, root) {
    const A = S8_LAY, en = S8.en, zh = S8.zh;
    // ---- 들어오기 22.25-22.50: 칩 -> 화면 전체 ----
    if (t < 22.5) {
      let c = A.chipFB;
      try { const g = window.HO && HO.s7 && HO.s7.examChip && HO.s7.examChip(); if (g && isFinite(g.x) && g.w > 0) c = g; } catch (e) { }
      const q = E.inOutExpo(prog(t, 22.25, 22.5));
      const x = lerp(c.x, 0, q), y = lerp(c.y, 0, q), w = lerp(c.w, W, q), h = lerp(c.h, H, q), r = lerp(c.r !== undefined ? c.r : 28, 0, q);
      root.style.clipPath = `inset(${y.toFixed(2)}px ${(W - x - w).toFixed(2)}px ${(H - y - h).toFixed(2)}px ${x.toFixed(2)}px round ${r.toFixed(2)}px)`;
      const pb = prog(t, 22.25, 22.35);
      root.style.background = s8Mix('#ffffff', '#3182f6', E.inOut3(pb));
      const R = S8.rep; R.style.left = c.x + 'px'; R.style.top = c.y + 'px'; R.style.width = c.w + 'px'; R.style.height = c.h + 'px';
      R.style.opacity = 1 - E.out2(prog(t, 22.25, 22.33));
      const G = S8.ring; G.style.left = x + 'px'; G.style.top = y + 'px'; G.style.width = w + 'px'; G.style.height = h + 'px'; G.style.borderRadius = r + 'px';
      G.style.opacity = 1 - pb;
    } else {
      root.style.background = '#3182f6';
      S8.rep.style.opacity = 0; S8.ring.style.opacity = 0;
    }
    // ---- EN 반쪽 ----
    const [ex, ey] = s8Shake(t, 22.5, 8);
    en.c.style.transform = `translate(${ex.toFixed(2)}px,${ey.toFixed(2)}px)`;
    s8Slam(en.h, t, 22.5);
    s8Slam(en.w, t, 22.625);
    fadeUp(en.m.firstElementChild, t, 22.655, .35, 18); en.m.firstElementChild.firstElementChild.style.transform = 'none';
    en.m.style.opacity = t < 22.655 ? 0 : 1;
    en.chipEls.forEach((c, i) => pop(c, t, 22.75 + i * .0625, .4));
    fadeUp(en.cnt, t, 22.75, .3, 24); s8OdoDraw(en.odo, t, 22.75, 23.25);
    // 워터마크 'A': 22.50 SLAM 1.3 -> 1, 이후 -20 px 흐름
    const wmA = E.out5(prog(t, 22.5, 22.64)), dA = -20 * prog(t, 22.5, 25);
    en.wm.style.opacity = t < 22.5 ? 0 : clamp((t - 22.5) / .03);
    en.wm.style.transform = A.vert ? `translate(${dA}px,0) scale(${1.3 - .3 * wmA})` : `translate(${dA}px,0) scale(${1.3 - .3 * wmA})`;
    // ---- 23.00 전환: 빨간 판이 밀려 들어와요 ----
    const pp = E.outExpo(prog(t, 23, 23.25));
    if (A.vert) { const y0 = t < 23 ? H : lerp(H, A.seam, pp); zh.wrap.style.clipPath = `inset(${y0.toFixed(2)}px 0 0 0)`; }
    else { const x0 = t < 23 ? W : lerp(W, A.seam, pp); zh.wrap.style.clipPath = `inset(0 0 0 ${x0.toFixed(2)}px)`; }
    zh.wrap.style.visibility = t < 23 ? 'hidden' : '';
    const [zx, zy] = s8Shake(t, 23, 8);
    zh.c.style.transform = `translate(${zx.toFixed(2)}px,${zy.toFixed(2)}px)`;
    s8Slam(zh.h, t, 23);
    s8Slam(zh.w, t, 23.125);
    reveal(zh.m.firstElementChild, t, 23.25, .5); zh.m.style.opacity = t < 23.25 ? 0 : 1;
    zh.chipEls.forEach((c, i) => pop(c, t, 23.25 + i * .0625, .4));
    fadeUp(zh.cnt, t, 23.25, .3, 24); s8OdoDraw(zh.odo, t, 23.25, 23.75);
    if (zh.extra) fadeUp(zh.extra, t, 23.75, .45, 14);
    const wmZ = E.out5(prog(t, 23, 23.14)), dZ = -20 * prog(t, 23, 25);
    zh.wm.style.opacity = t < 23 ? 0 : clamp((t - 23) / .03);
    zh.wm.style.transform = `translate(${dZ}px,0) scale(${1.3 - .3 * wmZ})`;
    // ---- 토글 ----
    const tp = prog(t, 22.5, 22.8);
    S8.tog.style.opacity = t < 22.5 ? 0 : clamp(tp * 6);
    const pulse = t >= 24.5 && t < 24.7 ? .08 * Math.sin(Math.PI * prog(t, 24.5, 24.7)) : 0;
    S8.tog.style.transform = `scale(${tp > 0 ? E.back(tp, 1.4) : 0})`;
    const ks = E.spring(prog(t, 23, 23.3)), kc = E.out2(prog(t, 23, 23.08));
    S8.knob.style.transform = `translateX(${lerp(S8.kx[0], S8.kx[1], ks).toFixed(2)}px) scale(${1 + pulse})`;
    S8.knob.style.background = s8Mix('#3182f6', '#f04452', kc);
    S8.knob.style.boxShadow = `0 4px 14px ${kc < .5 ? 'rgba(49,130,246,.35)' : 'rgba(240,68,82,.35)'}`;
    S8.tEn.style.color = s8Mix('#ffffff', '#8b95a1', kc);
    S8.tZh.style.color = s8Mix('#8b95a1', '#ffffff', kc);
  },
});
