# UI-AQA test-plan template

UI-AQA test-plan skeleton (plans/ui-aqa-<test-name>/test-plan.md) -- Test Case Information, Feature Context, Access / Cross-Reference notes.

<ui-aqa-plan-template>

Output template for `plans/ui-aqa-<test-name>/test-plan.md`. Populate `## Access / Truncation Notes` from `data-collection`'s disclosure (unavailable sources, truncation, permission denials, `[empty page]`, cross-domain fallbacks); never omit. TestRail (TMS), Confluence (Wiki), and Jira (Issue Tracker) are canonical examples; adapt all fields and labels to the resolved systems.

**Inputs required:** a TMS case or direct test description, optional Wiki source(s), and `data-collection`'s disclosure output.

**Data-absence branches:** TMS case inaccessible → set its fields to `N/A -- <provider> case inaccessible` and record the reason. No TMS, direct description supplied → cite `User-provided direct description`. No steps → `None -- steps absent from source`. Wiki unavailable → `None -- Wiki source unavailable: <reason>` in affected Feature Context fields and Access Notes.

**Conflict rule:** when available sources contradict, record every conflicting statement + provenance in `## Cross-Reference Notes`, flag `[CONFLICT -- await clarification]`, and never resolve unilaterally.

**Done when** every section holds a real value or explicit `N/A -- <reason>` (no blank section): Test Case Information, Feature Context, Access / Truncation Notes, Cross-Reference Notes.

```markdown
# UI-AQA Test Plan - <Test Name>

**Created**: [DateTime]
**TMS Case**: [Provider + case handle/URL, or N/A]
**Feature**: [Feature Name]
**Status**: Phase 1 Complete

## Test Case Information

### Source
- TMS: [Provider + case handle/URL, or N/A]
- Wiki: [Provider + page handles/URLs, or N/A]
- Direct input: [User request reference, or N/A]

### Test Goal
[What is being tested and why]

### Preconditions
[List preconditions from the cited source]

### Test Steps
1. [Step 1]
   - Expected: [Result]
2. [Step 2]
   - Expected: [Result]

### Expected Overall Result
[Final expected outcome]

## Feature Context

### Business Purpose
[From the cited Wiki/direct source -- e.g. "Allows customers to track order delivery status in real-time."]

### Technical Details
[From the cited Wiki/direct source]

### User Flow
[From the cited Wiki/direct source]

## Access / Truncation Notes
- [Per source: full read / unavailable / truncated / permission denied / fallback used -- cite the canonical handle/URL; if none: `None -- all cited Wiki pages read in full`.]

## Cross-Reference Notes
- [Gaps, contradictions, or observations across sources -- e.g. `TMS step 3 expects 200; Wiki page <URL> references 204 -- [CONFLICT -- await clarification]`]
```

</ui-aqa-plan-template>
