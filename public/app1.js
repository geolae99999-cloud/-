  /* =========================================================
   * 유틸
   * ======================================================= */
  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const str = v => (v == null ? '' : String(v)).trim();
  const IC = new Proxy({
    clock: '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2.5M9 2.5h6"/></svg>',
    grid: '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3.5" y="3.5" width="17" height="17" rx="2.5"/><path d="M9.2 3.5v17M14.8 3.5v17M3.5 9.2h17M3.5 14.8h17"/></svg>',
    users: '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.2a6.5 6.5 0 0 1 3.5 5.8"/></svg>',
    mic: '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>',
    quote: '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 6h16M4 12h7M4 18h16"/><path d="M14 12h6" stroke-dasharray="2 2"/></svg>',
    search: '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
    print: '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9V3h12v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M7 14h10v7H7z"/></svg>',
    sun: '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
    moon: '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>',
    speaker: '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5 6 9H2v6h4l5 4V5z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/></svg>',
    flame: '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3c1 3.2 5 5.2 5 10a5 5 0 0 1-10 0c0-2 1-3.2 2-4 .5 1.5 1.5 2 2 2 0-3-1-5 1-8z"/></svg>',
    sprout: '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21v-8"/><path d="M12 13c0-4 3-6 7-6 0 4-3 6-7 6z"/><path d="M12 15c0-3-2-5-6-5 0 3 2 5 6 5z"/></svg>',
    bookx: '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2V5z"/><path d="M9.5 8.5l5 5M14.5 8.5l-5 5"/></svg>',
    star: '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9L12 3z"/></svg>',
    headphones: '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 15v-3a8 8 0 0 1 16 0v3"/><path d="M4 15h3v5H5a1 1 0 0 1-1-1v-4zM20 15h-3v5h2a1 1 0 0 0 1-1v-4z"/></svg>',
    shuffle: '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M16 4h4v4M20 4l-6 6M4 20l5-5M16 20h4v-4M20 20l-5-5M4 4l5 5"/></svg>',
    eyeoff: '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 3l18 18M10.6 6.2A9.7 9.7 0 0 1 12 6c5 0 8.5 4 9.5 6a14 14 0 0 1-2.6 3.3M6.6 6.7C4.5 8 3 10.2 2.5 12c1 2 4.5 6 9.5 6 1.2 0 2.3-.2 3.3-.6M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>',
    check: '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.7 2.7L16 9.5"/></svg>',
    repeat: '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17 2l4 4-4 4"/><path d="M3 11V9a3 3 0 0 1 3-3h15"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v2a3 3 0 0 1-3 3H3"/></svg>',
    trophy: '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4z"/><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/></svg>',
    sparkles: '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3z"/><path d="M19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8L19 16z"/></svg>',
    trend: '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/></svg>',
    x: '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    back: '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>',
    cards: '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="7" width="14" height="12" rx="2"/><path d="M7 3h12a2 2 0 0 1 2 2v10"/></svg>',
    keyboard: '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10"/></svg>',
    play: '<svg class="ic" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z"/></svg>',
    pause: '<svg class="ic" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1.2"/><rect x="14" y="5" width="4" height="14" rx="1.2"/></svg>',
    prev: '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 5v14M18 6l-8 6 8 6V6z"/></svg>',
    next: '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 5v14M6 6l8 6-8 6V6z"/></svg>',
    edit: '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16v4z"/><path d="M13.5 6.5l4 4"/></svg>',
    plus: '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
    tick: '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
    book: '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 4h6a4 4 0 0 1 4 4v13a3 3 0 0 0-3-3H2z"/><path d="M22 4h-6a4 4 0 0 0-4 4v13a3 3 0 0 1 3-3h7z"/></svg>',
    bell: '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4l2-2z"/><path d="M10 20a2 2 0 0 0 4 0"/></svg>',
    translate: '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 8 6 6"/><path d="m4 14 6-6 2-3"/><path d="M2 5h12"/><path d="M7 2h1"/><path d="m22 22-5-10-5 10"/><path d="M14 18h6"/></svg>',
    rows: '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="7" height="5" rx="1.5"/><rect x="12" y="4" width="9" height="5" rx="1.5"/><rect x="3" y="15" width="10" height="5" rx="1.5"/><path d="M16 17.5h5M19 15l2.5 2.5L19 20"/></svg>',
    podium: '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 21V10h6v11M3 21v-6h6M15 21v-8h6v8M2 21h20"/><path d="M12 2.5l.9 1.9 2 .3-1.5 1.4.4 2-1.8-1-1.8 1 .4-2-1.5-1.4 2-.3z"/></svg>',
    shield: '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l7 2.8v5.4c0 4.4-3 8-7 9.8-4-1.8-7-5.4-7-9.8V5.8z"/><path d="M9 12l2.2 2.2L15.5 10"/></svg>',
    scan: '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2"/><path d="M8 9h8M8 12h8M8 15h5"/></svg>',
    camera: '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 8a2 2 0 0 1 2-2h2l1.5-2h5L16 6h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8z"/><circle cx="12" cy="12.5" r="3.5"/></svg>',
    image: '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3.5" y="4.5" width="17" height="15" rx="2.5"/><circle cx="9" cy="10" r="1.6"/><path d="m20.5 16-4.5-4.5-8.5 8"/></svg>',
    upload: '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 15V4M7.5 8.5 12 4l4.5 4.5"/><path d="M4 14v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4"/></svg>',
    download: '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4v11M7.5 10.5 12 15l4.5-4.5"/><path d="M4 14v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4"/></svg>'
  }, {
    /* 없는 이름을 쓰면 'undefined' 글자 대신 기본 아이콘(별)을 그려요. */
    get: (o, k) => (k in o || typeof k !== 'string' ? o[k] : (console.warn('IC: 없는 아이콘', k), o.sparkles))
  });
  /* 마스코트: 새싹을 단 동글동글한 파란 캐릭터. mood = happy | cheer | think | sleep */
  function MASCOT(mood) {
    mood = mood || 'happy';
    const K = '#191f28', B = '#3182f6';
    const ey = mood === 'think' ? 56 : 58, hx = mood === 'think' ? 1.8 : 1.4, hy = mood === 'think' ? -3.6 : -2.6;
    const eyes = mood === 'sleep' ? `<path d="M40 59q6 5 12 0M68 59q6 5 12 0" fill="none" stroke="${K}" stroke-width="3.4" stroke-linecap="round"/>`
      : mood === 'cheer' ? `<path d="M40 61q6-9 12 0M68 61q6-9 12 0" fill="none" stroke="${K}" stroke-width="3.6" stroke-linecap="round"/>`
      : `<ellipse cx="46" cy="${ey}" rx="5.2" ry="6.6" fill="${K}"/><ellipse cx="74" cy="${ey}" rx="5.2" ry="6.6" fill="${K}"/><circle cx="${46 + hx}" cy="${ey + hy}" r="2" fill="#fff"/><circle cx="${74 + hx}" cy="${ey + hy}" r="2" fill="#fff"/>`;
    const mouth = mood === 'cheer' ? `<path d="M51 69h18a9 9 0 0 1-18 0z" fill="${K}"/><ellipse cx="60" cy="75.5" rx="4.6" ry="2.6" fill="#ff7b8e"/>`
      : mood === 'think' ? `<path d="M55 73q5-3 10 0" fill="none" stroke="${K}" stroke-width="3.2" stroke-linecap="round"/>`
      : mood === 'sleep' ? `<ellipse cx="60" cy="72" rx="3" ry="3.4" fill="${K}"/>`
      : `<path d="M52 69q8 8 16 0" fill="none" stroke="${K}" stroke-width="3.4" stroke-linecap="round"/>`;
    const arms = mood === 'cheer' ? `<path d="M21 62q-11-5-10-19M99 62q11-5 10-19" fill="none" stroke="${B}" stroke-width="9" stroke-linecap="round"/>`
      : `<path d="M21 68q-9 3-10 12M99 68q9 3 10 12" fill="none" stroke="${B}" stroke-width="8" stroke-linecap="round"/>`;
    const extra = mood === 'sleep' ? '<path d="M93 22h9l-9 10h9M105 8h6l-6 7h6" fill="none" stroke="#8b95a1" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>'
      : mood === 'think' ? '<circle cx="99" cy="32" r="3" fill="#b0b8c1"/><circle cx="107" cy="21" r="4.6" fill="#b0b8c1"/>'
      : mood === 'cheer' ? '<path d="M14 26l2 5 5 2-5 2-2 5-2-5-5-2 5-2zM104 50l1.5 3.5 3.5 1.5-3.5 1.5-1.5 3.5-1.5-3.5-3.5-1.5 3.5-1.5z" fill="#ffc342"/>' : '';
    return `<svg class="mascot m-${mood}" viewBox="0 0 120 120" aria-hidden="true"><ellipse cx="60" cy="113" rx="30" ry="4.5" fill="currentColor" opacity=".08"/>${arms}<ellipse cx="46" cy="104" rx="10" ry="5.5" fill="#1b64da"/><ellipse cx="74" cy="104" rx="10" ry="5.5" fill="#1b64da"/><path d="M60 16c27 0 45 19 45 47 0 26-19 41-45 41S15 89 15 63c0-28 18-47 45-47z" fill="${B}"/><ellipse cx="60" cy="86" rx="25" ry="14" fill="#fff" opacity=".13"/><ellipse cx="37" cy="35" rx="8" ry="4.5" transform="rotate(-35 37 35)" fill="#fff" opacity=".38"/><path d="M60 18q-1-6 2-10" fill="none" stroke="#03b26c" stroke-width="3" stroke-linecap="round"/><path d="M62 9c3-6 9-8 15-7-2 6-8 9-15 7z" fill="#03b26c"/><ellipse cx="34" cy="70" rx="6.5" ry="4" fill="#ff8da1" opacity=".75"/><ellipse cx="86" cy="70" rx="6.5" ry="4" fill="#ff8da1" opacity=".75"/>${eyes}${mouth}${extra}</svg>`;
  }
  const emptyHtml = (t, d, mood) => `<div class="empty">${MASCOT(mood || 'sleep')}<b>${t}</b>${d || ''}</div>`;
  const uid = () => 'w' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const shuffled = arr => { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const safeId = v => str(v).replace(/[^\w-]/g, '');

  /* ----- 학습 언어 (영어 / 중국어) -----
     LANG 은 지금 보고 있는 단어장 언어예요. 발음, 사전, AI 는 단어 글자를 보고 언어를 정해서
     공유받은 단어장이나 과제가 다른 언어여도 맞게 읽어요. */
  const HAN = /[㐀-鿿豈-﫿]/, HAN_G = /[^㐀-鿿豈-﫿]/g;
  const isHanWord = s => HAN.test(String(s || '')) && !/[A-Za-z]/.test(String(s || ''));
  let LANG = 'en';
  const isZh = () => LANG === 'zh';
  const LN = () => isZh() ? '중국어' : '영어';
  const ttsLang = t => HAN.test(String(t || '')) && !/[A-Za-z]{2}/.test(String(t || '')) ? 'zh-CN' : 'en-US';
  // 병음 비교용: 성조, 띄어쓰기, 숫자를 빼요 (xué xí, xue2xi2, xuexi 모두 같게)
  const pyPlain = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/v/g, 'u').replace(/[^a-z]/g, '');
  const exPyHtml = w => w && w.exPy ? `<small class="ex-py">${esc(w.exPy)}</small>` : '';

  const DAY = 86400000;
  const INTERVALS = [0, 1, 3, 7, 14, 30];   // 박스(레벨)별 복습 간격(일)
  const SESSION_DEFAULT = 20;
  const startOfDay = (t = Date.now()) => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };
  const endOfToday = () => { const d = new Date(); d.setHours(23, 59, 59, 999); return d.getTime(); };
  const addDays = (t, n) => { const d = new Date(t); d.setDate(d.getDate() + n); d.setHours(0, 0, 0, 0); return d.getTime(); };
  const dayKey = (t = Date.now()) => { const d = new Date(t); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };

  let toastTimer = null;
  function toast(msg) {
    const el = $('toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2300);
  }
  const LS = (() => { try { localStorage.setItem('_t', '1'); localStorage.removeItem('_t'); return localStorage; } catch (e) { const m = {}; return { getItem: k => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); }, removeItem: k => { delete m[k]; } }; } })();
  function loadJson(key) { try { const v = LS.getItem(key); return v ? JSON.parse(v) : null; } catch (e) { return null; } }
  function download(name, text, type) {
    const blob = new Blob([text], { type });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1500);
  }
  function confetti() {
    const wrap = document.createElement('div');
    wrap.className = 'confetti';
    const colors = ['#3a5bff', '#ffcf3f', '#14b890', '#ff5a68', '#9db8ff'];
    for (let i = 0; i < 40; i++) {
      const s = document.createElement('i');
      s.style.left = Math.random() * 100 + '%';
      s.style.background = colors[i % colors.length];
      s.style.animationDelay = (Math.random() * 0.5) + 's';
      s.style.animationDuration = (1.6 + Math.random() * 1.4) + 's';
      wrap.appendChild(s);
    }
    document.body.appendChild(wrap);
    setTimeout(() => wrap.remove(), 3400);
  }

  const ACTIONS = {};
  document.addEventListener('click', e => {
    const el = e.target.closest('[data-act]');
    if (!el) return;
    const fn = ACTIONS[el.dataset.act];
    if (fn) fn(el, e);
  });
  // 버튼처럼 쓰는 div(role=button)도 키보드 Enter/Space로 눌러요
  document.addEventListener('keydown', e => {
    if ((e.key === 'Enter' || e.key === ' ') && !e.repeat && e.target.matches && e.target.matches('[data-act][role="button"]')) { e.preventDefault(); e.target.click(); }
  });
  /* 입력 이벤트도 같은 방식으로 위임해요. HTML 속성에 onclick 같은 인라인 코드를 쓰면
     보안 정책(CSP)에 막히니 data-change / data-input / data-enter 와 아래 ON 표를 쓰세요. */
  const ON = { change: {}, input: {}, enter: {} };
  const onFire = (kind, e) => { const el = e.target && e.target.closest && e.target.closest('[data-' + kind + ']'); if (!el) return null; const fn = ON[kind][el.getAttribute('data-' + kind)]; if (fn) fn(el, e); return el; };
  document.addEventListener('change', e => onFire('change', e));
  document.addEventListener('input', e => onFire('input', e));
  document.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target && e.target.closest && e.target.closest('[data-enter]')) { e.preventDefault(); onFire('enter', e); } });
  Object.assign(ON.change, {
    grade: el => setGrade(el.value),
    goal: el => { config.goal = parseInt(el.value, 10) || 20; syncStorage(); },
    'tts-voice': el => { config.voice = Object.assign({ en: '', zh: '', ko: '' }, config.voice); config.voice[el.dataset.l] = el.value; syncStorage(); ttsTry(el.dataset.l); },
    'tts-match': el => { config.matchVoice = el.checked; syncStorage(); },
    haptic: el => { config.haptic = el.checked; syncStorage(); if (el.checked) haptic(true); },
    provider: el => onProviderChange(el.value),
    rm: () => rmSave(),
    'import-backup': (el, e) => importBackup(e),
    'import-csv': (el, e) => importCsv(e),
    'listen-ex': el => { L.example = el.checked; },
    'listen-exko': el => { L.exKo = el.checked; },
    'auth-role': () => authRoleChange(),
    'pq-role': () => pqRoleChange()
  });
  Object.assign(ON.input, { 'tts-range': el => ttsSet(el.dataset.k, el.value, true), search: el => onSearch(el.value), dict: () => dictType() });
  Object.assign(ON.enter, { 'add-book': () => ACTIONS['add-book'](), 'ai-fill': () => executeFastAi(), dict: () => dictType(true) });
  ACTIONS['test-conn'] = () => testConnection();
  ACTIONS['ai-fill'] = () => executeFastAi();
  ACTIONS['word-save'] = el => el.dataset.id ? saveEditWord(el.dataset.id) : saveNewWord();
  ACTIONS['select-all'] = el => el.select();

