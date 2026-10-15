#!/usr/bin/env python3
"""영어 말하기 문장 (난이도 1 하 · 2 중 · 3 상 · 4 최상): src/data/en-speak.txt -> public/dict/en-speak.json
사용: python3 tools/build_en_speak.py src/data/en-speak.txt public

en-speak.json = {"1": [[단어, 뜻, 문장, 해석], ...], "2": [...], "3": [...], "4": [...]}
문장마다 핵심 단어가 들어 있는지, 내장 사전에 있는 단어인지, 겹치지 않는지 확인하고, 틀리면 멈춰요."""
import sys, os, json, re

src, pub = sys.argv[1], sys.argv[2]
out = os.path.join(pub, 'dict', 'en-speak.json')
dicts, data, sec, bad, seen = {}, {'1': [], '2': [], '3': [], '4': []}, None, [], set()
def indict(w):
    c = w[0].lower()
    if c not in dicts:
        p = os.path.join(pub, 'dict', c + '.json'); dicts[c] = json.load(open(p, encoding='utf-8')) if os.path.exists(p) else {}
    return w.lower() in dicts[c]
for n, line in enumerate(open(src, encoding='utf-8'), 1):
    line = line.strip()
    if not line or line.startswith('#'): continue
    m = re.fullmatch(r'\[([1-4])\]', line)
    if m: sec = m.group(1); continue
    f = [x.strip() for x in line.split('|')]
    if sec is None or len(f) != 4 or not all(f): bad.append((n, '칸 수')); continue
    w, mean, s, ko = f
    if w.lower() not in s.lower(): bad.append((n, '문장에 단어 없음'))
    if not indict(w): bad.append((n, '내장 사전에 없는 단어'))
    if w.lower() in seen or s in seen: bad.append((n, '겹침'))
    seen.add(w.lower()); seen.add(s)
    if not re.fullmatch(r"[A-Za-z0-9 ,.'?!;:\-]+", s): bad.append((n, '문장에 이상한 글자'))
    data[sec].append([w, mean, s, ko])
if bad:
    for b in bad: print('줄 %d: %s' % b)
    sys.exit(1)
json.dump(data, open(out, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
print({k: len(v) for k, v in data.items()}, '->', out)
