#!/usr/bin/env python3
"""把一份交付文件（HTML）截成视频用的长图，同时遮住客户信息，给 DocScroll / DocStackBrake 滚动用。

Park 9/29：公开视频里要遮客户的名字和营业额。原件（vault 里的）不动，只遮视频用的副本。
遮哪些字由 --redact 逐个给出，Park 点名的都要给；不确定的先问他。

用法：
  python3 scripts/motion/shoot_doc.py <文件.html> <动效工程>/public/<名字>.png \\
      --redact 客户名 --redact "年销售额数字" [--cut-after-h2 5]
输出：长图（宽 900，按手机宽度重排、字放大）+ 同名 .json（各 h2、表格、表头列、表格行在长图里的像素位置），
把 .json 里的数字抄进 shots 数据的 props（meta / report / table）。
--cut-after-h2 N：只截到第 N 个 h2 往下一屏（文件很长时用，只需要滚到要停的那一节）。
依赖 Playwright 的 Chromium（python3 -m playwright install chromium）。
"""
import argparse
import json
import sys
from pathlib import Path

CSS_W, OUT_W = 470, 900
DPR = OUT_W / CSS_W
VIDEO_CSS = """
<style>
body{background:#F4F1EA}
.page{padding:26px 18px 40px}
.rd{background:#15171C;color:transparent;border-radius:6px;padding:0 3px;-webkit-text-fill-color:transparent}
.tw{overflow:visible}
table{table-layout:fixed;font-size:12.5px}
th{white-space:normal}
th,td{padding:7px 8px;word-break:break-word}
a{text-decoration:none}
</style>
"""

JS = """() => {
  const top = el => Math.round(el.getBoundingClientRect().top + scrollY);
  const bot = el => Math.round(el.getBoundingClientRect().bottom + scrollY);
  const h2 = [...document.querySelectorAll('h2')].map(e => ({text: e.textContent.trim(), top: top(e), bottom: bot(e)}));
  // 有表格外框（.tw）就量外框，和 DocStackBrake 的遮暗/准星对齐
  const boxes = document.querySelectorAll('.tw').length ? document.querySelectorAll('.tw') : document.querySelectorAll('table');
  const tables = [...boxes].map(e => ({top: top(e), bottom: bot(e),
    cols: [...e.querySelectorAll('th')].map(th => { const r = th.getBoundingClientRect(); return {left: Math.round(r.left), right: Math.round(r.right)}; }),
    rows: [...e.querySelectorAll('tbody tr')].map(tr => ({top: top(tr), bottom: bot(tr)}))}));
  return {h2, tables, height: document.documentElement.scrollHeight};
}"""


def prep(html: str, redact: list[str]) -> str:
    missing = [s for s in redact if s not in html]
    if missing:
        raise SystemExit(f"文件里找不到要遮的字：{missing}（写法不一致？先核对原文）")
    for s in redact:
        html = html.replace(s, f'<span class="rd">{s}</span>')
    return html.replace("</head>", VIDEO_CSS + "</head>") if "</head>" in html else VIDEO_CSS + html


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("html", type=Path)
    ap.add_argument("out", type=Path)
    ap.add_argument("--redact", action="append", default=[])
    ap.add_argument("--cut-after-h2", type=int)
    a = ap.parse_args()
    from playwright.sync_api import sync_playwright

    html = prep(a.html.read_text(encoding="utf-8"), a.redact)
    s = lambda v: round(v * DPR)
    with sync_playwright() as p:
        b = p.chromium.launch()
        pg = b.new_page(viewport={"width": CSS_W, "height": 900}, device_scale_factor=DPR)
        pg.set_content(html, wait_until="load")
        m = pg.evaluate(JS)
        clip_h = m["height"]
        if a.cut_after_h2 is not None and a.cut_after_h2 < len(m["h2"]):
            clip_h = m["h2"][a.cut_after_h2]["top"] + 900
        a.out.parent.mkdir(parents=True, exist_ok=True)
        pg.screenshot(path=str(a.out), full_page=True, clip={"x": 0, "y": 0, "width": CSS_W, "height": clip_h})
        b.close()
    meta = {
        "w": OUT_W, "h": s(clip_h),
        "h2": [{"text": h["text"], "top": s(h["top"]), "bottom": s(h["bottom"])} for h in m["h2"] if h["top"] < clip_h],
        "tables": [{"top": s(t["top"]), "bottom": s(t["bottom"]),
                    "cols": [{k: s(v) for k, v in c.items()} for c in t["cols"]],
                    "rows": [{k: s(v) for k, v in r.items()} for r in t["rows"]]} for t in m["tables"] if t["top"] < clip_h],
    }
    a.out.with_suffix(".json").write_text(json.dumps(meta, ensure_ascii=False, indent=1), encoding="utf-8")
    print(a.out, f"{meta['w']}×{meta['h']}，{len(meta['h2'])} 个小标题，{len(meta['tables'])} 张表，遮了 {len(a.redact)} 处")
    return 0


if __name__ == "__main__":
    sys.exit(main())
