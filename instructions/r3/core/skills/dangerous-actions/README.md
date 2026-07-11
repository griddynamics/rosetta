# dangerous-actions

Guardrail skill that forces blast-radius reasoning before any potentially irreversible or catastrophic action.

## Why it exists

Without this skill a capable model will run `rm -rf`, `git reset --hard`, force-pushes, DDL drops, or writes to secret files as routine steps inside a larger task, treating them as no different from any other tool call — because nothing else in the always-on bootstrap forces a blast-radius check before destructive or irreversible operations. It fixes the failure mode of an AI executing a catastrophic, hard-to-undo action while focused on completing the user's actual (often unrelated, trivial) request. The skill makes the model stop and assess consequences ("THINK THE OPPOSITE") before executing.

## When to engage

No `<when_to_use_skill>` block exists; engagement is driven entirely by the frontmatter `description` (a CRITICAL/guardrail-form description, not a generic one) plus `rules/bootstrap-alwayson.md`, which lists this skill in the mandatory `skill_engagement_rules` block: "All agents: USE SKILL `sensitive-data`, `dangerous-actions`, `deviation`, `self-learning`, `self-organization`." It applies to every agent type (orchestrator and subagents alike), unlike skills scoped to the orchestrator only. Trigger condition per the description: action or its consequence is potentially dangerous/irreversible/destructive/HIGH RISK, or even *maybe* dangerous — "If there is even a remote chance - load the skill."

## How it works

Single flat `SKILL.md`, no `assets/` or `references/` subfolders. Root `<dangerous_actions>` wrapper contains only `<process>` (4 numbered steps — assess blast radius, think the opposite, consider alternatives, require explicit approval for hard-deny — plus example dangerous actions and 3 narrow exceptions) and `<pitfalls>` (2 anti-patterns). No `<role>`, `<validation_checklist>`, or `<hook>`. There is still external hook code in `src/hooks/src/hooks/dangerous-actions/`, but it is no longer described in this skill file; this skill now owns only the reasoning gate.

## Mental hooks & unexpected rules

- "MUST activate when consequence MAYBE dangerous even if action itself seems safe" — pushes engagement upstream of certainty; a safe-looking action with a risky downstream effect still requires the skill.
- "MUST activate when consequence MAYBE dangerous even if action itself seems safe" — pushes engagement upstream of certainty; a safe-looking action with a risky downstream effect still requires the skill.
- "THINK THE OPPOSITE" is the core interrupt: before executing, actively model the failure case instead of only the intended outcome.
- "MUST REQUIRE EXPLICIT user approval for hard-deny tier (see below)." — the SKILL still references a tiered policy, but the tier mechanics are no longer defined inline here; they live outside this file.

## Invariants — do not change

- Frontmatter `name: dangerous-actions` must equal the folder name and match the registration in `docs/definitions/skills.md` (line listing `- dangerous-actions`).
- `description` must keep the guardrail form per `docs/schemas/skill.md`: `"Rosetta CRITICAL MUST skill. MUST activate when <condition>"` — this is the CRITICAL/guardrail form, not the generic verb form, and is what routes engagement since there is no `<when_to_use_skill>` section.
- `disable-model-invocation: false` and `user-invocable: false` must stay as-is: the skill must remain model-invocable (so it fires proactively) and hidden from the `/` menu (it is background guardrail knowledge, not something a user manually invokes).
- This skill is named explicitly in `rules/bootstrap-alwayson.md`'s priority line — `"guardrails (sensitive-data/dangerous-actions/risk-assessment)"` — and in its `skill_engagement_rules` all-agents list. Renaming the skill folder/name breaks both references.
- XML section names (`<dangerous_actions>`, `<process>`, `<pitfalls>`) are load-bearing terms reused by this README and referenced by the skill schema convention; changing them desynchronizes the skill text from its documentation.
- Inbound couplings (`grep -rn "dangerous-actions" instructions/r3/core --include="*.md"`): `workflows/coding-flow.md` (recommends this skill at 6 workflow steps), `rules/bootstrap-alwayson.md` (2 hits, above), `skills/hitl/SKILL.md` and `skills/hitl/README.md` (plain approval coupling, not hook-marker dependency), `skills/coding-agents-hooks-authoring/SKILL.md` (references the hook's file path as an example, not a behavioral dependency).

## Editing guide

Safe to edit: wording of `<pitfalls>`, additional dangerous-action examples in `<process>`, and clarifying prose in this README. Handle with care: the `hard-deny` wording in process step 4, the `disable-model-invocation`/`user-invocable` flags, and any claim about external hook behavior — the hook now lives outside this skill file and should be verified against `src/hooks/src/hooks/dangerous-actions/` before being documented here. New guardrail content belongs in `<process>` or `<pitfalls>`. Referenced by: `workflows/coding-flow.md`, `rules/bootstrap-alwayson.md`, `skills/hitl/SKILL.md`, `skills/hitl/README.md`.
