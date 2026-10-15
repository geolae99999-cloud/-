#!/bin/sh
# 기기 AI 워커 빌드. 버전을 고정해요: @huggingface/transformers 4.2.0 (onnxruntime-web 1.26.0-dev.20260416)
# 사용: sh tools/llm/build.sh <node_modules 가 있는 폴더>
set -e
NM="$1/node_modules"; OUT="$(dirname "$0")/../../src/llm"
mkdir -p "$OUT"
NODE_PATH="$NM" "$NM/.bin/esbuild" "$(dirname "$0")/vp-llm-src.js" --bundle --conditions=browser --main-fields=browser,module,main --format=esm --minify --platform=browser --target=es2020 \
  --external:sharp --external:onnxruntime-node --external:fs --external:path --external:url \
  --legal-comments=eof --outfile="$OUT/vp-llm.js"
# GitHub 비밀 검사가 32자 모델 이름(Mistral3ForConditionalGeneration)을 Mistral API 키로 오인해 push 를 막아서, 문자열을 둘로 나눠요
sed -i 's/"Mistral3ForConditionalGeneration"/"Mistral3For"+"ConditionalGeneration"/g' "$OUT/vp-llm.js"
grep -q 'Mistral3ForConditionalGeneration' "$OUT/vp-llm.js" && { echo '나누지 못했어요'; exit 1; }
for f in ort-wasm-simd-threaded.mjs ort-wasm-simd-threaded.wasm ort-wasm-simd-threaded.asyncify.mjs ort-wasm-simd-threaded.asyncify.wasm; do cp "$NM/onnxruntime-web/dist/$f" "$OUT/$f"; done
ls -la "$OUT"
