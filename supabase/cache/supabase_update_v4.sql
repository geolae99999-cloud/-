-- VocaPro v4: 공유 단어 캐시 (SQL Editor에서 한 번 실행)
-- 한 번 AI로 조회한 단어를 저장해 두고, 다음 사람부터는 AI 없이 바로 돌려줘요.
create table if not exists public.voca_dict (
  word text primary key,              -- 소문자 단어
  data jsonb not null,                -- {meaning, phonetic, koreanPron, example, exampleKo, synonyms}
  hits int not null default 0,
  created_at timestamptz not null default now()
);
alter table public.voca_dict enable row level security;
-- 정책을 만들지 않아서 앱(anon)은 직접 읽고 쓸 수 없고, 서버 함수(service_role)만 써요.
revoke all on table public.voca_dict from anon, authenticated;

-- 조회수 기록 (서버 함수 전용)
create or replace function public.voca_dict_hit(p_words text[])
returns void language sql security definer set search_path = public as $$
  update public.voca_dict set hits = hits + 1 where word = any(p_words);
$$;
revoke all on function public.voca_dict_hit(text[]) from public, anon, authenticated;
grant execute on function public.voca_dict_hit(text[]) to service_role;
