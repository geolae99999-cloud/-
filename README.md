# VocaPro

학교 수업용 AI 영어 단어장 (https://hijujuwon.kro.kr). 문의: vocaproe2@gmail.com

## 폴더

| 경로 | 내용 |
| --- | --- |
| `public/` | 사이트에 올라가는 파일 전부 (빌드 결과). 여기 있는 것만 주소로 열려요. |
| `src/VocaPro.html` | 마스터 원본. 수정은 항상 이 파일 하나에서 해요. |
| `src/csp.txt` | 보안 정책(CSP). 빌드 때 index.html에 들어가요. 새 외부 주소를 쓰면 여기에 추가해요. |
| `tools/` | 빌드 스크립트(`build.py`, `build_dict.py`)와 단어 목록 |
| `gen/` | 사전 원본 TSV(`out_*.tsv`)와 단어 생성 프롬프트 |
| `gen/zh/` | 중국어(HSK 1~6급 + 신HSK 1~9급, `hsk30_levels.tsv`) 사전 원본 TSV와 프롬프트(`PROMPT_ZH.md`). 단어 목록과 병음은 [complete-hsk-vocabulary](https://github.com/drkameleon/complete-hsk-vocabulary)(MIT)의 HSK 2.0 목록 |
| `test/` | Playwright 테스트 |
| `supabase/sql/` | 서버 SQL (v5~v8). SQL Editor에서 순서대로 한 번씩 실행 |
| `supabase/functions/ai/index.ts` | Edge Function `ai` |
| `supabase/cache/` | (미적용) 공유 AI 캐시 |
| `public/media/` | 광고 영상(23초, 공유용 1080p `ad-1080.mp4`, 사이트용 720p `ad.mp4`·`ad.webm`, `ad-poster.jpg`), 프로필(`profile.png`, `profile-1024.png`), 배너(`og.jpg` 공유 미리보기, `wide.jpg` 가로 배너) |
| `tools/media/` | 위 영상과 이미지의 원본(`ad.html`, `banners.html`)과 만드는 스크립트 `render.js` |
| `docs/` | 변경 내역 |
| `_redirects`, `_headers` | Cloudflare Pages 설정. 주소 `/xxx`를 `public/xxx`로 보여 주고, 그 밖의 파일은 404. 보안 헤더. |

## 빌드와 배포

```sh
python3 tools/build.py src/VocaPro.html public      # app*.js, index.html, sw.js 생성
python3 tools/build_dict.py gen public              # 사전을 바꿨을 때만 (pip install cmudict lemminflect)
python3 tools/build_ko_index.py src/VocaPro.html public   # 사전이나 단어장을 바꾼 뒤: 한글 뜻으로 찾기 목록(dict/ko.json)
python3 tools/build_zh.py gen/zh public             # 중국어 사전을 바꿨을 때만 (pip install pypinyin)
for f in public/*.js; do node --check $f; done
sh test/prep.sh && node test/smoke.js               # pack, kid, cloud, flip, design, feat, wide, teach, zh, klass, tools, sentence, perf, audit 도 같은 방식
node tools/media/render.js [ad|banners|preview]     # 광고 영상·배너를 고쳤을 때만 (ffmpeg 필요, 글꼴은 파일 머리 설명)
git push origin main                                # Cloudflare Pages가 자동 배포
```

## 보안 규칙

- `onclick="..."` 같은 인라인 이벤트와 인라인 `<script>`는 CSP에 막혀요. 클릭은 `data-act` + `ACTIONS`, 입력은 `data-change` / `data-input` / `data-enter` + `ON` 표를 써요. 빌드가 인라인 이벤트를 찾으면 멈춰요.
- 서버나 다른 사용자에게서 온 값은 innerHTML에 넣기 전에 반드시 `esc()`.
- `config.js`에는 Supabase publishable 키만. `sb_secret_…` 키와 Gemini 키는 저장소에 절대 넣지 않아요.

## 영어 / 중국어

- 머리글의 `EN | 中` 스위치(또는 설정 > 학습 언어)로 바꿔요. 단어장과 학습 기록은 언어마다 따로예요.
- 저장 형식: 영어는 예전 자리(`categories`, `stats`), 중국어는 `zh: { categories, stats }`. 예전 앱·백업과 그대로 호환돼요.
- 발음(TTS), 사전, AI, 채점은 단어 글자를 보고 언어를 정해요(`isHanWord`). 중국어 단어는 병음(성조 없이)이나 한자로 답해도 맞아요.
- 한글 뜻으로 영어 찾기: `public/dict/ko.json` [단어, 뜻, 순위] (처음 한글로 찾을 때 한 번만 받아요).
- 중국어 사전: `public/dict/zh/index.json`(전체 목록, [단어, 병음, 뜻, 옛 HSK 급수, 신HSK 급수]) + `0~f.json`(첫 글자 코드 % 16). 한글 발음과 예문 병음은 `tools/build_zh.py`가 규칙으로 만들어요.
