#!/usr/bin/env python3
"""VocaPro 빌드: 마스터 VocaPro.html -> 분할본(dist/)"""
import re, sys, os, hashlib, json
src, out = sys.argv[1], sys.argv[2]
LIMIT = 30000
s = open(src, encoding='utf-8').read()
os.makedirs(out, exist_ok=True)
for f in os.listdir(out):
    if re.match(r'app\d+\.js$', f): os.remove(os.path.join(out, f))
style = re.search(r'\n  <style>\n(.*?)\n  </style>\n', s, re.S)
scripts = list(re.finditer(r'\n  <script>\n(.*?)\n\s*</script>', s, re.S))
assert style and len(scripts) == 3, (bool(style), len(scripts))
w = lambda n, t: open(os.path.join(out, n), 'w', encoding='utf-8').write(t)
w('style.css', style.group(1) + '\n')
w('config.js', scripts[0].group(1).strip('\n') + '\n')
w('cloud.js', scripts[1].group(1).strip('\n') + '\n')
app = scripts[2].group(1)
banner = '\n  /* ========================================================='
parts = app.split(banner)
secs = [parts[0]] + [banner + p for p in parts[1:]]
secs = [x for x in secs if x.strip()]
chunks, cur = [], ''
for sec in secs:
    if cur and len((cur + sec).encode('utf-8')) > LIMIT:
        chunks.append(cur); cur = ''
    cur += sec
if cur: chunks.append(cur)
names = []
for i, c in enumerate(chunks, 1):
    n = f'app{i}.js'; names.append(n); w(n, c.lstrip('\n') + '\n')
tags = '  <script src="config.js"></script>\n  <script src="cloud.js"></script>\n' + ''.join(f'  <script src="{n}"></script>\n' for n in names)
html = s[:style.start()] + '\n  <link rel="stylesheet" href="style.css">\n' + s[style.end():]
scripts = list(re.finditer(r'\n  <script>\n(.*?)\n\s*</script>', html, re.S))
html = html[:scripts[0].start()] + '\n' + tags.rstrip('\n') + html[scripts[-1].end():]
w('index.html', html)
core = ['./', 'index.html', 'style.css', 'config.js', 'cloud.js'] + names + ['manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png']
ver = hashlib.sha1(''.join(open(os.path.join(out, f), encoding='utf-8').read() for f in ['index.html', 'style.css', 'cloud.js'] + names).encode()).hexdigest()[:10]
sw = open(os.path.join(os.path.dirname(__file__), 'sw.template.js'), encoding='utf-8').read()
w('sw.js', sw.replace('__VERSION__', ver).replace('__CORE__', json.dumps(core)))
for f in sorted(os.listdir(out)):
    print(f'{f:22s} {os.path.getsize(os.path.join(out, f)):>7,d} B')
