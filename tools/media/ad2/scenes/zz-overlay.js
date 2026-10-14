// 브랜드 버그 · 4.50-29.90 (엔진 overlay 장면: 모든 장면 위, start<=t<end 동안만 보여요)
// 4.50-4.75 나타남, 29.75-29.90 사라짐. 테마: 색 배경 위(onColor: 흰 워드마크, 테두리 없는 마크) / 밝은 배경 위(onLight: 잉크 워드마크, 테두리 마크), 경계마다 0.15 s 크로스페이드.
const OV_LAY = L(
  { box: { x: 1672, y: 1008, w: 200, h: 40 }, mark: 40, v: 26, gap: 10, fs: 30, align: 'right' },
  { box: { x: 72, y: 1452, w: 228, h: 44 }, mark: 44, v: 28, gap: 12, fs: 32, align: 'left' },
);
// onColor 구간 [a, b): 버그 자리 배경이 실제로 바뀌는 시각(형식마다 다름, 버그를 숨기고 밝기를 재서 맞춤).
// 하드 컷(10.00, 14.00)은 컷 프레임에서 이미 흰 워드마크가 되도록 0.03 s 앞당겨요.
// S5 문은 아래 띠가 버그를 먼저 덮고(11.85/11.88), S7 기울기 닦기와 S8 칩 확대·S9 줄무늬도 형식마다 지나가는 시각이 달라요.
const OV_COLOR = L([[9.97, 11.845], [13.97, 16.84], [22.40, 24.865]], [[9.97, 11.875], [13.97, 16.882], [22.385, 24.905]]);
const OV_INK = [25, 31, 40], OV_RING = [229, 232, 235];
// onColor 정도 0..1 : 경계 b 를 가운데로 0.15 s 동안 바뀌어요
const ovColorK = t => {
  const X = .03;   // 배경이 컷·빠른 닦기로 바뀌므로 짧게(0.06 s): 길면 파랑 위 회색 워드마크가 보여요
  for (const [a, b] of OV_COLOR) {
    if (t >= a - X && t < b + X) return Math.min(clamp((t - (a - X)) / (2 * X)), 1 - clamp((t - (b - X)) / (2 * X)));
  }
  return 0;
};
const OV = {};
SCENE({
  id: 'overlay', overlay: true, z: 1000, start: 4.5, end: 29.9, inDur: 0,
  build(root) {
    const Y = OV_LAY, B = Y.box;
    OV.bug = el('div', 'ov-bug', null, root, `top:${B.y}px;height:${B.h}px;${Y.align === 'right' ? `right:${W - (B.x + B.w)}px;justify-content:flex-end` : `left:${B.x}px`}`);
    OV.mark = el('span', 'logoMark ov-mark', 'V', OV.bug, `width:${Y.mark}px;height:${Y.mark}px;border-radius:${Y.mark * .29}px;font-size:${Y.v}px`);
    OV.wm = el('span', 'ov-wm', 'VocaPro', OV.bug, `font-size:${Y.fs}px;margin-left:${Y.gap}px`);
  },
  draw(t) {
    const fin = E.out3(prog(t, 4.5, 4.75)), fout = 1 - prog(t, 29.75, 29.9);
    OV.bug.style.opacity = (.92 * fin * fout).toFixed(3);
    const k = ovColorK(t), c = OV_INK.map(v => Math.round(lerp(v, 255, k)));
    OV.wm.style.color = `rgb(${c.join(',')})`;
    OV.mark.style.boxShadow = `0 0 0 2px rgba(${OV_RING.join(',')},${(1 - k).toFixed(3)}), 0 4px 12px rgba(0,27,55,${(.12 * (1 - k) + .1 * k).toFixed(3)})`;
  },
});
