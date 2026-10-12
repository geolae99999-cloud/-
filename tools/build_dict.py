#!/usr/bin/env python3
"""gen/out_*.tsv -> dist/dict/<a-z>.json  (사용: python3 tools/build_dict.py gen dist)"""
import sys, os, glob, json, re
sys.path.insert(0, os.path.dirname(__file__))
from ipa import ipa
gen, out = sys.argv[1], sys.argv[2]
fixed = {}
for f in glob.glob(os.path.join(gen, 'in_e*.txt')):
  for l in open(f, encoding='utf-8'):
    a = l.rstrip('\n').split('\t')
    if len(a) == 2: fixed[a[0].lower()] = a
D, bad, noipa = {}, 0, []
WORD = re.compile(r"^[A-Za-z][A-Za-z' .-]{0,39}$")
for f in sorted(glob.glob(os.path.join(gen, 'out_*_p*.tsv'))):
  for l in open(f, encoding='utf-8'):
    l = l.rstrip('\n')
    if '\t' not in l and l.count('@') in (4, 5): l = l.replace('@', '\t')
    a = [x.strip() for x in l.split('\t')]
    if len(a) == 5: a.append('')
    if len(a) != 6 or not WORD.match(a[0]) or not a[1] or (not a[3] and ' ' not in a[0].strip()): bad += 1; continue
    w, m, kp, ex, exk, syn = a
    k = w.lower()
    if k in fixed: w, m = fixed[k]
    if k in D: continue
    if ' ' in w: D[k] = [w, m, '', '', ex, exk, syn]; continue
    ph = ipa(w) or {'stomachache': '/ˈstʌməkˌeɪk/', 'counterintuitive': '/ˌkaʊntərɪnˈtuɪtɪv/'}.get(k, '')
    if not ph: noipa.append(w)
    D[k] = [w, m, ph, kp, ex, exk, syn]
missing = [w for w in fixed if w not in D]
# 변화형 → 원형 연결 (앱이 규칙으로 못 찾는 불규칙 변화만): "went": "go:VBD"
def base_cands(w):
  c = []
  def add(x):
    if x and len(x) > 1 and x != w and x not in c: c.append(x)
  dbl = lambda x: x[:-1] if len(x) > 2 and x[-1] == x[-2] else ''
  if w.endswith('ies'): add(w[:-3] + 'y')
  if w.endswith('es'): add(w[:-2])
  if w.endswith('s') and not w.endswith('ss'): add(w[:-1])
  if w.endswith('ied'): add(w[:-3] + 'y')
  if w.endswith('ed'): add(w[:-2]); add(w[:-1]); add(dbl(w[:-2]))
  if w.endswith('ing'):
    add(w[:-3]); add(w[:-3] + 'e'); add(dbl(w[:-3]))
    if w.endswith('ying'): add(w[:-4] + 'ie')
  if w.endswith('ier') or w.endswith('iest'): add(re.sub(r'i(er|est)$', 'y', w))
  if w.endswith('er'): add(w[:-2]); add(w[:-1]); add(dbl(w[:-2]))
  if w.endswith('est'): add(w[:-3]); add(w[:-2]); add(dbl(w[:-3]))
  return c
alias = {}
try:
  from lemminflect import getAllInflections
  for k in list(D):
    if ' ' in k: continue
    for tag, forms in getAllInflections(k).items():
      for f in forms:
        f = f.lower()
        if f == k or f in D or f in alias or not re.fullmatch(r'[a-z]+', f): continue
        found = next((b for b in base_cands(f) if b in D), None)
        if found == k: continue
        alias[f] = f'{k}:{tag}'
except ImportError:
  print('lemminflect 없음: 변화형 연결을 건너뜀')
os.makedirs(os.path.join(out, 'dict'), exist_ok=True)
for f in glob.glob(os.path.join(out, 'dict', '*.json')): os.remove(f)
by = {}
for k, v in list(D.items()) + list(alias.items()): by.setdefault(k[0], {})[k] = v
size = 0
for c, d in sorted(by.items()):
  t = json.dumps(dict(sorted(d.items())), ensure_ascii=False, separators=(',', ':'))
  open(os.path.join(out, 'dict', c + '.json'), 'w', encoding='utf-8').write(t); size += len(t.encode())
print(f'aliases {len(alias)}'); print(f'entries {len(D)} (built-in lists {len(fixed) - len(missing)}/{len(fixed)}), bad lines {bad}, no IPA {len(noipa)}, size {size//1024}KB')
if missing: print('missing:', ' '.join(missing[:80]))
if noipa: print('no ipa:', ' '.join(noipa[:80]))
json.dump({'missing': missing, 'noipa': noipa}, open(os.path.join(gen, 'report.json'), 'w'))
