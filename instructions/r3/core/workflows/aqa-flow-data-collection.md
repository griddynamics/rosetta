---
name: aqa-flow-data-collection
description: Phase 1 of AQA workflow - Data Collection from TestRail and Confluence
tags: ["aqa", "phase"]
baseSchema: docs/schemas/phase.md
---

<aqa_flow_data_collection>

<description_and_purpose>
Gather test case details from TestRail and feature context from Confluence, cross-reference, and produce initial test plan document.
</description_and_purpose>

<workflow_context>
- Phase 1 of 8 in `aqa-flow`
- Input: TestRail case ID or URL, Confluence page ID or search terms (from user)
- Output: `agents/plans/aqa-<test-name>.md` with test case info and feature context
- Skills: `mcp-testrail-data-collection`, `mcp-confluence-data-collection`
- Prerequisite: TestRail and Atlassian MCPs configured
</workflow_context>

<phase_steps>
1. Confirm inputs from user
2. Gather TestRail data
3. Gather Confluence data
4. Cross-reference and assemble test plan
5. Validate and update state
</phase_steps>

<confirm_inputs step="1.1">
1. Verify TestRail case ID or URL provided (ask user if missing)
2. Verify Confluence page ID or search terms provided (ask user if missing)
</confirm_inputs>

<gather_testrail step="1.2" subagent="discoverer" role="AQA data collector">
1. USE SKILL `mcp-testrail-data-collection`
2. Extract: case ID, title, description, preconditions, step-by-step actions with expected results, test goal, priority, test type
</gather_testrail>

<gather_confluence step="1.3" subagent="discoverer" role="AQA data collector">
1. USE SKILL `mcp-confluence-data-collection`
2. Extract: feature description and purpose, business context, user flows, technical specifications, UI/UX requirements, integration points, known limitations
</gather_confluence>

<cross_reference_and_assemble step="1.4">
1. Validate TestRail steps against Confluence feature context — note gaps or contradictions
2. Create `agents/plans/aqa-<test-name>.md` using the template below
3. Verify test plan file created

Output template for `agents/plans/aqa-<test-name>.md`:

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

## Cross-Reference Notes
- [Gaps, contradictions, or observations between TestRail and Confluence]
```

</cross_reference_and_assemble>

<update_state step="1.5">
1. Update `agents/aqa-state.md`:
   - TestRail Case: [ID/URL]
   - Confluence Pages: [URLs]
   - Test Goal: [brief]
   - Test Plan File: [path]
   - Phase 1 completion timestamp
2. Mark Phase 1 complete, Phase 2 current
</update_state>

<validation_checklist>
- TestRail test case retrieved and documented
- Confluence documentation retrieved and documented
- Cross-reference between TestRail and Confluence completed
- Test plan file created with all Phase 1 information
- Test goal clearly understood
- Expected results documented
</validation_checklist>

<pitfalls>
- Assuming test data when TestRail or Confluence data is incomplete — note gaps instead
- Skipping cross-reference between TestRail and Confluence
- Not asking user for IDs/URLs when missing
</pitfalls>

</aqa_flow_data_collection>
