  /* =========================================================
   * 레벨 테스트 · 맞춤 시작
   * ======================================================= */
  const LT_BANK = [
    [["apple","사과"],["friend","친구"],["happy","행복한"],["school","학교"],["water","물"],["family","가족"],["morning","아침"],["travel","여행하다"],["bright","밝은"],["borrow","빌리다"]],
    [["improve","향상시키다"],["decide","결정하다"],["expensive","비싼"],["ordinary","평범한"],["advice","조언"],["habit","습관"],["support","지지하다"],["prepare","준비하다"],["environment","환경"],["communicate","의사소통하다"]],
    [["reluctant","꺼리는"],["ambiguous","모호한"],["inevitable","피할 수 없는"],["authentic","진짜의"],["enhance","높이다"],["restrict","제한하다"],["acquire","습득하다"],["tolerate","참아내다"],["controversy","논란"],["prosperity","번영"]],
    [["ubiquitous","어디에나 있는"],["ephemeral","덧없는"],["pragmatic","실용적인"],["meticulous","꼼꼼한"],["scrutinize","면밀히 조사하다"],["alleviate","덜어주다"],["exacerbate","악화시키다"],["indigenous","토착의"],["ostensible","표면상의"],["scarce","드문, 부족한"]]
  ];
  // 중국어 레벨 테스트: HSK 1~2급, 3급, 4급, 5~6급
  const LT_BANK_ZH = [
    [["学校","학교"],["朋友","친구"],["吃","먹다"],["喜欢","좋아하다"],["医生","의사"],["漂亮","예쁘다"],["天气","날씨"],["睡觉","잠을 자다"],["衣服","옷"],["便宜","(값이) 싸다"]],
    [["习惯","습관"],["环境","환경"],["担心","걱정하다"],["简单","간단하다"],["选择","선택하다"],["解决","해결하다"],["健康","건강"],["经常","자주"],["认真","성실하다, 진지하다"],["突然","갑자기"]],
    [["积累","쌓다, 축적하다"],["激动","감격하다"],["详细","상세하다"],["浪费","낭비하다"],["承认","인정하다"],["竞争","경쟁하다"],["鼓励","격려하다"],["尊重","존중하다"],["缺点","단점"],["减少","줄이다"]],
    [["犹豫","망설이다"],["谨慎","신중하다"],["繁荣","번영하다"],["珍惜","소중히 여기다"],["妥协","타협하다"],["弥补","메우다, 보완하다"],["隐私","사생활"],["坦率","솔직하다"],["舆论","여론"],["尴尬","난처하다"]]
  ];
  const ltBank = () => isZh() ? LT_BANK_ZH : LT_BANK;
  const LT_LV = [
    { name: '입문', goal: 10, desc: '기초 단어부터 차근차근 시작해요.' },
    { name: '초급', goal: 10, desc: '일상 단어는 익숙해요. 핵심 단어를 늘려가요.' },
    { name: '중급', goal: 20, desc: '탄탄한 기본기가 있어요. 꾸준히 확장해요.' },
    { name: '상급', goal: 30, desc: '어려운 단어도 잘 알고 있어요. 고난도에 도전해요.' },
    { name: '최상급', goal: 50, desc: '최상위 수준이에요. 고난도 단어로 완성해요.' }
  ];
  const ltKey = () => 'vocapro_level:' + (isZh() ? 'zh:' : '') + currentUser;
  let LT = null;
  function ltBuild() {
    const qs = [];
    ltBank().forEach((pool, lv) => {
      shuffled(pool.slice()).slice(0, 3).forEach(([w, m]) => {
        const wrong = shuffled(pool.filter(x => x[1] !== m)).slice(0, 3).map(x => x[1]);
        qs.push({ lv, w, m, opts: shuffled([m, ...wrong]) });
      });
    });
    return qs;
  }
  function ltOpen(intro) {
    if ($('ltOv')) return;
    LT = { qs: ltBuild(), i: 0, ok: [0, 0, 0, 0], locked: false };
    const ov = document.createElement('div'); ov.className = 'ob lt'; ov.id = 'ltOv'; document.body.appendChild(ov);
    ltIntro(ov, intro);
  }
  function ltIntro(ov, intro) {
    ov.innerHTML = `<button class="ob-skip" data-lt="close">${intro ? '나중에 할게요' : '닫기'}</button>
      <div class="ob-body"><div class="ob-art">${MASCOT('think')}</div><h2>내 ${LN()} 수준 알아보기</h2>
      <p>12문제, 약 2분이면 끝나요.<br>결과에 맞춰 하루 목표와 시작 단어를 추천해 드려요.</p></div>
      <div class="ob-foot"><button class="btn btn-primary btn-block" data-lt="start">테스트 시작</button></div>`;
  }
  function ltDraw() {
    const ov = $('ltOv'); if (!ov || !LT) return;
    if (LT.i >= LT.qs.length) return ltResult();
    const q = LT.qs[LT.i];
    ov.innerHTML = `<button class="ob-skip" data-lt="close">그만하기</button>
      <div class="lt-bar"><i style="width:${Math.round(LT.i / LT.qs.length * 100)}%"></i></div>
      <div class="ob-body lt-q"><div class="muted" style="font-weight:700;margin-bottom:10px;">${LT.i + 1} / ${LT.qs.length}</div>
      <h2 style="font-size:2.1rem;">${esc(q.w)}</h2><p style="margin-bottom:22px;">이 단어의 뜻은?</p>
      <div class="opts" style="width:100%;">${q.opts.map((o, k) => `<button class="opt" data-lt="opt" data-v="${esc(o)}"><span class="opt-n">${k + 1}</span><span>${esc(o)}</span></button>`).join('')}</div></div>
      <div class="ob-foot"><button class="btn btn-soft btn-block" data-lt="opt" data-v="">잘 모르겠어요</button></div>`;
    LT.locked = false;
  }
  function ltAnswer(v) {
    if (!LT || LT.locked) return; LT.locked = true;
    const q = LT.qs[LT.i];
    if (v === q.m) LT.ok[q.lv]++;
    const ov = $('ltOv');
    ov.querySelectorAll('.opt').forEach(b => { if (b.dataset.v === q.m) b.classList.add('correct'); else if (b.dataset.v === v) b.classList.add('wrong'); });
    setTimeout(() => { if (LT) { LT.i++; ltDraw(); } }, v === q.m ? 450 : 900);
  }
  function ltLevel() { let r = 0; for (let l = 0; l < 4; l++) { if (LT.ok[l] >= 2) r++; else break; } return r; }
  function ltResult() {
    const ov = $('ltOv'); if (!ov) return;
    const r = ltLevel(), info = LT_LV[r], total = LT.ok.reduce((a, b) => a + b, 0);
    LT.r = r;
    try { LS.setItem(ltKey(), JSON.stringify({ lv: r, score: total, at: Date.now() })); } catch (e) {}
    ov.innerHTML = `<div class="ob-body"><div class="ob-art">${MASCOT('cheer')}</div>
      <div class="muted" style="font-weight:700;">내 수준은</div><h2 style="font-size:2.4rem;">${info.name}</h2>
      <p>${info.desc}<br>12문제 중 <b>${total}</b>문제를 맞혔어요.</p>
      <div class="card" style="width:100%;margin-top:22px;text-align:left;"><b>추천 하루 목표 ${info.goal}개</b><div class="muted" style="font-size:.85rem;margin-top:4px;">'${info.name} 시작 단어' 단어장 ${ltBank()[Math.min(r, 3)].length}개도 만들어 드려요.</div></div></div>
      <div class="ob-foot"><button class="btn btn-primary btn-block" data-lt="apply">추천대로 시작하기</button>
      <button class="btn btn-soft btn-block" data-lt="goal" style="margin-top:8px;">목표만 적용하기</button></div>`;
  }
  function ltApply(withBook) {
    if (!LT || LT.r === undefined) return;
    const info = LT_LV[LT.r]; config.goal = info.goal;
    let id = null;
    if (withBook) {
      const nm = info.name + ' 시작 단어';
      let cat = categories.find(c => c.name === nm);
      if (!cat) {
        cat = { id: 'c' + uid(), name: nm, words: ltBank()[Math.min(LT.r, 3)].map(([w, m]) => sanitizeWord({ id: uid(), word: w, meaning: m })) };
        categories.push(cat);
        dictFill(cat.words).then(n => { if (n) syncStorage(); }).catch(() => {});
      }
      id = cat.id;
    }
    syncStorage(); const ov = $('ltOv'); if (ov) ov.remove(); LT = null;
    try { go(curTab); } catch (e) {}
    toast(withBook ? '추천 단어장을 만들었어요.' : '하루 목표를 ' + info.goal + '개로 바꿨어요.');
    if (id) { try { ACTIONS.start({ dataset: { mode: 'card', src: 'cat:' + id } }); } catch (e) {} }
  }
  document.addEventListener('click', e => {
    const b = e.target.closest && e.target.closest('#ltOv [data-lt]'); if (!b) return;
    const a = b.dataset.lt;
    if (a === 'close') { const ov = $('ltOv'); if (ov) ov.remove(); LT = null; }
    else if (a === 'start') ltDraw();
    else if (a === 'opt') ltAnswer(b.dataset.v);
    else if (a === 'apply') ltApply(true);
    else if (a === 'goal') ltApply(false);
  });
  ACTIONS['level-test'] = () => ltOpen(false);
  function ltEntryHtml() {
    let s = null; try { s = JSON.parse(LS.getItem(ltKey()) || 'null'); } catch (e) {}
    const t = s && LT_LV[s.lv] ? '내 수준: ' + LT_LV[s.lv].name + ' · 다시 테스트' : `내 ${LN()} 수준 알아보기`;
    const sub = s ? '실력이 늘었다면 다시 측정해 보세요' : '12문제로 하루 목표와 시작 단어를 추천받아요';
    return `<button class="mg-entry" data-act="level-test"><span class="mg-ico i-coral">${IC.sprout}</span><span class="mg-txt"><b>${esc(t)}</b><small>${sub}</small></span><span class="mg-chev"></span></button>`;
  }

  /* =========================================================
   * 4단계 집중 학습 (카드 → 뜻 고르기 → 따라 쓰기 → 시험)
   * ======================================================= */
  const FL_STEPS = ['카드 보기', '뜻 고르기', '따라 쓰기', '마무리 시험'];
  let FL = null;
  function flPick() {
    let it = poolFor({ type: 'due' }); if (!it.length) it = poolFor({ type: 'new' }); if (!it.length) it = poolFor({ type: 'all' });
    return shuffled(it.map(x => ({ w: x.w, catId: x.catId }))).slice(0, 8);
  }
  function flOpts(w, rev) {
    const pool = allWords().map(x => rev ? x.w.word : x.w.meaning).concat(ltBank().flat().map(x => rev ? x[0] : x[1]));
    const ans = rev ? w.word : w.meaning, seen = new Set([ans.toLowerCase()]), out = [];
    shuffled(pool).forEach(o => { if (out.length < 3 && o && !seen.has(o.toLowerCase())) { seen.add(o.toLowerCase()); out.push(o); } });
    return shuffled([ans, ...out]);
  }
  ACTIONS.flow = () => flOpen();
  function flOpen(items) {
    if ($('flOv')) return;
    items = items || flPick();
    if (!items.length) return toast('학습할 단어가 없어요. 먼저 단어를 추가해 보세요.');
    FL = { items, step: 0, i: 0, res: {}, locked: false, miss: {} };
    const ov = document.createElement('div'); ov.className = 'ob lt fl'; ov.id = 'flOv'; document.body.appendChild(ov);
    flDraw();
  }
  function flTotal() { return FL.items.length * 4; }
  function flDraw() {
    const ov = $('flOv'); if (!ov || !FL) return;
    if (FL.i >= FL.items.length) { FL.step++; FL.i = 0; if (FL.step >= 4) return flResult(); }
    const it = FL.items[FL.i], w = it.w, st = FL.step;
    const head = `<button class="ob-skip" data-fl="close">그만하기</button><div class="lt-bar"><i style="width:${Math.round((st * FL.items.length + FL.i) / flTotal() * 100)}%"></i></div><div class="muted fl-step"><b>${st + 1}/4 ${FL_STEPS[st]}</b> · ${FL.i + 1}/${FL.items.length}</div>`;
    FL.locked = false; let body = '', foot = '';
    if (st === 0) {
      body = `<div class="fl-card"><button class="q-speak" data-act="speak" data-text="${esc(w.word)}" aria-label="발음 듣기">${IC.speaker}</button><div class="fl-word">${esc(w.word)}</div><div class="q-pron">${esc(pronText(w))}</div><div class="fl-mean">${esc(w.meaning)}</div>${w.example ? `<div class="fl-ex">${esc(w.example)}${exPyHtml(w)}${w.exampleKo ? `<span class="ex-ko">${esc(w.exampleKo)}</span>` : ''}</div>` : ''}</div>`;
      foot = `<button class="btn btn-primary btn-block" data-fl="next">${FL.i === FL.items.length - 1 ? '뜻 고르기로' : '다음'}</button>`;
      setTimeout(() => { try { playAudio(w.word); } catch (e) {} }, 150);
    } else if (st === 1 || st === 3) {
      const rev = st === 3, opts = flOpts(w, rev);
      body = `<div class="ob-body lt-q"><div class="muted" style="font-weight:700;margin-bottom:8px;">${rev ? `알맞은 ${LN()} 단어는?` : '이 단어의 뜻은?'}</div><h2 style="font-size:2rem;">${esc(rev ? w.meaning : w.word)}</h2><div class="opts" style="width:100%;margin-top:22px;">${opts.map((o, k) => `<button class="opt" data-fl="opt" data-v="${esc(o)}"><span class="opt-n">${k + 1}</span><span>${esc(o)}</span></button>`).join('')}</div></div>`;
      foot = `<button class="btn btn-soft btn-block" data-fl="opt" data-v="">잘 모르겠어요</button>`;
    } else {
      body = `<div class="ob-body lt-q"><div class="muted" style="font-weight:700;margin-bottom:8px;">뜻에 맞는 단어를 써 보세요</div><h2 style="font-size:2rem;">${esc(w.meaning)}</h2><div class="muted" style="margin:6px 0 18px;letter-spacing:.2em;">${isHanWord(w.word) ? `${'□'.repeat(w.word.length)}` : `${esc(w.word.charAt(0))}${'_'.repeat(Math.max(0, Math.min(w.word.length - 1, 24)))}`}</div><input type="text" id="flIn" class="fl-in" autocomplete="off" autocapitalize="none" spellcheck="false" placeholder="${isHanWord(w.word) ? '병음(예: xuexi) 또는 한자' : '영어 단어'}"><div id="flFb" class="fl-fb"></div></div>`;
      foot = `<button class="btn btn-primary btn-block" id="flGo" data-fl="type">확인</button>`;
      setTimeout(() => { const i = $('flIn'); if (i) i.focus(); }, 80);
    }
    ov.innerHTML = head + (st === 0 ? `<div class="ob-body">${body}</div>` : body) + `<div class="ob-foot">${foot}</div>`;
  }
  function flAdvance(ms) { setTimeout(() => { if (FL) { FL.i++; flDraw(); } }, ms); }
  function flAnswer(v) {
    if (!FL || FL.locked) return; FL.locked = true;
    const it = FL.items[FL.i], w = it.w, rev = FL.step === 3, ans = rev ? w.word : w.meaning, ok = v === ans;
    if (FL.step === 3) FL.res[w.id] = ok; if (!ok) FL.miss[w.id] = true;
    $('flOv').querySelectorAll('.opt').forEach(b => { if (b.dataset.v === ans) b.classList.add('correct'); else if (b.dataset.v === v) b.classList.add('wrong'); });
    flAdvance(ok ? 450 : 1000);
  }
  function flType() {
    if (!FL) return; const it = FL.items[FL.i], w = it.w, inp = $('flIn'), fb = $('flFb'), btn = $('flGo'); if (!inp) return;
    if (FL.locked) { FL.i++; return flDraw(); }
    const v = inp.value.trim().toLowerCase(); if (!v) return toast('단어를 입력해 주세요.');
    const ok = answerOk(v, w); if (!ok) FL.miss[w.id] = true;
    FL.locked = true; inp.disabled = true;
    fb.innerHTML = ok ? `<b style="color:var(--blue)">정답이에요!${w.phonetic && isHanWord(w.word) ? ` ${esc(w.word)} ${esc(w.phonetic)}` : ''}</b>` : `<b style="color:var(--coral)">정답: ${esc(w.word)}${w.phonetic && isHanWord(w.word) ? ` (${esc(w.phonetic)})` : ''}</b>`;
    btn.textContent = '다음';
  }
  function flResult() {
    const ov = $('flOv'); if (!ov) return;
    let good = 0; const wrongs = [];
    FL.items.forEach(it => { const ok = !!FL.res[it.w.id]; grade(it.w, ok); recordStat(ok); if (ok) good++; else wrongs.push(it); });
    syncStorage(); FL.wrongs = wrongs;
    try { go(curTab); } catch (e) {}
    ov.innerHTML = `<div class="ob-body"><div class="ob-art">${MASCOT(wrongs.length ? 'happy' : 'cheer')}</div><div class="muted" style="font-weight:700;">마무리 시험 결과</div><h2 style="font-size:2.4rem;">${good} / ${FL.items.length}</h2><p>${wrongs.length ? '틀린 단어는 내일 다시 복습해요.' : '모두 맞혔어요. 대단해요!'}</p>${wrongs.length ? `<div class="card" style="width:100%;margin-top:18px;text-align:left;">${wrongs.map(it => `<div class="wrong-item"><b>${esc(it.w.word)}</b><span>${esc(it.w.meaning)}</span></div>`).join('')}</div>` : ''}</div><div class="ob-foot">${wrongs.length ? '<button class="btn btn-primary btn-block" data-fl="again">틀린 것만 다시</button><button class="btn btn-soft btn-block" data-fl="close" style="margin-top:8px;">마치기</button>' : '<button class="btn btn-primary btn-block" data-fl="close">마치기</button>'}</div>`;
    if (good === FL.items.length) { try { confetti(); } catch (e) {} }
  }
  document.addEventListener('click', e => {
    const b = e.target.closest && e.target.closest('#flOv [data-fl]'); if (!b) return;
    const a = b.dataset.fl;
    if (a === 'close') { const ov = $('flOv'); if (ov) ov.remove(); FL = null; }
    else if (a === 'next') { FL.i++; flDraw(); }
    else if (a === 'opt') flAnswer(b.dataset.v);
    else if (a === 'type') flType();
    else if (a === 'again') { const w = FL && FL.wrongs; const ov = $('flOv'); if (ov) ov.remove(); FL = null; if (w && w.length) flOpen(w); }
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Enter' && FL && FL.step === 2 && e.target && e.target.id === 'flIn') { e.preventDefault(); flType(); }
  });
  /* =========================================================
   * 학년별 추천 단어 데이터 (초등)
   * ======================================================= */
  const GW_E = {
    e1: "hello:안녕(만날 때)|bye:잘 가|yes:네, 응|no:아니요|mom:엄마|dad:아빠|baby:아기|boy:소년|girl:소녀|one:하나, 1|two:둘, 2|three:셋, 3|four:넷, 4|five:다섯, 5|six:여섯, 6|seven:일곱, 7|eight:여덟, 8|nine:아홉, 9|ten:열, 10|red:빨간색|blue:파란색|yellow:노란색|green:초록색|pink:분홍색|black:검은색|white:흰색|brown:갈색|cat:고양이|dog:개|pig:돼지|cow:소|duck:오리|bird:새|fish:물고기|lion:사자|tiger:호랑이|bear:곰|monkey:원숭이|rabbit:토끼|horse:말|frog:개구리|ant:개미|bee:벌|apple:사과|banana:바나나|egg:달걀|milk:우유|water:물|juice:주스|bread:빵|cake:케이크|candy:사탕|pizza:피자|grape:포도|orange:오렌지|lemon:레몬|rice:밥, 쌀|eye:눈|ear:귀|nose:코|mouth:입|hand:손|foot:발|head:머리|arm:팔|leg:다리|face:얼굴|sun:해, 태양|moon:달|star:별|tree:나무|flower:꽃|ball:공|doll:인형|toy:장난감|book:책|pen:펜|bag:가방|hat:모자|box:상자|car:자동차|bus:버스|big:큰|small:작은|happy:행복한|sad:슬픈|hot:뜨거운, 더운|cold:차가운, 추운|go:가다|run:달리다|walk:걷다|jump:뛰다|swim:수영하다|sing:노래하다|dance:춤추다|eat:먹다|drink:마시다|sleep:자다|sit:앉다|stand:서다",
    e2: "come:오다|look:보다|like:좋아하다|love:사랑하다|play:놀다|friend:친구|teacher:선생님|school:학교|house:집|room:방|bed:침대|door:문|window:창문|desk:책상|chair:의자|table:탁자|pencil:연필|cup:컵|shoe:신발|sock:양말|cap:야구 모자|bike:자전거|ship:배|brother:형, 오빠, 남동생|sister:언니, 누나, 여동생|family:가족|grandma:할머니|grandpa:할아버지|name:이름|chicken:닭|sheep:양|goat:염소|mouse:쥐|snake:뱀|turtle:거북|whale:고래|elephant:코끼리|giraffe:기린|zebra:얼룩말|butterfly:나비|melon:멜론|peach:복숭아|corn:옥수수|carrot:당근|potato:감자|tomato:토마토|onion:양파|strawberry:딸기|watermelon:수박|cookie:쿠키|sandwich:샌드위치|soup:수프|salad:샐러드|breakfast:아침 식사|lunch:점심 식사|dinner:저녁 식사|rain:비|snow:눈(내리는 눈)|sunny:맑은|cloudy:흐린|rainy:비 오는|windy:바람 부는|spring:봄|summer:여름|fall:가을; 떨어지다|winter:겨울|morning:아침|night:밤|today:오늘|tall:키가 큰|short:짧은, 키가 작은|long:긴|fast:빠른|slow:느린|old:늙은, 오래된|young:어린, 젊은|new:새로운|good:좋은|bad:나쁜|pretty:예쁜|cute:귀여운|hungry:배고픈|tired:피곤한|read:읽다|write:쓰다|draw:그리다|open:열다|close:닫다|listen:듣다|help:돕다|cook:요리하다; 요리사|wash:씻다|fly:날다|ride:타다|park:공원|zoo:동물원|farm:농장|kitchen:부엌|bathroom:욕실|garden:정원",
    e3: "mother:어머니|father:아버지|man:남자|woman:여자|student:학생|classroom:교실|home:집, 가정|bedroom:침실|sofa:소파|lamp:전등|clock:시계(벽시계)|spoon:숟가락|fork:포크|plate:접시|color:색깔|purple:보라색|gray:회색|shape:모양|circle:원|square:정사각형|triangle:삼각형|number:숫자|eleven:열하나, 11|twelve:열둘, 12|twenty:스물, 20|hundred:백, 100|hair:머리카락|finger:손가락|tooth:이, 치아|body:몸|sky:하늘|cloud:구름|wind:바람|warm:따뜻한|cool:시원한; 멋진|weather:날씨|sick:아픈|fine:괜찮은|thirsty:목마른|coat:외투|shirt:셔츠|pants:바지|skirt:치마|dress:원피스|jacket:재킷|glasses:안경|gloves:장갑|umbrella:우산|eraser:지우개|ruler:자|scissors:가위|glue:풀|notebook:공책|paper:종이|picture:그림, 사진|song:노래|music:음악|art:미술|math:수학|science:과학|English:영어|Korean:한국어; 한국의|week:주, 일주일|Monday:월요일|Tuesday:화요일|Wednesday:수요일|Thursday:목요일|Friday:금요일|Saturday:토요일|Sunday:일요일|weekend:주말|time:시간|hour:시간(60분)|minute:분|have:가지다|want:원하다|make:만들다|know:알다|see:보다|hear:듣다, 들리다|say:말하다|talk:이야기하다|ask:묻다, 부탁하다|give:주다|take:가져가다, 잡다|put:놓다|find:찾다|buy:사다|here:여기|there:거기|under:~아래에|behind:~뒤에|near:가까운|far:먼|left:왼쪽|right:오른쪽; 옳은|river:강|sea:바다|mountain:산|train:기차",
    e4: "airplane:비행기|taxi:택시|subway:지하철|boat:배, 보트|road:도로|street:거리|bridge:다리(건너는 다리)|city:도시|town:마을|shop:가게|store:가게|hospital:병원|library:도서관|restaurant:식당|bakery:빵집|market:시장|bank:은행|museum:박물관|station:역|airport:공항|doctor:의사|nurse:간호사|farmer:농부|police officer:경찰관|soccer:축구|baseball:야구|basketball:농구|tennis:테니스|game:게임, 경기|team:팀|player:선수|win:이기다|lose:지다, 잃어버리다|hobby:취미|movie:영화|camera:카메라|piano:피아노|guitar:기타|violin:바이올린|drum:북, 드럼|camping:캠핑|fishing:낚시|hiking:등산|birthday:생일|party:파티|gift:선물|present:선물; 현재의|holiday:휴일|vacation:방학, 휴가|trip:여행|travel:여행하다|visit:방문하다|invite:초대하다|meet:만나다|wait:기다리다|start:시작하다|finish:끝내다|stop:멈추다|learn:배우다|study:공부하다|teach:가르치다|think:생각하다|feel:느끼다|need:필요하다|homework:숙제|test:시험|question:질문|answer:대답; 대답하다|word:단어|letter:글자, 편지|story:이야기|money:돈|coin:동전|price:가격|cheap:값싼|expensive:비싼|easy:쉬운|difficult:어려운|busy:바쁜|free:자유로운, 무료의|kind:친절한; 종류|funny:재미있는|smart:똑똑한|brave:용감한|lazy:게으른|quiet:조용한|loud:시끄러운|strong:강한|weak:약한|heavy:무거운|light:가벼운; 빛|dark:어두운|bright:밝은|dirty:더러운|clean:깨끗한; 청소하다|wet:젖은|dry:마른|beautiful:아름다운|wonderful:멋진|great:훌륭한",
    e5: "day:날, 낮|afternoon:오후|evening:저녁|first:첫 번째의|second:두 번째의; 초|third:세 번째의|tea:차|food:음식|snack:간식|fruit:과일|vegetable:채소|meat:고기|sugar:설탕|salt:소금|cheese:치즈|butter:버터|noodle:국수|sweet:달콤한|salty:짠|spicy:매운|sour:신|delicious:맛있는|neck:목|shoulder:어깨|knee:무릎|back:등; 뒤로|stomach:배, 위|heart:심장, 마음|headache:두통|stomachache:복통|fever:열|cough:기침|medicine:약|dentist:치과의사|hurt:다치게 하다, 아프다|rest:휴식; 쉬다|computer:컴퓨터|phone:전화기|television:텔레비전|beach:해변|island:섬|forest:숲|lake:호수|ocean:대양|nature:자연|animal:동물|insect:곤충|plant:식물; 심다|map:지도|place:장소|way:길, 방법|corner:모퉁이|post office:우체국|north:북쪽|south:남쪽|east:동쪽|west:서쪽|job:직업, 일|work:일하다; 일|singer:가수|pilot:조종사|artist:예술가|writer:작가|scientist:과학자|firefighter:소방관|engineer:기술자|dream:꿈; 꿈꾸다|future:미래|tell:말해 주다|speak:말하다|call:부르다, 전화하다|live:살다|stay:머무르다|leave:떠나다|wake:깨다|drive:운전하다|sell:팔다|use:사용하다|always:항상|usually:보통|often:자주|sometimes:가끔|never:결코 ~ 않다|early:이른; 일찍|late:늦은; 늦게|cry:울다|laugh:웃다|smile:미소; 미소 짓다|angry:화난|afraid:두려워하는|excited:신이 난|bored:지루해하는|surprised:놀란|enjoy:즐기다|worry:걱정하다|remember:기억하다|forget:잊다|try:시도하다|hope:바라다|healthy:건강한",
    e6: "month:달, 월|year:해, 연도|January:1월|February:2월|March:3월|April:4월|May:5월|June:6월|July:7월|August:8월|September:9월|October:10월|November:11월|December:12월|season:계절|tomorrow:내일|yesterday:어제|tonight:오늘 밤|soon:곧|later:나중에|ago:~전에|already:이미|still:아직, 여전히|grade:학년, 성적|subject:과목|lesson:수업, 교훈|classmate:반 친구|uniform:교복, 제복|middle school:중학교|elementary:초등의|cousin:사촌|uncle:삼촌|aunt:이모, 고모|son:아들|daughter:딸|parent:부모|neighbor:이웃|guest:손님|king:왕|queen:여왕|prince:왕자|princess:공주|castle:성|village:마을|building:건물|floor:층, 바닥|wall:벽|stairs:계단|elevator:엘리베이터|key:열쇠|country:나라|world:세계|earth:지구|culture:문화|history:역사|language:언어|festival:축제|contest:대회|prize:상|club:동아리|member:회원|leader:지도자|rule:규칙|safe:안전한|danger:위험|accident:사고|trash:쓰레기|recycle:재활용하다|save:구하다, 아끼다|health:건강|exercise:운동; 운동하다|choose:고르다|decide:결정하다|agree:동의하다|believe:믿다|understand:이해하다|explain:설명하다|bring:가져오다|send:보내다|carry:나르다|build:짓다|fix:고치다|change:바꾸다; 변화|become:~이 되다|nervous:긴장한|proud:자랑스러운|lonely:외로운|honest:정직한|careful:조심하는|enough:충분한|almost:거의|between:~사이에|through:~을 통해|across:건너편에|along:~을 따라|maybe:아마도|probably:아마|instead:대신에|tradition:전통|temperature:온도"
  };

