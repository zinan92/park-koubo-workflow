# Guard validation · 2026-09-08

Scope: repository changes for [#3](https://github.com/zinan92/park-koubo-workflow/issues/3), not a re-review of the existing video.

| Trigger | Previous behavior | New observable behavior |
|---|---|---|
| Missing ShotCraft/demo | Written instructions only | structural gate exits 2 |
| 80 bar wider than 95 on common scale | no numeric guard | plan/measurement rejected |
| Plan edited after approval | status could remain approved | digest mismatch blocks render |
| Reviewer response repeats fail/pass key | permissive JSON could discard fail | strict parser blocks both CLI formats |
| Selected Hook edited into an invented sentence | candidate check did not cover selection | current selected quote rejected against transcript |
| Older worktable drops prefill origin | nomination evidence could be skipped | existing prefill stage still checked |
| Render invoked before H2 | no executable entrypoint | wrapper does not start marker command |
| Login/model/JSON error during review | possible false pass through status assumptions | old active pass replaced by blocked |

Verification commands:

```bash
python3 -m unittest discover -s tests -p 'test_*.py'
python3 scripts/validate_presets.py
python3 /path/to/skill-creator/scripts/quick_validate.py .
gitleaks dir . --redact --no-banner
```

Local results: 34 regression tests passed, four preset checks passed, skill validation passed, secret scan found no leaks. Tests use fixture media/frames and mocked CLI responses: they verify gate logic, not perceptual quality or live service availability.

Actual CLI probes:
- Claude Code 2.1.216 installed; login status reported logged in; isolated review request failed because the OAuth token expired. No QA pass claimed.
- Codex CLI installed; independent read-only review request rejected the configured model because the CLI version was too old. No QA pass claimed.
- Independent native Codex reviewer found three concrete bugs (duplicate-key normalization, edited Hook revalidation, prefill export provenance). Recheck confirmed their fixes and found a cross-sentence visual-selection mismatch, also corrected with a regression. Final recheck recorded in the PR.

Transport logs were kept outside Git; this report intentionally excludes account identifiers and raw private context. Live successful CLI review remains unverified until authentication/version issues are repaired. The guarded runner supports both interfaces and has mocked success/failure coverage.
