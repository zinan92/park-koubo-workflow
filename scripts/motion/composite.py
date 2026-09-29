#!/usr/bin/env python3
"""把渲染好的透明图层按 src/shots.json 的时间叠到口播原片上，原声不动。整条和样片都用它。

用法：
  整条：python3 scripts/motion/composite.py <动效工程> <口播原片.mp4> <输出.mp4>
  样片：python3 scripts/motion/composite.py <动效工程> <口播原片.mp4> <输出.mp4> --from 624 --to 647
图层在 <动效工程>/out/<id>.mov（ProRes 4444 透明，用 render.sh 渲染）。
先出 2–3 段样片给 Park 看成片质量（Park 9/29：只看样片审批，不看文字镜头表），认可后再合成整条。
"""
import argparse
import json
import shutil
import subprocess
import sys
from pathlib import Path


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("project", type=Path)
    ap.add_argument("base", type=Path)
    ap.add_argument("out", type=Path)
    ap.add_argument("--from", dest="w0", type=float)
    ap.add_argument("--to", dest="w1", type=float)
    a = ap.parse_args()
    ff = shutil.which("ffmpeg") or "/Users/wendy/bin/ffmpeg"
    shots = json.loads((a.project / "src" / "shots.json").read_text(encoding="utf-8"))["shots"]
    w0 = a.w0 or 0.0
    args = [ff, "-y", "-loglevel", "error", "-stats"]
    if a.w0 is not None:
        args += ["-ss", str(a.w0), "-t", str(a.w1 - a.w0)]
    args += ["-i", str(a.base)]
    chain, last, n = [], "0:v", 0
    for s in shots:
        end = s.get("end", s["start"] + s["frames"] / 30)
        if a.w0 is not None and (end <= a.w0 or s["start"] >= a.w1):
            continue
        mov = a.project / "out" / f"{s['id']}.mov"
        if not mov.is_file():
            raise SystemExit(f"缺图层：{mov}")
        n += 1
        skip, rel = max(0.0, w0 - s["start"]), max(0.0, s["start"] - w0)
        args += ["-ss", f"{skip:.3f}", "-i", str(mov)]
        chain.append(f"[{n}:v]format=yuva444p10le,setpts=PTS-STARTPTS+{rel:.3f}/TB[o{n}]")
        chain.append(f"[{last}][o{n}]overlay=0:0:eof_action=pass:enable='between(t,{rel:.3f},{end - w0 + 0.05:.3f})'[v{n}]")
        last = f"v{n}"
    if not n:
        raise SystemExit("这段时间里没有镜头")
    args += ["-filter_complex", ";".join(chain), "-map", f"[{last}]", "-map", "0:a", "-c:v", "libx264", "-preset", "medium",
             "-crf", "18", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", str(a.out)]
    subprocess.run(args, check=True)
    print(a.out)
    return 0


if __name__ == "__main__":
    sys.exit(main())
