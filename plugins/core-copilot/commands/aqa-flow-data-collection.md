---
name: aqa-flow-data-collection
description: "Phase 1 Data Collection of aqa-flow"
alwaysApply: false
baseSchema: docs/schemas/phase.md
---

# Phase 1: Data Collection

## Objective

Gather all required information from external sources (TestRail and Confluence) to understand test requirements and expected behavior.

## Prerequisites

- TestRail MCP configured and accessible
- Atlassian (Confluence) MCP configured and accessible
- Test case ID or requirement provided by user

## Phase Tasks

### Task 1: Read TestRail Test Case

**Actions**:
1. Ask user for TestRail test case ID if not provided
2. Use TestRail MCP to retrieve test case details:
   ```
   Use: user-testrail-get_case with case_id
   ```
3. Extract key information:
   - Test case ID and title
   - Test description
   - Preconditions
   - Test steps (step-by-step actions)
   - Expected results for each step
   - Overall test goal
   - Priority and test type
4. Document findings in test plan file

**Expected Output**: Complete understanding of what needs to be tested according to TestRail.

### Task 2: Read Confluence Documentation

**Actions**:
1. Ask user for Confluence page ID/URL or search terms if not provided
2. Use Atlassian Confluence MCP to find related documentation:
   ```
   Use: user-mcp-atlassian-confluence_search with query
   Or: user-mcp-atlassian-confluence_get_page with page_id
   ```
3. Extract relevant information:
   - Feature description and purpose
   - Business context and user flows
   - Technical specifications
   - UI/UX requirements
   - Integration points
   - Known limitations or constraints
4. Cross-reference with TestRail test case
5. Document findings in test plan file

**Expected Output**: Business and technical context for the feature being tested.

### Task 3: Create Initial Test Plan Document

**Actions**:
1. Create `agents/plans/aqa-<test-name>.md` file with:
   - Test case reference (TestRail ID and link)
   - Feature name and description
   - Test goal
   - Expected results summary
   - Confluence references
   - Initial understanding of test scope
2. Structure document for additions in subsequent phases

**Template**:
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
...

### Expected Overall Result
[Final expected outcome]

## Feature Context

### Business Purpose
[From Confluence - why this feature exists]

### Technical Details
[From Confluence - how it works]

### User Flow
[From Confluence - user journey]

## Notes
- [Any observations or questions]

---
## Phase 2: Requirements Clarification
[To be filled in Phase 2]

## Phase 3: Code Analysis
[To be filled in Phase 3]

## Phase 4: Selector Identification
[To be filled in Phase 4]

## Phase 5: Selector Implementation
[To be filled in Phase 5]

## Phase 6: Test Implementation
[To be filled in Phase 6]
```

## Completion Criteria

- [ ] TestRail test case retrieved and documented
- [ ] Confluence documentation retrieved and documented
- [ ] Test plan file created with all Phase 1 information
- [ ] Test goal clearly understood
- [ ] Expected results documented
- [ ] `agents/aqa-state.md` updated with Phase 1 completion

## Update State File

After completing Phase 1, update `agents/aqa-state.md`:

```markdown
### Phase 1: Data Collection
- Completed: [DateTime]
- TestRail Case: [ID/URL]
- Confluence Pages: [URLs]
- Test Goal: [Brief description]
- Expected Result: [Brief description]
- Test Plan File: agents/plans/aqa-<test-name>.md
```

Mark Phase 1 as completed and Phase 2 as current.

## Next Phase

Proceed to **Phase 2: Requirements Clarification** by executing:
```
ACQUIRE aqa-flow-requirements-clarification.md FROM KB
```

## Important Notes

- **No Assumptions**: If TestRail or Confluence data is incomplete, note it in the test plan
- **Ask Questions**: If user hasn't provided IDs/URLs, ask for them
- **Document Everything**: Capture all details even if they seem minor
- **Cross-Reference**: Ensure TestRail and Confluence information aligns
