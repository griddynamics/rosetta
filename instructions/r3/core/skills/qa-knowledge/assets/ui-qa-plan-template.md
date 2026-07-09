# UI-QA test-plan template

UI-QA test-plan skeleton (plans/ui-qa-<test-name>/test-plan.md) -- Test Case Information, Feature Context, Access / Cross-Reference notes.

<ui-qa-plan-template>

Output template for `plans/ui-qa-<test-name>/test-plan.md`. Populate `## Access / Truncation Notes` from `data-collection`'s disclosure (truncation, permission denials, `[empty page]`, cross-domain fallbacks); never omit. TestRail (TMS), Confluence (Wiki), Jira (issue tracker) used here as an example, replace with what currently used.

**Inputs required:** the TestRail Case ID, the Confluence page URL(s), and `data-collection`'s disclosure output.

**Data-absence branches:** TestRail case inaccessible (missing/deleted/permission-denied) → set all TestRail-sourced fields to `N/A -- TestRail case inaccessible`, record in `## Access / Truncation Notes`. No steps → `None -- steps absent from TestRail case` in Test Steps. Confluence page inaccessible → `None -- Confluence page inaccessible` in the affected Feature Context field, record in `## Access / Truncation Notes`.

**Conflict rule:** when TestRail and Confluence contradict, record BOTH in `## Cross-Reference Notes`, flag `[CONFLICT -- await clarification]` -- never resolve unilaterally.

**Done when** every section holds a real value or explicit `N/A -- <reason>` (no blank section): Test Case Information, Feature Context, Access / Truncation Notes, Cross-Reference Notes.

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
[From Confluence -- e.g. "Allows customers to track order delivery status in real-time."]

### Technical Details
[From Confluence]

### User Flow
[From Confluence]

## Access / Truncation Notes
- [Per-page: full read / truncated / permission denied / fallback used -- cite the URL; if none: `None -- all cited Confluence pages read in full`. Example: `…/AbCd123` -- truncated at ~5000 words by harvesting, MCP returned full body (used MCP body, kept the note for audit).]

## Cross-Reference Notes
- [Gaps, contradictions, or observations between TestRail and Confluence -- e.g. `TestRail step 3 expects 200; Confluence references 204 -- [CONFLICT -- await clarification]`]
```

</ui-qa-plan-template>
