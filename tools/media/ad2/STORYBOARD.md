# VocaPro 광고 v2 스토리보드: 단어왕은 누구?

키네틱 타이포 + 실제 앱 UI · **34.0초 · 120 BPM · 17마디** · 가로 1920x1080 + 세로 1080x1920 · 같은 장면 파일, 같은 오디오

> 로그라인: "우리 반 단어왕은 누구?"라는 질문으로 열고, 새 기능 **60초 단어 맞추기 대결** 한 판(오답 -3초 → 6연속 → 시간 끝 → 1,030점 → 우리 반 1위 "바로 나!")을 비트에 맞춰 보여 준 뒤, "1등 비결은?"에 AI 자동 채우기 · 간격 반복 · 13가지 학습 · 영어/중국어 · 선생님 도구로 답하고, "공부는 게임처럼, 실력은 진짜로." + 로고 + 무료로 시작하기 + vocapro.kro.kr 로 끝낸다.

## 1. 장면 표 (컷은 모두 박 위)

| # | 컷 시작 | 끝 | 마디.박 | 엔진 start / inDur | 장면 | 들어오는 전환 |
|---|---|---|---|---|---|---|
| s1 | 0 | 2 | 1.1 | 0 / 0 | 훅: 우리 반 단어왕은 누구? | none (cold open) |
| s2 | 2 | 4 | 2.1 | 1.75 / 0.25 | 타이틀 + 카운트다운: VocaPro · NEW · 무료 / 단어 맞추기 대결 | zoom through the '?' dot |
| s3 | 4 | 10 | 3.1 | 3.75 / 0.25 | HERO: 60초 단어 맞추기 대결 (틀리면 -3초 · 6연속 · 시간 끝) | countdown block expands to full blue |
| s4 | 10 | 12 | 6.1 | 9.75 / 0.25 | 결과: 1,030점 · 새 최고 기록! | zoom through the clock '0' |
| s5 | 12 | 14 | 7.1 | 11.75 / 0.25 | 랭킹: 우리 반 단어왕은 바로 나! | elevator doors close |
| s6 | 14 | 17 | 8.1 | 14 / 0 | 1등 비결은? AI 자동 채우기 | hard cut, music drop-out |
| s7 | 17 | 22.5 | 9.3 | 16.75 / 0.25 | 간격 반복 복습 + 13가지 학습 | skew wipe + 'achieve' carry |
| s8 | 22.5 | 25 | 12.2 | 22.25 / 0.25 | 영어는 기본, 중국어까지 (EN/中 반반 화면) | '실전 시험' chip becomes the blue frame |
| s9 | 25 | 30 | 13.3 | 24.75 / 0.25 | 선생님은: 반 만들고, 과제 내고, 실시간으로 확인, 수업 도구까지 | stripe push |
| s10 | 30 | 34 | 16.1 | 29.75 / 0.25 | 엔딩: 공부는 게임처럼, 실력은 진짜로 · 무료로 시작하기 | tool rows stretch into blue stripes |

**표시 창(SHOW):** 각 장면은 `inStart`부터 다음 장면의 컷까지 그려진다(엔진 규칙: 이전 장면은 `next.start + next.inDur`까지 보임). 전환은 항상 들어오는 장면이 `[cut - inDur, cut]` 동안 그리고, 컷 박에 착지한다.

## 2. 결정 사항 (심사 반영)


**BASE: the 'kinetic' concept ('단어왕은 누구?', 120 BPM kinetic type -> real UI) won with all three judges (8.5 / 8.0 / 8.6). Its structure, motion vocabulary, colour-block morphs and the beat-locked game round are kept.**


**GRAFTED IN**

- From 'story': the mascot speaks the CTA ('다음 단어왕은 너야!', closes the hook on the viewer); the phone-to-teacher live pulse (one student card ticking 17/20 -> 20/20 -> '실전 시험 끝냄 · 정답 100%', '과제를 제출했어요. 이번 100점'); '5초마다 새로 고쳐요.'; the 4-note sonic logo '보-카-프-로'; the tape-stop on 'time up'; the review schedule read as GAPS (cumulative days 0 / 1 / 4 / 11); the add-form busy label '조회 중' and '채웠어요'.
- From 'showcase': '무료' before the skip (S2 lockup); the game level chips rolling into HSK levels as the Chinese proof (S8); pulse rings around the CTA; the footer '휴대폰·PC 어디서나 · 앱으로 설치'; wrong-answer-first tension in the game.

**MUST-FIXES APPLIED**

- Frame 0 legible (slam starts at -0.10 s). Brand: real white-square/blue-V mark everywhere, one wordmark treatment, mark >= 96 px in S2, persistent bug 4.5-29.9 s. '무료' at 2.125 s. CTA, logo and URL all up by 31.0 and held 3 s; no picture fade.
- Runtime 32 -> 34 s (17 bars) to buy holds: spaced review 2.25 s, 13-mode grid 2.0 s fully static, tools 1.5 s, EN/中 halves 1.0 s+ after settling. The flipboard and word-book ticker are dropped; modes appear as one grid.
- Captions merged/shortened and held: '틀리면 -3초' (1.25 s), '연속 정답, 보너스 점수!' (2.5 s), '시간 끝!' (visual twin of the buzzer). 'Ready!' removed (numerals only).
- S6 hard cut: headline already on frame 14.00; silence 0.5 s. No IPA (only '어치브'). No invented seconds counter on the AI status.
- S8 reworked (side-by-side halves + one toggle; '胜利' as its own entry; HSK chips; no knob-following red flood). Noto Sans SC always 800.
- S4 kept recognisable as the app's result screen (white card, cheer mascot, '중학교 · 결과', small '새 최고 기록!', kv boxes). S5 panel follows the app's row order (영어|중국어 seg, chips, filters, 내 순위, podium).
- S9 cut to three readable beats with one large proof each; V text >= 28 px where it carries meaning.
- Toss tone: shake <= 12 px except the one 18 px drop; coral edge vignette, not full frame. Blend safety: blinks >= 0.1 s, flap 15 Hz, bar blink <= 4 Hz.
- Buildability: every transition is owned by the incoming scene and lands on the cut; handoffs only via HO getters; anchors measured after fonts.ready per format; zoom through '0' capped at 28x with a measured circle; poster at 33.2 s is a still frame.
- Numbers re-derived with the app's rule (src/VocaPro.html: add = 10 + min(combo,10)*2, WQ_PEN = 3, pill +min(combo,10)*2 from combo 2): 1 miss, then 38 straight -> 90 after 6, 1,030 total, 38/39 = 97%, max combo 38. Podium: 하늘별 1,030 > 이*준 974 > 박*연 912.
- NOTE on the AI timer: the app does show 'AI가 채우는 중 · N초' (src line ~4427); per the judges we simply crop it out rather than show a number, since the ad's time is compressed.

## 3. 공통 규칙 (모든 개발자)

- GRID: 120 BPM, 4/4. 1 beat = 0.5 s = 30 frames @60 fps (15 @30 fps). 1/8 = 0.25 s, 1/16 = 0.125 s, 1/32 = 0.0625 s. 17 bars = 34.0 s.
- Beat helper: T(bar, beat, s16 = 0) = (bar-1)*2 + (beat-1)*0.5 + s16*0.125. Times below are written as seconds, often followed by [bar.beat].
- CUTS (scene starts, all on beats): 0.0 [1.1], 2.0 [2.1], 4.0 [3.1], 10.0 [6.1], 12.0 [7.1], 14.0 [8.1], 17.0 [9.3], 22.5 [12.2], 25.0 [13.3], 30.0 [16.1]. End 34.0 [18.1].
- ENGINE MAPPING (tools/media/ad2/engine.js): each scene registers SCENE({ id, start: inStart, end, inDur, build, draw }). inStart = cut - inDur, so every transition runs in the window [cut - inDur, cut] and LANDS on the cut beat. The incoming scene owns and draws its transition; it may touch only prevRoot's transform / filter / opacity / clip-path and the HO handoff getters, never the previous scene's inner DOM.
- FORMATS: one bundle, html.land = 1920x1080, html.vert = 1080x1920 (#v). Each scene keeps a layout table LAY = L({...landscape}, {...vertical}) and reads every rect from it. Use the pixel numbers below; they are design positions, not crops.
- SAFE AREAS: L: copy inside x 96-1824, y 54-1026. V: copy inside x 72-1008, y 240-1430; no meaning-carrying text at x > 900 when 1100 < y < 1650 (platform buttons); y > 1430 is decoration only.
- BRAND BUG (persistent): L box x 1672-1872, y 1008-1048; V box x 72-300, y 1452-1496. Scenes keep these rects free of content (L: x >= 1620 and y >= 990; V: x 72-360 and y 1440-1500).
- PALETTE: white #ffffff, bg #f2f4f6, ink #191f28, sub #4e5968, mute #8b95a1, line #e5e8eb, blue #3182f6, blue2 #1b64da, blueSoft #e8f3ff, green #03b26c / #e5f8ef, red(coral) #f04452 / #ffeeee, orange #ff9f00 / #fff3e0, purple #8b5cf6, teal #0aa5b4, pink #e64980, gold #ffc93c -> #f59f00, silver #c3cad3 -> #8f9aa6, bronze #e7a46a -> #c06a2b. Flat colour blocks only: no gradient blobs, no device frames, no navy.
- TYPE: Pretendard (font-family P). 900 for slams, 800 headings, 700 UI. Tracking -0.05em at >= 150 px, -0.035em at 60-149 px, -0.02em for UI. word-break: keep-all; font-variant-numeric: tabular-nums on every counter. Chinese (class .zh): Noto Sans SC, ALWAYS font-weight 800 (500 also loads; nothing else). Pinyin (shènglì) is Latin-1, set in Pretendard 600. No IPA anywhere (no font guarantee).
- LOGO (one treatment everywhere): mark = WHITE rounded square (radius 29%) with a BLUE 'V' (#3182f6, 900). On white/light it gets a 2 px #e5e8eb ring + shadow 0 8px 24px rgba(0,27,55,.12). Wordmark 'VocaPro' = one weight (800), one colour: ink #191f28 on light, white on blue. Never a blue square with a white V.
- MASCOT: only __MASCOT_HAPPY__ / __MASCOT_CHEER__ / __MASCOT_THINK__ (sleep unused). Mood swap = two stacked moods, opacity swapped at the bottom of an 80 ms squash (sy .88).
- CROWN: new flat inline SVG (viewBox 120x92, 3 points with ball tips, fill #ffc93c, stroke #f59f00 5 px, white 30% highlight stripe). It is an ad overlay only, never part of an app screen.
- ICONS: copy paths from the IC object in src/VocaPro.html (flame, clock, trophy, podium, sparkles, cards, check, repeat, keyboard, headphones, speaker, quote, rows, mic, shuffle, users, grid, print, play, x).
- MOTION VOCAB (pure functions of t; E.* from engine.js):
- SLAM: scale 1.35->1 in 0.14 s (E.out5), blur 8->0, opacity 0->1 in 0.03 s, + optional SHAKE on the parent.
- SHAKE(a, amp): offset = amp*exp(-(t-a)/0.08)*(sin 90(t-a), cos 77(t-a)) for 0.25 s. amp <= 12 px everywhere EXCEPT the single 4.00 drop (18 px).
- STACK: previous line slides to its slot and scales down (E.outExpo 0.22 s). MASK-UP / MASK-OUT: engine reveal(). POP: engine pop(). FADE-UP: engine fadeUp().
- STRETCH: sx 0.7 / sy 1.6 -> 1 with E.spring 0.45 s. ROLL: odometer digits, each a 0-9 strip in an overflow:hidden box (E.outExpo, 3 px blur while moving). FLIP: rect A -> rect B via translate + scale (E.inOutExpo). WIPE: hard-edged clip-path (E.inOutExpo 0.25 s).
- TAP: 72 px ring (4 px white border, rgba(25,31,40,.18) fill); appears 0.08 s before the beat, presses to 0.82 on the beat, gone by +0.25 s. On white surfaces use a 4 px #191f28 @35% border instead.
- BLEND SAFETY (60 -> 30 fps tmix): no visible state shorter than 0.1 s; nothing on the full frame flashes faster than 3 Hz; small-element blinks <= 4 Hz; split-flap cycling 15 Hz frame-locked (char index = floor(t*15) + seeded offset); exits >= 0.08 s.
- DETERMINISM: every random value (confetti, flap letters, distractors, typing pitches) is precomputed in build() from rnd() with a fixed seed per scene (seed = 100 + scene number). Never call rnd() inside draw().
- MEASURED ANCHORS: anything measured from glyphs ('왕', '?', the clock '0', 'achieve') is measured in build() AFTER document.fonts.ready, with transforms cleared, and separately in each format (the bundle loads once per format, so this is automatic). Store results in the HO getters.
- HANDOFF API: window.HO = window.HO || {}. Each scene registers plain getters in build(); getters return rects in STAGE pixels at the scene's own resting layout (no outgoing animation applied): HO.s1.qDot() -> {cx, cy, d} (dot of '?' in its final pose, before the 1.75 push-in), HO.s1.push(t) -> {ox, oy, s} (S1's own push-in transform), HO.s2.block() -> {x, y, w, h, r}, HO.s3.zero() -> {cx, cy, r} (centre and inner counter radius of the clock's last '0' glyph at 9.50), HO.s6.word() -> {x, y, w, h, fontSize}, HO.s7.examChip() -> {x, y, w, h, r}, HO.s9.toolRows() -> [5 x {x, y, w, h, r, color}].
- OVERLAY (brand bug): scenes/zz-overlay.js creates #bug inside #stage on the first seek call (z-index 999) and wraps seek: const s0 = window.seek; window.seek = t => { s0(t); drawBug(t); }. Visible 4.50-29.90: fade in 4.50-4.75, fade out 29.75-29.90. Mark 40 px (L) / 44 px (V) + 'VocaPro' 30 px (L) / 32 px (V) 800, opacity .92. Theme 'onColor' (white wordmark, mark without ring) during [10.0, 12.0), [14.0, 16.875), [22.5, 24.875); 'onLight' (ink wordmark, ringed mark) otherwise; 0.15 s crossfade at each switch.
- CUES: storyboard.json `cues` is the single source of truth for SFX timing; the audio renderer reads it (plus the `music` description) and writes out/ad2.wav, which render.js muxes into both mp4s. Poster frame = DUR - 0.8 = 33.2 s, so 32.9-34.0 must be a clean, still end card.
- HONESTY: game time, AI fill time and the live view are time-compressed (the live view really refreshes every 5 s). Ranking names are nicknames/masked. No 'seconds per answer' or speed claims on screen.

## 4. 장면별 상세

### S1 · 0–2초 [1.1-2.1] · 훅: 우리 반 단어왕은 누구?

엔진 등록: `SCENE({ id: 's1', start: 0, end: 2, inDur: 0 })` · 핸드오프: Exports HO.s1.qDot(), HO.s1.push(t).

**문구 (화면 그대로)**

- 우리 반
- 단어왕은
- 누구?

**들어오는 전환** (이 장면이 소유)

None. Cold open on the downbeat; the first slam is already settled on frame 0.

**움직임 (시각은 절대 초)**


Flat white #ffffff frame. Push-stack type: each new word SLAMs at centre at full size, the previous word retreats to its slot.

- FRAME-0 RULE: the first slam starts at t = -0.10, so frame 0 already shows '우리 반' sharp (scale <= 1.02, blur 0). Frame 0 is the thumbnail and the first muted-feed impression.
- 0.00 [1.1] '우리 반' (ink 900) at full size, SHAKE 10 px.
- 0.50 [1.2] '우리 반' STACKs to its slot; '단어왕은' SLAMs at centre, SHAKE 10 px.
- 1.00 [1.3] Colour-block flip: a #3182f6 block rises from the bottom edge and covers the frame in 0.14 s (clip-path inset(100% 0 0 0) -> inset(0), E.outExpo). All ink text turns white within 0.08 s. '단어왕은' STACKs. '누구?' enters with STRETCH (white 900, blur 12 -> 0), SHAKE 12 px.
- 1.25 The '?' (own span, transform-origin bottom centre) wobbles -14deg -> +9deg -> 0 (E.spring 0.4 s).
- 1.50 [1.4] The crown falls from 260 px above its rest point (1.50-1.64, E.in3) and lands on top centre of '왕', tilted -12deg. On landing: squash sx 1.12 / sy 0.82 -> 1 (spring 0.2 s) + 4 white spark ticks (40x6 px, rounded) burst out and fade in 0.2 s.
- 1.75-2.00 S1 pushes in on itself, scale 1 -> 1.12 (E.in3) about the '?' dot (HO.s1.push).

Build: wrap '왕' and '?' in spans; measure after fonts.ready. Export HO.s1.qDot and HO.s1.push.


**가로 1920x1080**

- Incoming slams: 300 px, centred on (960, 540).
- Stack ends as one centred line '우리 반 단어왕은' at 126 px, cap-centre y 290 (slot x from widths measured at 126 px).
- '누구?': 420 px, centred on (960, 660). Crown 120x92.

**세로 1080x1920**

- Incoming slams: '우리 반' 260 px, '단어왕은' 230 px (~850 px wide), centred on (540, 880).
- Stack: two lines at 140 px, '우리 반' at (540, 520) and '단어왕은' at (540, 680).
- '누구?': 380 px centred on (540, 1080). Crown 110x84. All text within y 400-1300.

**SFX**

- 0.00 slam hit (sine 120->42 Hz 0.25 s + 2 ms click) on music stab 1 (Am).
- 0.50 same hit +2 semitones on stab 2.
- 1.00 BIG hit (kick + clap + 1.2 s crash) + 0.14 s up-whoosh for the blue block.
- 1.25 wobble 'boing' (sine 300<->480 Hz, 12 Hz vibrato, 0.22 s, -14 dB).
- 1.50-1.64 falling whistle (sine 2200->1100 Hz). 1.64 crown 'ting' (2637 + 3951 Hz, 0.6 s).
- 1.75-2.00 reverse-cymbal swell + zoom whoosh, cut dead at 2.00.

### S2 · 2–4초 [2.1-3.1] · 타이틀 + 카운트다운: VocaPro · NEW · 무료 / 단어 맞추기 대결

엔진 등록: `SCENE({ id: 's2', start: 1.75, end: 4, inDur: 0.25 })` · 핸드오프: Exports HO.s2.block().

**문구 (화면 그대로)**

- VocaPro  [NEW]  [무료]
- 단어 맞추기
- 대결
- 60초 스피드 퀴즈
- 3 · 2 · 1 (numerals only, no 'Ready!')

**들어오는 전환** (이 장면이 소유)

Zoom through the '?' dot, 1.75-2.00 (S2 owns).
- S2's root is clipped to a circle at HO.s1.qDot() mapped through HO.s1.push(t); radius = d/2 * (1 -> 70) with E.inExpo. S2 content is in its pre-entrance state, so the circle reads as pure white.
- S1 keeps pushing in underneath. At 2.00 the clip is removed: frame is pure white and the lockup pops on the downbeat.

**움직임 (시각은 절대 초)**


White frame. Brand + free + title on beat 1, countdown on beats 2-4.

- 2.00 [2.1] Lockup row POPs (0.25 s): real logo mark (white rounded square, blue V, #e5e8eb ring + shadow) + wordmark 'VocaPro' (ink 800) + coral NEW pill (#f04452, white 900).
- 2.00 '단어 맞추기' (ink 900) drops in glyph by glyph: each from y -60% and rotate -8deg to 0 (E.out5 0.18 s, 0.025 s stagger).
- 2.0625 '대결' (blue 900) dashes in from the right: translateX +900 -> 0, skewX -15deg -> 0 (E.outExpo 0.22 s), blur 14 -> 0. On arrival the title group nudges -6 px and springs back.
- 2.125 '무료' pill POPs after NEW (bg #e8f3ff, text #1b64da 800). 'Free' is readable from 2.2 s, before the 5 s skip.
- 2.25 '60초 스피드 퀴즈' (sub #4e5968, 700) MASK-UPs under the title.
- 2.50 [2.2] Countdown block SLAMs in (scale 0.2 -> 1, rotate -10deg -> 0, E.back 0.18 s): #3182f6 rounded square with a white numeral '3' (900, tabular). A 10 px white ring at 35% drains clockwise once per beat (stroke-dashoffset, linear). No 'Ready!' label.
- 3.00 [2.3] Block turns +90deg (E.outExpo 0.16 s), content counter-rotates to stay upright; fill tweens to ink #191f28; numeral ROLLs 3 -> 2 (E.inOutExpo 0.16 s).
- 3.50 [2.4] Same move: fill to coral #f04452, numeral 2 -> 1.
- 3.00 and 3.50: title pulses (scale 1.03 -> 1, 0.12 s).
- 3.75-4.00 handed to S3 (S3 draws the expanding block on top). S2 keeps its layout still.

**가로 1920x1080**

Left column starts at x 150.
- Lockup row, top y 150: mark 104 px (V glyph 66 px), gap 18, wordmark 72 px, gap 24, NEW pill 60 px tall / 32 px text, gap 12, 무료 pill 60 px tall / 32 px text.
- '단어 맞추기': 150 px, cap-top y 290. '대결': 330 px, cap-top y 470 (x 150-~830).
- '60초 스피드 퀴즈': 46 px, top y 880.
- Countdown block: 520x520, radius 64, x 1240-1760, y 280-800. Numeral 380 px centred at y 540. Ring diameter 440.

**세로 1080x1920**

All centred on x 540.
- Lockup row at y 300: mark 96 px, wordmark 64 px, NEW and 무료 pills 52 px tall / 28 px text (~700 px wide row).
- '단어 맞추기': 150 px, centre y 460. '대결': 320 px, centre y 680. '60초 스피드 퀴즈': 42 px at y 870.
- Countdown block: 500x500, radius 60, centred on (540, 1180), y 930-1430. Numeral 360 px, ring 420 px.

**SFX**

- 2.00 whoosh (noise bp 300->3000 Hz, 0.2 s, pan R->C) + soft pop for the lockup (sine 500->1100 Hz, 60 ms).
- 2.0625 impact for '대결' (sine 90->40 Hz + 40 ms noise). 2.125 small pop for '무료'.
- 2.50 / 3.00 / 3.50 countdown beeps (square 880 Hz, 90 ms, -8 dB) + flip-clack (3 kHz tick 6 ms + 400 Hz thock 10 ms).
- 3.50-3.9375 riser over the snare roll. 3.75 low-to-high expand whoosh. 3.9375-4.00 total silence.

### S3 · 4–10초 [3.1-6.1] · HERO: 60초 단어 맞추기 대결 (틀리면 -3초 · 6연속 · 시간 끝)

엔진 등록: `SCENE({ id: 's3', start: 3.75, end: 10, inDur: 0.25 })` · 핸드오프: Exports HO.s3.zero().

**문구 (화면 그대로)**

- KINETIC / RULE CAPTIONS: '60' · '틀리면 -3초' · '연속 정답, 보너스 점수!' · '6연속 +12' (combo hero) · '시간 끝!'
- UI CHROME (app strings): ✕ · clock 60 -> 0 · score '0점' -> '1,030점' · combo pill '0연속' / '1연속' / 'N연속 +2N' (ON from 2) · floats '+10' '+12' '+14' '+16' '+18' '+20' · app '-3초' float at the clock.
- QUESTIONS (correct ✓):
- Q1 이 단어의 뜻은? pretend: 1 ~인 척하다 ✓ / 2 예약하다 (tapped, WRONG) / 3 상기시키다 / 4 수리하다
- Q2 이 단어의 뜻은? victory: 1 용기 / 2 승리 ✓ / 3 보물 / 4 재능
- Q3 이 단어의 뜻은? courage: 1 용기 ✓ / 2 기억 / 3 보상 / 4 목표
- Q4 이 뜻의 영어는? 목표: 1 reward / 2 talent / 3 target ✓ / 4 treasure
- Q5 이 단어의 뜻은? rapid: 1 조용한 / 2 거대한 / 3 깔끔한 / 4 빠른 ✓
- Q6 이 단어의 뜻은? treasure: 1 보물 ✓ / 2 무기 / 3 지갑 / 4 상처
- Q7 이 단어의 뜻은? talent: 1 진실 / 2 재능 ✓ / 3 상징 / 4 명예
- TIME-LAPSE FLASHES: excellent 훌륭한 · master 주인 · power 힘 · final 마지막의 (correct at positions 1, 3, 2, 4; other three options = seeded distractors from the app's 중학교 list).

**들어오는 전환** (이 장면이 소유)

Block expands to the full frame, 3.75-4.00 (S3 owns).
- S3 draws a rect starting at HO.s2.block() (coral fill, radius 64, with a copy of the numeral '1' that scales up with it and fades by 3.92) and grows it to (0, 0, W, H), radius -> 0, with E.inExpo. Fill tweens coral -> #3182f6 over 3.75-3.95.
- 3.94-4.00 solid blue and silent. S3's '60' slam lands on 4.00. The same blue rect is the one that later shrinks into the timer bar.

**움직임 (시각은 절대 초)**


bg #f2f4f6. Numbers follow the app (src/VocaPro.html ~3369-3383): each correct = 10 + 2*min(combo, 10) with combo = run length BEFORE the answer; wrong = combo 0 and -3 s; pill shows +min(combo,10)*2 only when combo >= 2.


RUNNING VALUES: 1 miss first, then 38 correct in a row. Score 0 -> 10 / 22 / 36 / 52 / 70 / 90 (taps 5.5-8.0) -> 1,030 (time-lapse: +940 for correct #7-#38). Result: 38 맞힘, 38/39 = 97%, 최대 연속 38. Clock(t) = 60 - floor((t-4.5)/0.5) - (t >= 5.0 ? 3 : 0) until 9.0 (59 at 5.0 -> 56 after the penalty, 49 at 8.99), then 49 -> 0 over 9.0-9.5. Timer-bar width = clock/60.


A. DROP AND MORPH (4.00-4.50)

- 4.00 [3.1] On S2's full-blue frame a white '60' (900, tabular) SLAMs at centre with SHAKE 18 px (the one big shake). White shock ring (6 px) r 100 -> 1400, opacity .6 -> 0 over 0.4 s.
- 4.125-4.50 (E.inOutExpo): the full-frame blue rect morphs into the timer-bar fill (left/top/width/height/radius from frame to bar rect), revealing the light UI; the '60' FLIPs into the clock digits (white -> ink over the last 40%), swapping for the real chip text at 4.50.
- UI rises on 16ths (y +60 -> 0, opacity, E.out5 0.3 s): 4.1875 ✕ + score; 4.25 combo pill ('0연속', OFF) + question card Q1; 4.3125 / 4.375 / 4.4375 / 4.50 options 1-4. 4.3125 background giant word 'pretend' SLAMs.

B. WRONG FIRST (5.00)

- 4.92 TAP ring on option 2 '예약하다'.
- 5.00 [3.3] Option 2 -> wrong state (#ffeeee bg, coral border + chip), option 1 -> correct state (#e5f8ef, #03b26c border, green chip with white check). The UI column shakes horizontally +-10 px (3 cycles, 0.25 s). Subtle coral EDGE vignette (inset 0 0 120px rgba(240,68,82,.18), 0 -> 1 -> 0 over 0.3 s). App '-3초' (coral 900, 0.5x size) floats up from the clock's right edge. Clock ROLLs 59 -> 56; the last 5% of the timer fill breaks off and falls (y +80, rotate 12deg, fade, E.in3 0.4 s). Combo pill squashes 0.85 -> 1 ('0연속').
- 5.00 RULE CAPTION 1 '틀리면 -3초' SLAMs in the rule slot ('-3초' coral 900), SHAKE 10 px. Holds 5.00-6.25, MASK-OUT 6.25-6.40 (visual twin of the buzzer).
- 5.25 Next question rolls in (see roll spec).

C. RHYTHM ROUND (5.50-8.00): one correct answer per beat


Taps at 5.50 / 6.00 / 6.50 / 7.00 / 7.50 / 8.00 hit Q2 opt 2, Q3 opt 1, Q4 opt 3, Q5 opt 4, Q6 opt 1, Q7 opt 2. For each tap time T:

- T-0.08 TAP ring on the option's number chip; option pre-presses to 0.97.
- T: option -> correct state, springs 0.97 -> 1.04 -> 1 (0.2 s); green ripple rgba(3,178,108,.25) from the chip to 260 px, fades in 0.3 s; in-option '+N' (green 900) floats up 50 px, fades over 0.6 s; score ROLLs (0.2 s); combo pill ROLLs + pops (1.25 -> 1, spring 0.25 s) and switches to ON from combo 2; margin '+N' burst SLAMs, drifts up 90 px, gone by T+0.45; whole UI pulses on the beat (1.012 -> 1, 0.15 s); background word opacity .07 -> .14 -> .07.
- T+0.25 roll: card word + label slide out up while new ones slide in from below (E.inOutExpo 0.14 s, masked by the card); option texts roll with 0.02 s stagger; states reset; background word SLAMs the new word.
- Combo pill after each tap: '1연속' (OFF), '2연속 +4', '3연속 +6', '4연속 +8', '5연속 +10', '6연속 +12'. Floats: +10, +12, +14, +16, +18, +20.
- 6.50 RULE CAPTION 2 '연속 정답, 보너스 점수!' MASK-UPs in the rule slot ('보너스' in orange->coral gradient text); holds to 9.00, MASK-OUT 9.00-9.15. It sits above the combo scrim so it stays readable.
- After the 8.00 tap Q7 stays in its correct state; no new question until 9.00.

D. COMBO HERO (8.00-9.00)

- 8.00-8.25 A duplicate of the combo pill FLIPs from its slot to the hero position, scale 3.6x (L) / 3.0x (V), E.inOutExpo. Scrim rgba(25,31,40,.45) fades in; UI blurs 0 -> 6 px.
- 8.25 Impact: pill overshoots 1.08 -> 1; 12 orange rays (8 px strokes, 60-120 px) burst radially and fade in 0.3 s; flame icon flickers scaleY 1 <-> 1.12 on 8ths (4 Hz).
- 8.75-9.00 Pill collapses back into its slot (E.inExpo 0.2 s); scrim and blur clear.

E. TIME-LAPSE (9.00-9.50)

- Question flashes on 16ths at 9.00 / 9.125 / 9.25 / 9.375; each correct option blinks green for 0.10 s with a small '+20'. Background word smears (blur 6 px, translateX -120 px per flash).
- Score ROLLs 90 -> 1,030 (E.inOut3); combo spins 6 -> 38 (ON, '+20'); clock spins 49 -> 0.
- Under 10 s the timer bar switches to its low style (gradient #f04452 -> #ff9f00) and blinks opacity 1 / .5 with a 0.25 s period (4 Hz, bar only).

F. TIME UP (9.50-10.00)

- 9.50 [5.4] Clock reads '0': digit turns coral and pops 1.3 -> 1; UI freezes and desaturates (grayscale .7 over 0.1 s), shakes 6 px. RULE CAPTION 3 '시간 끝!' (coral 900) SLAMs in the rule slot (visual twin of the buzzer); it stays until S4 takes over.
- 9.75-10.00 zoom through the '0' (S4 owns). S3 must keep the clock digit '0' unblurred and un-desaturated so its counter reads cleanly.

Export HO.s3.zero(): centre + inner counter radius of the last clock digit '0' (Pretendard 800 tabular), measured after fonts.ready.


**가로 1920x1080**

PC layout (2x2 options, as the app at >= 900 px). Game column x 120-1400; right column x 1460-1840 = rule slot + bursts.
- Background giant word: 520 px 900, rgba(49,130,246,.07), centred (960, 600), rotate -4deg.
- ✕ button 72x72 at (120, 58), white, radius 22, 1.5 px #e5e8eb, icon 30 px. Clock centred (760, 94): clock icon 44 px + digits 64 px 800. Score right-aligned to x 1400 at y 94, 56 px 800 incl. '점'.
- Timer bar x 120-1400, y 160, height 18, radius 9; track #e5e8eb, fill gradient #03b26c -> #3182f6.
- Combo pill centred (760, 232), 64 px tall, padding 0 30, radius 32. OFF: white, flame + text #8b95a1 30 px 800. ON: linear-gradient(135deg, #ff9f00, #f04452), white, number 36 px 900, '+N' 26 px 800 at .9.
- Question card x 210-1310, y 292-612, white, radius 44, shadow 0 6px 24px rgba(0,0,0,.05). Label 34 px 700 #8b95a1 at top+56; English word 150 px 800; Korean word (Q4) 120 px.
- Options 2x2 over x 210-1310, y 644-984: cells 540x160, gap 20, radius 30, white, 3 px #e5e8eb. Chip 60x60 radius 18 (#f2f4f6, 30 px 800 #8b95a1) 28 px from left; label 46 px 700; in-option '+N' 44 px at right 30.
- RULE SLOT centred x 1650, y 300-640: '틀리면' 60 px ink 800 over '-3초' 180 px coral 900; '연속 정답,' / '보너스 점수!' 56 px 800 two lines; '시간' / '끝!' 140 px coral 900.
- Margin '+N' burst centred (1650, 850), 130 px 900, gradient text #ff9f00 -> #f04452.
- Combo hero: pill ~1000x230 centred (960, 470).
- Zoom origin: measured last clock digit, about (772, 94).

**세로 1080x1920**

Phone layout (single-column options).
- Background giant word: 300 px, rgba(49,130,246,.08), centred (540, 1620) in the decoration zone, bleeding off both sides.
- ✕ 64x64 at (72, 246). Clock centred (540, 278): icon 40 + digits 60 px. Score right-aligned to x 1008, 52 px.
- Timer bar x 72-1008, y 340, height 16. Combo pill centred (540, 412), 60 px tall.
- Question card x 96-984, y 470-790, radius 44. Label 32 px; English word 130 px; Korean word 110 px.
- Options x 96-984: 4 x 110 px tall, gap 14, tops at y 820 / 944 / 1068 / 1192 (end 1302). Chip 56 px, label 44 px. In-option '+N' at right 300 (clear of the rail).
- RULE SLOT: one line centred on (540, 1385), y 1345-1425, max width 860: '틀리면 -3초' 80 px; '연속 정답, 보너스 점수!' 56 px; '시간 끝!' 80 px.
- Margin '+N' burst centred (830, 412) beside the pill, 90 px, rising 60 px.
- Combo hero: pill at 3.0x centred (540, 900).
- Zoom origin: last clock digit, about (560, 278).

**SFX**

- 4.00 DROP: GO beep (square 1760 Hz, 0.2 s) + sub boom (55 Hz, 0.8 s) + crash + first full downbeat.
- 4.125 UI whoosh (noise bp 2000->6000 Hz, 0.3 s); 4.1875-4.50 six soft ticks on the 16ths.
- 4.92 tap click. 5.00 wrong buzz (squares 196 + 208 Hz, LPF 1.5 kHz, 0.28 s), music ducks -9 dB for 0.25 s, glass-crack tick for the falling bar chunk.
- 5.50 / 6.00 / 6.50 / 7.00 / 7.50 / 8.00 correct dings rising C6, D6, E6, G6, A6, C7 (sine + octave + 0.15 of 3rd partial, 0.35 s) each with a tap click (2 kHz, 4 ms).
- 5.25 / 5.75 / 6.25 / 6.75 / 7.25 / 7.75 card-roll swish (high-passed noise 60 ms, -20 dB). Score/combo rolls: 3 quiet ticks each.
- 8.00 up-whoosh for the combo FLIP. 8.25 crash + 'fwoomp' impact + flame crackle (seeded filtered noise grains, 0.4 s). 8.75 collapse swish.
- 9.00 / 9.125 / 9.25 / 9.375 blips A5, C6, D6, E6 (square, -18 dB, A-minor pentatonic) + continuous score ticks.
- 9.50 time-up buzzer (saw 140 + 147 Hz, 0.45 s); music TAPE-STOPS 9.50-9.75. 9.75-10.00 rising whoosh (noise bp 200->5000 Hz).

### S4 · 10–12초 [6.1-7.1] · 결과: 1,030점 · 새 최고 기록!

엔진 등록: `SCENE({ id: 's4', start: 9.75, end: 12, inDur: 0.25 })` · 핸드오프: none

**문구 (화면 그대로)**

- 중학교 · 결과
- 새 최고 기록!
- 1,030점
- 38 맞힘 · 97% 정답률 · 38 최대 연속
- 랭킹 | 다시 하기 (static buttons)

**들어오는 전환** (이 장면이 소유)

Zoom through the clock '0', 9.75-10.00 (S4 owns).
- prevRoot (S3) gets transform-origin = HO.s3.zero() centre and scale 1 -> 28 (cap, E.inExpo).
- S4's root is clipped to a CIRCLE at that same screen point with radius = HO.s3.zero().r * currentScale (so it always matches the counter of the zero). Through the hole we see the blue + result card at its 10.00 state.
- At 10.00 the clip is removed and S3 is no longer drawn. Verify frames at 9.95 in both formats.

**움직임 (시각은 절대 초)**


Flat blue #3182f6 frame with the app's real result screen as one big white card on it (recognisable as the app: light card, cheer mascot, '중학교 · 결과', small '새 최고 기록!' label, kv boxes). 6 thin concentric rings (2 px, white 10%) expand slowly (+40 px/s) behind the card, echoing the '0' we flew through.

- 10.00 [6.1] Impact: card scale 1.04 -> 1 (spring 0.3 s). Header (back chevron + '중학교 · 결과', 800) fades in 0.2 s.
- 10.00-10.4375 Score ROLLs as odometer columns (3 px blur while spinning, E.outExpo): '1' lands 10.25, '0' 10.3125, '3' 10.375, '0' 10.4375 (the comma is static). '점' MASK-UPs at 10.45.
- 10.25 Cheer mascot jumps up into the result-art slot from below (masked by the slot's bottom edge, E.outExpo 0.25 s); squash on landing at 10.50 (sy .86 -> 1, spring), then bobs +-8 px at 1.6 Hz.
- 10.50 [6.2] '새 최고 기록!' label POPs (scale 1.8 -> 1, E.out5 0.16 s): text #ff9f00 800 on a soft #fff3e0 pill, 4 gold spark ticks. Same moment: 70 seeded confetti pieces (12x20 rects: #ffc93c, #ffffff, #03b26c, #f04452, #8b5cf6, #e8f3ff) launch from behind the score (vy -900..-1500 px/s, vx +-700 px/s, gravity 2400 px/s^2, spin +-720 deg/s; computed analytically from t); half render behind the card, half in front.
- 11.00 / 11.125 / 11.25 [6.3] The three kv boxes POP (E.back 0.22 s), each counting up from 0 in 0.3 s: '38' 맞힘, '97%' 정답률, '38' 최대 연속.
- 11.50-11.75 Card breathes 1 -> 1.015 while confetti falls. The '랭킹 | 다시 하기' buttons are static (no tap).

**가로 1920x1080**

- Card x 560-1360, y 80-1000, radius 48, shadow 0 30px 80px rgba(10,30,80,.35).
- Header row y 120-176: chevron 40 px at card left+40, title 40 px 800 centred.
- Mascot 200 px centred x 960, y 200-400.
- Label pill centred (960, 440), 64 px tall, 40 px text.
- Score digits 220 px 900 tabular, centred (930, 590); '점' 72 px #8b95a1 baseline-aligned 12 px after the digits.
- kv row y 740-880: 3 boxes 230x140, gap 16, x 597-1323, bg #f2f4f6, radius 28; numbers 60 px 800 ink, labels 28 px 700 #8b95a1.
- Buttons row y 910-980: '랭킹' (soft, #e8f3ff / #1b64da) and '다시 하기' (blue, white) 330x70 each, 30 px.
- Rings centred (960, 540). Confetti origin (930, 580).

**세로 1080x1920**

- Card x 72-1008, y 290-1300, radius 48.
- Header y 330-390 (36 px). Mascot 220 px centred x 540, y 410-630.
- Label pill centred (540, 670), 60 px tall, 38 px text.
- Score digits 240 px centred (515, 830); '점' 76 px.
- kv row y 960-1110: 3 boxes 268x150, gap 16 (x 122-958); numbers 60 px, labels 30 px.
- Buttons y 1160-1240 (two 400x80, 30 px).
- Rings centred (540, 800). Confetti origin (540, 820).

**SFX**

- 10.00 crash + sub hit (the S3 whoosh ends here).
- 10.00-10.4375 odometer ticks on 1/32 notes, rising (3 kHz clicks).
- 10.25-10.50 mascot spring 'boing'.
- 10.50 ka-ching (bells 1568 + 2093 Hz + sparkle-noise tail) + soft thud (90 Hz, 0.12 s); 10.50-11.50 confetti sparkle (15 seeded pings, 3-6 kHz, -22 dB).
- 11.00 / 11.125 / 11.25 pops G5, C6, E6.

### S5 · 12–14초 [7.1-8.1] · 랭킹: 우리 반 단어왕은 바로 나!

엔진 등록: `SCENE({ id: 's5', start: 11.75, end: 14, inDur: 0.25 })` · 핸드오프: none

**문구 (화면 그대로)**

- 우리 반 단어왕은
- 바로 나!
- UI: 영어 랭킹 / 영어 | 중국어 / 기초 · 중학교 · 고등학교 · 수능 · 토익 / 이번 주 | 역대 / 전체 | 우리 반 / 내 순위 1위 1,030점 이름: 하늘별 / podium 2 이*준 974점 · 1 하늘별 1,030점 · 3 박*연 912점

**들어오는 전환** (이 장면이 소유)

Elevator doors close, 11.75-12.00 (S5 owns).
- S5's root is clipped to two bands that grow from the top and bottom edges to the horizontal centre line (clip-path path() with two rects, E.inOutExpo): band height = p * H/2.
- prevRoot (S4) scales 1 -> .96 and dims (filter brightness 1 -> .8). At 11.97-12.00 a 6 px white seam line flashes on the centre line. At 12.00 S5 is whole.

**움직임 (시각은 절대 초)**


bg #f2f4f6. Kinetic headline beside (L) or above (V) the real ranking panel. Panel row order is the app's (wqRank): header, language seg, level chips, filters, 내 순위 bar, podium.


PANEL: white, radius 48, shadow 0 20px 60px rgba(17,24,39,.10), drawn at 2x app CSS.

- Header: back chevron + '영어 랭킹' (800).
- Language seg '영어 | 중국어' (영어 ON). Track #f2f4f6 radius 22 padding 6; ON = white + shadow + ink 700; OFF #8b95a1.
- Level chips '기초', '중학교' (ON: ink bg, white), '고등학교', '수능 · 토익' (OFF #f2f4f6 / #4e5968 700), radius 999.
- Filters side by side: '이번 주 | 역대' and '전체 | 우리 반' (same seg style).
- 내 순위 bar: bg #e8f3ff, text #1b64da, radius 32: '내 순위' (700), '1위' (900), '1,030점' (800), and '이름: 하늘별' (700) right. Its slot is empty until 13.50.
- Podium: bg linear-gradient(180deg, #e8f3ff, transparent), radius 36, columns 1 : 1.1 : 1 in order 2-1-3. Each column: rkColor avatar with the first character in white 900, medal badge (rank number, 4 px white border) at the avatar's bottom-right, name (800; mine in blue #3182f6), score (#4e5968 700), pedestal with white numeral 900 (top radius 28).

PODIUM DATA (colours from rkColor and the app CSS): 2nd 이*준 974점: avatar #e64980, badge #9aa5b1, silver pedestal. 1st 하늘별 1,030점 (me): avatar #fe9800, badge #f5a524, gold pedestal. 3rd 박*연 912점: avatar #1b64da, badge #c8783a, bronze pedestal. Names are masked/nicknames.


BEATS

- 12.00 [7.1] Headline line 1 '우리 반 단어왕은' (ink 800) MASK-UPs. Panel slides in (L: x +300 -> 0; V: y +200 -> 0; E.outExpo 0.35 s; opacity). Filters show '이번 주' and '전체' ON; pedestals at height 0.
- 12.25 TAP on '우리 반': knob slides '전체' -> '우리 반' (E.back 0.22 s). Bronze pedestal grows from 0 (scaleY from bottom, E.back(1.6) 0.3 s); 3rd-place avatar, name, score POP on top.
- 12.50 [7.2] Silver pedestal rises; 2nd-place entry POPs.
- 13.00 [7.3] Gold pedestal rises (E.back(1.8) 0.35 s); 1st avatar POPs with a 6 px gold ring; the crown drops onto it and rests by 13.15 (squash); 40 confetti (gold, white, blue) burst from the pedestal. Same moment: line 2 '바로 나!' (blue 900) enters with STRETCH + SHAKE 10 px.
- 13.50 [7.4] The 내 순위 bar SLAMs into its slot (scale 1.1 -> 1, 0.14 s) with a blue glow pulse (0 0 0 12px rgba(49,130,246,.25) -> 0 over 0.4 s); the podium name '하늘별' flashes blue.
- 13.75-14.00 Hold; crown bobs +-4 px. Hard cut at 14.00.

**가로 1920x1080**

- Headline column x 140: '우리 반 단어왕은' 72 px 800, cap-top y 360; '바로 나!' 220 px 900, cap-top y 450 (x 140-~800).
- Panel x 900-1780, y 98-962, padding 32. Rows top to bottom: header 52 (40 px text); gap 16; language seg 60 (28 px); gap 14; chips 56 (28 px); gap 14; filters 64 (two segs 395 px, 28 px); gap 18; 내 순위 bar 88 (28 / 44 / 32 px); gap 18; podium 400.
- Podium: avatars 104 px (1st 132), badges 42, names 32 px, scores 26 px; pedestal heights 2nd 140, 1st 190, 3rd 104; numerals 60 px. Crown 96x74.

**세로 1080x1920**

- Headline centred: '우리 반 단어왕은' 64 px at y 300; '바로 나!' 180 px centred (540, 470).
- Panel x 84-996, y 605-1425, padding 28. Rows: header 48; gap 12; language seg 56; gap 12; chips 52; gap 12; filters 60; gap 14; 내 순위 bar 84; gap 14; podium 400.
- Podium: avatars 100 (1st 128); pedestals 2nd 130, 1st 180, 3rd 96. Text of the 3rd column stays at x <= 900.

**SFX**

- 11.75-12.00 doors whoosh, split stereo (top L, bottom R).
- 12.00 kick + crash. 12.25 toggle click (3 ms + 1.6 kHz blip) + pedestal thunk (sine 150->90 Hz, 0.15 s). 12.50 thunk, higher.
- 13.00 fanfare hit (brass stab C major) + big thunk. 13.15 crown 'ting' + confetti sparkle.
- 13.50 slam pop + soft shine (sine 2093 Hz, fast vibrato, 0.3 s, -16 dB).

### S6 · 14–17초 [8.1-9.3] · 1등 비결은? AI 자동 채우기

엔진 등록: `SCENE({ id: 's6', start: 14, end: 17, inDur: 0 })` · 핸드오프: Exports HO.s6.word().

**문구 (화면 그대로)**

- 1등 비결은?
- 단어만 치면,
- AI가 다 채워요
- UI: AI 자동 채우기 / 영단어 / 예: consistent / achieve / AI 완성 -> 조회 중 / AI가 채우는 중 -> 채웠어요 / 뜻 성취하다 / 한글 발음 어치브 / 예문 (영어) You can achieve your goal with hard work. / 예문 해석 열심히 노력하면 목표를 성취할 수 있다. / 비슷한 단어 accomplish · reach

**들어오는 전환** (이 장면이 소유)

Hard cut on the downbeat at 14.00 with the music dropping out (only a 50 Hz sub boom). Bright podium -> flat ink. The headline is already fully on screen on the first frame; silence lasts 0.5 s before the pluck arpeggio enters at 14.5.

**움직임 (시각은 절대 초)**


Ink #191f28 background (the breakdown).

- 14.00 [8.1] HARD CUT. '1등 비결은?' is ALREADY on screen in its final pose on the first frame (only a settle: scale 1.03 -> 1 over 0.25 s, E.out3; no blur, no slam-in, no shake), so the silent cut never reads as a dead frame. '1등' = gold gradient text (linear-gradient(180deg, #ffd25e, #f59f00), background-clip text); '비결은?' white.
- 14.125 Think mascot POPs beside the '?' and tilts its head 0 -> -8deg.
- 14.75 [8.4] The question STACKs into a small kicker (top-left in L, top centre in V; '1등' gold + '비결은?' white 70%). Mascot slides out and fades. Headline line 1 '단어만 치면,' (white 800) MASK-UPs. The input bar SLAMs in (scale 1.1 -> 1, no shake): white, radius 48, placeholder '예: consistent' (#b0b8c1), blue 'AI 완성' button with sparkle icon at its right end. Label '영단어' (white 70%, 700) above the bar.
- 14.8125 Chip 'AI 자동 채우기' POPs above the label (bg rgba(49,130,246,.18), text #7fb6ff, sparkle icon).
- 14.875-15.625 'achieve' typed one letter per 16th (14.875, 15.0, 15.125, 15.25, 15.375, 15.5, 15.625). Placeholder vanishes on the first key; 4 px blue caret blinks every 0.25 s; each key nudges the bar down 3 px and back and SLAMs a giant ghost letter behind the bar (white 6%, replaces the previous one).
- 15.50 [8.3] Headline line 2 'AI가 다 채워요' MASK-UPs ('AI' in #5aa2ff). Visible 15.5-17.0.
- 15.75 Button press: scale 1 -> .94 -> 1 (0.18 s), white 40% ripple to 600 px fading in 0.4 s, 6-point sparkle burst. Button label reads '조회 중' 15.75-16.00 (the app's busy label). Status line under the bar: pulsing blue dot + 'AI가 채우는 중' (no seconds counter).
- 16.00 [9.1] Drums return. Status flips to a green check + '채웠어요' and fades with the bar. 'achieve' FLIPs out of the bar to centre at 2x (E.outExpo 0.25 s); bar, chip, label and status collapse (scaleY -> 0, fade, 0.2 s).
- 16.00 / 16.125 / 16.25 / 16.375 Four tiles burst out of the word: 뜻, 한글 발음, 예문, 비슷한 단어. Each starts at scale .3 on the word centre and flies to its slot (E.back(1.4) 0.28 s) while a 3 px rgba(255,255,255,.25) connector draws from word to tile (dashoffset, 0.15 s).
- Tile style: white, radius 36, padding 28/36, label #8b95a1 700 (the app's field labels: 뜻, 한글 발음, 예문 (영어) / 예문 해석, 비슷한 단어), value ink 800. 뜻 '성취하다'. 한글 발음 '어치브' + speaker icon (no IPA). 예문: English at 600 with 'achieve' underlined in blue, Korean line #4e5968 500. 비슷한 단어: chips 'accomplish', 'reach' (#f2f4f6, radius 26, #4e5968 700).
- 16.50-16.75 Hold: word 1 -> 1.04, tiles float +-4 px.
- 16.75-16.95 Tiles fly back into 'achieve' (reverse burst, E.inExpo 0.2 s); S7's wipe starts on top.

**가로 1920x1080**

- '1등 비결은?': one line 260 px, centred (960, 540) (~1300 px wide). Think mascot 200 px at x 1640-1840, y 380-580.
- Kicker after stack: x 140, y 90, 44 px.
- Headline: x 140, '단어만 치면,' 80 px cap-top y 170; 'AI가 다 채워요' 80 px cap-top y 270.
- Chip x 360, y 420 (60 px tall, 30 px). Label '영단어' 34 px at y 500.
- Input bar x 360-1560, y 550-700 (150 tall): typed text 92 px at left 48; button 270x110, radius 34, 38 px text, 20 px from the bar's right edge. Status line 30 px at y 730.
- Word after FLIP: 190 px, centred (960, 580). Ghost letters 900 px centred.
- Tiles (labels 30 px): 뜻 x 140-680, y 400-560, value 64 px. 한글 발음 x 1240-1780, y 400-560, value 56 px. 예문 x 140-960, y 720-920, English 32 px, Korean 28 px. 비슷한 단어 x 1100-1780, y 740-900, chips 34 px.

**세로 1080x1920**

- '1등': 260 px centred y 760. '비결은?': 230 px centred y 1020. Think mascot 190 px at x 130-320, y 1150-1340 (clear of the right rail).
- Kicker after stack: centred y 270, 40 px. Headline lines 64 px centred at y 350 and 430.
- Chip y 560 (56 tall). Label y 640. Input bar x 84-996, y 680-820 (140 tall): typed 80 px; button 220x100, 34 px. Status y 850. Ghost letters 760 px.
- Word after FLIP: 160 px centred (540, 620).
- Tiles (values 52 px, labels 28 px): 뜻 x 84-528, y 760-930. 한글 발음 x 552-996, y 760-930 (value text left-aligned, <= 900). 예문 x 84-996, y 954-1194 (two English lines 32 px, two Korean lines 28 px). 비슷한 단어 x 84-996, y 1218-1358.

**SFX**

- 14.00 deep sub boom (50 Hz, 0.8 s) alone; music silent until 14.5.
- 14.125 soft mascot pop.
- 14.75 slam for the input bar + soft whoosh. 14.8125 chip pop.
- 14.875-15.625 seven keystrokes: 12 ms noise burst (seeded band-pass 2.5-4 kHz) + 140 Hz thock (8 ms).
- 15.75 button click + sparkle shimmer (C7, E7, G7 on 1/32 notes, 0.2 s). 15.75-16.00 faint processing blips on 16ths.
- 16.00 drums re-enter with an impact. 16.00 / 16.125 / 16.25 / 16.375 tile pops G5, C6, E6, G6, each with a 60 ms 'zip'.
- 16.75 reverse swish as the tiles fly back.

### S7 · 17–22.5초 [9.3-12.2] · 간격 반복 복습 + 13가지 학습

엔진 등록: `SCENE({ id: 's7', start: 16.75, end: 22.5, inDur: 0.25 })` · 핸드오프: Exports HO.s7.examChip().

**문구 (화면 그대로)**

- [chip] 간격 반복 복습
- 까먹기 전에,
- 딱 맞춰 복습.
- [timeline] 오늘 · 1일 뒤 · 3일 뒤 · 7일 뒤 (gap labels)
- [card] achieve / 성취하다
- 13가지 방법으로,
- 질리지 않게.
- [chips] 플래시카드 · 뜻 고르기 · 단어 고르기 · 스펠링 · 듣고 쓰기 · 듣기 모드 · 문장 빈칸 · 문장 배열 · 말하기 · 듣고 고르기 · 철자 퍼즐 · 섞어 풀기 · 실전 시험
- [pill] + 미니 게임  짝 맞추기 · 단어 비

**들어오는 전환** (이 장면이 소유)

Skew wipe + word carry, 16.75-17.00 (S7 owns).
- S7's root (white) is revealed by a panel sweeping right -> left with a 12deg slanted leading edge (clip-path polygon, E.inOutExpo 0.25 s).
- S7 draws its own copy of 'achieve' at HO.s6.word() from 16.75 (identical look, so the seam is invisible over S6's word); at 17.00 it FLIPs into the review card (part of S7's own timeline).

**움직임 (시각은 절대 초)**


White #ffffff background. Two parts, each headline held >= 2.5 s; no ticker.


PART 1: SPACED REVIEW (17.00-19.25)

- 17.00 [9.3] Chip '간격 반복 복습' POPs (blueSoft bg, blue2 700). Line 1 '까먹기 전에,' MASK-UPs; line 2 '딱 맞춰 복습.' at 17.25 ('복습' in blue). Both hold until 19.25.
- 17.00 Timeline draws: 8 px #e5e8eb track scales 0 -> 1 from its start (E.out5 0.3 s). Four markers POP on 32nds 17.0625-17.25 (32 px white circles, 4 px #d1d6db border). Marker positions follow the app's INTERVALS [0, 1, 3, 7] as GAPS between reviews, so they sit at cumulative days 0 / 1 / 4 / 11 (proportional spacing: the gaps visibly grow). Only the first marker has a point label: '오늘'.
- 17.00-17.15 'achieve' (carried from S6) FLIPs into the review card resting on '오늘': white, radius 30, 3 px #3182f6 border, 'achieve' 800 over '성취하다' (#4e5968 600).
- The card hops to the next marker three times, landing at 17.50, 18.00 [10.1] and 18.50. Each hop takes 0.22 s ending on the landing time: x on E.inOut3, a parabola peaking 120 px up (L) / 120 px to the side (V).
- On each landing: card squashes (sy .9 -> 1); the marker fills #3182f6 with a white check (POP); a blue progress line fills the track up to it; a gap label POPs over that segment: '1일 뒤', '3일 뒤', '7일 뒤' (pill, bg #e8f3ff, text #1b64da 800).
- 18.50-19.25 Card glows (0 0 0 12px rgba(49,130,246,.18)); everything holds.

MORPH (19.25-19.50)

- Headline MASK-OUTs upward; timeline slides left and fades (E.inExpo 0.2 s); gap pills fade.
- The review card FLIPs into the first grid slot and becomes the '플래시카드' chip (text crossfades 'achieve' -> '플래시카드' 19.40-19.50; border 3 px blue -> 1.5 px #e5e8eb).

PART 2: 13 MODES (19.50-22.50)

- 19.50 [10.4] Headline '13가지 방법으로,' ('13가지' in blue) and '질리지 않게.' MASK-UP with a 0.125 s stagger; held to 22.25.
- 19.5625-20.25 The other 12 chips POP in reading order on 32nds (scale .6 -> 1, E.back 0.2 s, each from 40 px toward the 플래시카드 chip). Grid complete at 20.25 and held fully readable 20.25-22.25 (2.0 s).
- Chip style: white, radius 28, 1.5 px #e5e8eb border, 56 px icon tile (mode colour at 12% bg, icon in the mode colour), name 700.
- Mode colours in order: #3182f6, #03b26c, #0aa5b4, #fe9800, #8b5cf6, #1b64da, #e64980, #f04452, #0aa5b4, #8b5cf6, #fe9800, #03b26c, #3182f6. Icons in order: cards, check, repeat, keyboard, headphones, speaker, quote, rows, mic, headphones, shuffle, sparkles, trophy.
- 20.50 [11.2] Pill '+ 미니 게임  짝 맞추기 · 단어 비' POPs (#fff3e0 bg, #ff9f00 800).
- 21.00-21.50 A white 30% sheen sweeps across the chips once, left to right.
- 22.00 [12.1] The '실전 시험' chip pulses (border -> 4 px #3182f6, scale 1.04 -> 1) to cue the handoff.
- 22.25-22.50 Other chips scatter outward 80 px and fade (E.in3); the headline fades. S8 draws the '실전 시험' chip growing on top. S7 hides its own 실전 시험 chip from 22.25.

**가로 1920x1080**

PART 1
- Chip x 140, y 110 (64 px tall, 32 px text).
- Headline x 140, 110 px, cap-tops y 200 and 330.
- Timeline track y 720, x 260-1600 (121.8 px per day). Markers at x 260 / 382 / 747 / 1600. '오늘' label 30 px 700 #4e5968 under the first marker at y 770.
- Review card 260x124 ('achieve' 46 px, meaning 28 px), resting 40 px above the track (y 556-680).
- Gap pills 30 px text, 52 px tall, centred over each segment at y 470: x 321 / 565 / 1174.
PART 2
- Headline x 140, 96 px, cap-tops y 110 and 220.
- Grid: 13 chips 300x92 in rows of 5 / 5 / 3, gap 16, centred on x 960, at y 400 / 508 / 616; names 36 px. '실전 시험' = row 3, col 3.
- Mini-game pill centred y 760, 64 px tall, 34 px.

**세로 1080x1920**

PART 1
- Chip centred at y 270.
- Headline 104 px centred at y 380 and 500.
- Vertical timeline: line x 230, y 680-1300 (56.4 px per day). Markers at y 680 / 736 / 905 / 1300. '오늘' 32 px right-aligned to x 196 at y 680.
- Review card 280x120 at x 290-570, centred on its marker; each hop arcs 120 px to the right.
- Gap pills 30 px at x 640-860, centred on segment midpoints y 708 / 820 / 1102.
PART 2
- Headline 96 px centred at y 300 and 410.
- Grid: 3 columns of 290x96 chips, gap 16 (x 89-991), rows at y 520 / 632 / 744 / 856 / 968 (last row: 실전 시험 alone, centred); names 32 px. Text in the right column stays at x <= 900 (rows are above y 1100 anyway).
- Mini-game pill centred y 1110, 60 px tall, 32 px.

**SFX**

- 16.75 skew-wipe whoosh (pan R->L).
- 17.00 chip pop (mask-ups are silent). 17.0625-17.25 four soft marker ticks. 17.15 card-settle tick.
- 17.28 / 17.78 / 18.28 take-off 'hup' (sine 300->600 Hz, 40 ms). 17.50 / 18.00 / 18.50 landing dings E6, G6, C7 (bell sine, 0.3 s) + small pill pops.
- 19.25 morph whoosh. 19.50 chip land thock. 19.5625-20.25 twelve micro-pops on 32nds (pentatonic up, -16 dB).
- 20.50 mini-game pill pop. 21.00 soft sheen shimmer (-24 dB). 22.00 chip pulse tick.

### S8 · 22.5–25초 [12.2-13.3] · 영어는 기본, 중국어까지 (EN/中 반반 화면)

엔진 등록: `SCENE({ id: 's8', start: 22.25, end: 25, inDur: 0.25 })` · 핸드오프: none

**문구 (화면 그대로)**

- 영어는 기본,
- 중국어까지.
- [toggle] EN | 中
- [EN half] victory · 승리 · 기초 · 중학교 · 고등학교 · 수능 · 토익 · 44,017 영어 내장 사전 단어
- [中 half] 胜利 · shènglì · 승리 · HSK 1~2급 · HSK 3~4급 · HSK 5~6급 · 신HSK 7~9급 · 11,470 중국어 HSK 단어 · 병음 포함 · HSK 1~6급 · 신HSK 1~9급 (last line L only)

**들어오는 전환** (이 장면이 소유)

Chip becomes the frame, 22.25-22.50 (S8 owns).
- S8's root is clipped with inset(...) round r from HO.s7.examChip() to the full frame (radius 28 -> 0, E.inOutExpo); its background fill goes white -> #3182f6 during the first 40%.
- S7 scatters its other chips underneath. At 22.50 the frame is solid blue and the first slam hits.

**움직임 (시각은 절대 초)**


Reworked so it is NOT v1's 'tap -> word turns Chinese -> red flood': the frame becomes two side-by-side worlds and one small toggle shows that the switch changes the whole app theme (blue <-> red). '胜利' is its own Chinese entry, not a morph of 'victory'. The level chips are the game's real levels in each language (WQ_LV).

- 22.50 [12.2] Full blue (#3182f6). EN half content only (right half empty blue). '영어는 기본,' SLAMs (white 900, SHAKE 8 px). A white toggle pill 'EN | 中' sits at the seam position with the blue knob under 'EN' (white 900), '中' (Noto SC 800, #8b95a1).
- 22.625 'victory' (white 800) SLAMs with '승리' (white 75%, 700) under it.
- 22.75-22.9375 EN level chips POP on 32nds ('기초', '중학교', '고등학교', '수능 · 토익'; white 16% pills, white 700).
- 22.75-23.25 Counter chip: '44,017' ROLLs as an odometer, lands 23.25; label '영어 내장 사전 단어'.
- 23.00 [12.3] THE SWITCH: the toggle knob slides EN -> 中 (spring 0.3 s) and turns #3182f6 -> #f04452; at the same moment a #f04452 panel pushes in from the far edge (L: from the right edge to x 960; V: from the bottom edge to y 880) with a hard straight edge (E.outExpo 0.25 s). The EN half stays blue: the frame is now half blue, half red, with the toggle straddling the seam.
- 23.00 '중국어까지.' SLAMs in the red half (SHAKE 8 px). 23.125 '胜利' (Noto SC 800, white) SLAMs. 23.25 'shènglì · 승리' (pinyin white 600, '승리' white 75%) MASK-UPs.
- 23.25-23.4375 HSK chips POP on 32nds ('HSK 1~2급', 'HSK 3~4급', 'HSK 5~6급', '신HSK 7~9급').
- 23.25-23.75 Counter chip '11,470' ROLLs, lands 23.75; label '중국어 HSK 단어 · 병음 포함'. L only: third line 'HSK 1~6급 · 신HSK 1~9급' (white 75%) fades up at 23.75.
- Watermarks: 'A' (Pretendard 900) in the blue half and '中' (Noto SC 800) in the red half, white 7%, SLAM in with their halves (scale 1.3 -> 1) and drift -20 px.
- 23.75-24.75 Hold (both halves fully readable 1.0 s+). 24.50 toggle knob pulses once (1 -> 1.08 -> 1).

Chip style: rgba(255,255,255,.16) bg, radius 999 (level chips) / 32 (counter chips).


**가로 1920x1080**

Seam: vertical at x 960.
- Toggle 260x100 centred (960, 120); knob 120x84; 'EN' 40 px 900, '中' 46 px.
- EN half (text from x 120): '영어는 기본,' 104 px cap-top y 230; 'victory' 170 px, y 400-560; '승리' 56 px at y 600; level chips row y 700 (52 px tall, 26 px); counter chip x 120-840, y 800-940 ('44,017' 72 px 800 tabular, label 30 px). Watermark 'A' 700 px centred (480, 640).
- 中 half (text from x 1080): '중국어까지.' 104 px cap-top y 230; '胜利' 200 px, y 380-580; 'shènglì · 승리' 52 px at y 610; HSK chips row y 700 (x 1080-1810); counter chip x 1080-1800, y 790-960 ('11,470' 72 px, label 30 px, HSK line 26 px). Watermark '中' 700 px centred (1440, 640).

**세로 1080x1920**

Seam: horizontal at y 880.
- EN half: '영어는 기본,' 96 px centred y 330; 'victory' 150 px centred y 500; '승리' 44 px y 600; level chips row y 680 (52 px tall, 28 px, ~570 px wide); counter line y 770: '44,017' 56 px + '영어 내장 사전 단어' 30 px. Watermark 'A' 520 px centred (540, 470).
- Toggle 240x92 centred (540, 880), straddling the seam.
- 中 half: '중국어까지.' 96 px centred y 1000; '胜利' 150 px centred y 1150; 'shènglì · 승리' 40 px y 1250; HSK chips row y 1310 (28 px, ~720 px wide); counter line y 1395: '11,470' 52 px + 'HSK 단어 · 병음 포함' 30 px. Watermark '中' 520 px centred (540, 1220). Nothing below y 1430.

**SFX**

- 22.25 upward morph whoosh. 22.50 impact (F). 22.625 small hit for 'victory'.
- 22.75-22.9375 four chip ticks. 22.75-23.25 odometer ticks (1/32), 23.25 'tock'.
- 23.00 big hit + toggle click + spring 'boing' (sine 400->700 Hz, 0.18 s) + push whoosh (R->L in L, low->high in V) + pentatonic Karplus-Strong pluck run 23.00-23.25 (C5 D5 E5 G5 A5 C6 D6 E6, 1/32 notes).
- 23.25-23.4375 four chip ticks. 23.25-23.75 odometer ticks, 23.75 'tock'. 24.50 soft knob blip.

### S9 · 25–30초 [13.3-16.1] · 선생님은: 반 만들고, 과제 내고, 실시간으로 확인, 수업 도구까지

엔진 등록: `SCENE({ id: 's9', start: 24.75, end: 30, inDur: 0.25 })` · 핸드오프: Exports HO.s9.toolRows().

**문구 (화면 그대로)**

- [pill] 선생님은
- 반 만들고,
- 과제 내고,
- 실시간으로 확인,
- 수업 도구까지.
- UI A: 2학년 3반 / 초대 코드 / A7K2QX / 3과 단어 시험 / 시험 · 20단어 · 10. 17.까지 / 제출 21/28 / 평균 86점
- UI B: 2학년 3반 실시간 / 24 접속 · 18 공부 중 · 28 전체 / [student card] 학생 화면 · 17/20 -> 20/20 · proud 자랑스러운 -> honest 정직한 -> curious 호기심이 많은 / 과제를 제출했어요. 이번 100점 / [live card] 김서연 20301 · 3과 단어 · 실전 시험 17/20 -> 20/20 · 맞음 17 -> 20 · 틀림 0 · 오늘 37단어 -> 40단어 -> 3과 단어 · 실전 시험 끝냄 · 정답 100% / 5초마다 새로 고쳐요.
- UI C: 퀴즈 쇼 · 단어 빙고판 · 발표자 뽑기·모둠 · 수업 타이머 · 시험지 인쇄

**들어오는 전환** (이 장면이 소유)

Stripe push, 24.75-25.00 (S9 owns).
- S9's root (#f2f4f6) is revealed through horizontal stripes (L: 8 x 135 px; V: 10 x 192 px) via clip-path path(); even stripes grow from the left edge, odd from the right, width 0 -> W (E.inOutExpo 0.2 s, 0.006 s stagger from the top).
- At 25.00 the frame is whole and the first line slams.

**움직임 (시각은 절대 초)**


bg #f2f4f6. The audience switches to teachers. Three readable beats, each ~1.5 s, with ONE large proof on stage at a time (no six-card wall).


HEADLINE RULE: L: the current line is 100 px; earlier lines STACK upward at 60 px, ink 40%, so the whole sentence builds. V: beat A shows two lines ('반 만들고,' then '과제 내고,' below it); at beat B and C the line block is replaced (old slides up 80 px and fades).


BEAT A (25.00-26.50): class + assignment

- 25.00 [13.3] Pill '선생님은' POPs (ink bg, white 800). '반 만들고,' SLAMs (SHAKE 8 px).
- Stage A: class name '2학년 3반' (800), label '초대 코드' (#8b95a1 700), six split-flap tiles (ink #191f28, radius 20, white 800 tabular, 2 px rgba(0,0,0,.35) seam at mid-height). Tiles cycle seeded A-Z0-9 at 15 Hz (frame-locked) and lock left -> right on 16ths 25.125-25.75 spelling 'A7K2QX'; each lock = 0.1 s top-half flip (rotateX).
- 25.50 [13.4] '과제 내고,' SLAMs. The assignment card POPs under the code: white, radius 40; title '3과 단어 시험' (800); meta '시험 · 20단어 · 10. 17.까지' (#8b95a1 600); row '제출' + count ROLLing 0 -> '21/28' + bar filling 0 -> 75% (#3182f6 on #e5e8eb), 25.55-26.00, E.out3.
- 26.00 [14.1] Pill '평균 86점' (#e5f8ef bg, #03b26c 800) SLAMs at the card's top-right. Hold to 26.50.

BEAT B (26.50-28.00): live view with cause -> effect

- 26.50 [14.2] '실시간으로 확인,' SLAMs ('실시간' green #03b26c + 14 px green dot pulsing 1 <-> 1.5 at 1.6 Hz). Stage A slides out left (E.inExpo 0.2 s); stage B slides in from the right (E.outExpo 0.3 s).
- Stage B: header '2학년 3반 실시간' (800) + green dot; number chips '24' 접속 (green), '18' 공부 중 (blue), '28' 전체 (ink), labels #8b95a1. Left: a floating STUDENT card (no device frame; small chip '학생 화면'; progress '17/20'; question word 'proud' 800; one answer row '자랑스러운'). Right: the teacher's big LIVE card for 김서연: name 800 + '20301' (#8b95a1) + green dot, activity '3과 단어 · 실전 시험', big count '17/20' (800 tabular), 14 px bar (#3182f6), '맞음 17' (green 800) · '틀림 0' (coral 800), '오늘 37단어' (#8b95a1). 3 px #3182f6 border (studying). A dashed green line (4 px #03b26c, dash 2 10, round caps, offset flowing toward the live card at 60 px/s) joins them.
- 26.75 / 27.00 / 27.25 TAP on the student's answer row: it turns green; a 16 px glowing green pulse (#22c55e + 24 px glow) leaves the student card and runs along the line (0.2 s, E.inOut3). On arrival (26.95 / 27.20 / 27.45) the live card ticks: '18/20', '19/20', '20/20'; 맞음 18 / 19 / 20; bar 90 / 95 / 100%; 오늘 38 / 39 / 40단어; border glows blue for 0.25 s. The student card rolls to the next word each time ('honest' 정직한, 'curious' 호기심이 많은).
- 27.50 [14.4] Live card switches to the done state (the app's lvStatus): text '3과 단어 · 실전 시험 끝냄 · 정답 100%'; bar and 맞음/틀림 row collapse (0.2 s); border -> #03b26c with a pop (scale .96 -> 1.03 -> 1, 0.4 s) + soft green glow + 3 sparkles. The student card shows a green box '과제를 제출했어요. 이번 100점' (#e5f8ef, #03b26c 800). Small footer under the live card: '5초마다 새로 고쳐요.' (honest; time is compressed). Hold to 28.00.

BEAT C (28.00-29.75): classroom tools

- 28.00 [15.1] '수업 도구까지.' SLAMs. Stage B flips away (rotateX 90deg, 0.15 s).
- 28.00 / 28.0625 / 28.125 / 28.1875 / 28.25 Five tool rows SLAM in from the right (translateX +200 -> 0, skewX -10deg -> 0, E.outExpo 0.18 s). Each row: colour bar, radius 30, white icon in a white-20% circle, name white 800: 퀴즈 쇼 #fe9800 (sparkles) · 단어 빙고판 #03b26c (grid) · 발표자 뽑기·모둠 #8b5cf6 (users) · 수업 타이머 #0aa5b4 (clock) · 시험지 인쇄 #3182f6 (print).
- 28.45-29.75 Held still and fully readable (1.3 s settled, 1.5 s from first legibility). 29.00 the icons do one tiny bounce wave (16th stagger, 6 px).
- 29.75 S10 takes over (the rows themselves become the transition).

**가로 1920x1080**

- Left column x 140: pill y 110 (64 px tall, 34 px). Current line 100 px, cap-top y 470. Stacked older lines 60 px ink 40%, cap-tops (newest lowest) y 390 / 320 / 250.
- Stage x 1000-1800.
- Stage A: '2학년 3반' 44 px at y 150; '초대 코드' 30 px at y 220; tiles 6 x (112x156), gap 12 (x 1034-1766), y 260-416, characters 110 px. Assignment card x 1000-1800, y 470-800: title 52 px, meta 30 px, '제출' 30 px + count 40 px + bar 16 px; '평균 86점' pill 34 px.
- Stage B: header 44 px at y 150; number chips y 220-300 (numbers 40 px 900, labels 26 px). Student card x 1000-1260, y 360-760 ('학생 화면' 24 px, '17/20' 28 px, word 64 px, answer row 60 px tall / 30 px). Live card x 1420-1800, y 340-780, radius 32: name 44 px, id 28 px, activity 30 px, count 56 px, bar 14 px, 맞음/틀림 30 px, 오늘 26 px; done text 34 px green 800 (two lines). Dashed line from (1260, 560) to (1420, 560). Footer 26 px at y 820.
- Stage C: rows 800x120 at x 1000-1800, y 200 / 340 / 480 / 620 / 760; icon circle 76 px; names 50 px.

**세로 1080x1920**

- Pill centred y 270 (60 px tall, 32 px). Lines 100 px centred: beat A '반 만들고,' y 380 + '과제 내고,' y 490; beat B / C single line at y 430.
- Stage x 84-996, y 600-1430.
- Stage A: '2학년 3반' 44 px y 620; '초대 코드' 30 px y 680; tiles 6 x (130x176), gap 12 (x 120-960), y 720-896, chars 120 px. Assignment card y 940-1260: title 48 px, meta 30 px, count 40 px, bar 16 px, pill 34 px.
- Stage B: header 44 px y 620; number chips y 680-750 (40 px / 28 px). Student card x 84-444, y 800-1220 ('학생 화면' 28 px, count 30 px, word 72 px, answer row 64 px / 34 px). Live card x 600-996, y 780-1240: name 44 px, id 28 px, activity 30 px, count 60 px, bar, 맞음/틀림 32 px, 오늘 28 px; all text left-aligned from x 630 and <= 270 px wide below y 1100 (rail). Dashed line x 444 -> 600 at y 1010. Footer 26 px at y 1290.
- Stage C: rows 912x128 at x 84-996, y 620 / 772 / 924 / 1076 / 1228 (end 1356); icon 80 px; names 54 px from x 200 (text ends < 900).

**SFX**

- 24.75-25.00 stripe flutter (8-10 quick 3 kHz 'tk' clicks).
- 25.00 impact (C) + pill pop. 25.125-25.75 split-flap clatter (6 ms clacks at 15 Hz per tile), a heavier clack on each lock.
- 25.50 impact + card pop. 25.55-26.00 submission ticks. 26.00 success blip (E6 + G6).
- 26.50 impact + live 'ping' (sine 1318 Hz 0.12 s + 30 ms echo).
- 26.75 / 27.00 / 27.25 tap click + soft bell C6 (-14 dB). 26.95 / 27.20 / 27.45 data-arrival blips (E6 -> A6, 60 ms each).
- 27.50 done pling G6 + submit arpeggio C6-E6-G6 on 16ths.
- 28.00 impact; 28.00-28.25 five tool slams: toms 220 / 196 / 174 / 156 / 138 Hz with fast pitch drop + short whoosh.
- 29.00 tiny tick wave (-26 dB). 29.00-29.75 noise riser.

### S10 · 30–34초 [16.1-18.1] · 엔딩: 공부는 게임처럼, 실력은 진짜로 · 무료로 시작하기

엔진 등록: `SCENE({ id: 's10', start: 29.75, end: 34, inDur: 0.25 })` · 핸드오프: none

**문구 (화면 그대로)**

- 공부는 게임처럼, 실력은 진짜로.
- VocaPro
- 무료로 시작하기 →
- vocapro.kro.kr
- 휴대폰·PC 어디서나 · 앱으로 설치
- [mascot bubble] 다음 단어왕은 너야!

**들어오는 전환** (이 장면이 소유)

Tool rows become stripes, 29.75-30.00 (S10 owns).
- S10 draws 5 rects starting at HO.s9.toolRows() (same colours and radii) and animates x, y, width, height and radius to five full-frame stripes (L: full-width, 216 px tall each; V: full-width, 384 px tall each), E.inOutExpo with 0.02 s stagger from the top, while each fill tweens to #3182f6. S9's headline is covered as the stripes widen.
- At 30.00 the frame is solid blue (S10 background on) and the logo slams.

**움직임 (시각은 절대 초)**


Flat Toss blue #3182f6. One faint ring motif (3 concentric 2 px rings, white 12%, expanding slowly) behind the logo. No blobs. Brand bug is hidden.


EVERYTHING (logo, CTA, URL) IS UP BY 31.0 AND HELD 3.0 s TO THE END. No fade-out of the picture.

- 30.00 [16.1] Logo mark SLAMs (white rounded square, blue V; scale 1.3 -> 1, E.out5 0.16 s, no shake). Wordmark 'VocaPro' (white 800) reveals letter by letter: y 60% -> 0, blur 8 -> 0, 0.03 s stagger, E.out5 0.4 s. Sonic logo plays.
- 30.25 Tagline '공부는 게임처럼, 실력은 진짜로.' (white 700, 90%) MASK-UPs above the logo; 30.50-30.70 a gold underline (8 px #ffc93c, radius 4) wipes under '진짜로'.
- 30.50 [16.2] CTA POPs: white pill (radius 999, shadow 0 24px 60px rgba(10,30,80,.35)), label '무료로 시작하기' (#1b64da 800) + right-arrow icon.
- 30.75 URL 'vocapro.kro.kr' (white 700, tracking 0) MASK-UPs. 30.875 footer '휴대폰·PC 어디서나 · 앱으로 설치' (white 75%, 600) fades up.
- 31.00 [16.3] Happy mascot POPs in (E.back 0.4 s), then bobs +-6 px at 1.4 Hz. 31.125 its speech bubble POPs from the tail: white, radius 32, '다음 단어왕은 너야!' (#1b64da 800). This closes the S1 question on the viewer.
- 31.50 [16.4] TAP ring on the CTA (appears 31.42): button 1 -> .96 -> 1 (0.18 s), blue 25% ripple inside it fading by 32.0.
- 32.00 [17.1] Final chord: a white 2 px pulse ring around the CTA (scale 1 -> 1.25, opacity .6 -> 0, 0.4 s); logo breathes 1 -> 1.01 over 32.0-33.0.
- 32.50 Second pulse ring (gone by 32.90). 32.70 mascot blink squash (0.12 s).
- 32.90-34.00 Still poster hold; only the mascot bob (+-6 px) and the slow rings move. render.js grabs the poster at 33.2 s (DUR - 0.8): it must be clean.

**가로 1920x1080**

- Tagline 60 px 700, centred y 220.
- Logo row centred y 400: mark 150x150, gap 28, wordmark 150 px.
- CTA 108 px tall, padding 0 64, text 46 px + arrow 38 px, centred y 620 (~520 px wide).
- URL 46 px centred y 760. Footer 28 px centred y 830.
- Mascot 220 px at x 1540-1760, y 720-940 (whole body in frame). Bubble x 1180-1530, y 700-790, tail pointing right-down to the mascot, text 38 px.

**세로 1080x1920**

- Tagline two lines 60 px 700 at y 400 ('공부는 게임처럼,') and 480 ('실력은 진짜로.').
- Logo row centred y 680: mark 140, gap 24, wordmark 116 px.
- CTA 120 px tall, ~640 px wide, 48 px text, centred y 900.
- URL 50 px centred y 1050. Footer 30 px centred y 1115.
- Mascot 200 px at x 140-340, y 1190-1390. Bubble x 370-880, y 1230-1330, tail left, text 40 px. Everything above y 1430 and left of x 900.

**SFX**

- 29.75-30.00 stripes whoosh (5 short stacked sweeps).
- 30.00 big hit on C + logo slam + SONIC LOGO, one note per syllable '보-카-프-로': bell G5 / C6 / E6 / G6 at 30.00 / 30.125 / 30.25 / 30.375.
- 30.25 soft tagline whoosh. 30.50 CTA pop + gold-underline swish. 30.75 soft URL whoosh.
- 31.00 mascot 'boing' (F chord). 31.125 bubble pop.
- 31.50 button click + success chime (C6-E6-G6 on 1/32 notes, -12 dB) (G chord).
- 32.00 final C chord + bell C7 + soft crash; ring shimmer. 32.50 second ring shimmer (-24 dB).
- 33.00-34.00 reverb tail fades to silence.

## 5. 음악 (코드로 합성한 원곡)

ORIGINAL SYNTH SCORE, all generated in code (OfflineAudioContext or plain Node PCM at 48 kHz stereo), no samples. Seeded noise only.
TEMPO / GRID: 120 BPM, 4/4, 17 bars = 34.0 s. 1 beat = 0.5 s = 30 frames @60 fps. Every scene cut lands on a beat: 2.0, 4.0, 10.0, 12.0, 14.0, 17.0, 22.5, 25.0, 30.0.
KEY: C major / A minor, one chord per bar unless noted:
| 1 Am | 2 F->G | 3 C | 4 G | 5 Am | 6 F | 7 C | 8 Am (breakdown) | 9 F | 10 G | 11 Am | 12 F | 13 C | 14 G | 15 F->G | 16 C (30.0) -> F (31.0) -> G (31.5) | 17 C (32.0, ring-out) |
ARRANGEMENT BY BAR
- Bar 1 (0-2) HOOK: staccato chord stabs on beats 1-3 (0.0, 0.5, 1.0), each with kick + sub. Stab = detuned saw stack +-7 cents + square an octave up, LPF 2.5 kHz, 0.18 s decay; Am voicing A3 C4 E4 A4. Beat 3 adds clap + crash. 1.75-2.0 reverse cymbal, hard cut at 2.0.
- Bar 2 (2-4) BUILD: filtered saw pad opening LPF 400 -> 4000 Hz; kick on every beat; snare roll 8ths (2.5-3.0) -> 16ths (3.0-3.5) -> 32nds (3.5-3.875) with rising velocity + noise riser. 3.9375-4.0 completely silent.
- Bars 3-5 (4-10) DROP / THE GAME: four-on-the-floor kick (sine 150->48 Hz in 90 ms, 0.35 s decay, 2 ms click); clap on 2 and 4; closed hats on off-8ths; 1/16 shaker; open hat on the 'and' of 4. Bass: pumping saw on 1/8 roots, LPF 600 Hz, sidechain-ducked to 0.35x and recovering over 120 ms after each kick. Lead: square off-beat stabs on chord tones. The correct-answer dings (C6 D6 E6 G6 A6 C7, 5.5-8.0) ride on top as the melody. 5.0: music ducks -9 dB for 0.25 s under the wrong buzz. Bar 5 beat 1 (8.0) crash; 8.25 combo impact; 9.0-9.5 1/16 tom + snare fill under the time-lapse, blips from the A-minor pentatonic (A5 C6 D6 E6). 9.50 TAPE-STOP of the whole music bus: render bars 3-5 to a buffer and read 9.50-9.75 at rate r = (1-u)^2, u = (t-9.5)/0.25, gain (1-u)^0.5; then silence until 10.0 apart from the zoom whoosh.
- Bar 6 (10-12) RESULT: crash on 10.0, groove back; short square-lead fanfare G4-C5-E5-G5 on 8ths from 10.5.
- Bar 7 (12-14) LEADERBOARD: same groove; fanfare peaks on C6 at 13.0 with a brass-like stab (saw stack, fast attack, 0.4 s).
- Bar 8 (14-16) BREAKDOWN: everything drops at 14.0 except a 50 Hz sub boom (0.5 s of silence above it). From 14.5 a soft 1/16 pluck arpeggio climbs A3-C4-E4-A4 (triangle + sine, 0.2 s decay, 3/16 ping-pong delay, feedback 0.3). The typing clicks are the percussion.
- Bars 9-12 (16-24) FEATURE GROOVE (lighter): drums return at 16.0; kick on 1 and 3 + ghost on the 'and' of 2; clap 2 and 4; soft 1/16 hats with accented 8ths; sustained bass roots with octave pops; pluck arpeggio continues over a low-passed pad. Hop dings E6 / G6 / C7 at 17.5 / 18.0 / 18.5. 19.5625-20.25 chip micro-pops ride the 32nds. Bar 12 brightens (pad filter to 6 kHz); 22.5 impact; 23.0 big hit + pentatonic Karplus-Strong pluck run C5 -> E6 (1/32 notes, 23.0-23.25).
- Bars 13-15 (24-30) TEACHER: four-on-the-floor returns at 24.0; bright pluck in 8ths; 25.0 / 25.5 / 26.5 / 28.0 impacts on the headline slams. 28.0-28.25 five descending tom hits (32nds). Bar 15 beat 3 onward (29.0-29.75) noise riser; 29.75 stripes whoosh.
- Bar 16 (30-32) FINALE: 30.0 big C chord hit (pad + bass + crash) with the SONIC LOGO, bell G5-C6-E6-G6 on 16ths (30.0 / 30.125 / 30.25 / 30.375, one note per syllable '보-카-프-로'); kick on beats, clap on 30.5 and 31.5; 31.0 F, 31.5 G (button click + chime). Drums stop after 31.75.
- Bar 17 (32-34) RING-OUT: 32.0 final C-major chord (pad + sub + bell C7 + soft crash), long reverb tail; 33.0-34.0 master fade to silence.
SYNTH RECIPES
- Kick: sine 150 -> 48 Hz in 90 ms, amp e^(-t/0.35), 2 ms noise click.
- Clap: 3 band-passed noise bursts (1.2 kHz) 10 ms apart, 0.12 s tail.
- Hats: noise HPF 8 kHz; closed 40 ms, open 250 ms. Snare: noise BP 1.8 kHz + 180 Hz body, 0.1 s. Toms: sine with fast pitch drop.
- Crash: noise HPF 5 kHz + inharmonic sines (3.2 / 4.1 / 5.3 / 6.7 / 8.2 / 9.6 kHz), e^(-t/1.2).
- Riser: noise through a band-pass sweeping 300 * 2^(5u) Hz, amp u^2. Reverse cymbal: HPF noise, exponential rise, hard cut on the downbeat.
- Impact: 55 Hz sine boom 0.8 s + 50 ms noise burst.
- Bells / dings: sine + 2x partial (-6 dB) + 3x partial (-16 dB), 0.35 s exponential decay (sonic logo: 0.9 s).
- Pluck: Karplus-Strong. Pad: 4 saws detuned +-7 / +-12 cents, LPF 1.2 kHz, attack 0.2 s. Brass stab: 4 saws +-5 cents, LPF env 600 -> 3000 -> 1200 Hz.
- Reverb: small feedback-delay network or convolution with generated decaying noise (2.2 s, HPF 300 Hz).
SFX RECIPES: whoosh = noise through a moving band-pass, amp (sin pi u)^1.5, 0.2-0.5 s. pop = sine 400 -> 900 Hz in 30 ms, e^(-t/0.04). boing = 300 Hz sine with a decaying 9-12 Hz pitch wobble. key = band-passed noise 12 ms (seeded centre 2.5-4 kHz) + 140 Hz thock 8 ms. tick = 3 kHz click 6 ms. buzz (wrong) = squares 196 + 208 Hz, LPF 1.5 kHz, 0.28 s. buzzer (time up) = saws 140 + 147 Hz, 0.45 s. ka-ching = bells 1568 + 2093 Hz + sparkle noise. confetti sparkle = 15 seeded sine pings 3-6 kHz. flame crackle = seeded filtered noise grains 0.4 s.
MIX: music bed ~ -18 LUFS under the SFX; SFX peaks -8 dBFS, panned to where things move; big hits sidechain the bed down 4 dB. Master: light glue compression, limiter -1 dBTP, ~ -14 LUFS integrated. Landscape and vertical use the identical WAV (out/ad2.wav).

## 6. 마스터 큐 리스트 (storyboard.json `cues`와 동일)

| t (s) | 마디.박 | SFX |
|---|---|---|
| 0 | 1.1 | slam hit (Am stab) |
| 0.5 | 1.2 | slam hit +2 st |
| 1 | 1.3 | BIG hit + crash + up-whoosh |
| 1.25 | 1.3.5 | boing (wobble) |
| 1.5 | 1.4 | falling whistle (to 1.64) |
| 1.64 | 1.4.28 | crown ting |
| 1.75 | 1.4.5 | reverse cymbal + zoom whoosh (to 2.00) |
| 2 | 2.1 | whoosh + lockup pop |
| 2.0625 | 2.1.125 | impact (대결) |
| 2.125 | 2.1.25 | pop (무료) |
| 2.5 | 2.2 | countdown beep 880 Hz + flip-clack |
| 3 | 2.3 | countdown beep + flip-clack |
| 3.5 | 2.4 | countdown beep + flip-clack; riser to 3.9375 |
| 3.75 | 2.4.5 | expand whoosh |
| 3.9375 | 2.4.875 | silence (to 4.00) |
| 4 | 3.1 | DROP: GO beep 1760 Hz + sub boom + crash |
| 4.125 | 3.1.25 | UI whoosh |
| 4.1875 | 3.1.375 | tick |
| 4.25 | 3.1.5 | tick |
| 4.3125 | 3.1.625 | tick |
| 4.375 | 3.1.75 | tick |
| 4.4375 | 3.1.875 | tick |
| 4.5 | 3.2 | tick |
| 4.92 | 3.2.84 | tap click |
| 5 | 3.3 | WRONG buzz + music duck -9 dB 0.25 s + glass-crack tick |
| 5.25 | 3.3.5 | card-roll swish |
| 5.5 | 3.4 | ding C6 + tap |
| 5.75 | 3.4.5 | card-roll swish |
| 6 | 4.1 | ding D6 + tap |
| 6.25 | 4.1.5 | card-roll swish |
| 6.5 | 4.2 | ding E6 + tap |
| 6.75 | 4.2.5 | card-roll swish |
| 7 | 4.3 | ding G6 + tap |
| 7.25 | 4.3.5 | card-roll swish |
| 7.5 | 4.4 | ding A6 + tap |
| 7.75 | 4.4.5 | card-roll swish |
| 8 | 5.1 | ding C7 + tap + up-whoosh (combo flip) |
| 8.25 | 5.1.5 | combo impact + crash + flame crackle |
| 8.75 | 5.2.5 | collapse swish |
| 9 | 5.3 | blip A5 + score ticks |
| 9.125 | 5.3.25 | blip C6 |
| 9.25 | 5.3.5 | blip D6 |
| 9.375 | 5.3.75 | blip E6 |
| 9.5 | 5.4 | time-up buzzer + music tape-stop (to 9.75) |
| 9.75 | 5.4.5 | rising whoosh (to 10.00) |
| 10 | 6.1 | crash + sub hit; odometer ticks to 10.4375 |
| 10.25 | 6.1.5 | mascot boing |
| 10.5 | 6.2 | ka-ching + thud + confetti sparkle (to 11.50) |
| 11 | 6.3 | pop G5 |
| 11.125 | 6.3.25 | pop C6 |
| 11.25 | 6.3.5 | pop E6 |
| 11.75 | 6.4.5 | doors whoosh (stereo split) |
| 12 | 7.1 | kick + crash |
| 12.25 | 7.1.5 | toggle click + pedestal thunk |
| 12.5 | 7.2 | pedestal thunk (higher) |
| 13 | 7.3 | fanfare stab + big thunk |
| 13.15 | 7.3.3 | crown ting + sparkle |
| 13.5 | 7.4 | slam pop + shine |
| 14 | 8.1 | sub boom 50 Hz alone (music silent) |
| 14.125 | 8.1.25 | mascot pop |
| 14.75 | 8.2.5 | input bar slam + soft whoosh |
| 14.8125 | 8.2.625 | chip pop |
| 14.875 | 8.2.75 | key |
| 15 | 8.3 | key |
| 15.125 | 8.3.25 | key |
| 15.25 | 8.3.5 | key |
| 15.375 | 8.3.75 | key |
| 15.5 | 8.4 | key |
| 15.625 | 8.4.25 | key |
| 15.75 | 8.4.5 | button click + sparkle shimmer; processing blips to 16.00 |
| 16 | 9.1 | drums back impact + tile pop G5 + zip |
| 16.125 | 9.1.25 | tile pop C6 + zip |
| 16.25 | 9.1.5 | tile pop E6 + zip |
| 16.375 | 9.1.75 | tile pop G6 + zip |
| 16.75 | 9.2.5 | reverse swish + skew-wipe whoosh R->L |
| 17 | 9.3 | chip pop |
| 17.0625 | 9.3.125 | marker ticks (x4 on 32nds) |
| 17.15 | 9.3.3 | card-settle tick |
| 17.28 | 9.3.56 | hop take-off |
| 17.5 | 9.4 | landing ding E6 + pill pop |
| 17.78 | 9.4.56 | hop take-off |
| 18 | 10.1 | landing ding G6 + pill pop |
| 18.28 | 10.1.56 | hop take-off |
| 18.5 | 10.2 | landing ding C7 + pill pop |
| 19.25 | 10.3.5 | morph whoosh |
| 19.5 | 10.4 | chip land thock |
| 19.5625 | 10.4.125 | 12 micro-pops on 32nds (to 20.25) |
| 20.5 | 11.2 | mini-game pill pop |
| 21 | 11.3 | sheen shimmer (soft) |
| 22 | 12.1 | chip pulse tick |
| 22.25 | 12.1.5 | upward morph whoosh |
| 22.5 | 12.2 | impact |
| 22.625 | 12.2.25 | small hit |
| 22.75 | 12.2.5 | chip ticks x4 + odometer ticks (to 23.25) |
| 23 | 12.3 | big hit + toggle click + boing + push whoosh + pluck run (to 23.25) |
| 23.25 | 12.3.5 | tock + chip ticks x4 + odometer ticks (to 23.75) |
| 23.75 | 12.4.5 | tock |
| 24.5 | 13.2 | knob blip |
| 24.75 | 13.2.5 | stripe flutter |
| 25 | 13.3 | impact + pill pop |
| 25.125 | 13.3.25 | split-flap clatter + 6 lock clacks (to 25.75) |
| 25.5 | 13.4 | impact + card pop; submission ticks to 26.00 |
| 26 | 14.1 | success blip E6+G6 |
| 26.5 | 14.2 | impact + live ping |
| 26.75 | 14.2.5 | tap + bell C6 |
| 26.95 | 14.2.9 | data blip |
| 27 | 14.3 | tap + bell C6 |
| 27.2 | 14.3.4 | data blip |
| 27.25 | 14.3.5 | tap + bell C6 |
| 27.45 | 14.3.9 | data blip |
| 27.5 | 14.4 | done pling G6 + submit arpeggio |
| 28 | 15.1 | impact + tom slam 220 Hz |
| 28.0625 | 15.1.125 | tom slam 196 Hz |
| 28.125 | 15.1.25 | tom slam 174 Hz |
| 28.1875 | 15.1.375 | tom slam 156 Hz |
| 28.25 | 15.1.5 | tom slam 138 Hz |
| 29 | 15.3 | tick wave (soft) + riser to 29.75 |
| 29.75 | 15.4.5 | stripes whoosh |
| 30 | 16.1 | big C hit + logo slam + sonic logo G5 |
| 30.125 | 16.1.25 | sonic logo C6 |
| 30.25 | 16.1.5 | sonic logo E6 + tagline whoosh |
| 30.375 | 16.1.75 | sonic logo G6 |
| 30.5 | 16.2 | CTA pop + underline swish |
| 30.75 | 16.2.5 | URL whoosh (soft) |
| 31 | 16.3 | mascot boing |
| 31.125 | 16.3.25 | bubble pop |
| 31.5 | 16.4 | button click + success chime |
| 32 | 17.1 | final C chord + bell C7 + ring shimmer |
| 32.5 | 17.2 | ring shimmer (soft) |
| 33 | 17.3 | tail fade to silence (to 34.00) |

## 7. 숫자 검산 (앱 규칙 그대로)

- 정답 1개 점수 = 10 + 2 x min(직전 연속, 10). 오답 = 연속 0, 남은 시간 -3초 (src/VocaPro.html WQ_PEN = 3).
- 오답 1 → 연속 정답 6개: 10 + 12 + 14 + 16 + 18 + 20 = **90**. 콤보 알약은 2연속부터 `N연속 +2N` (다음 정답의 보너스).
- 이어서 32개 더 (연속 7~38번째): 32 x 10 + 2 x (6+7+8+9 + 10 x 28) = 320 + 620 = 940 → 총 **1,030점**.
- 맞힘 38 / 푼 문제 39 = 97.4% → **97%**. 최대 연속 **38**. 랭킹: 하늘별 1,030 > 이*준 974 > 박*연 912.
- 간격 반복: INTERVALS [0, 1, 3, 7, ...]은 복습 사이의 간격 → 오늘, +1일, +3일, +7일 = 누적 0 / 1 / 4 / 11일 위치. 라벨은 간격(1일 뒤 · 3일 뒤 · 7일 뒤)에만 붙인다.
- 사전: 영어 44,017개, 중국어 HSK 1~6급 + 신HSK 1~9급 11,470개(병음). 대결 레벨 이름은 WQ_LV 그대로.
