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

**Part A / Part B usage boundary.** This skill is consumed by two separate AQA phases:
- **Part A — Selector Identification** (steps 1–4): invoked by `aqa-flow-selector-identification`. Read-only analysis; produces the interaction map and selector inventory.
- **Part B — Selector Implementation** (steps 5–7): invoked by `aqa-flow-selector-implementation`. Writes to page-object files only.

The parts may run independently and **must not be conflated in a single phase**. An invocation that loads this skill for the identification phase MUST NOT execute Part B; an invocation for the implementation phase MUST NOT re-execute Part A from scratch (it consumes Part A's recorded inventory). The calling workflow names which part runs; this skill respects that scope.
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

For each missing selector, determine best strategy:

| Tier | Strategy | Example (good) | Example (flag/avoid) |
|---|---|---|---|
| 1. Preferred | `data-testid` / `data-test` | `[data-testid="checkout-submit"]` | — |
| 2. Good | unique `id` attribute (non-dynamic) | `#search-input` | `#user-42-row-7-cell` (per-record dynamic ID) |
| 3. Acceptable | specific stable class / ARIA | `.checkout-summary__total`, `[aria-label="Close dialog"]` | `.btn.btn-primary` (non-unique utility class) |
| 4. Last resort | structural CSS / XPath | `nav > ul > li:nth-child(3) > a` (only when target has no stable hook AND surrounding DOM is stable) | `/html/body/div[3]/div[2]/section/div/button` (deep absolute XPath — breaks on any layout change) |

**Worked example — good vs fragile pair:**
- ✅ **Good:** `[data-testid="logout-button"]` — stable hook explicitly added by the frontend team; survives copy changes, restyling, and DOM reordering.
- ❌ **Fragile (must flag):** `body > div.app-shell > header > nav > div:nth-child(2) > button.MuiButton-root.MuiButton-text` — depends on Material UI's auto-generated class names AND the exact nesting; breaks on every framework upgrade or layout tweak. Flag in step 4's output as `fragile: structural + MUI-generated class — request data-testid from frontend team`.

Flag problematic selectors: dynamic IDs (e.g. `user-42-row-7`), non-unique classes (e.g. `.btn-primary` matching 30 elements), deep structural paths (>3 levels of `>` or `nth-child`), framework-generated class names (`MuiButton-root`, `css-1a2b3c4`).

## Part B: Selector Implementation

### 5. Extend Existing Page Objects

For each page object needing new selectors:
- Read existing file, match its exact patterns
- Same access modifiers, data types, formatting
- Same naming convention (camelCase, UPPER_CASE, etc.)
- Add selectors in logical grouping
- Add helper methods if page object uses them:
  - Getters for text content
  - Click/action methods
  - Visibility checks

### 6. Create New Page Objects (if needed)

- Use existing page object as structural template
- Copy constructor, import, and class patterns exactly
- Follow project naming convention for file and class
- Add to barrel/index exports if project uses them

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

Document selectors in the test plan (or the artifact the calling workflow names):

```markdown
## Selector Management

### Interaction Map
[Step → required interactions]

### Selector Availability
✅ [PageObject.selector] — EXISTS
❌ [PageObject.selector] — MISSING

### Identified Selectors
**[PageName] - [ElementName]**
- Selector: [value]
- Type: data-testid / id / class / ARIA / XPath
- Source: Frontend code @ <file:line> / Page source @ <file>
- Usage: Click / Verify / Type
- Stability: stable | **fragile: <reason>**

### Fragile Selectors Flagged (require user/workflow approval before Part B implements)
- [PageName.selector] — <reason> — recommendation: <e.g. request data-testid from frontend team>

### Implementation (Part B only)
- Page Objects Modified: [list with paths]
- Page Objects Created: [list with paths]
- Selectors Added: [count]
- Methods Added: [count]
- Fragile selectors implemented after explicit approval: [list with approval evidence, or `None`]
```

</output_format>

<safety_boundaries>

This skill writes **only** to page-object files (and to the test plan's `## Selector Management` section as Part A's output record). It does **not**:

- Edit test files, fixtures, utility files, or any source outside the page-object layer
- Modify the frontend source code (even to add a missing `data-testid` — that's a request to the frontend team, not an action this skill takes)
- Edit the code-analysis report, project description, or repo docs
- Commit fragile selectors flagged in Part A step 4 without explicit approval recorded in the output (per Part B step 7's fragile-selector gate)

**Scope boundary between Part A and Part B:** Part A is read-only (analysis + recording). Part B is the only part that writes page-object files. An invocation scoped to Part A MUST NOT create or modify page-object files; an invocation scoped to Part B consumes Part A's recorded inventory rather than re-running the analysis.

**Fragile-selector discipline.** Any selector tagged fragile in Part A is surfaced for approval, not silently implemented. Silently committing a fragile selector is a safety-boundary violation and is the primary failure mode this rule guards against.

</safety_boundaries>

<failure_handling>

- **No selector source available** — page-sources directory at `agents/plans/aqa-<test-name>-page-sources/` does not exist AND frontend source path is unavailable: stop Part A step 4, report `aqa-selector-management: no selector source available — need page sources captured per Phase 4 step 4.2 or frontend source path` to the calling workflow. Do NOT fabricate selectors from naming guesses, screenshots, or test step text alone.
- **Page sources missing** (frontend source IS available, page sources missing): proceed with frontend-only analysis (step 3), record `Page sources: not available — selectors derived from frontend source only` in the output, mark any selector that would benefit from DOM verification (dynamic state, conditional rendering, iframe/shadow DOM) with `Confidence: low — page-source verification recommended`.
- **Frontend source missing** (page sources ARE available, frontend missing): proceed with page-source-only analysis (step 4), record the partial-coverage fact in the output. Acceptable confidence; page sources are the more authoritative DOM source.
- **Selector cannot be resolved in any available source** (interaction maps to an element neither source contains): do NOT invent a selector. Stop Part A for that specific element, record it in the Selector Availability section as `❌ <PageObject.selector> — UNRESOLVABLE: <reason>`, and ask the calling workflow whether to (a) request additional source/page captures, (b) defer the assertion, or (c) drop the test step.
- **Page object file not found in step 5** (Part B): if the target page-object file path from Part A's inventory does not exist when Part B tries to extend it, decide between (a) creating a new page object per step 6 if the inventory marked it as "to create" — proceed, or (b) stopping if the inventory marked it as "to extend" — file should exist; report `aqa-selector-management: target page object missing at <path> but Part A expected to extend it` to the calling workflow.
- **Part A inventory missing** (Part B): if the test plan's `## Selector Management` section (or the artifact the calling workflow names) is absent/empty when Part B starts, stop — report `aqa-selector-management: Part A inventory missing — Phase 4 (selector identification) must run first`. Do NOT re-run Part A inside a Part B invocation; that's a phase-scope violation.
- **`<test-name>` unresolved or ambiguous:** stop, ask the calling workflow to resolve the slug per `aqa-flow-code-analysis.md` `<naming_convention>`. Do not guess at the page-sources path.

</failure_handling>

<validation_checklist>

Run before declaring complete. Items conditional on Part A vs Part B scope.

**Part A (identification phase):**
- Interaction Map populated for every test step + assertion in the plan
- Every interaction has a Selector Availability entry (✅ EXISTS, ❌ MISSING, or ❌ UNRESOLVABLE with reason)
- Every identified selector has Type, Source (with file/line citation), Usage, and Stability fields
- Every selector tagged Stability=fragile has a one-line reason AND a recommendation (e.g. "request data-testid from frontend team")
- Source-availability accounted for: if page sources OR frontend source was missing, the output records `not available` for that source — no silent omissions
- No source files modified (Part A is read-only)

**Part B (implementation phase):**
- Part A inventory was loaded before any page-object write
- Every page object modified/created matches the project's existing patterns (naming, imports, structure, helper conventions)
- Lint/format clean on touched files
- No fragile selector implemented without an approval record in the "Fragile selectors implemented after explicit approval" section
- No files outside the page-object layer were modified (safety boundary)
- The test plan's `## Selector Management` section's Implementation subsection is updated with paths + counts

</validation_checklist>

<pitfalls>
- Guessing selectors without verifying in source code or HTML — fabrication
- Using fragile selectors (dynamic IDs, deep structural paths, framework-generated classes) without flagging them per step 4
- Silently committing a flagged fragile selector in Part B without explicit approval — safety-boundary violation
- Breaking existing page object patterns (different naming, style)
- Skipping frontend code search and going straight to page source request
- Re-running Part A from scratch inside a Part B invocation — phase-scope violation; consume the recorded inventory instead
- Modifying test files, fixtures, or frontend source during selector implementation — only page objects are written
- Using a `{TICKET-KEY}` path instead of `<test-name>` — `{TICKET-KEY}` is a TestGen convention not present in AQA naming
- Not validating linting after implementation
</pitfalls>

</aqa-selector-management>
