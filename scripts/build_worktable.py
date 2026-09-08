#!/usr/bin/env python3
"""Build the Step-4 transcript worktable for ask-park-video.

Two commands:

  map   SRT (+ optional corrected plain text)  ->  transcript.sentences.json
  html  transcript.sentences.json              ->  analysis/worktable.html

`map` is the load-bearing one. It keeps the corrected text and the SRT timing as
two separate sources and aligns them, instead of trusting that a punctuation /
typo pass left the character stream untouched. It refuses to emit anything if the
corrected text drifted too far from what was actually said.

All emitted times are named *_hint on purpose: they are linearly interpolated
inside SRT cue blocks and are NOT word timings. Step 7 re-cuts precisely.
"""

import argparse, datetime, difflib, json, re, sys, unicodedata
from pathlib import Path

TEMPLATE = Path(__file__).resolve().parent.parent / "assets" / "worktable" / "worktable-template.html"

PUNCT_RE = re.compile(
    r"[\s　。，、；：？！…—·「」『』“”‘’（）《》〈〉【】"
    r"()\[\]{}.,!?;:'\"~`\-_/\\|+*=%$#@^&<>]"
)
SENT_END = "。！？!?；;…"


# ---------------------------------------------------------------- SRT parsing
def parse_srt(path):
    raw = Path(path).read_text(encoding="utf-8-sig")
    cues = []
    for block in re.split(r"\n\s*\n", raw.strip()):
        lines = [l for l in block.splitlines() if l.strip()]
        if len(lines) < 2:
            continue
        tl = next((l for l in lines if "-->" in l), None)
        if not tl:
            continue
        a, b = [t.strip() for t in tl.split("-->")[:2]]
        text = " ".join(lines[lines.index(tl) + 1:]).strip()
        if not text:
            continue
        cues.append({"start": to_sec(a), "end": to_sec(b), "text": text})
    if not cues:
        sys.exit(f"error: no usable cues parsed from {path}")
    return cues


def to_sec(s):
    s = s.replace(",", ".").split(" ")[0]
    parts = s.split(":")
    while len(parts) < 3:
        parts.insert(0, "0")
    h, m, sec = parts[-3:]
    return int(h) * 3600 + int(m) * 60 + float(sec)


def strip_punct(s):
    return PUNCT_RE.sub("", s)


# ------------------------------------------------------- timed character index
def timed_chars(cues):
    """Every non-punctuation character of the SRT, with an interpolated window."""
    out = []
    for c in cues:
        chars = [ch for ch in c["text"] if not PUNCT_RE.match(ch)]
        n = len(chars)
        if not n:
            continue
        span = max(c["end"] - c["start"], 0.0)
        for i, ch in enumerate(chars):
            out.append((ch, c["start"] + span * i / n, c["start"] + span * (i + 1) / n))
    return out


def align(a_chars, b_stripped):
    """Map each index of b_stripped onto a (start, end) taken from a_chars."""
    a_str = "".join(ch for ch, _, _ in a_chars)
    sm = difflib.SequenceMatcher(None, a_str, b_stripped, autojunk=False)
    times = [None] * len(b_stripped)
    for tag, i1, i2, j1, j2 in sm.get_opcodes():
        if tag == "delete":
            continue
        if tag == "insert":
            continue                              # filled in by the sweep below
        for k in range(j1, j2):                   # equal / replace: proportional
            off = (k - j1) * (i2 - i1) // max(j2 - j1, 1)
            src = min(i1 + off, i2 - 1)
            times[k] = (a_chars[src][1], a_chars[src][2])
    # inserted characters inherit the nearest known neighbour
    last = None
    for k in range(len(times)):
        if times[k]:
            last = times[k]
        elif last:
            times[k] = last
    nxt = None
    for k in range(len(times) - 1, -1, -1):
        if times[k]:
            nxt = times[k]
        elif nxt:
            times[k] = nxt
    return times, sm.ratio()


# ------------------------------------------------------------- sentence split
def split_sentences(text):
    """Split on terminal punctuation and hard line breaks; keep the punctuation."""
    out, buf = [], ""
    for ch in text:
        if ch == "\n":
            if buf.strip():
                out.append(buf.strip())
            buf = ""
            continue
        buf += ch
        if ch in SENT_END:
            out.append(buf.strip())
            buf = ""
    if buf.strip():
        out.append(buf.strip())
    return [s for s in out if strip_punct(s)]


def cmd_map(args):
    cues = parse_srt(args.srt)
    a_chars = timed_chars(cues)
    srt_text = "".join(c["text"] for c in cues)

    if args.text:
        b_text = Path(args.text).read_text(encoding="utf-8-sig")
    else:
        b_text = srt_text

    a_strip = "".join(ch for ch, _, _ in a_chars)
    b_strip = strip_punct(b_text)

    delta = len(b_strip) - len(a_strip)
    tol = max(3, int(len(a_strip) * 0.005))
    times, ratio = align(a_chars, b_strip)

    check = {
        "srt_chars": len(a_strip),
        "text_chars": len(b_strip),
        "delta": delta,
        "tolerance": tol,
        "similarity": round(ratio, 4),
    }
    problems = []
    if abs(delta) > tol:
        problems.append(f"字数差 {delta}，超出容差 ±{tol}：校对稿疑似增删了内容，不只是标点和错别字")
    if ratio < 0.95:
        problems.append(f"相似度 {ratio:.3f} < 0.95：校对稿与原话偏离过大")
    if problems and not args.force:
        print("=== 校对稿内容守卫失败 ===", file=sys.stderr)
        for p in problems:
            print("  - " + p, file=sys.stderr)
        print(json.dumps(check, ensure_ascii=False, indent=2), file=sys.stderr)
        print("修正校对稿后重跑；确认无误才用 --force。", file=sys.stderr)
        sys.exit(2)
    check["problems"] = problems

    sentences, cursor = [], 0
    for i, s in enumerate(split_sentences(b_text), 1):
        n = len(strip_punct(s))
        if not n:
            continue
        window = [t for t in times[cursor:cursor + n] if t]
        cursor += n
        sentences.append({
            "id": f"s{i:03d}",
            "text": s,
            "start_hint": round(min(t[0] for t in window), 2) if window else None,
            "end_hint": round(max(t[1] for t in window), 2) if window else None,
            "timing": "approximate_from_srt_block",
        })
    if not sentences:
        sys.exit("error: 切不出任何句子，检查校对稿是否为空")

    doc = {
        "schema": "park-video-transcript/v1",
        "project": args.project or Path(args.srt).parent.parent.name,
        "source_srt": str(args.srt),
        "text_source": str(args.text) if args.text else str(args.srt),
        "generated_at": datetime.datetime.now().astimezone().isoformat(timespec="seconds"),
        "timing_note": "start_hint / end_hint 由 SRT 字幕块线性插值，是近似值；Step 7 必须重新精确定位。",
        "check": check,
        "transcript": sentences,
    }
    Path(args.out).write_text(json.dumps(doc, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"ok  {len(sentences)} 句 · 守卫通过 (Δ{delta}, 相似度 {ratio:.3f}) -> {args.out}")


def cmd_html(args):
    doc = json.loads(Path(args.sentences).read_text(encoding="utf-8"))
    if args.project:
        doc["project"] = args.project
    tpl = Path(args.template or TEMPLATE).read_text(encoding="utf-8")
    if "/*__WORKTABLE_DATA__*/null" not in tpl:
        sys.exit("error: template 缺少 /*__WORKTABLE_DATA__*/null 占位符")
    payload = json.dumps({
        "project": doc.get("project"),
        "source_srt": doc.get("source_srt"),
        "generated_at": doc.get("generated_at"),
        "transcript": doc["transcript"],
        "hook_origin": args.hook_origin,
    }, ensure_ascii=False)
    payload = payload.replace("</", "<\\/")  # never close the script tag early
    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(tpl.replace("/*__WORKTABLE_DATA__*/null", payload), encoding="utf-8")
    print(f"ok  {len(doc['transcript'])} 句 -> {out}")


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = p.add_subparsers(dest="cmd", required=True)

    m = sub.add_parser("map", help="SRT + 校对稿 -> transcript.sentences.json")
    m.add_argument("--srt", required=True)
    m.add_argument("--text", help="校对后的纯文本（只改标点和错别字）；省略则直接用 SRT 原文")
    m.add_argument("--project")
    m.add_argument("-o", "--out", required=True)
    m.add_argument("--force", action="store_true", help="守卫失败时仍然输出（需在 process-log 写明理由）")
    m.set_defaults(func=cmd_map)

    h = sub.add_parser("html", help="transcript.sentences.json -> worktable.html")
    h.add_argument("sentences")
    h.add_argument("-o", "--out", required=True)
    h.add_argument("--project")
    h.add_argument("--hook-origin", choices=("manual", "ai-prefill"), default="manual",
                   help="Preserve nomination provenance in worktable exports")
    h.add_argument("--template")
    h.set_defaults(func=cmd_html)

    a = p.parse_args()
    a.func(a)


if __name__ == "__main__":
    main()
