# Selector Strategy + Output Template + Part B Mechanics — aqa-selector-management

Loaded on demand from `SKILL.md`:

- **Part A** loads this file at step 4 to consult the 4-tier strategy table + worked example.
- **Part B** loads this file at steps 5–6 to consult the page-object-extension and new-page-object-creation mechanics; and when emitting the implementation subsection of the output template.

The base `SKILL.md` keeps the orchestration, contracts, safety boundaries, failure handling, validation checklist, and the step-7 Validate Implementation gate (Part B's exit gate). The heavier content (tier table, good/fragile example pair, full output template, Part B steps 5–6 mechanics, and the "why one file" design rationale) lives here so neither invoking phase carries the other phase's detail in active context unless it actually needs it.

---

## Why one file (design rationale — maintainer-facing)

Parts A and B share three tightly-coupled contracts that change together: the 4-tier selector strategy taxonomy (Part A flags fragility; Part B's step-7 gate refuses to implement what A flagged), the selector-inventory shape (Part A writes it; Part B reads exactly that shape), and the fragile-selector handoff semantics (A → B approval flow). Splitting into two skills would force these contracts to be duplicated and kept in sync, and drift would be a real regression risk for tests that already passed identification. Single-file design + per-phase scope binding in `<input_contract>` + lazy-loading of part-specific detail via this reference resolves the cognitive-budget cost.

---

## Part B Step 5 — Extend Existing Page Objects (referenced from SKILL.md step 5)

For each page object needing new selectors:

- Read existing file, match its exact patterns
- Same access modifiers, data types, formatting
- Same naming convention (camelCase, UPPER_CASE, etc.)
- Add selectors in logical grouping
- Add helper methods if page object uses them:
  - Getters for text content
  - Click/action methods
  - Visibility checks

---

## Part B Step 6 — Create New Page Objects (referenced from SKILL.md step 6)

When the inventory marks a page object as "to create":

- Use existing page object as structural template
- Copy constructor, import, and class patterns exactly
- Follow project naming convention for file and class
- Add to barrel/index exports if project uses them

---

## Part B Step 7 — Validate Implementation (referenced from SKILL.md step 7)

Loaded only when Part B runs. Part A invocations do not pay the resident cost.

For each modified/created file:

- Selectors match the values identified in Part A
- Naming follows project conventions
- Imports correct and organized
- No syntax or linting errors
- Helper methods follow existing patterns
- **Fragile-selector gate (canonical — Part B safety rule):** any selector flagged in Part A step 4 as fragile MUST either (a) have been replaced with a stable alternative agreed with the user, or (b) be surfaced to the calling workflow for explicit approval before commit — NOT silently implemented. Silently committing a fragile selector is a safety-boundary violation and is the primary failure mode this rule guards against. SKILL.md's `<safety_boundaries>` "Fragile-selector discipline" cross-references this gate; do not restate the rule there.

---

## Selector Strategy — 4-Tier Table

For each missing selector, determine the best strategy using this priority order:

| Tier | Strategy | Example (good) | Example (flag/avoid) |
|---|---|---|---|
| 1. Preferred | `data-testid` / `data-test` | `[data-testid="checkout-submit"]` | — |
| 2. Good | unique `id` attribute (non-dynamic) | `#search-input` | `#user-42-row-7-cell` (per-record dynamic ID) |
| 3. Acceptable | specific stable class / ARIA | `.checkout-summary__total`, `[aria-label="Close dialog"]` | `.btn.btn-primary` (non-unique utility class) |
| 4. Last resort | structural CSS / XPath | `nav > ul > li:nth-child(3) > a` (only when target has no stable hook AND surrounding DOM is stable) | `/html/body/div[3]/div[2]/section/div/button` (deep absolute XPath — breaks on any layout change) |

---

## Worked Example — Good vs Fragile Pair

- ✅ **Good:** `[data-testid="logout-button"]` — stable hook explicitly added by the frontend team; survives copy changes, restyling, and DOM reordering.
- ❌ **Fragile (must flag):** `body > div.app-shell > header > nav > div:nth-child(2) > button.MuiButton-root.MuiButton-text` — depends on Material UI's auto-generated class names AND the exact nesting; breaks on every framework upgrade or layout tweak. Flag in step 4's output as `fragile: structural + MUI-generated class — request data-testid from frontend team`.

**Flag any selector matching these patterns:**

- Dynamic IDs (e.g. `user-42-row-7`)
- Non-unique classes (e.g. `.btn-primary` matching 30 elements)
- Deep structural paths (>3 levels of `>` or `nth-child`)
- Framework-generated class names (`MuiButton-root`, `css-1a2b3c4`)

---

## Output Template — `## Selector Management` Section

Written into the test plan (or the artifact the calling workflow names):

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

---

## Part B `<failure_handling>` extensions (referenced from SKILL.md `<failure_handling>`)

Loaded only when running Part B. Part A invocations do not pay the resident cost.

- **Page object file not found in step 5** (Part B): if the target page-object file path from Part A's inventory does not exist when Part B tries to extend it, decide between (a) creating a new page object per step 6 if the inventory marked it as "to create" — proceed, or (b) stopping if the inventory marked it as "to extend" — file should exist; report `aqa-selector-management: target page object missing at <path> but Part A expected to extend it` to the calling workflow.
- **Part A inventory missing** (Part B): if the test plan's `## Selector Management` section (or the artifact the calling workflow names) is absent/empty when Part B starts, stop — report `aqa-selector-management: Part A inventory missing — Phase 4 (selector identification) must run first`. Do NOT re-run Part A inside a Part B invocation; that's a phase-scope violation.

---

## Part B `<validation_checklist>` (referenced from SKILL.md `<validation_checklist>`)

Loaded only when running Part B. Part A invocations carry only the Part A half inline.

- Part A inventory was loaded before any page-object write
- Every page object modified/created matches the project's existing patterns (naming, imports, structure, helper conventions)
- Lint/format clean on touched files
- No fragile selector implemented without an approval record in the "Fragile selectors implemented after explicit approval" section
- No files outside the page-object layer were modified (safety boundary)
- The test plan's `## Selector Management` section's Implementation subsection is updated with paths + counts

---

## Part B `<pitfalls>` extensions (referenced from SKILL.md `<pitfalls>`)

Loaded only when running Part B. Part A invocations do not pay the resident cost.

- Silently committing a flagged fragile selector in Part B without explicit approval — safety-boundary violation
- Breaking existing page object patterns (different naming, style)
- Re-running Part A from scratch inside a Part B invocation — phase-scope violation; consume the recorded inventory instead
- Modifying test files, fixtures, or frontend source during selector implementation — only page objects are written
- Not validating linting after implementation
