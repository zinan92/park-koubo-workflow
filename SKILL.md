---
name: ask-park-video
description: Route Park's talking-head video projects through the canonical 14-step workflow, resume from the next unverified step, coordinate Hook/Product A/Product B/final delivery, invoke video-shotcraft as the Step 11 visual director, and stop at the three normal human approval gates. Use when the user invokes $ask-park-video, says "ask park video", starts or resumes a talking-head edit, asks what the next video step is, or wants the workflow state inspected. Do not use for unrelated product promos, generic one-off video edits, or videos outside Park's talking-head workflow.
---

# Ask Park Video

Act as the top-level director and state router for one talking-head video project. Use Agent-native media, file, shell, browser, and editing capabilities; call specialized skills only at the stage assigned to them.

Read `VIDEO_WORKFLOW.md` completely before the first run in a project. Treat it as the canonical detailed workflow. Keep this file focused on routing, completion criteria, approvals, and the `video-shotcraft` boundary.

Load the versioned production presets instead of inventing project-local defaults:

- before Step 1, read `presets/media/park-talking-head-4x3-v1.json` and `presets/audio/park-voice-v1.json`;
- before generating or rendering captions, read `presets/captions/park-caption-4x3-v1.json` and `presets/captions/park-caption-layout-v1.json`.

Record all four preset IDs in `project.json`. Use another value only through a named, versioned project override. A 4:3 project without an override uses these defaults; a different aspect ratio blocks on a matching media and caption preset rather than triggering ad-hoc redesign.

## Entry contract

Accept any of:

- a project directory;
- a rough-cut video plus SRT;
- a request to start, continue, inspect, or finish an existing project.

On every invocation:

1. Locate the project root and inspect media, subtitles, selected preset IDs, `project.json`, `process-log.md`, and existing outputs.
2. Reconstruct state from artifacts. A status label without its required artifact is not evidence of completion.
3. Select the earliest step whose completion criterion is not satisfied.
4. Execute continuously until reaching a human gate, a real blocker, or final completion.
5. Persist the current step, evidence, decisions, and approvals before returning.

Never restart a passed step merely because a new Agent session began. Never skip a failed prerequisite to reach a later step.

## Five stages

| Stage | Canonical steps | Completion boundary |
| --- | --- | --- |
| A. Preparation | 1–4 | Inputs preserved; subtitle timing is reliable; `analysis/worktable.html` is in Park's hands |
| B. Hook and Product A | 5–9 | Approved Hook is rendered as Product A and passes QA A |
| C. Body and Visual Direction | 10–11 | Body is picture-locked; approved visual plan is rendered |
| D. Sound and Product B | 12–13 | Body audio, top-layer subtitles, render, and QA B pass |
| E. Final Delivery | 14 | Product A and Product B are concatenated and QA Final passes |

These stages group the existing steps; they do not renumber or replace the 14-step workflow.

## Step 4 worktable

Preparation does not end at "subtitles are usable." It ends when Park has a worktable to work on.

Correct the transcript for punctuation and typos only — never add, drop, reorder, or polish — then align that corrected text back onto the SRT timing rather than assuming the two still match:

```bash
python3 scripts/build_worktable.py map --srt subtitles/source.srt \
  --text subtitles/transcript.corrected.txt --project <name> \
  -o subtitles/transcript.sentences.json
python3 scripts/build_worktable.py html subtitles/transcript.sentences.json \
  -o analysis/worktable.html
```

`map` refuses to emit anything when the corrected text drifted past ±max(3, 0.5%) non-punctuation characters or below 0.95 similarity. A guard failure means the correction pass invented words Park did not say, which would propagate into every Hook quote downstream. Fix the correction. `--force` is not an agent's call: raise it as an exceptional blocker, get Park's explicit approval, and record who approved which discrepancy in `process-log.md`.

In the worktable Park picks Hooks (up to 5, an upper bound rather than a quota) and writes plain-language visual notes anchored to numbered markers in the transcript. Export lands in the browser's download folder; copy it to `analysis/worktable.json` and confirm the path with Park before Step 5. Every time in it is `start_hint`/`end_hint` — interpolated inside SRT cue blocks, positional only, never a cut point.

## Three normal human gates

Stop only at these normal approval gates. Present the exact artifact under review and one clear decision request.

A gate becomes current only when its review artifact exists. Until then, continue automatically inside the same canonical step. Always report the canonical Step number separately; H1/H2/H3 never replace Step 5/11/14.

### H1 — Hook Approval at Step 5

Park selects Hooks himself in the worktable; do not nominate over him. Read `hooks` from `analysis/worktable.json` in `order`, verify each quote against the transcript, convert each `anchor` into candidate cut points, and flag anything word-incomplete or judgment-without-subject. Resolve every `anchor_status: stale`/`unmatched` entry with Park first, and read `match: "fuzzy"` quotes back for confirmation. Derive `analysis/hook-candidates.json` from the worktable rather than authoring a second truth. Fall back to AI nomination only when Park left the worktable empty, noting why in `process-log.md`. Wait for approval of sentences and order before Step 7 extraction.

Freeze the Product A/B shared media, audio, caption-style, and caption-layout preset IDs at this gate. This approves the Hook decision; it does not invite a new caption design unless the user explicitly requests an override.

### H2 — Visual Spec Approval inside Step 11

Park's `visual_notes` are required input, not inspiration. Give every note a `disposition` of 采纳/调整/拒绝 in `visual-plan.json`, with a `disposition_reason` for the latter two, and show note number, Park's own wording, and disposition as rows in the spec table so H2 reveals exactly what was overridden. Decide freely wherever Park left no note.

After Picture Lock, generate `visual-plan.json` and a readable spec table. Show the table, planned coverage, source/provenance, and any exceptions. Wait for approval before rendering any production visual layer. Freeze the approved snapshot; record later changes in `changes.md`.

### H3 — Final Approval after Step 14

After QA Final passes, present the final video, duration/spec summary, QA result, and known limitations. Wait for the user to accept the deliverable.

Normal routing does not request approval between these gates. A missing credential, inaccessible source, destructive scope change, or proposed deletion of a shooting/production instruction is an exceptional blocker, not a fourth routine gate.

## Step 11: Video ShotCraft adapter

Enter this adapter only when Step 10 Picture Lock has passed. Do not use it on Product A Hook.

Use `video-shotcraft` as the visual director for the complete Product B visual track. It chooses among:

- face-only A-roll;
- the creator's real B-roll;
- sourced B-roll;
- screenshots or screen recordings;
- charts or Illustration;
- transparent overlays;
- full-screen Remotion or HyperFrames animation.

The parent workflow owns editorial structure, subtitles, audio, and final assembly. Under this adapter, collapse Video ShotCraft's internal creative approvals into the single H2 spec-table gate. Do not let its standalone product-promo workflow add extra approval rounds or take ownership of Hook, BGM/SFX, captions, or concatenate.

### Planning output

Make `part-b-body/visual-plan.json` the executable visual truth. For each shot include:

- `id`, `start`, `end`, and matching transcript;
- `source_note` plus `disposition` and `disposition_reason` when the shot answers a worktable note;
- communication purpose and `visual_type`;
- treatment plus asset/source/provenance;
- `cue_points.enter`, `reveal`, `hold`, and `exit`;
- implementation recipe/tool reference;
- approval and change status.

Generate the human-readable spec table from `visual-plan.json`; never maintain it as a second independent truth.

### Coverage contract

Compute coverage over Product B only:

```text
visual_coverage = union(duration of approved B-roll, screenshots,
                        charts, Illustration, overlays, and animation)
                  / Product B duration
```

Count overlapping visuals once. Exclude Product A Hook, face-only A-roll, captions, BGM, and SFX. Target 30%–40% by default. Treat it as a planning target, not permission to add filler: plans outside the range must explain why in the spec table and receive H2 approval.

Prioritize the creator's real assets. For external B-roll, record the source, mute its original audio, and do not use it to prove more than the footage shows.

### Visual QA

For every rendered shot, inspect frames at enter, reveal, hold, and exit. Then verify:

- the visual clarifies, demonstrates, or resets attention rather than decorating speech;
- reveal timing matches the spoken claim;
- text and graphics remain legible and correctly framed;
- transitions do not produce black frames or continuity breaks;
- every rendered visual was approved or appears in `changes.md`;
- measured coverage and exceptions match the approved spec.

If `video-shotcraft` is unavailable, pause at Step 11 with the installation requirement. Do not silently substitute a different visual system.

## Fourteen-step router

Use the completion criteria below to select the next step; consult `VIDEO_WORKFLOW.md` for full execution detail.

| Step | Route action | Required completion evidence |
| ---: | --- | --- |
| 1 | Create project contract | Valid `project.json` with Product A/B/Final targets and four preset IDs |
| 2 | Preserve source material | Inputs inventoried and untouched copies identified |
| 3 | Inspect media and subtitle state | Specs plus hard-subtitle finding recorded |
| 4 | Validate/align subtitles, then build the worktable | Usable `subtitles/source.srt`; `subtitles/transcript.sentences.json` passing the content guard; `analysis/worktable.html` handed to Park |
| 5 | Read Park's Hook picks from `analysis/worktable.json` | Worktable JSON copied into `analysis/`; H1 approval recorded |
| 6 | Build Content Map | Complete body map with visual/audio opportunities |
| 7 | Extract Hook clips (worktable hints are search windows, not cut points) | Each clip is word-complete and boundary-checked by listening |
| 8 | Assemble Hook data | Approved order plus Product A subtitle data |
| 9 | Render Product A | Preset-rendered captions, `part-a-hook/video.mp4`, and passing QA A |
| 10 | Accept rough cut / Picture Lock | `clean-master.mp4` and `edit.json` |
| 11 | Plan and render visual track, answering every `visual_notes` entry | H2-approved `visual-plan.json` with a `disposition` per note, spec snapshot, and passing visual QA |
| 12 | Build sound track | Audio preset applied; optional BGM/SFX overrides recorded in `audio-plan.json` |
| 13 | Render Product B | Same preset-rendered top-layer captions, `part-b-body/video.mp4`, and passing QA B |
| 14 | Concatenate and deliver | `final/video.mp4`, passing QA Final, then H3 approval |

## State record

Maintain at least this state in `project.json` or an equivalent existing structure:

```json
{
  "workflow": "ask-park-video/v1",
  "current_step": 1,
  "current_gate": null,
  "presets": {
    "media": "park-talking-head-4x3-v1",
    "audio": "park-voice-v1",
    "caption_style": "park-caption-4x3-v1",
    "caption_layout": "park-caption-layout-v1"
  },
  "step_status": {},
  "approvals": {
    "hook": null,
    "visual_spec": null,
    "final": null
  },
  "evidence": {},
  "blocked_reason": null
}
```

Use `pending`, `in_progress`, `blocked`, `approved`, `pass`, or `skipped` consistently. Record artifact paths and timestamps with every `pass` or approval.

## Response contract

While running, report only the current stage, canonical Step number, current Gate if active, completed evidence, and next action. At a gate, lead with the artifact and decision required. At completion, lead with the final video path/link and the three QA results.
