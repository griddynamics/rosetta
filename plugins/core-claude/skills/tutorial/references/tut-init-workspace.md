<module_init_workspace>

<what_its_for>

`init-workspace-flow` onboards or upgrades a target repo: detects install/upgrade/plugin mode, generates shell files (skills/agents/workflows), analyzes tech stack, extracts patterns, writes `CONTEXT.md`/`ARCHITECTURE.md`/etc, asks reflective gap-filling questions, then verifies everything exists. It's the first thing a new repo runs, once.

</what_its_for>

<checkpoint id="1" phase-tie="context (phase 1), shells (phase 2)">

Scenario: a teammate opens a brand-new repo with no `docs/` folder and no prior Rosetta files, and types a plain request to get started.
Task: type the one line you'd send to kick off onboarding for this repo.

Rubric:
- Good if: mentions `/init-workspace-flow` (or clearly invokes the workflow by name) and doesn't hand-author `CONTEXT.md`/`ARCHITECTURE.md` manually first.
- Good if: doesn't try to skip straight to `/coding-flow` before onboarding exists.
- Wrong/missing if: assumes shells phase 2 must be skipped (it only skips when already running as a plugin — this repo has no plugin yet, so shells phase runs).
- Wrong/missing if: tries to manually create `agents/init-workspace-flow-state.md` themselves instead of letting the workflow own it.

</checkpoint>

<checkpoint id="2" phase-tie="discovery (phase 3), patterns (phase 5)">

Scenario: the workflow just finished analyzing the repo and reports `state.file_count = 140`.
Task: name what changes for the remaining phases because of that number, and what phase 5 is supposed to produce.

Rubric:
- Good if: recognizes `file_count >= 100` means Phase 5/7/8 subagents get told to `USE SKILL large-workspace-handling`.
- Good if: names phase 5's output as a `PATTERNS` folder (one `.md` per pattern, `INDEX.md`, `CHANGES.md`), not raw code dumps.
- Wrong/missing if: thinks discovery (phase 3) writes `CONTEXT.md`/`ARCHITECTURE.md` — those are phase 7 (documentation), not phase 3 (which produces `TECHSTACK.md`, `CODEMAP.md`, `DEPENDENCIES.md`).
- Wrong/missing if: forgets phase 4 (rules) is permanently disabled — it should not be expected to run.

</checkpoint>

<checkpoint id="3" phase-tie="questions (phase 8), verification (phase 9)">

Scenario: documentation (phase 7) is done but phase 8 surfaces a gap — no reviewer knows whether the repo uses a monorepo or composite layout.
Task: describe what phase 8 must do about that gap, and what "done" looks like for phase 9.

Rubric:
- Good if: says phase 8 asks the user a reflective question AND updates the affected file(s) — collecting the answer without writing it back is incomplete (a documented pitfall of this workflow).
- Good if: phase 9 is a completeness check — verifies files exist, runs the validation checklist, suggests next steps, marks state COMPLETE.
- Wrong/missing if: treats phase 8 as optional or skippable because "the docs already look okay."
- Wrong/missing if: forgets the user must start a new chat session afterward for new shells/rules to take effect.

</checkpoint>

</module_init_workspace>
