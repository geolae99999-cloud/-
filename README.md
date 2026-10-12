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
| `test/` | Playwright 테스트 |
| `supabase/sql/` | 서버 SQL (v5~v8). SQL Editor에서 순서대로 한 번씩 실행 |
| `supabase/functions/ai/index.ts` | Edge Function `ai` |
| `supabase/cache/` | (미적용) 공유 AI 캐시 |
| `docs/` | 변경 내역 |
| `_redirects`, `_headers` | Cloudflare Pages 설정. 주소 `/xxx`를 `public/xxx`로 보여 주고, 그 밖의 파일은 404. 보안 헤더. |

## 빌드와 배포

```sh
python3 tools/build.py src/VocaPro.html public      # app*.js, index.html, sw.js 생성
python3 tools/build_dict.py gen public              # 사전을 바꿨을 때만
for f in public/*.js; do node --check $f; done
sh test/prep.sh && node test/smoke.js               # pack, kid, cloud, flip, design, feat, wide, teach, klass 도 같은 방식
git push origin main                                # Cloudflare Pages가 자동 배포
```

## 보안 규칙

- `onclick="..."` 같은 인라인 이벤트와 인라인 `<script>`는 CSP에 막혀요. 클릭은 `data-act` + `ACTIONS`, 입력은 `data-change` / `data-input` / `data-enter` + `ON` 표를 써요. 빌드가 인라인 이벤트를 찾으면 멈춰요.
- 서버나 다른 사용자에게서 온 값은 innerHTML에 넣기 전에 반드시 `esc()`.
- `config.js`에는 Supabase publishable 키만. `sb_secret_…` 키와 Gemini 키는 저장소에 절대 넣지 않아요.
