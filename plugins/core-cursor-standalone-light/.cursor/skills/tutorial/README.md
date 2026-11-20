# tutorial

A user-invoked practice game: the learner picks a Rosetta flow, the coach reads that flow file, then teaches it as 3-5 decision tasks with graded feedback — simulated end to end, zero real invocations or writes.

## Why it exists

"Teach me the coding flow" normally gets one of two bad answers: a wall of paraphrased workflow prose, or an eager model that runs the real flow to "demonstrate" it and mutates the repo. This skill makes learning practice instead — made-up scenario, one decision per turn, feedback tied to the flow's real phases and gates — and locks the session read-only so the demonstration can never become a run. Over plain model judgment it adds the grounding step: the lesson is built from the flow file read in this session, not from what the model remembers a flow to be.

## When to engage

`disable-model-invocation: true` — runs only on the user's explicit `/tutorial`; the model can never self-trigger it or reach it via `USE SKILL`. Actor: whoever the user is talking to; no subagent is involved and none may be spawned. Trigger: the user wants to learn a Rosetta flow — init, coding, or testing — by doing rather than reading. Only input is which flow; the skill asks conversationally when the user didn't name one. Activation is session-wide: from that point every request in the session, off-topic ones included, is handled as a tutorial turn.

## How it works

The process section of `SKILL.md` is the whole loop: say in 1-2 sentences what this is → take the flow the user named, else offer init / coding / testing (testing branches to the `aqa-flow` router or straight into `ui-aqa-flow`, `api-aqa-flow`, `testgen-flow`) → `READ FLOW <selected>.md` and extract purpose, phase sequence, HITL gates with their exact approval sentences, per-phase artifacts, delegated subagents, pitfalls → brief the learner in ≤6 sentences (what the flow is for · when not to reach for it · which gates stop for them and what they must approve) → read the matching sample set for calibration, then compose 3-5 own tasks ordered as the flow runs → present one task, stop, wait for the reply → evaluate, re-task on a point that didn't land → recap in 2-3 sentences, name the weakest area, offer another flow.

Sample-set routing — read for shape and calibration, then write fresh tasks:

- `references/tut-init-workspace.md` → `init-workspace-flow`
- `references/tut-coding.md` → `coding-flow`
- `references/tut-aqa.md` → `aqa-flow`
- `references/tut-ui-aqa.md` → `ui-aqa-flow`
- `references/tut-api-aqa.md` → `api-aqa-flow`
- `references/tut-testgen.md` → `testgen-flow`

Each set carries 2-3 tasks shaped as Scenario + Task + Rubric, the rubric listing good-if and wrong-or-missing-if cues, each task tied to a real point where that flow waits on the user.

## Mental hooks & unexpected rules

- "Activation locks the whole session: READ-ONLY, simulation only, NO OVERRIDE." — one sentence removes the executor's entire write surface, so no later turn can argue its way into a real run.
- "Samples may be stale — on conflict the flow file wins, silently correct the sample." — makes bundled samples calibration rather than content, and keeps a drifted sample from teaching a phase that no longer exists.
- "Present one task, then STOP, output nothing further, wait for the user's next message." — the game's only gate; without it the model grades a reply it imagined.
- "the learner leaves knowing how to *use* the flow, what is the best way to do it BUT not how it works inside" — pushes every task toward a decision the user would actually face, away from internals.
- "never invent a positive, none found → say so" — overrides the default habit of opening feedback with praise.
- "Every request in this session is handled as a tutorial request." — off-topic input gets named as such, deferred to a new session, and the current task re-presented; it is never answered normally.
- "Off-topic or unreadable reply → say so plainly, restate the task once, never guess an interpretation." — no salvaging a reply by inventing what the learner probably meant.

## Invariants — do not change

- `name: tutorial` must equal the folder name; the name is registered in `docs/definitions/skills.md`.
- `disable-model-invocation: true` stays — user-invoked only, and per the skill schema it is also what licenses the plain user-friendly `description` instead of the keyword-dense trigger form.
- The `READ FLOW` step before any teaching: every phase, gate, and artifact named must trace to a line of the flow file read in this session.
- One task per turn then silence, and no `USE FLOW` / no `APPLY PHASE` / no subagent — binding on every turn of the session, tutorial and off-topic alike.
- The resources list must match the actual `references/tut-*.md` filenames and each entry must name the flow it calibrates.
- The evaluation order — right, then missing/wrong, then why, then what to do instead — is the feedback contract the sample rubrics are written against.
- The flow files being taught are read-only teaching sources; this skill never edits them.

## Editing guide

Safe to edit: opening and recap wording, brief and feedback tone, the starter topic list in the task-design section, scenario and task text inside the sample sets. Handle with care: the session lock and the validation checklist (any loosening reopens the "model runs the flow for real" risk), the stop-and-wait step, and the flow-file-wins precedence — the rule that makes stale samples harmless. A new flow to teach gets its own `references/tut-<flow>.md` sample set plus a resources entry and a menu option in the flow-selection step, never extra tasks crammed into an existing set. Rubric cues must stay recognizable in the target flow file — verify against it before rewriting one.
