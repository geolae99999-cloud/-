// S6 · 14–17초 [8.1-9.3] · 1등 비결은? AI 자동 채우기
// 들어오기: 14.00 하드 컷(전환 없음). 질문은 첫 프레임부터 완성된 자세로 떠 있어요.
// 핸드오프: HO.s6.word() -> {x, y, w, h, fontSize}  가운데로 FLIP된 'achieve' (배율 1, 쉬는 자세). 16.50 이후 S6 은 이 글자를 1.04 로 키워 둬요.
const S6_LAY = L({
  q: { lines: [{ cy: 540, fs: 260, parts: [0, 1] }], cx: 960, cy: 540 },
  kick: { x: 140, y: 90, fs: 44 },
  masc: { x: 1640, y: 380, d: 200, ox: 180, oy: 0 },
  head: { x: 140, fs: 80, caps: [170, 270] },
  chip: { x: 360, y: 420, h: 60, fs: 30, ic: 30 },
  lab: { x: 364, y: 500, fs: 34 },
  bar: { x: 360, y: 550, w: 1200, h: 150, r: 48, tfs: 92, tx: 48, caretH: 96 },
  btn: { w: 270, h: 110, r: 34, fs: 38, mr: 20, ic: 38 },
  stat: { x: 360, y: 724, h: 52, fs: 30 },
  word: { cx: 960, cy: 596, fs: 190 },
  ghost: { cx: 960, cy: 600, fs: 900 },
  tiles: [{ x: 140, y: 392, w: 450, h: 168 }, { x: 1330, y: 392, w: 450, h: 168 }, { x: 140, y: 708, w: 820, h: 232 }, { x: 1100, y: 740, w: 680, h: 168 }],
  lines: [1, 1, 1, 1],
  tf: { lab: 30, mean: 64, pron: 56, en: 32, ko: 28, chip: 34, chipH: 64, padX: 36, padY: 24, r: 36, spk: 44 },
}, {
  q: { lines: [{ cy: 760, fs: 260, parts: [0] }, { cy: 1020, fs: 230, parts: [1] }], cx: 540, cy: 890 },
  kick: { cx: 540, cy: 270, fs: 40 },
  masc: { x: 130, y: 1150, d: 190, ox: -150, oy: 40 },
  head: { cx: 540, fs: 64, cys: [350, 430] },
  chip: { x: 84, y: 560, h: 56, fs: 28, ic: 28 },
  lab: { x: 88, y: 636, fs: 30 },
  bar: { x: 84, y: 680, w: 912, h: 140, r: 48, tfs: 80, tx: 44, caretH: 84 },
  btn: { w: 220, h: 100, r: 32, fs: 34, mr: 20, ic: 34 },
  stat: { x: 84, y: 846, h: 50, fs: 28 },
  word: { cx: 540, cy: 620, fs: 160 },
  ghost: { cx: 540, cy: 760, fs: 760 },
  tiles: [{ x: 84, y: 760, w: 444, h: 170 }, { x: 552, y: 760, w: 444, h: 170 }, { x: 84, y: 954, w: 912, h: 240 }, { x: 84, y: 1218, w: 912, h: 140 }],
  lines: [1, 1, 1, 0],
  tf: { lab: 28, mean: 52, pron: 52, en: 32, ko: 28, chip: 32, chipH: 60, padX: 32, padY: 22, r: 36, spk: 40 },
});
const S6_IC = {
  sparkles: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3z"/><path d="M19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8L19 16z"/>',
  speaker: '<path d="M11 5 6 9H2v6h4l5 4V5z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/>',
  tick: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
};
const S6_WORD = 'achieve';
const S6_KEYS = [14.875, 15, 15.125, 15.25, 15.375, 15.5, 15.625];
const S6_TT = [16, 16.125, 16.25, 16.375];
const S6 = {};
const s6Ic = (d, px, sw = 1.8) => SVG(d, sw).replace('<svg ', `<svg width="${px}" height="${px}" `);
const s6At = (e, x, y, w, h) => { e.style.left = x + 'px'; e.style.top = y + 'px'; if (w != null) e.style.width = w + 'px'; if (h != null) e.style.height = h + 'px'; return e; };
const s6Mix = (a, b, p) => `rgb(${a.map((v, i) => Math.round(lerp(v, b[i], p))).join(',')})`;
const s6Pop = (t, a, d = .35, c = 1.9) => { const p = prog(t, a, a + d); return { s: p > 0 ? E.back(p, c) : 0, op: clamp(p * 5) }; };

SCENE({
  id: 's6', start: 14, end: 17, inDur: 0,
  build(root) {
    __seed = 106;
    const A = S6_LAY;
    // 거대한 유령 글자 (입력창 뒤)
    S6.ghost = el('div', 's6-ghost', '', root, `font-size:${A.ghost.fs}px`);
    // 질문 '1등 비결은?' (첫 프레임부터 완성)
    S6.qWrap = el('div', 's6-a', null, root, `width:${W}px;height:${H}px;transform-origin:${A.q.cx}px ${A.q.cy}px`);
    S6.qs = [];
    A.q.lines.forEach(ln => {
      const d = el('div', 's6-q', null, S6.qWrap, `width:${W}px;top:${ln.cy - ln.fs / 2}px;font-size:${ln.fs}px`);
      ln.parts.forEach((pi, k) => {
        if (k) d.appendChild(document.createTextNode(' '));
        S6.qs[pi] = el('span', pi ? 's6-white' : 's6-gold', pi ? '비결은?' : '1등', d);
      });
    });
    // 측정용 머리말(보이지 않음): 쌓인 뒤의 자리
    const K = A.kick;
    S6.kick = el('div', 's6-q s6-kick', '<span>1등</span> <span>비결은?</span>', root, `font-size:${K.fs}px;letter-spacing:-0.035em;` + (K.cx != null ? `width:${W}px;top:${K.cy - K.fs / 2}px` : `text-align:left;left:${K.x}px;top:${K.y - K.fs * .12}px`));
    // 생각 마스코트
    const M = A.masc;
    S6.masc = s6At(el('div', 's6-masc', '__MASCOT_THINK__', root), M.x, M.y, M.d, M.d);
    // 헤드라인 두 줄
    const Hd = A.head;
    S6.head = ['단어만 치면,', '<b>AI</b>가 다 채워요'].map((txt, i) => {
      const e = el('div', 's6-head', `<span class="ln"><span>${txt}</span></span>`, root, `font-size:${Hd.fs}px`);
      if (Hd.cx != null) { e.style.left = '0px'; e.style.width = W + 'px'; e.style.textAlign = 'center'; e.style.top = (Hd.cys[i] - Hd.fs * .55) + 'px'; }
      else { e.style.left = Hd.x + 'px'; e.style.top = (Hd.caps[i] - Hd.fs * .19) + 'px'; }
      return e.firstChild;
    });
    S6.headEl = S6.head.map(h => h.parentNode);
    // 입력 폼: 칩 · 라벨 · 입력창(자리표시 · 커서 · AI 완성) · 상태줄
    const C = A.chip;
    S6.chip = s6At(el('div', 's6-chip', `${s6Ic(S6_IC.sparkles, C.ic)}<span>AI 자동 채우기</span>`, root, `height:${C.h}px;padding:0 ${Math.round(C.h * .42)}px 0 ${Math.round(C.h * .32)}px;gap:${Math.round(C.fs * .3)}px;font-size:${C.fs}px`), C.x, C.y);
    S6.lab = s6At(el('div', 's6-lab', '영단어', root, `font-size:${A.lab.fs}px`), A.lab.x, A.lab.y);
    const B = A.bar, Bt = A.btn;
    S6.ripple = el('div', 's6-ripple', null, root);   // 입력창 뒤에서 퍼지는 물결
    S6.bar = s6At(el('div', 's6-bar', null, root, `border-radius:${B.r}px`), B.x, B.y, B.w, B.h);
    S6.ph = el('div', 's6-ph', '예: consistent', S6.bar, `left:${B.tx}px;font-size:${B.tfs}px`);
    S6.caret = el('div', 's6-caret', null, S6.bar, `width:4px;height:${B.caretH}px;top:${(B.h - B.caretH) / 2}px`);
    S6.btn = s6At(el('div', 's6-btn', null, S6.bar, `border-radius:${Bt.r}px;font-size:${Bt.fs}px`), B.w - Bt.mr - Bt.w, (B.h - Bt.h) / 2, Bt.w, Bt.h);
    S6.btnA = el('span', '', `${s6Ic(S6_IC.sparkles, Bt.ic, 2)}<b style="font-weight:700;margin-left:${Math.round(Bt.fs * .22)}px">AI 완성</b>`, S6.btn);
    S6.btnB = el('span', '', '조회 중', S6.btn);
    const St = A.stat;
    S6.stat = s6At(el('div', 's6-stat busy', null, root, `height:${St.h}px;padding:0 ${Math.round(St.fs * .7)}px;gap:${Math.round(St.fs * .4)}px;font-size:${St.fs}px`), St.x, St.y);
    S6.statBusy = `<i class="s6-dot" style="width:${Math.round(St.fs * .4)}px;height:${Math.round(St.fs * .4)}px"></i><span>AI가 채우는 중</span>`;
    S6.statOk = `${s6Ic(S6_IC.tick, Math.round(St.fs * 1.05), 3)}<span>채웠어요</span>`;
    // 물결 + 반짝 6개 (버튼 누름)
    S6.sparks = Array.from({ length: 6 }, (_, i) => ({ e: el('div', 's6-spark', s6Ic(S6_IC.sparkles, 40, 2.2).replace('fill="none"', 'fill="currentColor"'), root, `width:40px;height:40px;color:${i % 2 ? '#ffffff' : '#ffd25e'}`), a: (i * 60 + 30 + (rnd() - .5) * 16) * Math.PI / 180, d: 1 + rnd() * .25, sp: (rnd() - .5) * 180 }));
    // 연결선 + 타일 4개
    S6.svg = el('div', '', `<svg class="s6-lines" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${S6_TT.map(() => '<line stroke="rgba(255,255,255,.25)" stroke-width="3" stroke-linecap="round"/>').join('')}</svg>`, root).querySelectorAll('line');
    const F = A.tf;
    const lab = (txt) => `<div class="s6-tl" style="font-size:${F.lab}px">${txt}</div>`;
    const tileHtml = [
      `${lab('뜻')}<div class="s6-tv" style="font-size:${F.mean}px;margin-top:${Math.round(F.lab * .3)}px">성취하다</div>`,
      `${lab('한글 발음')}<div class="s6-tv" style="font-size:${F.pron}px;margin-top:${Math.round(F.lab * .3)}px;gap:${Math.round(F.pron * .3)}px">어치브<i>${s6Ic(S6_IC.speaker, F.spk, 2)}</i></div>`,
      `${lab('예문 (영어)')}<div class="s6-en" style="font-size:${F.en}px;margin:2px 0 ${Math.round(F.en * .35)}px">You can <u>achieve</u> your goal with hard work.</div>${lab('예문 해석')}<div class="s6-ko" style="font-size:${F.ko}px;margin-top:2px">열심히 노력하면 목표를 성취할 수 있다.</div>`,
      `${lab('비슷한 단어')}<div class="s6-syn" style="margin-top:${Math.round(F.lab * .4)}px">${['accomplish', 'reach'].map(s => `<span style="font-size:${F.chip}px;height:${F.chipH}px;padding:0 ${Math.round(F.chipH * .4)}px;border-radius:26px">${s}</span>`).join('')}</div>`,
    ];
    S6.tiles = A.tiles.map((r, i) => s6At(el('div', 's6-tile', tileHtml[i], root, `border-radius:${F.r}px;padding:${F.padY}px ${F.padX}px`), r.x, r.y, r.w, r.h));
    // 'achieve' (최종 자세로 놓고, 입력창 안에서는 변환으로 줄여 둬요)
    S6.word = el('div', 's6-word', null, root, `font-size:${A.word.fs}px`);
    S6.chars = split(S6.word, S6_WORD);
    const ho = HO.s6 = HO.s6 || {};
    ho.word = () => S6.wr ? { ...S6.wr } : { x: A.word.cx - A.word.fs * 1.8, y: A.word.cy - A.word.fs / 2, w: A.word.fs * 3.6, h: A.word.fs, fontSize: A.word.fs };
  },
  measure(root) {
    const A = S6_LAY, Wd = A.word;
    [S6.word, S6.qWrap, ...S6.qs, S6.bar, S6.masc].forEach(e => { e.style.transform = ''; e.style.filter = ''; });
    const ww = S6.word.offsetWidth;
    S6.word.style.left = (Wd.cx - ww / 2) + 'px'; S6.word.style.top = (Wd.cy - Wd.fs / 2) + 'px';
    S6.wr = { x: Wd.cx - ww / 2, y: Wd.cy - Wd.fs / 2, w: ww, h: Wd.fs, fontSize: Wd.fs };
    S6.cr = S6.chars.map(c => c.offsetLeft + c.offsetWidth);
    // 질문 -> 머리말 FLIP
    const ks = [...S6.kick.children];
    S6.flip = S6.qs.map((q, i) => { const a = q.getBoundingClientRect(), b = ks[i].getBoundingClientRect(); return { dx: b.left - a.left, dy: b.top - a.top, s: b.width / a.width }; });
    // 버튼 가운데 (화면 좌표)
    const B = A.bar, Bt = A.btn;
    S6.btnC = { x: B.x + B.w - Bt.mr - Bt.w / 2, y: B.y + B.h / 2 };
  },
  draw(t, lt, root) {
    const A = S6_LAY, B = A.bar, Wd = A.word, wr = S6.wr || HO.s6.word();
    // ── 질문: 14.00 이미 완성 (1.03 -> 1 정착), 14.75 머리말로 쌓임
    S6.qWrap.style.transform = `scale(${1 + .03 * (1 - E.out3(prog(t, 14, 14.25)))})`;
    const sp = E.outExpo(prog(t, 14.75, 14.97));
    S6.qs.forEach((q, i) => {
      const f = (S6.flip && S6.flip[i]) || { dx: 0, dy: 0, s: 1 };
      q.style.transform = `translate(${f.dx * sp}px,${f.dy * sp}px) scale(${lerp(1, f.s, sp)})`;
      if (i) q.style.opacity = lerp(1, .7, sp);
    });
    // ── 마스코트: 14.125 팝, 고개 갸웃, 14.75 밀려나며 사라짐
    const M = A.masc, mp = s6Pop(t, 14.125, .4), mo = E.in3(prog(t, 14.75, 14.95));
    S6.masc.style.transform = `translate(${M.ox * mo}px,${M.oy * mo}px) rotate(${-8 * E.inOut3(prog(t, 14.3, 14.7))}deg) scale(${mp.s})`;
    S6.masc.style.opacity = mp.op * (1 - mo);
    // ── 헤드라인
    reveal(S6.head[0], t, 14.75, .5);
    reveal(S6.head[1], t, 15.5, .5);
    // ── 입력창: 14.75 SLAM, 키마다 3 px 꾹, 16.00 접힘
    const nK = S6_KEYS.filter(k => t >= k).length;
    let nud = 0; S6_KEYS.forEach(k => { nud += 3 * Math.sin(Math.PI * prog(t, k, k + .1)); });
    const bs = lerp(1.1, 1, E.out5(prog(t, 14.75, 14.89))), bon = clamp((t - 14.75) / .03);
    const col = E.inOut3(prog(t, 16, 16.2));
    const formOp = bon * (1 - col);
    S6.bar.style.transform = `translateY(${nud}px) scale(${bs},${bs * (1 - col)})`;
    S6.bar.style.opacity = formOp;
    S6.bar.style.filter = t < 14.89 && t >= 14.75 ? `blur(${(4 * (1 - prog(t, 14.75, 14.89))).toFixed(2)}px)` : '';
    const cp = s6Pop(t, 14.8125, .35);
    S6.chip.style.transform = `scale(${cp.s},${cp.s * (1 - col)})`; S6.chip.style.opacity = cp.op * (1 - col);
    const lp = E.out5(prog(t, 14.75, 15.05));
    S6.lab.style.transform = `translateY(${(1 - lp) * 16}px) scaleY(${1 - col})`; S6.lab.style.opacity = lp * (1 - col);
    S6.ph.style.opacity = nK ? 0 : 1;
    // 커서: 0.25 초마다 깜빡, 버튼 누르면 사라짐
    const caretOn = t >= 14.75 && t < 15.75 && Math.floor((t - 14.75) / .25) % 2 === 0;
    S6.caret.style.opacity = caretOn ? 1 : 0;
    const s0 = B.tfs / Wd.fs;
    S6.caret.style.left = (B.tx + (nK ? S6.cr[nK - 1] * s0 + 6 : -2)) + 'px';
    // 버튼: 15.75 누름 (1 -> .94 -> 1), 라벨 '조회 중'
    const pr = Math.sin(Math.PI * prog(t, 15.75, 15.93));
    S6.btn.style.transform = `scale(${1 - .06 * pr})`;
    const busy = t >= 15.75;
    S6.btnA.style.opacity = busy ? 0 : 1; S6.btnB.style.opacity = busy ? 1 : 0;
    // 물결 + 반짝
    const rp = prog(t, 15.75, 16.15), bc = S6.btnC || { x: B.x + B.w - 155, y: B.y + B.h / 2 };
    if (rp > 0 && rp < 1) {
      const d = lerp(A.btn.h, 600, E.out3(rp));
      S6.ripple.style.display = 'block';
      S6.ripple.style.width = S6.ripple.style.height = d + 'px';
      S6.ripple.style.transform = `translate(${bc.x - d / 2}px,${bc.y + nud - d / 2}px)`;
      S6.ripple.style.opacity = 1 - E.out2(rp);
    } else S6.ripple.style.display = 'none';
    const kp = prog(t, 15.75, 16.2);
    S6.sparks.forEach(s => {
      if (kp <= 0 || kp >= 1) { s.e.style.opacity = 0; return; }
      const r = lerp(50, 210 * s.d, E.out3(kp)), sc = .5 + .7 * Math.sin(Math.PI * Math.min(1, kp * 1.3));
      s.e.style.opacity = 1 - E.in3(kp);
      s.e.style.transform = `translate(${bc.x + Math.cos(s.a) * r * 1.25 - 20}px,${bc.y + Math.sin(s.a) * r - 20}px) rotate(${s.sp * kp}deg) scale(${sc})`;
    });
    // 상태줄: 15.75 'AI가 채우는 중' (맥박 점) -> 16.00 '채웠어요'
    const St = S6.stat;
    if (t < 15.75) St.style.opacity = 0;
    else {
      const ok = t >= 16;
      if (St.__k !== ok) { St.innerHTML = ok ? S6.statOk : S6.statBusy; St.className = 's6-stat ' + (ok ? 'ok' : 'busy'); St.__k = ok; }
      const ip = E.out5(prog(t, 15.75, 15.9)), op = 1 - E.in3(prog(t, 16.12, 16.32));
      St.style.opacity = ip * op;
      St.style.transform = `translateY(${(1 - ip) * 12 - 10 * E.in3(prog(t, 16.12, 16.32))}px)`;
      const dot = St.querySelector('.s6-dot');
      if (dot) { const ph = (t - 15.75) * 4; dot.style.transform = `scale(${1 + .3 * Math.sin(ph * Math.PI * 2)})`; dot.style.opacity = .65 + .35 * Math.cos(ph * Math.PI * 2); }
    }
    // ── 유령 글자: 키마다 하나 SLAM (앞 글자 대신)
    if (nK && t < 16.2) {
      const k = S6_KEYS[nK - 1], gp = prog(t, k, k + .14);
      S6.ghost.textContent = S6_WORD[nK - 1];
      S6.ghost.style.opacity = 1 - E.inOut3(prog(t, 16, 16.2));
      S6.ghost.style.left = A.ghost.cx + 'px'; S6.ghost.style.top = A.ghost.cy + 'px';
      S6.ghost.style.transform = `translate(-50%,-50%) scale(${lerp(1.35, 1, E.out5(gp))})`;
      S6.ghost.style.filter = gp < 1 ? `blur(${(8 * (1 - E.out5(gp))).toFixed(2)}px)` : '';
    } else S6.ghost.style.opacity = 0;
    // ── 'achieve': 입력창 안에서 한 글자씩, 16.00 가운데로 FLIP (2배), 16.50 1 -> 1.04
    S6.chars.forEach((c, i) => { const k = S6_KEYS[i]; c.style.opacity = t >= k ? 1 : 0; c.style.transform = t >= k ? `translateY(${(1 - E.out3(prog(t, k, k + .06))) * 10}%)` : ''; });
    const inX = B.x + B.tx - wr.x, inY = B.y + B.h / 2 - B.tfs / 2 - wr.y + nud;
    const fp = E.outExpo(prog(t, 16, 16.25));
    const hs = 1 + .04 * E.inOut3(prog(t, 16.5, 16.75));
    const ws = lerp(s0, 1, fp) * hs;
    const wx = lerp(inX, 0, fp) + (1 - hs) * wr.w / 2, wy = lerp(inY, 0, fp) + (1 - hs) * wr.h / 2;
    S6.word.style.transform = `translate(${wx}px,${wy}px) scale(${ws})`;
    S6.word.style.color = s6Mix([25, 31, 40], [255, 255, 255], E.out3(prog(t, 16, 16.12)));
    S6.word.style.opacity = t < 16 ? bon : 1;
    // ── 타일 4개: 단어에서 튀어나와 자리로, 16.75 다시 단어 속으로
    const wc = { x: wr.x + wr.w / 2, y: wr.y + wr.h / 2 }, bk = E.inExpo(prog(t, 16.75, 16.95));
    S6.tiles.forEach((tile, i) => {
      const a = S6_TT[i], r = A.tiles[i], p = prog(t, a, a + .28), ln = S6.svg[i];
      if (p <= 0 || bk >= 1) { tile.style.opacity = 0; ln.style.opacity = 0; return; }
      const e = E.back(p, 1.4);
      const tc = { x: r.x + r.w / 2, y: r.y + r.h / 2 };
      const fl = 4 * Math.sin(2 * Math.PI * 1.7 * (t - a - .28) + i * 1.1) * clamp(prog(t, a + .28, a + .45));
      const k = lerp(e, 0, bk), cx = lerp(wc.x, tc.x, k), cy = lerp(wc.y, tc.y, k) + fl * (1 - bk);
      const s = lerp(.3, 1, k);
      tile.style.opacity = clamp(p * 6) * (1 - prog(t, 16.86, 16.95));
      tile.style.transform = `translate(${cx - tc.x}px,${cy - tc.y}px) scale(${s})`;
      // 연결선: 단어 테두리에서 타일 가운데까지 (점선 오프셋으로 그림)
      const dx = cx - wc.x, dy = cy - wc.y, hx = wr.w / 2 + 18, hy = wr.h * .36;
      const m = Math.min(Math.abs(dx) > .01 ? hx / Math.abs(dx) : 1e9, Math.abs(dy) > .01 ? hy / Math.abs(dy) : 1e9);
      const x1 = wc.x + dx * Math.min(m, 1), y1 = wc.y + dy * Math.min(m, 1);
      const len = Math.hypot(cx - x1, cy - y1), lp = E.out3(prog(t, a, a + .15));
      ln.setAttribute('x1', x1.toFixed(1)); ln.setAttribute('y1', y1.toFixed(1)); ln.setAttribute('x2', cx.toFixed(1)); ln.setAttribute('y2', cy.toFixed(1));
      ln.style.strokeDasharray = `${len.toFixed(1)} ${(len + 10).toFixed(1)}`;
      ln.style.strokeDashoffset = (len * (1 - lp)).toFixed(1);
      ln.style.opacity = m < 1 && A.lines[i] ? 1 - bk : 0;
    });
  },
});
