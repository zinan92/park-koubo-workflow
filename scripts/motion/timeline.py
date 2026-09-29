#!/usr/bin/env python3
"""把导演写的镜头数据合成一份：检查、截撞车、算动效占比，写进动效工程的 src/shots.json。

用法：python3 scripts/motion/timeline.py <动效工程目录> <shots*.json ...> [--duration 秒]
- 每个输入文件是 {"shots": [{id, component, start, frames, props}]}，可以按组拆成几份，这里合并。
- component 必须在 catalog 里（读 src/catalog/*.ts 里注册的名字）。
- 相邻两个镜头时间重叠时，前一个提前收（后一个通常是全屏，会整屏盖住）；写进 "end"。
- 打印：镜头数、动效占比（重叠只算一次）、全屏几处和间隔。Park 定的目标看 project.json 的 spec.visual_coverage_target。
"""
import argparse
import json
import re
import sys
from pathlib import Path

FPS = 30


def catalog_names(project: Path) -> dict[str, str]:
    """catalog 名 → size（chest/full）。"""
    names = {}
    for ts in (project / "src" / "catalog").glob("*.ts"):
        for name, size in re.findall(r"^\s*(\w+):\s*\{\s*component:\s*\w+,\s*size:\s*'(\w+)'", ts.read_text(encoding="utf-8"), re.M):
            names[name] = size
    return names


def build(project: Path, inputs: list[Path], duration: float | None) -> dict:
    sizes = catalog_names(project)
    shots, seen = [], set()
    for path in inputs:
        for s in json.loads(path.read_text(encoding="utf-8"))["shots"]:
            if s["id"] in seen:
                raise SystemExit(f"镜头 id 重复：{s['id']}（{path.name}）")
            if s["component"] not in sizes:
                raise SystemExit(f"{s['id']} 用的 {s['component']} 不在 catalog 里")
            seen.add(s["id"])
            shots.append(dict(s, end=round(s["start"] + s["frames"] / FPS, 3), size=sizes[s["component"]]))
    shots.sort(key=lambda s: s["start"])
    for a, b in zip(shots, shots[1:]):
        if b["start"] < a["end"]:
            print(f"撞车：{a['id']} 到 {a['end']:.2f}，{b['id']} {b['start']:.2f} 就进来了 → {a['id']} 提前收")
            a["end"] = round(b["start"] - 0.05, 3)
    span = []
    for s in shots:
        if span and s["start"] <= span[-1][1]:
            span[-1][1] = max(span[-1][1], s["end"])
        else:
            span.append([s["start"], s["end"]])
    covered = sum(b - a for a, b in span)
    total = duration or (shots[-1]["end"] if shots else 1)
    full = [s for s in shots if s["size"] == "full"]
    print(f"{len(shots)} 个镜头，动效占 {covered:.0f}s / {total:.0f}s = {covered / total:.0%}；"
          f"全屏 {len(full)} 处共 {sum(s['end'] - s['start'] for s in full):.0f}s")
    if len(full) > 1:
        print("全屏间隔（秒）", [round(b["start"] - a["end"]) for a, b in zip(full, full[1:])])
    return {"shots": [{k: s[k] for k in ("id", "component", "start", "end", "frames", "props") if k in s} for s in shots]}


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("project", type=Path)
    ap.add_argument("inputs", type=Path, nargs="+")
    ap.add_argument("--duration", type=float, help="成片总时长（秒），算占比用")
    a = ap.parse_args()
    data = build(a.project, a.inputs, a.duration)
    (a.project / "src" / "shots.json").write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding="utf-8")
    print(a.project / "src" / "shots.json")
    return 0


if __name__ == "__main__":
    sys.exit(main())
