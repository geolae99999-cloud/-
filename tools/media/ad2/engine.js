/* VocaPro 광고 2 엔진: 장면 파일(scenes/*.js)이 SCENE({...})로 자기 장면을 등록하고, seek(t)가 시각 t의 화면을 그려요.
 * 같은 장면 파일로 가로(1920x1080)와 세로(1080x1920)를 함께 만들어요. 주소 끝 #v 이면 세로.
 * 규칙: 시간에 따라 바뀌는 것은 전부 draw(t)에서 t만 보고 정해요(타이머·Math.random 금지, rnd()는 시드 고정). 그래야 어느 시점으로 건너뛰어도 같은 그림이 나와요.
 */
const V = /(^|[#&])v($|&)/.test(location.hash.slice(1)), W = V ? 1080 : 1920, H = V ? 1920 : 1080;
document.documentElement.classList.add(V ? 'vert' : 'land');
const $ = id => document.getElementById(id);
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const prog = (t, a, b) => clamp((t - a) / (b - a));
const lerp = (a, b, p) => a + (b - a) * p;
const L = (land, vert) => V ? vert : land;            // 가로/세로 값 고르기
const E = {
  lin: p => p,
  out2: p => 1 - (1 - p) * (1 - p),
  out3: p => 1 - Math.pow(1 - p, 3),
  out5: p => 1 - Math.pow(1 - p, 5),
  outExpo: p => p >= 1 ? 1 : 1 - Math.pow(2, -10 * p),
  in3: p => p * p * p,
  inExpo: p => p <= 0 ? 0 : Math.pow(2, 10 * p - 10),
  inOut3: p => p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2,
  inOutExpo: p => p <= 0 ? 0 : p >= 1 ? 1 : p < .5 ? Math.pow(2, 20 * p - 10) / 2 : (2 - Math.pow(2, -20 * p + 10)) / 2,
  back: (p, c = 1.9) => { const c3 = c + 1; return 1 + c3 * Math.pow(p - 1, 3) + c * Math.pow(p - 1, 2); },
  // 감쇠 스프링 0 -> 1 (살짝 넘쳤다 자리 잡음)
  spring: (p, f = 4.5, d = 6) => p <= 0 ? 0 : p >= 1 ? 1 : 1 - Math.exp(-d * p) * Math.cos(f * Math.PI * p),
};
let __seed = 7; const rnd = () => (__seed = (__seed * 16807) % 2147483647) / 2147483647;   // build() 안에서만 쓰기
const tf = (el, o = {}) => {
  const { x = 0, y = 0, s = 1, sx = 1, sy = 1, r = 0, rx = 0, ry = 0, op, blur } = o;
  el.style.transform = `translate3d(${x}px,${y}px,0) rotateX(${rx}deg) rotateY(${ry}deg) rotate(${r}deg) scale(${s * sx},${s * sy})`;
  if (op !== undefined) el.style.opacity = op;
  if (blur !== undefined) el.style.filter = blur > .05 ? `blur(${blur}px)` : '';
};
// 줄 마스크 등장: <span class="ln"><span>글자</span></span>
const reveal = (el, t, a, d = .7, out) => {
  const sp = el.firstElementChild; const p = E.out5(prog(t, a, a + d));
  let y = (1 - p) * 110; if (out !== undefined) y -= E.in3(prog(t, out, out + .4)) * 110;
  sp.style.transform = `translateY(${y}%)`;
};
const pop = (el, t, a, d = .6) => { const p = prog(t, a, a + d); el.style.opacity = clamp(p * 4); el.style.transform = `scale(${p ? E.back(p) : 0})`; };
const fadeUp = (el, t, a, d = .6, dy = 40) => { const p = E.out5(prog(t, a, a + d)); el.style.opacity = p; el.style.transform = `translateY(${(1 - p) * dy}px)`; };
const split = (el, text) => { el.innerHTML = [...text].map(c => `<span class="ch">${c === ' ' ? ' ' : c}</span>`).join(''); return [...el.children]; };
const SVG = (d, sw = 2.1) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
const MASCOT = { happy: '__MASCOT_HAPPY__', cheer: '__MASCOT_CHEER__', think: '__MASCOT_THINK__', sleep: '__MASCOT_SLEEP__' };
const el = (tag, cls, html, parent, style) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; if (style) e.style.cssText = style; if (parent) parent.appendChild(e); return e; };

/* 장면 등록
 * SCENE({ id, start, end, inDur, z, build(root), measure(root), draw(t, lt, root, prevRoot) })
 *  - z: 겹침 순서(없으면 시작 순서). 계속 떠 있는 로고 같은 덮개 장면은 z를 크게.
 *  - start~end: 장면 시간(초). inDur: 들어오는 전환 길이(초). 전환 동안 이전 장면이 밑에 남아 있고, 들어오는 장면이 자기 전환을 그려요.
 *  - draw의 lt = t - start (장면 안 시간, 전환 중에는 0~inDur). prevRoot: 바로 앞 장면 루트(밀어내기 같은 효과를 줄 때만 transform/filter/opacity 를 건드려요).
 *  - 끝난 뒤에도 다음 장면 전환 동안 draw가 계속 불려요(t > end).
 */
const SCENES = [];
function SCENE(s) { SCENES.push(s); }
let DUR = 30, CUES = [];
// build(root) 다음 글꼴이 다 내려온 뒤 measure(root)를 불러요. 글자 위치를 재는 일(HO 핸드오프 좌표)은 measure에서 해요(변환을 지운 상태).
const HO = window.HO = window.HO || {};
async function boot() {
  SCENES.sort((a, b) => a.start - b.start);
  const stage = $('stage');
  SCENES.forEach((s, i) => { s.root = el('section', 'scene', null, stage); s.root.id = 'sc-' + s.id; s.root.style.zIndex = s.z || (s.overlay ? 1000 : i + 1); try { s.build && s.build(s.root); } catch (e) { console.error(s.id + ' build: ' + e.message); } });
  DUR = window.AD_DUR || Math.max(...SCENES.map(s => s.end || 0));
  window.DUR = DUR;
  await document.fonts.ready;
  SCENES.forEach(s => { if (s.measure) { const v = s.root.style.visibility; s.root.style.visibility = 'visible'; try { s.measure(s.root); } catch (e) { console.error(s.id + ' measure: ' + e.message); } s.root.style.visibility = v; } });
}
// overlay:true 장면은 앞뒤 장면 사슬에서 빠지고 start~end 동안만 보여요(로고 버그 같은 것).
function drawOne(s, t, prev) { try { s.draw(t, t - s.start, s.root, prev); } catch (e) { console.error(s.id + ' draw@' + t + ': ' + e.message); } }
function seek(t) {
  SCENES.forEach(s => { const r = s.root; r.style.transform = ''; r.style.filter = ''; r.style.clipPath = ''; r.style.opacity = ''; r.style.borderRadius = ''; r.style.visibility = 'hidden'; });
  const seq = SCENES.filter(s => !s.overlay);
  seq.forEach((s, i) => {
    const next = seq[i + 1], until = next ? next.start + (next.inDur || 0) : 1e9;
    if (t >= s.start && t < until) s.root.style.visibility = 'visible';
  });
  SCENES.forEach(s => { if (s.overlay && t >= s.start && t < s.end) s.root.style.visibility = 'visible'; });
  seq.forEach((s, i) => { if (s.root.style.visibility === 'visible') drawOne(s, t, i ? seq[i - 1].root : null); });
  SCENES.forEach(s => { if (s.overlay && s.root.style.visibility === 'visible') drawOne(s, t, null); });
}
window.seek = seek; window.W = W; window.H = H; window.V = V;
