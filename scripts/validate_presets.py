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


# 竖屏纯口播（版式 C）和剪映已烧字幕：Park 在 content-studio 手动选的覆盖预设
def load_path(rel: str) -> dict:
    with (ROOT / rel).open(encoding="utf-8") as handle:
        return json.load(handle)


vmedia = load_path("presets/media/park-talking-head-9x16-full-v1.json")
burned = load_path("presets/captions/park-caption-burned-in-v1.json")
cards = load_path("presets/visual/park-card-overlay-c-v1.json")
require(vmedia["video"]["width"] * 16 == vmedia["video"]["height"] * 9, "vertical media is not 9:16")
require(vmedia["layout"]["mode"] == "full-face-overlay", "vertical layout mode drifted")
zone = vmedia["layout"]["card_zone"]
require(zone["x"] + zone["width"] <= 900, "card zone runs into the right-hand button column")
band = burned["reserved_band"]["y_pct"]
require(zone["bottom"] <= band[0] * vmedia["video"]["height"], "card zone overlaps the burned-in caption band")
require(burned["renderer_contract"]["render_captions"] is False, "burned-in preset must not re-render captions")
require(vmedia["layout"]["visual_style"] == cards["id"], "vertical layout points to the wrong card style")
require(set(cards["types"]) == {"odometer", "marker", "rows", "chain"}, "card types drifted")



# 竖屏导演混剪（v2，取代只用胸前卡片的 C v1）：全屏盖满、胸前卡片区不变、镜头库 catalog 都能对上
director = load_path("presets/visual/park-vertical-director-v2.json")
require(director["supersedes"] == cards["id"], "director preset must supersede the chest-card preset")
chest = director["sizes"]["chest"]
require(chest["x"][1] <= 900 and chest["bottom"] <= band[0] * vmedia["video"]["height"], "chest cards drifted into the button column or caption band")
full = director["sizes"]["full"]
require(full["canvas"] == [vmedia["video"]["width"], vmedia["video"]["height"]] and full["covers_captions"], "full-screen shots must cover the whole frame incl. captions")
require((ROOT / director["director"]).is_file(), "director reference missing")
import re as _re
_names = set()
for _ts in (ROOT / "motion/src/catalog").glob("*.ts"):
    _names |= set(_re.findall(r"^\s*(\w+):\s*\{\s*component:", _ts.read_text(encoding="utf-8"), _re.M))
for _ex in (ROOT / "motion/examples").glob("*/shots*.json"):
    for _s in json.loads(_ex.read_text(encoding="utf-8"))["shots"]:
        require(_s["component"] in _names, f"{_ex.parent.name}/{_ex.name}: {_s['id']} uses unknown component {_s['component']}")

print("PASS 4 production presets + vertical/burned-in overrides + director v2 are valid and cross-consistent")
