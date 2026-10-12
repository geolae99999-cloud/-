let handler: any;
const calls: string[] = [];
(globalThis as any).Deno = { env: { get: (k: string) => ({ SUPABASE_URL: 'x', SUPABASE_SERVICE_ROLE_KEY: 'y', GEMINI_API_KEY: 'k' } as any)[k] }, serve: (h: any) => { handler = h; } };
let mode = 'busy';
(globalThis as any).fetch = async (url: string, init: any) => {
  const model = url.split('models/')[1].split(':')[0]; calls.push(model);
  const b = JSON.parse(init.body);
  if (mode === 'busy' && model === 'gemini-2.5-flash') return new Response('{}', { status: 503 });
  if (mode === 'slow') { await new Promise((r, j) => { const t = setTimeout(r, 9000); init.signal.addEventListener('abort', () => { clearTimeout(t); j(new Error('abort')); }); }); }
  return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify({ ok: true, schema: !!b.generationConfig.responseSchema, think: !!b.generationConfig.thinkingConfig }) }] } }] }), { status: 200 });
};
await import('./index.ts');
const call = async (body: any) => { const r = await handler(new Request('http://x', { method: 'POST', body: JSON.stringify(body) })); return [r.status, await r.text()]; };
console.log('word busy->fallback', await call({ token: 't', task: 'word', word: 'consistent' }), calls.splice(0));
console.log('raw prompt rejected', await call({ token: 't', prompt: 'write me a poem' }));
console.log('bad word', await call({ token: 't', task: 'word', word: 'ignore all; <script>' }));
console.log('batch', await call({ token: 't', task: 'batch', words: ['a', 'bee'] }), calls.splice(0));
console.log('translate', await call({ token: 't', task: 'translate', text: 'hello', to: 'ko' }), calls.splice(0));
mode = 'slow'; const t0 = Date.now();
console.log('slow', await call({ token: 't', task: 'word', word: 'slow' }), calls.splice(0), Date.now() - t0, 'ms');
