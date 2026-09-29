#!/usr/bin/env python3
"""给一条视频建动效工程：从仓库的 motion/ 镜头库复制一份到视频工程里，数据文件清空，依赖共用。

用法：python3 scripts/motion/new_project.py <视频工程目录>   → 建 <视频工程目录>/motion/
之后：导演按 references/motion-director.md 写 shots 数据 → timeline.py → render.sh → composite.py。

依赖：仓库 motion/ 下装过一次依赖（cd motion && npm ci），各视频工程的 node_modules 链接到那里，不重复安装。
复制而不是直接在仓库里改：每条视频的镜头数据、截图、渲染产物都跟着视频走；以后改了库，旧视频不受影响。
"""
import shutil
import subprocess
import sys
from pathlib import Path

LIB = Path(__file__).resolve().parents[2] / "motion"
SKIP = {"node_modules", "out", "build", "examples", "tools", ".remotion"}


def main() -> int:
    if len(sys.argv) != 2:
        print(__doc__)
        return 2
    dest = Path(sys.argv[1]).expanduser().resolve() / "motion"
    if dest.exists():
        raise SystemExit(f"{dest} 已经有了；要从库里更新组件，手动对比后再覆盖，别直接删")
    shutil.copytree(LIB, dest, ignore=lambda d, names: [n for n in names if n in SKIP or (Path(d).name == "public" and n.endswith((".png", ".jpg")))])
    (dest / "src" / "shots.json").write_text('{ "shots": [] }\n', encoding="utf-8")
    (dest / "public").mkdir(exist_ok=True)
    modules = LIB / "node_modules"
    if not modules.exists():
        subprocess.run(["npm", "ci", "--no-audit", "--no-fund"], cwd=LIB, check=True)
    (dest / "node_modules").symlink_to(modules.resolve())
    print(dest)
    return 0


if __name__ == "__main__":
    sys.exit(main())
