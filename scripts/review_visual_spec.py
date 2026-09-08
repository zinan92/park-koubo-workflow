#!/usr/bin/env python3
"""Fresh CLI session, bounded text-only spec review. Never reviews rendered video."""
import argparse
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import uuid

from workflow_guard import Guard, ROOT, Blocked, file_hash, require, parse_json


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('project')
    parser.add_argument('--provider', choices=('claude', 'codex'), required=True)
    parser.add_argument('--timeout', type=int, default=300)
    args = parser.parse_args()
    project = Path(args.project).resolve()
    qa = project / 'qa'
    qa.mkdir(exist_ok=True)
    target = qa / 'visual-spec.json'
    # Failed reruns must not leave a previous pass active.
    target.write_text(json.dumps({'status': 'blocked', 'reason': 'review in progress'}))
    try:
        guard = Guard(project)
        fingerprint, ids = guard.visual_spec()
        paths = guard.inputs('visual-spec')
        prompt = (ROOT / 'prompts/visual-spec-review.md').read_text()
        for name, path in sorted(paths.items()):
            if name == 'body_media':
                prompt += '\n\n' + json.dumps({'input': name, 'path': str(path), 'sha256': file_hash(path),
                                               'scope': 'media bytes omitted; design review only, not rendered QA'})
                continue
            require(path.stat().st_size <= 2_000_000, f'{name}: text input too large; supply scoped source extract')
            prompt += '\n\n' + json.dumps({'input': name, 'path': str(path), 'content': path.read_text()}, ensure_ascii=False)
        require(len(prompt.encode()) < 600_000, 'review packet too large; split plan into independently complete review batches')
        session = str(uuid.uuid4())
        with tempfile.TemporaryDirectory(prefix='park-spec-review-') as temp:
            output = Path(temp) / 'answer.json'
            if args.provider == 'claude':
                cmd = ['claude', '-p', '--tools', '', '--strict-mcp-config', '--mcp-config', '{"mcpServers":{}}',
                       '--setting-sources', '', '--no-session-persistence', '--session-id', session, '--output-format', 'json']
            else:
                cmd = ['codex', 'exec', '--ephemeral', '--sandbox', 'read-only', '--skip-git-repo-check',
                       '-C', temp, '-o', str(output), '-']
            result = subprocess.run(cmd, input=prompt, text=True, capture_output=True, timeout=args.timeout, cwd=temp)
            transport = qa / f'visual-spec-{session}.transport.json'
            transport.write_text(json.dumps({'provider': args.provider, 'returncode': result.returncode,
                                            'stdout': result.stdout, 'stderr': result.stderr}, ensure_ascii=False, indent=2))
            require(result.returncode == 0, 'review CLI failed; see local transport receipt')
            if args.provider == 'claude':
                envelope = parse_json(result.stdout)
                if isinstance(envelope, list):
                    envelope = next((item for item in reversed(envelope) if item.get('type') == 'result'), {})
                require(not envelope.get('is_error'), 'Claude returned an error')
                answer_text = envelope['result']
            else:
                answer_text = output.read_text()
            answer = parse_json(answer_text)
            require(guard.fingerprint('visual-spec') == fingerprint, 'inputs changed during review')
            raw = qa / f'visual-spec-{session}.response.json'
            raw.write_text(answer_text)
            report = dict(answer, input_digest=fingerprint, reviewer_session=session, provider=args.provider,
                          raw_response={'path': str(raw.relative_to(project)), 'sha256': file_hash(raw)},
                          transport={'path': str(transport.relative_to(project)), 'sha256': file_hash(transport)})
            target.write_text(json.dumps(report, ensure_ascii=False, indent=2))
            guard.review('visual-spec', fingerprint, ids)
            print(f'PASS: independent spec review → {target}')
    except (Blocked, KeyError, ValueError, TypeError, AttributeError, OSError, subprocess.TimeoutExpired) as exc:
        target.write_text(json.dumps({'status': 'blocked', 'reason': str(exc)}, ensure_ascii=False, indent=2))
        print(f'BLOCKED: {exc}', file=sys.stderr)
        return 2
    return 0


if __name__ == '__main__':
    sys.exit(main())
