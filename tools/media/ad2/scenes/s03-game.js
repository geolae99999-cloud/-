// S3 · 4-10초 HERO: 60초 단어 맞추기 대결 (틀리면 -3초 · 6연속 · 시간 끝)
// 들어오기 3.75-4.00: S2 카운트다운 블록(HO.s2.block)이 화면 가득 파랗게 커져요(이 장면 소유). 핸드오프: HO.s3.zero() -> {cx, cy, r}
const S3_LAY = L({
  x: { x: 120, y: 58, s: 72, r: 22, ic: 30 },
  clock: { cx: 760, cy: 94, ic: 44, fs: 64, gap: 10, pen: 32 },
  score: { right: 1400, cy: 94, fs: 56, unit: 56 },
  bar: { x: 120, y: 160, w: 1280, h: 18 },
  pill: { cx: 760, cy: 232, h: 64, pad: 30, fs: 30, nfs: 36, sfs: 26, ic: 32, gap: 8 },
  card: { x: 210, y: 292, w: 1100, h: 320, r: 44, lab: 34, word: 150, wordKo: 120, gap: 12 },
  opts: [[210, 644], [770, 644], [210, 824], [770, 824]].map(([x, y]) => ({ x, y, w: 540, h: 160 })),
  opt: { r: 30, chip: 60, chipR: 18, chipL: 28, gap: 26, fs: 46, cfs: 30, plus: 44, plusR: 30, ripple: 260 },
  rule: { cx: 1650, cy: 470, mode: 'stack' },
  burst: { cx: 1650, cy: 850, fs: 130, rise: 90 },
  hero: { cx: 960, cy: 470, s: 3.6 },
  bgw: { cx: 960, cy: 600, fs: 520, op: .07, rot: -4, smear: 120 },
  big: 440,
  blockFB: { x: 1240, y: 280, w: 520, h: 520, r: 64, numFs: 380 },
  zeroFB: { cx: 786, cy: 94, r: 9 },
}, {
  x: { x: 72, y: 246, s: 64, r: 20, ic: 28 },
  clock: { cx: 540, cy: 278, ic: 40, fs: 60, gap: 9, pen: 30 },
  score: { right: 1008, cy: 278, fs: 52, unit: 52 },
  bar: { x: 72, y: 340, w: 936, h: 16 },
  pill: { cx: 540, cy: 412, h: 60, pad: 28, fs: 28, nfs: 34, sfs: 24, ic: 30, gap: 7 },
  card: { x: 96, y: 470, w: 888, h: 320, r: 44, lab: 32, word: 130, wordKo: 110, gap: 10 },
  opts: [820, 944, 1068, 1192].map(y => ({ x: 96, y, w: 888, h: 110 })),
  opt: { r: 26, chip: 56, chipR: 17, chipL: 26, gap: 24, fs: 44, cfs: 28, plus: 40, plusR: 300, ripple: 260 },
  rule: { cx: 540, cy: 1385, mode: 'line' },
  burst: { cx: 840, cy: 446, fs: 90, rise: 40 },
  hero: { cx: 540, cy: 900, s: 3.0 },
  bgw: { cx: 540, cy: 1620, fs: 300, op: .08, rot: -4, smear: 90 },
  big: 400,
  blockFB: { x: 290, y: 930, w: 500, h: 500, r: 60, numFs: 360 },
  zeroFB: { cx: 566, cy: 278, r: 8.5 },
});

// 문제 (정답 c). Q1은 2번을 눌러 틀려요.
const S3_Q = [
  { w: 'pretend', o: ['~인 척하다', '예약하다', '상기시키다', '수리하다'], c: 0 },
  { w: 'victory', o: ['용기', '승리', '보물', '재능'], c: 1 },
  { w: 'courage', o: ['용기', '기억', '보상', '목표'], c: 0 },
  { w: '목표', ko: 1, o: ['reward', 'talent', 'target', 'treasure'], c: 2 },
  { w: 'rapid', o: ['조용한', '거대한', '깔끔한', '빠른'], c: 3 },
  { w: 'treasure', o: ['보물', '무기', '지갑', '상처'], c: 0 },
  { w: 'talent', o: ['진실', '재능', '상징', '명예'], c: 1 },
];
const S3_FL = [['excellent', '훌륭한', 0], ['master', '주인', 2], ['power', '힘', 1], ['final', '마지막의', 3]];
const S3_DIS = ['모험', '분노', '전투', '믿음', '국경', '거품', '양초', '현금', '중심', '사슬', '선택', '고객', '해안', '의상', '군중', '관습', '손님', '새벽', '사막', '일기', '식단', '할인', '먼지', '의무', '엔진', '봉투', '오류', '출구', '요정', '명성', '유행', '동료', '울타리', '깃발', '홍수', '밀가루', '우정', '연료', '거인', '곡물', '수확', '천국', '구멍', '고향', '공포', '유머', '얼음'];
const S3_TAP = [5.5, 6, 6.5, 7, 7.5, 8];            // 정답 탭 (Q2..Q7)
const S3_TAPOPT = [1, 0, 2, 3, 0, 1];
const S3_ROLL = [5.25, 5.75, 6.25, 6.75, 7.25, 7.75]; // 다음 문제로 넘김
const S3_SC = [0, 10, 22, 36, 52, 70, 90];
const S3_IC = {
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  clock: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2.5M9 2.5h6"/>',
  flame: '<path d="M12 3c1 3.2 5 5.2 5 10a5 5 0 0 1-10 0c0-2 1-3.2 2-4 .5 1.5 1.5 2 2 2 0-3-1-5 1-8z"/>',
};
const S3 = {};

// 오도미터: 자리마다 0-9,0 띠를 겹쳐 놓고 값 v(실수)로 위치를 정해요.
function s3Odo(parent, nd, comma) {
  const o = { wrap: el('span', 's3-odo', null, parent), cols: [], nd, cw: 0, mw: 0 };
  for (let k = nd - 1; k >= 0; k--) {
    const c = el('span', 's3-oc', null, o.wrap), s = el('span', 's3-os', [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map(d => `<i>${d}</i>`).join(''), c);
    o.cols[k] = { c, s };
    if (comma && k === 3) o.comma = el('span', 's3-ocm', ',', o.wrap);
  }
  return o;
}
function s3OdoSet(o, v) {
  v = Math.max(0, v);
  for (let k = 0; k < o.nd; k++) {
    const p10 = Math.pow(10, k), col = o.cols[k];
    let pos, wf = 1;
    if (k === 0) pos = v % 10;
    else {
      const d = Math.floor(v / p10) % 10, lower = v - Math.floor(v / p10) * p10;
      pos = d + clamp(lower - (p10 - 1)); wf = clamp(v - (p10 - 1));
    }
    col.s.style.transform = `translateY(${-pos * 1.1}em)`;
    col.c.style.width = wf >= 1 ? '' : (wf * o.cw) + 'px';
    col.c.style.opacity = wf >= 1 ? '' : E.out3(wf);
    col.c.style.display = wf <= 0 ? 'none' : '';
    if (k === 3 && o.comma) { o.comma.style.width = wf >= 1 ? '' : (wf * o.mw) + 'px'; o.comma.style.display = wf <= 0 ? 'none' : ''; o.comma.style.opacity = wf >= 1 ? '' : E.out3(wf); }
  }
}
const s3Txt = (e, s) => { if (e.__t !== s) { e.__t = s; e.innerHTML = s; } };
const s3Shake = (t, a, amp) => { const d = t - a; if (d < 0 || d > .25) return [0, 0]; const k = amp * Math.exp(-d / .08); return [k * Math.sin(90 * d), k * Math.cos(77 * d)]; };
const s3Slam = (t, a) => { const p = E.out5(prog(t, a, a + .14)); return { s: lerp(1.35, 1, p), blur: 8 * (1 - p), op: clamp((t - a) / .03) }; };
const s3Mix = (c1, c2, p) => { const h = c => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16)); const a = h(c1), b = h(c2); return `rgb(${a.map((x, i) => Math.round(lerp(x, b[i], p))).join(',')})`; };
const s3Rise = (e, t, a, extra = {}) => { const p = E.out5(prog(t, a, a + .3)); tf(e, Object.assign({ y: (1 - p) * 60, op: p }, extra)); };

// 지금 보이는 문제
function s3Q(t) {
  if (t >= 9) { const k = Math.min(3, Math.floor((t - 9) / .125)); return { q: 7 + k, r: -1, fa: 9 + k * .125 }; }
  let q = 0, r = -1;
  for (let k = 0; k < 6; k++) if (t >= S3_ROLL[k]) { q = k + 1; r = S3_ROLL[k]; }
  return { q, r };
}
// 문제 q, 보기 j 의 정답/오답 표시 (0-1)
function s3State(q, j, t) {
  if (q === 0) { const p = clamp((t - 5) / .05); return { ok: j === 0 ? p : 0, bad: j === 1 ? p : 0 }; }
  if (q <= 6) { const T = S3_TAP[q - 1]; return { ok: j === S3_TAPOPT[q - 1] ? clamp((t - T) / .04) : 0, bad: 0 }; }
  const f = S3_FL[q - 7], fa = 9 + (q - 7) * .125;
  return { ok: j === f[2] && t >= fa && t < fa + .1 ? 1 : 0, bad: 0 };
}

SCENE({
  id: 's3', start: 3.75, end: 10, inDur: .25,
  build(root) {
    const A = S3_LAY;
    __seed = 103;
    // 시간 압축 구간 문제: 정답 위치는 고정, 나머지 셋은 중학교 단어 뜻에서 시드로 뽑아요.
    S3.flQ = S3_FL.map(([w, m, c]) => {
      const pool = S3_DIS.slice(), d = [];
      while (d.length < 3) { const i = Math.floor(rnd() * pool.length); d.push(pool.splice(i, 1)[0]); }
      d.splice(c, 0, m); return { w, o: d, c };
    });
    S3.allQ = S3_Q.concat(S3.flQ);
    S3.rays = Array.from({ length: 12 }, (_, i) => ({ a: (i / 12) * Math.PI * 2 + (rnd() - .5) * .22, len: 60 + rnd() * 60, d: 50 + rnd() * 40 }));

    const cam = S3.cam = el('div', 's3-cam', null, root);
    // 배경 큰 단어
    S3.bgwP = el('div', 's3-pos', null, cam, `left:${A.bgw.cx}px;top:${A.bgw.cy}px`);
    S3.bgw = el('div', 's3-c s3-bgw', '', S3.bgwP, `font-size:${A.bgw.fs}px`);

    const ui = S3.ui = el('div', 's3-ui', null, cam, `transform-origin:${W / 2}px ${H / 2}px`);
    const uf = S3.uf = el('div', 's3-uif', null, ui);
    // 닫기
    S3.x = el('div', 's3-x', `<span style="width:${A.x.ic}px;height:${A.x.ic}px;display:block">${SVG(S3_IC.x, 1.8)}</span>`, uf, `left:${A.x.x}px;top:${A.x.y}px;width:${A.x.s}px;height:${A.x.s}px;border-radius:${A.x.r}px`);
    // 점수
    S3.scoreP = el('div', 's3-pos', null, uf, `left:${A.score.right}px;top:${A.score.cy}px`);
    S3.score = el('div', 's3-score', null, S3.scoreP, `right:0;top:0;font-size:${A.score.fs}px`);
    S3.scoreO = s3Odo(S3.score, 4, true);
    el('span', '', '점', S3.score, 'margin-left:.04em');
    // 막대 바탕
    const B = A.bar;
    S3.track = el('div', 's3-track', null, uf, `left:${B.x}px;top:${B.y}px;width:${B.w}px;height:${B.h}px;border-radius:${B.h / 2}px`);
    // 콤보 알약
    S3.pillP = el('div', 's3-pos', null, uf, `left:${A.pill.cx}px;top:${A.pill.cy}px`);
    S3.pill = this.mkPill(S3.pillP, true);
    // 문제 카드
    const C = A.card;
    S3.card = el('div', 's3-card', null, uf, `left:${C.x}px;top:${C.y}px;width:${C.w}px;height:${C.h}px;border-radius:${C.r}px`);
    S3.cq = [0, 1].map(() => { const d = el('div', 's3-cq', null, S3.card, `gap:${C.gap}px`); return { d, lab: el('small', '', '', d, `font-size:${C.lab}px`), w: el('b', '', '', d) }; });
    // 보기
    const O = A.opt;
    S3.opts = A.opts.map((R, j) => {
      const o = { R };
      o.e = el('div', 's3-opt', null, uf, `left:${R.x}px;top:${R.y}px;width:${R.w}px;height:${R.h}px`);
      o.face = el('div', 's3-face', null, o.e, `border-radius:${O.r}px`);
      o.ok = el('div', 's3-face ok', null, o.e, `border-radius:${O.r}px`);
      o.bad = el('div', 's3-face bad', null, o.e, `border-radius:${O.r}px`);
      o.clip = el('div', 's3-clip', null, o.e, `border-radius:${O.r}px`);
      o.rip = el('div', 's3-rip', null, o.clip);
      o.chip = el('div', 's3-chip', null, o.e, `left:${O.chipL}px;width:${O.chip}px;height:${O.chip}px;margin-top:${-O.chip / 2}px;font-size:${O.cfs}px`);
      const cr = `border-radius:${O.chipR}px`;
      o.cn = el('i', 'n', String(j + 1), o.chip, cr);
      o.ck = el('i', 'k', SVG('<path d="M6 12.5l4 4L18 8"/>', 3.2), o.chip, cr);
      o.cw = el('i', 'w', SVG(S3_IC.x, 3.2), o.chip, cr);
      o.lm = el('div', 's3-lm', null, o.e, `left:${O.chipL + O.chip + O.gap}px;right:${O.plusR + 60}px;font-size:${O.fs}px`);
      o.l = [el('span', '', '', o.lm), el('span', '', '', o.lm)];
      o.plus = el('div', 's3-plus', '', o.e, `right:${O.plusR}px;font-size:${O.plus}px;margin-top:-.5em`);
      o.chipC = { x: R.x + O.chipL + O.chip / 2, y: R.y + R.h / 2 };
      return o;
    });
    S3.tap = el('div', 's3-tap', null, uf);
    // 시계 (흐림/흑백에서 빼요: '0'으로 확대해 들어가니까)
    const K = A.clock;
    S3.clockP = el('div', 's3-pos', null, ui, `left:${K.cx}px;top:${K.cy}px`);
    S3.clock = el('div', 's3-c s3-clock', null, S3.clockP, `font-size:${K.fs}px;gap:${K.gap}px`);
    S3.cic = el('span', 's3-cic', SVG(S3_IC.clock, 1.8), S3.clock, `width:${K.ic}px;height:${K.ic}px`);
    S3.clockD = el('span', '', null, S3.clock, 'display:inline-flex;transform-origin:50% 50%');
    S3.clockO = s3Odo(S3.clockD, 2, false);
    S3.pen = el('span', 's3-pen', '-3초', S3.clock, `font-size:${K.pen}px;margin:${-K.pen * .6}px 0 0 ${K.pen * .3}px`);
    // 막대 채움 = 처음엔 화면 가득한 파란 블록
    S3.blk = el('div', 's3-blk', null, ui);
    S3.blkB = el('i', '', null, S3.blk, 'background:#3182f6');
    S3.blkG = el('i', 's3-blkG', null, S3.blk);
    S3.blkL = el('i', 's3-blkL', null, S3.blk);
    S3.chunk = el('div', 's3-chunk', null, ui, `height:${B.h}px;border-radius:0 ${B.h / 2}px ${B.h / 2}px 0`);

    S3.vign = el('div', 's3-vign', null, cam);
    S3.scrim = el('div', 's3-scrim', null, cam);
    // 콤보 히어로 (알약 복제)
    S3.heroP = el('div', 's3-pos', null, cam, `left:${A.pill.cx}px;top:${A.pill.cy}px`);
    S3.hero = this.mkPill(S3.heroP, false);
    S3.raysSvg = el('div', '', `<svg class="s3-rays" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${S3.rays.map(() => '<line stroke="#ff9f00" stroke-width="8" stroke-linecap="round"/>').join('')}</svg>`, cam);
    S3.rayL = [...S3.raysSvg.querySelectorAll('line')];

    // 규칙 자막
    const R = A.rule, stack = R.mode === 'stack';
    const cap = html => { const p = el('div', 's3-pos', null, cam, `left:${R.cx}px;top:${R.cy}px`); const c = el('div', 's3-c s3-cap', html, p); return { p, c, lns: [...c.querySelectorAll('.ln > span')] }; };
    S3.cap1 = cap(stack
      ? `<span class="ln" style="font-size:60px"><span>틀리면</span></span><span class="ln co" style="font-size:172px;letter-spacing:-0.05em;line-height:.98"><span>-3초</span></span>`
      : `<span class="ln" style="font-size:80px;letter-spacing:-0.035em"><span>틀리면 <em class="co" style="font-style:normal">-3초</em></span></span>`);
    S3.cap2 = cap(stack
      ? `<span class="ln" style="font-size:56px"><span>연속 정답,</span></span><span class="ln" style="font-size:56px"><span><em class="s3-gr" style="font-style:normal">보너스</em> 점수!</span></span>`
      : `<span class="ln" style="font-size:56px"><span>연속 정답, <em class="s3-gr" style="font-style:normal">보너스</em> 점수!</span></span>`);
    S3.cap3 = cap(stack
      ? `<span class="ln co" style="font-size:140px;letter-spacing:-0.035em;line-height:1"><span>시간</span></span><span class="ln co" style="font-size:140px;letter-spacing:-0.035em;line-height:1"><span>끝!</span></span>`
      : `<span class="ln co" style="font-size:80px;letter-spacing:-0.035em"><span>시간 끝!</span></span>`);
    // 여백 +N
    S3.burstP = el('div', 's3-pos', null, cam, `left:${A.burst.cx}px;top:${A.burst.cy}px`);
    S3.burst = el('div', 's3-c s3-burst', '', S3.burstP, `font-size:${A.burst.fs}px`);

    // 들어오기
    S3.shock = el('div', 's3-shock', null, cam);
    S3.num1P = el('div', 's3-pos', null, cam);
    S3.num1 = el('div', 's3-c s3-num1', '1', S3.num1P);
    S3.bigP = el('div', 's3-pos', null, cam);
    S3.big = el('div', 's3-c s3-big', '<span>6</span><span>0</span>', S3.bigP, `font-size:${A.big}px`);

    S3.Z = Object.assign({}, A.zeroFB);
    const ho = HO.s3 = HO.s3 || {};
    ho.zero = () => ({ cx: S3.Z.cx, cy: S3.Z.cy, r: S3.Z.r });
    ho.dbg = () => ({ hole: S3.holeDbg, d60: S3.d60, hero: S3.heroWH });
  },
  mkPill(parent, live) {
    const P = S3_LAY.pill;
    const p = el('div', 's3-c s3-pill' + (live ? '' : ' on'), null, parent, `height:${P.h}px;padding:0 ${P.pad}px;border-radius:${P.h / 2}px;font-size:${P.fs}px;gap:${P.gap}px`);
    const fl = el('span', 's3-fl', SVG(S3_IC.flame, 1.9), p, `width:${P.ic}px;height:${P.ic}px;transform-origin:50% 90%`);
    const b = el('b', '', live ? null : '6', p, `font-size:${P.nfs}px;margin-right:-.06em`);
    el('span', '', '연속', p);
    const sm = el('small', '', live ? '' : '+12', p, `font-size:${P.sfs}px;margin-left:${P.gap * .25}px`);
    const o = { p, fl, b, sm };
    if (live) o.odo = s3Odo(b, 2, false);
    return o;
  },
  measure(root) {
    const A = S3_LAY;
    // 오도미터 자리 폭
    [S3.scoreO, S3.clockO, S3.pill.odo].forEach(o => {
      o.cols.forEach(c => { c.c.style.width = ''; c.c.style.display = ''; });
      if (o.comma) { o.comma.style.width = ''; o.comma.style.display = ''; o.mw = o.comma.getBoundingClientRect().width; }
      o.cw = o.cols[0].c.getBoundingClientRect().width;
    });
    // '60' 큰 숫자가 날아갈 자리: 시계 숫자(60) 상자
    s3OdoSet(S3.clockO, 60);
    S3.clockP.style.transform = ''; S3.clockD.style.transform = '';
    const dr = S3.clockO.wrap.getBoundingClientRect();
    S3.d60 = { cx: dr.left + dr.width / 2, cy: dr.top + dr.height / 2, h: dr.height };
    const br = S3.big.getBoundingClientRect();
    S3.big60 = { h: br.height };
    // 마지막 '0' 글자의 안쪽 구멍 (시간 끝 상태: 한 자리)
    s3OdoSet(S3.clockO, 0);
    const cell = S3.clockO.cols[0].s.firstChild, cr = cell.getBoundingClientRect();
    const probe = el('i', '', null, cell, 'display:inline-block;width:0;height:0;vertical-align:baseline');
    const baseY = probe.getBoundingClientRect().top; probe.remove();
    const fs = A.clock.fs, hole = this.hole('0', fs);
    if (hole) S3.Z = { cx: cr.left + cr.width / 2 + hole.dx, cy: baseY + hole.dy, r: hole.r };
    // 히어로 알약 크기 (빛살 시작 테두리)
    S3.heroP.style.transform = '';
    const hr = S3.hero.p.getBoundingClientRect();
    S3.heroWH = { w: hr.width, h: hr.height };
    // S2 숫자 '1' 잉크 중심 보정
    const g = document.createElement('canvas').getContext('2d');
    const nf = (HO.s2 && HO.s2.block && HO.s2.block().numFs) || A.blockFB.numFs;
    S3.num1.style.fontSize = nf + 'px';
    g.font = `900 ${nf}px P`; const m = g.measureText('1');
    const n1 = S3.num1.getBoundingClientRect(), pr = el('i', '', null, S3.num1, 'display:inline-block;width:0;height:0;vertical-align:baseline');
    const b1 = pr.getBoundingClientRect().top - n1.top; pr.remove();
    S3.num1Off = { dy: n1.height / 2 - (b1 - (m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 2), dx: (m.width / 2) - (m.actualBoundingBoxRight - m.actualBoundingBoxLeft) / 2 - (-m.actualBoundingBoxLeft) };
  },
  // 글자 안쪽 구멍: 캔버스에 크게 그려서 가운데 줄/칸을 훑어요.
  hole(ch, fs) {
    const k = 8, F = fs * k, c = document.createElement('canvas'); c.width = Math.ceil(F * 1.4); c.height = Math.ceil(F * 1.6);
    const g = c.getContext('2d'); g.font = `800 ${F}px P`; g.textBaseline = 'alphabetic'; g.fillStyle = '#000';
    const ox = F * .2, base = F * 1.2; g.fillText(ch, ox, base);
    const m = g.measureText(ch), d = g.getImageData(0, 0, c.width, c.height).data, a = (x, y) => d[(Math.round(y) * c.width + Math.round(x)) * 4 + 3];
    const l = ox - m.actualBoundingBoxLeft, r = ox + m.actualBoundingBoxRight, tp = base - m.actualBoundingBoxAscent, bt = base + m.actualBoundingBoxDescent;
    const icx = (l + r) / 2, icy = (tp + bt) / 2;
    if (a(icx, icy) > 127) return null;
    let x1 = icx, x2 = icx, y1 = icy, y2 = icy;
    while (x1 > l && a(x1, icy) < 128) x1--; while (x2 < r && a(x2, icy) < 128) x2++;
    const hcx = (x1 + x2) / 2;
    while (y1 > tp && a(hcx, y1) < 128) y1--; while (y2 < bt && a(hcx, y2) < 128) y2++;
    const hcy = (y1 + y2) / 2;
    S3.holeDbg = { w: (x2 - x1) / k, h: (y2 - y1) / k, ink: (r - l) / k };
    return { dx: (hcx - icx) / k, dy: (hcy - base) / k, r: Math.min(x2 - x1, y2 - y1) / 2 / k };
  },
  draw(t, lt, root) {
    const A = S3_LAY, B = A.bar;
    root.style.background = t < 3.94 ? 'transparent' : '#f2f4f6';

    // ---------- 값들 ----------
    // 점수
    let sv = 0, sMove = 0;
    for (let k = 0; k < 6; k++) if (t >= S3_TAP[k]) { const p = prog(t, S3_TAP[k], S3_TAP[k] + .2); sv = lerp(S3_SC[k], S3_SC[k + 1], E.outExpo(p)); sMove = p < 1 ? 1 - p : 0; }
    if (t >= 9) { const p = prog(t, 9, 9.5); sv = lerp(90, 1030, E.inOut3(p)); sMove = p < 1 ? 1 : 0; }
    // 콤보
    let cv = 0, cInt = 0, cMove = 0;
    for (let k = 0; k < 6; k++) if (t >= S3_TAP[k]) { const p = prog(t, S3_TAP[k], S3_TAP[k] + .25); cv = lerp(k, k + 1, E.outExpo(p)); cInt = k + 1; cMove = p < 1 ? 1 - p : 0; }
    if (t >= 9) { const p = prog(t, 9, 9.5); cv = lerp(6, 38, E.inOut3(p)); cInt = Math.round(cv); cMove = p < 1 ? 1 : 0; }
    // 시계
    let kv = 60, kMove = 0;
    if (t >= 4.5 && t < 9) {
      const n = Math.floor((t - 4.5) / .5), ta = 4.5 + n * .5, tgt = 60 - n - (t >= 5 ? 3 : 0), prev = n === 0 ? 60 : n === 1 ? 60 : 60 - (n - 1) - 3;
      const p = prog(t, ta, ta + (n === 1 ? .2 : .12)); kv = lerp(prev, tgt, E.outExpo(p)); kMove = p < 1 && prev !== tgt ? 1 - p : 0;
    } else if (t >= 9) { const p = prog(t, 9, 9.5); kv = lerp(49, 0, E.out3(p)); kMove = p < 1 ? 1 : 0; }
    // 막대 (부드럽게): 9초에 48 → 9.5초에 0
    let bv = 60;
    if (t >= 4.5 && t < 9) bv = 60 - 2 * (t - 4.5) - (t >= 5 ? 3 : 0);
    else if (t >= 9) bv = lerp(48, 0, E.out3(prog(t, 9, 9.5)));
    const low = t >= 9 && kv < 10;

    // ---------- 들어오기: 블록 확대 → 막대로 접힘 ----------
    const b = (HO.s2 && HO.s2.block && HO.s2.block()) || A.blockFB;
    const full = { x: -40, y: -40, w: W + 80, h: H + 80, r: 0 };
    const barR = { x: B.x, y: B.y, w: B.w * bv / 60, h: B.h, r: B.h / 2 };
    let R, fill = '#3182f6';
    if (t < 3.94) {
      const p = E.inExpo(prog(t, 3.75, 3.94));
      R = { x: lerp(b.x, full.x, p), y: lerp(b.y, full.y, p), w: lerp(b.w, full.w, p), h: lerp(b.h, full.h, p), r: lerp(b.r, 0, p) };
      fill = '#f04452';
      const cp = E.inOut3(prog(t, 3.8, 3.94)), rr = Math.hypot(R.w, R.h) / 2 * cp;
      S3.blkB.style.clipPath = `circle(${rr.toFixed(1)}px at 50% 50%)`;
    } else if (t < 4.125) R = full;
    else if (t < 4.5) {
      const p = E.inOutExpo(prog(t, 4.125, 4.5));
      R = { x: lerp(full.x, barR.x, p), y: lerp(full.y, barR.y, p), w: lerp(full.w, barR.w, p), h: lerp(full.h, barR.h, p), r: lerp(0, barR.r, p) };
    } else R = barR;
    if (t >= 3.94) S3.blkB.style.clipPath = 'none';
    const bs = S3.blk.style;
    bs.left = R.x + 'px'; bs.top = R.y + 'px'; bs.width = Math.max(0, R.w) + 'px'; bs.height = R.h + 'px'; bs.borderRadius = Math.min(R.r, R.h / 2, R.w / 2) + 'px';
    bs.background = fill; bs.display = R.w <= .3 ? 'none' : '';
    S3.blkG.style.opacity = E.inOut3(prog(t, 4.3, 4.5));
    S3.blkL.style.opacity = low ? 1 : 0;
    bs.opacity = low ? (Math.floor((t - 9) / .125) % 2 ? .5 : 1) : 1;
    // S2 숫자 '1' 사본
    const n1 = S3.num1P.style, sc1 = R.w / b.w;
    if (t < 3.92) {
      n1.display = '';
      const o = S3.num1Off || { dx: 0, dy: 0 };
      tf(S3.num1P, { x: R.x + R.w / 2 + o.dx * sc1, y: R.y + R.h / 2 + o.dy * sc1, s: sc1, op: 1 - prog(t, 3.8, 3.92) });
    } else n1.display = 'none';
    // 충격 링
    const sp = prog(t, 4, 4.4);
    if (t >= 4 && sp < 1) { const r = lerp(100, 1400, E.out3(sp)); Object.assign(S3.shock.style, { display: '', width: 2 * r + 'px', height: 2 * r + 'px', transform: `translate(${W / 2 - r}px,${H / 2 - r}px)`, opacity: .6 * (1 - sp) }); }
    else S3.shock.style.display = 'none';
    // '60' 쾅 → 시계 숫자로 FLIP
    if (t >= 3.98 && t < 4.5) {
      const sl = s3Slam(t, 3.98), p = E.inOutExpo(prog(t, 4.125, 4.5));
      const d = S3.d60 || { cx: A.clock.cx + 30, cy: A.clock.cy, h: A.clock.fs * 1.1 };
      const s1 = d.h / ((S3.big60 && S3.big60.h) || A.big * 1.1);
      S3.big.style.color = s3Mix('#ffffff', '#191f28', prog(p, .6, 1));
      tf(S3.bigP, { x: lerp(W / 2, d.cx, p), y: lerp(H / 2, d.cy, p), s: sl.s * lerp(1, s1, p), op: sl.op, blur: sl.blur });
      S3.bigP.style.display = '';
    } else S3.bigP.style.display = 'none';

    // ---------- 카메라 / UI 흔들림 ----------
    const [shx, shy] = s3Shake(t, 4, 18);
    tf(S3.cam, { x: shx, y: shy });
    let ux = 0, uy = 0, us = 1;
    if (t >= 5 && t < 5.25) { const p = (t - 5) / .25; ux += 10 * Math.sin(p * Math.PI * 6) * (1 - p); }
    const [ex, ey] = s3Shake(t, 9.5, 6); ux += ex; uy += ey;
    for (const T of S3_TAP) if (t >= T && t < T + .15) us = 1 + .012 * (1 - E.out3(prog(t, T, T + .15)));
    tf(S3.ui, { x: ux, y: uy, s: us });
    // 콤보 히어로 동안 흐림, 시간 끝에 흑백
    const blurU = 6 * (E.inOut3(prog(t, 8, 8.25)) - E.inOut3(prog(t, 8.75, 9)));
    const gray = .7 * prog(t, 9.5, 9.6);
    const fl = (bl, g) => (bl > .05 ? `blur(${bl.toFixed(2)}px) ` : '') + (g > 0 ? `grayscale(${g.toFixed(3)})` : '');
    S3.uf.style.filter = fl(blurU, gray);
    S3.clockP.style.filter = fl(blurU, 0);
    S3.blk.style.filter = fl(blurU, gray);

    // ---------- 배경 큰 단어 ----------
    const qs = s3Q(t), Q = S3.allQ;
    {
      const G = A.bgw; let op = 0, s = 1, bl = 0, x = 0;
      const word = Q[qs.q].w;
      s3Txt(S3.bgw, word);
      const a = qs.r > 0 ? qs.r : qs.fa ? 9 : 4.3125;
      if (t >= 4.3125) {
        const sl = s3Slam(t, qs.fa ? qs.fa : a); s = sl.s; bl = sl.blur; op = G.op * sl.op;
        for (const T of S3_TAP) if (t >= T && t < T + .3) op = Math.max(op, G.op + G.op * Math.sin(Math.PI * prog(t, T, T + .3)));
      }
      if (t >= 9) { const k = Math.min((t - 9) / .125, 3.9999), fr = k - Math.floor(k); x = t < 9.5 ? G.smear * (.5 - E.out3(fr)) : -G.smear * .5 * (1 - E.out3(prog(t, 9.5, 9.75))); bl = Math.max(bl, t < 9.5 ? 6 : 6 * (1 - prog(t, 9.5, 9.7))); op = G.op; s = 1; }
      tf(S3.bgwP, { x, r: G.rot, s, op, blur: bl });
      S3.bgwP.style.filter = fl(Math.max(bl, blurU), gray);
    }

    // ---------- 상단 ----------
    s3Rise(S3.x, t, 4.1875);
    s3Rise(S3.scoreP, t, 4.1875);
    s3OdoSet(S3.scoreO, sv);
    S3.score.style.filter = sMove > 0 ? `blur(${(3 * Math.min(1, sMove * 2)).toFixed(2)}px)` : '';
    // 시계
    {
      const pc = E.out5(prog(t, 4.35, 4.55));
      S3.cic.style.opacity = pc; S3.cic.style.transform = `translateY(${(1 - pc) * 20}px)`;
      S3.clockO.wrap.style.visibility = t >= 4.5 ? 'visible' : 'hidden';
      s3OdoSet(S3.clockO, kv);
      const end = t >= 9.5;
      S3.clock.style.color = end ? '#f04452' : '#191f28';
      S3.cic.style.color = '#191f28';
      const ps = end ? lerp(1.3, 1, E.out5(prog(t, 9.5, 9.7))) : 1;
      S3.clockD.style.transform = ps !== 1 ? `scale(${ps})` : '';
      S3.clockO.wrap.style.filter = kMove > 0 && !end ? `blur(${(3 * Math.min(1, kMove * 2)).toFixed(2)}px)` : '';
      // 앱의 '-3초'
      const pp = prog(t, 5, 5.8);
      if (t >= 5 && pp < 1) { S3.pen.style.display = ''; S3.pen.style.opacity = 1 - E.in3(pp); S3.pen.style.transform = `translateY(${-40 * E.out3(pp)}px) scale(${lerp(1.3, 1, E.out5(prog(t, 5, 5.12)))})`; }
      else S3.pen.style.display = 'none';
    }
    // 막대 바탕
    S3.track.style.opacity = prog(t, 4.28, 4.42);
    // 떨어지는 조각 (59/60 → 56/60)
    {
      const p = prog(t, 5, 5.4);
      if (t >= 5 && p < 1) {
        const x0 = B.x + B.w * 56 / 60, w = B.w * 3 / 60, fw = B.w * 59 / 60, e = E.in3(p);
        Object.assign(S3.chunk.style, { display: '', left: x0 + 'px', top: B.y + 'px', width: w + 'px', backgroundSize: fw + 'px 100%', backgroundPosition: `${-(x0 - B.x)}px 0` });
        S3.chunk.style.transformOrigin = '0 50%';
        tf(S3.chunk, { x: 14 * e, y: 80 * e, r: 12 * E.out3(p), op: 1 - e });
      } else S3.chunk.style.display = 'none';
    }

    // ---------- 콤보 알약 ----------
    {
      const P = S3.pill, on = cInt >= 2;
      P.p.classList.toggle('on', on);
      s3OdoSet(P.odo, cv);
      s3Txt(P.sm, on ? '+' + Math.min(cInt, 10) * 2 : '');
      P.sm.style.display = on ? '' : 'none';
      P.odo.wrap.style.filter = cMove > 0 ? `blur(${(2.5 * Math.min(1, cMove * 2)).toFixed(2)}px)` : '';
      let s = 1, sx = 1, sy = 1;
      for (const T of S3_TAP) if (t >= T && t < T + .3) s = lerp(1.25, 1, E.spring(prog(t, T, T + .25)));
      if (t >= 5 && t < 5.3) { const p = prog(t, 5, 5.25); sx = lerp(1.1, 1, E.spring(p)); sy = lerp(.85, 1, E.spring(p)); }
      const pr = E.out5(prog(t, 4.25, 4.55));
      tf(S3.pillP, { y: (1 - pr) * 60, s, sx, sy, op: (t >= 8 && t < 9) ? 0 : pr });
      // 시간 압축 중 불꽃
      P.fl.style.transform = '';
    }

    // ---------- 문제 카드 ----------
    {
      const rp = E.out5(prog(t, 4.25, 4.55));
      tf(S3.card, { y: (1 - rp) * 60, op: rp });
      const C = A.card, setQ = (L, q) => {
        const d = Q[q]; s3Txt(L.lab, d.ko ? '이 뜻의 영어는?' : '이 단어의 뜻은?'); s3Txt(L.w, d.w);
        L.w.style.fontSize = (d.ko ? C.wordKo : C.word) + 'px';
        L.w.style.letterSpacing = d.ko ? '-0.035em' : '-0.035em';
      };
      const [c0, c1] = S3.cq;
      if (qs.r > 0 && t < qs.r + .14) {
        const p = E.inOutExpo(prog(t, qs.r, qs.r + .14));
        setQ(c0, qs.q - 1); setQ(c1, qs.q);
        c0.d.style.display = ''; c1.d.style.display = '';
        c0.d.style.transform = `translateY(${-p * C.h}px)`; c1.d.style.transform = `translateY(${(1 - p) * C.h}px)`;
      } else {
        setQ(c0, qs.q); c1.d.style.display = 'none'; c0.d.style.display = '';
        const k = qs.fa ? E.out5(prog(t, qs.fa, qs.fa + .08)) : 1;
        c0.d.style.transform = k < 1 ? `translateY(${(1 - k) * 36}px)` : '';
      }
    }

    // ---------- 보기 ----------
    const O = A.opt;
    S3.opts.forEach((o, j) => {
      const a = [4.3125, 4.375, 4.4375, 4.5][j];
      const rp = E.out5(prog(t, a, a + .3));
      // 글자 굴리기
      const ra = qs.r > 0 ? qs.r + .02 * j : -1;
      if (ra > 0 && t < ra + .14) {
        const p = E.inOutExpo(prog(t, ra, ra + .14));
        s3Txt(o.l[0], Q[qs.q - 1].o[j]); s3Txt(o.l[1], Q[qs.q].o[j]);
        o.l[0].style.transform = `translateY(${-p * 110}%)`; o.l[1].style.transform = `translateY(${(1 - p) * 110}%)`; o.l[1].style.display = '';
      } else {
        s3Txt(o.l[0], Q[qs.q].o[j]); o.l[0].style.transform = ''; o.l[1].style.display = 'none';
      }
      // 정답/오답 상태 (넘길 때 0.1초 동안 빠져요)
      let st = s3State(qs.q, j, t);
      if (qs.r > 0 && t < qs.r + .1) { const old = s3State(qs.q - 1, j, qs.r), f = 1 - prog(t, qs.r, qs.r + .1); st = { ok: Math.max(st.ok, old.ok * f), bad: Math.max(st.bad, old.bad * f) }; }
      o.ok.style.opacity = st.ok; o.bad.style.opacity = st.bad;
      o.ck.style.opacity = st.ok; o.cw.style.opacity = st.bad;
      // 누르기 / 튕김
      let s = 1;
      const taps = [[4.92, 5, 0, 1]].concat(S3_TAP.map((T, k) => [T - .08, T, k + 1, S3_TAPOPT[k]]));
      for (const [pa, T, q, oj] of taps) {
        if (oj !== j) continue;
        const showQ = (t < T + .25 && qs.q === q) || (q === 0 && qs.q === 0);
        if (!showQ) continue;
        if (t >= pa && t < T) s = lerp(1, .97, prog(t, pa, T));
        else if (t >= T && t < T + .2) { const p = prog(t, T, T + .2); s = p < .35 ? lerp(.97, 1.04, E.out3(p / .35)) : lerp(1.04, 1, E.inOut3((p - .35) / .65)); }
      }
      tf(o.e, { y: (1 - rp) * 60, op: rp, s });
      // 물결 + 보기 안 +N
      let rip = null, plus = null;
      S3_TAP.forEach((T, k) => {
        if (S3_TAPOPT[k] !== j) return;
        if (t >= T && t < T + .3) rip = prog(t, T, T + .3);
        if (t >= T && t < T + .42) plus = ['+' + (S3_SC[k + 1] - S3_SC[k]), prog(t, T, T + .42)];
      });
      if (qs.fa && S3.allQ[qs.q].c === j && t < qs.fa + .1) plus = ['+20', .25 + prog(t, qs.fa, qs.fa + .1) * .2];
      if (rip !== null) {
        const r = O.ripple * E.out3(rip), cx = O.chipL + O.chip / 2, cy = o.R.h / 2;
        Object.assign(o.rip.style, { display: '', left: cx - r + 'px', top: cy - r + 'px', width: 2 * r + 'px', height: 2 * r + 'px', opacity: 1 - rip });
      } else o.rip.style.display = 'none';
      if (plus) {
        s3Txt(o.plus, plus[0]); const p = plus[1];
        o.plus.style.display = ''; o.plus.style.opacity = 1 - E.in3(prog(p, .3, 1)); o.plus.style.transform = `translateY(${-50 * E.out3(p)}px)`;
      } else o.plus.style.display = 'none';
    });
    // 탭 링
    {
      let tp = null;
      for (const [T, oj] of [[5, 1]].concat(S3_TAP.map((T, k) => [T, S3_TAPOPT[k]]))) if (t >= T - .08 && t < T + .25) tp = [T, oj];
      if (tp) {
        const [T, oj] = tp, c = S3.opts[oj].chipC;
        let s, op;
        if (t < T) { const p = prog(t, T - .08, T); s = lerp(1.2, .82, E.out3(p)); op = p; }
        else { const p = prog(t, T, T + .25); s = lerp(.82, 1.25, E.out3(p)); op = 1 - p; }
        S3.tap.style.display = ''; tf(S3.tap, { x: c.x, y: c.y, s, op });
      } else S3.tap.style.display = 'none';
    }

    // ---------- 빗나감 테두리 ----------
    S3.vign.style.opacity = t >= 5 && t < 5.3 ? Math.sin(Math.PI * prog(t, 5, 5.3)) : 0;

    // ---------- 콤보 히어로 ----------
    {
      const sc = (bl => bl)(E.inOut3(prog(t, 8, 8.25)) - E.inOut3(prog(t, 8.75, 9)));
      S3.scrim.style.opacity = sc; S3.scrimOp = sc;
      const H0 = A.hero;
      if (t >= 8 && t < 9) {
        let p;
        if (t < 8.75) p = E.inOutExpo(prog(t, 8, 8.25)); else p = 1 - E.inExpo(prog(t, 8.75, 9));
        let s = lerp(1, H0.s, p);
        if (t >= 8.25 && t < 8.75) s *= lerp(1.08, 1, E.spring(prog(t, 8.25, 8.5)));
        tf(S3.heroP, { x: lerp(0, H0.cx - A.pill.cx, p), y: lerp(0, H0.cy - A.pill.cy, p), s, op: 1 });
        S3.heroP.style.display = '';
        const fk = t >= 8.25 ? 1 + .06 * (1 - Math.cos(2 * Math.PI * 4 * (t - 8.25))) : 1;
        S3.hero.fl.style.transform = `scaleY(${fk})`;
      } else S3.heroP.style.display = 'none';
      // 빛살
      const rp = prog(t, 8.25, 8.55);
      if (t >= 8.25 && rp < 1) {
        S3.raysSvg.style.display = '';
        const hw = (S3.heroWH ? S3.heroWH.w : 280) * H0.s / 2 + 24, hh = (S3.heroWH ? S3.heroWH.h : 64) * H0.s / 2 + 24;
        S3.rays.forEach((ry, i) => {
          const ca = Math.cos(ry.a), sa = Math.sin(ry.a);
          // 알약(스타디움) 테두리 근처: 타원 근사
          const side = Math.abs(ca) > .8 ? .45 : 1, ex0 = H0.cx + hw * ca, ey0 = H0.cy + hh * sa, d = ry.d * side * E.out3(rp), len = ry.len * side * (1 - .6 * rp);
          const ln = S3.rayL[i];
          ln.setAttribute('x1', ex0 + ca * d); ln.setAttribute('y1', ey0 + sa * d);
          ln.setAttribute('x2', ex0 + ca * (d + len)); ln.setAttribute('y2', ey0 + sa * (d + len));
          ln.setAttribute('opacity', 1 - E.in3(rp));
        });
      } else S3.raysSvg.style.display = 'none';
    }

    // ---------- 규칙 자막 ----------
    {
      // 1: 틀리면 -3초 (5.00 쾅, 6.25-6.40 마스크 아웃)
      const c1 = S3.cap1;
      if (t >= 5 && t < 6.4) {
        const sl = s3Slam(t, 5), [x, y] = s3Shake(t, 5, 10), po = E.in3(prog(t, 6.25, 6.4));
        c1.p.style.display = ''; tf(c1.p, { x, y, s: sl.s, op: sl.op, blur: sl.blur });
        c1.lns.forEach((e, i) => e.style.transform = `translateY(${-po * 110}%)`);
      } else c1.p.style.display = 'none';
      // 2: 연속 정답, 보너스 점수! (6.50 마스크 업, 9.00-9.15 아웃)
      const c2 = S3.cap2;
      if (t >= 6.5 && t < 9.15) {
        c2.p.style.display = ''; tf(c2.p, {}); c2.c.style.color = s3Mix('#191f28', '#ffffff', S3.scrimOp || 0);
        c2.lns.forEach((e, i) => { const pi = E.out5(prog(t, 6.5 + i * .06, 6.5 + i * .06 + .4)), po = E.in3(prog(t, 9 + i * .03, 9.12 + i * .03)); e.style.transform = `translateY(${(1 - pi) * 110 - po * 110}%)`; });
      } else c2.p.style.display = 'none';
      // 3: 시간 끝! (9.50 쾅, 계속)
      const c3 = S3.cap3;
      if (t >= 9.5) {
        const sl = s3Slam(t, 9.5), [x, y] = s3Shake(t, 9.5, 10);
        c3.p.style.display = ''; tf(c3.p, { x, y, s: sl.s, op: sl.op, blur: sl.blur });
      } else c3.p.style.display = 'none';
    }
    // 여백 +N
    {
      let bk = -1;
      S3_TAP.forEach((T, k) => { if (t >= T && t < T + .45) bk = k; });
      if (bk >= 0) {
        const T = S3_TAP[bk], sl = s3Slam(t, T), p = prog(t, T, T + .45);
        s3Txt(S3.burst, '+' + (S3_SC[bk + 1] - S3_SC[bk]));
        S3.burstP.style.display = '';
        tf(S3.burstP, { y: -A.burst.rise * E.out3(p), s: sl.s, op: sl.op * (1 - E.in3(prog(p, .55, 1))), blur: sl.blur });
      } else S3.burstP.style.display = 'none';
    }
  },
});
