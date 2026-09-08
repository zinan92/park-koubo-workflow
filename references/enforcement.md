# Evidence gates · v1

## Protection boundary

The guard is a deterministic **production entrypoint**, not an agent sandbox. It rejects missing/changed artifacts and inconsistent reports before launching an argv command, with exit 2 and no `--force`. An agent with arbitrary filesystem/shell access can still bypass it, forge a receipt, or edit the guard. File hashes prove which bytes were reviewed, not that someone read them or that Park really authored a quoted message. Independent review adds judgment, not cryptographic trust.

Use this entrypoint for Hook extraction, production visual rendering, and delivery. Do not claim system-wide enforcement just because SKILL.md was read. For stronger enforcement, put the render executor and approval store under a separate account/service that the producing agent cannot modify. That deployment is outside this skill installation.

## Stages and evidence

`<project>/workflow-evidence.json`:

```json
{
  "schema": "park-evidence/v1",
  "producer_session": "actual-producing-thread-or-session-id",
  "stages": {
    "visual-spec": {
      "inputs": {
        "plan": {"path": "part-b-body/visual-plan.json", "sha256": "SHA256"},
        "worktable": {"path": "analysis/worktable.json", "sha256": "SHA256"},
        "transcript": {"path": "subtitles/transcript.sentences.json", "sha256": "SHA256"},
        "shotcraft_skill": {"path": "/installed/video-shotcraft/SKILL.md", "sha256": "SHA256"},
        "gallery": {"path": "analysis/shotcraft-gallery-extract.json", "sha256": "SHA256"},
        "card:V01": {"path": "/installed/video-shotcraft/references/shots/category/card.md", "sha256": "SHA256"},
        "demo:V01": {"path": "/installed/video-shotcraft/demos/category/card/Demo.tsx", "sha256": "SHA256"}
      }
    }
  }
}
```

Hash with `python3 scripts/workflow_guard.py hash <file>`. Paths are relative to the project or absolute. Use genuine sources, not placeholder files. The Gallery extract has `cards` containing the exact selected records from `gallery/api/library.json`; keep its parent index SHA and extraction command in the process log. Preserve card/style names and exact demo source; the independent reviewer checks their relationship and the adaptation. A name alone is not use evidence.

| Gate | Inputs / condition |
|---|---|
| hook-prefill | `prompt`, `transcript`, `candidates`; exact quote and reason, versioned prompt hash |
| hook-cut | `worktable`, `transcript`, `cut_plan`, `timing_evidence`, `source_media`; H1 and verified boundaries |
| visual-spec | `plan`, `worktable`, `transcript`, `shotcraft_skill`, `gallery`, per-card `card:ID` and `demo:ID`; structural/data checks only |
| present-spec | visual-spec plus current independent `qa/visual-spec.json`; ready for H2, not approved |
| visual-render | present-spec plus matching H2 approval; spec inputs also include `picture_lock` and `body_media` |
| delivery | visual-render plus delivery inputs `video`, `product_a`, `product_b`, `qa_a`, `qa_b`, `qa_final`, `frames` and independent `qa/render.json` |

These are targeted guards around fragile handoffs, not machine validation of all fourteen steps. Preserve all earlier media/preset/timeline checks. Never use a stage's `pass` to imply a different gate passed.

```bash
python3 scripts/workflow_guard.py check <project> --gate visual-spec
python3 scripts/review_visual_spec.py <project> --provider claude
python3 scripts/workflow_guard.py check <project> --gate present-spec
# Present the exact generated table; wait for Park's H2 only here.
python3 scripts/workflow_guard.py run <project> --gate visual-render -- python3 scripts/render_visuals.py
```

`run` executes argv without a shell, only after a pass. It does not prove the chosen command is a renderer, or that the output matches its inputs; rendered QA must establish that. Keep inputs immutable during execution; no concurrent edits to approved inputs.

## Prefill and Hook boundaries

Explicit requests to suggest/prefill authorize nomination. Default manual selection remains supported. Read `prompts/hook-prefill.md` before nomination. Candidate count is not the final five-slot limit. Build the worktable with `build_worktable.py html ... --hook-origin ai-prefill` so export preserves provenance. Existing hook-prefill evidence also activates candidate checks even when an older worktable lacks this field. Selected quotes are revalidated against the current authoritative transcript; anchors must be resolved (`anchor_status: ok`).

The canonical worktable keys are `hooks` (`text`, `order`) and `visual_notes` (`marker`), matching this repo's worktable export. The guard also accepts `quote`/`id` aliases but rejects conflicting alias values. Explicitly migrate legacy `notes`/`slot`-only exports with a backup and compare every row; never treat unknown keys as empty notes. Candidate schema is documented in the prompt.

`cut_plan` contains `source_sha256`, `timeline_id`, `timing_timeline_id`, `timing_method` (`word-alignment` or `manual-audio`) and ordered `clips` (`quote`, `start`, `end`). `timing_evidence` records the same media SHA and ordered `clips`, each with boundaries and `boundary_listened: true` only after actual listening. Times refer to the exact media being cut. Never apply source→rough mapping to already-rough timestamps. The validator catches disagreement, not fabricated listening; QA A still checks exported audio/ASR and boundary playback.

## Visual plan contract

Plan fields: `timeline_id`, `duration` (body seconds), `note_responses` (`note_id`, `disposition`, `reason`), `shots`, and `coverage_exception` when needed. An all-A-roll decision still needs explicit note responses and an empty plan explanation, not a missing file.

Before formal H2, add `picture_lock` and `body_media` to the spec input bundle. Picture Lock JSON requires `status: pass`, the same `timeline_id`, and `media_sha256` of the exact body file. This changes the spec digest, so provisional prefill reviews cannot authorize production. The text-review runner includes media identity only, not binary video data.

Each QA A/B/Final report must bind its `video_sha256` to the matching `product_a`/`product_b`/`video` input. Updating a media file invalidates that QA, even if its status string still says pass.

Every shot: `id`, `note_ids`, `start`, `end`, `quote`, `purpose`, `visual_type` (`B-roll` or `图形与动效`), `source`, `motion`, `acceptance`, absolute body-second `cue_points` (`enter`, `reveal`, `hold`, `exit`), `recipe`, `quantitative` boolean. 未指定 is allowed during editing but not in a production shot.

`motion` describes which element moves, its starting/ending state, sequencing, easing and preserved demo parameters. One principal movement per shot; settled hold ≥1 second. Do not substitute a whole static card slide for an approved element-level transformation.

Recipe is either `{"mode":"card","name":"Gallery name","style":"style-key","adaptation":"preserved grammar and changes"}` or `{"mode":"custom|real-footage","reason":"why no card fits","implementation":"specific implementation/source"}`. All-custom plans still go through ShotCraft direction and independent review. Custom is not a loophole to skip the skill.

Quantitative bar example:

```json
{"domain":[0,100],"plot_width":400,"source":"quoted hypothetical comparison", "meaning":"ability score, illustrative not measured",
 "stages":[
   {"bars":[{"value":70,"label":"70","width":280},{"value":90,"label":"90","width":360}]},
   {"bars":[{"value":80,"label":"80","width":320},{"value":95,"label":"95","width":380}]}
 ]}
```

The renderer must use the SAME numeric source for labels and geometry; no hardcoded decorative widths. `chart` uses this schema. The current numeric validator supports zero-baseline linear bars only. For pie/line/log scales, extend the validator and regression fixtures before production; do not misclassify a quantitative visual as nonquantitative to bypass it. The reviewer checks classification and speech chronology too.

## Independent review and approvals

Specs: the bundled runner sends an explicit text packet to a fresh CLI session and saves provider response, session ID, exact input digest and transport receipt. It defaults to no Claude tools/MCP and an isolated cwd; Codex uses a fresh read-only session. Neither resumes the producing conversation. CLI missing/login/network/timeout/malformed response/non-pass → blocked. Never silently switch provider or self-approve. Sending a packet to a CLI sends its text to that configured provider; include only task-authorized material.

Use `--provider codex` when that is the available reviewer. For Mac Mini, first verify the named host, CLI/auth and allowed transfer scope. Sync a bounded review packet preserving relative paths and hashes, run the same checker/reviewer there, return receipts and verify hashes locally. No default SSH host or remote credential assumptions; remote setup is optional, not required when the MacBook has an authenticated CLI.

Both review types require `status`, `findings`, `reviewed_ids`, `checks` (`semantic`, `motion`, `timing`, `sources`, each status and evidence), `input_digest`, a different `reviewer_session`, and hashed `raw_response`. No unresolved findings or unverifiable checks may pass. Raw response must agree with the report. CLI transport receipts stay local; do not commit logs containing private project content.

Rendered review is deliberately NOT done by the text-only spec runner. Use an independent multimodal reviewer with actual final media, each shot's enter/reveal/hold/exit frames, approved plan, accurate card/demo, reference samples and numeric measurements. Record frame-number evidence. `frames` JSON binds `video_sha256` and `shots` keyed by ID, each phase a `{path,sha256,frame}`. Quantitative shots additionally require `measured_charts`, one measured chart per planned stage. Widths are normalized coordinates measured from the actual rendered frame, not copied from the plan; include the corresponding frame reference in each measurement. Each contains exactly one stage using the chart schema. The independent reviewer checks that the measurements describe the image. QA A/B/Final artifacts retain their existing requirements and must have `status: pass`.

The render review digest is `digest({spec: visual-spec digest, delivery: delivery-stage digest})` using the guard's canonical JSON helper. The reviewer records it; it is NOT an approval token. H1 digest is `digest({worktable: worktable file SHA256})`; H2 digest is the visual-spec stage digest emitted by check. Approval files `approvals/H1.json` and `approvals/H2.json` contain `actor: Park`, `decision: approved`, `input_digest`, exact `message` and source `message_ref`. Only record an actual user approval; no generator auto-approves. H1 binds selection/order; subsequent cut-boundary corrections need QA A, not automatic reapproval of the same wording. H2 binds all spec inputs, so any edit invalidates its review and approval. Final H3 still belongs to Park after delivery QA.

## Tool hooks: optional host integration

The production wrapper is portable across Codex and Claude. Do not ship a command-name regex as a security boundary: Python scripts, aliases and alternate tools can invoke FFmpeg without spelling its name in the tool call.

Claude supports synchronous `PreToolUse` hooks returning exit 2 to block a tool call ([official reference](https://code.claude.com/docs/en/hooks)). A host-owned integration can invoke the gate for a configured production action. It must identify the project and action explicitly, reject unknown production actions, and preserve read/edit/QA commands needed to fix failures. Do not globally block all Bash while waiting for H2. Hook installation and trust are host-specific; this repository does not silently alter global settings, and it does not claim a Claude hook also runs in Codex.

For enforceable deployment, use a host-owned action dispatcher/approval store outside the producer's write scope. Until configured, report the protection accurately as **guarded entrypoint + independent review**, not universal prevention of bypass.
