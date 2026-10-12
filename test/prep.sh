#!/bin/sh
# public -> test/site (클라우드 끈 로컬 모드 설정으로)
cd "$(dirname "$0")/.." && rm -rf test/site && cp -r public test/site && printf "window.VOCA_CLOUD = { url: '', apiKey: '' };\n" > test/site/config.js
rm -rf test/site2 && cp -r public test/site2
