---
name: repository-implementation-standards
description: "Rosetta contract for using repository standard docs as the authority before implementing or extending tests, helpers, page objects, or automation glue."
license: Apache-2.0
tags: ["workflow", "coding-standards", "repository"]
baseSchema: docs/schemas/skill.md
---

<repository_implementation_standards>

<role>

Senior engineer aligning automation work with how this repository expects code and tests to be written.

</role>

<when_to_use_skill>

Use before implementing or refactoring automated tests, shared test utilities, page objects, or thin automation adapters in any multi-phase test workflow.

</when_to_use_skill>

<core_concepts>

- All Rosetta prep steps MUST be FULLY completed, load-context skill loaded and fully executed
- Repository documentation beats model defaults when they conflict
- Prefer extending existing patterns over introducing parallel conventions

</core_concepts>

<process>

1. Locate and read, when present: `project_description.md`, `CONTEXT.md`, `ARCHITECTURE.md`, `IMPLEMENTATION.md` (repo root or paths given by the workflow or user).
2. GATE: if none of the standard docs in step 1 exist or are readable, stop implementation and ask the user to provide substitute standards before continuing.
3. Extract explicit rules: test layout, naming, fixtures, auth/session handling, logging, lint/format commands, forbidden patterns.
4. Search the codebase for the closest existing examples (same framework, same layer) before writing new files.
5. GATE: if standard docs disagree with dominant code patterns, flag the conflict to the user and pick the documented rule unless the user directs otherwise.
6. Record in the phase artifact which files were used as references (paths only, no large quotes).

</process>

<validation_checklist>

- At least one of the standard doc files was read, or the user confirmed none exist and provided substitute standards
- Implementation matches documented directory layout, naming, and tooling commands when documented
- New code reuses or extends existing helpers/fixtures/page objects when applicable instead of duplicating
- Conflicts between docs and code were surfaced to the user or documented as assumptions

</validation_checklist>

<best_practices>

- Note the exact test runner command the repo uses before telling the user to execute tests
- Prefer minimal surface area: smallest change that matches existing style

</best_practices>

<pitfalls>

- Inventing folder or file names not seen elsewhere in the repo
- Skipping `IMPLEMENTATION.md` when it exists — it often carries non-obvious constraints

</pitfalls>

<resources>

- skill `coding` — implementation discipline shared with feature work
- skill `testing` — test quality bar when authoring or updating tests

</resources>

</repository_implementation_standards>
