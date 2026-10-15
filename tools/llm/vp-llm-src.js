/* VocaPro 기기 AI (Qwen) 워커: 단어 뜻 · 예문 · 번역을 학생 기기 안에서 만들어요. 키 · 서버 없음.
   빌드: sh tools/llm/build.sh  ->  public/llm/vp-llm.js (transformers.js + onnxruntime-web 한 파일)
   모델 파일은 처음 한 번 huggingface.co 에서 받아 브라우저 캐시에 저장해요. */
import { env, AutoTokenizer, AutoModelForCausalLM } from '@huggingface/transformers';

const MODEL = 'onnx-community/Qwen2.5-0.5B-Instruct';
const base = new URL('./', self.location.href).href;
const safari = /^((?!chrome|android|crios|fxios).)*safari/i.test(self.navigator.userAgent || '');
env.allowLocalModels = false;
env.useBrowserCache = true;
env.backends.onnx.wasm.wasmPaths = safari
  ? { mjs: base + 'ort-wasm-simd-threaded.mjs', wasm: base + 'ort-wasm-simd-threaded.wasm' }
  : { mjs: base + 'ort-wasm-simd-threaded.asyncify.mjs', wasm: base + 'ort-wasm-simd-threaded.asyncify.wasm' };

let tok = null, model = null, device = '', loading = null;
const post = m => self.postMessage(m);

// WebGPU 가 있으면 그래픽 가속. f16 셰이더가 없으면 q4(CPU 와 같은 파일)를 써서, 가속이 실패해도 다시 받지 않게 해요
async function gpuInfo() {
  try { if (!self.navigator.gpu) return null; const a = await self.navigator.gpu.requestAdapter(); return a ? { f16: a.features.has('shader-f16') } : null; } catch (e) { return null; }
}
async function load() {
  if (model) return;
  const files = {};
  const progress = p => {
    if (!p || p.status !== 'progress' || !p.file || !p.total) return;
    files[p.file] = [p.loaded || 0, p.total];
    let a = 0, b = 0; for (const k in files) { a += files[k][0]; b += files[k][1]; }
    // 모델 본체가 가장 커요. 아직 크기를 모르는 파일이 있어도 100%가 되지 않게 99에서 멈춰요
    post({ type: 'progress', p: Math.min(99, Math.floor(a / Math.max(b, 1) * 100)), mb: Math.round(b / 1048576) });
  };
  tok = await AutoTokenizer.from_pretrained(MODEL, { progress_callback: progress });
  const gpu = await gpuInfo();
  try {
    model = await AutoModelForCausalLM.from_pretrained(MODEL, { device: gpu ? 'webgpu' : 'wasm', dtype: gpu && gpu.f16 ? 'q4f16' : 'q4', progress_callback: progress });
    device = gpu ? 'webgpu' : 'wasm';
  } catch (e) {
    if (!gpu) throw e;
    model = await AutoModelForCausalLM.from_pretrained(MODEL, { device: 'wasm', dtype: 'q4', progress_callback: progress });
    device = 'wasm';
  }
}
async function gen(prompt, max) {
  const msgs = [
    { role: 'system', content: 'You are a helpful dictionary assistant for Korean students learning English and Chinese. Reply with JSON only, no explanation.' },
    { role: 'user', content: prompt }
  ];
  const inputs = tok.apply_chat_template(msgs, { add_generation_prompt: true, return_dict: true });
  const out = await model.generate({ ...inputs, max_new_tokens: Math.min(1024, Math.max(32, max || 384)), do_sample: false, repetition_penalty: 1.05 });
  const n = inputs.input_ids.dims[1];
  return tok.batch_decode(out.slice(null, [n, null]), { skip_special_tokens: true })[0] || '';
}
let chain = Promise.resolve();
self.onmessage = e => {
  const m = e.data || {};
  if (m.cmd === 'init') {
    if (!loading) loading = load().then(() => post({ type: 'ready', device }), err => { loading = null; post({ type: 'error', load: true, msg: String(err && err.message || err) }); });
  } else if (m.cmd === 'gen') {
    chain = chain.then(async () => {
      if (!loading) loading = load();
      try { await loading; } catch (err) { loading = null; return post({ type: 'error', id: m.id, load: true, msg: String(err && err.message || err) }); }
      try { post({ type: 'result', id: m.id, text: await gen(m.prompt, m.max) }); }
      catch (err) { post({ type: 'error', id: m.id, msg: String(err && err.message || err) }); }
    });
  }
};
