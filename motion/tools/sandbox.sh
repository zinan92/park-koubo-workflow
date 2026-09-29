#!/bin/zsh
# 用一份指定的 shots.json 在临时目录里打包动效库，不碰仓库里的 src/shots.json（多人同时改时互不干扰）。
# 用法：tools/sandbox.sh <名字> <shots.json> [public 目录]   → 打印 bundle 目录，之后 npx remotion still <bundle> <ID> out.png --frame=N
set -e
HERE=${0:A:h:h}
NAME=$1; SHOTS=${2:A}; PUB=${3:-$HERE/public}
DIR=${TMPDIR:-/tmp}/park-motion-sandbox/$NAME
rm -rf $DIR && mkdir -p $DIR
rsync -a --exclude node_modules --exclude out --exclude build $HERE/ $DIR/
ln -sfn ${HERE}/node_modules(:A) $DIR/node_modules
cp $SHOTS $DIR/src/shots.json
[ -d "$PUB" ] && rsync -a ${PUB}/ $DIR/public/
(cd $DIR && npx remotion bundle src/index.ts --out-dir $DIR/bundle --log=error >/dev/null)
echo $DIR/bundle
