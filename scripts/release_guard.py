#!/usr/bin/env python3
"""Validate an immutable publication package; never uploads or publishes."""
import argparse
import html
import json
import math
from pathlib import Path
import struct
import subprocess
import sys

from workflow_guard import Blocked, ROOT, digest, file_hash, nonempty, number, read_json, require

SUMMARY_MARKER = '<!-- park-release-summary/v1 -->\n'


def write_summary(project, output, content):
    root = Path(project).resolve()
    out = Path(output).resolve()
    require(out == root / 'release-summary.html' and not Path(output).is_symlink(), 'summary output must be project/release-summary.html')
    require(not out.exists() or out.read_text().startswith(SUMMARY_MARKER), 'refusing to replace a non-generated summary')
    out.write_text(content)


def probe(path):
    result = subprocess.run(['ffprobe', '-v', 'error', '-show_format', '-show_streams', '-of', 'json', str(path)],
                            text=True, capture_output=True, timeout=60, check=True)
    data = json.loads(result.stdout)
    require(any(s.get('codec_type') == 'video' for s in data['streams']), 'media has no video stream')
    return float(data['format']['duration'])


def png_size(path):
    with path.open('rb') as f:
        header = f.read(24)
    require(len(header) == 24 and header[:8] == b'\x89PNG\r\n\x1a\n' and header[12:16] == b'IHDR', 'cover must be a PNG')
    return struct.unpack('>II', header[16:24])


class Release:
    def __init__(self, project, media_probe=probe):
        self.root = Path(project).resolve()
        self.doc = read_json(self.root / 'release.json')
        self.media_probe = media_probe

    def ref(self, ref):
        path = (self.root / ref['path']).resolve()
        require(path.is_file() and path.stat().st_size > 0, 'missing release artifact')
        require(file_hash(path) == ref['sha256'], f'stale release artifact: {ref["path"]}')
        return path

    def check(self):
        d = self.doc
        require(d['schema'] == 'park-release/v1', 'unsupported release schema')
        require(nonempty(d['title']) and nonempty(d['title_selection']['message_ref']), 'selected title/user instruction missing')
        require(d['title_selection']['title'] == d['title'], 'selected title differs from release title')
        for key in ('recording', 'master', 'upload_video'):
            self.ref(d[key])
        duration = self.media_probe(self.ref(d['upload_video']))
        master_duration = self.media_probe(self.ref(d['master']))
        recording_duration = self.media_probe(self.ref(d['recording']))
        speed = d['speed']
        require(number(speed) and speed > 0, 'invalid delivery speed')
        require(all(number(x) and x > 0 for x in (duration, master_duration, recording_duration)), 'invalid media duration')
        require(math.isclose(duration, master_duration / speed, abs_tol=.15), 'wrong speed version/duration')
        require(d['master_acceptance']['video_sha256'] == d['master']['sha256'] and
                nonempty(d['master_acceptance']['message_ref']), 'accepted master identity missing/stale')
        if speed != 1:
            require(nonempty(d.get('speed_request_ref')), 'speed change needs user instruction')
            require(d['upload_video']['sha256'] != d['master']['sha256'], 'speed variant overwrote/equals master')
        qa = read_json(self.ref(d['upload_qa']))
        require(qa['video_sha256'] == d['upload_video']['sha256'], 'QA belongs to another upload version')
        require(qa['source_sha256'] == d['master']['sha256'] and qa['speed'] == speed, 'QA variant lineage mismatch')
        require(qa['decode_errors'] == 0 and qa['pitch_preserved'] is True, 'decode/pitch verification failed')
        audio = read_json(ROOT / 'presets/audio/park-voice-v1.json')['voice']
        require(number(qa['integrated_lufs']) and abs(qa['integrated_lufs'] - audio['integrated_lufs']) <= .5,
                'final encoded loudness outside ±0.5 LU tolerance')
        require(number(qa['true_peak_dbtp']) and qa['true_peak_dbtp'] <= audio['true_peak_dbtp'], 'encoded true peak exceeds preset')
        for name in ('sync', 'caption_readability', 'motion_readability'):
            require(qa['checks'][name]['status'] == 'pass' and nonempty(qa['checks'][name]['evidence']), f'upload {name} not verified')
        # This does not infer human listening from muted playback or decoding.
        require(type(qa['playback']['muted']) is bool and number(qa['playback']['speed']) and qa['playback']['speed'] > 0,
                'actual playback conditions missing')
        require(nonempty(qa['playback']['scope']) and nonempty(qa['limitations']), 'QA scope/limitations must be explicit (use none if applicable)')
        frame = read_json(self.ref(d['subject_frame_receipt']))
        require(frame['source_sha256'] == d['recording']['sha256'], 'cover person is not sourced from current recording')
        require(number(frame['time_sec']) and 0 <= frame['time_sec'] < recording_duration, 'cover frame outside source')
        self.ref(frame['image'])
        ratios = d['required_cover_ratios']
        require(isinstance(ratios, list) and ratios and len(ratios) == len(set(ratios)), 'required cover ratios missing/duplicated')
        covers = d['covers']
        require(len(covers) == len(ratios) and {c['ratio'] for c in covers} == set(ratios), 'cover versions/ratios incomplete')
        for cover in covers:
            require(cover['title'] == d['title'], 'cover still has previous title')
            require(cover['subject_frame_sha256'] == frame['image']['sha256'], 'cover uses wrong person source frame')
            w, h = png_size(self.ref(cover['file']))
            a, b = [int(n) for n in cover['ratio'].split(':')]
            require(a > 0 and b > 0 and w > 0 and h > 0 and w * b == h * a, 'wrong cover aspect ratio')
            cq = read_json(self.ref(cover['qa']))
            require(cq['image_sha256'] == cover['file']['sha256'] and cq['observed_title'] == d['title'], 'cover visual QA stale/title mismatch')
            require(cq['subject_frame_sha256'] == frame['image']['sha256'] and cq['face_matches_source'] is True,
                    'cover source identity not visually verified')
            require(cq['text_and_face_uncropped'] is True and nonempty(cq['evidence']), 'cover crop/legibility QA missing')
        require(isinstance(d['platforms'], dict) and d['platforms'], 'platform package missing')
        for platform, package in d['platforms'].items():
            require(package['title'] == d['title'], f'{platform}: stale title')
            require(nonempty(package['description']), f'{platform}: description missing')
            require(isinstance(package['hashtags'], list) and isinstance(package['required_hashtags'], list), 'hashtags must be arrays')
            require(all(nonempty(x) for x in package['hashtags'] + package['required_hashtags']), 'invalid hashtag')
            require(set(package['required_hashtags']) <= set(package['hashtags']), f'{platform}: required hashtag missing')
            require(package['action'] == 'upload-draft', 'release tool never authorizes publishing')
        return digest(d)

    def draft(self, platform):
        fp = self.check()
        require(platform in self.doc['platforms'], 'unknown platform')
        receipt = read_json(self.root / 'platform-state.json')['platforms'][platform]
        require(receipt['package_digest'] == fp, 'platform draft stale: update title, covers and video')
        expected = self.doc['platforms'][platform]
        require(receipt['observed_title'] == expected['title'] and receipt['observed_description'] == expected['description'], 'platform text differs from package')
        require(set(receipt['observed_hashtags']) == set(expected['hashtags']), 'platform hashtags differ from package')
        require(receipt['uploaded_video_sha256'] == self.doc['upload_video']['sha256'], 'wrong upload video')
        require(receipt['uploaded_covers'] == {c['ratio']: c['file']['sha256'] for c in self.doc['covers']}, 'platform covers stale')
        require(receipt['status'] == 'draft_ready' and receipt['publish_clicked'] is False, 'draft-only boundary violated/unverified')
        require(nonempty(receipt['page_url']) and nonempty(receipt['checked_at']), 'draft page observation missing')
        self.ref(receipt['screenshot'])
        return fp

    def summary(self):
        fp = self.check()
        rows = [('标题', self.doc['title']), ('上传视频', self.doc['upload_video']['path']),
                ('倍速', str(self.doc['speed'])), ('版本指纹', fp)]
        state = self.root / 'platform-state.json'
        receipts = read_json(state).get('platforms', {}) if state.exists() else {}
        for name in self.doc['platforms']:
            receipt = receipts.get(name, {})
            label = '待上传/尚未核验'
            if receipt.get('package_digest') == fp:
                if receipt.get('status') == 'published_by_user' and nonempty(receipt.get('user_message_ref')):
                    label = '用户报告已发布（不等于平台独立验证）'
                elif receipt.get('status') == 'draft_ready':
                    self.draft(name)
                    label = '草稿已核验；等待用户发布'
            elif receipt:
                label = '平台记录过期，需要重新核对'
            rows.append((name, label))
        return SUMMARY_MARKER + '<!doctype html><meta charset="utf-8"><title>发布交付状态</title><h1>发布交付状态</h1><dl>' + ''.join(
            f'<dt>{html.escape(k)}</dt><dd>{html.escape(v)}</dd>' for k, v in rows) + '</dl>'


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('action', choices=('check', 'check-draft', 'summary'))
    p.add_argument('project')
    p.add_argument('--platform')
    p.add_argument('--out')
    args = p.parse_args()
    try:
        release = Release(args.project)
        if args.action == 'summary':
            require(args.out, '--out required')
            content = release.summary()
            write_summary(args.project, args.out, content)
        else:
            fp = release.draft(args.platform) if args.action == 'check-draft' else release.check()
            print(json.dumps({'status': 'pass', 'package_digest': fp}))
    except (Blocked, KeyError, TypeError, AttributeError, ValueError, OSError, subprocess.SubprocessError) as exc:
        if args.action == 'summary' and args.out:
            try:
                write_summary(args.project, args.out, SUMMARY_MARKER + '<!doctype html><meta charset="utf-8">'
                              '<h1>交付证据失效，待重新核验</h1><p>' + html.escape(str(exc)) + '</p>')
            except (Blocked, OSError):
                pass  # Never replace an unrelated file, even to mark failure.
        print(f'BLOCKED: {exc}', file=sys.stderr)
        return 2
    return 0


if __name__ == '__main__':
    sys.exit(main())
