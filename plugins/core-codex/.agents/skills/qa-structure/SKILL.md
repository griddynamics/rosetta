---
name: qa-structure
description: "Rosetta — canonical QA/AQA session layout, artifact paths, identifier & slug rules, and state-file shape for test-automation flows."
license: Apache-2.0
tags: ["qa", "aqa", "skills"]
baseSchema: docs/schemas/skill.md
---

<qa_structure>

<when_to_use_skill>

Activate inside any QA or AQA flow phase that must create the session folder, resolve or name an artifact path, derive the `{IDENTIFIER}` / `<test-name>` slug, or seed/read the workflow state file. This is the single source for WHERE QA/AQA artifacts live — not for HOW to author or analyze them.

</when_to_use_skill>

<core_concepts>

- All Rosetta prep steps MUST be FULLY completed, load-context skill loaded and fully executed
- This skill is the SSoT for QA/AQA paths, identifiers, and state-file shape; phases bind to the paths defined here verbatim and never invent their own.
- **Load only your flow's layout** (progressive disclosure — the other flow's paths stay off-context): ACQUIRE `qa-structure/references/qa-layout.md` (QA / backend API) OR `qa-structure/references/aqa-layout.md` (AQA / UI-E2E) FROM KB — canonical paths, the `{IDENTIFIER}` / `<test-name>` slug rules, and the state-file shape live there.
- The config-key schema (which keys exist, which phase consumes each) is reference-grade — ACQUIRE `qa-structure/references/config-schema.md` FROM KB when loading or validating project config.
- Fill-in skeletons are assets, ACQUIRE'd at point of use, never resident — see `<resources>`.

</core_concepts>

<resources>

Router — ACQUIRE the one your current step needs (point-of-use, never all at once):

| When a phase needs to… | ACQUIRE |
|---|---|
| resolve QA paths, `{IDENTIFIER}` derivation, or the QA state-file shape | `qa-structure/references/qa-layout.md` |
| resolve AQA paths, the `<test-name>` slug rules, the page-sources contract, or the AQA state-file shape | `qa-structure/references/aqa-layout.md` |
| load or validate the QA project-config keys (keys + consuming phase + accepted `N/A` forms) | `qa-structure/references/config-schema.md` |
| write the QA project-config file | `qa-structure/assets/qa-project-config-template.md` |
| run the Phase 0 user interview (config missing) | `qa-structure/assets/qa-config-interview.md` |
| seed the AQA state file (Phase 1) | `qa-structure/assets/aqa-state-template.md` |

The QA state-file seed and the QA per-run initial-data skeleton are tiny + always-needed, so they stay **inline** in `qa-flow-project-config-loading.md` rather than as assets — avoids ACQUIRE round-trips on the Phase 0 critical path.

</resources>

<anti_patterns>

Flag/refuse these before proceeding:

- Fabricating or guessing a `<test-name>` / `{IDENTIFIER}` slug instead of confirming with the user (or stopping when underivable).
- Writing the project config to a per-ticket path instead of the project-wide canonical path.
- Leaving a required config key absent instead of `N/A — <reason>` — Phase 1's grep silently misses an absent key.
- Inventing a non-canonical artifact path instead of binding to the layout reference verbatim.
- Loading both flows' layouts when only one applies (`qa-layout` XOR `aqa-layout`).

</anti_patterns>

</qa_structure>
