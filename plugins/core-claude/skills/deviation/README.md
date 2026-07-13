# deviation

Forces a hard stop and re-check against original intent the moment execution surprises, stalls, or drifts from what was asked.

## Why it exists

Without this skill a capable model treats surprise, low confidence, or a stalled approach as something to push through — it rationalizes the current path as "close enough" or "an improvement" and keeps going, burning more effort in the wrong direction and only surfacing the conflict (if at all) after the fact, once it is expensive to unwind. The skill forces the model to stop before doing more, to challenge its own direction, and to escalate rather than silently resolve ambiguity by guessing.

## When to engage

No `<when_to_use_skill>` block; engagement is driven by the frontmatter `description` (CRITICAL/guardrail form) and by `rules/bootstrap-alwayson.md`'s `skill_engagement_rules`, which lists `deviation` in the all-agents line: `"All agents: USE SKILL \`sensitive-data\`, \`dangerous-actions\`, \`deviation\`, \`self-learning\`, \`self-organization\`."` — applies to every agent type, not just the orchestrator. Per the description, MUST activate on: unclear intent, can't follow original intent, can't reliably solve the problem, SURPRISE or UNEXPECTED result, can't bet $100 on the solution, unknowns/assumptions that critically affect the solution, detected deviation from original intent, panic, or user asked to UNDO.

## How it works

Single flat `SKILL.md`, no `assets/` or `references/` subfolders, no `<role>`, `<core_concepts>`, or `<validation_checklist>`. Root `<deviation>` wraps two sections: `<process>` (8 numbered steps — stop, double-check against intent, "think the opposite," escalate subagents → orchestrator → user, state briefly, wait for explicit decision, update memory, recommend `post-mortem`) and `<pitfalls>` (2 anti-patterns). No prep-steps gate — unlike most skills there is no "Rosetta prep steps MUST be FULLY completed" line, consistent with a skill meant to fire mid-task on panic/surprise rather than at a clean starting point (intent not documented).

## Mental hooks & unexpected rules

- `"THINK THE OPPOSITE" — challenge current direction.` — not just re-verify, actively argue against the path already taken before continuing it.
- `you cannot bet $100 on your solution` (description) — reframes confidence threshold as a concrete stake, not a vague self-assessment.
- `Escalate: subagents → orchestrator → user.` — a subagent detecting deviation does not resolve it alone or go straight to the user; it climbs the chain in order.
- `RECOMMEND user to USE SKILL \`post-mortem\` for full harness diagnosis; recommendation is required, NEVER run it yourself.` — the model must always surface the recommendation but is barred from auto-invoking post-mortem itself.
- `Rationalizing deviation as "improvement".` (pitfall) — names the specific self-deception this skill exists to interrupt: dressing up drift as a better idea instead of flagging it.

## Invariants — do not change

- Frontmatter `name: deviation` must equal the folder name and match the registration in `docs/definitions/skills.md` (line 32: `- deviation`).
- `description` must keep the guardrail form per `docs/schemas/skill.md`: `"Rosetta CRITICAL MUST skill. MUST activate when <condition>"` — this is what routes engagement since there is no `<when_to_use_skill>` section; do not convert it to the generic verb form.
- `disable-model-invocation: false` and `user-invocable: false` must stay: the skill must remain model-invocable (fires proactively on surprise/panic) and hidden from the `/` menu (background reflex, not a user-run command).
- Step 8's reference to `post-mortem` depends on that skill keeping `disable-model-invocation: true` (verified in `skills/post-mortem/SKILL.md`) — that flag is *why* deviation must only recommend it rather than run it; if post-mortem's invocation flag or name changes, step 8's wording and constraint need re-verification.
- `grep -rn "deviation" instructions/r3/core --include="*.md"` returns ~9 hits, but only `rules/bootstrap-alwayson.md:72` names the *skill* (backtick `deviation` in the `skill_engagement_rules` all-agents list). Every other hit (`coding-flow.md`, `aqa-flow-selector-implementation.md`, `init-workspace-flow-shells.md`, `subagent-directives/SKILL.md`, `pa-knowledge-base.md`, `orchestration/SKILL.md`, `coding-agents-farm/SKILL.md`) uses the plain English word "deviation"/"deviations" and is not a coupling to this skill — do not treat those as inbound references when editing.

## Editing guide

Safe to edit: wording of `<pitfalls>`, additional process steps, phrasing of the escalation chain, as long as the step order (stop → check → challenge → escalate → state → wait → memory → recommend post-mortem) is preserved. Handle with care: the `post-mortem` reference in step 8 (coupled to that skill's `disable-model-invocation: true`), the `disable-model-invocation`/`user-invocable` flags, and the guardrail-form `description` (it is the sole engagement trigger). New content belongs in `<process>` (as a new numbered step, keeping "escalate" and "recommend post-mortem" last) or `<pitfalls>`. Referenced by: `rules/bootstrap-alwayson.md` (all-agents `skill_engagement_rules` list).
