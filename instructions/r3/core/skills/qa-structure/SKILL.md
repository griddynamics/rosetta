---
name: qa-structure
description: "To resolve QA session paths, identifiers/slugs, and state-file shape for test-automation flows."
license: Apache-2.0
disable-model-invocation: true
user-invocable: false
tags: []
baseSchema: docs/schemas/skill.md
---

<qa_structure>

<when_to_use_skill>

Use when you need to create the QA session folder, resolve or name an artifact path, derive the `{IDENTIFIER}` / `<test-name>` slug, or seed/read the QA state file. This is the single source for WHERE QA artifacts live -- not for HOW to author or analyze them. TestRail/Jira/Confluence are used as canonical examples, adapt to current case.

</when_to_use_skill>

<core_concepts>

- This skill is the SSoT for QA paths, identifiers, and state-file shape; paths here are used verbatim, never reinvented.
- **Load only your flow's layout** (progressive disclosure): ACQUIRE `qa-structure/references/api-qa-layout.md` FROM KB (backend API) XOR ACQUIRE `qa-structure/references/ui-qa-layout.md` (UI/E2E) FROM KB -- canonical paths + each flow's slug authority, guards, and state-file fields live there.
- **Slug format (both flows):** lowercase ASCII kebab-case -- letters, digits, hyphens only; no spaces/paths; ≤80 chars; reserved: `state`, `index`, and the flow's own `*-state` name.
- **Underivable slug/`{IDENTIFIER}`:** if unresolvable even after one user attempt, stop, record the gap in the flow's state file, ask once -- never fabricate or guess.
- **State-file shape (both flows):** header + `## Phase Completion Status` (8 rows) + per-phase append blocks; each phase appends only its own delta.
- Config-key schema (keys + consumer) is reference-grade -- ACQUIRE `qa-structure/references/config-schema.md` FROM KB when loading/validating project config.
- Fill-in skeletons are assets, ACQUIRE'd at point of use, never resident -- see `<resources>`.

</core_concepts>

<resources>

Router -- ACQUIRE FROM KB the one your current step needs (point-of-use, never all at once):

| When you need to… | ACQUIRE ... FROM KB |
|---|---|
| resolve API-QA paths, `{IDENTIFIER}` derivation, or the QA state-file shape | `qa-structure/references/api-qa-layout.md` |
| resolve UI-QA paths, the `<test-name>` slug rules, the page-sources contract, or the UI-QA state-file shape | `qa-structure/references/ui-qa-layout.md` |
| load or validate the QA project-config keys (keys + consumer + accepted `N/A` forms) | `qa-structure/references/config-schema.md` |
| write the API-QA project-config file | `qa-structure/assets/api-qa-project-config-template.md` |
| run the user interview when the config is missing | `qa-structure/assets/api-qa-config-interview.md` |
| seed the UI-QA state file | `qa-structure/assets/ui-qa-state-template.md` |

The API-QA state-file seed and the API-QA per-run initial-data skeleton are tiny + always-needed, so they stay **inline** in the consuming step rather than as assets -- avoids ACQUIRE round-trips on the critical path.

</resources>

<anti_patterns>

Flag/refuse these before proceeding:

- Fabricating or guessing a `<test-name>` / `{IDENTIFIER}` slug instead of confirming with the user (or stopping when underivable).
- Writing the project config or any per-session artifact to a shared `agents/` path instead of the per-session feature plan folder (`plans/ui-qa-<test-name>/`, `plans/api-qa-{IDENTIFIER}/`, or `plans/testgen-{TICKET-KEY}/`) -- a shared path collides across parallel sessions and commits.
- Leaving a required config key absent instead of `N/A -- <reason>` -- a later grep silently misses an absent key.
- Inventing a non-canonical artifact path instead of binding to the layout reference verbatim.
- Loading both flows' layouts when only one applies (`api-qa-layout` XOR `ui-qa-layout`).

</anti_patterns>

</qa_structure>
