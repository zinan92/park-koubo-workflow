#!/usr/bin/env python3
"""词级时间：给动效对时用。镜头里每个字/数字要在他说出那个词的那一刻出现，短语起点不够准。

用法：python3 scripts/motion/words.py <口播视频或音频> <输出 words.json>
输出 {"segments": [{start,end,text}], "words": [{w,start,end}]}，秒为单位，和成片时间轴一致。
依赖 mlx-whisper（Apple 芯片）。剪映已烧字幕的片子也照样跑：字幕只管显示，对时靠这份。
"""
import json
import sys
from pathlib import Path

MODEL = "mlx-community/whisper-large-v3-turbo"


def main() -> int:
    if len(sys.argv) != 3:
        print(__doc__)
        return 2
    import mlx_whisper

    src, out = Path(sys.argv[1]), Path(sys.argv[2])
    result = mlx_whisper.transcribe(
        str(src), path_or_hf_repo=MODEL, word_timestamps=True, language="zh",
        initial_prompt="以下是普通话的口播，请加上标点符号。", condition_on_previous_text=False,
    )
    segments, words = [], []
    for seg in result.get("segments", []):
        segments.append({"start": round(seg["start"], 2), "end": round(seg["end"], 2), "text": seg["text"].strip()})
        for w in seg.get("words", []):
            words.append({"w": w["word"].strip(), "start": round(w["start"], 2), "end": round(w["end"], 2)})
    out.write_text(json.dumps({"segments": segments, "words": words}, ensure_ascii=False), encoding="utf-8")
    print(f"{out}：{len(segments)} 句，{len(words)} 词")
    return 0


if __name__ == "__main__":
    sys.exit(main())
