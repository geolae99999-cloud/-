// 화면에 'undefined' 글자나 없는 아이콘 이름이 나오면 오류로 모아요. 사용: await watchUndef(page, errs, '태그')
module.exports = async function watchUndef(p, errs, tag) {
  p.on('console', m => { const t = m.text(); if (/^UNDEF-TEXT|^IC: /.test(t)) errs.push((tag ? tag + ' ' : '') + t); });
  await p.addInitScript(() => {
    const bad = /\bundefined\b|\[object Object\]/;
    const check = n => { const t = n.nodeType === 3 ? n.data : n.nodeType === 1 && !/^(SCRIPT|STYLE|TEXTAREA|INPUT)$/.test(n.tagName) ? n.textContent : ''; if (t && bad.test(t)) console.error('UNDEF-TEXT: ' + t.replace(/\s+/g, ' ').slice(0, 120)); };
    const start = () => new MutationObserver(ms => ms.forEach(m => m.type === 'characterData' ? check(m.target) : m.addedNodes.forEach(check))).observe(document, { childList: true, subtree: true, characterData: true });
    start();
  });
};
