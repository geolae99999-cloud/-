// 광고 영상과 프로필·배너 이미지를 만들어 public/media/ 에 저장해요.
// 사용: FONT=/경로/PretendardVariable.woff2 node tools/media/render.js
//  - Playwright(크로뮴)와 ffmpeg 가 필요해요. FONT 가 없으면 jsdelivr 의 Pretendard 를 받아 써요.
//  - 마스코트는 public/ 의 앱에서 MASCOT() 를 불러 그대로 써요(디자인을 한 곳에서만 고치도록).
const PW = process.env.PLAYWRIGHT || '/opt/node22/lib/node_modules/playwright';
const { chromium } = require(PW);
const http = require('http'), fs = require('fs'), path = require('path'), os = require('os'), { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..', '..'), PUB = path.join(ROOT, 'public'), OUT = path.join(PUB, 'media');
const FONT = process.env.FONT ? 'file://' + path.resolve(process.env.FONT) : 'https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/woff2/PretendardVariable.woff2';
const FPS = 30, ONLY = process.argv[2] || 'all';
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'vocamedia-'));
fs.mkdirSync(OUT, { recursive: true });

const srv = http.createServer((q, r) => {
  let f = path.join(PUB, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html';
  if (!f.startsWith(PUB)) { r.writeHead(403); return r.end(); }
  fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': f.endsWith('.js') ? 'text/javascript' : f.endsWith('.css') ? 'text/css' : 'text/html; charset=utf-8' }); r.end(d); });
}).listen(0);

const fill = (file, m) => {
  const html = fs.readFileSync(path.join(__dirname, file), 'utf8').replace(/__FONT__/g, FONT)
    .replace(/__MASCOT_(\w+)__/g, (_, k) => m[k.toLowerCase()]);
  const p = path.join(TMP, file); fs.writeFileSync(p, html); return 'file://' + p;
};
const ff = (...a) => execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...a]);
const kb = f => Math.round(fs.statSync(f).size / 1024) + 'KB';

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  await p.route('https://*.supabase.co/**', r => r.abort());
  await p.goto(`http://localhost:${srv.address().port}/`);
  await p.waitForFunction(() => typeof MASCOT === 'function');
  const m = await p.evaluate(() => Object.fromEntries(['happy', 'cheer', 'think', 'sleep'].map(k => [k, MASCOT(k)])));
  await p.close();

  if (ONLY === 'all' || ONLY === 'banners') {
    const q = await b.newPage({ viewport: { width: 1600, height: 1200 } });
    await q.goto(fill('banners.html', m)); await q.evaluate(() => document.fonts.ready);
    for (const id of ['profile', 'og', 'wide']) {
      const png = path.join(TMP, id + '.png');
      await q.locator('#' + id).screenshot({ path: png });
      if (id === 'profile') {
        ff('-i', png, '-vf', 'scale=512:512:flags=lanczos', path.join(OUT, 'profile.png'));
        ff('-i', png, path.join(OUT, 'profile-1024.png'));
      } else ff('-i', png, '-q:v', '3', path.join(OUT, id + '.jpg'));
    }
    await q.close();
    for (const f of ['profile.png', 'profile-1024.png', 'og.jpg', 'wide.jpg']) console.log(f.padEnd(18), kb(path.join(OUT, f)));
  }

  if (ONLY === 'all' || ONLY === 'ad') {
    const q = await b.newPage({ viewport: { width: 1280, height: 720 } });
    await q.goto(fill('ad.html', m) + '#render'); await q.evaluate(() => document.fonts.ready);
    const dur = await q.evaluate(() => window.DUR), n = Math.round(dur * FPS), dir = path.join(TMP, 'frames');
    fs.mkdirSync(dir, { recursive: true });
    for (let i = 0; i < n; i++) {
      await q.evaluate(t => window.seek(t), i / FPS);
      await q.screenshot({ path: path.join(dir, `f${String(i).padStart(4, '0')}.png`) });
    }
    await q.evaluate(t => window.seek(t), 14.6);
    await q.screenshot({ path: path.join(TMP, 'poster.png') });
    ff('-i', path.join(TMP, 'poster.png'), '-q:v', '4', path.join(OUT, 'ad-poster.jpg'));
    ff('-framerate', String(FPS), '-i', path.join(dir, 'f%04d.png'), '-c:v', 'libx264', '-preset', 'slow', '-crf', '26', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', path.join(OUT, 'ad.mp4'));
    // 크로뮴 계열 중 H.264가 없는 브라우저용 WebM(VP9). 페이지는 webm, mp4 순서로 고르게 해요.
    ff('-framerate', String(FPS), '-i', path.join(dir, 'f%04d.png'), '-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', '40', '-row-mt', '1', '-deadline', 'good', '-cpu-used', '2', '-pix_fmt', 'yuv420p', path.join(OUT, 'ad.webm'));
    console.log('ad.mp4'.padEnd(18), kb(path.join(OUT, 'ad.mp4')), `${dur}s ${n} frames`);
    console.log('ad.webm'.padEnd(18), kb(path.join(OUT, 'ad.webm')));
    console.log('ad-poster.jpg'.padEnd(18), kb(path.join(OUT, 'ad-poster.jpg')));
  }
  await b.close(); srv.close(); fs.rmSync(TMP, { recursive: true, force: true });
})().catch(e => { console.error(e); process.exit(1); });
