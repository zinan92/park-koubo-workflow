#!/usr/bin/env python3
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
FILES = {
    "caption_style": ROOT / "presets/captions/park-caption-4x3-v1.json",
    "caption_layout": ROOT / "presets/captions/park-caption-layout-v1.json",
    "media": ROOT / "presets/media/park-talking-head-4x3-v1.json",
    "audio": ROOT / "presets/audio/park-voice-v1.json",
}


def load(name: str) -> dict:
    path = FILES[name]
    with path.open(encoding="utf-8") as handle:
        return json.load(handle)


def require(condition: bool, message: str) -> None:
    if not condition:
        raise SystemExit(f"FAIL {message}")


style = load("caption_style")
layout = load("caption_layout")
media = load("media")
audio = load("audio")

require(style["id"] == "park-caption-4x3-v1", "caption style id drifted")
require(layout["caption_style_id"] == style["id"], "caption layout points to the wrong style")
require(style["container"]["width_mode"] == "fit-content", "caption background must fit content")
require(style["container"]["max_width_px"] < style["reference_canvas"]["width"], "caption needs side margins")
require(style["placement"]["anchor"] == "bottom-center", "caption anchor drifted")
require("outline-only ASS subtitles" in style["renderer_contract"]["noncompliant"], "outline-only fallback must stay blocked")
require(style["reference_canvas"]["aspect_ratio"] == media["video"]["aspect_ratio"], "caption/media aspect ratios differ")
require(media["video"]["width"] * 3 == media["video"]["height"] * 4, "media dimensions are not 4:3")
require(media["video"]["fps"] == style["reference_canvas"]["fps"], "caption/media FPS differ")
require(audio["voice"]["integrated_lufs"] == -16, "voice loudness target drifted")
require(audio["voice"]["true_peak_dbtp"] == -1.5, "voice true-peak target drifted")
require(not audio["bgm"]["enabled_by_default"], "BGM must stay opt-in")
require(not audio["sfx"]["enabled_by_default"], "SFX must stay opt-in")

print("PASS 4 production presets are valid and cross-consistent")
