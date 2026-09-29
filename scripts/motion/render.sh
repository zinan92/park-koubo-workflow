#!/bin/zsh
# 渲染动效图层：按 src/shots.json 逐个渲染成透明 ProRes 4444（out/<id>.mov）。不给 id 就全部渲染，已存在且比 shots.json 新的跳过。
# 用法：scripts/motion/render.sh <动效工程> [ID ...]
set -e
P=${1:A}; shift
cd $P
ids=("$@")
[ ${#ids} -eq 0 ] && ids=($(python3 -c "import json;print(' '.join(s['id'] for s in json.load(open('src/shots.json'))['shots']))"))
mkdir -p out
npx remotion bundle src/index.ts --out-dir build --log=error >/dev/null
for id in $ids; do
  if [ $# -eq 0 ] && [ out/$id.mov -nt src/shots.json ] && [ out/$id.mov -nt build/index.html ]; then continue; fi
  npx remotion render build $id out/$id.mov --codec=prores --prores-profile=4444 --pixel-format=yuva444p10le --image-format=png --log=error
  echo "$id ok"
done
