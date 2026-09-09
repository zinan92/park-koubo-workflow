import copy
import json
from pathlib import Path
import struct
import sys
import tempfile
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
from release_guard import Release
import release_guard
from workflow_guard import Blocked, file_hash


class ReleaseTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.doc = {
            'schema': 'park-release/v1', 'title': 'AI越强，你越是在瞎努力',
            'title_selection': {'title': 'AI越强，你越是在瞎努力', 'message_ref': 'fixture-user-selection'},
            'speed': 1.5, 'speed_request_ref': 'fixture-speed-request', 'required_cover_ratios': ['4:3', '3:4']}
        for key in ('recording', 'master', 'upload_video'):
            self.doc[key] = self.write(key + '.mp4', key.encode())
        self.doc['master_acceptance'] = {'video_sha256': self.doc['master']['sha256'], 'message_ref': 'fixture-acceptance'}
        self.qa = {'video_sha256': self.doc['upload_video']['sha256'], 'source_sha256': self.doc['master']['sha256'],
                   'speed': 1.5, 'decode_errors': 0, 'pitch_preserved': True, 'integrated_lufs': -16, 'true_peak_dbtp': -1.8,
                   'checks': {k: {'status': 'pass', 'evidence': 'test fixture, not real QA'} for k in ('sync', 'caption_readability', 'motion_readability')},
                   'playback': {'muted': True, 'speed': 8, 'scope': 'continuity only'}, 'limitations': 'not human listening'}
        self.doc['upload_qa'] = self.write('upload-qa.json', self.qa)
        self.frame = self.write('subject.png', b'fixture source image')
        self.frame_receipt = {'source_sha256': self.doc['recording']['sha256'], 'time_sec': 30, 'image': self.frame}
        self.doc['subject_frame_receipt'] = self.write('frame.json', self.frame_receipt)
        covers = []
        for ratio, w, h in [('4:3', 1440, 1080), ('3:4', 1080, 1440)]:
            cover_file = self.write(f'cover-{w}.png', b'\x89PNG\r\n\x1a\n' + struct.pack('>I', 13) + b'IHDR' + struct.pack('>II', w, h))
            qa = {'image_sha256': cover_file['sha256'], 'observed_title': self.doc['title'], 'subject_frame_sha256': self.frame['sha256'],
                  'face_matches_source': True, 'text_and_face_uncropped': True, 'evidence': 'fixture image review'}
            covers.append({'ratio': ratio, 'file': cover_file, 'title': self.doc['title'], 'subject_frame_sha256': self.frame['sha256'], 'qa': self.write(f'cover-qa-{w}.json', qa)})
        self.doc['covers'] = covers
        self.doc['platforms'] = {'douyin': {'title': self.doc['title'], 'description': '本期描述', 'hashtags': ['Ai新星计划'],
                                            'required_hashtags': ['Ai新星计划'], 'action': 'upload-draft'}}
        self.save()

    def write(self, name, value):
        path = self.root / name
        path.write_bytes(value if isinstance(value, bytes) else json.dumps(value, ensure_ascii=False).encode())
        return {'path': name, 'sha256': file_hash(path)}

    def save(self):
        self.write('release.json', self.doc)

    def release(self, durations=None):
        self.save()
        values = durations or {'recording.mp4': 120, 'master.mp4': 90, 'upload_video.mp4': 60}
        return Release(self.root, media_probe=lambda p: values[p.name])

    def draft(self):
        d = self.doc
        receipt = {'package_digest': self.release().check(), 'observed_title': d['title'], 'observed_description': '本期描述',
                   'observed_hashtags': ['Ai新星计划'], 'uploaded_video_sha256': d['upload_video']['sha256'],
                   'uploaded_covers': {c['ratio']: c['file']['sha256'] for c in d['covers']}, 'status': 'draft_ready',
                   'publish_clicked': False, 'page_url': 'https://example.test/draft', 'checked_at': '2026-09-09T00:00:00Z',
                   'screenshot': self.write('page.png', b'page screenshot fixture')}
        self.write('platform-state.json', {'platforms': {'douyin': receipt}})
        return receipt

    def test_valid_package_and_draft(self):
        self.draft()
        self.release().draft('douyin')

    def test_previous_video_person_is_rejected(self):
        self.frame_receipt['source_sha256'] = 'old-video'
        self.doc['subject_frame_receipt'] = self.write('frame.json', self.frame_receipt)
        with self.assertRaises(Blocked): self.release().check()

    def test_title_change_invalidates_covers(self):
        self.doc['title'] = '新标题'
        self.doc['title_selection']['title'] = '新标题'
        with self.assertRaises(Blocked): self.release().check()

    def test_wrong_ratio_rejected(self):
        self.doc['covers'][0]['ratio'] = '3:4'
        with self.assertRaises(Blocked): self.release().check()

    def test_wrong_actual_dimensions_rejected(self):
        c = self.doc['covers'][0]
        c['file'] = self.write('wrong.png', b'\x89PNG\r\n\x1a\n' + struct.pack('>I', 13) + b'IHDR' + struct.pack('>II', 500, 500))
        with self.assertRaises(Blocked): self.release().check()

    def test_wrong_speed_upload_rejected(self):
        with self.assertRaises(Blocked): self.release({'recording.mp4': 120, 'master.mp4': 90, 'upload_video.mp4': 90}).check()

    def test_peak_checked_on_encoded_file(self):
        self.qa['true_peak_dbtp'] = -1.11
        self.doc['upload_qa'] = self.write('upload-qa.json', self.qa)
        with self.assertRaises(Blocked): self.release().check()

    def test_old_qa_not_reusable(self):
        self.qa['video_sha256'] = self.doc['master']['sha256']
        self.doc['upload_qa'] = self.write('upload-qa.json', self.qa)
        with self.assertRaises(Blocked): self.release().check()

    def test_missing_cover_blocks(self):
        self.doc['covers'].pop()
        with self.assertRaises(Blocked): self.release().check()

    def test_missing_required_hashtag_blocks(self):
        self.doc['platforms']['douyin']['hashtags'] = []
        with self.assertRaises(Blocked): self.release().check()

    def test_upload_does_not_authorize_publish(self):
        self.doc['platforms']['douyin']['action'] = 'publish'
        with self.assertRaises(Blocked): self.release().check()

    def test_changed_package_invalidates_platform_receipt(self):
        self.draft()
        self.doc['platforms']['douyin']['description'] = '新描述'
        with self.assertRaises(Blocked): self.release().draft('douyin')
        self.assertIn('平台记录过期', self.release().summary())

    def test_wrong_platform_cover_is_rejected(self):
        receipt = self.draft()
        receipt['uploaded_covers']['4:3'] = 'old-version'
        self.write('platform-state.json', {'platforms': {'douyin': receipt}})
        with self.assertRaises(Blocked): self.release().draft('douyin')

    def test_actual_publish_not_reported_as_draft(self):
        receipt = self.draft()
        receipt['publish_clicked'] = True
        self.write('platform-state.json', {'platforms': {'douyin': receipt}})
        with self.assertRaises(Blocked): self.release().draft('douyin')

    def test_user_reported_publication_labeled_precisely(self):
        receipt = self.draft()
        receipt.update(status='published_by_user', user_message_ref='actual user message')
        self.write('platform-state.json', {'platforms': {'douyin': receipt}})
        self.assertIn('用户报告已发布', self.release().summary())
        self.assertIn('不等于平台独立验证', self.release().summary())

    def test_cover_source_changed_after_qa(self):
        c = self.doc['covers'][0]
        c['subject_frame_sha256'] = 'older-frame'
        with self.assertRaises(Blocked): self.release().check()

    def test_failed_refresh_invalidates_previous_ready_summary(self):
        self.draft()
        target = self.root / 'release-summary.html'
        instance = self.release()
        with patch.object(sys, 'argv', ['release', 'summary', str(self.root), '--out', str(target)]), \
             patch.object(release_guard, 'Release', return_value=instance):
            self.assertEqual(release_guard.main(), 0)
            self.assertIn('草稿已核验', target.read_text())
            (self.root / 'upload_video.mp4').write_bytes(b'changed media')
            self.assertEqual(release_guard.main(), 2)
        self.assertIn('交付证据失效', target.read_text())
        self.assertNotIn('草稿已核验', target.read_text())

    def test_summary_never_overwrites_unrelated_file(self):
        target = self.root / 'release-summary.html'
        target.write_text('user-authored notes')
        with patch.object(sys, 'argv', ['release', 'summary', str(self.root), '--out', str(target)]), \
             patch.object(release_guard, 'Release', return_value=self.release()):
            self.assertEqual(release_guard.main(), 2)
        self.assertEqual(target.read_text(), 'user-authored notes')


if __name__ == '__main__':
    unittest.main()
