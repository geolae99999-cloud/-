// 광고 영상과 프로필·배너 이미지를 만들어 public/media/ 에 저장해요.
// 사용: FONT=/경로/PretendardVariable.woff2 FONT_SC=/경로/@fontsource/noto-sans-sc node tools/media/render.js [all|ad|banners|preview]
//  - Playwright(크로뮴)와 ffmpeg 가 필요해요. FONT, FONT_SC 가 없으면 jsdelivr 에서 받아 써요.
//    (npm pack pretendard@1.3.9 / npm pack @fontsource/noto-sans-sc@5.0.19 로 받아 압축을 풀어도 돼요.)
//  - 광고는 1920x1080, 60fps 로 찍어 두 장씩 섞어(모션 블러) 30fps 로 만들어요.
//    ad-1080.mp4(공유용 1080p), ad.mp4 / ad.webm(사이트용 720p), ad-poster.jpg
//  - preview: 몇 장면만 찍어 tools/media/preview.png 한 장으로 모아요(빠른 확인용).
//  - 마스코트는 public/ 의 앱에서 MASCOT() 를 불러 그대로 써요(디자인을 한 곳에서만 고치도록).
const PW = process.env.PLAYWRIGHT || '/opt/node22/lib/node_modules/playwright';
const { chromium } = require(PW);
const http = require('http'), fs = require('fs'), path = require('path'), os = require('os'), { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..', '..'), PUB = path.join(ROOT, 'public'), OUT = path.join(PUB, 'media');
const FONT = process.env.FONT ? 'file://' + path.resolve(process.env.FONT) : 'https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/woff2/PretendardVariable.woff2';
const SC_DIR = process.env.FONT_SC ? path.resolve(process.env.FONT_SC) : '';
const FONT_SC = SC_DIR
  ? fs.readFileSync(path.join(SC_DIR, '800.css'), 'utf8').replace(/url\(\.\/files\//g, `url(file://${SC_DIR}/files/`).replace(/@font-face\s*{/g, '@font-face{font-display:block;')
  : "@import url('https://cdn.jsdelivr.net/npm/@fontsource/noto-sans-sc@5.0.19/800.css');";
const FPS = 30, ONLY = process.argv[2] || 'all';
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'vocamedia-'));
fs.mkdirSync(OUT, { recursive: true });

const srv = http.createServer((q, r) => {
  let f = path.join(PUB, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html';
  if (!f.startsWith(PUB)) { r.writeHead(403); return r.end(); }
  fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': f.endsWith('.js') ? 'text/javascript' : f.endsWith('.css') ? 'text/css' : 'text/html; charset=utf-8' }); r.end(d); });
}).listen(0);

const fill = (file, m) => {
  const html = fs.readFileSync(path.join(__dirname, file), 'utf8').replace(/__FONT__/g, FONT).replace('__FONT_SC__', FONT_SC)
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

  if (ONLY === 'preview') {
    const q = await b.newPage({ viewport: { width: 1920, height: 1080 } });
    await q.goto(fill('ad.html', m) + '#render'); await q.evaluate(() => document.fonts.ready);
    const ts = (process.env.AT || '1.2,2.2,2.8,4,5.2,6.4,7.3,8.4,9.3,10.5,11.4,11.9,13.2,14.6,15.3,16.0,16.6,17.4,18.0,19.0,20.0,20.8,21.6,22.5').split(',').map(Number);
    const files = [];
    for (const t of ts) { await q.evaluate(x => window.seek(x), t); await q.evaluate(() => document.fonts.ready); const f = path.join(TMP, `p${files.length}.png`); await q.screenshot({ path: f }); files.push(f); }
    const cols = 4, rows = Math.ceil(files.length / cols);
    const inp = files.flatMap(f => ['-i', f]);
    const fc = files.map((_, i) => `[${i}]scale=480:270,drawtext=text='${ts[i]}s':x=8:y=8:fontsize=22:fontcolor=white:box=1:boxcolor=black@0.5[v${i}]`).join(';') + ';' +
      files.map((_, i) => `[v${i}]`).join('') + `xstack=inputs=${files.length}:layout=` + files.map((_, i) => `${(i % cols) * 480}_${Math.floor(i / cols) * 270}`).join('|');
    ff(...inp, '-filter_complex', fc, path.join(__dirname, 'preview.png'));
    console.log('preview.png', rows + ' rows');
    await q.close();
  }

  if (ONLY === 'all' || ONLY === 'ad') {
    const RF = 60;
    const q = await b.newPage({ viewport: { width: 1920, height: 1080 } });
    await q.goto(fill('ad.html', m) + '#render'); await q.evaluate(() => document.fonts.ready);
    const dur = await q.evaluate(() => window.DUR), n = Math.round(dur * RF), dir = path.join(TMP, 'frames');
    fs.mkdirSync(dir, { recursive: true });
    await q.evaluate(() => window.seek(16.5)); await q.evaluate(() => document.fonts.ready);
    for (let i = 0; i < n; i++) {
      await q.evaluate(t => window.seek(t), i / RF);
      await q.screenshot({ path: path.join(dir, `f${String(i).padStart(5, '0')}.png`) });
      if (i % 120 === 0) process.stdout.write(`  ${i}/${n}\r`);
    }
    await q.evaluate(t => window.seek(t), dur - 0.6);
    await q.screenshot({ path: path.join(TMP, 'poster.png') });
    ff('-i', path.join(TMP, 'poster.png'), '-vf', 'scale=1280:720:flags=lanczos', '-q:v', '3', path.join(OUT, 'ad-poster.jpg'));
    // 60fps 두 장을 섞어 30fps (빠른 움직임에 자연스러운 잔상)
    const src = ['-framerate', String(RF), '-i', path.join(dir, 'f%05d.png')];
    const blur = 'tmix=frames=2:weights=1 1,fps=30';
    ff(...src, '-vf', blur, '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', path.join(OUT, 'ad-1080.mp4'));
    ff(...src, '-vf', blur + ',scale=1280:720:flags=lanczos', '-c:v', 'libx264', '-preset', 'slow', '-crf', '23', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', path.join(OUT, 'ad.mp4'));
    // 크로뮴 계열 중 H.264가 없는 브라우저용 WebM(VP9). 페이지는 webm, mp4 순서로 고르게 해요.
    ff(...src, '-vf', blur + ',scale=1280:720:flags=lanczos', '-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', '36', '-row-mt', '1', '-deadline', 'good', '-cpu-used', '2', '-pix_fmt', 'yuv420p', path.join(OUT, 'ad.webm'));
    for (const f of ['ad-1080.mp4', 'ad.mp4', 'ad.webm', 'ad-poster.jpg']) console.log(f.padEnd(18), kb(path.join(OUT, f)));
    console.log(`${dur}s, ${n} frames @${RF} -> 30fps`);
  }
  await b.close(); srv.close(); fs.rmSync(TMP, { recursive: true, force: true });
})().catch(e => { console.error(e); process.exit(1); });
