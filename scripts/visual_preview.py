#!/usr/bin/env python3
"""Validate and display H2 image evidence; does not render production media."""
import argparse
import html
import json
from pathlib import Path
import subprocess
import sys
import shutil

from workflow_guard import Blocked, Guard, digest, number, nonempty, read_json, require, file_hash
from release_guard import png_size


def clip_duration(path):
    result = subprocess.run(['ffprobe', '-v', 'error', '-show_streams', '-show_format', '-of', 'json', str(path)],
                            capture_output=True, text=True, check=True, timeout=60)
    d = json.loads(result.stdout)
    kinds = {s.get('codec_type') for s in d['streams']}
    require({'video', 'audio'} <= kinds, 'motion sample needs actual composite video and original speech')
    return float(d['format']['duration'])


def validate(guard, spec_digest):
    from remotion_execution import receipts
    rendered_layers = receipts(guard, 'visual-preview', 'preview')
    paths = guard.inputs('visual-preview')
    index = read_json(paths['index'])
    spec_paths = guard.inputs('visual-spec')
    plan = read_json(spec_paths['plan'])
    require(index['schema'] == 'park-visual-preview/v1' and index['spec_digest'] == spec_digest, 'preview belongs to stale spec')
    require('body_media' in spec_paths and index['body_sha256'] == file_hash(spec_paths['body_media']), 'preview uses wrong body video')
    require(index['implementation_inputs'] and all(k in paths for k in index['implementation_inputs']), 'preview implementation source must be hashed')
    layout = index['layout']
    require(layout['mode'] in ('notes-only', 'custom'), 'composition must be explicit')
    require(layout['mode'] == 'notes-only' or nonempty(layout.get('user_override_ref')), 'full-frame/custom composition requires explicit user choice')
    cw, ch = layout['canvas']
    require(all(type(v) is int and v > 0 for v in (cw, ch)), 'invalid canvas')
    def rect(r):
        x, y, w, h = r
        require(all(number(v) for v in r) and x >= 0 and y >= 0 and w > 0 and h > 0 and x+w <= cw and y+h <= ch, 'invalid composition rectangle')
        return x, y, w, h
    overlay, face = rect(layout['overlay_rect']), rect(layout['face_rect'])
    if layout['mode'] == 'notes-only':
        require(layout['face_live'] is True and overlay[0] >= face[0]+face[2], 'notes overlay must stay to right of retained live face')
    shots = {s['id']: s for s in plan['shots']}
    require(set(index['shots']) == set(shots), 'every visual point needs preview images')
    samples = set()
    for sid, item in index['shots'].items():
        s = shots[sid]
        require(nonempty(item['reason_to_add']), 'explain added value compared with original screen')
        require(item['comparisons'], 'text-only H2 is not reviewable')
        seen = set()
        for pair in item['comparisons']:
            if sid in rendered_layers:
                require(set(pair.get('remotion_inputs', [])) & rendered_layers[sid], 'composite must identify its actual Remotion layer input')
            require(number(pair['time']) and s['start'] <= pair['time'] < s['end'], 'preview frame outside shot')
            require(pair['time'] not in seen, 'duplicate preview timestamp')
            seen.add(pair['time'])
            for key in ('original', 'composite'):
                require(pair[key] in paths and png_size(paths[pair[key]]) == (cw, ch), 'preview must be a full-composition PNG at review canvas size')
            require(file_hash(paths[pair['original']]) != file_hash(paths[pair['composite']]), 'original frame alone is not a visual preview')
        if s['design']['state_change']:
            require(len(seen) >= 2 and min(seen) < s['cue_points']['reveal'] and max(seen) >= s['cue_points']['hold'], 'state change needs before-reveal and settled composite frames')
            require(len({file_hash(paths[x['composite']]) for x in item['comparisons']}) >= 2, 'state change cannot reuse the same composite')
        require(type(item['motion']) is bool, 'declare whether the visual moves')
        require(item['motion'] == s['design']['animated'], 'preview motion must match planned design.animated')
        require(number(item['last_change_sec']) and s['start'] <= item['last_change_sec'] < s['end'], 'last information change outside shot')
        tail = s['end'] - item['last_change_sec']
        require(tail <= 3 or nonempty(item.get('tail_reason')), 'more than 3 seconds without information change needs reading/context rationale')
        if item.get('sample'):
            sample = item['sample']
            if sid in rendered_layers:
                require(set(sample.get('remotion_inputs', [])) & rendered_layers[sid], 'sample must identify its actual Remotion layer input')
            require(sample['input'] in paths and nonempty(sample['reason']), 'sample file/selection rationale missing')
            require(0 <= sample['start'] <= s['start'] and s['end'] <= sample['end'] <= plan['duration'], 'sample must show the whole shot including its settled tail')
            duration = clip_duration(paths[sample['input']])
            require(number(duration) and abs(duration - (sample['end']-sample['start'])) <= .15, 'sample duration differs from normal-speed speech timeline')
            samples.add(sid)
    for sid, item in index['shots'].items():
        if item['motion'] and sid not in samples:
            require(item.get('represented_by') in samples and nonempty(item.get('representation_reason')), 'moving visual needs a sample or justified representative sample')
            representative = shots[item['represented_by']]['design']
            require(all(shots[sid]['design'][k] == representative[k] for k in ('relation', 'form')), 'representative sample must match visual relation and form')
    return digest({'spec': spec_digest, 'preview': guard.fingerprint('visual-preview')}), index, paths


def page(guard, index, paths, fingerprint):
    plan = read_json(guard.inputs('visual-spec')['plan'])
    esc = html.escape
    def media(name):
        return esc(paths[name].as_uri(), quote=True)
    cards = []
    for s in plan['shots']:
        sid = s['id']
        item = index['shots'][sid]
        figures = []
        for pair in item['comparisons']:
            figures.append(f'<div class="pair"><figure><img src="{media(pair["original"])}"><figcaption>原视频 · 正文 {pair["time"]:.1f}s</figcaption></figure>'
                           f'<figure><img src="{media(pair["composite"])}"><figcaption>预填视觉 · 已嵌入真实画面</figcaption></figure></div>')
        sample = item.get('sample')
        motion = (f'<video controls preload="metadata" src="{media(sample["input"])}"></video><p>正常速度样片，包含原声与完整停留段。</p>' if sample else
                  f'<p>此处为静帧构图预览。{esc("动效节奏参考 " + item["represented_by"] if item["motion"] else "此视觉不含动画。")}</p>')
        design = s['design']
        detail = '<details><summary>选型依据</summary>' + ''.join(f'<p>{esc(k)}：{esc(str(design[k]))}</p>' for k in ('takeaway', 'relation', 'form', 'reason', 'alternative', 'alternative_reason', 'motion_meaning')) + '</details>'
        cards.append(f'<article data-id="{esc(sid, quote=True)}"><h2>{esc(sid)} · {s["start"]:.1f}–{s["end"]:.1f}s</h2><p>{esc(s["quote"])}</p>'
                     + ''.join(figures) + motion + detail + f'<p>{esc(item["reason_to_add"])}</p><label>反馈（可在工作台编辑，或直接告诉 Agent 编号）'
                     '<textarea placeholder="保留 / 删除 / 修改：…"></textarea></label></article>')
    return '<!doctype html><meta charset="utf-8"><title>H2 视觉预览</title><style>body{font:18px system-ui;background:#f4f4f0;margin:32px;color:#20221f}article{background:white;padding:24px;margin:24px 0;border-radius:12px}.pair{display:flex;gap:16px}figure{margin:0;flex:1;min-width:0}img,video{width:100%;max-height:650px;object-fit:contain}textarea{display:block;width:95%;min-height:70px}small{overflow-wrap:anywhere}</style>' \
        + '<h1>逐点看画面，再决定</h1><p>每一处都有原画面与预填效果。静帧不代表动画已经完成；代表性短片用于看运动和节奏。此页不自动批准。</p>' \
        + f'<small id="fingerprint">{esc(fingerprint)}</small>' + ''.join(cards) \
        + '<p>页面不会自动保存反馈。离开前请导出，或直接在对话中告诉 Agent。</p><button onclick="downloadFeedback()">导出反馈</button><script>function downloadFeedback(){const rows=[...document.querySelectorAll("article")].map(a=>({id:a.dataset.id,feedback:a.querySelector("textarea").value}));const payload={schema:"park-visual-feedback/v1",input_digest:document.querySelector("#fingerprint").textContent,points:rows};const u=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:"application/json"}));const a=document.createElement("a");a.href=u;a.download="visual-feedback.json";a.click();setTimeout(()=>URL.revokeObjectURL(u),1000)}</script>'


def snapshot(paths, out):
    directory = out.with_suffix('.assets')
    require(not directory.exists(), 'preserve existing preview assets; choose a new revision')
    directory.mkdir(parents=True)
    frozen = {}
    for key, source in paths.items():
        target = directory / (file_hash(source) + source.suffix)
        if not target.exists():
            shutil.copy2(source, target)
        require(file_hash(target) == file_hash(source), 'preview snapshot copy differs from source')
        frozen[key] = target
    return frozen


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('project')
    p.add_argument('--out', required=True)
    a = p.parse_args()
    try:
        guard = Guard(a.project)
        fp, _ = guard.visual_spec()
        full, index, paths = validate(guard, fp)
        out = Path(a.out).resolve()
        require(not out.exists(), 'write a new revision of the preview page; preserve approved snapshots')
        out.parent.mkdir(parents=True, exist_ok=True)
        frozen = snapshot(paths, out)
        out.write_text(page(guard, index, frozen, full))
        print(f'Preview generated: {out}; independent preview QA still required before H2')
    except (Blocked, KeyError, ValueError, TypeError, OSError, subprocess.SubprocessError) as e:
        print(f'BLOCKED: {e}', file=sys.stderr)
        return 2
    return 0


if __name__ == '__main__':
    sys.exit(main())
