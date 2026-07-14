# qa-knowledge
QA convention router: loads the right artifact skeletons, failure taxonomies, and correction discipline for API-AQA and UI-AQA work.

## Why it exists
Without this skill, an agent doing QA work will invent artifact shapes from memory, restate taxonomies inline, drop assertions or ATCs silently, or emit artifacts without rerunning the sensitive-data gate. `qa-knowledge` fixes that by centralizing QA-domain conventions and forcing point-of-use loading of the exact asset or reference the current step needs.

## When to engage
Use when authoring, analyzing, or correcting backend-API or UI/E2E tests and you need QA conventions rather than path/layout rules. It is non-user-invocable helper knowledge (`disable-model-invocation: true`, `user-invocable: false`) intended to be loaded by QA workflows and adjacent skills. TestRail/Jira/Confluence are canonical examples only; adapt the conventions to the current case.

## How it works
Single flat `SKILL.md` with `assets/` and `references/` subfolders. Root `<qa_knowledge>` contains `<when_to_use_skill>`, `<core_concepts>`, `<resources>`, and `<anti_patterns>`. The core behavior is routing: look at the current QA step, then READ SKILL FILE for exactly one template or taxonomy from the router table at point of use. Assets own skeletons and output formats; references own classification conventions. The skill explicitly refuses memory-based artifact authoring and silent assertion loss.

## Mental hooks & unexpected rules
- "Load only what the current task needs" — never bulk-load the whole QA library.
- "artifact skeletons are assets" — if you are about to write a QA artifact from memory, you are already off contract.
- "every ATC (QA) or typed assertion (UI-AQA) is implemented or recorded, never dropped" — omission must be explicit gap accounting, not disappearance.
- The `sensitive-data` pre-emit scan is part of QA artifact correctness, not an optional cleanup step.

## Invariants — do not change
- `name: qa-knowledge` must equal the folder name and the registration in [docs/definitions/skills.md](/Users/isolomatov/Sources/GAIN/rosetta/docs/definitions/skills.md:55).
- `disable-model-invocation: true` / `user-invocable: false` must stay: this skill is a routed helper, not a user-facing command.
- The asset/reference split is load-bearing: templates stay in `assets/`, conventions in `references/`.
- The router table is the canonical entry point; if an artifact or taxonomy is added, wire it into `<resources>`.
- The anti-pattern "silent ATC / assertion drop" is a hard behavioral rule, not just advice.

## Editing guide
Safe to edit: wording in `<core_concepts>`, `<resources>`, and `<anti_patterns>`, plus additions to the router table when new QA assets appear. Handle with care: the point-of-use loading rule, the asset/reference split, and the "implemented or recorded" coverage rule. New artifact shapes belong in `assets/`; new taxonomies or conventions belong in `references/`.
