# coding-agents-prompt-authoring
Turns any request to author, refactor, review, port, or harden a prompt (skill/agent/workflow/rule/template/command) into a fixed discover-to-validate pipeline with a written brief, HITL gates, and a hard split between analyst notes and the delivered prompt.

## Why it exists
Without this skill a capable model asked to "write a skill/agent/rule" drafts straight from intuition: skips a written brief, blends its own reasoning/history into the delivered file, invents alias verbs outside the closed set, forgets HITL gates, lets the target prompt balloon past a readable size, or leaks another skill's internal file paths across the isolation boundary. This skill forces a fixed flow (discover → extract+intake → blueprint → draft/harden/edit per prompt → simulate → validate), keeps analyst artifacts (brief, blueprint, change-log) in the FEATURE PLAN folder away from the target file, and routes HITL, alias grammar, and Rosetta identity through fixed reference files instead of ad hoc judgment.

## When to engage
User-invocable (`user-invocable: true`) and auto-activatable; primary executor is the `prompt-engineer` subagent (opus-tier), dispatched by `commands/coding-agents-prompting-flow.md` steps 2–7 (extract/intake, blueprint, draft, hardening, simulate, validate). `docs/stories/reduce-bootstrap.md` mandates it as required grounding whenever Rosetta authors or edits its own instructions. Trigger: author, refactor, review, edit, port, or migrate any skill/agent/subagent/workflow/rule/template/command/generic prompt. Subagent prerequisite: `bootstrap-alwayson.md` + dispatch prompt, `subagent-directives`, and task-needed skills.

## How it works
SKILL.md: `<role>` (senior prompt-engineer persona) → `<when_to_use_skill>` → `<core_concepts>` (analyst-vs-target layering, prompt classification, actor boundaries, the READ/APPLY SKILL FILE routing list) → `<core_principles>` (SRP/DRY/KISS/YAGNI/MECE/MoSCoW/SMART) → `<resources>` (spec links + `pa-knowledge-base.md`) → `<templates>` (asset pointers).

Routing list dispatches by task:
- `pa-extract.md` (root tag `<reverse-engineer>`) — reverse-engineer requirements from an existing prompt
- `pa-intake.md` — elicit/structure requirements into the prompt brief
- `pa-adapt.md` — port/migrate a prompt via the `ADAPT` command (10-step transform + validation checklist)
- `pa-blueprint.md` — design structure, actors, contracts, schema for the target prompt set
- `pa-draft.md` — write first-pass target prompt content
- `pa-hardening.md` — review draft against principles/boundaries/Rosetta rules; five-axis audit
- `pa-edit.md` — apply surgical feedback to target files
- `pa-best-practices.md` / `pa-patterns.md` — best-practice and architecture-pattern grab-bags (read during review)
- `pa-schemas.md` — prompt classification, per-type authoring rules, and the README.md spec
- `pa-rosetta.md` — Rosetta load procedure, folder structure, closed alias grammar (Rosetta-targeted prompts only)
- `pa-simulation.md` — trace target prompt execution across use cases
- `pa-knowledge-base.md` — large grep-by-header reference (frameworks, orchestration, decision trees)
- `pa-rosetta-intro-for-AI.md` — plain-markdown Rosetta primer; not in the routing list, read directly by other artifacts (e.g. `reduce-bootstrap.md`)

Assets (`<templates>`, READ SKILL FILE): `pa-prompt-brief.md` (XML brief: goals, I/O, constraints, HITL gates, ideas, SMART criteria), `pa-meta-prompt.md` (skeleton to run the whole flow), `pa-validation-report.md` (boolean checklist across structure/quality/correctness/validation/governance/traceability), `pa-change-log.md` (kept/removed/added/clarified/assumptions/risks_hitl, retrospective).

Actors: user or orchestrator requests; `prompt-engineer` subagent executes internals through this skill; caller never sees this skill's internal reasoning.

## Mental hooks & unexpected rules
- `<rosetta_overall_flow scope="Applies ONLY to Rosetta prompts itself, user may be authoring for other systems or projects">` (`pa-rosetta.md`) — one attribute is the master switch between Rosetta-only load-procedure/alias content and general-purpose prompt authoring for any other system.
- "Analyst artifacts... vs target artifacts... are different layers, do not mix" / "Do not project analytical artifacts into generated target prompts" — brief/blueprint/change-log stay in the FEATURE PLAN folder; none of that reasoning may reach the delivered file.
- "Skills can't call skills, Phase can't call phases, Subagents can't call subagents, Workflows can, and Rules can." — isolation is per-type, not uniform.
- "`SKILL FILE`... NEVER carries a skill name — only a skill's own files may use it" (`pa-rosetta.md`) — cross-skill refs must be reworded to intent, never a path into another skill's folder.
- "MUST not reuse or mirror coding-agents-prompt-authoring as scaffolding or template" (`pa-schemas.md`) — this skill's own files are barred from being copied as a pattern source elsewhere.
- `pa-patterns.md` bans "non-operational clarifications (history, rationale, origin labels, change annotations)" in target documents, yet `reduce-bootstrap.md` records this skill as the sole exception to that repo-wide rule ("NO meta-commentary in instruction files, exempt: coding-agents-prompt-authoring [decided]") — no rationale for the exemption is recorded (intent not documented).
- "Every skill folder contains `README.md`... create/update it whenever authoring or changing a skill" — self-referential: this skill both must carry one and owns `pa-schemas.md`'s `<skill_authoring>`, the section defining the README spec for every other skill.

## Invariants — do not change
- Frontmatter `name: coding-agents-prompt-authoring` equals the folder name; registered verbatim in `docs/definitions/skills.md` ("- coding-agents-prompt-authoring").
- Frontmatter `description` stays dense and ≤ ~25 tokens per `docs/schemas/skill.md`'s canonical budget (all skills share ~1K tokens of always-visible description text); `pa-hardening.md`'s "<30 tokens!" figure is what this skill enforces on the target prompts it reviews, not its own budget.
- `disable-model-invocation: false` / `user-invocable: true` — auto-activates AND is user-callable, unlike background-only skills; flipping either changes who can trigger it.
- Canonical alias grammar (`USE SKILL/FLOW` · `INVOKE SUBAGENT` · `APPLY PHASE` · `READ|APPLY RULE/TEMPLATE/CONFIGURE/SKILL FILE` · `LIST`) — `SKILL FILE` never carries a skill name; cross-skill refs use the intent form. `pa-rosetta.md` is the contract-of-record teaching this CLOSED set — editing it changes the vocabulary every future authored Rosetta prompt uses.
- `references/pa-schemas.md`'s `<skill_authoring>` section defines the README.md standard for every skill folder, including this one — a self-referential contract; changing it changes the spec this file must satisfy.
- `pa-*` filenames are routed exclusively from SKILL.md's `<core_concepts>` classification/routing list — renaming a reference file without updating that list orphans it.
- Top-agent direct invocation follows the active mode's `Rosetta Prep Steps`; `prompt-engineer` subagent execution instead starts from `bootstrap-alwayson.md` + its dispatch prompt and required skills. Do not re-teach either startup chain here.
- Reference files use inconsistent root XML tags, not filename-derived ones (`<blueprint>`, `<draft>`, `<edit>`, `<intake>`, `<hardening>`, `<simulation>`, `<reverse-engineer>` for `pa-extract.md`, `<patterns>`, `<pa-knowledge-base>`, `<coding-agents-prompt-authoring>` for `pa-adapt.md`, plain markdown for `pa-rosetta-intro-for-AI.md`) — never assume tag name equals filename.
- Root wrapper `<coding-agents-prompt-authoring>` must equal the skill name (`docs/schemas/skill.md`); SKILL.md marks section/keyword names as "semantic contract cues." `pa-meta-prompt.md`'s template fills against `<core_concepts>`/`<core_principles_to_enforce>`/`<validation_checklist>` by name and `pa-hardening.md` self-references `core_principles_to_enforce_in_target_prompt` by name — renaming either breaks that binding. Attributes carry force too: `pa-rosetta.md`'s `scope="Applies ONLY to Rosetta prompts itself..."` gates Rosetta-only content; `pa-schemas.md`'s per-block `schema="docs/schemas/*.md"` attributes bind each authoring section to its canonical template — do not drop or repoint either without checking both sides.
- Inbound couplings (`grep -rn "coding-agents-prompt-authoring\|pa-rosetta\|prompt-engineer" instructions/r3/core docs/stories --include="*.md" -l`): `agents/prompt-engineer.agent.md` (only subagent using this skill), `commands/coding-agents-prompting-flow.md` (dispatches `prompt-engineer` through this skill, steps 2–7), `skills/hitl/README.md` (this skill delegates HITL logic to `hitl` rather than restating it), `skills/reasoning/SKILL.md` and `skills/questioning/SKILL.md` (list `prompt-engineer` as an agent), `docs/stories/reduce-bootstrap.md` (grounds its own authoring work in `pa-rosetta-intro-for-AI.md` + `pa-rosetta.md`, and treats this skill as the contract-of-record for the closed alias set), `docs/stories/orchestration-skill.md`, `docs/stories/bootstrap-removed.md` (archived history of alias forms this skill used to teach).

## Editing guide
Safe: prose inside `<core_concepts>`/`<core_principles>`/`<resources>`, and content inside individual `pa-*.md` files, as long as SKILL.md's routing list still names every file it points to. Handle with care: the routing list itself (new reference file needs a new routing line), `pa-rosetta.md` (alias-grammar contract-of-record — edits ripple to every authored Rosetta prompt), `pa-schemas.md`'s `<skill_authoring>` (README standard for all skills, including this one). New best-practice/pitfall content belongs in `references/`; new fill-in-the-blank output shapes belong in `assets/`; keep SKILL.md itself small. Referenced by `agents/prompt-engineer.agent.md`, `commands/coding-agents-prompting-flow.md`, `docs/stories/reduce-bootstrap.md`; consulted indirectly by `reasoning`/`questioning` only via the shared `prompt-engineer` agent name.
