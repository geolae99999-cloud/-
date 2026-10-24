-- VocaPro 업데이트 v20: 원어민 목소리(서버 음성 합성) 저장소
-- 서버 함수 tts 가 Cloudflare Workers AI 의 자연스러운 목소리로 MP3 를 만들고, 여기 'tts' 버킷에 저장해요.
-- 한 번 만든 소리는 누구나 바로 받아요(공개 읽기). 새로 만드는 것은 IP 당 1시간 300개까지예요. 여러 번 실행해도 안전해요.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('tts', 'tts', true, 2097152, array['audio/mpeg'])
on conflict (id) do update set public = true, file_size_limit = 2097152, allowed_mime_types = array['audio/mpeg'];

create table if not exists public.voca_tts_ip (
  ip text not null,
  hr timestamptz not null,
  n int not null default 0,
  primary key (ip, hr)
);
alter table public.voca_tts_ip enable row level security;
revoke all on table public.voca_tts_ip from public, anon, authenticated;

-- 서버 함수 tts 전용: 새로 만들어도 되는지(횟수 제한)
create or replace function public.voca_tts_hit(p_ip text)
returns boolean language plpgsql security definer set search_path = public as $$
declare k int;
begin
  delete from public.voca_tts_ip where hr < now() - interval '1 day';
  insert into public.voca_tts_ip (ip, hr, n) values (left(coalesce(p_ip, ''), 64), date_trunc('hour', now()), 1)
    on conflict (ip, hr) do update set n = public.voca_tts_ip.n + 1 returning n into k;
  return k <= 300;
end $$;
revoke all on function public.voca_tts_hit(text) from public, anon, authenticated;
grant execute on function public.voca_tts_hit(text) to service_role;

notify pgrst, 'reload schema';
