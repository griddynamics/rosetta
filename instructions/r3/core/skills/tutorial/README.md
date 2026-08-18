# tutorial

A scripted practice game that teaches `init-workspace-flow`, `coding-agents-prompting-flow`, and `aqa-flow` by simulation — tasks, typed replies, graded feedback — with zero real tool calls or repo changes.

## Why it exists

New users learn workflows fastest by doing, not by reading a workflow file cold. Without this skill, "teach me the coding workflow" either dumps a wall of prose on the user or — worse — an eager model actually invokes the real workflow to "demonstrate" it, mutating the repo. This skill exists to give a safe sandbox: real phase names and gates, fictional scenario/state, hard-gated on the user actually typing something before feedback appears.

## When to engage

Frontmatter: `disable-model-invocation: true` — the model must never self-trigger this; it runs only on explicit `/tutorial`. Description is plain user-friendly prose (schema's stated exception for this flag), front-loaded so the first 5 words carry the benefit before UI truncation. No prerequisites beyond the standard Rosetta prep steps.

## How it works

`SKILL.md` holds the game loop: welcome → free-pick module menu (3 modules + exit, no forced order) → 1-3 sentence "what this workflow is for" explainer → `APPLY SKILL FILE` the matching `references/tut-*.md` → per checkpoint: scenario → task → hard stop and wait for the user's reply → semantic judgment against a bundled rubric → feedback naming one right and one wrong/missing thing → recap → back to menu. Each reference file (`tut-init-workspace.md`, `tut-coding-agents-prompting.md`, `tut-aqa.md`) holds one module's "what it's for" blurb plus 3 checkpoints, each tied to a real phase/step name from the workflow it teaches.

## Mental hooks & unexpected rules

- "STOP, output nothing else, wait for the user's next message" — the core anti-cheat gate; without it the model would grade its own imagined reply instead of a real one.
- "Real workflow/phase/subagent/skill names appear only as inert nouns in backticks... never as an invocation" — the line that keeps this a teaching tool instead of an accidental live run.
- Rubrics are "good-if / wrong-if cues," judged semantically — an exact-string match would fail nearly every valid paraphrase a learner types.
- No forced module sequence — a resolved open question from issue discussion; users may jump straight to `aqa` without doing `init` first.
- Recap has no side effects — no file is written, no state persists across modules; the game is stateless by design.

## Invariants — do not change

- Frontmatter `name: tutorial` must equal the folder name; registered at `docs/definitions/skills.md`.
- `disable-model-invocation: true` must stay — this is a user-invoked-only game, never auto-triggered.
- The safety contract's forbidden-tool list (Bash/Edit/Write/NotebookEdit/Agent) and forbidden-alias list (real `USE FLOW`/`APPLY PHASE`/`INVOKE SUBAGENT`/`USE SKILL`) must not shrink.
- The three `APPLY SKILL FILE references/tut-*.md` pointers must track the actual reference filenames.
- Each checkpoint's rubric must name at least one good-if and one wrong-if cue — the acceptance criterion for "graded feedback."
- `init-workspace-flow.md`, `coding-agents-prompting-flow.md`, `aqa-flow.md` are read-only teaching sources — this skill never edits them, only paraphrases public phase/step names.

## Editing guide

Safe to edit: scenario wording, task phrasing, feedback tone, the welcome/recap copy. Handle with care: rubric good-if/wrong-if cues (must stay traceable to the real workflow's actual phase name — verify against the source workflow file before changing), the safety contract (any loosening reopens the "model executes for real" risk), and the module menu's 3-entries-plus-exit shape (adding a module means adding both a menu line and a `references/tut-*.md` file). New workflows to teach get their own `references/tut-<name>.md` file, not more checkpoints crammed into an existing one.
