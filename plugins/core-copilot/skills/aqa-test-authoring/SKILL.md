---
name: aqa-test-authoring
description: Implement automated test following project standards, integrating page objects and assertions from test plan.
tags: ["aqa", "test-authoring", "implementation"]
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

1. **Add to existing** — IF a closely related test (same feature area, same setup pattern, same page-object scope) exists AND the file is **under the project's per-file size threshold** (from `<input_contract>` repo standards — `project_description.md` / `CONTEXT.md`; fallback if no project threshold: **≤ 400 lines**).
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

- For every assertion from the test plan's requirements that this skill could **not** implement (no available page-object method to express it, no observable signal in the UI, the assertion needs a precondition the test can't establish, etc.) record it in the output's `### Uncovered Assertions` section with the reason. **Do NOT silently drop unimplementable assertions.**

  **Worked example (implemented vs uncovered):**
  - ✅ **Implemented:** plan assertion `"After submit: error banner shows 'Invalid email'"` → page-object exposes `LoginPage.errorBanner.textContent()` → test calls `expect(await loginPage.errorBanner.textContent()).toBe('Invalid email')`. Counts as one implemented assertion.
  - ❌ **Uncovered (record, don't drop):** plan assertion `"Audit log records the failed login attempt"` → no UI surface for the audit log; no helper to query the backend log; assertion is not testable from this UI test. Record in `### Uncovered Assertions` as `Audit log records the failed login attempt — reason: no UI signal; needs backend log query or separate audit-log test`. **Silent drop forbidden** — the audit log assertion stays in the Uncovered list so downstream phases see the gap.
- For every place where user instructions conflicted with repo docs (per `<input_contract>` precedence): record the override in `### Conflicts and Precedence`. Empty section is acceptable; absence of the section is not.

## 5. Emit Hand-off Output

Append a `## Test Implementation` section to the test plan using the verbatim template in [references/test-implementation-template.md](references/test-implementation-template.md). Five required subsections in order — **Test File**, **Implementation Summary**, **Uncovered Assertions**, **Conflicts and Precedence**, **Validation** — populated from steps 1–4. Empty sections use `None — <reason>` per the template; never blank.

</process>

<success_criteria>

High-level done-condition. Item-level checks: `<validation_checklist>`.

**Complete when:** step 4 validation passed → step 5 emitted the `## Test Implementation` section → every `<validation_checklist>` item is satisfied. Specifically: test file written; every plan assertion implemented OR recorded in `### Uncovered Assertions`; no application source or page-object files modified; all five required subsections (per step 5) populated; lint/format clean.

**NOT complete** if step 5 emitted before step 4's validation passed; any plan assertion is missing from both the test file AND `### Uncovered Assertions` (silent drop — see step 4); any application source or page-object file was modified (escalate per `<failure_handling>`); any required subsection blank instead of `None — <reason>`; or lint failed with no recorded resolution.

</success_criteria>

<output_format>

Section header: `## Test Implementation` appended to the test plan (`agents/plans/aqa-<test-name>.md` or the calling-workflow-supplied path). Subsection list + verbatim template + `None — <reason>` empty-section rule: see process step 5.

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

7-case full list lives in [references/test-implementation-template.md "Failure Handling — full case list"](references/test-implementation-template.md#failure-handling--full-case-list-referenced-from-skillmd-failure_handling) — load on demand when a stop condition is hit (steps 2–4). Cases: test plan missing/empty, required selector/method missing, required selector itself missing, unimplementable assertion, `<test-name>` unresolved, user-instructions-vs-repo-docs conflict, test plan's location-decision references a non-existent file. Each case carries a stop/route/record discipline; do NOT improvise — load the catalog.

</failure_handling>

<validation_checklist>

8-item full list lives in [references/test-implementation-template.md "Validation Checklist — full item list"](references/test-implementation-template.md#validation-checklist--full-item-list-referenced-from-skillmd-validation_checklist) — load on demand at step 4 (pre-emit gate). Items: imports + project order, every-assertion-implemented-or-uncovered, page-objects-only, no-app-source-or-page-object-modifications, repo-docs-win precedence + conflict recorded, no hardcoded sleeps, lint/format clean, hand-off output emitted. Run before step 5 emits.

</validation_checklist>

<pitfalls>
(Each item is a pointer; the rule lives in the cited section.)
- Bypassing page objects → `<safety_boundaries>` (no direct selector use).
- Inventing/extending page-object selectors/methods inline → `<failure_handling>` "required selector/method missing" (selector-implementation phase owns it).
- Silently dropping unimplementable assertions → `<process>` step 4 Uncovered Assertions rule.
- Missing assertions from requirements phase → `<process>` step 1 review + step 4 carry-forward.
- Silently overriding repo docs with user instructions → Conflict Precedence Rank in `references/test-implementation-template.md` (repo docs win).
- Not matching existing test patterns → `<process>` step 3a.
- Hardcoded waits → `<process>` step 3c (no sleeps).
- Editing application source / page-object files → `<safety_boundaries>` (only test files + plan section).
- Skipping lint validation → `<validation_checklist>` "lint/format clean" item.
</pitfalls>

</aqa-test-authoring>
