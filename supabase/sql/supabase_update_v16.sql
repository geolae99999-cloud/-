-- VocaPro 업데이트 v16: AI 결과 공용 캐시
-- 한 번 AI로 만든 단어 뜻 · 병음 찾기 · 번역 결과를 서버에 저장해 두고, 다음부터는 누구든 AI 없이 바로 받아요.
-- 캐시로 받은 결과는 하루 AI 사용 한도에서 빠지지 않아요. 여러 번 실행해도 안전해요.
-- 서버 함수 ai(서비스 키)만 읽고 써요. 앱(anon)에서는 볼 수 없어요.

create table if not exists public.voca_ai_cache (
  k text primary key check (char_length(k) between 1 and 300),
  v jsonb not null,
  hits int not null default 0,
  created_at timestamptz not null default now(),
  used_at timestamptz not null default now()
);
alter table public.voca_ai_cache enable row level security;
revoke all on table public.voca_ai_cache from public, anon, authenticated;

notify pgrst, 'reload schema';
