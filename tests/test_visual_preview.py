import json
from pathlib import Path
import sys
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
from workflow_guard import Guard, Blocked, file_hash, read_json
from visual_preview import validate, page, snapshot
import test_workflow_guard as fixtures


class PreviewTests(unittest.TestCase):
    def setUp(self):
        self.f = fixtures.Gates()
        self.f.setUp()
        self.addCleanup(self.f.doCleanups)
        self.fp = self.f.check()
        self.f.review('visual-spec', self.fp)
        self.index = read_json(self.f.p / 'visual-preview-index.json')

    def save(self):
        self.f.put('visual-preview', 'index', self.index)
        self.f.save()

    def validate(self):
        self.save()
        return validate(Guard(self.f.p), self.fp)

    def test_text_only_plan_cannot_reach_h2(self):
        del self.f.manifest['stages']['visual-preview']
        self.f.save()
        with self.assertRaises(KeyError): self.f.check('present-spec')

    def test_picture_lock_required_before_h2(self):
        del self.f.manifest['stages']['visual-spec']['inputs']['picture_lock']
        fp = self.f.check()
        self.f.review('visual-spec', fp)
        with self.assertRaisesRegex(Blocked, 'Picture Lock'): self.f.check('present-spec')

    def test_snapshot_survives_source_overwrite(self):
        _, _, paths = self.validate()
        out = self.f.p / 'review-v1.html'
        frozen = snapshot(paths, out)
        before = frozen['composite'].read_bytes()
        paths['composite'].write_bytes(b'updated source')
        self.assertEqual(frozen['composite'].read_bytes(), before)
        with self.assertRaisesRegex(Blocked, 'preserve existing'): snapshot(paths, out)

    def test_every_point_needs_images(self):
        self.index['shots'] = {}
        with self.assertRaisesRegex(Blocked, 'every visual point'): self.validate()

    def test_original_alone_is_not_preview(self):
        self.index['shots']['V1']['comparisons'][0]['composite'] = 'original'
        with self.assertRaisesRegex(Blocked, 'original frame alone'): self.validate()

    def test_full_frame_needs_explicit_override(self):
        self.index['layout']['mode'] = 'custom'
        with self.assertRaisesRegex(Blocked, 'explicit user choice'): self.validate()

    def test_notes_overlay_cannot_cover_face(self):
        self.index['layout']['overlay_rect'] = [0, 0, 1440, 1080]
        with self.assertRaisesRegex(Blocked, 'retained live face'): self.validate()

    def test_long_static_tail_needs_rationale(self):
        self.index['shots']['V1']['last_change_sec'] = 3
        with self.assertRaisesRegex(Blocked, 'reading/context rationale'): self.validate()

    def test_motion_needs_actual_sample(self):
        self.index['shots']['V1']['motion'] = True
        with self.assertRaisesRegex(Blocked, 'needs a sample'): self.validate()

    def test_sample_must_include_static_tail(self):
        self.f.put('visual-preview', 'clip', 'fixture clip')
        self.index['shots']['V1']['sample'] = {'input': 'clip', 'start': 2, 'end': 6, 'reason': 'representative chart', 'remotion_inputs': ['remotion-output']}
        with self.assertRaisesRegex(Blocked, 'whole shot'): self.validate()

    def test_normal_speed_sample_duration_checked(self):
        self.f.put('visual-preview', 'clip', 'fixture clip')
        self.index['shots']['V1']['motion'] = True
        self.index['shots']['V1']['sample'] = {'input': 'clip', 'start': 2, 'end': 9, 'reason': 'representative chart', 'remotion_inputs': ['remotion-output']}
        with patch('visual_preview.clip_duration', return_value=3):
            with self.assertRaisesRegex(Blocked, 'normal-speed'): self.validate()
        with patch('visual_preview.clip_duration', return_value=7):
            self.validate()

    def test_preview_changes_invalidate_approval(self):
        self.f.approve('H2', self.fp)
        self.index['shots']['V1']['reason_to_add'] += ' revised'
        full, _, _ = self.validate()
        self.f.review('visual-preview', full)
        with self.assertRaisesRegex(Blocked, 'H2: approval stale'): self.f.check('visual-render')

    def test_design_review_cannot_be_omitted(self):
        path = self.f.p / 'qa/visual-preview.json'
        report = read_json(path)
        del report['checks']['usefulness']
        raw = self.f.p / report['raw_response']['path']
        raw.write_text(json.dumps({k: report[k] for k in ('status', 'findings', 'reviewed_ids', 'checks')}))
        report['raw_response']['sha256'] = file_hash(raw)
        path.write_text(json.dumps(report))
        with self.assertRaisesRegex(Blocked, 'usefulness unverified'): self.f.check('present-spec')

    def test_page_embeds_each_comparison_and_feedback(self):
        full, index, paths = self.validate()
        rendered = page(Guard(self.f.p), index, paths, full)
        self.assertEqual(rendered.count('<img '), 2)
        self.assertIn(paths['composite'].as_uri(), rendered)
        self.assertIn('visual-feedback.json', rendered)
        self.assertIn('此处为静帧构图预览', rendered)


if __name__ == '__main__':
    unittest.main()
