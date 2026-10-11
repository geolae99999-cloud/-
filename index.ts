// supabase/functions/ai/index.ts
// 배포: supabase functions deploy ai --no-verify-jwt --project-ref psmmrwhmpezyeehjivav
// 비밀키: supabase secrets set GEMINI_API_KEY=... AI_DAILY_LIMIT=40
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "apikey, content-type, authorization",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const out = (o: unknown, status = 200) =>
  new Response(JSON.stringify(o), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const { token, prompt } = await req.json();
    if (typeof token !== "string" || typeof prompt !== "string" || !prompt || prompt.length > 4000)
      return out({ error: "잘못된 요청이에요." }, 400);

    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: me, error } = await sb.rpc("voca_me", { p_token: token });
    if (error || !me || me.err || !me.id) return out({ error: "로그인이 필요해요." }, 401);

    const limit = Number(Deno.env.get("AI_DAILY_LIMIT") ?? "40");
    const { data: ok } = await sb.rpc("voca_ai_use", { p_uid: String(me.id), p_limit: limit });
    if (!ok) return out({ error: "오늘 AI 사용 한도를 다 썼어요." }, 429);

    const key = Deno.env.get("GEMINI_API_KEY");
    if (!key) return out({ error: "서버 AI 설정이 아직 끝나지 않았어요." }, 503);
    const model = Deno.env.get("GEMINI_MODEL") ?? "gemini-2.5-flash";
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2, responseMimeType: "application/json", thinkingConfig: { thinkingBudget: 0 } },
      }),
    });
    const j = await r.json();
    if (!r.ok) return out({ error: "AI 서버 오류" }, 502);
    const text = (j.candidates?.[0]?.content?.parts ?? []).map((p: { text?: string }) => p.text ?? "").join("");
    if (!text) return out({ error: "빈 응답이에요." }, 502);
    return out({ text });
  } catch (_e) {
    return out({ error: "요청을 처리하지 못했어요." }, 500);
  }
});
