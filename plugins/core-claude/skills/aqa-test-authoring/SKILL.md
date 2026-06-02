---
name: aqa-test-authoring
description: Implement automated test following project standards, integrating page objects and assertions from test plan.
tags: []
baseSchema: docs/schemas/skill.md
---

<aqa-test-authoring>

<role>Test automation implementation specialist</role>

<when_to_use_skill>
Create automated test code integrating all page objects, assertions, and patterns established in previous analysis phases.
</when_to_use_skill>

<prerequisites>
- Complete test plan (requirements, assertions, code analysis, selectors) — default path `agents/plans/aqa-<test-name>.md`
- Page objects updated with all required selectors (owned by `aqa-selector-management` Part B)
- Project coding standards understood (`repository-implementation-standards` + repo docs)
- User instructions from `agents/user-instructions/` applied
</prerequisites>

<input_contract>

The calling workflow supplies paths. Defaults this skill recognizes when paths are not provided:

| Input | Canonical path | Required content |
|---|---|---|
| Test plan | `agents/plans/aqa-<test-name>.md` | `## Code Analysis` summary, assertions, selector management section (Part A inventory + Part B implementation record), test location decision |
| Code analysis report | `agents/plans/aqa-<test-name>-code-analysis.md` | Framework, project structure, similar tests, reusable utilities, test location decision rationale |
| Page-object files | Paths recorded in the test plan's `## Selector Management` → Implementation subsection | Selector definitions + helper methods named by Part A's inventory |
| User instructions | `agents/user-instructions/` (read when present) | Custom matchers, style preferences, setup/teardown conventions |
| Repo standards | `project_description.md`, `CONTEXT.md`, `ARCHITECTURE.md`, `IMPLEMENTATION.md` | Authoritative project conventions |

**Existence + scope validation** runs as step 1.0 GATE (a sub-step prepended to step 1's review). On any failure: stop, report which prerequisite is missing to the calling workflow, do not author test code from incomplete inputs.

- Test plan exists and is non-empty.
- Plan's selector management Implementation subsection lists the page-object paths AND those page-object files actually exist with the selectors/methods Part A's inventory names. If any selector/method is missing, apply `<failure_handling>` "required selector/method missing".
- Plan's assertions list is non-empty; each entry is concrete enough to map to a test action (not "verifies behavior" with no acceptance criteria). If unmappable, apply `<failure_handling>` "unimplementable assertion".
- `<test-name>` slug resolves per `aqa-flow-code-analysis.md` `<naming_convention>`.

**Conflict precedence.** Repo docs win on conflict (single source of truth). The full rank:

1. **Repo docs** — `project_description.md`, `CONTEXT.md`, `ARCHITECTURE.md`, `IMPLEMENTATION.md`. Win on every conflict.
2. **User instructions** — `agents/user-instructions/`. Apply on top of repo docs only where repo docs are silent; never override repo docs.
3. **This skill's authoring patterns** — apply only where 1 and 2 are silent.
4. **Test plan's recorded decisions** (test location, file mapping, similar-test patterns) — informational; if they conflict with repo docs, repo docs win and the conflict is recorded in step 9's Uncovered/Conflicts section.

When this skill detects a conflict between user instructions and repo docs, follow repo docs and record the override in the implementation notes — do not silently apply either.

</input_contract>

<process>

## 1. Review Implementation Plan

Consolidate from test plan:
- Test steps and expected results
- Explicit assertions
- Test location decision (new file or add to existing)
- Similar test patterns to follow
- Available page objects and methods
- Reusable utilities
- User instructions to apply

Create outline: test name, setup requirements, dependencies, structure.

## 2. Determine File Location

- **Add to existing**: closely related test exists, file not too large
- **Create new**: new feature area or logical separation needed

If existing: read file, find appropriate insertion point.
If new: follow file naming convention from project standards.

## 3. Author Test Code

This step encompasses the entire authoring pass — structure, setup, actions, assertions, cleanup, documentation. The sub-bullets are standard test-writing sub-actions, not separate process steps; execute them as one cohesive pass that matches the project patterns identified in step 1.

**3a. Test structure** — match project patterns exactly: import order (framework → pages → utilities → types), test-suite organization (describe blocks), test hooks (`beforeEach`/`afterEach`/`beforeAll`/`afterAll`), shared setup/fixtures.

**3b. Setup** — based on preconditions: initialize page objects, use reusable utilities (login helpers, navigation), navigate to starting point, perform prerequisite actions.

**3c. Test actions** — for each test step: use page-object methods when available; add appropriate waits (page loads, element visibility, network idle); follow action patterns from similar tests; **no hardcoded sleeps/timeouts**.

**3d. Assertions** — for each assertion from requirements: use project assertion style (expect, custom matchers); make assertions specific and measurable; include assertion messages if project convention; follow patterns from similar tests.

**3e. Cleanup** (only if test modifies state or creates data) — `try/finally` or `afterEach` hooks; match cleanup patterns from similar tests.

**3f. Documentation** — TestRail case reference as comment; brief test description; inline comments only for complex/non-obvious logic.

## 4. Validate and Record Uncovered Assertions

Run the `<validation_checklist>` below. Then, **before declaring complete**:

- For every assertion from the test plan's requirements that this skill could **not** implement (no available page-object method to express it, no observable signal in the UI, the assertion needs a precondition the test can't establish, etc.) record it in the output's `### Uncovered Assertions` section with the reason. **Do NOT silently drop unimplementable assertions** — overstating coverage to downstream phases is the failure mode this rule guards against.
- For every place where user instructions conflicted with repo docs (per `<input_contract>` precedence): record the override in `### Conflicts and Precedence`. Empty section is acceptable; absence of the section is not.

</process>

<output_format>

Append a `## Test Implementation` section to the test plan (`agents/plans/aqa-<test-name>.md` or the path the calling workflow named). The verbatim template lives in [references/test-implementation-template.md](references/test-implementation-template.md) — load on demand at step 4.

Required subsections in order: **Test File**, **Implementation Summary**, **Uncovered Assertions**, **Conflicts and Precedence**, **Validation**. Empty sections use the explicit `None — <reason>` line from the template — never left blank.

</output_format>

<safety_boundaries>

This skill writes **only** to test files (and to the test plan's `## Test Implementation` section as the record). It does **not**:

- Edit application source code under test (production code, frontend components, backend services)
- Edit, create, or extend page-object files — those are owned by `aqa-selector-management` Part B. If a selector or page-object method is missing, surface it via `<failure_handling>` and stop; do not author the missing selector inline.
- Modify the code-analysis report, project description, repo docs, or user-instructions files
- Modify selector strategy decisions recorded in the test plan's `## Selector Management` section

If the test plan's selector inventory turns out to be incomplete during authoring, do NOT silently extend page objects or invent selectors. Apply `<failure_handling>` "required selector/method missing" and ask the calling workflow to re-run the selector phase.

</safety_boundaries>

<failure_handling>

- **Test plan missing or empty** at `agents/plans/aqa-<test-name>.md` (or workflow-supplied path): stop, report `aqa-test-authoring: test plan missing/empty at <path>`. Do not author from incomplete inputs.
- **Required selector or page-object method missing** (test plan's selector inventory promises a method that isn't actually in the referenced page-object file): stop authoring the affected test action, record `aqa-test-authoring: page-object method <Class.method> referenced by plan but not found in <file>` in the output's Uncovered Assertions section, and ask the calling workflow to re-run Phase 5 (selector implementation). Do NOT extend the page object inline (safety boundary).
- **Required selector itself missing** (Part A inventory marked an interaction as resolved but the referenced selector isn't in the page object): same as above — Phase 5 owns it; do not invent the selector.
- **Unimplementable assertion** (an assertion from requirements has no observable UI signal, no available helper, or requires a precondition the test cannot establish): record it in `### Uncovered Assertions` with the specific reason. Do NOT silently drop it from coverage.
- **`<test-name>` unresolved or ambiguous**: stop, ask the calling workflow to resolve the slug per `aqa-flow-code-analysis.md` `<naming_convention>`.
- **Conflict between user instructions and repo docs**: follow repo docs per `<input_contract>` precedence, record the override in `### Conflicts and Precedence`. Never silently apply either side.
- **Test plan's location decision references a file the project layout doesn't have** (file mapping says "add to `tests/checkout/payment.spec.ts`" but no such file exists): stop, report the mismatch, ask the calling workflow whether to fall back to "create new file" with the same name or revisit the Phase 3 location decision. Do not silently create the file under a guessed path.

</failure_handling>

<validation_checklist>

Run as part of step 9 before declaring complete. All items must hold:

- **Imports correct and follow project order** (framework → pages → utilities → types, or whatever the existing patterns dictate).
- **Every assertion from the plan is either implemented OR listed in `### Uncovered Assertions`** with a reason. Silent drops are forbidden.
- **Page objects used for all UI interactions** — no direct selector use in test code (safety boundary).
- **No application source or page-object files were modified** by this skill. The only writes are the test file and the test plan's `## Test Implementation` section.
- **Coding standards followed** per `<input_contract>` precedence (repo docs win). Any user-instruction override is recorded in `### Conflicts and Precedence`.
- **No hardcoded sleeps/timeouts** — proper wait strategies only (per step 5).
- **Lint/format clean** on touched files; record the exact command run in the implementation notes.
- **Hand-off output emitted** per `<output_format>` — Test File / Implementation Summary / Uncovered Assertions / Conflicts and Precedence / Validation all populated (or `None` with reason).

</validation_checklist>

<pitfalls>
- Bypassing page objects to use selectors directly — safety-boundary violation
- Inventing or extending page-object selectors/methods inline when the inventory is incomplete — that's `aqa-selector-management` Part B's responsibility; stop and route back
- Silently dropping assertions that can't be implemented — record them in `### Uncovered Assertions` instead
- Missing assertions from requirements phase
- Ignoring user instructions from `agents/user-instructions/` AND silently applying them over repo docs — both are wrong; precedence is repo docs > user instructions > skill defaults
- Not matching existing test patterns (imports, structure, naming)
- Adding hardcoded waits instead of proper wait strategies
- Editing application source or page-object files during authoring — only test files are writable
- Skipping linting validation
</pitfalls>

</aqa-test-authoring>
