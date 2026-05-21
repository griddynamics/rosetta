---
name: aqa-flow-code-analysis
description: Phase 3 of AQA workflow - Code Analysis and Architecture Understanding
alwaysApply: false
baseSchema: docs/schemas/rule.md
---

# Phase 3: Code Analysis

## Objective

Understand existing test architecture, identify reusable components, and determine where new test should be integrated.

## Prerequisites

- Phase 1 and 2 completed
- Test plan file updated with assertions and clarifications
- User answers received

## Phase Tasks

### Task 1: Read Project Description

**Actions**:
1. Locate and read `agents/user-app/project_description.md` file
2. Extract key information:
   - **Test Framework**: What testing framework is used? (e.g., Playwright, Selenium, Cypress)
   - **Language**: Programming language (e.g., Python, JavaScript, TypeScript, Java)
   - **Project Structure**: How are tests organized?
     - Test directories
     - Page Object locations
     - Utility/helper locations
     - Test data locations
   - **Coding Standards**: 
     - Naming conventions (files, classes, methods, variables)
     - Code formatting rules
     - Import organization
     - Comment style
   - **Test Patterns**:
     - How tests are structured (AAA, Given-When-Then, etc.)
     - Setup/teardown patterns
     - Assertion patterns
   - **Dependencies**: Required libraries and utilities
3. Document findings in test plan

**Expected Output**: Understanding of project standards and structure.

### Task 1.5: Read and Understand Common User Instructions

**Actions**:
1. Locate and read all files in `agents/user-instructions/` directory
2. Extract common user instructions and preferences from all files:
   - **Test Creation Guidelines**: Specific rules or patterns for creating tests
   - **Code Style Preferences**: Any user-specific coding style requirements
   - **Test Data Handling**: How test data should be managed or generated
   - **Assertion Patterns**: Preferred assertion styles or custom matchers
   - **Setup/Teardown Requirements**: Specific setup or cleanup procedures
   - **Naming Conventions**: User-specific naming requirements beyond project standards
   - **Error Handling**: How errors or failures should be handled in tests
   - **Documentation Requirements**: Any specific documentation needs
   - **Integration Patterns**: How tests should integrate with other systems
   - **Performance Considerations**: Any performance-related requirements
3. Categorize instructions:
   - **Must Follow**: Critical instructions that must be applied
   - **Should Follow**: Important preferences that should be applied when possible
   - **Nice to Have**: Optional preferences
4. Document extracted instructions in test plan
5. **Apply these instructions** throughout the test creation process:
   - When identifying Page Objects (Task 2)
   - When analyzing similar tests (Task 3)
   - When identifying utilities (Task 4)
   - When updating test plan (Task 5)
   - Ensure instructions are referenced in Phase 6 (Test Implementation)

**Expected Output**: Extracted user instructions documented and ready to apply in test creation.

**Note**: If `agents/user-instructions/` directory does not exist or is empty, skip this task and proceed to Task 2. Document that no user instructions files were found.

### Task 2: Analyze Frontend Source Code (if available)

**Actions**:
1. Check if frontend source code is available:
   ```
   Use: Glob to check for RefSrc/tools-st-frontend/
   ```
2. If frontend code exists, analyze UI structure:
   - Search for React components related to the feature under test
   - Identify component file structure in `RefSrc/tools-st-frontend/src/`
   - Note component props, interfaces, and data-testid attributes
   - Document UI flow and component hierarchy
   - Identify API calls and data models used
3. Extract selector candidates:
   - Look for `data-testid`, `data-test`, or `test-id` attributes
   - Identify stable `id` and `className` patterns
   - Note ARIA labels and semantic HTML
4. Document findings:
   ```markdown
   ### Frontend Code Analysis
   
   #### Component: DashboardComponent (RefSrc/tools-st-frontend/src/features/dashboard/Dashboard.tsx)
   - data-testid attributes: "welcome-message", "dashboard-title"
   - Props: { userName: string, notifications: number }
   - API calls: fetchDashboardData()
   - Related components: NotificationBell, UserProfile
   
   #### Component: SettingsPage (RefSrc/tools-st-frontend/src/features/settings/SettingsPage.tsx)
   - data-testid attributes: "email-input", "save-button"
   - Form fields: email, notifications, preferences
   ```
5. If frontend code NOT available, skip to Task 3

**Expected Output**: Understanding of UI implementation and available test identifiers.

### Task 3: Identify Existing Page Objects

**Actions**:
1. Search for Page Object files in the test automation codebase:
   ```
   Use: Glob or Grep to find Page Object files
   Example patterns: "**/pages/**", "**/page-objects/**", "**/*Page.*"
   ```
2. For each relevant Page Object, analyze:
   - What page/component does it represent?
   - What selectors are already defined?
   - What methods/actions are available?
   - How are selectors organized (constants, getters, properties)?
   - What naming patterns are used?
3. Identify which Page Objects are relevant to this test:
   - Which pages will the test interact with?
   - Do Page Objects exist for all required pages?
   - Which Page Objects need to be extended?
4. Document findings:
   ```markdown
   ### Existing Page Objects
   
   #### LoginPage (src/pages/LoginPage.ts)
   - Selectors: username, password, loginButton, errorMessage
   - Methods: login(), isErrorDisplayed()
   - Relevance: Needed for test setup
   
   #### DashboardPage (src/pages/DashboardPage.ts)
   - Selectors: welcomeMessage, menuButton, userProfile
   - Methods: navigateToProfile(), getWelcomeText()
   - Relevance: Main test target
   
   #### Missing Page Objects:
   - SettingsPage (needed for test, does not exist)
   ```

**Expected Output**: Complete inventory of relevant Page Objects and gaps.

### Task 4: Search for Similar Tests

**Actions**:
1. Search for tests covering similar features or flows:
   ```
   Use: Grep or SemanticSearch to find related tests
   Search for: feature names, page names, similar actions
   ```
2. For each similar test found, analyze:
   - What does it test?
   - How is it structured?
   - What patterns does it use?
   - Where is it located?
   - What utilities does it import?
   - How are assertions written?
3. Identify the most similar tests (closest match to new test)
4. Determine best location for new test:
   - **Add to existing file**: If test is very similar and file is not too large
   - **Create new file**: If test covers new area or existing file is too large
5. Document findings:
   ```markdown
   ### Similar Tests
   
   #### tests/auth/login.test.ts
   - Tests: User login flow
   - Pattern: Setup -> Action -> Assert -> Cleanup
   - Uses: LoginPage, DashboardPage
   - Similarity: Uses same pages, similar flow
   
   #### tests/dashboard/navigation.test.ts
   - Tests: Dashboard navigation
   - Pattern: Login setup -> Multiple navigation assertions
   - Uses: DashboardPage, utility helpers
   - Similarity: Similar assertion style
   
   ### Recommended Test Location
   - File: tests/dashboard/user-profile.test.ts (new file)
   - Reason: New feature area, logical grouping
   - Alternative: Add to tests/dashboard/navigation.test.ts if test is small
   ```

**Expected Output**: Understanding of existing test patterns and determined location for new test.

### Task 5: Identify Reusable Utilities

**Actions**:
1. Search for utility/helper files:
   ```
   Use: Glob to find utility files
   Patterns: "**/utils/**", "**/helpers/**", "**/lib/**"
   ```
2. Identify reusable components:
   - Test setup helpers (login, navigation, data creation)
   - Assertion utilities (custom matchers, wait helpers)
   - Data generators (test data factories)
   - Configuration utilities
3. Document relevant utilities:
   ```markdown
   ### Reusable Utilities
   
   - `utils/test-helpers.ts`
     - `loginAsUser(username, password)`: Automates login
     - `waitForPageLoad()`: Smart page load wait
   
   - `utils/assertions.ts`
     - `expectElementVisible(selector)`: Custom visibility assertion
     - `expectTextContains(element, text)`: Text assertion helper
   
   - `utils/test-data.ts`
     - `generateUser()`: Creates test user data
   ```

**Expected Output**: List of utilities that should be reused in new test.

### Task 6: Update Test Plan with Analysis

**Actions**:
1. Add Phase 3 section to test plan:
   ```markdown
   ## Phase 3: Code Analysis
   
   ### Project Information
   - Framework: [e.g., Playwright with TypeScript]
   - Test Location: [Directory path]
   - Naming Convention: [Pattern]
   
   ### Frontend Code Analysis (if available)
   - Frontend Source: RefSrc/tools-st-frontend/
   - Components Analyzed: [List]
   - Available data-testid attributes: [List]
   - Component Props: [Relevant props]
   - UI Flow: [Brief description]
   
   ### Common User Instructions
   - Source: `agents/user-instructions/` (all files)
   - Must Follow: [List critical instructions]
   - Should Follow: [List important preferences]
   - Nice to Have: [List optional preferences]
   - Application: These instructions MUST be applied during test implementation (Phase 6)
   
   ### Existing Page Objects
   [List with relevance]
   
   ### Page Objects to Create/Extend
   - [List missing Page Objects]
   - [List Page Objects needing new selectors]
   
   ### Similar Tests
   [List with file paths and similarity notes]
   
   ### Recommended Test Location
   - File: [Path]
   - Reason: [Why]
   
   ### Reusable Utilities
   [List utilities to import and use]
   
   ### Coding Patterns to Follow
   - Test structure: [Pattern]
   - Naming: [Convention]
   - Assertions: [Style]
   - User Instructions: [Apply user instructions from agents/user-instructions/]
   ```

**Expected Output**: Test plan enhanced with architecture understanding.

## Completion Criteria

- [ ] `agents/user-app/project_description.md` read and understood
- [ ] All files in `agents/user-instructions/` read and understood (if directory exists)
- [ ] Common user instructions extracted and categorized
- [ ] User instructions documented in test plan
- [ ] All relevant Page Objects identified and analyzed
- [ ] Similar tests found and patterns understood
- [ ] Test location determined (new file vs. existing file)
- [ ] Reusable utilities identified
- [ ] Coding standards and conventions documented
- [ ] Test plan updated with Phase 3 information including user instructions
- [ ] `agents/aqa-state.md` updated with Phase 3 completion

## Update State File

After completing Phase 3, update `agents/aqa-state.md`:

```markdown
### Phase 3: Code Analysis
- Completed: [DateTime]
- User Instructions Directory: [Found/Not Found, files list if found]
- User Instructions Applied: [Yes/No, summary if yes]
- Existing Page Objects: [Count and list]
- Page Objects to Create: [Count and list]
- Similar Tests: [File paths]
- Test Location: [Directory/File decision]
- Framework: [Name and version]
```

Mark Phase 3 as completed and Phase 4 as current.

## Next Phase

Proceed to **Phase 4: Selector Identification** by reading:
```
agents/instructions/agents/advanced/r1/aqa-phase4.md
```

## Important Notes

- **Architecture First**: Understanding existing structure prevents duplication
- **Pattern Consistency**: New test must match existing patterns
- **Reuse Over Reinvent**: Use existing utilities and Page Objects
- **User Instructions**: Common user instructions from all files in `agents/user-instructions/` MUST be applied during test implementation (Phase 6)
- **Document Decisions**: Record why specific location/approach was chosen
- **No Assumptions**: If project structure is unclear, ask user for clarification
