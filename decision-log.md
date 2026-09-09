# Decisions

## 2026-09-09 · Publication package

- The repaired v2 video was accepted; do not redo its rough cut/Hook based on v1 failures. Extend Step 14 to title, cover, speed variant and authorized platform drafts.
- Keep current-video face provenance separate from an older cover's style reference. Title and cover changes invalidate old draft receipts.
- `release.json` is the publication truth; derive status HTML from it and the per-platform receipt. A user's publication report is not platform verification.
- Independent review is about separate context and actual evidence, not mandatory Claude-versus-Codex branding. Record native reviewer use honestly when a CLI is unavailable.
- The new release checker is not proof of face identity, perceptual quality or server-side media hashing. It checks actual file hashes, PNG dimensions and ffprobe durations plus evidence consistency. Visual/audio review remains necessary.

## 2026-09-08 · Evidence gates (#3)

- Introduce a portable guarded production entrypoint, not regex matching of `ffmpeg` commands. Hook invocation names vary by host; aliases/scripts can bypass a command-name regex. Do not silently install global hooks.
- Keep the three human gates H1/H2/H3. Independent visual-spec review is an automated prerequisite to H2, not another user approval round.
- Explicit prefill requests authorize suggestions using a versioned Hook prompt and ShotCraft direction. They never authorize production or erase existing edits.
- Bind approval/review to content hashes. Require separate rendered review; a text-only CLI cannot certify viewed frames.
- Quantitative v1 checks cover common zero-baseline linear bars. Other chart types need a suitable validator rather than a fake pass through a bar contract.

## Gotchas

- Reading a skill or listing a card does not prove execution; inspect the accurate demo source, preserve motion semantics and verify actual rendered frames.
- 80/95 geometry must come from the same data as labels. Width assertions on the plan alone do not verify the image.
- Current worktable exports `hooks[].text` and `visual_notes[].marker`; alias support must not quietly interpret a missing key as an empty selection.
- Claude `auth status` can say logged in while an actual request fails with an expired token. Codex CLI can be installed but too old for its configured model. Do not infer successful independent QA from either status.
- Duplicate JSON keys are an ambiguity, not a harmless parser detail: `fail` followed by `pass` must block, including inside provider responses.
- A new worktree isolates this repository; it does not update a different active checkout or the installed skill. Keep production sessions on their chosen revision until intentionally switched.
- Guards and local approval files are not a security boundary against a producer with unrestricted write/shell access. Stronger enforcement requires a separately controlled executor and approval store.
