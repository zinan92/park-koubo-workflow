import copy
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import struct
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
from workflow_guard import Guard, Blocked, ROOT, check_chart, digest, file_hash, read_json
import review_visual_spec


class Gates(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.p = Path(self.temp.name)
        self.manifest = {'schema': 'park-evidence/v1', 'producer_session': 'producer', 'stages': {}}
        self.chart = {'domain': [0, 100], 'plot_width': 400, 'source': '口述示意', 'meaning': '能力示意，非基准测试',
                      'stages': [{'bars': [{'value': 80, 'label': '80', 'width': 320}, {'value': 95, 'label': '95', 'width': 380}]}]}
        self.plan = {'timeline_id': 'rough-v1', 'duration': 20,
                     'note_responses': [{'note_id': 'n1', 'disposition': '采纳'}],
                     'shots': [{'id': 'V1', 'note_ids': ['n1'], 'start': 2, 'end': 9,
                                'quote': '我的80，别人的95。', 'purpose': '比较能力', 'source': '口述示意',
                                'visual_type': '图形与动效', 'motion': 'bars grow from common origin; labels track values; hold',
                                'acceptance': 'measure shared baseline and every stage',
                                'cue_points': {'enter': 2, 'reveal': 3, 'hold': 5, 'exit': 8},
                                'recipe': {'mode': 'card', 'name': 'demo', 'style': 'one', 'adaptation': 'retain growth timing; shared axis'},
                                'quantitative': True, 'chart': self.chart}]}
        for name, value in {
            'plan': self.plan, 'worktable': {'hooks': [], 'visual_notes': [{'id': 'n1'}]},
            'transcript': {'transcript': [{'id': 's1', 'text': '我的80，别人的95。'}]},
            'gallery': {'cards': [{'name': 'demo', 'styles': [{'key': 'one'}]}]},
            'shotcraft_skill': 'video-shotcraft exact demo source required',
            'card:V1': 'reference implementation: Demo.tsx', 'demo:V1': 'export const Demo = () => null;',
        }.items():
            self.put('visual-spec', name, value, 'Demo.tsx' if name == 'demo:V1' else None)
        media = self.put('visual-spec', 'body_media', 'body-media-fixture')
        self.put('visual-spec', 'picture_lock', {'status': 'pass', 'timeline_id': 'rough-v1', 'media_sha256': file_hash(media)})
        self.save()

    def put(self, stage, name, value, filename=None):
        path = self.p / (filename or (stage + '-' + name.replace(':', '-') + '.json'))
        path.write_text(value if isinstance(value, str) else json.dumps(value, ensure_ascii=False))
        self.manifest['stages'].setdefault(stage, {'inputs': {}})['inputs'][name] = {'path': path.name, 'sha256': file_hash(path)}
        return path

    def save(self):
        (self.p / 'workflow-evidence.json').write_text(json.dumps(self.manifest))

    def check(self, gate='visual-spec'):
        self.save()
        return Guard(self.p).check(gate)

    def replan(self):
        self.put('visual-spec', 'plan', self.plan)

    def review(self, name, fp):
        answer = {'status': 'pass', 'findings': [], 'reviewed_ids': ['V1'],
                  'checks': {key: {'status': 'pass', 'evidence': 'V1 spec/frame inspection fixture'} for key in ('semantic', 'motion', 'timing', 'sources')}}
        if name == 'visual-preview':
            answer['checks'].update({key: {'status': 'pass', 'evidence': 'fixture image comparison'} for key in ('usefulness', 'composition', 'pacing', 'reference_quality')})
        qa = self.p / 'qa'
        qa.mkdir(exist_ok=True)
        raw = qa / (name + '-raw.json')
        raw.write_text(json.dumps(answer))
        report = dict(answer, input_digest=fp, reviewer_session='independent', raw_response={'path': str(raw.relative_to(self.p)), 'sha256': file_hash(raw)})
        path = qa / (name + '.json')
        path.write_text(json.dumps(report))
        if name == 'visual-spec':
            self.preview(fp)
        return path

    def preview(self, fp):
        for name in ('original', 'composite'):
            f = self.p / (name + '.png')
            f.write_bytes(b'\x89PNG\r\n\x1a\n' + struct.pack('>I', 13) + b'IHDR' + struct.pack('>II', 1440, 1080) + name.encode())
            self.manifest['stages'].setdefault('visual-preview', {'inputs': {}})['inputs'][name] = {'path': f.name, 'sha256': file_hash(f)}
        self.put('visual-preview', 'implementation', 'fixture-render-code')
        index = {'schema': 'park-visual-preview/v1', 'spec_digest': fp,
                 'body_sha256': self.manifest['stages']['visual-spec']['inputs']['body_media']['sha256'],
                 'implementation_inputs': ['implementation'],
                 'layout': {'mode': 'notes-only', 'canvas': [1440,1080], 'overlay_rect': [540,20,880,1040], 'face_rect': [0,0,530,1080], 'face_live': True},
                 'shots': {'V1': {'reason_to_add': 'makes numerical comparison visible', 'comparisons': [{'time': 5, 'original': 'original', 'composite': 'composite'}],
                                  'motion': False, 'last_change_sec': 6}}}
        self.put('visual-preview', 'index', index)
        self.save()
        full = digest({'spec': fp, 'preview': Guard(self.p).fingerprint('visual-preview')})
        self.review('visual-preview', full)
        return index

    def approve(self, name, fp):
        if name == 'H2':
            fp = self.check('present-spec')
        directory = self.p / 'approvals'
        directory.mkdir(exist_ok=True)
        (directory / (name + '.json')).write_text(json.dumps({'actor': 'Park', 'decision': 'approved', 'input_digest': fp,
                                                           'message': '这版批准', 'message_ref': 'test-fixture-only'}))

    def test_valid_spec_is_not_render_approval(self):
        self.check()
        with self.assertRaises(OSError):
            self.check('visual-render')

    def test_missing_shotcraft(self):
        del self.manifest['stages']['visual-spec']['inputs']['shotcraft_skill']
        with self.assertRaises(Blocked): self.check()

    def test_missing_demo(self):
        del self.manifest['stages']['visual-spec']['inputs']['demo:V1']
        with self.assertRaises(Blocked): self.check()

    def test_wrong_card_variant(self):
        self.plan['shots'][0]['recipe']['style'] = 'invented'
        self.replan()
        with self.assertRaises(Blocked): self.check()

    def test_wrong_bar_scale(self):
        self.chart['stages'][0]['bars'][0]['width'] = 390
        self.replan()
        with self.assertRaises(Blocked): self.check()

    def test_wrong_label(self):
        self.chart['stages'][0]['bars'][1]['label'] = '80'
        with self.assertRaises(Blocked): check_chart(self.chart)

    def test_axis_cannot_hide_difference(self):
        self.chart['domain'] = [70, 100]
        with self.assertRaises(Blocked): check_chart(self.chart)

    def test_old_hash(self):
        (self.p / 'Demo.tsx').write_text('changed')
        with self.assertRaises(Blocked): self.check()

    def test_empty_or_short_hold(self):
        self.plan['shots'][0]['cue_points']['hold'] = 7.5
        self.replan()
        with self.assertRaises(Blocked): self.check()

    def test_unanswered_note(self):
        self.plan['note_responses'] = []
        self.replan()
        with self.assertRaises(Blocked): self.check()

    def test_legacy_notes_not_silently_empty(self):
        self.put('visual-spec', 'worktable', {'notes': [{'id': 'n1'}]})
        with self.assertRaises(Blocked): self.check()

    def test_stale_approval_after_spec_edit(self):
        fp = self.check()
        self.review('visual-spec', fp)
        self.approve('H2', fp)
        self.check('visual-render')
        self.plan['shots'][0]['motion'] += ' changed'
        self.replan()
        new_fp = self.check()
        self.review('visual-spec', new_fp)
        with self.assertRaises(Blocked): self.check('visual-render')

    def test_review_cannot_be_self_review(self):
        path = self.review('visual-spec', self.check())
        data = read_json(path)
        data['reviewer_session'] = 'producer'
        path.write_text(json.dumps(data))
        with self.assertRaises(Blocked): self.check('present-spec')

    def test_forged_pass_disagrees_with_receipt(self):
        path = self.review('visual-spec', self.check())
        data = read_json(path)
        raw = self.p / data['raw_response']['path']
        answer = read_json(raw)
        answer['status'] = 'fail'
        raw.write_text(json.dumps(answer))
        data['raw_response']['sha256'] = file_hash(raw)
        path.write_text(json.dumps(data))
        with self.assertRaises(Blocked): self.check('present-spec')

    def test_command_not_started_on_failure(self):
        marker = self.p / 'render-started'
        result = subprocess.run([sys.executable, str(ROOT / 'scripts/workflow_guard.py'), 'run', str(self.p),
                                 '--gate', 'visual-render', '--', sys.executable, '-c', f'open({str(marker)!r}, "w").close()'], capture_output=True)
        self.assertEqual(result.returncode, 2)
        self.assertFalse(marker.exists())

    def test_command_runs_after_valid_gate(self):
        fp = self.check()
        self.review('visual-spec', fp)
        self.approve('H2', fp)
        marker = self.p / 'render-started'
        result = subprocess.run([sys.executable, str(ROOT / 'scripts/workflow_guard.py'), 'run', str(self.p),
                                 '--gate', 'visual-render', '--', sys.executable, '-c', f'open({str(marker)!r}, "w").close()'], capture_output=True)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertTrue(marker.exists())

    def test_prefill_requires_prompt_and_exact_quote(self):
        self.put('hook-prefill', 'prompt', (ROOT / 'prompts/hook-prefill.md').read_text())
        self.put('hook-prefill', 'transcript', {'transcript': [{'id': 's1', 'text': '我的80，别人的95。'}]})
        self.put('hook-prefill', 'candidates', {'hooks': [{'quote': '我的80，别人的95。', 'sentence_id': 's1', 'reason': '具体差异'}]})
        self.check('hook-prefill')
        self.put('hook-prefill', 'candidates', {'hooks': [{'quote': 'AI让我赚百万', 'sentence_id': 's1', 'reason': 'fake'}]})
        with self.assertRaises(Blocked): self.check('hook-prefill')

    def test_duplicate_json_keys_fail(self):
        f = self.p / 'duplicate.json'
        f.write_text('{"status":"fail","status":"pass"}')
        with self.assertRaises(Blocked): read_json(f)

    def test_hook_timeline_and_boundary_guard(self):
        source = self.put('hook-cut', 'source_media', 'media-fixture')
        worktable = self.put('hook-cut', 'worktable', {'hooks': [{'quote': '原话', 'order': 1, 'anchor_status': 'ok'}]})
        self.put('hook-cut', 'transcript', {'transcript': [{'id': 's1', 'text': '原话'}]})
        clip = {'quote': '原话', 'start': 5, 'end': 7}
        cut = {'source_sha256': file_hash(source), 'timeline_id': 'rough', 'timing_timeline_id': 'rough', 'timing_method': 'word-alignment', 'clips': [clip]}
        self.put('hook-cut', 'cut_plan', cut)
        self.put('hook-cut', 'timing_evidence', {'source_sha256': file_hash(source), 'clips': [dict(clip, boundary_listened=True)]})
        self.approve('H1', digest({'worktable': file_hash(worktable)}))
        self.check('hook-cut')
        cut['timing_timeline_id'] = 'source'
        self.put('hook-cut', 'cut_plan', cut)
        with self.assertRaises(Blocked): self.check('hook-cut')

    def test_worktable_export_marker_supported(self):
        self.put('visual-spec', 'worktable', {'hooks': [], 'visual_notes': [{'marker': 'n1'}]})
        self.check()

    def test_conflicting_marker_alias_rejected(self):
        self.put('visual-spec', 'worktable', {'hooks': [], 'visual_notes': [{'marker': 'n1', 'id': 'other'}]})
        with self.assertRaises(Blocked): self.check()

    def test_cli_failure_removes_old_pass(self):
        self.review('visual-spec', self.check())
        with patch.object(sys, 'argv', ['review', str(self.p), '--provider', 'claude']), \
             patch.object(review_visual_spec.subprocess, 'run', return_value=subprocess.CompletedProcess([], 1, 'authentication failed', '')):
            self.assertEqual(review_visual_spec.main(), 2)
        self.assertEqual(read_json(self.p / 'qa/visual-spec.json')['status'], 'blocked')

    def test_cli_invalid_json_blocks(self):
        with patch.object(sys, 'argv', ['review', str(self.p), '--provider', 'claude']), \
             patch.object(review_visual_spec.subprocess, 'run', return_value=subprocess.CompletedProcess([], 0, '{"result":"not json"}', '')):
            self.assertEqual(review_visual_spec.main(), 2)

    def test_cli_success_checks_all_shots_and_omits_media_bytes(self):
        path = self.review('visual-spec', self.check())
        report = read_json(path)
        answer = read_json(self.p / report['raw_response']['path'])
        def fake_run(cmd, **kwargs):
            self.assertNotIn('body-media-fixture', kwargs['input'])
            self.assertIn('media bytes omitted', kwargs['input'])
            return subprocess.CompletedProcess(cmd, 0, json.dumps({'result': json.dumps(answer), 'is_error': False}), '')
        with patch.object(sys, 'argv', ['review', str(self.p), '--provider', 'claude']), \
             patch.object(review_visual_spec.subprocess, 'run', side_effect=fake_run):
            self.assertEqual(review_visual_spec.main(), 0)
        self.check('present-spec')

    def delivery(self):
        fp = self.check()
        self.review('visual-spec', fp)
        self.approve('H2', fp)
        fp = self.check('present-spec')
        for media, qa in [('product_a', 'qa_a'), ('product_b', 'qa_b'), ('video', 'qa_final')]:
            path = self.put('delivery', media, media + ' media')
            self.put('delivery', qa, {'status': 'pass', 'video_sha256': file_hash(path)})
        image = self.p / 'frame.png'
        image.write_bytes(b'fixture-only-not-real-QA')
        ref = {'path': image.name, 'sha256': file_hash(image), 'frame': 60}
        measured = copy.deepcopy(self.chart)
        measured['frame'] = ref
        frames = {'video_sha256': self.manifest['stages']['delivery']['inputs']['video']['sha256'],
                  'shots': {'V1': {**{phase: ref for phase in ('enter', 'reveal', 'hold', 'exit')}, 'measured_charts': [measured]}}}
        self.put('delivery', 'frames', frames)
        self.save()
        full = digest({'spec': fp, 'delivery': Guard(self.p).fingerprint('delivery')})
        self.review('render', full)
        return frames

    def test_delivery_current_evidence(self):
        self.delivery()
        self.check('delivery')

    def test_delivery_wrong_rendered_bar_blocks(self):
        frames = self.delivery()
        frames['shots']['V1']['measured_charts'][0]['stages'][0]['bars'][0]['width'] = 395
        self.put('delivery', 'frames', frames)
        with self.assertRaises(Blocked): self.check('delivery')

    def test_delivery_requires_measurements(self):
        frames = self.delivery()
        del frames['shots']['V1']['measured_charts']
        self.put('delivery', 'frames', frames)
        with self.assertRaises(Blocked): self.check('delivery')

    def test_delivery_stale_qa(self):
        self.delivery()
        self.put('delivery', 'video', 'changed render')
        with self.assertRaises(Blocked): self.check('delivery')

    def test_picture_lock_missing_blocks_render(self):
        del self.manifest['stages']['visual-spec']['inputs']['picture_lock']
        fp = self.check()
        self.review('visual-spec', fp)
        with self.assertRaises(Blocked): self.check('visual-render')

    def test_duplicate_reviewer_status_blocks_both_providers(self):
        for provider in ('claude', 'codex'):
            with self.subTest(provider=provider):
                path = self.review('visual-spec', self.check())
                report = read_json(path)
                answer = (self.p / report['raw_response']['path']).read_text().replace('{', '{"status":"fail",', 1)
                def fake(cmd, **kwargs):
                    if provider == 'codex':
                        Path(cmd[cmd.index('-o') + 1]).write_text(answer)
                        return subprocess.CompletedProcess(cmd, 0, '', '')
                    return subprocess.CompletedProcess(cmd, 0, json.dumps({'result': answer}), '')
                with patch.object(sys, 'argv', ['review', str(self.p), '--provider', provider]), \
                     patch.object(review_visual_spec.subprocess, 'run', side_effect=fake):
                    self.assertEqual(review_visual_spec.main(), 2)

    def hook_fixture(self, quote='原话', anchor='ok'):
        source = self.put('hook-cut', 'source_media', 'media-fixture')
        worktable = self.put('hook-cut', 'worktable', {'hooks': [{'text': quote, 'order': 1, 'anchor_status': anchor}]})
        self.put('hook-cut', 'transcript', {'transcript': [{'id': 's1', 'text': '原话'}]})
        clip = {'quote': quote, 'start': 5, 'end': 7}
        self.put('hook-cut', 'cut_plan', {'source_sha256': file_hash(source), 'timeline_id': 'rough', 'timing_timeline_id': 'rough', 'timing_method': 'word-alignment', 'clips': [clip]})
        self.put('hook-cut', 'timing_evidence', {'source_sha256': file_hash(source), 'clips': [dict(clip, boundary_listened=True)]})
        self.approve('H1', digest({'worktable': file_hash(worktable)}))

    def test_edited_hook_must_match_source(self):
        self.hook_fixture(quote='原文不存在的改写')
        with self.assertRaises(Blocked): self.check('hook-cut')

    def test_unmatched_hook_anchor_blocks(self):
        self.hook_fixture(anchor='unmatched')
        with self.assertRaises(Blocked): self.check('hook-cut')

    def test_existing_prefill_stage_cannot_lose_provenance(self):
        self.hook_fixture()
        self.manifest['stages']['hook-prefill'] = {'inputs': {}}
        with self.assertRaises(Blocked): self.check('hook-cut')

    def test_visual_selection_can_span_sentences(self):
        self.put('visual-spec', 'transcript', {'transcript': [{'id': 's1', 'text': '我的80，'}, {'id': 's2', 'text': '别人的95。'}]})
        self.check()


if __name__ == '__main__':
    unittest.main()
