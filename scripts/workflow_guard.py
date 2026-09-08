#!/usr/bin/env python3
"""Evidence gates. No shell parsing, no implicit approvals, no --force."""
import argparse
import hashlib
import json
import math
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]


class Blocked(ValueError):
    pass


def require(ok, message):
    if not ok:
        raise Blocked(message)


def digest(value):
    return hashlib.sha256(json.dumps(value, sort_keys=True, ensure_ascii=False,
                                    separators=(',', ':'), allow_nan=False).encode()).hexdigest()


def file_hash(path):
    h = hashlib.sha256()
    with Path(path).open('rb') as f:
        for block in iter(lambda: f.read(1024 * 1024), b''):
            h.update(block)
    return h.hexdigest()


def parse_json(text):
    def unique(pairs):
        result = {}
        for k, v in pairs:
            require(k not in result, f'duplicate JSON key: {k}')
            result[k] = v
        return result
    return json.loads(text, object_pairs_hook=unique,
                      parse_constant=lambda x: (_ for _ in ()).throw(Blocked(f'invalid number {x}')))


def read_json(path):
    return parse_json(Path(path).read_text())


def number(x):
    return type(x) in (int, float) and math.isfinite(x)


def nonempty(value):
    return isinstance(value, str) and bool(value.strip())


def alias(row, canonical, exported):
    if canonical in row and exported in row:
        require(row[canonical] == row[exported], f'conflicting {canonical}/{exported}')
    return row[canonical] if canonical in row else row[exported]


def check_chart(chart):
    """A common linear axis and one data source for labels and widths."""
    lo, hi = chart['domain']
    width = chart['plot_width']
    require(all(number(x) for x in (lo, hi, width)) and lo == 0 and hi > lo and width > 0,
            'bar chart requires common zero baseline, finite domain and plot width')
    require(nonempty(chart.get('source')) and nonempty(chart.get('meaning')), 'chart provenance/meaning missing')
    require(chart.get('stages'), 'chart needs all revealed data stages')
    for stage in chart['stages']:
        require(stage.get('bars'), 'empty chart stage')
        for bar in stage['bars']:
            v, w = bar['value'], bar['width']
            require(number(v) and number(w) and lo <= v <= hi, 'invalid chart value')
            require(math.isclose(w, width * v / hi, abs_tol=0.01), 'bar width does not encode value on shared axis')
            require(str(bar['label']) == str(v), 'bar label differs from value')


class Guard:
    def __init__(self, project):
        self.root = Path(project).resolve()
        self.manifest = read_json(self.root / 'workflow-evidence.json')
        require(self.manifest.get('schema') == 'park-evidence/v1', 'unsupported evidence schema')
        require(nonempty(self.manifest.get('producer_session')), 'producer_session missing')

    def inputs(self, stage):
        inputs = self.manifest['stages'][stage]['inputs']
        require(isinstance(inputs, dict) and inputs, f'{stage}: inputs missing')
        paths = {}
        for name, ref in inputs.items():
            path = (self.root / ref['path']).resolve()
            require(path.is_file() and path.stat().st_size > 0, f'{name}: missing/empty file')
            require(file_hash(path) == ref['sha256'], f'{name}: stale hash; repeat affected review/approval')
            paths[name] = path
        return paths

    def fingerprint(self, stage):
        self.inputs(stage)
        return digest(self.manifest['stages'][stage])

    def approval(self, name, fingerprint):
        a = read_json(self.root / 'approvals' / f'{name}.json')
        require(a.get('decision') == 'approved' and a.get('actor') == 'Park', f'{name}: Park approval missing')
        require(a.get('input_digest') == fingerprint, f'{name}: approval stale')
        require(nonempty(a.get('message')) and nonempty(a.get('message_ref')), f'{name}: actual user message/reference required')

    def review(self, name, fingerprint, ids):
        report = read_json(self.root / 'qa' / f'{name}.json')
        require(report.get('input_digest') == fingerprint, f'{name}: review stale')
        require(report.get('reviewer_session') != self.manifest['producer_session']
                and nonempty(report.get('reviewer_session')), f'{name}: self-review is not independent')
        require(report.get('status') == 'pass', f'{name}: review did not pass')
        require(report.get('findings') == [], f'{name}: unresolved findings')
        require(set(report.get('reviewed_ids', [])) == set(ids), f'{name}: incomplete shot review')
        for key in ('semantic', 'motion', 'timing', 'sources'):
            check = report.get('checks', {}).get(key, {})
            require(check.get('status') == 'pass' and nonempty(check.get('evidence')), f'{name}: {key} unverified')
        raw = self.root / report['raw_response']['path']
        require(file_hash(raw) == report['raw_response']['sha256'], f'{name}: raw review receipt missing/stale')
        answer = read_json(raw)
        require(all(answer.get(k) == report.get(k) for k in ('status', 'findings', 'reviewed_ids', 'checks')),
                f'{name}: report differs from original reviewer response')
        return report

    def hook_prefill(self):
        p = self.inputs('hook-prefill')
        require(file_hash(p['prompt']) == file_hash(ROOT / 'prompts/hook-prefill.md'), 'use versioned Hook prefill prompt')
        transcript = read_json(p['transcript'])['transcript']
        texts = {str(s['id']): s['text'] for s in transcript}
        candidates = read_json(p['candidates'])['hooks']
        require(candidates, 'empty Hook candidates')
        for h in candidates:
            require(nonempty(h.get('reason')), 'Hook rationale missing')
            require(nonempty(h.get('quote')) and h['quote'] in texts[str(h['sentence_id'])], 'Hook quote is not exact source text')
        return self.fingerprint('hook-prefill')

    def hook_cut(self):
        p = self.inputs('hook-cut')
        worktable = read_json(p['worktable'])
        cuts = read_json(p['cut_plan'])
        require(cuts['source_sha256'] == file_hash(p['source_media']), 'wrong Hook source media')
        require(cuts['timeline_id'] == cuts['timing_timeline_id'], 'Hook timeline mismatch/double mapping')
        require(cuts.get('timing_method') in ('word-alignment', 'manual-audio'), 'hints are not cutting evidence')
        timing = read_json(p['timing_evidence'])
        require(timing['source_sha256'] == cuts['source_sha256'], 'timing evidence belongs to another source')
        selected = sorted(worktable['hooks'], key=lambda h: h['order'])
        transcript = read_json(p['transcript'])['transcript']
        text = ''.join(s['text'] for s in transcript)
        if worktable.get('hook_origin') == 'ai-prefill' or 'hook-prefill' in self.manifest['stages']:
            self.hook_prefill()
        require(len(selected) == len(cuts['clips']) and selected, 'Hook selection/cut count mismatch')
        for h, c, t in zip(selected, cuts['clips'], timing['clips']):
            require(nonempty(alias(h, 'quote', 'text')) and alias(h, 'quote', 'text') in text,
                    'selected Hook does not match current transcript')
            require(h.get('anchor_status') == 'ok', 'selected Hook anchor must be resolved')
            require(alias(h, 'quote', 'text') == c['quote'] == t['quote'], 'Hook order/quote mismatch')
            require(0 <= c['start'] < c['end'] and (c['start'], c['end']) == (t['start'], t['end']), 'cut boundary differs from timing evidence')
            require(t.get('boundary_listened') is True, 'listen to Hook boundaries before cutting')
        require(len(timing['clips']) == len(selected), 'timing evidence incomplete')
        fp = self.fingerprint('hook-cut')
        self.approval('H1', digest({'worktable': file_hash(p['worktable'])}))
        return fp

    def visual_spec(self):
        p = self.inputs('visual-spec')
        require('shotcraft_skill' in p and 'gallery' in p, 'ShotCraft skill and Gallery evidence required')
        skill = p['shotcraft_skill'].read_text()
        require('video-shotcraft' in skill and 'demo' in skill, 'invalid ShotCraft skill evidence')
        plan = read_json(p['plan'])
        require(plan.get('timeline_id') and number(plan.get('duration')) and plan['duration'] > 0, 'plan timeline/duration missing')
        notes = read_json(p['worktable']).get('visual_notes')
        require(isinstance(notes, list), 'worktable must use visual_notes; explicitly migrate legacy notes')
        note_ids = {str(alias(n, 'id', 'marker')) for n in notes}
        require(len(note_ids) == len(notes), 'duplicate visual note IDs')
        responses = plan['note_responses']
        require(len(responses) == len(notes) and {str(n['note_id']) for n in responses} == note_ids, 'unanswered visual notes')
        for n in responses:
            require(n['disposition'] in ('采纳', '调整', '拒绝'), 'invalid disposition')
            require(n['disposition'] == '采纳' or nonempty(n.get('reason')), 'note override reason required')
        cards = read_json(p['gallery'])['cards']
        transcript = read_json(p['transcript'])['transcript']
        full_text = ''.join(s['text'] for s in transcript)
        shots = plan['shots']
        ids = [s['id'] for s in shots]
        require(len(ids) == len(set(ids)), 'duplicate shot IDs')
        intervals = []
        for s in shots:
            require(0 <= s['start'] < s['end'] <= plan['duration'], 'shot outside body timeline')
            require(s['visual_type'] in ('B-roll', '图形与动效'), 'production shot type must be specified')
            for field in ('quote', 'purpose', 'source', 'motion', 'acceptance'):
                require(nonempty(s.get(field)), f'{s["id"]}: missing {field}')
            require(s['quote'] in full_text, 'visual quote not found in transcript')
            c = s['cue_points']
            require(s['start'] <= c['enter'] <= c['reveal'] <= c['hold'] < c['exit'] <= s['end'], 'invalid cue sequence')
            require(c['exit'] - c['hold'] >= 1, 'settled information must hold at least 1 second')
            r = s['recipe']
            if r['mode'] == 'card':
                matches = [card for card in cards if card['name'] == r['name']]
                require(len(matches) == 1 and any(v['key'] == r['style'] for v in matches[0]['styles']), 'unknown Gallery card/style')
                require(f'card:{s["id"]}' in p and f'demo:{s["id"]}' in p, 'exact card/demo source required')
                require(p[f'demo:{s["id"]}'].name in p[f'card:{s["id"]}'].read_text(), 'demo does not match recipe reference')
                require(nonempty(r.get('adaptation')), 'record preserved motion and adaptations')
            else:
                require(r['mode'] in ('custom', 'real-footage') and nonempty(r.get('reason')), 'custom/B-roll rationale required')
                require(nonempty(r.get('implementation')), 'custom implementation reference required')
            require(type(s.get('quantitative')) is bool, 'explicit quantitative classification required')
            if s['quantitative']:
                require(s.get('chart'), 'quantitative shot requires chart data')
                check_chart(s['chart'])
            intervals.append((s['start'], s['end']))
        total, right = 0, 0
        for a, b in sorted(intervals):
            total += max(0, b - max(a, right))
            right = max(right, b)
        coverage = total / plan['duration']
        require(.3 <= coverage <= .4 or nonempty(plan.get('coverage_exception')), 'coverage outside 30–40% needs visible reason in H2')
        # Empty tracks also need an explicit rationale; never silently drop user notes.
        for n in responses:
            require(n['disposition'] == '拒绝' or any(str(n['note_id']) in [str(x) for x in s.get('note_ids', [])] for s in shots), 'adopted note has no shot')
        return self.fingerprint('visual-spec'), ids

    def check(self, gate):
        if gate == 'hook-prefill':
            return self.hook_prefill()
        if gate == 'hook-cut':
            return self.hook_cut()
        fp, ids = self.visual_spec()
        if gate == 'visual-spec':
            return fp  # Structural check: NOT an independent review or H2 approval.
        self.review('visual-spec', fp, ids)
        if gate == 'present-spec':
            return fp
        self.approval('H2', fp)
        spec_inputs = self.inputs('visual-spec')
        require('picture_lock' in spec_inputs and 'body_media' in spec_inputs, 'Picture Lock and body media required for production')
        lock = read_json(spec_inputs['picture_lock'])
        plan = read_json(spec_inputs['plan'])
        require(lock.get('status') == 'pass' and lock.get('timeline_id') == plan['timeline_id']
                and lock.get('media_sha256') == file_hash(spec_inputs['body_media']), 'Picture Lock is missing/stale or on another timeline')
        if gate == 'visual-render':
            return fp
        p = self.inputs('delivery')
        require(all(k in p for k in ('video', 'product_a', 'product_b', 'qa_a', 'qa_b', 'qa_final', 'frames')), 'delivery evidence incomplete')
        for key, media in (('qa_a', 'product_a'), ('qa_b', 'product_b'), ('qa_final', 'video')):
            qa = read_json(p[key])
            require(qa.get('status') == 'pass' and qa.get('video_sha256') == file_hash(p[media]), f'{key}: not passed or stale media')
        frames = read_json(p['frames'])
        require(frames['video_sha256'] == file_hash(p['video']), 'frames belong to stale render')
        require(set(frames['shots']) == set(ids), 'missing shot frame QA')
        plan = read_json(self.inputs('visual-spec')['plan'])
        quantitative = {s['id']: s['chart'] for s in plan['shots'] if s['quantitative']}
        for shot_id, shot in frames['shots'].items():
            for phase in ('enter', 'reveal', 'hold', 'exit'):
                ref = shot[phase]
                require(file_hash(self.root / ref['path']) == ref['sha256'], 'frame missing/stale')
                require(type(ref.get('frame')) is int and ref['frame'] >= 0, 'frame number missing')
            if shot_id in quantitative:
                require(shot.get('measured_charts'), 'quantitative shot needs actual rendered measurements')
                expected = quantitative[shot_id]
                measured = shot['measured_charts']
                require(len(measured) == len(expected['stages']), 'measure every data stage, not only last frame')
                for measurement, expected_stage in zip(measured, expected['stages']):
                    ref = measurement['frame']
                    require(type(ref.get('frame')) is int and ref['frame'] >= 0 and
                            file_hash(self.root / ref['path']) == ref['sha256'], 'chart measurement frame missing/stale')
                    require(measurement['domain'] == expected['domain'], 'rendered axis differs from spec')
                    require(len(measurement['stages']) == 1 and
                            [b['value'] for b in measurement['stages'][0]['bars']] == [b['value'] for b in expected_stage['bars']],
                            'rendered data differs from spec')
            for measured in shot.get('measured_charts', []):
                check_chart(measured)
        full = digest({'spec': fp, 'delivery': self.fingerprint('delivery')})
        self.review('render', full, ids)
        return full


GATES = ('hook-prefill', 'hook-cut', 'visual-spec', 'present-spec', 'visual-render', 'delivery')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('action', choices=('check', 'run', 'hash'))
    parser.add_argument('project', help='project directory, or file for hash')
    parser.add_argument('--gate', choices=GATES)
    args, command = parser.parse_known_args()
    try:
        if args.action == 'hash':
            print(file_hash(args.project))
            return
        require(args.gate, '--gate required')
        fp = Guard(args.project).check(args.gate)
        print(json.dumps({'gate': args.gate, 'status': 'pass', 'input_digest': fp}), flush=True)
        if args.action == 'run':
            require(args.gate in ('hook-cut', 'visual-render', 'delivery'), 'run requires a production gate')
            require(command and command[0] == '--' and len(command) > 1, 'command required after --')
            result = subprocess.run(command[1:], cwd=Path(args.project).resolve(), check=False)
            sys.exit(result.returncode)
        require(not command, 'unexpected arguments')
    except (Blocked, KeyError, TypeError, ValueError, OSError) as exc:
        print(f'BLOCKED: {exc}', file=sys.stderr)
        sys.exit(2)


if __name__ == '__main__':
    main()
