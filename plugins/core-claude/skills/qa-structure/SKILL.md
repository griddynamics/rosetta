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

- reference `qa-structure/references/qa-layout.md` — QA paths, `{IDENTIFIER}` derivation, QA state-file shape
- reference `qa-structure/references/aqa-layout.md` — AQA paths, `<test-name>` slug rules, AQA state-file shape
- reference `qa-structure/references/config-schema.md` — QA project-config key schema (keys + consuming phase + accepted N/A forms)
- asset `qa-structure/assets/qa-project-config-template.md` — QA project-config markdown skeleton
- asset `qa-structure/assets/qa-config-interview.md` — verbatim user-prompt interview (Phase 0, config missing)
- asset `qa-structure/assets/aqa-state-template.md` — AQA state-file template

(The QA state-file seed and the QA per-run initial-data skeleton are tiny + always-needed, so they stay **inline** in `qa-flow-project-config-loading.md` rather than as assets — avoids ACQUIRE round-trips on the Phase 0 critical path.)

</resources>

</qa_structure>
