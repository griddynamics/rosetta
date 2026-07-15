# debugging

Forces root-cause-before-fix methodology on any error, test failure, or unexpected behavior.

## Why it exists

Without this skill a model under time pressure patches the symptom it can see — silences the error, adds a null check, retries the flaky call — and reports success once the visible failure stops, without ever confirming why the failure happened. It would also stack multiple speculative fixes at once, making it impossible to tell which change (if any) actually helped, and would treat a persistent multi-fix failure as "try again" rather than as a signal that the design itself is wrong. The skill blocks all of that: no fix may be proposed before a root cause is confirmed with evidence (`root_cause_investigation` phase 1), only one hypothesis is tested at a time (`hypothesis_and_testing` phase 3), and three failed fixes force a stop to question the architecture (`implementation` phase 4, point 4).

## When to engage

Triggers: errors, test failures, unexpected behavior, or a previous fix that didn't hold. Actor: `engineer` subagent (`agents/engineer.md` `skills_available` lists `USE SKILL debugging`), invoked by `coding-flow`'s phase-0 prerequisites item 5 ("When debugging is needed, INVOKE SUBAGENT `engineer` with `debugging` skill to save LLM context") and recommended in most of its later phases. Also referenced from `testing` and `coding` skills as the fallback for failures/issues encountered mid-task. `disable-model-invocation: false` and `user-invocable: true`, so it can also auto-activate or be called directly as `/debugging`. Prerequisite before entering the skill: Rosetta prep steps fully completed and `load-project-context` executed.

## How it works

Single-file skill (`SKILL.md`), no `assets/` or `references/`. Four sequential phases plus supporting sections:

- `core_concepts` — non-negotiables (root cause before fix, make assumptions explicit, sequential phases) and the fixed per-issue output shape (OODA, root cause + evidence, fix, testing approach, prevention).
- `root_cause_investigation` (phase 1) — read traces fully, reproduce, check recent changes, add boundary logging in multi-component systems, trace data backward to the source, diagram concurrent flows, use temporary tracing then remove it.
- `pattern_analysis` (phase 2) — diff working vs broken code; read referenced patterns completely.
- `hypothesis_and_testing` (phase 3) — one hypothesis, one minimal test, no stacking.
- `implementation` (phase 4) — failing test first, single root-cause fix, verify, and the 3-strikes architecture-question escalation.
- `validation_checklist`, `best_practices`, `pitfalls` — closing gates and named anti-patterns.

## Mental hooks & unexpected rules

- `"symptom fixes are failure"` (`core_concepts`) — reframes a working-but-unexplained fix as a failed outcome, not a partial win.
- `"run once to find WHERE it breaks before fixing anything"` (phase 1, point 4) — blocks the instinct to fix the first suspicious line found while adding logging.
- `"If it fails, form a new hypothesis — don't stack fixes"` (phase 3, point 3) — explicitly forbids layering a second fix on top of an unconfirmed first one.
- `"If 3+ fixes have failed: stop fixing and question the architecture — this likely isn't a bug, it's a design problem. Is third-party involved? Discuss before continuing."` (phase 4, point 4) — converts a specific failure count into a mandatory escalation, overriding the default "just keep trying" behavior.
- `"Each fix reveals a new problem elsewhere — likely a design issue, not a bug"` (`pitfalls`) — names whack-a-mole fixing as a design smell, not bad luck.

## Invariants — do not change

- `name: debugging` must equal the folder name and the entry in `docs/definitions/skills.md` (line 29 lists `- debugging`).
- `description` is the ≤~25-token auto-activation string; it is always in context and currently reads "To investigate errors, test failures, and unexpected behavior — root cause before fix." — keep dense and keyword-bearing if edited.
- `disable-model-invocation: false` and `user-invocable: true` — both auto-activation and `/debugging` direct invocation are relied on by `coding-flow` and `engineer.md`.
- The literal phrase `Rosetta prep steps` in `core_concepts` is the canonical bootstrap-completion marker used verbatim across the repo; do not reword.
- XML section names (`role`, `when_to_use_skill`, `core_concepts`, `root_cause_investigation`, `pattern_analysis`, `hypothesis_and_testing`, `implementation`, `validation_checklist`, `best_practices`, `pitfalls`) and the `phase="N"` attributes are structural markers other files may assume when referring to "phase 1" etc.; the outer `<debugging>` tag must match `name`.
- Inbound couplings (`grep -rn "debugging" instructions/r3/core --include="*.md"`): `agents/engineer.md` (`skills_available` entry, process step 2), `workflows/coding-flow.md` (phase-0 prerequisites item 5, plus per-phase "Recommended skills" lists), `workflows/self-help-flow.md` (examples of when NOT to invoke `/debugging` directly — routes through `coding-flow` instead), `skills/testing/SKILL.md` and `skills/coding/SKILL.md` (fallback pointer for failures/issues), `docs/definitions/skills.md` (registry entry). All other hits are the generic English word "debugging" (Solr query/schema/semantic-search skills, GitHub Copilot config) and are unrelated to this skill.

## Editing guide

Safe to edit: wording inside each phase's numbered steps, `best_practices`, `pitfalls`, as long as the phase order and the 3-fix escalation rule survive. Handle with care: `name`, `description`, the `when_to_use_skill` trigger list (routing depends on it), the `Rosetta prep steps` phrase, and the phase attributes/order (callers reference "phase 1/3/4" behavior, e.g. the 3-fix rule in phase 4). New investigation techniques belong as new numbered points in `root_cause_investigation` or a new `assets/`/`references/` file if they grow beyond a few lines — none exist yet, so adding one is a structural change worth flagging to reviewers. Referenced by: `agents/engineer.md`, `workflows/coding-flow.md`, `workflows/self-help-flow.md`, `skills/testing/SKILL.md`, `skills/coding/SKILL.md`.
