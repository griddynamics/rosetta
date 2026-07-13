# risk-assessment

Guardrail skill that scores environment risk (low/medium/high/critical) before execution and escalates when access to databases, cloud, or S3-like external systems is in play.

## Why it exists

Without this skill a model treats every environment as equally safe and jumps straight into acting once it has an MCP connection to a database, cloud service, or S3-like system, without stopping to weigh what read/write scope and environment tier (dev vs. shared vs. production) actually mean for blast radius. The two `<pitfalls>` name the failure modes directly: "Defaulting to 'low' without checking accessible MCPs" and "Not re-assessing when new environments join mid-session." The `<process>`'s additive scoring (start from read-only/local = low, shared dev/stage/qa = medium, +1 for write access, +1 for access to higher environments including production) is what forces the model to actually enumerate access instead of assuming it's benign.

## When to engage

No `<when_to_use_skill>` section exists; engagement is driven entirely by the frontmatter `description`: "MUST activate before execution when environment has access to databases, cloud services, S3, or similar external systems, and when assessing environment risk level." Actor: per `instructions/bootstrap-alwayson.instructions.md`'s `skill_engagement_rules`, this is one of the skills the **orchestrator/top-agent** (not subagents) must use — listed alongside `hitl`, `orchestration`, `questioning`, `load-project-context`. It also appears in the same file's priorities line as one of the three named "guardrails (sensitive-data/dangerous-actions/risk-assessment)," but unlike its two tier-mates it is *not* on the "All agents" engagement list — subagents don't independently trigger it. No other prerequisite; the trigger is access to a dangerous MCP (database/cloud/S3/similar), checked before execution.

## How it works

Single flat `SKILL.md`, no `assets/` or `references/` subfolders. Root `<risk_assessment>` wraps two sections: `<process>` — a 7-step assessment (enumerate dangerous-MCP access, assign a level, three baseline/increment rules, output `AI Risk Assessment: {LEVEL}`) followed by a 3-step escalation ladder keyed to the level (medium = warn + explain failure modes; high = user must understand data-loss risk; critical = block execution, external risk reduction required, "OVERRIDE NOT ALLOWED"); and `<pitfalls>` — the two anti-patterns above. No `<role>`, `<core_concepts>`, `<validation_checklist>`, `<best_practices>`, `<resources>`, or `<templates>` sections are present. Single actor: whichever agent is acting as orchestrator/top-agent for the session.

## Mental hooks & unexpected rules

- "CRITICAL: block execution, require external risk reduction. OVERRIDE NOT ALLOWED." — unlike the medium/high tiers (warn, require user understanding), critical has no user-approval escape hatch; the block is not a suggestion.
- "+1 level for write access" / "+1 level for access to higher environments including production" — these stack: an environment can cross two thresholds at once (e.g. shared dev with write access, or read-only prod), so the level is computed, not eyeballed.
- Grouped in `bootstrap-alwayson.md`'s guardrail priority tier with `sensitive-data`/`dangerous-actions`, but scoped to orchestrator/top-agent only in `skill_engagement_rules`, while its two tier-mates apply to "All agents." Same tier, narrower engagement scope — easy to assume parity with its tier-mates and get the actor wrong.
- `user-invocable: false` — this skill never appears in the `/` menu; it is background reasoning the orchestrator applies proactively, not something a user runs on demand.

## Invariants — do not change

- Frontmatter `name: risk-assessment` must equal the folder name and match the flat registration in `docs/definitions/skills.md` (`- risk-assessment`).
- The skill is named explicitly, by that exact hyphenated string, in two places in `instructions/bootstrap-alwayson.instructions.md`: the priorities line (`guardrails (sensitive-data/dangerous-actions/risk-assessment)`) and the `skill_engagement_rules` orchestrator line (`USE SKILL \`hitl\`, \`orchestration\`, \`questioning\`, \`risk-assessment\`, \`load-project-context\``). Renaming the folder/skill breaks both references.
- `description` is the sole engagement trigger (no `<when_to_use_skill>` section exists), so its keywords — "databases, cloud services, S3, or similar external systems" and "assessing environment risk level" — are load-bearing; dropping any of them narrows what auto-fires the skill. The description uses the canonical guardrail form (`"Rosetta CRITICAL MUST skill. MUST activate when <condition>"`), matching its tier-mates `sensitive-data` and `dangerous-actions` — keep the prefix.
- `disable-model-invocation: false` and `user-invocable: false` must stay as-is: the skill must remain model-invocable (fires proactively) and hidden from the `/` menu (background guardrail knowledge, not user-invoked).
- Root tag `<risk_assessment>` (underscored, matching the skill name) follows the `docs/schemas/skill.md` convention (`<[the_skill_name]>`); no other file references this tag or its children (`<process>`, `<pitfalls>`) by name, so nothing external breaks if their prose changes, but renaming them would desync the file from the schema convention.
- The output contract `AI Risk Assessment: {LEVEL}` (line 20) is the skill's declared human-facing output format; no file in `instructions/r3/core` greps for or parses this string, so it is a convention to preserve for consistency, not a hard cross-file dependency.
- `baseSchema: docs/schemas/skill.md` must stay pointed at the schema file.

## Editing guide

Safe to edit: wording of the `<pitfalls>` bullets, escalation prose for medium/high (as long as "warn," "explain failure modes," and "require user to understand data loss risk" stay distinguishable from critical's hard block), and adding more pitfalls. Handle with care: the level names (`low`/`medium`/`high`/`critical`) and the additive scoring rules — other files could start relying on these words if referenced later, and the escalation ladder in `<process>` steps 8-10 keys off them exactly. The `OVERRIDE NOT ALLOWED` phrase on critical should not be softened without deliberately deciding to add a user-approval path. When editing the `description`, preserve the canonical guardrail prefix and every trigger keyword (databases/cloud services/S3/similar external systems/environment risk level). Referenced only by `instructions/bootstrap-alwayson.instructions.md` (priorities line + orchestrator engagement line); `skills/dangerous-actions/README.md` merely quotes that same priorities string incidentally, it does not itself depend on this skill's contents.
