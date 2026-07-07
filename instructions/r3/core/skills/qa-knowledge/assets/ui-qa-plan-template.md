# UI-QA test-plan template (asset of the `qa-knowledge` skill)

UI-QA test-plan skeleton (plans/ui-qa-<test-name>.md) — Test Case Information, Feature Context, Access / Cross-Reference notes.

<ui-qa-plan-template>

Output template for `plans/ui-qa-<test-name>.md`. `## Access / Truncation Notes` is populated from the **`data-collection`** skill's disclosure (truncation, permission denials, `[empty page]`, cross-domain fallbacks); never omit.

**Inputs required:** the TestRail Case ID, the Confluence page URL(s), and `data-collection`'s disclosure output.

**Data-absence branches:** TestRail case inaccessible (missing / deleted / permission-denied) → set all TestRail-sourced fields to `N/A — TestRail case inaccessible` and record it in `## Access / Truncation Notes`. TestRail case has no steps → write `None — steps absent from TestRail case` in Test Steps. Confluence page inaccessible → write `None — Confluence page inaccessible` in the affected Feature Context field and record it in `## Access / Truncation Notes`.

**Conflict rule:** when TestRail and Confluence contradict, record BOTH versions in `## Cross-Reference Notes` and flag `[CONFLICT — await clarification]` — do not resolve unilaterally.

**Before writing:** confirm every section holds a real value or an explicit `N/A — <reason>` (no blank section). **Done when** Test Case Information, Feature Context, Access / Truncation Notes, and Cross-Reference Notes are all populated.

```markdown
# UI-QA Test Plan - <Test Name>

**Created**: [DateTime]
**TestRail Case**: [ID/URL]
**Feature**: [Feature Name]
**Status**: Phase 1 Complete

## Test Case Information

### Source
- TestRail Case: [ID]
- Confluence: [Page URLs]

### Test Goal
[What is being tested and why]

### Preconditions
[List preconditions from TestRail]

### Test Steps
1. [Step 1]
   - Expected: [Result]
2. [Step 2]
   - Expected: [Result]

### Expected Overall Result
[Final expected outcome]

## Feature Context

### Business Purpose
[From Confluence — e.g. "Allows customers to track order delivery status in real-time."]

### Technical Details
[From Confluence]

### User Flow
[From Confluence]

## Access / Truncation Notes
- [Per-page: full read / truncated / permission denied / fallback used — cite the URL; if none: `None — all cited Confluence pages read in full`. Example: `…/AbCd123` — truncated at ~5000 words by harvesting, MCP returned full body (used MCP body, kept the note for audit).]

## Cross-Reference Notes
- [Gaps, contradictions, or observations between TestRail and Confluence — e.g. `TestRail step 3 expects 200; Confluence references 204 — [CONFLICT — await clarification]`]
```

</ui-qa-plan-template>
