---
name: aqa-plan-template
description: AQA test-plan skeleton (agents/plans/aqa-<test-name>.md) — Test Case Information, Feature Context, Access / Cross-Reference notes.
---

<aqa-plan-template>

Output template for `agents/plans/aqa-<test-name>.md` (Phase 1). `## Access / Truncation Notes` is populated from the collection skill's disclosure (truncation, permission denials, `[empty page]`, cross-domain fallbacks); never omit.

```markdown
# AQA Test Plan - <Test Name>

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
[From Confluence]

### Technical Details
[From Confluence]

### User Flow
[From Confluence]

## Access / Truncation Notes
- [Per-page: full read / truncated / permission denied / fallback used — cite the URL; if none: `None — all cited Confluence pages read in full`. Example: `…/AbCd123` — truncated at ~5000 words by harvesting, MCP returned full body (used MCP body, kept the note for audit).]

## Cross-Reference Notes
- [Gaps, contradictions, or observations between TestRail and Confluence]
```

</aqa-plan-template>
