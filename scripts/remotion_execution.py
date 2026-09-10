#!/usr/bin/env python3
"""Checked React/Remotion execution; never accepts an arbitrary render command."""
import argparse
from pathlib import Path
import subprocess
import sys
import json
from workflow_guard import Guard, Blocked, require, read_json, file_hash, digest, nonempty


def contract(g):
    spec, _ = g.visual_spec()
    plan = read_json(g.inputs('visual-spec')['plan'])
    shots = {s['id']: s for s in plan['shots'] if s['visual_type'] == '图形与动效'}
    if not shots:
        return spec, {}, {}, {}
    p = g.inputs('visual-implementation')
    c = read_json(p['contract'])
    require(c['engine'] == 'react-remotion', 'React/Remotion implementation required')
    require(set(c['shots']) == set(shots), 'implementation must cover every graphic shot')
    deps = read_json(p['package']).get('dependencies', {})
    project = p['package'].parent
    require(project != g.root, 'use a dedicated Remotion project directory, separate from outputs')
    require(all(k in deps for k in ('react', 'react-dom', 'remotion', '@remotion/cli')), 'real React/Remotion project dependencies required')
    require('lock' in p and p['entry'].suffix in ('.tsx', '.ts', '.jsx', '.js'), 'locked project and registered entry required')
    require('registerRoot' in p['entry'].read_text(), 'entry must register a Remotion root')
    for sid, shot in c['shots'].items():
        require(nonempty(shot['composition']), 'composition ID required')
        require(type(shot['duration_frames']) is int and shot['duration_frames'] > 0, 'composition duration required')
        require(shot['sources'] and all(k in p for k in shot['sources']), 'hash actual implementation sources')
        require(any(p[k].suffix in ('.tsx', '.jsx') for k in shot['sources']), 'React shot component required')
        require(nonempty(shot['preserved']) and nonempty(shot['adaptations']), 'record demo reuse and adaptations')
        if shots[sid]['recipe']['mode'] == 'card':
            require(shot['demo_sha256'] == file_hash(g.inputs('visual-spec')[f'demo:{sid}']), 'implementation must trace exact ShotCraft demo')
    # Include unlisted components/config/assets too: normal local imports must not
    # let a changed renderer keep an old receipt. Outputs live outside this tree.
    import os
    tree = {}
    for directory, dirs, files in os.walk(project):
        dirs[:] = sorted(d for d in dirs if d not in ('node_modules', '.git', '.remotion'))
        for name in sorted(files):
            path = Path(directory) / name
            tree[str(path.relative_to(project))] = file_hash(path)
    return digest({'spec': spec, 'implementation': g.fingerprint('visual-implementation'), 'project_tree': tree}), c, p, shots


def receipts(g, stage, purpose):
    fp, c, p, shots = contract(g)
    if not shots:
        return {}
    paths = g.inputs(stage)
    records = read_json(paths['remotion_receipts'])
    require(set(records) == set(shots), 'Remotion render receipt required for every graphic shot')
    outputs = {}
    for sid, refs in records.items():
        outputs[sid] = set()
        require(refs, 'missing executed Remotion render')
        for ref in refs:
            receipt = read_json(paths[ref])
            require(receipt['schema'] == 'park-remotion-render/v1' and receipt['engine'] == 'react-remotion', 'invalid Remotion receipt')
            require(receipt['input_digest'] == fp and receipt['shot'] == sid, 'stale Remotion implementation receipt')
            require(receipt['purpose'] == purpose and receipt['composition'] == c['shots'][sid]['composition'], 'wrong render purpose/composition')
            require(receipt['operation'] in (('still', 'render') if purpose == 'preview' else ('render',)), 'actual composition render required')
            output = paths[receipt['output_input']]
            require(file_hash(output) == receipt['output_sha256'], 'Remotion output missing or stale')
            outputs[sid].add(receipt['output_input'])
    return outputs


def execute(g, sid, operation, purpose, output, receipt_path, output_input, frame):
    output, receipt_path = output.resolve(), receipt_path.resolve()
    fp, c, p, shots = contract(g)
    require(sid in shots, 'unknown graphic shot')
    require(not output.is_relative_to(p['package'].parent) and not receipt_path.is_relative_to(p['package'].parent), 'keep render outputs outside implementation tree')
    if purpose == 'production':
        g.check('visual-render')
        require(operation == 'render', 'production requires full composition render')
    else:
        # Pre-H2 artifacts only; a caller cannot accidentally overwrite a final master.
        output.relative_to(g.root / 'analysis' / 'visual-preview')
    require(not output.exists() and not receipt_path.exists(), 'preserve previous render and receipt; choose new paths')
    shot = c['shots'][sid]
    require(0 <= frame < shot['duration_frames'], 'still frame outside composition')
    require(output.suffix in (('.png',) if operation == 'still' else ('.mp4', '.mov')), 'use PNG still, MP4 or alpha MOV composition')
    cli = p['package'].parent / 'node_modules/@remotion/cli/remotion-cli.js'
    require(cli.is_file(), 'install project npm dependencies; do not substitute Canvas/FFmpeg animation')
    cmd = ['node', str(cli), operation, str(p['entry']), shot['composition'], str(output)]
    cmd += ([f'--frame={frame}'] if operation == 'still' else
            ['--codec=prores', '--prores-profile=4444', '--pixel-format=yuva444p10le', '--image-format=png'] if output.suffix == '.mov' else ['--codec=h264'])
    output.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(cmd, cwd=p['package'].parent, check=True)
    require(output.is_file() and output.stat().st_size > 0, 'Remotion produced no output')
    require(contract(g)[0] == fp, 'implementation changed during render')
    receipt_path.parent.mkdir(parents=True, exist_ok=True)
    receipt_path.write_text(json.dumps(dict(schema='park-remotion-render/v1', engine='react-remotion',
        input_digest=fp, shot=sid, purpose=purpose, operation=operation, composition=shot['composition'],
        output_input=output_input, output_sha256=file_hash(output), command=cmd), indent=2))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('action', choices=['check', 'still', 'render'])
    parser.add_argument('project')
    parser.add_argument('--shot')
    parser.add_argument('--purpose', choices=['preview', 'production'], default='preview')
    parser.add_argument('--out')
    parser.add_argument('--receipt')
    parser.add_argument('--output-input', default='remotion-output')
    parser.add_argument('--frame', type=int, default=0)
    a = parser.parse_args()
    try:
        g = Guard(a.project)
        if a.action == 'check':
            print(contract(g)[0])
        else:
            require(a.shot and a.out and a.receipt, '--shot, --out and --receipt required')
            execute(g, a.shot, a.action, a.purpose, Path(a.out).resolve(), Path(a.receipt).resolve(), a.output_input, a.frame)
    except (Blocked, KeyError, ValueError, TypeError, OSError, subprocess.SubprocessError) as e:
        print(f'BLOCKED: {e}', file=sys.stderr)
        return 2
    return 0


if __name__ == '__main__':
    sys.exit(main())
