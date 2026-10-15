#!/usr/bin/env python3
"""중국어 말하기 문장 (난이도 1 하 · 2 중 · 3 상 · 4 최상): src/data/zh-speak.txt -> public/dict/zh/speak.json
사용: python3 tools/build_zh_speak.py src/data/zh-speak.txt public

speak.json = {"1": [[단어, 단어 병음, 뜻, 문장, 문장 병음, 해석], ...], "2": [...], "3": [...], "4": [...]}
문장마다 핵심 단어가 들어 있는지, 문장 병음의 음절 수가 한자 수와 같은지 (얼화 포함) 확인하고, 틀리면 멈춰요."""
import sys, os, json, re, unicodedata
from functools import lru_cache
from pypinyin import pinyin, Style

# 병음 음절 목록 (성조 없이). 문장 병음을 음절로 나눠 한자 수와 맞는지 봐요.
SYL = {x for c in range(0x4e00, 0xa000) for r in pinyin(chr(c), style=Style.NORMAL, heteronym=True, errors='ignore') for x in r if x.isalpha()}
SYL |= {x + 'r' for x in list(SYL)}  # 얼화 (yìdiǎnr)

def counts(py):
    """병음을 음절로 나누는 모든 방법의 음절 수 (단어 사이 띄어쓰기 · 문장 부호 · ' 는 경계)"""
    plain = unicodedata.normalize('NFD', py.lower()).replace('u\u0308', 'v')
    plain = re.sub(r'[\u0300-\u036f]', '', plain).replace('ü', 'v')
    total = {0}
    for chunk in re.findall(r'[a-zv]+', plain):
        @lru_cache(None)
        def go(i):
            if i == len(chunk): return frozenset({0})
            r = set()
            for j in range(i + 1, min(len(chunk), i + 7) + 1):
                if chunk[i:j] in SYL: r |= {k + 1 for k in go(j)}
            return frozenset(r)
        total = {a + b for a in total for b in go(0)}
        if not total: return set()
    return total

src, out = sys.argv[1], os.path.join(sys.argv[2], 'dict', 'zh', 'speak.json')
HAN = re.compile(r'[㐀-鿿]')
data, sec, bad = {'1': [], '2': [], '3': [], '4': []}, None, []
for n, line in enumerate(open(src, encoding='utf-8'), 1):
    line = line.strip()
    if not line or line.startswith('#'): continue
    m = re.fullmatch(r'\[([1-4])\]', line)
    if m: sec = m.group(1); continue
    f = [x.strip() for x in line.split('|')]
    if sec is None or len(f) != 6 or not all(f): bad.append((n, '칸 수')); continue
    w, wp, mean, s, sp, ko = f
    if w not in s: bad.append((n, '문장에 단어 없음'))
    han, er = len(HAN.findall(s)), s.count('儿')
    if han not in counts(sp) and han - er not in counts(sp): bad.append((n, f'병음 음절 수가 한자 {han}자와 달라요'))
    data[sec].append([w, wp, mean, s, sp, ko])
if bad:
    for b in bad: print('줄 %d: %s' % b)
    sys.exit(1)
os.makedirs(os.path.dirname(out), exist_ok=True)
json.dump(data, open(out, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
print({k: len(v) for k, v in data.items()}, '->', out)
