---
name: qa-structure
description: "Rosetta — canonical QA session layout, artifact paths, identifier & slug rules, and state-file shape for test-automation flows."
license: Apache-2.0
tags: ["qa", "api-qa", "ui-qa", "skills"]
baseSchema: docs/schemas/skill.md
---

<qa_structure>

<when_to_use_skill>

Activate inside any API-QA or UI-QA flow phase that must create the session folder, resolve or name an artifact path, derive the `{IDENTIFIER}` / `<test-name>` slug, or seed/read the workflow state file. This is the single source for WHERE QA artifacts live — not for HOW to author or analyze them.

</when_to_use_skill>

<core_concepts>

- All Rosetta prep steps MUST be FULLY completed, load-context skill loaded and fully executed
- This skill is the SSoT for QA paths, identifiers, and state-file shape; phases bind to the paths defined here verbatim and never invent their own.
- **Load only your flow's layout** (progressive disclosure — the other flow's paths stay off-context): ACQUIRE `qa-structure/references/api-qa-layout.md` (QA / backend API) OR `qa-structure/references/ui-qa-layout.md` (UI-QA / UI-E2E) FROM KB — canonical paths, the `{IDENTIFIER}` / `<test-name>` slug rules, and the state-file shape live there.
- The config-key schema (which keys exist, which phase consumes each) is reference-grade — ACQUIRE `qa-structure/references/config-schema.md` FROM KB when loading or validating project config.
- Fill-in skeletons are assets, ACQUIRE'd at point of use, never resident — see `<resources>`.

</core_concepts>

<resources>

Router — ACQUIRE the one your current step needs (point-of-use, never all at once):

| When a phase needs to… | ACQUIRE |
|---|---|
| resolve API-QA paths, `{IDENTIFIER}` derivation, or the QA state-file shape | `qa-structure/references/api-qa-layout.md` |
| resolve UI-QA paths, the `<test-name>` slug rules, the page-sources contract, or the UI-QA state-file shape | `qa-structure/references/ui-qa-layout.md` |
| load or validate the QA project-config keys (keys + consuming phase + accepted `N/A` forms) | `qa-structure/references/config-schema.md` |
| write the API-QA project-config file | `qa-structure/assets/api-qa-project-config-template.md` |
| run the Phase 0 user interview (config missing) | `qa-structure/assets/api-qa-config-interview.md` |
| seed the UI-QA state file (Phase 1) | `qa-structure/assets/ui-qa-state-template.md` |

The API-QA state-file seed and the API-QA per-run initial-data skeleton are tiny + always-needed, so they stay **inline** in `api-qa-flow-project-config-loading.md` rather than as assets — avoids ACQUIRE round-trips on the Phase 0 critical path.

</resources>

<anti_patterns>

Flag/refuse these before proceeding:

- Fabricating or guessing a `<test-name>` / `{IDENTIFIER}` slug instead of confirming with the user (or stopping when underivable).
- Writing the project config or any per-session artifact to a shared `agents/` path instead of the per-session feature plan folder (`plans/api-qa-{IDENTIFIER}/` or `plans/testgen-{TICKET-KEY}/`) — a shared path collides across parallel sessions and commits.
- Leaving a required config key absent instead of `N/A — <reason>` — Phase 1's grep silently misses an absent key.
- Inventing a non-canonical artifact path instead of binding to the layout reference verbatim.
- Loading both flows' layouts when only one applies (`api-qa-layout` XOR `ui-qa-layout`).

</anti_patterns>

</qa_structure>
