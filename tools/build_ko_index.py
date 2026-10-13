#!/usr/bin/env python3
"""한글 뜻으로 영어 단어 찾기용 목록: public/dict/<a-z>.json -> public/dict/ko.json
[[단어, 뜻, 순위], ...]  순위 0 = 앱 학년별 단어장에 있는 단어(자주 쓰는 말), 1 = 그 밖의 단어, 2 = 숙어
(사용: python3 tools/build_ko_index.py src/VocaPro.html public)"""
import sys, os, glob, json, re
src, out = sys.argv[1], sys.argv[2]
common = set()
text = open(src, encoding='utf-8').read()
# 기본 단어 = 학년별 추천 + 기초·중학교·고등학교·수능·생활 단어장 (토익·토플·숙어는 빼요)
chunks = [m.group(1) for m in re.finditer(r'GW_PACK\.(?:basic|mid|high|csat|life) = "([^"]*)"', text)]
chunks += re.findall(r'\b[ehm][1-6]: ?"([^"]*)"', text)
for c in chunks:
  for it in c.split('|'):
    common.add(it.split(':')[0].strip().lower())
rows = []
for f in sorted(glob.glob(os.path.join(out, 'dict', '[a-z].json'))):
  for k, v in json.load(open(f, encoding='utf-8')).items():
    if not isinstance(v, list) or not v[1]: continue
    m = re.sub(r'\s+', ' ', v[1]).strip()
    if len(m) > 60: m = m[:60].rsplit(',', 1)[0]
    rows.append([v[0], m, 2 if ' ' in k else 0 if k in common else 1])
rows.sort(key=lambda r: (r[2], len(r[0]), r[0].lower()))
t = json.dumps(rows, ensure_ascii=False, separators=(',', ':'))
open(os.path.join(out, 'dict', 'ko.json'), 'w', encoding='utf-8').write(t)
print(f'ko index {len(rows)} rows (common {sum(r[2] == 0 for r in rows)}), {len(t.encode()) // 1024}KB')
