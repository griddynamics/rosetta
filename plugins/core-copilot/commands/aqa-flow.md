---
name: aqa-flow
description: "Workflow for automated QA: integration and end-to-end UI test automation, page objects, etc."
alwaysApply: false
tags: ["workflow"]
user-invocable: true
baseSchema: docs/schemas/workflow.md
---
 
# AQA (Automated QA) Agent - Test Automation Workflow

## Context

This agent handles end-to-end test automation from requirements gathering to test implementation. It uses TestRail, Confluence, and project documentation to create automated tests following existing architecture and coding standards.

### Critical Requirements

- **ONE PHASE AT A TIME**: Read phase file, execute, update state, move to next.
- **DO NOT SKIP PHASES**: Each builds on previous.
- **NO ASSUMPTIONS**: Never assume selectors, flows, or data. Always ask the user if information is missing.
- **USER INTERACTION**: Wait for user responses when questions are asked or files are requested. Phase 2, 6, 7, and 8 always require user input. Phase 4 requires user input ONLY if frontend code is unavailable or selectors cannot be found
- **STATE TRACKING**: Update `agents/aqa-state.md` after each phase.
- **MUST** use todo tasks for tracking progress.
- Prioritize ACCURACY over SPEED!

### User Customizations

- If user did not specify any preferences perform all steps except optional.
- User CAN customize and ask only for specific phases OR phases could have been done already OR towards specific goal OR for specific case, in this case LISTEN and ADOPT to the user.

## AQA Flow - Phase Overview

**Phase 1: Data Collection** [aqa-flow-data-collection.md]
1. ACQUIRE aqa-flow-data-collection.md FROM KB
2. Execute phase instructions
3. Update `agents/aqa-state.md`
4. Validate gathered data

**Phase 2: Requirements Clarification** [aqa-flow-requirements-clarification.md] ⭐ **USER INTERACTION REQUIRED**
1. ACQUIRE aqa-flow-requirements-clarification.md FROM KB
2. Execute phase instructions
3. **WAIT FOR USER ANSWERS** before Phase 3
4. Update `agents/aqa-state.md`

**Phase 3: Code Analysis** [aqa-flow-code-analysis.md]
1. ACQUIRE aqa-flow-code-analysis.md FROM KB
2. Execute phase instructions
3. Analyze frontend source code if available 
4. Update `agents/aqa-state.md`
5. Validate analysis findings

**Phase 4: Selector Identification** [aqa-flow-selector-identification.md] ⭐ **USER INTERACTION CONDITIONALLY REQUIRED**
1. ACQUIRE aqa-flow-selector-identification.md FROM KB
2. Execute phase instructions
3. Search frontend code for selectors first
4. **WAIT FOR USER TO PROVIDE PAGE SOURCE** only if frontend code unavailable or selectors not found
5. Update `agents/aqa-state.md`

**Phase 5: Selector Implementation** [aqa-flow-selector-implementation.md]
1. ACQUIRE aqa-flow-selector-implementation.md FROM KB
2. Execute phase instructions
3. Update `agents/aqa-state.md`
4. Validate selectors added

**Phase 6: Test Implementation** [aqa-flow-test-implementation.md]
1. ACQUIRE aqa-flow-test-implementation.md FROM KB
2. Execute phase instructions
3. Update `agents/aqa-state.md`
4. Validate test created
5. **STOP AND WAIT** for user to execute test

**Phase 7: Test Report Analysis** [aqa-flow-test-report-analysis.md] ⭐ **USER INTERACTION REQUIRED**
1. ACQUIRE aqa-flow-test-report-analysis.md FROM KB
2. Execute phase instructions
3. **WAIT FOR USER TO PROVIDE TEST REPORT** (if not in agents/user-instructions/ files)
4. Update `agents/aqa-state.md`
5. Analyze test failures and root causes

**Phase 8: Test Corrections** [aqa-flow-test-correction.md] ⭐ **USER APPROVAL REQUIRED**
1. ACQUIRE aqa-flow-test-correction.md FROM KB
2. Execute phase instructions
3. **WAIT FOR USER APPROVAL** before applying changes
4. Update `agents/aqa-state.md`
5. Validate corrections applied

## State File Format

Create/update `agents/aqa-state.md` after each phase:

```markdown
# AQA State - <Test Name>

**Last Updated**: [DateTime]
**Current Phase**: [1-8 or COMPLETE]
**TestRail Case**: [Test Case ID/URL]
**Feature**: [Feature Name]

## Phase Completion Status

- [x] Phase 1: Data Collection - Completed [Date]
- [ ] Phase 2: Requirements Clarification - Not Started
- [ ] Phase 3: Code Analysis - Not Started
- [ ] Phase 4: Selector Identification - Not Started
- [ ] Phase 5: Selector Implementation - Not Started
- [ ] Phase 6: Test Implementation - Not Started
- [ ] Phase 7: Test Report Analysis - Not Started
- [ ] Phase 8: Test Corrections - Not Started

## Test Details

### Phase 1: Data Collection
- Completed: [DateTime]
- TestRail Case: [ID/URL]
- Confluence Pages: [URLs]
- Test Goal: [Brief description]
- Expected Result: [Brief description]

### Phase 2: Requirements Clarification
- Questions Asked: [Count]
- Assertions Defined: [Count]
- Edge Cases: [List]

### Phase 3: Code Analysis
- Existing Page Objects: [List]
- Similar Tests: [File paths]
- Test Location: [Directory/File]

### Phase 4: Selector Identification
- Missing Selectors: [Count]
- Selectors Found in Frontend Code: [Count and list if applicable]
- Page Source Files: [Paths if needed]
- Source: [Frontend Code / Page Source / Both]

### Phase 5: Selector Implementation
- Page Objects Updated: [List]
- New Page Objects Created: [List]

### Phase 6: Test Implementation
- Test File: [Path]
- Test Method: [Name]
- Assertions: [Count]
- Status: Ready for execution

### Phase 7: Test Report Analysis
- Test Report Location: [Path or source]
- Tests Executed: [Count]
- Tests Failed: [Count]
- Root Causes: [List]

### Phase 8: Test Corrections
- Issues Fixed: [Count]
- Changes Applied: [Count]
- User Approval: [Date/Time]
- Status: Ready for re-testing

[Add sections for each completed phase]
```

## Important Notes

- **Sequential Execution**: Phases build on each other, must execute in order.
- **No Assumptions Rule**: Always ask user when information is missing - never guess selectors, flows, or test data.
- **Architecture First**: Always analyze existing code structure before implementing new tests.
- **Reuse Over Creation**: Prefer adding to existing files and using existing Page Objects over creating new ones.
- **Explicit Assertions**: All test validations must be explicitly defined based on requirements.
- **User Interaction**: Phases 2, 6, 7, and 8 always require user input. Phase 4 requires user input ONLY if frontend code unavailable or selectors cannot be found there - never proceed without answers or approval.
- **Test Execution**: Phase 6 stops and waits for user to execute tests before Phase 7.
- **Test Reports**: Phase 7 reads test report location from all files in agents/user-instructions/ directory, asks user if not found.
- **User Approval**: Phase 8 requires explicit user approval before applying any changes.
- **Documentation**: Use `project_description.md` as the single source of truth for coding standards.
- **Evidence-Based**: All decisions based on actual code analysis, not assumptions.
