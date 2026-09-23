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

## 2026-09-23 — Spliced Hooks and the iCloud project-root rule (#11)

- A Hook may be spliced from ≥2 non-adjacent verbatim passages (`parts`), played in Park's order. 9/22 Park asked for this in both the workbench and the skill; that video was done by hand and nothing was committed, so he would have had to ask again.
- The guard adds a separate branch for spliced Hooks; the single-Hook path is textually unchanged. A segmented clip keeps timing only in `segments` (no clip-level start/end), every segment is listened, segments may be out of source order but never overlap, and the Hook text must equal its parts joined with nothing added — that is how "no connecting words" is enforced.
- Hook prefill prompt → v2 (spliced candidates allowed, same no-filler rule). Projects that pinned v1 in a `hook-prefill` stage must re-run prefill before re-checking; the 9/22 Codex project had no such stage.
- Step 1: projects go under the configured root, never iCloud-synced `~/Documents`/`~/Desktop`; `find <project> -flags +dataless -print` before reading media (verified on this Mac: prints exactly the evicted files).

### Gotchas

- A spliced slot has no textarea: the joined text is not contiguous, so the paste-reanchor path would silently mark it `unmatched`. Parts are only added from transcript selections.
- Editing a transcript sentence re-reads each part from its anchor, same as single Hooks; the Hook is flagged for review.
