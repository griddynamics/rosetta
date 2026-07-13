# reverse-engineering

Turns existing code into a spec that captures WHAT and WHY, stripping out HOW.

## Why it exists

Without it, an agent asked to reverse-engineer code defaults to the failure modes named in `<pitfalls>`: transcribing code as pseudocode instead of recovering intent, treating duplicate terminology ("Order" vs "Purchase") as cosmetic, specifying dead code/workarounds as requirements, missing implicit state machines hidden in nullable columns (`reminded_at`, `feedback_id`), specifying current bugs as intended behavior, and diving in without scoping first. The skill supplies named, repeatable tests instead of leaving the domain/implementation line to ad hoc judgment.

## When to engage

`disable-model-invocation: false`, `user-invocable: true` — both auto-invocable on matching context and directly user-invocable. Description: "To reverse-engineer code into a spec: extract behavior and domain logic — WHAT and WHY, not HOW." No `<when_to_use_skill>` section exists in SKILL.md, so the model keys off that `description` alone for auto-invocation; beyond that, it is explicitly pulled in by: `init-workspace-flow-documentation.md` ("USE SKILL `reverse-engineering` for domain extraction"), `init-workspace-flow-patterns.md` ("USE SKILL `reverse-engineering` — apply 'Would we rebuild this?' test: pattern = recurring structure surviving a from-scratch rewrite"), `large-workspace-handling` SKILL.md/README.md ("Subagents to USE SKILL `reverse-engineering` if needed for code analysis"), `requirements-authoring-flow.md` (orchestrator MUST USE SKILL when task is to reverse-engineer), `code-analysis-flow.md` (required skill in several phases, paired with `requirements-authoring`), `coding-flow.md` (recommended skill), the `requirements-engineer` agent, and `orchestration/assets/o-team-manager.md`.

## How it works

SKILL.md is one flat block, no `<process>` or `<validation_checklist>`: `<role>` (senior systems analyst / domain archaeologist framing) then three lists — `<core_concepts>` (21 numbered tests/heuristics for what survives into the spec), `<rules>` (17 imperative scoping/extraction directives), `<pitfalls>` (10 named failure modes, a mirror-subset of the core_concepts). No `assets/` or `references/` subfolder — the skill is pure judgment-call guidance, nothing to look up.

## Mental hooks & unexpected rules

- "Would we rebuild this?" test — for every code path, ask if it would be in the requirements on a from-scratch rebuild; if not, exclude it (note the underlying need if it's a workaround).
- "Why does the stakeholder care?" filter — "A 7-day expiry matters (candidate experience). A 32-byte token does not (security plumbing)."
- "multiple implementations" heuristic — one OAuth provider is implementation; three means "the variation itself is a domain concern."
- Implicit state machines: "A model with no `status` field but with nullable columns like `reminded_at`, `completed_at`, `feedback_id` is secretly a state machine."
- Validation is two-directional: "show developers ('Is this what it does?') and show stakeholders ('Is this what it _should_ do?'). The gap ... is where the real value lives."
- Last `<rules>` bullet is the strongest: "No made-up/recommended/suggested/better requirements, this is a contract - it must be factual only!"
- `<core_concepts>` #9 makes `codemap` a load-bearing prerequisite, not a suggestion: "USE SKILL `codemap` for structural context before beginning."

## Invariants — do not change

- `name: reverse-engineering` matches the folder name and is registered in `docs/definitions/skills.md` (`- reverse-engineering`); renaming breaks every `USE SKILL \`reverse-engineering\`` reference listed above.
- `disable-model-invocation: false` / `user-invocable: true` — unlike routed-to-only skills (e.g. `codemap`), this one is both self-triggering and directly user-invocable; flipping either removes an entry path multiple prompts/agents assume exists.
- `description` stays a dense, keyword-heavy "To <verb>..." line per the skill schema's token budget — it is the auto-invocation trigger surface since model-invocation is not disabled.
- Root wrapper tag is `<reverse_engineering>` (underscore) around the whole body, per the schema's `<[the_skill_name]>` convention; external references use the hyphenated skill name for `USE SKILL`, never this tag.
- The named test strings ("Would we rebuild this?", etc.) are quoted verbatim by `init-workspace-flow-patterns.md` — rewording one desyncs that external quote from its source.
- `baseSchema: docs/schemas/skill.md` must keep pointing at the live schema file.

## Editing guide

- Safe to change: wording or examples inside individual `<core_concepts>` / `<pitfalls>` bullets, as long as the named tests keep their current phrasing and intent.
- Handle with care: the exact test names — at least one external workflow quotes "Would we rebuild this?" verbatim, so changing the phrase requires updating that reference too.
- No `assets/`/`references/` subfolders exist; this skill is deliberately self-contained — new judgment-call content stays inline rather than spawning a references file.
- Referenced by: workflows `requirements-authoring-flow.md`, `init-workspace-flow-patterns.md`, `init-workspace-flow-documentation.md`, `coding-flow.md`, `code-analysis-flow.md`; agent `requirements-engineer.md`; skill `large-workspace-handling` (SKILL.md and README.md); `orchestration/assets/o-team-manager.md`.
