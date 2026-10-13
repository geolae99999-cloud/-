#!/usr/bin/env python3
"""중국어 사전: gen/zh/in_*.txt + out_*_p*.tsv -> public/dict/zh/
사용: python3 tools/build_zh.py gen/zh public      (pypinyin 필요: python3 -m pip install pypinyin)

- index.json      [단어, 병음, 뜻, HSK 급수] 전체 목록 (HSK 단어장, 중국어 사전 찾기)
- <0-f>.json      {단어: [단어, 뜻, 병음, 한글 발음, 예문, 예문 해석, 비슷한 단어, 예문 병음, 급수]}
                  첫 글자 코드 % 16 으로 나눠요 (앱의 dictLetter 와 같아요).
병음은 원본(HSK 목록)에서 고른 것만 쓰고, 한글 발음과 예문 병음은 여기서 규칙으로 만들어요."""
import sys, os, glob, json, re, unicodedata
from pypinyin import pinyin, Style

gen, out = sys.argv[1], os.path.join(sys.argv[2], 'dict', 'zh')
TONE = {'̄': 1, '́': 2, '̌': 3, '̀': 4}

def fix(p):
    return p.replace('u:', 'ü').replace('U:', 'Ü')

MARK = {1: '\u0304', 2: '\u0301', 3: '\u030c', 4: '\u0300'}
def retone(s):
    """성조 기호를 표준 자리에 다시 붙여요 ('Oū' -> 'Ōu')."""
    b, t = parse(s)
    cap = s[:1].isupper()
    if t in MARK:
        i = b.find('a') if 'a' in b else b.find('e') if 'e' in b else b.find('o') if 'ou' in b else max(b.rfind(c) for c in 'iouü')
        if i >= 0: b = unicodedata.normalize('NFC', b[:i + 1] + MARK[t] + b[i + 1:])
    return b[:1].upper() + b[1:] if cap else b

def parse(syl):
    """'xué' -> ('xue', 2, 'xué'),  'lǜ' -> ('lü', 4, ...)"""
    d = unicodedata.normalize('NFD', syl)
    t = 5
    for k, v in TONE.items():
        if k in d: t = v
    base = ''.join(c for c in d if c not in TONE)
    base = unicodedata.normalize('NFC', base).lower()
    return base, t

# ----- 병음 음절 나누기 (띄어 쓰지 않은 원본용) -----
INITS = ['zh', 'ch', 'sh', 'b', 'p', 'm', 'f', 'd', 't', 'n', 'l', 'g', 'k', 'h', 'j', 'q', 'x', 'r', 'z', 'c', 's', 'y', 'w', '']
FINS = ['a', 'o', 'e', 'ai', 'ei', 'ao', 'ou', 'an', 'en', 'ang', 'eng', 'ong', 'er', 'i', 'ia', 'ie', 'iao', 'iu', 'ian', 'in', 'iang', 'ing', 'iong',
        'u', 'ua', 'uo', 'uai', 'ui', 'uan', 'un', 'uang', 'ü', 'üe', 'ue', 'üan', 'ün']
SYL = {i + f for i in INITS for f in FINS} | {'ê', 'm', 'n', 'ng', 'hm', 'hng'}
def split_token(tok):
    base = parse(tok)[0]
    if len(base) > 2 and base.endswith('r') and not base.endswith('er'):
        return split_token(unicodedata.normalize('NFC', tok)[:-1]) + ['r']
    nfc = unicodedata.normalize('NFC', tok)
    if len(base) != len(nfc): return [tok]
    best = [None] * (len(base) + 1); best[0] = []
    for i in range(len(base)):
        if best[i] is None: continue
        for j in range(min(len(base), i + 6), i, -1):
            if base[i:j] in SYL and (best[j] is None or len(best[j]) > len(best[i]) + 1):
                best[j] = best[i] + [nfc[i:j]]
    return best[-1] or [tok]

def sylls(p):
    out = []
    for tok in fix(p).replace("'", ' ').split():
        out += split_token(tok)
    return out

def joined(p):
    """'diàn nǎo' -> 'diànnǎo', 'Xī ān' -> "Xī'ān" """
    ss = [retone(x) for x in sylls(p)]; r = ''
    for i, s in enumerate(ss):
        if i and s != 'r' and parse(s)[0][:1] in ('a', 'o', 'e'): r += "'"
        r += s
    return r

# ----- 한글 발음 -----
L = {c: i for i, c in enumerate('ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ')}
V = {c: i for i, c in enumerate('ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ')}
T = {'': 0, 'ㄴ': 4, 'ㄹ': 8, 'ㅇ': 21}
def hg(l, v, t=''): return chr(0xAC00 + (L[l] * 21 + V[v]) * 28 + T[t])
KI = {'b': 'ㅃ', 'p': 'ㅍ', 'm': 'ㅁ', 'f': 'ㅍ', 'd': 'ㄸ', 't': 'ㅌ', 'n': 'ㄴ', 'l': 'ㄹ', 'g': 'ㄲ', 'k': 'ㅋ', 'h': 'ㅎ',
      'j': 'ㅈ', 'q': 'ㅊ', 'x': 'ㅅ', 'zh': 'ㅈ', 'ch': 'ㅊ', 'sh': 'ㅅ', 'r': 'ㄹ', 'z': 'ㅉ', 'c': 'ㅊ', 's': 'ㅆ', '': 'ㅇ'}
KF = {'a': ['ㅏ'], 'o': ['ㅗ'], 'e': ['ㅓ'], 'ai': ['ㅏ', 'ㅣ'], 'ei': ['ㅔ', 'ㅣ'], 'ao': ['ㅏ', 'ㅗ'], 'ou': ['ㅓ', 'ㅜ'],
      'an': ['ㅏㄴ'], 'en': ['ㅓㄴ'], 'ang': ['ㅏㅇ'], 'eng': ['ㅓㅇ'], 'ong': ['ㅜㅇ'], 'er': ['ㅓㄹ'],
      'i': ['ㅣ'], 'ia': ['ㅣ', 'ㅏ'], 'ie': ['ㅣ', 'ㅔ'], 'iao': ['ㅣ', 'ㅏ', 'ㅗ'], 'iu': ['ㅣ', 'ㅜ'], 'ian': ['ㅣ', 'ㅔㄴ'], 'in': ['ㅣㄴ'],
      'iang': ['ㅣ', 'ㅏㅇ'], 'ing': ['ㅣㅇ'], 'iong': ['ㅣ', 'ㅗㅇ'],
      'u': ['ㅜ'], 'ua': ['ㅘ'], 'uo': ['ㅝ'], 'uai': ['ㅘ', 'ㅣ'], 'ui': ['ㅜ', 'ㅣ'], 'uan': ['ㅘㄴ'], 'un': ['ㅜㄴ'], 'uang': ['ㅘㅇ'],
      'ü': ['ㅟ'], 'üe': ['ㅟ', 'ㅔ'], 'üan': ['ㅟ', 'ㅔㄴ'], 'ün': ['ㅟㄴ']}
ZERO = {'yi': '이', 'ya': '야', 'ye': '예', 'yao': '야오', 'you': '여우', 'yan': '옌', 'yin': '인', 'yang': '양', 'ying': '잉', 'yong': '용',
        'yu': '위', 'yue': '위에', 'yuan': '위엔', 'yun': '윈', 'wu': '우', 'wa': '와', 'wo': '워', 'wai': '와이', 'wei': '웨이', 'wan': '완',
        'wen': '원', 'wang': '왕', 'weng': '웡', 'a': '아', 'o': '오', 'e': '어', 'ai': '아이', 'ei': '에이', 'ao': '아오', 'ou': '어우',
        'an': '안', 'en': '언', 'ang': '앙', 'eng': '엉', 'er': '얼', 'ê': '에', 'm': '음', 'n': '은', 'ng': '응', 'hm': '흠', 'hng': '흥', 'yo': '요', 'o': '오'}
def kor1(s):
    b = parse(s)[0]
    if b == 'r': return '얼'
    if b in ZERO: return ZERO[b]
    ini = next(i for i in INITS if i and b.startswith(i)) if any(i and b.startswith(i) for i in INITS) else ''
    f = b[len(ini):]
    if ini in ('y', 'w'): return ''
    if ini in ('j', 'q', 'x') and f.startswith('u'): f = 'ü' + f[1:]
    if f == 'ue': f = 'üe'
    if ini in ('zh', 'ch', 'sh', 'r', 'z', 'c', 's') and f == 'i': parts = ['ㅡ']
    elif f in KF: parts = KF[f]
    else: return ''
    r = ''
    for k, pt in enumerate(parts):
        r += hg(KI[ini] if k == 0 else 'ㅇ', pt[0], pt[1:] if len(pt) > 1 else '')
    return r
def kor(p):
    return ''.join(kor1(s) for s in sylls(p))

# ----- 예문 병음 -----
PUNC = {'，': ',', '。': '.', '？': '?', '！': '!', '、': ',', '：': ':', '；': ';', '“': '"', '”': '"', '‘': "'", '’': "'", '（': '(', '）': ')', '《': '<', '》': '>', '…': '...', '—': '-'}
def ex_py(ex, word, wpy):
    py = [x[0] for x in pinyin(ex, style=Style.TONE, errors=lambda s: list(s))]
    # pypinyin 은 한 글자씩(또는 한자 아닌 덩어리) 돌려줘요. 표제어 부분은 고른 병음으로 바꿔요.
    chars = list(ex)
    if len(py) == len(chars):
        i = ex.find(word); ws = [retone(s).lower() for s in sylls(wpy)]
        if ws and ws[-1] == 'r' and word.endswith('儿') and len(ws) == len(word): ws[-2:] = [ws[-2] + 'r', '']
        if i >= 0 and len(ws) == len(word): py[i:i + len(word)] = ws
        # 这儿, 那儿, 哪儿 처럼 儿 이 앞 글자에 붙는 말 (érhuà)
        for k in range(1, len(chars)):
            if chars[k] == '儿' and chars[k - 1] in '这那哪会点玩块边空些' and py[k] in ('ér', 'er', 'r'): py[k - 1] += 'r'; py[k] = ''
    out = ''
    for c, p in zip(chars, py) if len(py) == len(chars) else []:
        if c in PUNC: out = out.rstrip() + PUNC[c] + ' '
        elif re.match(r'[㐀-鿿]', c): out += p + ' '
        else: out += c
    return re.sub(r'\s+', ' ', out).strip() or ' '.join(py)

# ----- 읽기 -----
inputs = {}
for f in sorted(glob.glob(os.path.join(gen, 'in_*.txt'))):
    for l in open(f, encoding='utf-8'):
        a = l.rstrip('\n').split('\t')
        if len(a) == 4: inputs[a[1]] = (int(a[0]), [x.strip() for x in a[2].split(' | ')])
D, bad = {}, []
for f in sorted(glob.glob(os.path.join(gen, 'out_*_p*.tsv'))):
    for l in open(f, encoding='utf-8'):
        a = [x.strip() for x in l.rstrip('\n').split('\t')]
        if len(a) == 5: a.append('')
        if len(a) != 6 or a[0] not in inputs: bad.append(l.strip()[:60]); continue
        w, p, m, ex, exk, syn = a
        lv, opts = inputs[w]
        if p not in opts: bad.append('pinyin ' + w + ' ' + p); p = opts[0]
        if not re.search('[가-힣]', m): bad.append('meaning ' + w); continue
        if w not in ex: bad.append('example ' + w); ex = exk = ''
        syn = ', '.join(x.strip() for x in re.split('[,，、]', syn) if x.strip() and x.strip() != w)
        if w in D: continue
        D[w] = [w, m, joined(p), kor(p), ex, exk, syn, ex_py(ex, w, p) if ex else '', lv]
missing = [w for w in inputs if w not in D]
os.makedirs(out, exist_ok=True)
for f in glob.glob(os.path.join(out, '*.json')): os.remove(f)
order = sorted(D.values(), key=lambda e: (e[8], list(inputs).index(e[0])))
json.dump([[e[0], e[2], e[1], e[8]] for e in order], open(os.path.join(out, 'index.json'), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
shards = {}
for e in order: shards.setdefault('%x' % (ord(e[0][0]) % 16), {})[e[0]] = e
for k, v in shards.items():
    json.dump(v, open(os.path.join(out, k + '.json'), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
noko = [e[0] for e in D.values() if not e[3]]
print(f'중국어 사전 {len(D)}개 (입력 {len(inputs)}개), 빠짐 {len(missing)}, 문제 {len(bad)}, 한글 발음 없음 {len(noko)}')
for x in (bad + ['missing ' + w for w in missing] + ['noko ' + w for w in noko])[:40]: print('  ', x)
