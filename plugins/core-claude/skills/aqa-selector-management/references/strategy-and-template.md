# Selector Strategy + Output Template — aqa-selector-management

Loaded on demand from `SKILL.md`:

- **Part A** loads this file at step 4 to consult the 4-tier strategy table + worked example.
- **Part B** loads this file when emitting the implementation subsection of the output template.

The base `SKILL.md` keeps the orchestration, contracts, safety boundaries, failure handling, and validation checklist; the heavier content (the tier table, the good/fragile example pair, and the full output template) lives here so neither invoking phase carries the other phase's detail in active context unless it actually needs it.

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
