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
- Page objects updated with all required selectors (owned by the **selector-implementation phase**)
- Project coding standards understood (`repository-implementation-standards` + repo docs)
- User instructions from `agents/user-instructions/` applied
</prerequisites>

<input_contract>

The calling workflow supplies paths. Defaults this skill recognizes when paths are not provided:

| Input | Canonical path | Required content |
|---|---|---|
| Test plan | `agents/plans/aqa-<test-name>.md` | `## Code Analysis` summary, assertions, selector management section (inventory + implementation record from the selector-identification + selector-implementation phases), test location decision |
| Code analysis report | `agents/plans/aqa-<test-name>-code-analysis.md` | Framework, project structure, similar tests, reusable utilities, test location decision rationale |
| Page-object files | Paths recorded in the test plan's `## Selector Management` → Implementation subsection | Selector definitions + helper methods named by the selector-identification inventory |
| User instructions | `agents/user-instructions/` (read when present) | Custom matchers, style preferences, setup/teardown conventions |
| Repo standards | `project_description.md`, `CONTEXT.md`, `ARCHITECTURE.md`, `IMPLEMENTATION.md` | Authoritative project conventions |

**Step 1.0 GATE** (existence + scope validation, runs as a sub-step prepended to step 1): full criteria + per-failure routing live in [references/test-implementation-template.md "Step 1.0 GATE"](references/test-implementation-template.md#step-10-gate--existence--scope-validation-referenced-from-skillmd-input_contract) — load on demand at step 1.

**Conflict precedence ("repo docs win"):** single source of truth lives in [references/test-implementation-template.md "Conflict Precedence Rank"](references/test-implementation-template.md#conflict-precedence-rank-referenced-from-skillmd-input_contract). The skill's other blocks (`<safety_boundaries>`, `<failure_handling>`, `<validation_checklist>`, `<pitfalls>`) reference that rank by the phrase "repo docs win" rather than restating the 4-level rank.

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

Deterministic branch — evaluate in order, first match wins:

1. **Add to existing** — IF a closely related test (same feature area, same setup pattern, same page-object scope) exists AND the file is **under the project's per-file size threshold** (from `<input_contract>` repo standards — `project_description.md` / `CONTEXT.md`; if no project threshold is documented, fall back to **≤ 400 lines** — the same anchor used by the codebase-analysis phase's location rule, kept in sync via the workflow rather than by citing the sibling skill's internal step number).
2. **Create new** — IF (a) the feature is a new area, OR (b) no closely related test exists, OR (c) the closest related file would exceed the threshold after addition, OR (d) the existing file's structure does not accommodate the new test's setup/teardown shape.
3. **Ambiguous (tie-break: prefer Create new)** — IF the rules above leave the decision unclear (related-but-not-closely, file near the threshold, structural fit unclear), default to **Create new**. Record the ambiguity reason in step 5's `### Conflicts and Precedence` section so the test plan reflects the placement decision.

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

Run the `<validation_checklist>` below. Then, **before proceeding to step 5**:

- For every assertion from the test plan's requirements that this skill could **not** implement (no available page-object method to express it, no observable signal in the UI, the assertion needs a precondition the test can't establish, etc.) record it in the output's `### Uncovered Assertions` section with the reason. **Do NOT silently drop unimplementable assertions** — overstating coverage to downstream phases is the failure mode this rule guards against.

  **Worked example (implemented vs uncovered):**
  - ✅ **Implemented:** plan assertion `"After submit: error banner shows 'Invalid email'"` → page-object exposes `LoginPage.errorBanner.textContent()` → test calls `expect(await loginPage.errorBanner.textContent()).toBe('Invalid email')`. Counts as one implemented assertion.
  - ❌ **Uncovered (record, don't drop):** plan assertion `"Audit log records the failed login attempt"` → no UI surface for the audit log; no helper to query the backend log; assertion is not testable from this UI test. Record in `### Uncovered Assertions` as `Audit log records the failed login attempt — reason: no UI signal; needs backend log query or separate audit-log test`. **Silent drop forbidden** — the audit log assertion stays in the Uncovered list so downstream phases see the gap.
- For every place where user instructions conflicted with repo docs (per `<input_contract>` precedence): record the override in `### Conflicts and Precedence`. Empty section is acceptable; absence of the section is not.

## 5. Emit Hand-off Output

**Template load point (canonical):** the verbatim template at [references/test-implementation-template.md](references/test-implementation-template.md) is loaded **once at step 5** (the emit step) — `<output_format>` references this load point, not its own.

Append the `## Test Implementation` section to the test plan per `<output_format>`. Populate every required subsection (**Test File**, **Implementation Summary**, **Uncovered Assertions**, **Conflicts and Precedence**, **Validation**) with the values produced by steps 1–4. Empty subsections use the explicit `None — <reason>` line from the template — never left blank.

The skill is complete after step 5 emits and only after step 4's validation passed — full done-condition + NOT-complete clauses live in `<success_criteria>` below.

</process>

<success_criteria>

High-level done-condition. Item-level checks live in `<validation_checklist>` (single source of truth — referenced here, not restated; mirrors the sibling `aqa-test-debugging` pattern).

**Complete when:** step 4 validation passed → step 5 emitted the `## Test Implementation` section to the test plan → every `<validation_checklist>` item is satisfied. Specifically: test file written at the chosen path; every plan assertion was either implemented OR recorded in `### Uncovered Assertions` with reason; no application source or page-object files were modified (safety boundary); the hand-off section has all five required subsections (Test File, Implementation Summary, Uncovered Assertions, Conflicts and Precedence, Validation); lint/format clean on touched files.

**NOT complete** if step 5 emitted before step 4's validation passed; any plan assertion is missing from both the test file AND the `### Uncovered Assertions` section (silent drop); any application source or page-object file was modified by this skill (Phase 5 owns page-object edits — escalate per `<failure_handling>`); the hand-off section has a blank required subsection instead of `None — <reason>`; or lint failed on a touched file with no recorded resolution.

</success_criteria>

<output_format>

Append a `## Test Implementation` section to the test plan (`agents/plans/aqa-<test-name>.md` or the path the calling workflow named). The verbatim template is loaded at the canonical load point declared in **step 5** (see process step 5; not repeated here).

Required subsections in order: **Test File**, **Implementation Summary**, **Uncovered Assertions**, **Conflicts and Precedence**, **Validation**. Empty sections use the explicit `None — <reason>` line from the template — never left blank.

</output_format>

<safety_boundaries>

This skill writes **only** to test files (and to the test plan's `## Test Implementation` section as the record). It does **not**:

- Edit application source code under test (production code, frontend components, backend services)
- Edit, create, or extend page-object files — the **selector-implementation phase** owns those edits. If a selector or page-object method is missing, surface it via `<failure_handling>` and stop; do not author the missing selector inline.
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

Run as part of step 4 before step 5 emits. All items must hold:

- **Imports correct and follow project order** (framework → pages → utilities → types, or whatever the existing patterns dictate).
- **Every plan assertion is implemented OR listed in `### Uncovered Assertions`** per the step-4 silent-drop rule (single source of truth — including the worked example).
- **Page objects used for all UI interactions** — no direct selector use in test code (safety boundary).
- **No application source or page-object files were modified** by this skill. The only writes are the test file and the test plan's `## Test Implementation` section.
- **Coding standards followed** per `<input_contract>` "repo docs win" precedence (canonical rank in references). Any user-instruction override is recorded in `### Conflicts and Precedence`.
- **No hardcoded sleeps/timeouts** — proper wait strategies only (per step 3c).
- **Lint/format clean** on touched files; record the exact command run in the implementation notes.
- **Hand-off output emitted** per `<output_format>` — Test File / Implementation Summary / Uncovered Assertions / Conflicts and Precedence / Validation all populated (or `None` with reason).

</validation_checklist>

<pitfalls>
- Bypassing page objects to use selectors directly — safety-boundary violation
- Inventing or extending page-object selectors/methods inline when the inventory is incomplete — that's the **selector-implementation phase**'s responsibility; stop and route back
- Silently dropping assertions that can't be implemented — see step 4's silent-drop rule (canonical) + the worked example
- Missing assertions from requirements phase
- Ignoring user instructions OR silently applying them over repo docs — see the `<input_contract>` "repo docs win" precedence (canonical rank in references)
- Not matching existing test patterns (imports, structure, naming)
- Adding hardcoded waits instead of proper wait strategies
- Editing application source or page-object files during authoring — only test files are writable
- Skipping linting validation
</pitfalls>

</aqa-test-authoring>
