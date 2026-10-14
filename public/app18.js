  /* =========================================================
   * 우리 반 (반 만들기 · 초대 코드 · 과제 · 학생 현황 · 결과 제출)
   * ======================================================= */
  const clOk = () => !!(cloudMode && window.Cloud && Cloud.call && currentUser);
  const CL_ERR = {
    no_class: '그 코드의 반을 찾지 못했어요. 코드를 다시 확인해 주세요.', own_class: '내가 만든 반이에요. 학생 계정으로 참여해 주세요.',
    too_many: '더 만들거나 참여할 수 없어요. 쓰지 않는 반을 먼저 정리해 주세요.', full: '이 반은 인원이 꽉 찼어요(200명).',
    no_assign: '과제를 찾지 못했어요. 선생님이 지웠을 수 있어요.', bad_input: '입력한 내용을 다시 확인해 주세요.',
    auth: '로그인이 만료됐어요. 다시 로그인해 주세요.', missing: '우리 반 기능은 아직 준비 중이에요. 운영자가 서버 설정을 마치면 바로 쓸 수 있어요.',
    network: '서버에 연결하지 못했어요. 인터넷 연결을 확인해 주세요.', too_many_tries: '틀린 코드를 너무 많이 넣었어요. 내일 다시 시도하거나 선생님께 코드를 확인해 주세요.'
  };
  const clMsg = e => CL_ERR[e && e.code] || '잠시 후 다시 시도해 주세요.';
  const CL_KIND = { test: '시험', study: '단어 학습' };
  const clKey = () => 'vocapro_cls:' + currentUser;
  const clCache = () => loadJson(clKey()) || { joined: 0, pending: 0 };
  let CL = null, CLV = { id: null, tab: 'stu', open: null, data: null };
  const clDate = s => { if (!s) return ''; const d = new Date(s); return isNaN(d) ? '' : d.toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' }); };
  const clDue = due => { if (!due) return ''; const left = Math.round((new Date(due + 'T23:59:59').getTime() - Date.now()) / DAY); return left < 0 ? '마감 지남' : left === 0 ? '오늘 마감' : `${clDate(due)}까지`; };
  const clLoading = t => `<div class="cl-load">${MASCOT('think')}<span>${t || '불러오는 중...'}</span></div>`;
  function clFail(e, back) { $('sheetBody').innerHTML = `<div class="cl-load">${MASCOT('sleep')}<span>${esc(clMsg(e))}</span></div>${back ? `<button class="btn btn-soft btn-block" data-act="${back}">돌아가기</button>` : ''}`; }

  function classEntryHtml() {
    if (!clOk()) return '';
    const c = clCache(), p = !isTeacher() && c.pending > 0;
    const sub = isTeacher() ? '반 만들기, 과제 내기, 학생별 학습 현황' : c.joined ? (p ? `남은 과제 ${c.pending}개` : '과제와 결과를 확인해요') : '선생님께 받은 코드로 반에 참여해요';
    return `<button class="mg-entry${p ? ' cl-hot' : ''}" data-act="class-open"><span class="mg-ico i-sun">${IC.users}</span><span class="mg-txt"><b>우리 반</b><small>${sub}</small></span>${p ? `<span class="cl-badge">${c.pending}</span>` : ''}<span class="mg-chev"></span></button>`;
  }
  function clSaveCache(r) {
    const pending = (r.joined || []).reduce((s, c) => s + c.assignments.filter(a => !a.mine && !(a.due && clDue(a.due) === '마감 지남')).length, 0);
    try { LS.setItem(clKey(), JSON.stringify({ joined: (r.joined || []).length, pending })); } catch (e) {}
  }

  ACTIONS['class-open'] = async () => {
    if (!clOk()) return say(kidMode ? '이 기기에만 저장하는 계정(만 14세 미만)은 반에 참여할 수 없어요.' : '우리 반은 로그인한 서버 계정에서만 쓸 수 있어요.');
    openSheet('우리 반', clLoading()); const tok = sheetTok;
    let r; try { r = await Cloud.call('voca_class_mine'); } catch (e) { return tok === sheetTok && clFail(e); }
    CL = r; clSaveCache(CL); if (tok !== sheetTok) return; clHome();
    if (CL.joined.length) clReport(true);
  };
  function clHome() {
    const r = CL || { owned: [], joined: [] }, teach = isTeacher();
    let h = '';
    if (teach || r.owned.length) {
      h += `<div class="cl-sec"><h4 class="syn-h">내가 만든 반</h4>${r.owned.length ? `<div class="menu-list">${r.owned.map(c => `<button data-act="cl-class" data-id="${c.id}"><span class="cl-li"><b>${esc(c.name)}</b><small>학생 ${c.members}명 · 과제 ${c.assignments}개 · 코드 ${esc(c.code)}</small></span></button>`).join('')}</div>` : '<p class="muted cl-p">아직 만든 반이 없어요.</p>'}
        <div class="cl-new"><input type="text" id="clName" maxlength="40" placeholder="반 이름 (예: 2학년 3반 영어)"><button class="btn btn-primary" data-act="cl-create">반 만들기</button></div></div>`;
    }
    if (!teach || r.joined.length) {
      h += r.joined.map(c => `<div class="cl-sec card cl-cls"><div class="cl-head"><div><b>${esc(c.name)}</b><small>${esc([c.school, c.teacher && c.teacher + ' 선생님'].filter(Boolean).join(' · '))}</small></div><button class="btn btn-sm btn-soft" data-act="cl-leave" data-id="${c.id}">나가기</button></div>
        ${c.assignments.length ? c.assignments.map(a => `<button class="cl-asg" data-act="cl-do" data-id="${a.id}"><span class="cl-li"><b>${esc(a.title)}</b><small>${CL_KIND[a.kind] || ''} · ${a.count}단어${a.due ? ' · ' + clDue(a.due) : ''}</small></span>${a.mine ? `<span class="cl-done">${a.mine.score}점</span>` : '<span class="cl-todo">시작</span>'}</button>`).join('') : '<p class="muted cl-p">아직 과제가 없어요.</p>'}</div>`).join('');
      h += `<div class="cl-sec"><h4 class="syn-h">반 참여하기</h4><div class="cl-new"><input type="text" id="clCode" maxlength="6" placeholder="초대 코드 6자리" autocapitalize="characters" autocomplete="off"><button class="btn btn-primary" data-act="cl-join">참여</button></div>
        <label class="cl-agree"><input type="checkbox" id="clAgree"> 이 반 선생님에게 내 이름${isTeacher() ? '' : ', 학번'}, 학습 요약(학습한 단어 수, 정답률, 연속 학습, 많이 틀린 단어, 최근 시험 점수), 과제 결과, 앱을 켜 두는 동안의 접속 상태와 지금 하는 학습을 보여 주는 데 동의해요. 반에서 나가면 선생님 화면에서 바로 지워져요.</label></div>`;
    }
    $('sheetTitle').textContent = '우리 반';
    $('sheetBody').innerHTML = `<div class="form-stack cl">${h}</div>`;
  }
  ACTIONS['cl-home'] = () => ACTIONS['class-open']();
  ACTIONS['cl-create'] = async el => {
    const name = (($('clName') || {}).value || '').trim(); if (!name) return toast('반 이름을 적어 주세요.');
    const p = config.profile || {}; el.disabled = true;
    try { const r = await Cloud.call('voca_class_create', { p_name: name, p_teacher: p.name || '', p_school: p.school || '' }); toast(`'${r.name}' 반을 만들었어요. 초대 코드는 ${r.code}예요.`); clDetail(r.id); }
    catch (e) { el.disabled = false; say(clMsg(e)); }
  };
  ACTIONS['cl-join'] = async el => {
    const code = (($('clCode') || {}).value || '').trim().toUpperCase();
    if (!/^[A-Z0-9]{6}$/.test(code)) return toast('초대 코드 6자리를 적어 주세요.');
    if (!($('clAgree') || {}).checked) return toast('선생님에게 보여 주는 정보에 동의해야 참여할 수 있어요.');
    const p = config.profile || {}; el.disabled = true;
    try { const r = await Cloud.call('voca_class_join', { p_code: code, p_name: p.name || currentLabel || '', p_sno: isTeacher() ? '' : (p.sno || '') }); toast(`'${r.name}' 반에 참여했어요.`); await ACTIONS['class-open'](); }
    catch (e) { el.disabled = false; say(clMsg(e)); }
  };
  ACTIONS['cl-leave'] = async el => {
    if (!await ask('이 반에서 나갈까요?\n선생님 화면에서 내 학습 현황과 과제 결과가 지워져요.', { ok: '나가기', danger: true })) return;
    try { await Cloud.call('voca_class_leave', { p_class: +el.dataset.id }); toast('반에서 나왔어요.'); ACTIONS['class-open'](); } catch (e) { say(clMsg(e)); }
  };

  /* ----- 선생님: 반 상세 ----- */
  async function clDetail(id, keep) {
    CLV.id = id; if (!keep) { CLV.tab = 'stu'; CLV.open = null; }
    openSheet('우리 반', clLoading()); const tok = sheetTok;
    let d; try { d = await Cloud.call('voca_class_detail', { p_class: id }); } catch (e) { return tok === sheetTok && clFail(e, 'cl-home'); }
    if (tok !== sheetTok || CLV.id !== id) return; CLV.data = d; clDraw();
  }
  ACTIONS['cl-class'] = el => clDetail(+el.dataset.id);
  ACTIONS['cl-tab'] = el => { CLV.tab = el.dataset.t; clDraw(); };
  ACTIONS['cl-stu'] = el => { CLV.open = CLV.open === el.dataset.uid ? null : el.dataset.uid; clDraw(); };
  function clWeakTop(lists, n) {
    const m = new Map();
    lists.forEach(l => (Array.isArray(l) ? l : []).forEach(x => { const w = Array.isArray(x) ? x[0] : x; if (!w) return; const k = String(w).toLowerCase(); const o = m.get(k) || { w: String(w), mean: Array.isArray(x) ? x[1] || '' : '', c: 0 }; o.c++; m.set(k, o); }));
    return [...m.values()].sort((a, b) => b.c - a.c).slice(0, n);
  }
  function clDraw() {
    const d = CLV.data, c = d.class, mem = d.members, asg = d.assignments;
    $('sheetTitle').textContent = c.name;
    const head = `<div class="cl-code"><div><small>초대 코드</small><b>${esc(c.code)}</b></div><button class="btn btn-sm btn-soft" data-act="cl-copy" data-code="${esc(c.code)}">복사</button></div>
      <button class="btn btn-primary btn-block lv-open" data-act="cl-live"><i class="lv-dot"></i>실시간 보기 (누가 들어와서 무엇을 하는지)</button>
      <p class="muted cl-p">학생은 홈의 '우리 반'에서 이 코드를 넣으면 들어와요. 만 14세 미만(이 기기에만 저장하는 계정)은 참여할 수 없어요.</p>
      <div class="seg"><button class="${CLV.tab === 'stu' ? 'on' : ''}" data-act="cl-tab" data-t="stu">학생 ${mem.length}명</button><button class="${CLV.tab === 'asg' ? 'on' : ''}" data-act="cl-tab" data-t="asg">과제 ${asg.length}개</button><button class="${CLV.tab === 'rank' ? 'on' : ''}" data-act="cl-tab" data-t="rank">랭킹</button></div>`;
    let body = '';
    if (CLV.tab === 'rank') body = rkHtml(mem, false);
    else if (CLV.tab === 'stu') {
      const weak = clWeakTop(mem.map(m => (m.progress && m.progress.weak) || []), 10);
      body = mem.length ? `${weak.length ? `<div class="cl-weak"><h4 class="syn-h">반에서 많이 틀린 단어</h4><div class="cl-chips">${weak.map(x => `<span>${esc(x.w)}${x.mean ? ` <small>${esc(x.mean)}</small>` : ''} <b>${x.c}명</b></span>`).join('')}</div></div>` : ''}
        <div class="cl-table"><div class="cl-tr cl-th"><span>이름</span><span>최근 학습</span><span>7일 단어</span><span>정답률</span><span>과제</span></div>
        ${mem.map(m => { const p = m.progress || {}; const open = CLV.open === m.uid; return `<button class="cl-tr${open ? ' on' : ''}" data-act="cl-stu" data-uid="${esc(m.uid)}"><span><b>${esc(m.name || '이름 없음')}</b>${m.sno ? `<small>${esc(m.sno)}</small>` : ''}</span><span>${p.last ? clDate(p.last) : '-'}</span><span>${p.n7 != null ? esc(p.n7) : '-'}</span><span>${p.acc7 != null ? esc(p.acc7) + '%' : '-'}</span><span>${esc(m.done)}/${asg.length}</span></button>${open ? clStuHtml(m) : ''}`; }).join('')}</div>`
        : `<div class="cl-load">${MASCOT('happy')}<span>아직 들어온 학생이 없어요. 초대 코드를 칠판에 적어 주세요.</span></div>`;
    } else {
      body = `<button class="btn btn-primary btn-block" data-act="cl-anew">${IC.plus} 과제 내기</button>
        ${asg.length ? `<div class="menu-list">${asg.map(a => `<button data-act="cl-ares" data-id="${a.id}"><span class="cl-li"><b>${esc(a.title)}</b><small>${CL_KIND[a.kind]} · ${a.count}단어${a.kind === 'test' ? ` · ${a.n}문제` : ''}${a.due ? ' · ' + clDue(a.due) : ''} · 제출 ${a.subs}/${mem.length}${a.avg != null ? ` · 평균 ${a.avg}점` : ''}</small></span></button>`).join('')}</div>` : '<p class="muted cl-p">아직 낸 과제가 없어요.</p>'}`;
    }
    $('sheetBody').innerHTML = `<div class="form-stack cl">${head}${body}<button class="btn btn-soft btn-block" data-act="cl-csv">학습 현황 · 과제 점수 엑셀로 받기</button><div class="row cl-foot"><button class="btn btn-soft" data-act="cl-home">반 목록</button><button class="btn btn-soft cl-danger" data-act="cl-delete">반 삭제</button></div></div>`;
  }
  function clStuHtml(m) {
    const p = m.progress || {};
    const tests = (Array.isArray(p.tests) ? p.tests : []).filter(Array.isArray).map(t => `<span>${esc(t[2] || '')} <b>${esc(t[1])}점</b> <small>${clDate(t[0])}</small></span>`).join('');
    return `<div class="cl-stu">${p.at ? `<div class="cl-kv"><span>전체 단어 <b>${esc(p.total || 0)}</b></span><span>마스터 <b>${esc(p.mastered || 0)}</b></span><span>연속 학습 <b>${esc(p.streak || 0)}일</b></span><span>오늘 <b>${esc(p.today || 0)}</b></span></div>
      ${Array.isArray(p.weak) && p.weak.length ? `<h4 class="syn-h">많이 틀린 단어</h4><div class="cl-chips">${p.weak.filter(Array.isArray).map(x => `<span>${esc(x[0])} <small>${esc(x[1] || '')}</small> <b>${esc(x[2])}회</b></span>`).join('')}</div>` : ''}
      ${tests ? `<h4 class="syn-h">최근 시험</h4><div class="cl-chips">${tests}</div>` : ''}<p class="muted cl-p">${clDate(p.at)} 기준</p>` : '<p class="muted cl-p">아직 학습 기록이 올라오지 않았어요. 학생이 앱을 열면 올라와요.</p>'}
      <button class="btn btn-sm btn-soft cl-danger" data-act="cl-kick" data-uid="${esc(m.uid)}" data-name="${esc(m.name)}">반에서 내보내기</button></div>`;
  }
  /* ----- 우리 반 랭킹: 7일 학습량 · 정답률 · 연속 학습 · 마스터 단어로 순위. 시상대와 칠판용 큰 화면 (클래스카드 반 랭킹) ----- */
  const RK_M = [['n7', '7일 학습', '개'], ['acc7', '정답률', '%'], ['streak', '연속 학습', '일'], ['mastered', '마스터', '개']];
  const RK_C = ['#3182f6', '#f04452', '#03b26c', '#8b5cf6', '#fe9800', '#0aa5b4', '#e64980', '#1b64da'];
  const rkColor = s => RK_C[[...String(s || '')].reduce((a, c) => a + c.charCodeAt(0), 0) % RK_C.length];
  function rkRank(mem, m) {
    const v = x => { const p = x.progress || {}, n = p[m]; return n == null || n === '' ? -1 : +n || 0; };
    // 정답률은 7일 동안 10개 넘게 푼 학생만 줄을 세워요(한두 개만 풀고 100%가 1등이 되지 않게).
    const ok = x => m !== 'acc7' || ((x.progress || {}).n7 || 0) >= 10;
    return mem.filter(x => ok(x) && v(x) > 0).map(x => ({ name: x.name || '이름 없음', sno: x.sno || '', v: v(x) })).sort((a, b) => b.v - a.v || a.name.localeCompare(b.name, 'ko'));
  }
  function rkHtml(mem, big) {
    const m = CLV.rk || 'n7', [, label, unit] = RK_M.find(x => x[0] === m), list = rkRank(mem, m);
    const chips = `<div class="rk-ms">${RK_M.map(([k, n]) => `<button class="${k === m ? 'on' : ''}" data-act="cl-rk" data-m="${k}">${n}</button>`).join('')}</div>`;
    if (!list.length) return chips + `<div class="cl-load">${MASCOT('think')}<span>${m === 'acc7' ? '7일 동안 10개 넘게 푼 학생이 아직 없어요.' : '아직 순위를 매길 학습 기록이 없어요.'}</span></div>`;
    const top = [list[1], list[0], list[2]], medal = ['#9aa5b1', '#f5a524', '#c8783a'];
    const pod = `<div class="rk-pod">${top.map((x, i) => { const r = [2, 1, 3][i]; return x ? `<div class="rk-p r${r}"><div class="rk-av" style="background:${rkColor(x.name)}">${esc([...x.name][0] || '?')}<i style="background:${medal[i]}">${r}</i></div><b>${esc(x.name)}</b><small>${x.v.toLocaleString()}${unit}</small><div class="rk-ped">${r}</div></div>` : '<div></div>'; }).join('')}</div>`;
    if (big) return pod + chips;
    const max = list[0].v || 1;
    const rest = list.slice(3).map((x, i) => `<div class="rk-row"><span>${i + 4}</span><b>${esc(x.name)}${x.sno ? ` <small class="muted">${esc(x.sno)}</small>` : ''}</b><em>${x.v.toLocaleString()}${unit}</em><div class="rk-bar"><i style="width:${Math.round(x.v / max * 100)}%"></i></div></div>`).join('');
    return `${chips}${pod}${rest ? `<div class="rk-list">${rest}</div>` : ''}<button class="btn btn-primary btn-block" data-act="cl-rk-big">${IC.podium} 칠판에 크게 띄우기</button><p class="muted cl-p">${label} 기준 · 학생이 앱을 열 때 올라온 기록이에요.</p>`;
  }
  ACTIONS['cl-rk'] = el => { CLV.rk = el.dataset.m; if (TT && TT.kind === 'rank') ttDraw(); else clDraw(); };
  ACTIONS['cl-rk-big'] = () => ttOpen('rank', {});
  function rkDraw() {
    const ov = $('ttOv'), d = CLV.data; if (!ov || !d) return;
    const m = CLV.rk || 'n7', label = RK_M.find(x => x[0] === m)[1];
    const conf = Array.from({ length: 36 }, (_, i) => `<i style="left:${(i * 97) % 100}%;background:${RK_C[i % RK_C.length]};animation-delay:${-(i * 0.37) % 3.2}s;animation-duration:${2.6 + (i % 5) * 0.3}s"></i>`).join('');
    ov.innerHTML = `${ttTop(d.class.name + ' · 랭킹')}<div class="rk-conf">${conf}</div><div class="rk-big"><h2>${m === 'n7' ? '이번 주 우리 반 학습 왕' : `우리 반 ${esc(label)} 왕`}</h2><p class="rk-sub">${esc(d.class.name)} · 학생 ${d.members.length}명</p>${rkHtml(d.members, true)}</div>`;
  }
  ACTIONS['cl-copy'] = async el => { try { await navigator.clipboard.writeText(el.dataset.code); toast('초대 코드를 복사했어요.'); } catch (e) { toast('코드: ' + el.dataset.code); } };
  ACTIONS['cl-kick'] = async el => {
    if (!await ask(`${el.dataset.name || '이 학생'} 학생을 반에서 내보낼까요?\n이 반의 과제 결과도 함께 지워져요.`, { ok: '내보내기', danger: true })) return;
    try { await Cloud.call('voca_class_kick', { p_class: CLV.id, p_uid: el.dataset.uid }); CLV.open = null; clDetail(CLV.id, true); } catch (e) { say(clMsg(e)); }
  };
  ACTIONS['cl-delete'] = async () => {
    if (!await ask(`'${CLV.data.class.name}' 반을 삭제할까요?\n학생 목록, 과제, 제출 결과가 모두 지워지고 되돌릴 수 없어요.`, { ok: '삭제', danger: true })) return;
    try { await Cloud.call('voca_class_delete', { p_class: CLV.id }); toast('반을 삭제했어요.'); ACTIONS['class-open'](); } catch (e) { say(clMsg(e)); }
  };

  /* ----- 선생님: 과제 내기 · 결과 ----- */
  ACTIONS['cl-anew'] = () => {
    const books = categories.filter(c => c.words.length);
    if (!books.length) return toast('먼저 단어장에 단어를 담아 주세요. 기초 · 중학교 · 고등학교 · 수능 단어에서 바로 담을 수 있어요.');
    const due = new Date(Date.now() + 7 * DAY), dv = `${due.getFullYear()}-${String(due.getMonth() + 1).padStart(2, '0')}-${String(due.getDate()).padStart(2, '0')}`;
    $('sheetTitle').textContent = '과제 내기';
    $('sheetBody').innerHTML = `<div class="form-stack cl">
      <label class="setting-label" for="caBook">단어장</label>
      <select id="caBook">${books.map(c => `<option value="${esc(c.id)}"${c.id === currentCategoryId ? ' selected' : ''}>${esc(c.name)} (${c.words.length}개)</option>`).join('')}</select>
      <label class="setting-label" for="caTitle">과제 이름 (비우면 단어장 이름)</label>
      <input type="text" id="caTitle" maxlength="60" placeholder="예: Day 3 단어 시험">
      <label class="setting-label">종류</label>
      <div class="seg" id="caKind"><button class="on" data-act="pt-opt" data-g="caKind" data-v="test">시험 (점수 제출)</button><button data-act="pt-opt" data-g="caKind" data-v="study">단어 학습 (뜻 고르기)</button></div>
      <label class="setting-label">시험 문제 수</label>
      <div class="seg" id="caNum">${[10, 20, 30, 50].map(k => `<button class="${k === 20 ? 'on' : ''}" data-act="pt-opt" data-g="caNum" data-v="${k}">${k}문제</button>`).join('')}</div>
      <label class="setting-label" for="caDue">마감일</label>
      <input type="date" id="caDue" value="${dv}">
      <p class="muted cl-p">학생은 단어장을 그대로 받아 풀고, 끝나면 점수와 틀린 단어가 자동으로 제출돼요. 여러 번 풀면 가장 높은 점수가 남아요.</p>
      <div class="row"><button class="btn btn-soft" data-act="cl-back">취소</button><button class="btn btn-primary" data-act="cl-acreate">과제 내기</button></div></div>`;
  };
  ACTIONS['cl-back'] = () => clDetail(CLV.id, true);
  ACTIONS['cl-acreate'] = async el => {
    const cat = categories.find(c => c.id === ($('caBook') || {}).value); if (!cat) return;
    const kind = (document.querySelector('#caKind .on') || { dataset: { v: 'test' } }).dataset.v, n = +(document.querySelector('#caNum .on') || { dataset: { v: 20 } }).dataset.v;
    const words = cat.words.slice(0, 500).map(w => [w.word.slice(0, 80), (w.meaning || '').slice(0, 120)]);
    el.disabled = true;
    try {
      await Cloud.call('voca_assign_create', { p_class: CLV.id, p_title: (($('caTitle') || {}).value || '').trim() || cat.name, p_kind: kind, p_n: n, p_due: ($('caDue') || {}).value || null, p_words: words });
      toast(cat.words.length > 500 ? '과제를 냈어요. 앞의 500단어만 들어갔어요.' : '과제를 냈어요.'); CLV.tab = 'asg'; clDetail(CLV.id, true);
    } catch (e) { el.disabled = false; say(clMsg(e)); }
  };
  ACTIONS['cl-ares'] = async el => {
    const id = +el.dataset.id; openSheet('과제 결과', clLoading()); const tok = sheetTok;
    let r; try { r = await Cloud.call('voca_assign_results', { p_assign: id }); } catch (e) { return tok === sheetTok && clFail(e, 'cl-back'); }
    if (tok !== sheetTok) return;
    const a = r.assign, done = r.rows.filter(x => x.score != null), left = r.rows.filter(x => x.score == null);
    const avg = done.length ? Math.round(done.reduce((s, x) => s + x.score, 0) / done.length) : null;
    const weak = clWeakTop(done.map(x => x.wrong), 10);
    $('sheetTitle').textContent = a.title;
    $('sheetBody').innerHTML = `<div class="form-stack cl">
      <div class="cl-kv"><span>${CL_KIND[a.kind]}</span><span>${a.count}단어</span>${a.due ? `<span>${clDue(a.due)}</span>` : ''}<span>제출 <b>${done.length}/${r.rows.length}</b></span>${avg != null ? `<span>평균 <b>${avg}점</b></span>` : ''}</div>
      ${weak.length ? `<h4 class="syn-h">많이 틀린 단어</h4><div class="cl-chips">${weak.map(x => `<span>${esc(x.w)} <b>${x.c}명</b></span>`).join('')}</div>` : ''}
      ${done.length ? `<div class="cl-table"><div class="cl-tr cl-th"><span>이름</span><span>점수</span><span>정답</span><span>시간</span><span>횟수</span></div>${done.sort((x, y) => y.score - x.score).map(x => `<div class="cl-tr"><span><b>${esc(x.name || '이름 없음')}</b>${x.sno ? `<small>${esc(x.sno)}</small>` : ''}</span><span><b>${x.score}</b></span><span>${x.ok}/${x.n}</span><span>${x.sec >= 60 ? Math.floor(x.sec / 60) + '분' : x.sec + '초'}</span><span>${x.tries}회</span></div>`).join('')}</div>` : '<p class="muted cl-p">아직 제출한 학생이 없어요.</p>'}
      ${left.length ? `<h4 class="syn-h">아직 안 한 학생 ${left.length}명</h4><div class="cl-chips">${left.map(x => `<span>${esc(x.name || '이름 없음')}${x.sno ? ` <small>${esc(x.sno)}</small>` : ''}</span>`).join('')}</div>` : ''}
      <div class="row cl-foot"><button class="btn btn-soft" data-act="cl-back">돌아가기</button><button class="btn btn-soft cl-danger" data-act="cl-adel" data-id="${a.id}">과제 삭제</button></div></div>`;
  };
  ACTIONS['cl-adel'] = async el => {
    if (!await ask('이 과제를 삭제할까요?\n학생들의 제출 결과도 함께 지워져요.', { ok: '삭제', danger: true })) return;
    try { await Cloud.call('voca_assign_delete', { p_assign: +el.dataset.id }); CLV.tab = 'asg'; clDetail(CLV.id, true); } catch (e) { say(clMsg(e)); }
  };

  /* ----- 학생: 과제 풀기 · 결과 제출 ----- */
  ACTIONS['cl-do'] = async el => {
    const id = +el.dataset.id; el.disabled = true;
    let a; try { a = await Cloud.call('voca_assign_get', { p_assign: id }); } catch (e) { el.disabled = false; return say(clMsg(e)); }
    const list = (Array.isArray(a.words) ? a.words : []).filter(x => Array.isArray(x) && x[0] && x[1]);
    if (!list.length) { el.disabled = false; return say('과제에 단어가 없어요.'); }
    const name = `${a.class} · ${a.title}`.slice(0, 60);
    // 이름이 아니라 과제 번호로 찾아요(이름은 40자로 잘리고 같은 이름 단어장이 있을 수 있어요). 비었으면 다시 채워요
    let cat = categories.find(c => c.asg === a.id);
    if (!cat || !cat.words.length) {
      el.textContent = '단어장 준비 중...';
      await dictPreload(list.map(x => x[0]));
      const isNew = !cat; if (isNew) cat = { id: 'c' + uid(), name, words: [], asg: a.id }; const seen = new Set();
      for (const [w, m] of list) {
        const k = String(w).toLowerCase(); if (seen.has(k)) continue; seen.add(k);
        let full = null; try { full = await dictGet(w); } catch (e) {}
        cat.words.push(sanitizeWord({ ...(full || {}), id: uid(), word: String(w), meaning: String(m) }));
      }
      if (isNew) categories.push(cat); syncStorage();
    }
    closeSheet();
    if (allWords().length < 4) return say('시험과 뜻 고르기는 전체 단어가 4개 이상 있어야 해요.');
    if (a.kind === 'test') startSession('test', { type: 'cat', id: cat.id }, Math.min(a.n || 20, cat.words.length));
    else startSession('choice', { type: 'cat', id: cat.id }, 0);
    if (S.active) S.assign = { id: a.id, title: a.title };
  };
  async function clSubmit(asg, ok, n, sec, wrong) {
    const box = document.createElement('div'); box.className = 'cl-sub'; box.textContent = `'${asg.title}' 결과를 선생님에게 보내는 중...`;
    const res = document.querySelector('#stBody .result'); if (res) res.insertBefore(box, res.firstChild);
    try {
      const r = await Cloud.call('voca_assign_submit', { p_assign: asg.id, p_ok: ok, p_n: Math.max(1, n), p_sec: sec, p_wrong: wrong.slice(0, 100) });
      box.classList.add('ok'); box.textContent = `과제를 제출했어요. 이번 ${r.score}점${r.tries > 1 ? `, 최고 ${r.best}점(${r.tries}번째)` : ''}`;
      const c = clCache(); if (r.tries === 1 && c.pending > 0) { c.pending--; try { LS.setItem(clKey(), JSON.stringify(c)); } catch (e) {} }
      clReport(true);
    } catch (e) { box.classList.add('bad'); box.textContent = '제출하지 못했어요. ' + clMsg(e) + ' 과제를 다시 풀면 다시 제출돼요.'; }
  }

  /* ----- 학생: 학습 요약 올리기 ----- */
  let clLastReport = 0;
  async function clReport(force) {
    if (!clOk() || isTeacher() && !force) return;
    if (!clCache().joined) return;
    if (!force && Date.now() - clLastReport < 180000) return;
    clLastReport = Date.now();
    const c = counts(); let n7 = 0, ok7 = 0, last = '';
    for (let i = 0; i < 7; i++) { const d = stats.days[dayKey(addDays(startOfDay(), -i))]; if (d) { n7 += d.n || 0; ok7 += d.ok || 0; } }
    Object.keys(stats.days).forEach(k => { if ((stats.days[k].n || 0) > 0 && k > last) last = k; });
    const weak = allWords().filter(x => x.w.miss > 0).sort((a, b) => b.w.miss - a.w.miss).slice(0, 10).map(x => [x.w.word.slice(0, 60), (x.w.meaning || '').slice(0, 40), x.w.miss]);
    const tests = (stats.tests || []).slice(-5).reverse().map(t => [t.d, Math.round(t.ok / t.n * 100), String(t.src || '').slice(0, 40)]);
    const p = { total: c.total, mastered: c.mastered, due: c.due, streak: streak(), today: (stats.days[dayKey()] || { n: 0 }).n, n7, acc7: n7 ? Math.round(ok7 / n7 * 100) : null, last, weak, tests, at: Date.now() };
    try { await Cloud.call('voca_class_report', { p_progress: p }); } catch (e) {}
  }

