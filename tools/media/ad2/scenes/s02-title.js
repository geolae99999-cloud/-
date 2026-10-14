// S2 · 2–4초 · 타이틀 + 카운트다운: VocaPro [NEW] [무료] / 단어 맞추기 / 대결 / 60초 스피드 퀴즈 / 3 · 2 · 1
// 들어오기: 1.75-2.00 S1 '?' 점을 통과하는 원형 확대(이 장면 소유). 핸드오프: HO.s2.block() -> {x, y, w, h, r, numFs}
const S2_LAY = L({
  align: 'left', x: 150,
  lock: { top: 150, mark: 104, v: 66, gap: 18, wm: 72, gap2: 24, pillH: 60, pillFs: 32, pillPad: 24, gap3: 12 },
  t1: { fs: 150, ls: -0.035, top: 290 }, t2: { fs: 330, ls: -0.05, top: 470 }, sub: { fs: 46, top: 880 },
  block: { x: 1240, y: 280, w: 520, h: 520, r: 64 }, numFs: 380, ring: 440,
  qFallback: { cx: 1240, cy: 800, d: 60 },
}, {
  align: 'center', x: 540,
  lock: { cy: 300, mark: 96, v: 61, gap: 18, wm: 64, gap2: 22, pillH: 52, pillFs: 28, pillPad: 20, gap3: 10 },
  t1: { fs: 140, ls: -0.035, cy: 446 }, t2: { fs: 300, ls: -0.05, cy: 692 }, sub: { fs: 42, cy: 882 },   // 스토리보드 150/320 은 두 줄이 맞닿아서 조금 줄였어요
  block: { x: 290, y: 930, w: 500, h: 500, r: 60 }, numFs: 360, ring: 420,
  qFallback: { cx: 790, cy: 1200, d: 56 },
});
const S2_BLUE = [49, 130, 246], S2_INK = [25, 31, 40], S2_CORAL = [240, 68, 82];
// 문자열 잉크 상자 (요소 왼쪽 위 기준). probe 로 기준선을 잡고 캔버스로 글리프 잉크를 재요.
const s2Ink = (w) => {
  const cs = getComputedStyle(w), fs = parseFloat(cs.fontSize), ls = parseFloat(cs.letterSpacing) || 0;
  const g = document.createElement('canvas').getContext('2d'); g.font = `${cs.fontWeight} ${fs}px P`;
  if ('letterSpacing' in g) g.letterSpacing = ls + 'px';
  const pr = w.querySelector('.s2-probe'), wr = w.getBoundingClientRect(), b = pr.getBoundingClientRect().top - wr.top;
  const x0 = (w.querySelector('.ln > span, .ch') || w).getBoundingClientRect().left - wr.left;
  const m = g.measureText(w.textContent);
  return { l: x0 - m.actualBoundingBoxLeft, r: x0 + m.actualBoundingBoxRight, t: b - m.actualBoundingBoxAscent, bt: b + m.actualBoundingBoxDescent, b };
};
const s2Rgb = (a, b, p) => `rgb(${a.map((v, i) => Math.round(lerp(v, b[i], p))).join(',')})`;
const S2 = {};

SCENE({
  id: 's2', start: 1.75, end: 4, inDur: 0.25,
  build(root) {
    const Lk = S2_LAY.lock;
    // 로고 줄: 흰 둥근 사각 + 파란 V, 워드마크, NEW, 무료
    const lock = S2.lock = el('div', 's2-lock', null, root);
    el('span', 'logoMark s2-mark', 'V', lock, `width:${Lk.mark}px;height:${Lk.mark}px;border-radius:${Lk.mark * .29}px;font-size:${Lk.v}px`);
    el('span', 's2-wm', 'VocaPro', lock, `font-size:${Lk.wm}px;margin-left:${Lk.gap}px`);
    S2.newP = el('span', 's2-pill s2-new', 'NEW', lock, `height:${Lk.pillH}px;padding:0 ${Lk.pillPad}px;font-size:${Lk.pillFs}px;margin-left:${Lk.gap2}px;letter-spacing:.01em`);
    S2.free = el('span', 's2-pill s2-free', '무료', lock, `height:${Lk.pillH}px;padding:0 ${Lk.pillPad}px;font-size:${Lk.pillFs}px;margin-left:${Lk.gap3}px`);
    // 제목
    S2.title = el('div', 's2-title', null, root);
    S2.t1 = el('div', 's2-t s2-t1', null, S2.title, `font-size:${S2_LAY.t1.fs}px;letter-spacing:${S2_LAY.t1.ls}em`);
    S2.t1ch = split(S2.t1, '단어 맞추기'); el('i', 's2-probe', null, S2.t1);
    S2.t2 = el('div', 's2-t s2-t2', '<span class="s2-t2in" style="display:inline-block">대결</span>', S2.title, `font-size:${S2_LAY.t2.fs}px;letter-spacing:${S2_LAY.t2.ls}em`);
    S2.t2in = S2.t2.firstChild; el('i', 's2-probe', null, S2.t2);
    S2.sub = el('div', 's2-sub', '<span class="ln"><span>60초 스피드 퀴즈<i class="s2-probe"></i></span></span>', root, `font-size:${S2_LAY.sub.fs}px`);
    // 카운트다운 블록
    const B = S2_LAY.block, nf = S2_LAY.numFs, rg = S2_LAY.ring;
    S2.cd = el('div', 's2-cd', null, root, `width:${B.w}px;height:${B.h}px;border-radius:${B.r}px`);
    S2.cdin = el('div', 's2-cdin', null, S2.cd);
    const rr = rg / 2;
    S2.ringSvg = el('div', '', `<svg class="s2-ring" width="${rg + 20}" height="${rg + 20}" viewBox="${-rr - 10} ${-rr - 10} ${rg + 20} ${rg + 20}" style="margin:${-rr - 10}px 0 0 ${-rr - 10}px"><circle r="${rr}" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="10" stroke-linecap="round" pathLength="100" stroke-dasharray="100 100" transform="rotate(-90)"/></svg>`, S2.cdin);
    S2.ring = S2.ringSvg.querySelector('circle');
    S2.numbox = el('div', 's2-numbox', null, S2.cdin, `height:${nf}px`);
    S2.strip = el('div', 's2-strip', ['3', '2', '1'].map(n => `<div style="font-size:${nf}px;line-height:${nf}px;height:${nf}px">${n}</div>`).join(''), S2.numbox);
    S2.numProbe = el('i', 's2-probe', null, S2.strip.firstChild);
    const ho = HO.s2 = HO.s2 || {};
    ho.block = () => ({ x: B.x, y: B.y, w: B.w, h: B.h, r: B.r, numFs: nf });
  },
  measure(root) {
    const A = S2_LAY, Lk = A.lock;
    [S2.lock, S2.title, S2.t2in, S2.sub, S2.cd, S2.cdin, S2.strip, ...S2.t1ch].forEach(e => { e.style.transform = ''; e.style.filter = ''; });
    // 로고 줄
    const lw = S2.lock.offsetWidth, lh = S2.lock.offsetHeight;
    if (A.align === 'left') { S2.lock.style.left = A.x + 'px'; S2.lock.style.top = Lk.top + 'px'; S2.lock.style.transformOrigin = `0 50%`; }
    else { S2.lock.style.left = (A.x - lw / 2) + 'px'; S2.lock.style.top = (Lk.cy - lh / 2) + 'px'; S2.lock.style.transformOrigin = '50% 50%'; }
    // 글자: 잉크 기준 배치
    const put = (e, spec) => {
      const k = s2Ink(e);
      const x = A.align === 'left' ? A.x - k.l : A.x - (k.l + k.r) / 2;
      const y = spec.top !== undefined ? spec.top - k.t : spec.cy - (k.t + k.bt) / 2;
      e.style.left = x + 'px'; e.style.top = y + 'px';
      return { l: x + k.l, r: x + k.r, t: y + k.t, b: y + k.bt };
    };
    const r1 = put(S2.t1, A.t1), r2 = put(S2.t2, A.t2); put(S2.sub, A.sub);
    S2.title.style.transformOrigin = A.align === 'left' ? `${A.x}px ${(r1.t + r2.b) / 2}px` : `${A.x}px ${(r1.t + r2.b) / 2}px`;
    // 카운트다운 블록 + 숫자 세로 가운데 (잉크 중심 = 블록 중심)
    const B = A.block, nf = A.numFs;
    S2.cd.style.left = B.x + 'px'; S2.cd.style.top = B.y + 'px';
    const g = document.createElement('canvas').getContext('2d'); g.font = `900 ${nf}px P`;
    const m = g.measureText('3'), base = S2.numProbe.getBoundingClientRect().top - S2.strip.firstChild.getBoundingClientRect().top;
    const inkC = base - (m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 2;   // 칸 위에서 잉크 중심까지
    S2.numbox.style.top = (B.h / 2 - inkC) + 'px';
  },
  draw(t, lt, root) {
    const A = S2_LAY;
    // 1.75-2.00 들어오기: '?' 점을 통과하는 원 (S1 의 밀어 넣기 변환을 따라가요)
    if (t < 2) {
      const q = (HO.s1 && HO.s1.qDot) ? HO.s1.qDot() : A.qFallback;
      const ps = (HO.s1 && HO.s1.push) ? HO.s1.push(t) : { ox: q.cx, oy: q.cy, s: 1 + .12 * E.in3(prog(t, 1.75, 2)) };
      const cx = ps.ox + (q.cx - ps.ox) * ps.s, cy = ps.oy + (q.cy - ps.oy) * ps.s;
      const r = q.d / 2 * ps.s * lerp(1, 70, E.inExpo(prog(t, 1.75, 2)));
      root.style.clipPath = `circle(${r}px at ${cx}px ${cy}px)`;
    }
    // 로고 줄 POP 2.00 (0.25 s), 무료 POP 2.125
    const popS = (a, d) => { const p = prog(t, a, a + d); return { s: p ? E.back(p, 1.6) : 0, op: clamp(p * 4) }; };
    const lp = popS(2, .25);
    S2.lock.style.opacity = lp.op; S2.lock.style.transform = `scale(${Math.max(.001, lp.s)})`;
    const fp = popS(2.125, .25);
    S2.free.style.opacity = fp.op; S2.free.style.transform = `scale(${Math.max(.001, fp.s)})`;
    // 제목 묶음: '대결' 도착 때 -6 px 밀렸다 돌아오고, 3.00 / 3.50 맥박
    const np = prog(t, 2.14, 2.44), nx = t < 2.14 ? 0 : np < .15 ? -6 * E.out3(np / .15) : -6 * (1 - E.spring((np - .15) / .85, 2, 5));
    const pulse = (a) => (t >= a && t < a + .12) ? .03 * (1 - E.out3(prog(t, a, a + .12))) : 0;
    S2.title.style.transform = `translate(${nx}px,0) scale(${1 + pulse(3) + pulse(3.5)})`;
    // '단어 맞추기' 한 글자씩 떨어지기
    S2.t1ch.forEach((c, i) => {
      const a = 2 + i * .025, p = prog(t, a, a + .18), e = E.out5(p);
      c.style.opacity = clamp(p * 3);
      c.style.transform = `translateY(${-60 * (1 - e)}%) rotate(${-8 * (1 - e)}deg)`;
    });
    // '대결' 오른쪽에서 돌진
    {
      const p = prog(t, 2.0625, 2.2825), e = E.outExpo(p), bl = 14 * (1 - e);
      S2.t2in.style.opacity = clamp((t - 2.0625) / .03);
      S2.t2in.style.transform = `translateX(${900 * (1 - e)}px) skewX(${-15 * (1 - e)}deg)`;
      S2.t2in.style.filter = bl > .05 ? `blur(${bl}px)` : 'none';
    }
    // '60초 스피드 퀴즈' 마스크 업 2.25
    reveal(S2.sub.firstElementChild, t, 2.25, .5);
    // 카운트다운 블록
    {
      const sp = prog(t, 2.5, 2.68), sE = sp ? E.back(sp, 1.2) : 0;   // 넘침을 줄여 세로에서 부제를 덮지 않게
      const p1 = E.outExpo(prog(t, 3, 3.16)), p2 = E.outExpo(prog(t, 3.5, 3.66));
      const rot = lerp(-10, 0, sE) + 90 * (p1 + p2);
      S2.cd.style.opacity = clamp(sp * 5);
      // 돌 때 모서리가 원래 사각형 밖으로 크게 나가지 않게 살짝 줄여요 (세로에서 '60초 스피드 퀴즈'를 덮지 않게)
      const th = (90 * (p1 + p2)) * Math.PI / 180, ext = Math.abs(Math.cos(th)) + Math.abs(Math.sin(th)), fit = Math.min(1, 1.08 / ext);
      S2.cd.style.transform = `rotate(${rot}deg) scale(${Math.max(.001, lerp(.2, 1, sE) * fit)})`;
      S2.cdin.style.transform = `rotate(${-90 * (p1 + p2)}deg)`;
      const c1 = E.out3(prog(t, 3, 3.1)), c2 = E.out3(prog(t, 3.5, 3.6));   // 남색 중간색이 오래 남지 않게 빨리
      S2.cd.style.background = c2 > 0 ? s2Rgb(S2_INK, S2_CORAL, c2) : s2Rgb(S2_BLUE, S2_INK, c1);
      // 숫자 굴리기 3 -> 2 -> 1
      const r1 = E.inOutExpo(prog(t, 3, 3.16)), r2 = E.inOutExpo(prog(t, 3.5, 3.66)), idx = r1 + r2, fr = idx - Math.floor(idx);
      S2.strip.style.transform = `translateY(${-idx * A.numFs}px)`;
      const bl = fr > .001 && fr < .999 ? 3 * Math.sin(Math.PI * fr) : 0;
      S2.strip.style.filter = bl > .05 ? `blur(${bl}px)` : 'none';
      // 박마다 시계 방향으로 비워지는 링
      const f = t < 2.5 ? 0 : ((t - 2.5) % .5) / .5;
      S2.ring.setAttribute('stroke-dashoffset', String(-100 * f));
    }
  },
});
