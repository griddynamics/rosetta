# tutorial

A user-invoked practice run: the learner picks a Rosetta flow and a real task from their repo, and the coach runs that flow in simulation, stopping at each point where the real flow would wait on them and critiquing their reply. Read-only end to end.

## Why it exists

"Teach me the coding flow" normally gets one of two bad answers: a wall of paraphrased workflow prose, or an eager model that runs the real flow to "demonstrate" it and mutates the repo. This skill makes learning practice on the learner's own code: the flow runs, artifacts name real files, gates stop exactly where the flow stops, and nothing is written. The learner practises driving the flow (what to send, what to check, what to approve), not its internals. The lesson is built from the flow file read in this session, not from what the model remembers a flow to be.

## When to engage

`disable-model-invocation: true` — runs only on the user's explicit `/tutorial`; the model never self-triggers it or reaches it via `USE SKILL`. No subagent is involved and none may be spawned. Trigger: the user wants to learn init, coding, or testing flows by doing. Inputs: which flow (asked when not named) and a real task from the repo. Activation is session-wide: every later request is handled as a tutorial turn.

## How it works

`SKILL.md` `<process>`: introduce in 1-2 sentences → record a `git status --porcelain --ignored` + `git diff --stat` baseline → take or ask for the flow → ask for a real task in that flow's scope → `READ FLOW` the flow and the phase files that own gate wording → size the task as the flow does and keep only the stops that apply → brief in ≤6 sentences → read the matching script for calibration and the code the task touches → run stop to stop, one stop per turn → critique each reply → recap and offer another flow.

`<gate_types>` defines what each stop waits for: `request`, `answers`, `approval`, `selection`, `file`, `evidence`, `report`. Exact approval wording is required only where the flow or its phase file prescribes it; otherwise any explicit approval per `hitl` counts. A `report` stop is a coaching stop where the flow itself does not wait.

Scripts in `references/` are `<sim_script flow="...">` files. Each `<stop>` carries `id`, `phase` (the flow's phase tag), `gate`, `applies` (the flow's condition) and `waits_on`, then Narrate / Emit / Stop / Defect lines and Good / Wrong / Carry cues.

| Flow | Script |
|---|---|
| `init-workspace-flow` | `tut-init-workspace.md` |
| `coding-flow` | `tut-coding.md` |
| `aqa-flow` | `tut-aqa.md` — routing only; the target flow's script continues |
| `ui-aqa-flow` | `tut-ui-aqa.md` |
| `api-aqa-flow` | `tut-api-aqa.md` |
| `testgen-flow` | `tut-testgen.md` |

## Mental hooks & unexpected rules

- "The user's `/tutorial` is the explicit instruction that governs this whole session: READ-ONLY ... NO OVERRIDE." — framed as the user's own instruction so it sits above skills in bootstrap priority; a later "now do it for real" is sent to a new session.
- "Teaching sources ... win, silently correct the script." — scripts are calibration, so a drifted script cannot teach a phase that no longer exists.
- "Wait for what the flow waits for, nothing stricter." — no invented verbatim sentences, no rejecting an input form the flow accepts.
- "Simulation, not quiz" — the learner never describes the flow; they drive it.
- "Plant exactly one realistic defect per artifact ... always disclosed." — teaches review by giving something real to catch.
- "never invent a positive, none found → say so" — overrides the default habit of opening feedback with praise.

## Invariants — do not change

- `name: tutorial` equals the folder name; registered in `docs/definitions/skills.md`.
- `disable-model-invocation: true` stays; it also licenses the plain user-friendly `description`.
- The session lock: read-only, no real `USE FLOW` / `APPLY PHASE` / `INVOKE SUBAGENT` / `USE SKILL`, binding on every turn.
- The baseline in process step 2 and the matching validation check.
- One stop per turn, then silence until the user replies.
- Critique order: right, missing/wrong, why, what to do instead.
- The resources table matches the `references/tut-*.md` filenames, and every script uses the stop attributes above.
- The flow files being taught are read-only teaching sources; this skill never edits them.

## Editing guide

Safe to edit: intro and recap wording, brief and critique tone, Narrate / Emit / Defect text and Good / Wrong cues inside scripts. Handle with care: the session lock and validation checklist (loosening reopens the "model runs the flow for real" risk), the stop-and-wait step, the gate types, and the sources-win rule. A flow change usually needs no script edit, since sources win; update the script when a gate, its wording, or its accepted inputs change. A new flow gets its own `references/tut-<flow>.md`, a resources row, and a menu option in process step 3. Every cue must stay traceable to the flow or phase file it teaches.
