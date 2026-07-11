# qa-structure
QA path and state-layout authority: resolves where QA artifacts live, how slugs are formed, and how the QA state/config files are shaped.

## Why it exists
Without this skill, an agent doing QA setup will invent folder names, guess slugs, write session artifacts into shared `agents/` paths, or drift from the canonical state/config layout. `qa-structure` fixes that by making path resolution, slug rules, and state-file shape single-source and flow-specific.

## When to engage
Use when you need to create a QA session folder, derive `{IDENTIFIER}` or `<test-name>`, resolve an artifact path, or seed/read the QA state/config files. It owns WHERE QA artifacts live, not HOW QA artifacts are authored or analyzed. Like `qa-knowledge`, it is helper-only (`disable-model-invocation: true`, `user-invocable: false`) and is expected to be loaded by QA workflows.

## How it works
Single flat `SKILL.md` with `assets/` and `references/` subfolders. Root `<qa_structure>` contains `<when_to_use_skill>`, `<core_concepts>`, `<resources>`, and `<anti_patterns>`. The central mechanic is progressive disclosure: load exactly one layout reference (`api-qa-layout.md` XOR `ui-qa-layout.md`) for the active flow, optionally load `config-schema.md` for config validation, then READ SKILL FILE for the matching template asset only when the current step needs it. Slug rules, reserved words, and the 8-row phase-status state-file shape are defined here and must be used verbatim.

## Mental hooks & unexpected rules
- "This skill is the SSoT for QA paths, identifiers, and state-file shape" — downstream QA steps should not improvise their own locations.
- Layout loading is XOR, not additive: load `api-qa-layout` or `ui-qa-layout`, never both unless a task truly spans both flows.
- "Underivable slug" is a stop condition after one user attempt; guessing is explicitly forbidden.
- Shared `agents/` output is treated as a collision bug; per-session `plans/...` folders are mandatory.

## Invariants — do not change
- `name: qa-structure` must equal the folder name and the registration in [docs/definitions/skills.md](/Users/isolomatov/Sources/GAIN/rosetta/docs/definitions/skills.md:56).
- `disable-model-invocation: true` / `user-invocable: false` must stay: this is a support skill, not a direct user command.
- The slug contract is load-bearing: lowercase ASCII kebab-case, letters/digits/hyphens only, max 80 chars, reserved `state`, `index`, and the flow's `*-state` name.
- The state-file shape rule ("header + `## Phase Completion Status` (8 rows) + per-phase append blocks") is canonical.
- The flow-layout XOR rule and the per-session `plans/...` path rule are behavioral invariants, not convenience advice.

## Editing guide
Safe to edit: wording in `<core_concepts>`, `<resources>`, and `<anti_patterns>`, and additions to the router table when new QA structure assets or references appear. Handle with care: slug rules, state-file shape, the layout XOR rule, and any canonical path examples. New fill-in skeletons belong in `assets/`; path/config contracts belong in `references/`.
