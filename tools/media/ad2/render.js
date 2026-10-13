// VocaPro 광고 2 렌더러: engine.js + base.css + scenes/*.css|js 를 한 페이지로 묶어 seek(t) 로 프레임을 찍어요.
// 글꼴: FONT=PretendardVariable.woff2 경로, FONT_SC=@fontsource/noto-sans-sc 폴더 (npm pack pretendard@1.3.9 @fontsource/noto-sans-sc@5.0.19)
// 사용:
//   node tools/media/ad2/render.js shot l 12.5 [out.png]          한 장
//   node tools/media/ad2/render.js scene <장면id> [l|v]            장면 안 8장 모음 -> out/scene-<id>-<l|v>.png
//   node tools/media/ad2/render.js preview [l|v] [t1,t2,...]       전체 훑어보기 -> out/preview-<l|v>.png
//   node tools/media/ad2/render.js video [l|v|both]                영상 (60fps로 찍어 두 장씩 섞어 30fps), out/ad2.wav 가 있으면 소리를 넣어요
//   node tools/media/ad2/render.js page [l|v]                      묶은 페이지 경로만 출력(브라우저로 열어 보기)
const PW = process.env.PLAYWRIGHT || '/opt/node22/lib/node_modules/playwright';
const { chromium } = require(PW);
const http = require('http'), fs = require('fs'), path = require('path'), os = require('os'), { execFileSync } = require('child_process');
const DIR = __dirname, ROOT = path.join(DIR, '..', '..', '..'), PUB = path.join(ROOT, 'public'), OUT = path.join(DIR, 'out');
fs.mkdirSync(OUT, { recursive: true });
const FONT = process.env.FONT || '/tmp/claude-0/fonts/pretendard-1.3.9/package/dist/web/variable/woff2/PretendardVariable.woff2';
const SC_DIR = process.env.FONT_SC || '/tmp/claude-0/fonts/fontsource-noto-sans-sc-5.0.19/package';
const FONT_SC = fs.readFileSync(path.join(SC_DIR, '800.css'), 'utf8') + fs.readFileSync(path.join(SC_DIR, '500.css'), 'utf8');
const FONT_SC_CSS = FONT_SC.replace(/url\(\.\/files\//g, `url(file://${SC_DIR}/files/`).replace(/@font-face\s*{/g, '@font-face{font-display:block;');
const ff = (...a) => execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...a], { stdio: ['ignore', 'inherit', 'inherit'] });
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'ad2-'));

const srv = http.createServer((q, r) => {
  let f = path.join(PUB, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html';
  if (!f.startsWith(PUB)) { r.writeHead(403); return r.end(); }
  fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': f.endsWith('.js') ? 'text/javascript' : f.endsWith('.css') ? 'text/css' : 'text/html; charset=utf-8' }); r.end(d); });
}).listen(0);

async function mascots(b) {
  const p = await b.newPage();
  await p.route('https://*.supabase.co/**', r => r.abort()); await p.route(/fonts\.|jsdelivr/, r => r.abort());
  await p.goto(`http://localhost:${srv.address().port}/`);
  await p.waitForFunction(() => typeof MASCOT === 'function');
  const m = await p.evaluate(() => Object.fromEntries(['happy', 'cheer', 'think', 'sleep'].map(k => [k, MASCOT(k)])));
  await p.close(); return m;
}
function bundle(m) {
  const sc = path.join(DIR, 'scenes'), files = fs.readdirSync(sc).sort();
  const css = [fs.readFileSync(path.join(DIR, 'base.css'), 'utf8'), ...files.filter(f => f.endsWith('.css')).map(f => `/* ${f} */\n` + fs.readFileSync(path.join(sc, f), 'utf8'))].join('\n');
  // 장면마다 따로 <script>: 한 장면 문법 오류가 다른 장면을 막지 않게.
  const js = [fs.readFileSync(path.join(DIR, 'engine.js'), 'utf8'), ...files.filter(f => f.endsWith('.js')).map(f => `/* ${f} */\ntry {\n${fs.readFileSync(path.join(sc, f), 'utf8')}\n} catch (e) { console.error('${f}: ' + e.message); }`)];
  const sb = fs.existsSync(path.join(DIR, 'storyboard.json')) ? JSON.parse(fs.readFileSync(path.join(DIR, 'storyboard.json'), 'utf8')) : {};
  const fill = s => s.replace(/__FONT__/g, 'file://' + FONT).replace('__FONT_SC__', FONT_SC_CSS).replace(/'__MASCOT_(\w+)__'/g, (_, k) => JSON.stringify(m[k.toLowerCase()]));
  const html = `<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"><title>VocaPro 광고 2</title><style>\n${fill(css)}\n</style></head><body><div id="stage"></div>
<script>window.AD_DUR = ${JSON.stringify(sb.duration || null)};</script>
${js.map(x => '<script>\n' + fill(x).replace(/<\/script/gi, '<\\/script') + '\n</script>').join('\n')}
<script>boot().then(() => {
if (!/render/.test(location.hash)) { const t0 = performance.now(); const loop = () => { seek(((performance.now() - t0) / 1000) % DUR); requestAnimationFrame(loop); }; loop(); } else seek(0);
window.__ready = true; });</script></body></html>`;
  const f = path.join(TMP, 'ad2.html'); fs.writeFileSync(f, html); return f;
}
async function open(b, file, o) {
  const v = o === 'v', p = await b.newPage({ viewport: v ? { width: 1080, height: 1920 } : { width: 1920, height: 1080 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto('file://' + file + '#render' + (v ? '&v' : ''));
  await p.waitForFunction(() => window.__ready === true, null, { timeout: 15000 }).catch(() => {});
  await p.evaluate(() => document.fonts.ready);
  if (errs.length) { console.error('PAGE ERRORS:\n' + errs.join('\n')); }
  p.__errs = errs; return p;
}
const at = async (p, t) => { await p.evaluate(x => window.seek(x), t); };
function sheet(files, labels, w, h, cols, out) {
  const inp = files.flatMap(f => ['-i', f]);
  const fc = files.map((_, i) => `[${i}]scale=${w}:${h},drawtext=text='${labels[i]}':x=8:y=8:fontsize=22:fontcolor=white:box=1:boxcolor=black@0.6[v${i}]`).join(';') + ';' +
    files.map((_, i) => `[v${i}]`).join('') + `xstack=inputs=${files.length}:layout=` + files.map((_, i) => `${(i % cols) * w}_${Math.floor(i / cols) * h}`).join('|') + ':fill=black';
  ff(...inp, '-filter_complex', fc, out);
}
(async () => {
  const [cmd = 'preview', a1, a2, a3] = process.argv.slice(2);
  const b = await chromium.launch();
  const file = bundle(await mascots(b));
  if (cmd === 'page') { console.log(file); await b.close(); srv.close(); return; }
  if (cmd === 'shot') {
    const p = await open(b, file, a1 || 'l'); await at(p, +a2 || 0);
    const out = a3 || path.join(OUT, `shot-${a1 || 'l'}-${a2}.png`); await p.screenshot({ path: out }); console.log(out);
  } else if (cmd === 'scene' || cmd === 'preview') {
    const o = (cmd === 'scene' ? a2 : a1) || 'l', p = await open(b, file, o);
    let ts;
    if (cmd === 'scene') {
      const s = await p.evaluate(id => { const x = SCENES.find(s => s.id === id); return x && [x.start, x.end, x.inDur || 0]; }, a1);
      if (!s) throw new Error('no scene ' + a1 + '. scenes: ' + await p.evaluate(() => SCENES.map(s => s.id).join(',')));
      ts = Array.from({ length: 8 }, (_, i) => +(s[0] + (s[1] - s[0]) * (i + .5) / 8).toFixed(2));
      if (s[2]) ts[0] = +(s[0] + s[2] * .5).toFixed(2);
    } else {
      const dur = await p.evaluate(() => DUR);
      ts = a2 ? a2.split(',').map(Number) : Array.from({ length: 24 }, (_, i) => +((i + .5) * dur / 24).toFixed(2));
    }
    const files = [];
    for (const t of ts) { await at(p, t); const f = path.join(TMP, `p${files.length}.png`); await p.screenshot({ path: f }); files.push(f); }
    const v = o === 'v', w = v ? 270 : 480, h = v ? 480 : 270, cols = v ? 8 : 4;
    const out = path.join(OUT, cmd === 'scene' ? `scene-${a1}-${o}.png` : `preview-${o}.png`);
    sheet(files, ts.map(t => t + 's'), w, h, cols, out); console.log(out);
  } else if (cmd === 'video') {
    const os_ = (a1 || 'both') === 'both' ? ['l', 'v'] : [a1];
    for (const o of os_) {
      const RF = 60, p = await open(b, file, o), dur = await p.evaluate(() => DUR), n = Math.round(dur * RF), dir = path.join(TMP, 'f' + o);
      fs.mkdirSync(dir, { recursive: true });
      for (let i = 0; i < n; i++) { await at(p, i / RF); await p.screenshot({ path: path.join(dir, `f${String(i).padStart(5, '0')}.jpg`), type: 'jpeg', quality: 95 }); if (i % 120 === 0) process.stdout.write(`  ${o} ${i}/${n}\r`); }
      await at(p, dur - .8); await p.screenshot({ path: path.join(OUT, `poster-${o}.png`) });
      const wav = path.join(OUT, 'ad2.wav'), name = o === 'v' ? 'VocaPro-ad2-vertical.mp4' : 'VocaPro-ad2-landscape.mp4';
      const src = ['-framerate', String(RF), '-i', path.join(dir, 'f%05d.jpg')], aud = fs.existsSync(wav) ? ['-i', wav, '-c:a', 'aac', '-b:a', '192k', '-shortest'] : [];
      ff(...src, ...aud, '-vf', 'tmix=frames=2:weights=1 1,fps=30', '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', path.join(OUT, name));
      console.log(`${name} ${Math.round(fs.statSync(path.join(OUT, name)).size / 1024)}KB ${dur}s`);
      fs.rmSync(dir, { recursive: true, force: true }); await p.close();
    }
  }
  await b.close(); srv.close(); fs.rmSync(TMP, { recursive: true, force: true });
})().catch(e => { console.error(e); process.exit(1); });
