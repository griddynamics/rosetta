---
name: aqa-flow-test-implementation
description: Phase 6 of AQA workflow - Test Implementation and Integration
alwaysApply: false
baseSchema: docs/schemas/phase.md
---

# Phase 6: Test Implementation

## Objective

Create automated test following project standards, integrating all Page Objects and assertions defined in previous phases.

## Prerequisites

- All previous phases (1-5) completed
- Test plan fully documented with all details
- Page Objects updated with all required selectors
- Explicit assertions defined
- Code architecture understood

## Phase Tasks

### Task 1: Review Test Implementation Plan

**Actions**:
1. Read complete test plan (all phases)
2. Review key information:
   - Test steps and expected results (Phase 1-2)
   - Explicit assertions (Phase 2)
   - Test location decision (Phase 3)
   - Similar test patterns (Phase 3)
   - Reusable utilities (Phase 3)
   - **Common user instructions from Phase 3** (MUST apply these during implementation)
   - Available Page Objects and methods (Phase 5)
3. Create implementation outline:
   ```markdown
   ### Test Implementation Outline
   
   **Test Location**: tests/dashboard/user-profile.test.ts
   **Test Name**: should display correct welcome message after login
   **Setup Requirements**: Login as test user
   **Dependencies**: DashboardPage, LoginPage, test-helpers
   
   **Test Structure**:
   1. Setup: Login with test user
   2. Action: Navigate to dashboard
   3. Assertions:
      - Welcome message visible
      - Welcome message contains username
      - Dashboard title correct
   4. Cleanup: None required (handled by test framework)
   ```

**Expected Output**: Clear outline of test to implement.

### Task 2: Determine Test File Location

**Actions**:
1. Based on Phase 3 analysis, decide:
   - **Option A**: Add to existing test file (if similar test exists and file not too large)
   - **Option B**: Create new test file (if new feature area or file too large)
2. If adding to existing file:
   - Read the existing test file
   - Find appropriate location for new test
   - Ensure new test fits logically
3. If creating new file:
   - Determine correct directory (from Phase 3)
   - Follow file naming convention
   - Set up file structure from template

**Expected Output**: Decision made and target file identified.

### Task 3: Set Up Test File Structure

**Actions**:
1. If creating new file, set up structure:
   ```typescript
   // Example structure for new test file
   import { test, expect } from '@playwright/test';
   import { DashboardPage } from '../pages/DashboardPage';
   import { LoginPage } from '../pages/LoginPage';
   import { loginAsUser } from '../utils/test-helpers';
   
   test.describe('Dashboard - User Profile', () => {
     // Tests will go here
   });
   ```
2. Follow project patterns:
   - Import order (framework, pages, utilities, types)
   - Test suite organization (describe blocks)
   - Test hooks (beforeEach, afterEach, beforeAll, afterAll)
   - Shared setup/fixtures
3. If adding to existing file:
   - Match existing import style
   - Add to appropriate describe block
   - Follow existing test organization

**Expected Output**: Test file ready for test implementation.

### Task 4: Implement Test Setup

**Actions**:
1. Add test setup based on preconditions:
   ```typescript
   test('should display correct welcome message after login', async ({ page }) => {
     // Setup: Login as test user
     const loginPage = new LoginPage(page);
     const dashboardPage = new DashboardPage(page);
     
     await page.goto('/login');
     await loginPage.login('testuser@example.com', 'password123');
     
     // OR use utility if available:
     await loginAsUser(page, 'testuser');
   ```
2. Use reusable utilities from Phase 3 analysis
3. Initialize Page Objects
4. Navigate to starting point
5. Perform any necessary preconditions

**Expected Output**: Test setup implemented.

### Task 5: Implement Test Actions

**Actions**:
1. Implement each test step from test plan:
   ```typescript
   // Step 1: Navigate to dashboard
   await page.goto('/dashboard');
   await page.waitForLoadState('networkidle');
   
   // Step 2: Verify page loaded
   await dashboardPage.waitForPageLoad(); // If method exists
   ```
2. Use Page Object methods (from Phase 5):
   - Use helper methods when available
   - Use selectors directly only if no method exists
3. Follow existing test patterns from similar tests
4. Add appropriate waits:
   - Page loads
   - Element visibility
   - Network requests
   - Animations

**Expected Output**: All test actions implemented.

### Task 6: Implement Explicit Assertions

**Actions**:
1. Implement each assertion from Phase 2:
   ```typescript
   // Assertion 1: Welcome message is visible
   const welcomeMessage = await dashboardPage.getWelcomeMessage();
   expect(welcomeMessage).toBeVisible();
   
   // Assertion 2: Welcome message contains username
   expect(welcomeMessage).toContain('Welcome, Test User');
   
   // Assertion 3: Dashboard title is correct
   const title = await dashboardPage.getDashboardTitle();
   expect(title).toBe('My Dashboard');
   
   // Assertion 4: User profile icon is visible
   expect(await dashboardPage.isUserProfileIconVisible()).toBe(true);
   ```
2. Use project assertion style:
   - Standard assertions (expect)
   - Custom matchers if project has them
   - Assertion messages if project uses them
3. Make assertions specific and measurable:
   - Not: element exists
   - But: element is visible AND contains expected text
4. Follow assertion patterns from similar tests

**Expected Output**: All assertions implemented explicitly.

### Task 7: Add Test Documentation

**Actions**:
1. Add test description:
   ```typescript
   test('should display correct welcome message after login', async ({ page }) => {
     // TestRail: TC-1234
     // Tests that the dashboard shows personalized welcome message
     // after successful user login
   ```
2. Add inline comments for complex logic:
   ```typescript
   // Wait for dynamic content to load
   await page.waitForSelector('[data-testid="welcome-message"]');
   
   // Verify message format matches expected pattern
   expect(welcomeMessage).toMatch(/^Welcome, [A-Za-z\s]+$/);
   ```
3. Include TestRail case reference
4. Follow project documentation standards

**Expected Output**: Test properly documented.

### Task 8: Add Cleanup (If Needed)

**Actions**:
1. Determine if cleanup needed:
   - Created test data that should be deleted
   - Modified application state
   - Opened additional resources
2. Add cleanup in appropriate location:
   ```typescript
   // Option 1: In test
   try {
     // Test code
   } finally {
     // Cleanup code
   }
   
   // Option 2: In afterEach hook
   test.afterEach(async ({ page }) => {
     // Cleanup code
   });
   ```
3. Follow project cleanup patterns from similar tests

**Expected Output**: Cleanup implemented if required.

### Task 9: Validate Test Implementation

**Actions**:
1. Review complete test:
   - [ ] All imports correct
   - [ ] Test name descriptive
   - [ ] Setup follows project patterns
   - [ ] All test steps implemented
   - [ ] All assertions from Phase 2 included
   - [ ] Assertions are explicit and measurable
   - [ ] Uses Page Objects from Phase 5
   - [ ] Uses reusable utilities
   - [ ] Follows project coding standards
   - [ ] No hardcoded waits (sleep/timeout)
   - [ ] Error handling if needed
   - [ ] Documentation/comments added
   - [ ] Cleanup if needed
2. Check for linting errors:
   ```
   Use: ReadLints tool on test file
   ```
3. Fix any issues found
4. Ensure test is complete and ready to run

**Expected Output**: Validated, lint-free test implementation.

### Task 10: Update Test Plan

**Actions**:
1. Add Phase 6 section to test plan:
   ```markdown
   ## Phase 6: Test Implementation
   
   ### Test File
   - Location: tests/dashboard/user-profile.test.ts
   - Type: [New file / Added to existing]
   - Test Name: should display correct welcome message after login
   
   ### Implementation Details
   
   **Imports**:
   - Playwright test framework
   - DashboardPage, LoginPage
   - test-helpers utility
   
   **Test Structure**:
   1. Setup: Login with test user credentials
   2. Navigate: Go to dashboard page
   3. Assertions:
      - Welcome message visibility
      - Welcome message contains "Welcome, Test User"
      - Dashboard title equals "My Dashboard"
      - User profile icon visible
   
   **Page Objects Used**:
   - LoginPage: login() method
   - DashboardPage: getWelcomeMessage(), getDashboardTitle(), isUserProfileIconVisible()
   
   **Utilities Used**:
   - loginAsUser() from test-helpers
   
   **Assertions**: 4 explicit assertions
   
   ### Test Code
   ```typescript
   [Include the complete test code or reference file path]
   ```
   
   ### Validation
   - [x] All assertions from Phase 2 implemented
   - [x] Page Objects from Phase 5 used correctly
   - [x] Project standards followed
   - [x] Linting checks passed
   - [x] Test ready for execution
   
   ### Next Steps
   - Run test locally to verify it works
   - Add to CI/CD if applicable
   - Link to TestRail case if integration exists
   ```

**Expected Output**: Complete test plan with implementation details.

## Completion Criteria

- [ ] Test location determined (new or existing file)
- [ ] Test file structure set up correctly
- [ ] Test setup implemented with preconditions
- [ ] All test steps implemented
- [ ] All explicit assertions from Phase 2 implemented
- [ ] Page Objects from Phase 5 used correctly
- [ ] Reusable utilities incorporated
- [ ] Test follows project coding standards
- [ ] Documentation/comments added
- [ ] Cleanup implemented if needed
- [ ] Linting errors checked and fixed
- [ ] Test plan updated with Phase 6 information
- [ ] `agents/aqa-state.md` updated with Phase 6 completion

## Update State File

After completing Phase 6, update `agents/aqa-state.md`:

```markdown
### Phase 6: Test Implementation
- Completed: [DateTime]
- Test File: [Path]
- Test Name: [Name]
- Test Type: [New file / Added to existing]
- Assertions Implemented: [Count]
- Page Objects Used: [List]
- Utilities Used: [List]
- Lines of Code: [Approximate]
- Status: Ready for execution

## Final Status
✅ AQA Flow Complete - Test automation ready
```

Mark Phase 6 as completed. **DO NOT** mark overall AQA state as COMPLETE yet.

## ⭐ USER ACTION REQUIRED: Execute Test

**CRITICAL**: Agent must **STOP** and **WAIT** for user to execute the test before proceeding.

**Actions**:
1. Inform user that test implementation is complete
2. Provide instructions for running the test:
   ```bash
   # Example command (adjust for your project)
   npm test tests/dashboard/user-profile.test.ts
   ```
3. **WAIT** for user to execute the test
4. **DO NOT PROCEED** to Phase 7 until user confirms test execution is complete
5. Ask user if they want to proceed to Phase 7 (Test Report Analysis) after execution

**User Interaction Format**:
```
Test implementation is complete! The test file has been created at: [test file path]

## Next Steps

1. **Execute the test**:
   [Provide test execution command]

2. **Review test results**:
   - Check if test passes or fails
   - Note any errors or failures
   - Save test report if generated

3. **When ready for analysis**:
   - If test passed: You can proceed to Phase 7 for report analysis (optional)
   - If test failed: Proceed to Phase 7 to analyze failures and then Phase 8 to correct issues

Please execute the test and let me know when you're ready to proceed to Phase 7 (Test Report Analysis).
```

**Expected Output**: User confirms test execution is complete and indicates readiness for Phase 7.

## Next Phase

After user executes test and confirms readiness, proceed to **Phase 7: Test Report Analysis** by executing:
```
ACQUIRE aqa-phase7-md FROM KB
```

## Important Notes

- **Complete Implementation**: All assertions from Phase 2 must be in the test
- **Use Page Objects**: Never bypass Page Objects to use selectors directly
- **Apply User Instructions**: MUST apply common user instructions from Phase 3 (all files in `agents/user-instructions/`) throughout test implementation
- **No Assumptions**: Implementation must match documented plan exactly
- **Project Standards**: Follow all conventions even for small details
- **Quality First**: A correct, maintainable test is better than a quick one
- **Traceability**: Keep clear link between TestRail case, test plan, and test code
