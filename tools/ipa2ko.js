// 발음기호(IPA) -> 한글 발음. AI가 한글 발음을 안 주거나 엉터리로 줄 때 앱이 직접 만들어요.
// 외래어 표기법을 단순하게 따른 근사치예요(예: /ˌpɜːrsəˈvɪər/ -> 퍼서비어, /kæt/ -> 캣, /bʊk/ -> 북).
// 앱(src/VocaPro.html)에 같은 코드가 들어가 있고, 이 파일은 시험(node tools/ipa2ko.js)과 비교용이에요.
function ipaToKo(ipa) {
  const L = { 'ㄱ': 0, 'ㄲ': 1, 'ㄴ': 2, 'ㄷ': 3, 'ㄸ': 4, 'ㄹ': 5, 'ㅁ': 6, 'ㅂ': 7, 'ㅃ': 8, 'ㅅ': 9, 'ㅆ': 10, 'ㅇ': 11, 'ㅈ': 12, 'ㅉ': 13, 'ㅊ': 14, 'ㅋ': 15, 'ㅌ': 16, 'ㅍ': 17, 'ㅎ': 18 };
  const VV = { 'ㅏ': 0, 'ㅐ': 1, 'ㅑ': 2, 'ㅒ': 3, 'ㅓ': 4, 'ㅔ': 5, 'ㅕ': 6, 'ㅖ': 7, 'ㅗ': 8, 'ㅘ': 9, 'ㅙ': 10, 'ㅚ': 11, 'ㅛ': 12, 'ㅜ': 13, 'ㅝ': 14, 'ㅞ': 15, 'ㅟ': 16, 'ㅠ': 17, 'ㅡ': 18, 'ㅢ': 19, 'ㅣ': 20 };
  const T = { '': 0, 'ㄱ': 1, 'ㄴ': 4, 'ㄹ': 8, 'ㅁ': 16, 'ㅂ': 17, 'ㅅ': 19, 'ㅇ': 21 };
  const syl = (l, v, t) => String.fromCharCode(0xAC00 + (L[l] * 21 + VV[v]) * 28 + T[t || '']);
  // 모음 소리(긴 것부터 맞춰요) -> 한글 모음 줄(두 글자면 두 음절)
  const VOW = [['aɪə', 'ㅏㅣㅓ'], ['aʊə', 'ㅏㅜㅓ'], ['eɪ', 'ㅔㅣ'], ['aɪ', 'ㅏㅣ'], ['aʊ', 'ㅏㅜ'], ['ɔɪ', 'ㅗㅣ'], ['oʊ', 'ㅗ'], ['əʊ', 'ㅗ'], ['ɪə', 'ㅣㅓ'], ['eə', 'ㅔㅓ'], ['ɛə', 'ㅔㅓ'], ['ʊə', 'ㅜㅓ'],
    ['iː', 'ㅣ'], ['uː', 'ㅜ'], ['ɑː', 'ㅏ'], ['ɔː', 'ㅗ'], ['ɜː', 'ㅓ'], ['i', 'ㅣ'], ['ɪ', 'ㅣ'], ['e', 'ㅔ'], ['ɛ', 'ㅔ'], ['æ', 'ㅐ'], ['ɑ', 'ㅏ'], ['a', 'ㅏ'], ['ɒ', 'ㅗ'], ['ɔ', 'ㅗ'], ['o', 'ㅗ'],
    ['ʊ', 'ㅜ'], ['u', 'ㅜ'], ['ʌ', 'ㅓ'], ['ə', 'ㅓ'], ['ɜ', 'ㅓ'], ['ɝ', 'ㅓ'], ['ɚ', 'ㅓ'], ['ɐ', 'ㅓ'], ['ᵻ', 'ㅣ'], ['ɨ', 'ㅣ'], ['y', 'ㅣ']];
  const CON = [['tʃ', 'ch'], ['dʒ', 'j'], ['ʧ', 'ch'], ['ʤ', 'j'], ['p', 'p'], ['b', 'b'], ['t', 't'], ['d', 'd'], ['k', 'k'], ['g', 'g'], ['ɡ', 'g'], ['f', 'f'], ['v', 'v'], ['θ', 'th'], ['ð', 'dh'], ['s', 's'], ['z', 'z'],
    ['ʃ', 'sh'], ['ʒ', 'zh'], ['h', 'h'], ['m', 'm'], ['n', 'n'], ['ŋ', 'ng'], ['l', 'l'], ['ɫ', 'l'], ['r', 'r'], ['ɹ', 'r'], ['ɾ', 'd'], ['w', 'w'], ['j', 'y'], ['x', 'h'], ['ʔ', '']];
  // 초성 자음
  const ON = { p: 'ㅍ', b: 'ㅂ', t: 'ㅌ', d: 'ㄷ', k: 'ㅋ', g: 'ㄱ', f: 'ㅍ', v: 'ㅂ', th: 'ㅅ', dh: 'ㄷ', s: 'ㅅ', z: 'ㅈ', sh: 'ㅅ', zh: 'ㅈ', ch: 'ㅊ', j: 'ㅈ', h: 'ㅎ', m: 'ㅁ', n: 'ㄴ', l: 'ㄹ', r: 'ㄹ', ng: 'ㅇ' };
  // 받침으로 못 쓰는 자음은 '으'를 붙인 음절로(브, 드, 스 ...). sh, ch, j, zh 는 '시, 치, 지, 지'
  const SOLO = { p: '프', b: '브', t: '트', d: '드', k: '크', g: '그', f: '프', v: '브', th: '스', dh: '드', s: '스', z: '즈', sh: '시', zh: '지', ch: '치', j: '지', h: '흐', r: '', l: '', m: '', n: '', ng: '' };
  const words = String(ipa || '').replace(/[\/\[\]ˈˌ'`.‿͡()]/g, '').replace(/ː/g, 'ː').toLowerCase().split(/[\s,]+/).filter(Boolean);
  const out = [];
  for (const w of words) {
    // 1) 소리 단위로 나누기
    const seg = []; let i = 0;
    while (i < w.length) {
      let hit = null;
      for (const [k, v] of VOW) if (w.startsWith(k, i)) { hit = { v, len: k.length }; break; }
      if (hit) { const src = w.substr(i, hit.len); i += hit.len; const long = w[i] === 'ː'; if (long) i++; seg.push({ v: hit.v, src, short: !long && /^([ɪɛæʌʊəɒ]|aʊ)$/.test(src) }); continue; }
      for (const [k, c] of CON) if (w.startsWith(k, i)) { hit = { c, len: k.length }; break; }
      if (hit) { if (hit.c) seg.push({ c: hit.c }); i += hit.len; continue; }
      i++; // 모르는 기호는 건너뛰어요
    }
    // 2) 모음 뒤 r(퍼서비어의 'r')은 소리 내지 않아요(모음 앞 r만 ㄹ)
    const s2 = [];
    seg.forEach((x, k) => {
      if (x.c === 'r' && k > 0 && seg[k - 1].v && !(seg[k + 1] && seg[k + 1].v)) {
        const pv = seg[k - 1];
        if (/^(ɪ|ɛ|e|ʊ|aɪ|aʊ|i|u)$/.test(pv.src) && !/ㅓ$/.test(pv.v)) s2[s2.length - 1] = { ...pv, v: pv.v + 'ㅓ', short: false };
        else s2[s2.length - 1] = { ...pv, short: false };
        return;
      }
      s2.push(x);
    });
    // 3) 음절 만들기
    let res = ''; let k = 0;
    const lastIdx = () => res.length - 1;
    const addCoda = t => { const ch = res.charCodeAt(lastIdx()) - 0xAC00; if (ch < 0 || ch % 28) return false; res = res.slice(0, -1) + String.fromCharCode(0xAC00 + ch + T[t]); return true; };
    const prevShort = k0 => k0 > 0 && s2[k0 - 1].v && s2[k0 - 1].short;
    const vowelSyl = (on, vs, glide) => {
      // vs: 한글 모음 줄. 첫 모음에 초성, 나머지는 'ㅇ'
      let v0 = vs[0];
      if (glide === 'w') v0 = { 'ㅏ': 'ㅘ', 'ㅐ': 'ㅙ', 'ㅓ': 'ㅝ', 'ㅔ': 'ㅞ', 'ㅣ': 'ㅟ', 'ㅗ': 'ㅝ', 'ㅜ': 'ㅜ' }[v0] || v0;
      if (glide === 'y') v0 = { 'ㅏ': 'ㅑ', 'ㅐ': 'ㅒ', 'ㅓ': 'ㅕ', 'ㅔ': 'ㅖ', 'ㅗ': 'ㅛ', 'ㅜ': 'ㅠ', 'ㅣ': 'ㅣ' }[v0] || v0;
      res += syl(on || 'ㅇ', v0);
      for (let q = 1; q < vs.length; q++) res += syl('ㅇ', vs[q]);
    };
    while (k < s2.length) {
      const x = s2[k], nx = s2[k + 1], nn = s2[k + 2];
      if (x.v) { vowelSyl('ㅇ', x.v); k++; continue; }
      const c = x.c;
      if (c === 'w' || c === 'y') {
        if (nx && nx.v) { vowelSyl('ㅇ', nx.v, c); k += 2; } else { res += c === 'w' ? '우' : '이'; k++; }
        continue;
      }
      // 자음 + (w|y) + 모음: 퀸(kwin), 과, 화, 큐(kju). 그 밖의 자음 + w 는 '스워'처럼 나눠요
      if (nx && (nx.c === 'y' || (nx.c === 'w' && ['k', 'g', 'h'].includes(c))) && nn && nn.v) {
        if (c === 'l' && res && addCoda('ㄹ')) {}
        vowelSyl(ON[c] || 'ㅇ', nn.v, nx.c); k += 3; continue;
      }
      // 자음 + l + 모음: 블러, 클래스, 플레이 (앞 음절에 ㄹ 받침)
      if (nx && nx.c === 'l' && nn && nn.v && (c === 'p' || c === 'k') && prevShort(k) && res && addCoda({ p: 'ㅂ', k: 'ㄱ' }[c])) { k++; continue; } // 블랙리스트
      if (nx && nx.c === 'l' && nn && nn.v && SOLO[c] && c !== 'sh' && c !== 'ch' && c !== 'j' && c !== 'zh') {
        res += SOLO[c]; addCoda('ㄹ'); vowelSyl('ㄹ', nn.v); k += 3; continue;
      }
      // 끝의 '자음 + ə + l/m/n': 애플, 리듬, 퍼슨 ('으' 모음)
      if (nx && nx.v && nx.src === 'ə' && nn && ['l', 'm', 'n'].includes(nn.c) && !s2[k + 3] && SOLO[c] && !['sh', 'ch', 'j', 'zh'].includes(c)) {
        res += SOLO[c]; addCoda({ l: 'ㄹ', m: 'ㅁ', n: 'ㄴ' }[nn.c]); k += 3; continue;
      }
      if (nx && nx.v) {
        // sh + 모음: 샤 · 셔 · 쇼 · 슈 · 시
        if (c === 'sh' || c === 'zh') { vowelSyl(c === 'sh' ? 'ㅅ' : 'ㅈ', nx.v, nx.v[0] === 'ㅣ' ? '' : 'y'); k += 2; continue; }
        // 모음 사이 l은 ㄹㄹ(컬러, 헬로)
        if (c === 'l' && res && k > 0 && s2[k - 1].v) addCoda('ㄹ');
        vowelSyl(ON[c] || 'ㅇ', nx.v); k += 2; continue;
      }
      // 받침 또는 '으' 음절
      const atEnd = !nx;
      if (res && (c === 'm' || c === 'n' || c === 'ng' || c === 'l') && addCoda({ m: 'ㅁ', n: 'ㄴ', ng: 'ㅇ', l: 'ㄹ' }[c])) { k++; continue; }
      if (res && (c === 'p' || c === 'k' || c === 't') && prevShort(k) && (atEnd || !['l', 'r', 'w', 'y'].includes(nx.c)) && addCoda({ p: 'ㅂ', k: 'ㄱ', t: 'ㅅ' }[c])) { k++; continue; }
      if (res && (c === 'b' || c === 'g') && (atEnd || !['l', 'r', 'w', 'y'].includes(nx.c)) && prevShort(k) && addCoda({ b: 'ㅂ', g: 'ㄱ' }[c])) { k++; continue; }
      if (c === 'l' || c === 'r') { res += c === 'l' ? '을' : '르'; k++; continue; }
      if (c === 'm' || c === 'n' || c === 'ng') { res += { m: '음', n: '은', ng: '응' }[c]; k++; continue; }
      res += SOLO[c] || ''; k++;
    }
    if (res) out.push(res);
  }
  return out.join(' ');
}
if (typeof module !== 'undefined') module.exports = ipaToKo;
if (typeof require !== 'undefined' && require.main === module) {
  // 사전과 비교: node tools/ipa2ko.js
  const fs = require('fs'), path = require('path');
  let n = 0, same = 0, near = 0; const bad = [];
  const lev = (a, b) => { const d = Array.from({ length: a.length + 1 }, (_, i) => [i]); for (let j = 1; j <= b.length; j++) d[0][j] = j; for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); return d[a.length][b.length]; };
  for (const c of 'abcdefghijklmnopqrstuvwxyz') {
    const d = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'public', 'dict', c + '.json'), 'utf8'));
    for (const [w, e] of Object.entries(d)) {
      if (!Array.isArray(e) || !e[2] || !e[3] || w.includes(' ')) continue;
      n++; const g = ipaToKo(e[2]), want = e[3].replace(/\s/g, '');
      if (g.replace(/\s/g, '') === want) same++; else if (lev(g.replace(/\s/g, ''), want) <= 1) near++; else if (bad.length < 40 && Math.random() < .02) bad.push(`${w} ${e[2]} ${e[3]} -> ${g}`);
    }
  }
  console.log(`단어 ${n}개: 같음 ${(same / n * 100).toFixed(1)}%, 한 글자 차이 ${(near / n * 100).toFixed(1)}%`);
  console.log(bad.slice(0, 25).join('\n'));
}
