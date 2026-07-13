# self-organization

Forces proactive planning, large-file/scope restructuring, context-threshold warnings, and stale-content cleanup instead of letting them happen reactively or not at all.

## Why it exists

Without this skill a capable model plans reactively: it keeps working inside a growing context, only splitting a session or restructuring a file after something breaks or the context is already overloaded, and it silently accumulates stale/outdated/redundant content instead of flagging it for cleanup. It also tends to restructure files, split scope, or start a new session without telling the user first. The skill front-loads restructuring and cleanup into the plan itself, adds hard numeric thresholds for warning the user about context consumption, and requires announcing self-organization moves in advance rather than executing them silently.

## When to engage

No `<when_to_use_skill>` block — this skill has no `<role>`, `<core_concepts>`, `<validation_checklist>`, `<pitfalls>`, or `<resources>` either, only a `<process>`. Engagement is driven by the frontmatter `description`'s MUST-activate conditions plus `rules/bootstrap-alwayson.md`'s all-agents `skill_engagement_rules` line: `"All agents: USE SKILL \`sensitive-data\`, \`dangerous-actions\`, \`deviation\`, \`self-learning\`, \`self-organization\`."` — it applies to every agent type (orchestrator and subagents), not just the orchestrator. Per the description: MUST activate at 65%+ context usage, 2h / 15+ file / 350+ line scope, or large-file restructuring. No prerequisite gate is stated (no "Rosetta prep steps MUST be FULLY completed" line, unlike most skills).

## How it works

Single flat `SKILL.md`, no `assets/` or `references/` subfolders. Root `<self_organization>` wraps one `<process>` section of 7 numbered steps (compressed from 11 grouped steps, 2026-07-11): 1 plan proactively as todo tasks (echo of the always-on `<tasks>` ledger), 2 explicit plan items for large-file restructuring + stale-content cleanup, 3 the two literal warning strings at 65% and 75% context (percentages only — absolute token counts dropped 2026-07-11, models now reach 1M context), 4 scope reduction over 2h/15+files/350+lines (user may override), 5 ~2 pages per review pass + TLDR hooks, 6 announce intent before acting, 7 overflow → write in batches. No other skill files exist to map — this is the minimal structure among the all-agents skill set.

## Mental hooks & unexpected rules

- `"WARNING! High context consumption, consider using new session!"` (step 3, 65%) — an exact literal string to output, not a paraphrase.
- `"CRITICAL! Context consumption is very high, you must start a new session!"` (step 3, 75%) — second escalation tier, ten points above the warning, with its own distinct wording; this threshold is body-only, absent from the frontmatter `description`.
- "Announce self-organization intent to the user in advance." — restructuring files, splitting scope, reducing output, or starting a new session must be surfaced before acting, never performed silently.
- Step 7 ("Output overflow → write in batches, section-by-section") is the entire overflow-handling instruction — even the skill's own fallback for its own overflow case is one line.
- Thresholds are given as OR-chains across mismatched units in one line: "2h or 15+ files or 350+ line spec" — any single condition triggers scope-reduction, not all three together.

## Invariants — do not change

- Frontmatter `name: self-organization` must equal the folder name and match the registration in `docs/definitions/skills.md` (`- self-organization`).
- Named verbatim in `rules/bootstrap-alwayson.md:72`'s all-agents `skill_engagement_rules` list — renaming the skill breaks that reference and removes it from every agent's mandatory engagement set.
- `instructions/r3/core/skills/orchestration/assets/o-team-manager.md:36` invokes it by exact name for the orchestrator's compression duty: `"compress completed + no-longer-relevant content (SKILL \`self-organization\`)"` — the string `self-organization` there depends on this skill's name staying unchanged.
- `grep -rn "self-organization" instructions/r3/core --include="*.md"` returns 6 hits: the two cross-file couplings above (bootstrap-alwayson.md:72, o-team-manager.md:36), the skill's own frontmatter/body (name, step 10's prose use of the word), plus `dangerous-actions/README.md:11` and `deviation/README.md:11`, which each quote the bootstrap all-agents line verbatim as part of documenting their own engagement — incidental, not couplings to this skill's behavior, but they go stale if the skill is renamed since they embed that exact line.
- The two literal output strings in step 3 (`WARNING!...`/`CRITICAL!...`) are exact user-visible strings; rewording them changes observable session behavior everywhere the thresholds are crossed.
- Trigger split [decided 2026-07-11]: the `description` carries the compressed triggers (65%+ context, 2h / 15+ file / 350+ line scope, large-file restructuring); the 75% CRITICAL tier and file-size numbers (~500+ lines / 10K+ size) are body-only. Context thresholds are percentages ONLY — no absolute token counts (1M-context models) [decided 2026-07-11]. Changing a scope/context number requires syncing description and the matching `<process>` step; do not "fix" the split by adding body-only numbers to the description.
- The `description` uses the guardrail form (`CRITICAL. MUST activate when <condition>` [decided 2026-07-11]) — it is the sole engagement trigger (no `<when_to_use_skill>` block); keep every remaining threshold keyword when editing.
- `disable-model-invocation: false` and `user-invocable: false` must stay: proactive/model-invoked, hidden from the `/` menu, consistent with the other all-agents skills (`deviation`, `dangerous-actions`, `sensitive-data`, `self-learning`).

## Editing guide

Safe to edit: wording within an existing numbered step, adding a new numbered step. Handle with care: the two literal WARNING!/CRITICAL! strings, the context/scope/large-file thresholds (description carries the compressed form, body the exact numbers — sync both when changing), the skill's `name` (breaks `bootstrap-alwayson.md` and `o-team-manager.md`, and staleness in the two sibling READMEs that quote the bootstrap line), and the `disable-model-invocation`/`user-invocable` flags. New content belongs as a new `<process>` step. Referenced by: `rules/bootstrap-alwayson.md` (all-agents engagement list) and `orchestration/assets/o-team-manager.md` (compression duty during execution).
