// PGRST=http://localhost:3000 이면 반 · 과제 · 발음 · 게임 RPC를 psql 대신 실제 PostgREST(Supabase가 쓰는 것)로 보내요.
// 운영처럼 anon 역할, JSON 인자 이름 맞추기, 접속 주소 머리글(cf-connecting-ip)까지 같은 조건으로 시험해요.
const BASE = process.env.PGRST || '';
module.exports = { on: !!BASE, async call(fn, body) {
  const r = await fetch(BASE.replace(/\/+$/, '') + '/rpc/' + fn, { method: 'POST', headers: { 'content-type': 'application/json', 'cf-connecting-ip': '203.0.113.7', 'x-forwarded-for': '203.0.113.7' }, body: JSON.stringify(body) });
  return { status: r.status, body: await r.text() };
} };
