#!/usr/bin/env python3
"""VocaPro 빌드: 마스터 VocaPro.html -> 분할본(public/)  사용: python3 tools/build.py src/VocaPro.html public"""
import re, sys, os, hashlib, json
src, out = sys.argv[1], sys.argv[2]
LIMIT = 30000
s = open(src, encoding='utf-8').read()
os.makedirs(out, exist_ok=True)
for f in os.listdir(out):
    if re.match(r'app\d+\.js$', f): os.remove(os.path.join(out, f))
# 아이콘 이름 검사: IC.xxx 가 IC 표에 없으면 화면에 기본 아이콘이 떠요. 빌드에서 미리 잡아요.
_ic = re.search(r'const IC = new Proxy\(\{\n(.*?)\n  \}, \{', s, re.S)
assert _ic, 'IC 표를 찾지 못했어요'
_keys = set(re.findall(r'^    (\w+):', _ic.group(1), re.M))
_bad = sorted(set(re.findall(r'\bIC\.(\w+)', s)) - _keys)
assert not _bad, '없는 아이콘 이름: ' + ', '.join(_bad)
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
# 보안 정책(CSP): src/csp.txt 를 index.html 에 넣어요. 인라인 스크립트와 onclick="..." 는 막혀요.
csp_path = os.path.join(os.path.dirname(os.path.abspath(src)), 'csp.txt')
if os.path.exists(csp_path):
    csp = ' '.join(l.strip() for l in open(csp_path, encoding='utf-8') if l.strip())
    assert '"' not in csp
    html = html.replace('<meta charset="UTF-8">', '<meta charset="UTF-8">\n  <meta http-equiv="Content-Security-Policy" content="' + csp + '">', 1)
    assert 'Content-Security-Policy' in html
    for n in ['index.html'] + names:
        t = html if n == 'index.html' else open(os.path.join(out, n), encoding='utf-8').read()
        m = re.search(r'\son(click|change|input|keydown|keyup|submit|load|error|focus|blur)=', t)
        assert not m, n + ' 에 인라인 이벤트(' + m.group(0).strip() + ')가 있어요. data-act / data-change / data-input / data-enter 를 쓰세요.'
w('index.html', html)
# 따로 불러오는 라이브러리(src/vendor: lame.min.js, fflate.min.js)는 그대로 복사해요. 쓸 때만 같은 주소에서 불러오고(CSP script-src 'self'),
# sw.js 가 처음 불러올 때 캐시에 넣어요(같은 주소 GET). 모두가 받지 않게 CORE(설치 때 미리 받기)에는 넣지 않아요.
vdir = os.path.join(os.path.dirname(os.path.abspath(src)), 'vendor')
for f in sorted(os.listdir(vdir)) if os.path.isdir(vdir) else []:
    assert re.match(r'[\w.-]+\.js$', f), f
    w(f, open(os.path.join(vdir, f), encoding='utf-8').read())
# 기기 음성 AI(src/asr): 엔진 · ONNX Runtime(wasm) · 모델 조각을 그대로 public/asr 로 복사해요. 쓸 때만 받아요(CORE 에 넣지 않음)
import shutil
adir = os.path.join(os.path.dirname(os.path.abspath(src)), 'asr')
if os.path.isdir(adir):
    shutil.rmtree(os.path.join(out, 'asr'), ignore_errors=True)
    shutil.copytree(adir, os.path.join(out, 'asr'))
# 기기 AI(src/llm, Qwen): 워커(transformers.js 묶음) · ONNX Runtime(wasm). 모델은 쓸 때 huggingface.co 에서 받아요. CORE 에 넣지 않아요
ldir = os.path.join(os.path.dirname(os.path.abspath(src)), 'llm')
if os.path.isdir(ldir):
    shutil.rmtree(os.path.join(out, 'llm'), ignore_errors=True)
    shutil.copytree(ldir, os.path.join(out, 'llm'))
# 글꼴(src/font, Pretendard · SIL OFL 1.1): 외부 CDN 대신 같은 주소에서 받아요
fdir = os.path.join(os.path.dirname(os.path.abspath(src)), 'font')
if os.path.isdir(fdir):
    shutil.rmtree(os.path.join(out, 'font'), ignore_errors=True)
    shutil.copytree(fdir, os.path.join(out, 'font'))
core =['./', 'style.css', 'config.js', 'cloud.js'] + names + ['manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png']
ver = hashlib.sha1(''.join(open(os.path.join(out, f), encoding='utf-8').read() for f in ['index.html', 'style.css', 'cloud.js'] + names).encode()).hexdigest()[:10]
sw = open(os.path.join(os.path.dirname(__file__), 'sw.template.js'), encoding='utf-8').read()
w('sw.js', sw.replace('__VERSION__', ver).replace('__CORE__', json.dumps(core)))
for f in sorted(os.listdir(out)):
    print(f'{f:22s} {os.path.getsize(os.path.join(out, f)):>7,d} B')
