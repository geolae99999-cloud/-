// 새 기능 확인 2: 주간 리포트, 연속 학습 보호권, 진동 피드백. 틀리면 FAIL 을 찍고 1로 끝나요.
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, 'site'), shots = path.join(__dirname, 'shots', 'feat2');
fs.mkdirSync(shots, { recursive: true });
const srv = http.createServer((q, r) => { let f = path.join(root, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html'; fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': f.endsWith('.js') ? 'text/javascript' : f.endsWith('.css') ? 'text/css' : f.endsWith('.json') ? 'application/json' : 'text/html; charset=utf-8' }); r.end(d); }); }).listen(8775);
const fails = [], res = {};
const eq = (name, got, want) => { const ok = JSON.stringify(got) === JSON.stringify(want); res[name] = ok ? 'ok' : { got, want }; if (!ok) fails.push(name); };
(async () => {
  const b = await chromium.launch(); const errs = [];
  for (const vp of [{ width: 390, height: 844 }, { width: 1440, height: 900 }]) {
    const tag = String(vp.width); const ctx = await b.newContext({ viewport: vp }); const p = await ctx.newPage();
    p.on('pageerror', e => errs.push(tag + ' ' + e.message));
    await require('./undef')(p, errs, tag);
    await p.route('https://cdn.jsdelivr.net/**', r => r.abort());
    // 진동은 가짜로 바꿔서 불린 값을 모아요
    await p.addInitScript(() => { try { window.speechSynthesis.speak = () => {}; } catch (e) {} window.__vib = []; Object.defineProperty(Navigator.prototype, 'vibrate', { configurable: true, value: function (x) { window.__vib.push(x); return true; } }); });
    const shot = n => p.screenshot({ path: path.join(shots, `${tag}-${n}.png`) });
    await p.goto('http://localhost:8775/'); await p.waitForSelector('#authScreen .auth-box');
    await p.click('[data-act="auth-mode"][data-m="signup"]'); await p.waitForTimeout(300);
    await p.fill('#auId', 'jiwoo'); await p.fill('#auPw', 'pass1234'); await p.fill('#auPw2', 'pass1234');
    await p.click('#auNext'); await p.waitForSelector('#auGrade', { state: 'attached' }); await p.evaluate(g => { document.getElementById('auGrade').value = g; }, 'm2'); await p.fill('#auName', '김지우'); await p.fill('#auSchool', '한빛중학교'); await p.fill('#auSno', '20315'); await p.check('#auTerms'); await p.fill('#capIn', await p.evaluate('capText')); await p.click('#auGo');
    await p.waitForSelector('#obOv'); await p.click('[data-ob="skip"]'); await p.waitForSelector('#ltOv'); await p.click('[data-lt="close"]');
    await p.waitForSelector('#recOv.show'); await p.click('[data-act="rec-add"]'); await p.waitForTimeout(400); await p.click('#recOv [data-act="rec-close"]'); await p.waitForTimeout(500);

    /* ---- 1. 주간 리포트 ---- */
    // 빈 기록에서도 그려져요
    await p.evaluate(() => { stats.days = {}; go('tabStats'); });
    eq(tag + ' wr empty msg', await p.textContent('.wr-msg'), '이번 주 첫 학습을 시작해 볼까요?');
    eq(tag + ' wr empty bars', await p.$$eval('.wr-row b', a => a.map(x => x.textContent)), ['0개', '0개']);
    await shot('01-report-empty');
    // 이번 주 월 53개(46 정답, 마스터 2) · 지난주 월 10개(5) + 수 20개(15, 마스터 1)
    await p.evaluate(() => {
      const mon = addDays(startOfDay(), -((new Date().getDay() + 6) % 7)), k = i => dayKey(addDays(mon, i));
      stats.days = { [k(0)]: { n: 53, ok: 46, m: 2 }, [k(-7)]: { n: 10, ok: 5 }, [k(-5)]: { n: 20, ok: 15, m: 1 } };
      go('tabStats');
    });
    const wr = await p.evaluate(() => { const r = weekReport(); return { cur: [r.cur.n, r.cur.acc, r.cur.days, r.cur.m, r.cur.best && r.cur.best.n], prev: [r.prev.n, r.prev.acc, r.prev.days, r.prev.m, r.prev.best && r.prev.best.n] }; });
    eq(tag + ' wr numbers', wr, { cur: [53, 87, 1, 2, 53], prev: [30, 67, 2, 1, 20] });
    eq(tag + ' wr msg', await p.textContent('.wr-msg'), '지난주보다 23개 더 공부했어요. 대단해요!');
    eq(tag + ' wr kv', await p.$$eval('.wr-kv > div', a => a.map(x => x.querySelector('b').textContent + '|' + x.querySelector('em').textContent)), ['87%|지난주보다 +20%p', '1일|지난주 2일', '2개|지난주보다 +1개', '월요일|53개 학습']);
    eq(tag + ' wr bar width', await p.$$eval('.wr-track i', a => a.map(x => x.style.width)), ['100%', '57%']);
    await shot('02-report');
    // 마스터 기록: 상자 4 → 5 가 될 때 그날 m 이 1 늘고, 같은 날 다시 맞혀도 그대로예요
    eq(tag + ' mastered count', await p.evaluate(() => { stats.days = {}; const w = sanitizeWord({ id: uid(), word: 'zz', meaning: '지지' }); w.box = 4; grade(w, true); grade(w, true); const a = stats.days[dayKey()].m; w.box = 5; w.last = ''; grade(w, true); return [a, stats.days[dayKey()].m]; }), [1, 1]);
    // 저장본을 거쳐도 m 이 남아요
    eq(tag + ' m sanitize', await p.evaluate(() => sanitizeStats({ days: { '2026-01-05': { n: 3, ok: 2, m: 1 } }, frzSeen: '2026-01-04' })), { days: { '2026-01-05': { n: 3, ok: 2, m: 1 } }, frzSeen: '2026-01-04' });

    /* ---- 2. 연속 학습 보호권 ---- */
    const seed = list => p.evaluate(l => { stats.days = {}; delete stats.frzSeen; l.forEach(i => { stats.days[dayKey(addDays(startOfDay(), -i))] = { n: 5, ok: 4 }; }); const s = streakInfo(); return { n: s.n, frz: s.frz, prot: s.prot.map(k => Math.round((startOfDay() - new Date(k + 'T00:00:00').getTime()) / DAY)), best: s.best }; }, list);
    const range = (a, z) => Array.from({ length: z - a + 1 }, (_, i) => a + i);
    // 9~3일 전 7일 연속 → 보호권 1장 → 2일 전 빠짐 → 보호 → 어제·오늘
    eq(tag + ' frz used', await seed([...range(3, 9), 1, 0]), { n: 9, frz: 0, prot: [2], best: 9 });
    // 6일만 하고 빠지면 보호권이 없어 끊겨요
    eq(tag + ' frz none', await seed([...range(2, 7), 0]), { n: 1, frz: 0, prot: [], best: 6 });
    // 이틀 빠지면 보호권이 있어도 끊기고 보호권은 남아요
    eq(tag + ' frz 2-gap', await seed([...range(4, 10), 1, 0]), { n: 2, frz: 1, prot: [], best: 7 });
    // 21일 연속이면 3번 받지만 최대 2장
    eq(tag + ' frz max', await seed(range(0, 20)), { n: 21, frz: 2, prot: [], best: 21 });
    // 7일 채운 다음 날(어제) 빠지고 오늘 아직 → 어제가 보호되고 연속 7일 유지 + 알림 한 번
    eq(tag + ' frz pending', await seed(range(2, 8)), { n: 7, frz: 0, prot: [1], best: 7 });
    await p.evaluate(() => { document.getElementById('toast').textContent = ''; go('tabHome'); });
    eq(tag + ' frz toast', /보호권이 어제를 지켜 줬어요\. 7일 연속 그대로예요!/.test(await p.textContent('#toast')), true);
    eq(tag + ' frz seen', await p.evaluate(() => stats.frzSeen === dayKey(addDays(startOfDay(), -1))), true);
    eq(tag + ' frz dot', await p.$$eval('.streak-card .day.frz', a => a.map(x => x.textContent.trim())), ['보호됨']);
    eq(tag + ' frz card', await p.textContent('.streak-card .streak-n') + '|' + await p.textContent('.streak-card .streak-txt .muted'), '7일 연속|어제 보호됨');
    await p.waitForTimeout(400); await shot('03-streak-protected');
    // 두 번째로 그려도 알림은 다시 안 나와요
    await p.evaluate(() => { document.getElementById('toast').textContent = ''; go('tabStats'); go('tabHome'); });
    eq(tag + ' frz toast once', await p.textContent('#toast'), '');
    // 보호권을 갖고 있으면 불꽃 옆 방패 배지에 장수가 보여요
    await seed(range(0, 13));
    await p.evaluate(() => go('tabHome'));
    eq(tag + ' frz badge', await p.textContent('.streak-fire .frz-badge'), '2');
    // 통계 탭 · 반 리포트도 같은 streak() 을 써요
    await seed([...range(3, 9), 1, 0]); await p.evaluate(() => go('tabStats'));
    eq(tag + ' stats tile', await p.textContent('.stat-tile.st-str b'), '9일');
    await p.evaluate(() => go('tabHome')); await shot('04-streak-badge');

    /* ---- 3. 진동 피드백 ---- */
    await p.evaluate(() => { window.__vib = []; startSession('choice', { type: 'all' }, 5); });
    await p.waitForSelector('#stBody .opt');
    await p.evaluate(() => { const i = S.options.findIndex(o => o.id === S.queue[S.idx].w.id); document.querySelectorAll('#stBody .opt')[i].click(); });
    await p.waitForFunction(() => S.idx === 1 && !S.locked && document.querySelector('#stBody .opt:not(:disabled)')); // 정답이면 0.7초 뒤 다음 문제
    await p.evaluate(() => { const i = S.options.findIndex(o => o.id !== S.queue[S.idx].w.id); document.querySelectorAll('#stBody .opt')[i].click(); });
    await p.waitForTimeout(300);
    eq(tag + ' vibrate study', await p.evaluate(() => window.__vib), [10, [30, 40, 30]]);
    await p.evaluate(() => exitSession(true)); await p.waitForTimeout(200);
    // 설정에서 끄면 저장되고 진동이 안 와요
    await p.evaluate(() => go('tabSettings')); await p.waitForTimeout(200);
    eq(tag + ' toggle default on', await p.isChecked('#cfgHaptic'), true);
    // 읽어주기 버튼 줄이 카드 밖으로 나가지 않아요
    eq(tag + ' tts buttons fit', await p.evaluate(() => { const r = document.querySelector('.tts-btns'), c = r.closest('.card') || r.parentElement; return [...r.children].every(x => x.getBoundingClientRect().right <= c.getBoundingClientRect().right + 0.5); }), true);
    await p.locator('#cfgHaptic').scrollIntoViewIfNeeded(); await shot('05-settings-haptic');
    await p.click('label.tg-row'); await p.waitForTimeout(100);
    eq(tag + ' toggle saved', await p.evaluate(() => [config.haptic, JSON.parse(localStorage.getItem(KEY_CFG)).haptic, loadConfig().haptic]), [false, false, false]);
    eq(tag + ' toggle synced', await p.evaluate(() => { const d = { categories: [], stats: { days: {} }, cfg: { haptic: true } }; const keep = config.haptic; applyRemote({ data: JSON.stringify(Object.assign(dataBlob(), { cfg: { haptic: true } })), updated: Date.now() }); const a = config.haptic; config.haptic = keep; syncStorage(); return a; }), true);
    await p.evaluate(() => { config.haptic = false; window.__vib = []; haptic(true); haptic(false); });
    eq(tag + ' vibrate off', await p.evaluate(() => window.__vib), []);
    await p.evaluate(() => go('tabSettings')); await p.waitForTimeout(100);
    await p.click('label.tg-row'); await p.waitForTimeout(100);
    eq(tag + ' toggle back on', await p.evaluate(() => [config.haptic, window.__vib.length]), [true, 1]);
    // 단어 게임(4지선다 퀘스트)도 울려요
    await p.evaluate(() => { window.__vib = []; wqOpen(); }); await p.waitForTimeout(300);
    if (await p.$('[data-wq="go"]')) {
      await p.click('[data-wq="go"]'); await p.waitForSelector('.wq-opt', { timeout: 6000 });
      for (const wrong of [false, true]) {
        await p.waitForFunction(() => WQ && WQ.view === 'play' && !WQ.lock && document.querySelector('.wq-opt') && Date.now() - WQ.qAt > 160);
        await p.evaluate(w => { const q = WQ.q, c = q.opts.indexOf(q.cur); wqPick(w ? (c + 1) % 4 : c); }, wrong);
      }
      eq(tag + ' vibrate game', await p.evaluate(() => window.__vib), [10, [30, 40, 30]]);
      await p.evaluate(() => { WQ.end = Date.now(); }); await p.waitForTimeout(800);
    } else { res[tag + ' vibrate game'] = 'skip (게임 화면 없음)'; }
    // 진동이 없는 기기에서는 조용히 넘어가요
    eq(tag + ' no vibrate api', await p.evaluate(() => { const d = Object.getOwnPropertyDescriptor(Navigator.prototype, 'vibrate'); delete Navigator.prototype.vibrate; let ok = true; try { config.haptic = true; haptic(true); haptic(false); } catch (e) { ok = false; } Object.defineProperty(Navigator.prototype, 'vibrate', d); return ok; }), true);
    await ctx.close();
  }
  console.log(JSON.stringify(res, null, 1)); console.log('ERRORS:', errs.length ? errs.join('\n') : 'none');
  console.log(fails.length ? 'FAIL: ' + fails.join(', ') : 'PASS'); await b.close(); srv.close();
  process.exit(fails.length || errs.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
