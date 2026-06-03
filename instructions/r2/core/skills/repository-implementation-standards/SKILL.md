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

<success_criteria>

Complete when **all of** the following hold:

- At least one repository standards doc was read (or the user explicitly confirmed none exist and supplied substitute standards per `<failure_handling>`).
- Reference example paths from the codebase were recorded in the phase artifact per `<output_format>`.
- Any doc-vs-code conflicts were surfaced to the user and either resolved with a documented rule OR recorded as explicit assumptions in the artifact.
- The phase artifact's `## Repository Standards Alignment` section is present with every required subsection populated (or marked `None — <reason>`).

The skill is **NOT complete** if the artifact lacks the alignment section, the standards docs were skipped without user-confirmed substitution, or conflicts were silently ignored.

</success_criteria>

<input_contract>

| Input | Required? | Source | Used by |
|---|---|---|---|
| Phase artifact path | **required** | Parent workflow phase file (e.g. `agents/plans/aqa-<test-name>.md`, `agents/qa/{IDENTIFIER}/raw-data.md`) | Step 6 — destination for the `## Repository Standards Alignment` section |
| Standards docs at non-default paths | optional | Parent workflow or user | Step 1 — overrides the repo-root default lookup |
| Substitute standards (when docs absent) | required only if step-2 GATE fires | User response to the ask-once prompt | Step 3 — extract rules from user-supplied source |
| Standards docs at repo root | self-discovered | This skill walks `project_description.md`, `CONTEXT.md`, `ARCHITECTURE.md`, `IMPLEMENTATION.md` | Step 1 — default lookup |
| Codebase | self-discovered | Workspace | Step 4 — closest-example search |

**Required-input failure rule.** If the phase artifact path is not supplied, this skill cannot write its alignment record — apply `<failure_handling>` "missing artifact path". Do NOT pick a default path; downstream handoff skills look for the record where the parent named it.

</input_contract>

<process>

1. Locate and read, when present: `project_description.md`, `CONTEXT.md`, `ARCHITECTURE.md`, `IMPLEMENTATION.md` (repo root or paths given by the workflow or user).
2. GATE: if none of the standard docs in step 1 exist or are readable, stop implementation and ask the user to provide substitute standards before continuing.
3. Extract explicit rules: test layout, naming, fixtures, auth/session handling, logging, lint/format commands, forbidden patterns.
4. Search the codebase for the closest existing examples (same framework, same layer) before writing new files.
5. GATE: if standard docs disagree with dominant code patterns, flag the conflict to the user and pick the documented rule unless the user directs otherwise.
6. Record in the phase artifact which files were used as references (paths only, no large quotes).

</process>

<output_format>

Append the following section to the parent-supplied phase artifact (path from `<input_contract>`):

```markdown
## Repository Standards Alignment

### Docs read
- project_description.md: [path | not present | not readable — <reason>]
- CONTEXT.md: [path | not present]
- ARCHITECTURE.md: [path | not present]
- IMPLEMENTATION.md: [path | not present]
- Substitute standards (when above absent): [user-supplied source description | N/A]

### Rules extracted
- **Test layout:** [<rule from docs>]
- **Naming:** [<rule>]
- **Fixtures / helpers / page objects:** [<rule>]
- **Auth / session handling:** [<rule>]
- **Logging:** [<rule>]
- **Lint / format commands:** [<exact command(s)>]
- **Forbidden patterns:** [<list, or `None documented`>]
- (Use `Not documented — <impact>` for any unspecified rule rather than inventing)

### Reference example files (closest existing patterns)
- [<path/to/example/file>] — used as template for: [test layout / page-object shape / helper pattern / etc.]
- [<path/to/example/file>] — used as template for: [...]
- (Paths only, no large quotes — keep ≤ 6 entries)

### Conflicts and resolutions
- [Where docs disagreed with dominant code patterns] — resolution: [documented rule applied / user directed otherwise / recorded as assumption]
- (If none: `None — sources consistent.`)
```

**Concrete example** of a populated section:

```markdown
## Repository Standards Alignment

### Docs read
- project_description.md: ./project_description.md
- CONTEXT.md: not present
- ARCHITECTURE.md: ./ARCHITECTURE.md
- IMPLEMENTATION.md: not present
- Substitute standards: N/A

### Rules extracted
- **Test layout:** Playwright specs under `tests/e2e/<feature>/<scenario>.spec.ts`; page objects under `tests/pages/`.
- **Naming:** `kebab-case.spec.ts` for tests; `PascalCase` for page-object classes.
- **Fixtures / helpers / page objects:** `tests/fixtures/auth.ts` for token acquisition; reuse `BasePage` from `tests/pages/base.page.ts` for navigation.
- **Auth / session handling:** Bearer token from env var `E2E_AUTH_TOKEN`; helper `AuthHelper.adminToken()` for admin tests.
- **Logging:** Playwright's built-in `test.info().annotations` — no custom logger.
- **Lint / format commands:** `npm run lint` (ESLint) + `npm run format` (Prettier).
- **Forbidden patterns:** Not documented — no explicit list.

### Reference example files (closest existing patterns)
- `tests/e2e/checkout/payment.spec.ts` — used as template for: test layout + describe/test structure.
- `tests/pages/checkout.page.ts` — used as template for: page-object shape.
- `tests/fixtures/auth.ts` — used as template for: auth helper.

### Conflicts and resolutions
- `IMPLEMENTATION.md` is absent but `tests/e2e/checkout/payment.spec.ts` uses `test.describe.serial(...)` while `ARCHITECTURE.md` says "tests should be parallelizable" — surfaced to user; user directed: keep `serial` for the new test (matches existing pattern), record as assumption.
```

</output_format>

<safety_boundaries>

This skill **reads** repository docs (`project_description.md`, `CONTEXT.md`, `ARCHITECTURE.md`, `IMPLEMENTATION.md`) and the codebase. It **writes only** the `## Repository Standards Alignment` section into the parent-supplied phase artifact (path from `<input_contract>`).

It does **not**:

- Modify the standard docs themselves, even when they conflict with code patterns — conflicts are surfaced and recorded, not "fixed"
- Modify production code, tests, page objects, or any source file under analysis
- Modify other sections of the phase artifact (the alignment section is appended, not edited around)
- Run lint/format/test commands against the repo — those belong to implementation phases that consume this skill's output

Reading is unbounded (any file in the repo may be sampled as a "closest example"); writing is single-section-of-one-file.

</safety_boundaries>

<failure_handling>

- **Missing artifact path** per `<input_contract>` (parent did not supply where to write the alignment section): stop, report `repository-implementation-standards: phase artifact path not supplied — see <input_contract>`. Do NOT write to a guessed path; downstream handoff skills locate the record where the parent named it.
- **Standards docs all absent AND user provides no substitute** (step-2 GATE re-ask returns no substitute source): stop, record `Phase blocked: no standards docs found and no substitute supplied` in the parent's state file (if path known), surface to the parent workflow. Do NOT proceed with model-default conventions — that's the exact failure mode this skill exists to prevent.
- **One or more docs unreadable / corrupt** (parse error, permission denied): record the affected doc as `not readable — <reason>` in the `### Docs read` subsection. Proceed with the readable docs; if all docs in step 1 are unreadable, treat as "all absent" and apply the above rule.
- **No closest example found in codebase** (step 4 returns nothing — empty repo, brand-new test type): record `Reference example files: None — no closest existing pattern in codebase; following docs alone` in the artifact. Continue; this is acceptable but lowers confidence.
- **Doc-vs-code conflict — user does not respond** to the step-5 ask: record the conflict as an explicit assumption (`assumption: applied documented rule <X>; code pattern <Y> may diverge`) in the `### Conflicts and resolutions` subsection. Apply the documented rule. Do NOT pick the code pattern over the doc unless the user explicitly directs otherwise.
- **Doc partially specifies a rule** (e.g., names a directory but not a file-naming convention): record the documented portion in `### Rules extracted` and mark the missing portion `Not documented — <impact>`. Do NOT invent a convention; downstream phases will surface gaps.

</failure_handling>

<validation_checklist>

- At least one of the standard doc files was read, or the user confirmed none exist and provided substitute standards
- Implementation matches documented directory layout, naming, and tooling commands when documented
- New code reuses or extends existing helpers/fixtures/page objects when applicable instead of duplicating
- Conflicts between docs and code were surfaced to the user or documented as assumptions
- **`## Repository Standards Alignment` section written** to the parent-supplied phase artifact per `<output_format>` — all four subsections present (Docs read / Rules extracted / Reference example files / Conflicts and resolutions), empty fields marked `None` or `Not documented — <impact>`, not silently blank
- **Reference example file list capped at ≤ 6 entries** with paths only (no large quoted code blocks)
- **No source files were modified** outside the alignment section append — safety boundary respected

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
