import cmudict, re
CMU = cmudict.dict()
V = {'AA':'ɑ','AE':'æ','AH':'ʌ','AO':'ɔ','AW':'aʊ','AY':'aɪ','EH':'ɛ','ER':'ɜr','EY':'eɪ','IH':'ɪ','IY':'i','OW':'oʊ','OY':'ɔɪ','UH':'ʊ','UW':'u'}
C = {'B':'b','CH':'tʃ','D':'d','DH':'ð','F':'f','G':'g','HH':'h','JH':'dʒ','K':'k','L':'l','M':'m','N':'n','NG':'ŋ','P':'p','R':'r','S':'s','SH':'ʃ','T':'t','TH':'θ','V':'v','W':'w','Y':'j','Z':'z','ZH':'ʒ'}
ONS = set('b d f g h k l m n p r s t v w j z ʃ tʃ dʒ θ ð ʒ'.split()) | set(tuple(x.split()) for x in [])
ONS2 = {('p','l'),('p','r'),('b','l'),('b','r'),('t','r'),('d','r'),('k','l'),('k','r'),('g','l'),('g','r'),('f','l'),('f','r'),('θ','r'),('ʃ','r'),('s','p'),('s','t'),('s','k'),('s','m'),('s','n'),('s','l'),('s','w'),('t','w'),('d','w'),('k','w'),('g','w'),('p','j'),('b','j'),('f','j'),('k','j'),('m','j'),('h','j'),('v','j')}
ONS3 = {('s','p','r'),('s','t','r'),('s','k','r'),('s','p','l'),('s','k','w'),('s','k','j')}
def okons(cl):
  cl = tuple(cl)
  return len(cl)==0 or (len(cl)==1 and cl[0] in ONS) or cl in ONS2 or cl in ONS3
def word_ipa(w):
  prons = CMU.get(w.lower())
  if not prons: return None
  ph = prons[0]
  segs = []  # (ipa, isVowel, stress)
  for p in ph:
    m = re.match(r'([A-Z]+)(\d)?', p); b, s = m.group(1), m.group(2)
    if b in V:
      v = V[b]
      if s == '0':
        v = {'ʌ':'ə','ɜr':'ər'}.get(v, v)
      segs.append([v, True, s])
    else: segs.append([C[b], False, None])
  nv = sum(1 for x in segs if x[1])
  out = [x[0] for x in segs]
  if nv > 1:
    for i, x in enumerate(segs):
      if x[1] and x[2] in ('1','2'):
        j = i
        while j > 0 and not segs[j-1][1] and okons([segs[k][0] for k in range(j-1, i)]): j -= 1
        out[j] = ('ˈ' if x[2]=='1' else 'ˌ') + out[j]
  return ''.join(out)
def ipa(phrase):
  parts = re.split(r"[\s-]+", phrase.strip())
  r = [word_ipa(p) for p in parts if p]
  if not r or any(x is None for x in r): return ''
  return '/' + ' '.join(r) + '/'
if __name__ == '__main__':
  for w in ['accept','water','vegetable','consistent','string','information','record','the','a','ice cream','well-known','restaurant','extraordinary','computer']: print(w, ipa(w))
