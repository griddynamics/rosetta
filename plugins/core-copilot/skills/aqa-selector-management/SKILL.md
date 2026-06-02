---
name: aqa-selector-management
description: Identify required UI selectors from frontend code or page source (Part A), determine selector strategy, and implement selectors in page objects following project conventions (Part B). Part A and Part B are invoked by separate phases and may run independently.
tags: []
baseSchema: docs/schemas/skill.md
---

<aqa-selector-management>

<role>UI selector identification and page object implementation specialist</role>

<when_to_use_skill>
Map test steps to required UI interactions, identify missing selectors, find selectors from source code or page HTML (Part A), and implement them in page objects (Part B).

**Part A / Part B scope rule (canonical — referenced from `<input_contract>` and `<safety_boundaries>`):** Part A (steps 1–4) is **read-only identification**, invoked by `aqa-flow-selector-identification`. Part B (steps 5–7) **writes page-object files only**, invoked by `aqa-flow-selector-implementation`. The calling workflow names which part runs; the parts must not be conflated in one phase. Design rationale for the single-file design is in [references/strategy-and-template.md](references/strategy-and-template.md#why-one-file-design-rationale--maintainer-facing).
</when_to_use_skill>

<prerequisites>
- Test plan with assertions defined (default path: `agents/plans/aqa-<test-name>.md`)
- Code analysis complete (page object inventory available — `agents/plans/aqa-<test-name>-code-analysis.md`)
- Frontend source code path known, OR page-sources directory captured at `agents/plans/aqa-<test-name>-page-sources/`
</prerequisites>

<input_contract>

All paths use the AQA workflow's canonical `<test-name>` slug — **not** `{TICKET-KEY}` (which is a TestGen convention not present in AQA naming).

| Input | Canonical path | Used by | Source |
|---|---|---|---|
| Test plan | `agents/plans/aqa-<test-name>.md` | Part A step 1 (interaction map), Part A step 2 (existing-selector check) | Phase 1 (data collection) |
| Code analysis report | `agents/plans/aqa-<test-name>-code-analysis.md` | Part A step 2 (page-object inventory), Part B step 5 (existing patterns) | Phase 3 (code analysis) |
| Page sources directory | `agents/plans/aqa-<test-name>-page-sources/` | Part A step 4 (page-source HTML analysis) | Phase 4 step 4.2 of `aqa-flow-selector-identification.md` |
| Frontend source path | Workflow-supplied (e.g. `RefSrc/<repo>/`) | Part A step 3 (component scan) | Calling workflow or user |
| Part A inventory (Part B input) | `## Selector Management` section in `agents/plans/aqa-<test-name>.md` (or a separate artifact the calling workflow names) | Part B steps 5–7 | This skill's Part A output |

**Existence + scope validation:**
- **Part A — page-sources directory** at the canonical path MUST be validated to exist before step 4 runs (page-source HTML analysis). If missing AND frontend source is also unavailable, apply the `<failure_handling>` "no selector source" rule — do NOT fabricate selectors from naming guesses.
- **Part B — Part A inventory** MUST exist (in the test plan's `## Selector Management` section, OR the artifact the calling workflow names) before step 5 runs. If missing, apply the `<failure_handling>` "Part A inventory missing" rule.
- **`<test-name>` slug resolved** per `aqa-flow-code-analysis.md` `<naming_convention>` (parsed from Phase 1 plan filename or read from `agents/aqa-state.md`). If unresolved, stop and ask the calling workflow.

**Conflict precedence.**
- Selector strategy + page-object accessor/getter/method conventions = **this skill** (Part A step 4 priority list; Part B steps 5–6 pattern-matching rules).
- General repo hygiene (file structure, import ordering, naming case, lint rules) = **repository standards** (`repository-implementation-standards` skill, repo docs). Repo docs win on conflict.
- If selector strategy here conflicts with a project-specific override recorded in `project_description.md` / `agents/user-instructions/`, repo docs win; record the override in the implementation notes.

</input_contract>

<process>

## Part A: Selector Identification

### 1. Map Test Steps to Interactions

For each test step and assertion, list required UI interactions:
- Elements to click (buttons, links, tabs)
- Elements to type into (inputs, textareas)
- Elements to select from (dropdowns, radios, checkboxes)
- Elements to verify (text, images, status indicators)
- Elements to wait for (spinners, notifications)

### 2. Check Existing Page Objects

For each interaction, check the code-analysis report's page-object inventory:
- Mark as available, missing, or uncertain
- Note which page object should contain missing selectors
- Record element type and intended usage (click, verify, type)

### 3. Search Frontend Source Code (if available)

For missing selectors, search frontend components:
- Look for `data-testid`, `data-test` attributes first
- Check component props and interfaces
- Identify stable `id`, `className`, ARIA attributes
- Note element types and line numbers
- Document which selectors were found vs still missing

If ALL found, skip page source request.

### 4. Analyze Page Source HTML (if needed)

Only when frontend code unavailable or selectors still missing:

Validate the page-sources directory exists at `agents/plans/aqa-<test-name>-page-sources/`. If missing, apply `<failure_handling>` — do NOT proceed to a selector guess.

For each missing selector, determine best strategy using the **4-tier selector strategy table** in [references/strategy-and-template.md](references/strategy-and-template.md#selector-strategy--4-tier-table). The reference also contains the **good-vs-fragile worked example pair** (data-testid hook vs deep MUI structural path) and the exhaustive flag-patterns list (dynamic IDs, non-unique classes, deep structural paths, framework-generated class names).

Single source of truth: the tier ordering, the example pair, and the fragile-pattern list live in that reference. Do NOT restate them here or in any output — link back to the reference.

## Part B: Selector Implementation

### 5. Extend Existing Page Objects

For each page object needing new selectors, follow the mechanics in [references/strategy-and-template.md](references/strategy-and-template.md#part-b-step-5--extend-existing-page-objects-referenced-from-skillmd-step-5) — match existing patterns (access modifiers, naming, formatting), add selectors in logical grouping, add helper methods (getters, click/action, visibility checks) if the page object uses them.

### 6. Create New Page Objects (if needed)

When the Part A inventory marks a page object as "to create", follow the mechanics in [references/strategy-and-template.md](references/strategy-and-template.md#part-b-step-6--create-new-page-objects-referenced-from-skillmd-step-6) — use an existing page object as the structural template, copy constructor/import/class patterns exactly, follow project naming, add to barrel/index exports if used.

### 7. Validate Implementation

For each modified/created file:
- Selectors match the values identified in Part A
- Naming follows project conventions
- Imports correct and organized
- No syntax or linting errors
- Helper methods follow existing patterns
- **Fragile-selector gate:** any selector flagged in Part A step 4 as fragile MUST either (a) have been replaced with a stable alternative agreed with the user, or (b) be surfaced to the calling workflow for explicit approval before commit — NOT silently implemented.

</process>

<output_format>

Document selectors in the test plan (or the artifact the calling workflow names), using the **`## Selector Management` section template** in [references/strategy-and-template.md](references/strategy-and-template.md#output-template----selector-management--section).

Required subsections in the order the template defines them: Interaction Map, Selector Availability, Identified Selectors, Fragile Selectors Flagged, Implementation (Part B only). The reference holds the canonical field shapes and field-name vocabulary — do not invent variants here.

</output_format>

<safety_boundaries>

This skill writes **only** to page-object files (and to the test plan's `## Selector Management` section as Part A's output record). It does **not**:

- Edit test files, fixtures, utility files, or any source outside the page-object layer
- Modify the frontend source code (even to add a missing `data-testid` — that's a request to the frontend team, not an action this skill takes)
- Edit the code-analysis report, project description, or repo docs
- Commit fragile selectors flagged in Part A step 4 without explicit approval recorded in the output (per Part B step 7's fragile-selector gate)

**Part A / Part B scope** is governed by the canonical rule in `<when_to_use_skill>` — not restated here. Enforcement: a Part A invocation MUST NOT create or modify page-object files; a Part B invocation consumes Part A's recorded inventory rather than re-running the analysis.

**Fragile-selector discipline.** Any selector tagged fragile in Part A is surfaced for approval, not silently implemented. Silently committing a fragile selector is a safety-boundary violation and is the primary failure mode this rule guards against.

</safety_boundaries>

<failure_handling>

- **No selector source available** — page-sources directory at `agents/plans/aqa-<test-name>-page-sources/` does not exist AND frontend source path is unavailable: stop Part A step 4, report `aqa-selector-management: no selector source available — need page sources captured per Phase 4 step 4.2 or frontend source path` to the calling workflow. Do NOT fabricate selectors from naming guesses, screenshots, or test step text alone.
- **Page sources missing** (frontend source IS available, page sources missing): proceed with frontend-only analysis (step 3), record `Page sources: not available — selectors derived from frontend source only` in the output, mark any selector that would benefit from DOM verification (dynamic state, conditional rendering, iframe/shadow DOM) with `Confidence: low — page-source verification recommended`.
- **Frontend source missing** (page sources ARE available, frontend missing): proceed with page-source-only analysis (step 4), record the partial-coverage fact in the output. Acceptable confidence; page sources are the more authoritative DOM source.
- **Selector cannot be resolved in any available source** (interaction maps to an element neither source contains): do NOT invent a selector. Stop Part A for that specific element, record it in the Selector Availability section as `❌ <PageObject.selector> — UNRESOLVABLE: <reason>`, and ask the calling workflow whether to (a) request additional source/page captures, (b) defer the assertion, or (c) drop the test step.
- **`<test-name>` unresolved or ambiguous:** stop, ask the calling workflow to resolve the slug per `aqa-flow-code-analysis.md` `<naming_convention>`. Do not guess at the page-sources path.
- **Part B-only failure branches** (page-object file not found in step 5, Part A inventory missing): load on Part B invocations from [references/strategy-and-template.md](references/strategy-and-template.md#part-b-failure_handling-extensions-referenced-from-skillmd-failure_handling) — Part A invocations do not carry these.

</failure_handling>

<validation_checklist>

Run before declaring complete. Items conditional on Part A vs Part B scope.

**Part A (identification phase) — inline:**
- Interaction Map populated for every test step + assertion in the plan
- Every interaction has a Selector Availability entry (✅ EXISTS, ❌ MISSING, or ❌ UNRESOLVABLE with reason)
- Every identified selector has Type, Source (with file/line citation), Usage, and Stability fields
- Every selector tagged Stability=fragile has a one-line reason AND a recommendation (e.g. "request data-testid from frontend team")
- Source-availability accounted for: if page sources OR frontend source was missing, the output records `not available` for that source — no silent omissions
- No source files modified (Part A is read-only)

**Part B (implementation phase) — load on Part B invocations only:** see [references/strategy-and-template.md](references/strategy-and-template.md#part-b-validation_checklist-referenced-from-skillmd-validation_checklist). Part A invocations do not carry the Part B checklist.

</validation_checklist>

<pitfalls>

Shared + Part A pitfalls — inline:

- Guessing selectors without verifying in source code or HTML — fabrication
- Using fragile selectors (dynamic IDs, deep structural paths, framework-generated classes) without flagging them per step 4
- Skipping frontend code search and going straight to page source request
- Using a `{TICKET-KEY}` path instead of `<test-name>` — `{TICKET-KEY}` is a TestGen convention not present in AQA naming

**Part B-only pitfalls** (silent fragile commit, breaking page-object patterns, re-running Part A in Part B, modifying non-page-object files, skipping lint): load on Part B invocations from [references/strategy-and-template.md](references/strategy-and-template.md#part-b-pitfalls-extensions-referenced-from-skillmd-pitfalls). Part A invocations do not carry these.

</pitfalls>

</aqa-selector-management>
