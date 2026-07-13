# self-learning

On failure or mismatch, forces a hard stop and root-cause analysis before any fix, then converts the root cause into a generalized rule persisted in agent memory instead of a one-off patch.

## Why it exists

Without this skill a capable model reacts to failure by patching the visible symptom, trying "one more thing," or replanning immediately — never pausing to establish the actual root cause, and never writing anything durable down. Any lesson learned dies with the session. The skill forces stop-before-fix, root-cause-before-replan, explicit user confirmation before continuing, and mandates persisting the generalized rule to `agents/MEMORY.md` rather than an incident-specific note.

## When to engage

Trigger set (frontmatter `description`, since no `<when_to_use_skill>` block exists): execution failure/error, mistake, wrong/unexpected result, expected≠actual mismatch, 2 consecutive mismatches, unhappy/upset user, user asks why something failed/didn't work. `<process>` adds: 3+ errors in quick succession, retrying the same approach without progress, drift from agreed plan/scope, large change without full understanding. Actor: all agents — `rules/bootstrap-alwayson.mdc`'s `skill_engagement_rules` names it on the all-agents line ("USE SKILL `sensitive-data`, `dangerous-actions`, `deviation`, `self-learning`, `self-organization`"), so orchestrator and subagents alike must engage it, not just the top agent. No prep-steps gate — unlike most skills there is no "Rosetta prep steps MUST be FULLY completed" line, since it must fire mid-task rather than at a clean start (intent not documented). Relationship to `agents/MEMORY.md`: bootstrap-alwayson's `core_rosetta_files` names that file as the place for "root causes, what worked and failed" — this skill's memory steps (6-10) are what write into it.

## How it works

Single flat `SKILL.md`, no `assets/` or `references/` subfolders. Root `<self_learning>` wraps two sections: `<process>` — 11 numbered steps, first half (1-5) stop/root-cause/ask/state/wait, second half (6-11, headed "Memory:") consult `AGENT MEMORY.md` → init if missing → convert root cause into a generalized reusable rule → store → record what worked/failed → recommend `post-mortem` — and `<pitfalls>` (6 anti-patterns). Actor: whichever agent hits the failure; escalates to the user for confirmation, and to the user-invoked `post-mortem` skill for full harness diagnosis if the user chooses to run it.

## Mental hooks & unexpected rules

- `STOP all changes immediately. NO "one more try".` — blocks the reflex retry before any diagnosis happens.
- `prefer agent memory over task memory` — two memory tiers exist; this skill defaults to the durable one, not the per-task one.
- `Convert root causes into GENERALIZED, REUSABLE preventive rules — not incident-specific notes.` — the deliverable is a rule, not a log entry.
- `RECOMMEND user USE SKILL \`post-mortem\` ... recommendation is required, NEVER run it yourself.` — must always surface the recommendation but is barred from auto-invoking it.
- Pitfall `Auto-invoking \`post-mortem\` instead of recommending it to the user.` — names the exact violation of that handoff.
- Pitfall `Apologizing excessively instead of regrouping efficiently.` — flags a social failure mode, not just a technical one, as equally wrong.

## Invariants — do not change

- Frontmatter `name: self-learning` must equal the folder name and match `docs/definitions/skills.md` (registered alongside `deviation`, `self-organization`, `post-mortem`, `sensitive-data`, `hitl`).
- `description` is the sole engagement trigger (no `<when_to_use_skill>` block) — must stay dense/keyword-form per the `docs/schemas/skill.md` budget (~25 tokens); do not pad with prose.
- `disable-model-invocation: false` and `user-invocable: false` must stay — the skill fires proactively on failure/mismatch and stays hidden from the `/` menu (background reflex, not a user-run command).
- Step 11's `post-mortem` reference depends on that skill keeping `disable-model-invocation: true` / `user-invocable: true` (verified in `post-mortem/SKILL.md`) — self-learning may only recommend it, never invoke it; a flag or name change there requires re-verifying step 11's wording.
- Inbound couplings, verified via `grep -rn "self-learning" instructions/r3/core --include="*.md"`: `rules/bootstrap-alwayson.mdc:72` (all-agents `skill_engagement_rules` list — the actual engagement trigger); `commands/adhoc-flow.md:110` ("Use self-learning" best-practice bullet); `skills/orchestration/assets/o-team-manager.md:37` ("Root-cause every failure into a reusable preventive rule (SKILL `self-learning`; agent memory > task memory)"); `skills/post-mortem/README.md` (documents the step-11 recommend-only coupling from both sides). `skills/coding-agents-prompt-authoring/references/pa-patterns.md:49,62` uses an unrelated `<memory-self-learning>` XML tag — not a coupling to this skill, do not treat as an inbound reference.

## Editing guide

Safe to edit: wording of `<pitfalls>`, phrasing within either step half, as long as step order is preserved (stop → root-cause → ask → state → wait, then consult memory → init → generalize → store → record → recommend post-mortem last). Handle with care: the `post-mortem` reference in step 11 (coupled to that skill's invocation flags), the `disable-model-invocation`/`user-invocable` flags, and the `description` (sole trigger, no `<when_to_use_skill>` fallback). New content belongs in `<process>` as a new numbered step (keep "recommend post-mortem" last) or in `<pitfalls>`. Referenced by: `rules/bootstrap-alwayson.mdc` (all-agents list), `skills/orchestration/assets/o-team-manager.md`, `commands/adhoc-flow.md`, `skills/post-mortem/README.md`.
