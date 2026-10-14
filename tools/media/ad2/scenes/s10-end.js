// S10 · 30–34초 · 엔딩: 공부는 게임처럼, 실력은 진짜로 · VocaPro · 무료로 시작하기 → · vocapro.kro.kr
// 들어오기: 29.75-30.00 S9 도구 줄(HO.s9.toolRows) 다섯 개가 화면 가득 파란 줄무늬로 늘어나요(이 장면 소유). 핸드오프: 없음.
// 32.90-34.00 정지 포스터(33.2 s). 움직이는 것은 마스코트 흔들림(±6 px)과 느린 고리뿐.
const S10_LAY = L({
  stripeH: 216,
  tag: { fs: 60, lines: [{ cy: 220, text: '공부는 게임처럼, 실력은 ', gold: '진짜로', tail: '.' }] },
  logo: { cy: 400, mark: 150, v: 96, gap: 28, wm: 150 },
  cta: { cy: 620, h: 108, pad: 64, fs: 46, arrow: 38, gap: 18 },
  url: { cy: 760, fs: 46 }, foot: { cy: 830, fs: 28 },
  mascot: { x: 1540, y: 720, s: 220 },
  bub: { right: 1530, y: 700, h: 90, fs: 38, pad: 34, side: 'right' },
  rings: { r0: 240, r1: 760 },
  row: { pad: 22, ic: 76, icS: 40, nx: 126, fs: 50 },
  rowsFallback: [200, 340, 480, 620, 760].map(y => ({ x: 1000, y, w: 800, h: 120, r: 30 })),
}, {
  stripeH: 384,
  tag: { fs: 60, lines: [{ cy: 400, text: '공부는 게임처럼,' }, { cy: 480, text: '실력은 ', gold: '진짜로', tail: '.' }] },
  logo: { cy: 680, mark: 140, v: 90, gap: 24, wm: 116 },
  cta: { cy: 900, h: 120, w: 640, pad: 64, fs: 48, arrow: 40, gap: 18 },
  url: { cy: 1050, fs: 50 }, foot: { cy: 1115, fs: 30 },
  mascot: { x: 140, y: 1190, s: 200 },
  bub: { left: 370, y: 1230, h: 100, w: 510, fs: 40, pad: 34, side: 'left' },
  rings: { r0: 220, r1: 720 },
  row: { pad: 24, ic: 80, icS: 42, nx: 116, fs: 54 },
  rowsFallback: [620, 772, 924, 1076, 1228].map(y => ({ x: 84, y, w: 912, h: 128, r: 30 })),
});
const S10_BLUE = [49, 130, 246];
const S10_TOOLS = [
  { name: '퀴즈 쇼', color: '#fe9800', ic: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3z"/><path d="M19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8L19 16z"/>' },
  { name: '단어 빙고판', color: '#03b26c', ic: '<rect x="3.5" y="3.5" width="17" height="17" rx="2.5"/><path d="M9.2 3.5v17M14.8 3.5v17M3.5 9.2h17M3.5 14.8h17"/>' },
  { name: '발표자 뽑기·모둠', color: '#8b5cf6', ic: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.2a6.5 6.5 0 0 1 3.5 5.8"/>' },
  { name: '수업 타이머', color: '#0aa5b4', ic: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2.5M9 2.5h6"/>' },
  { name: '시험지 인쇄', color: '#3182f6', ic: '<path d="M6 9V3h12v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M7 14h10v7H7z"/>' },
];
const S10_ARROW = SVG('<path d="M4.5 12h15M13 5.5l6.5 6.5-6.5 6.5"/>', 2.6);
const s10Hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const s10Rgb = (a, b, p) => `rgb(${a.map((v, i) => Math.round(lerp(v, b[i], p))).join(',')})`;
const S10 = {};

SCENE({
  id: 's10', start: 29.75, end: 34, inDur: 0.25,
  build(root) {
    const Y = S10_LAY;
    // 1) 전환 줄무늬 (도구 줄 -> 화면 가득 파란 줄)
    // 도구 줄 아래 바탕 덮개(S9 배경색): 줄이 움직이며 S9 쪽 원래 줄·그림자가 비치지 않게
    S10.under = el('div', 's10-under', null, root);
    const sw = el('div', 's10-stripes', null, root);
    S10.stripes = S10_TOOLS.map(tool => {
      const s = el('div', 's10-stripe', null, sw, `background:${tool.color}`);
      const R = Y.row;
      const g = el('div', 's10-ghost', null, s, `padding-left:${R.pad}px;font-size:${R.fs}px`);
      el('div', 's10-gic', `<span style="width:${R.icS}px;height:${R.icS}px;display:block">${SVG(tool.ic, 2)}</span>`, g, `width:${R.ic}px;height:${R.ic}px`);
      el('b', 's10-gname', tool.name, g, `left:${R.nx}px`);
      return { s, g, rgb: s10Hex(tool.color) };
    });
    // 2) 엔드 카드
    const C = S10.content = el('div', 's10-content', null, root);
    // 고리 3개 (로고 뒤)
    S10.ringBox = el('div', 's10-rings', null, C, `left:${W / 2}px;top:${Y.logo.cy}px`);
    S10.rings = [0, 1, 2].map(() => el('div', 's10-ring', null, S10.ringBox));
    // 태그라인 (MASK-UP)
    S10.tag = Y.tag.lines.map(ln => {
      const row = el('div', 's10-c', null, C, `top:${ln.cy}px`);
      const t = el('div', 's10-tag', null, row, `font-size:${Y.tag.fs}px`);
      const span = el('span', 'ln', null, t);
      const inner = el('span', '', null, span);
      inner.appendChild(document.createTextNode(ln.text));
      let gold = null;
      if (ln.gold) { gold = el('span', 's10-gold', ln.gold, inner); inner.appendChild(document.createTextNode(ln.tail || '')); }
      return { span, gold };
    });
    S10.goldSpan = S10.tag.map(x => x.gold).find(Boolean);
    S10.uline = el('div', 's10-uline', null, C, 'display:none');
    // 로고 줄
    const Lg = Y.logo;
    S10.logoRow = el('div', 's10-c', null, C, `top:${Lg.cy}px`);
    S10.logo = el('div', 's10-logo', null, S10.logoRow);
    S10.mark = el('span', 'logoMark s10-mark', 'V', S10.logo, `width:${Lg.mark}px;height:${Lg.mark}px;border-radius:${Lg.mark * .29}px;font-size:${Lg.v}px`);
    S10.wm = el('span', 's10-wm', null, S10.logo, `font-size:${Lg.wm}px;margin-left:${Lg.gap}px`);
    S10.wmCh = split(S10.wm, 'VocaPro');
    // CTA
    const Ct = Y.cta;
    S10.ctaRow = el('div', 's10-c', null, C, `top:${Ct.cy}px`);
    S10.ctaWrap = el('div', '', null, S10.ctaRow, 'position:relative');
    S10.pulses = [0, 1].map(() => el('div', 's10-pulse', null, S10.ctaWrap));
    S10.cta = el('div', 's10-cta', null, S10.ctaWrap, `height:${Ct.h}px;padding:0 ${Ct.pad}px;${Ct.w ? `width:${Ct.w}px;` : ''}`);
    S10.ripple = el('div', 's10-ripple', null, S10.cta);
    el('span', 's10-ctaL', '무료로 시작하기', S10.cta, `font-size:${Ct.fs}px`);
    el('span', 's10-arrow', S10_ARROW, S10.cta, `width:${Ct.arrow}px;height:${Ct.arrow}px;margin-left:${Ct.gap}px`);
    S10.tap = el('div', 's10-tap', null, S10.ctaWrap);
    // URL, 꼬리말
    const urlRow = el('div', 's10-c', null, C, `top:${Y.url.cy}px`);
    S10.url = el('span', 'ln', '<span>vocapro.kro.kr</span>', el('div', 's10-url', null, urlRow, `font-size:${Y.url.fs}px`));
    const footRow = el('div', 's10-c', null, C, `top:${Y.foot.cy}px`);
    S10.foot = el('div', 's10-foot', '휴대폰·PC 어디서나 · 앱으로 설치', footRow, `font-size:${Y.foot.fs}px`);
    // 마스코트 + 말풍선
    const M = Y.mascot;
    // 파란 배경 위에서 파란 마스코트가 묻히지 않게 흰 원판 위에 앉혀요
    S10.mWrap = el('div', 's10-mwrap', null, C, `left:${M.x}px;top:${M.y}px;width:${M.s}px;height:${M.s}px`);
    S10.disc = el('div', 's10-disc', null, S10.mWrap);
    S10.mascot = el('div', 's10-mascot', '__MASCOT_HAPPY__', S10.mWrap, `left:${M.s * .1}px;top:${M.s * .08}px;width:${M.s * .8}px;height:${M.s * .8}px;transform-origin:50% 94%`);
    // 눈 깜빡임: 눈동자(타원)와 반짝이(작은 원)
    S10.eyes = [...S10.mascot.querySelectorAll('ellipse, circle')].filter(e => {
      const cy = +e.getAttribute('cy'), r = +(e.getAttribute('r') || e.getAttribute('ry'));
      return cy > 45 && cy < 64 && r <= 7;
    });
    S10.eyes.forEach(e => e.classList.add('s10-eye'));
    const B = Y.bub;
    S10.bub = el('div', 's10-bub', '다음 단어왕은 너야!', C, `top:${B.y}px;height:${B.h}px;padding:0 ${B.pad}px;font-size:${B.fs}px;${B.w ? `width:${B.w}px;` : ''}`);
    if (B.side === 'right') {
      // 오른쪽 아래, 마스코트 쪽으로
      S10.tail = el('div', 's10-tail', '<svg width="46" height="40" viewBox="0 0 46 40"><path d="M0 0 H30 Q32 22 46 40 Q14 34 0 0 Z" fill="#fff"/></svg>', S10.bub, 'right:46px;top:' + (B.h - 2) + 'px');
    } else {
      // 왼쪽 가운데, 마스코트 쪽으로
      S10.tail = el('div', 's10-tail', '<svg width="40" height="44" viewBox="0 0 40 44"><path d="M40 4 V34 Q22 34 0 44 Q16 26 40 4 Z" fill="#fff"/></svg>', S10.bub, 'left:-38px;top:' + (B.h / 2 - 14) + 'px');
    }
  },
  measure(root) {
    const Y = S10_LAY, B = Y.bub, rr = root.getBoundingClientRect();
    // 말풍선 자리 (폭이 글자에 맞게 정해진 뒤)
    const bw = S10.bub.offsetWidth;
    S10.bubX = B.side === 'right' ? B.right - bw : B.left;
    S10.bub.style.left = S10.bubX + 'px';
    S10.bubOrigin = B.side === 'right' ? `${bw - 46 + 46}px ${B.h + 38}px` : `-38px ${B.h / 2 + 30}px`;
    // 금색 밑줄: '진짜로' 글자 아래
    if (S10.goldSpan) {
      const r = S10.goldSpan.getBoundingClientRect(), fs = Y.tag.fs;
      S10.uline.style.cssText = `left:${r.left - rr.left - 2}px;top:${r.bottom - rr.top - fs * .14}px;width:${r.width + 4}px`;
    }
    // CTA 상자 (펄스 고리 크기)
    S10.ctaW = S10.cta.offsetWidth; S10.ctaH = S10.cta.offsetHeight;
    S10.pulses.forEach(p => { p.style.width = S10.ctaW + 'px'; p.style.height = S10.ctaH + 'px'; });
    // 탭 지점: 화살표 부근
    const ar = S10.cta.querySelector('.s10-arrow');
    S10.tapX = ar.offsetLeft + ar.offsetWidth / 2 - 30; S10.tapY = S10.ctaH / 2;
    const rp = Math.hypot(Math.max(S10.tapX, S10.ctaW - S10.tapX), S10.ctaH) * 1.05;
    S10.ripR = rp;
    S10.ripple.style.cssText = `width:${rp * 2}px;height:${rp * 2}px;left:${S10.tapX - rp}px;top:${S10.tapY - rp}px`;
    S10.measured = true;
  },
  draw(t, lt, root) {
    const Y = S10_LAY;
    // ---- 전환: 29.75-30.00 ----
    const on = t >= 30;
    root.classList.toggle('s10-on', on);
    let rows0 = null;
    try { rows0 = HO.s9 && HO.s9.toolRows && HO.s9.toolRows(); } catch (e) { rows0 = null; }
    if (!rows0 || rows0.length < 5) rows0 = Y.rowsFallback;
    if (on) S10.under.style.display = 'none';
    else {
      const m = 56, x0 = Math.min(...rows0.map(r => r.x)) - m, y0 = Math.min(...rows0.map(r => r.y)) - m;
      const x1 = Math.max(...rows0.map(r => r.x + r.w)) + m, y1 = Math.max(...rows0.map(r => r.y + r.h)) + m;
      S10.under.style.cssText = `display:block;left:${x0}px;top:${y0}px;width:${x1 - x0}px;height:${y1 - y0}px`;
    }
    S10.stripes.forEach(({ s, g, rgb }, i) => {
      if (on) { s.style.display = 'none'; return; }
      s.style.display = '';
      const a = rows0[i];
      const t0 = 29.75 + i * .02, p = E.inOutExpo(prog(t, t0, t0 + .17));
      const x = lerp(a.x, -4, p), y = lerp(a.y, i * Y.stripeH - 2, p);   // 4px 넘치게 그려 이음새가 보이지 않게
      const w = lerp(a.w, W + 8, p), h = lerp(a.h, Y.stripeH + 4, p), r = lerp(a.r == null ? 30 : a.r, 0, p);
      s.style.cssText = `left:${x}px;top:${y}px;width:${w}px;height:${h}px;border-radius:${r}px;background:${s10Rgb(rgb, S10_BLUE, p)};box-shadow:0 14px 36px rgba(17,24,39,${(.12 * (1 - p)).toFixed(3)})`;
      // 줄 안 아이콘·이름: 자리 그대로 시작해 왼쪽으로 밀리며 사라져요
      const gp = prog(t, t0, t0 + .12);
      g.style.opacity = 1 - E.out2(gp);
      g.style.transform = `translateX(${-60 * E.in3(gp)}px)`;
    });
    S10.content.style.visibility = on ? 'visible' : 'hidden';
    if (!on) return;

    // ---- 고리 (로고 뒤, 느리게 퍼짐; 시각 t 만으로 정해지는 순환) ----
    const R = Y.rings, ringIn = E.out3(prog(t, 30, 30.6));
    S10.rings.forEach((rg, i) => {
      const ph = (((t - 30) / 7 + i / 3) % 1 + 1) % 1, rad = lerp(R.r0, R.r1, ph);
      const a = .12 * Math.sin(Math.PI * ph) * ringIn;
      rg.style.width = rg.style.height = rad * 2 + 'px';
      rg.style.margin = `${-rad}px 0 0 ${-rad}px`;
      rg.style.opacity = a / .12 * .12;
      rg.style.borderColor = 'rgba(255,255,255,1)';
    });

    // ---- 로고: 30.00 마크 SLAM, 워드마크 글자별 ----
    {
      const p = prog(t, 30, 30.16), e = E.out5(p);
      tf(S10.mark, { s: lerp(1.3, 1, e), op: clamp((t - 30) / .04), blur: 6 * (1 - e) });
      S10.wmCh.forEach((c, i) => {
        const a = 30 + i * .03, q = E.out5(prog(t, a, a + .4));
        c.style.transform = `translateY(${(1 - q) * 60}%)`;
        c.style.opacity = clamp((t - a) / .12);
        c.style.filter = q < .99 ? `blur(${8 * (1 - q)}px)` : 'none';
      });
      const br = 1 + .01 * E.inOut3(prog(t, 32, 33));
      S10.logo.style.transform = `scale(${br})`;
    }

    // ---- 태그라인 30.25 MASK-UP, 밑줄 30.50-30.70 ----
    S10.tag.forEach((x, i) => reveal(x.span, t, 30.25 + i * .06, .6));
    if (S10.measured && S10.goldSpan) {
      const up = E.inOutExpo(prog(t, 30.5, 30.7));
      S10.uline.style.display = up > 0 ? '' : 'none';
      S10.uline.style.transform = `scaleX(${up})`;
    }

    // ---- CTA 30.50 POP, 31.50 탭, 32.00 / 32.50 펄스 ----
    {
      const p = prog(t, 30.5, 31.0);
      let s = p ? E.back(p) : 0;
      // 31.50 누름: 1 -> .96 -> 1 (0.18 s)
      const d = t - 31.5;
      if (d >= -.06 && d < .12) s *= d < 0 ? lerp(1, .96, E.out3((d + .06) / .06)) : lerp(.96, 1, E.out3(d / .12));
      S10.cta.style.opacity = clamp(p * 4);
      S10.cta.style.transform = `scale(${s})`;
      // 물결
      const rp = prog(t, 31.5, 32.0);
      S10.ripple.style.opacity = rp > 0 && rp < 1 ? .9 * (1 - E.in3(rp)) : 0;
      S10.ripple.style.transform = `scale(${.05 + .95 * E.out3(rp)})`;
      // 탭 고리: 31.42 나타나 31.50 눌림(.82), 31.75 사라짐
      const tVis = t >= 31.42 && t < 31.75;
      S10.tap.style.display = tVis ? '' : 'none';
      if (tVis) {
        const ta = E.out3(prog(t, 31.42, 31.5)), tb = prog(t, 31.5, 31.75);
        S10.tap.style.left = (S10.tapX || 0) + 'px';
        S10.tap.style.top = (S10.tapY || 0) + 'px';
        S10.tap.style.transform = `scale(${t < 31.5 ? lerp(1.15, .82, ta) : lerp(.82, 1, E.out3(tb))})`;
        S10.tap.style.opacity = t < 31.5 ? ta : 1 - E.out2(tb);
      }
      // 펄스 고리 (CTA 둘레, 1 -> 1.25 만큼 바깥으로 같은 폭으로 퍼짐)
      [32, 32.5].forEach((a, i) => {
        const q = prog(t, a, a + .4), pl = S10.pulses[i], h = S10.ctaH || 108, w = S10.ctaW || 520;
        pl.style.display = t >= a && q < 1 ? '' : 'none';
        const pad = .25 * h * E.out3(q);
        pl.style.cssText = `display:${t >= a && q < 1 ? 'block' : 'none'};left:${-pad}px;top:${-pad}px;width:${w + 2 * pad}px;height:${h + 2 * pad}px;opacity:${.6 * (1 - E.out2(q))}`;
      });
    }

    // ---- URL 30.75, 꼬리말 30.875 ----
    reveal(S10.url, t, 30.75, .5);
    fadeUp(S10.foot, t, 30.875, .4, 24);

    // ---- 마스코트 31.00 POP + 흔들림, 32.70 깜빡임 ----
    {
      const p = prog(t, 31, 31.4);
      const s = p ? E.back(p) : 0;
      const bob = 6 * Math.sin(2 * Math.PI * 1.4 * Math.max(0, t - 31.4));
      // 32.70 찌그러짐 (0.12 s)
      const k = prog(t, 32.7, 32.82), sq = Math.sin(Math.PI * k);
      S10.mWrap.style.opacity = clamp(p * 4);
      S10.mWrap.style.transform = `translateY(${bob}px) scale(${s})`;
      S10.mascot.style.transform = `scale(${1 + .04 * sq}, ${1 - .1 * sq})`;
      const blink = 1 - .9 * sq;
      S10.eyes.forEach(e => { e.style.transform = `scaleY(${blink})`; });
      // 말풍선 31.125 꼬리에서 POP
      const bp = prog(t, 31.125, 31.6);
      S10.bub.style.transformOrigin = S10.bubOrigin || '50% 100%';
      S10.bub.style.opacity = clamp(bp * 5);
      S10.bub.style.transform = `scale(${bp ? E.back(bp, 1.6) : 0})`;
    }
  },
});
