---
name: aqa-flow-test-correction
description: "Phase 8 Test Correction of aqa-flow"
alwaysApply: false
baseSchema: docs/schemas/phase.md
---

# Phase 8: Test Corrections

## Objective

Fix identified test failures and issues based on Phase 7 analysis. This phase requires **USER APPROVAL** before applying changes.

## Prerequisites

- Phase 7 completed
- Test failures analyzed and root causes identified
- Test plan updated with analysis findings

## Phase Tasks

### Task 1: Review Phase 7 Analysis

**Actions**:
1. Read Phase 7 analysis from test plan
2. Review all identified failures and root causes
3. Prioritize fixes:
   - Start with critical issues
   - Group related fixes together
   - Consider dependencies between fixes
4. Create correction plan:
   ```markdown
   ### Correction Plan
   
   #### Priority 1: Critical Issues
   - [Issue 1]: [Fix approach]
   - [Issue 2]: [Fix approach]
   
   #### Priority 2: High Priority Issues
   - [Issue 3]: [Fix approach]
   
   #### Priority 3: Medium/Low Priority Issues
   - [Issue 4]: [Fix approach]
   ```

**Expected Output**: Prioritized correction plan.

### Task 2: Prepare Proposed Changes

**Actions**:
1. For each identified issue, prepare specific changes:
   - **Selector Issues**: Update selectors in Page Objects (Phase 5 files)
   - **Timing Issues**: Add appropriate waits or adjust timing
   - **Assertion Failures**: Fix assertion logic or expected values
   - **Setup Issues**: Fix test setup or preconditions
   - **Test Code Issues**: Fix implementation errors
2. Document each proposed change:
   ```markdown
   ### Proposed Change: [Issue Description]
   
   **File**: [File path]
   **Current Code**: 
   ```[language]
   [Current code snippet]
   ```
   
   **Proposed Code**:
   ```[language]
   [Proposed code snippet]
   ```
   
   **Reason**: [Why this change fixes the issue]
   **Impact**: [What this change affects]
   ```
3. Group changes by file/module
4. Ensure changes align with:
   - Project coding standards
   - User instructions from Phase 3
   - Existing patterns from similar tests

**Expected Output**: Detailed list of all proposed changes with code snippets.

### Task 3: Present Changes to User for Approval ⭐ USER APPROVAL REQUIRED

**Actions**:
1. Present all proposed changes to user in organized format:
   ```
   Based on the test report analysis (Phase 7), I've identified the following issues and prepared fixes:
   
   ## Summary
   - Total Issues: [Count]
   - Critical: [Count]
   - High Priority: [Count]
   - Medium/Low: [Count]
   
   ## Proposed Changes
   
   ### Change 1: [Issue Title]
   **File**: [Path]
   **Issue**: [Description]
   **Fix**: [Brief description]
   **Code Change**:
   ```[language]
   [Before] → [After]
   ```
   
   ### Change 2: [Issue Title]
   [Similar format]
   
   ...
   
   ## Approval Required
   
   Please review all proposed changes and provide explicit approval:
   - Type "approved" or "yes" to proceed with all changes
   - Type "approved with modifications" and specify changes if you want modifications
   - Type "rejected" and specify which changes to skip if you want to reject specific changes
   
   **DO NOT PROCEED** until you receive explicit approval.
   ```
2. **WAIT** for user approval
3. **DO NOT PROCEED** to implementation until user explicitly approves
4. If user requests modifications:
   - Update proposed changes based on feedback
   - Re-present for approval
5. If user rejects specific changes:
   - Remove rejected changes from plan
   - Proceed only with approved changes

**Expected Output**: User approval received for proposed changes.

### Task 4: Implement Approved Changes

**Actions**:
1. For each approved change, implement fix:
   - Update Page Objects if selector issues
   - Update test file if test code issues
   - Add waits if timing issues
   - Fix assertions if assertion issues
   - Fix setup if precondition issues
2. Apply changes one at a time:
   - Make change
   - Verify change is correct
   - Move to next change
3. Follow project standards:
   - Use existing patterns
   - Maintain code style
   - Add comments if needed
   - Update related code if necessary

**Expected Output**: All approved changes implemented.

### Task 5: Validate Changes

**Actions**:
1. Review each implemented change:
   - [ ] Change matches approved proposal
   - [ ] Code follows project standards
   - [ ] No syntax errors
   - [ ] No breaking changes to other tests
   - [ ] User instructions from Phase 3 applied
2. Check for linting errors:
   ```
   Use: ReadLints tool on modified files
   ```
3. Fix any linting errors
4. Verify changes address root causes:
   - Each change should fix the corresponding issue from Phase 7
   - No unrelated changes included

**Expected Output**: All changes validated and verified.

### Task 6: Update Test Plan

**Actions**:
1. Add Phase 8 section to test plan:
   ```markdown
   ## Phase 8: Test Corrections
   
   ### Issues Fixed
   - [Issue 1]: [Fix applied]
   - [Issue 2]: [Fix applied]
   ...
   
   ### Changes Made
   #### File: [Path]
   - Change: [Description]
   - Reason: [Why]
   - Status: [Applied/Rejected]
   
   ### User Approval
   - Approval Date: [DateTime]
   - Approved Changes: [Count]
   - Rejected Changes: [Count]
   
   ### Validation
   - [x] All approved changes implemented
   - [x] Code follows project standards
   - [x] Linting checks passed
   - [x] Changes address root causes
   
   ### Next Steps
   - Re-run tests to verify fixes
   - If tests pass: AQA flow complete
   - If tests still fail: Re-analyze (return to Phase 7)
   ```

**Expected Output**: Test plan updated with correction details.

## Completion Criteria

- [ ] Phase 7 analysis reviewed
- [ ] Correction plan created
- [ ] Proposed changes prepared and documented
- [ ] **User approval received for changes**
- [ ] All approved changes implemented
- [ ] Changes validated (linting, standards, correctness)
- [ ] Test plan updated with Phase 8 information
- [ ] `agents/aqa-state.md` updated with Phase 8 completion

## Update State File

After completing Phase 8, update `agents/aqa-state.md`:

```markdown
### Phase 8: Test Corrections
- Completed: [DateTime]
- Issues Identified: [Count]
- Changes Proposed: [Count]
- User Approval: [Date/Time]
- Changes Applied: [Count]
- Changes Rejected: [Count]
- Files Modified: [List]
- Status: Ready for re-testing
```

Mark Phase 8 as completed.

## Next Steps

After corrections are applied:

1. **Re-run tests** to verify fixes:
   ```bash
   npm test [test file path]
   ```

2. **If tests pass**:
   - Mark AQA flow as COMPLETE
   - Update TestRail case status if applicable
   - Commit changes to version control

3. **If tests still fail**:
   - Return to Phase 7 to re-analyze new failures
   - Identify any new issues introduced by fixes
   - Repeat correction process if needed

## Important Notes

- **CRITICAL**: NEVER apply changes without explicit user approval
- **User Approval Format**: User must type "approved", "yes", or similar explicit approval
- **No Assumptions**: If user provides feedback, it's review, not approval - wait for explicit approval
- **Incremental Fixes**: Apply changes one at a time, validate each
- **Preserve Intent**: Ensure fixes don't change test intent or requirements
- **Documentation**: Document all changes for traceability
- **Re-test Required**: Always re-run tests after fixes to verify
