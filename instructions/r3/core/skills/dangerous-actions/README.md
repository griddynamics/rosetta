# dangerous-actions

Guardrail skill that forces blast-radius reasoning before any potentially irreversible or catastrophic action, backed by a deterministic PreToolUse hook as last-resort enforcement.

## Why it exists

Without this skill a capable model will run `rm -rf`, `git reset --hard`, force-pushes, DDL drops, or writes to secret files as routine steps inside a larger task, treating them as no different from any other tool call — because nothing else in the always-on bootstrap forces a blast-radius check before destructive or irreversible operations. It fixes the failure mode of an AI executing a catastrophic, hard-to-undo action while focused on completing the user's actual (often unrelated, trivial) request. The skill makes the model stop and assess consequences ("THINK THE OPPOSITE") before executing, and the hook catches the cases where that reasoning is skipped.

## When to engage

No `<when_to_use_skill>` block exists; engagement is driven entirely by the frontmatter `description` (a CRITICAL/guardrail-form description, not a generic one) plus `rules/bootstrap-alwayson.md`, which lists this skill in the mandatory `skill_engagement_rules` block: "All agents: USE SKILL `sensitive-data`, `dangerous-actions`, `deviation`, `self-learning`, `self-organization`." It applies to every agent type (orchestrator and subagents alike), unlike skills scoped to the orchestrator only. Trigger condition per the description: action or its consequence is potentially dangerous/irreversible/destructive/HIGH RISK, or even *maybe* dangerous — "If there is even a remote chance - load the skill."

## How it works

Single flat `SKILL.md`, no `assets/` or `references/` subfolders. Root `<dangerous_actions>` wrapper contains: `<process>` (4 numbered steps — assess blast radius, think the opposite, consider alternatives, require explicit approval for hard-deny — plus example dangerous actions and 3 narrow exceptions), `<pitfalls>` (2 anti-patterns), and `<hook>` (documents the external enforcement layer: which IDEs/CLIs it's active in, the two-tier pattern classification, the threat model table, and the override/hard-deny procedures). No `<role>` or `<validation_checklist>`. The hook itself lives outside this folder in `src/hooks/src/hooks/dangerous-actions/` (`patterns.ts`, `evaluate.ts`) and is compiled per-platform into `src/hooks/dist/bundles/*/dangerous-actions.js`; the SKILL.md's `<hook>` section is documentation of that external artifact's behavior, not its implementation.

## Mental hooks & unexpected rules

- "MUST activate when consequence MAYBE dangerous even if action itself seems safe" — pushes engagement upstream of certainty; a safe-looking action with a risky downstream effect still requires the skill.
- "Active in Claude Code, Cursor, Copilot, and Codex. Windsurf: adapter ships but no plugin yet." — the hook's actual enforcement coverage is narrower than the skill's own applicability; on Windsurf the skill's reasoning is the only defense, there is no tripwire backstop.
- "The hook is a deterministic tripwire — it does not replace this skill's reasoning process." — reasoning is still mandatory even where the hook exists; the hook is described as a last-resort gate, not a substitute for step 1-3 of `<process>`.
- "`hard-deny` patterns **cannot be bypassed by the `Rosetta-AI-reviewed` marker**" — the override mechanism only exists for the `reconsider` tier; there is no self-service path out of hard-deny, ever.
- "**Not accepted**: `description`, `comment`, `metadata`, or any field not rendered in the IDE UI." — the override token must land in a human-visible payload field specifically to prevent an AI (or an injected instruction) from asserting review in a field nobody reads.
- "Exact case required. Rejected: `Rosetta-reviewed` (old token), `rosetta-ai-reviewed` (lowercase), `Rosetta-AI-reviewedX` (suffix word char)." — the detection regex is word-bounded and case-sensitive; near-miss strings are deliberately treated as non-matches, not fuzzy-accepted.

## Invariants — do not change

- Frontmatter `name: dangerous-actions` must equal the folder name and match the registration in `docs/definitions/skills.md` (line listing `- dangerous-actions`).
- `description` must keep the guardrail form per `docs/schemas/skill.md`: `"Rosetta CRITICAL MUST skill. MUST activate when <condition>"` — this is the CRITICAL/guardrail form, not the generic verb form, and is what routes engagement since there is no `<when_to_use_skill>` section.
- `disable-model-invocation: false` and `user-invocable: false` must stay as-is: the skill must remain model-invocable (so it fires proactively) and hidden from the `/` menu (it is background guardrail knowledge, not something a user manually invokes).
- `Rosetta-AI-reviewed` is an exact-case, cross-file override marker. `skills/hitl/SKILL.md` and `skills/hitl/README.md` both reference it verbatim and depend on it staying byte-identical to this file's definition. Do not rename, re-case, or restructure this token without updating `hitl`.
- This skill is named explicitly in `rules/bootstrap-alwayson.md`'s priority line — `"guardrails (sensitive-data/dangerous-actions/risk-assessment)"` — and in its `skill_engagement_rules` all-agents list. Renaming the skill folder/name breaks both references.
- XML section names (`<dangerous_actions>`, `<process>`, `<pitfalls>`, `<hook>`) and the two-tier vocabulary (`reconsider`, `hard-deny`) are load-bearing terms reused by `hitl` and by the hook's own documentation; changing them desynchronizes the skill text from the external hook behavior it describes.
- Inbound couplings (`grep -rn "dangerous-actions" instructions/r3/core --include="*.md"`): `workflows/coding-flow.md` (recommends this skill at 6 workflow steps), `rules/bootstrap-alwayson.md` (2 hits, above), `skills/hitl/SKILL.md` and `skills/hitl/README.md` (3 hits, override-token dependency), `skills/coding-agents-hooks-authoring/SKILL.md` (references the hook's file path as an example, not a behavioral dependency).

## Editing guide

Safe to edit: wording of `<pitfalls>`, additional dangerous-action examples in `<process>`, prose in the `## Threat model` / `## Override mechanism` markdown subsections inside `<hook>` as long as the tier names and marker stay intact. Handle with care: the `Rosetta-AI-reviewed` string (any case/spacing change breaks `hitl`), the `reconsider`/`hard-deny` tier names (external hook code and `hitl` both reference this vocabulary), and the `disable-model-invocation`/`user-invocable` flags. New guardrail content belongs in `<process>` or `<pitfalls>`; new hook-behavior documentation belongs in `<hook>` and should be verified against the actual implementation in `src/hooks/src/hooks/dangerous-actions/` before editing, since the hook is the source of truth and this file only documents it. Referenced by: `workflows/coding-flow.md`, `rules/bootstrap-alwayson.md`, `skills/hitl/SKILL.md`, `skills/hitl/README.md`.
