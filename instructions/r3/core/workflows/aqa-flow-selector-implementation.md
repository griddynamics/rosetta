---
name: aqa-flow-selector-implementation
description: "Phase 5 Selector Implementation of aqa-flow"
alwaysApply: false
user-invocable: false
baseSchema: docs/schemas/phase.md
---

# Phase 5: Selector Implementation

## Objective

Add identified selectors to appropriate Page Objects following project conventions and architecture patterns.

## Prerequisites

- Phase 1, 2, 3, and 4 completed
- All missing selectors identified and documented
- Page source analyzed and selector strategy determined
- Understanding of existing Page Object patterns

## Phase Tasks

### Task 1: Review Selector Implementation Plan

**Actions**:
1. Read test plan Phase 4 section with identified selectors
2. Review Phase 3 analysis of existing Page Objects
3. For each missing selector, confirm:
   - Target Page Object (existing or new)
   - Selector value and type
   - Usage purpose (click, verify, type)
4. Create implementation checklist:
   ```markdown
   ### Selector Implementation Checklist
   
   #### DashboardPage (existing - extend)
   - [ ] Add welcomeMessage selector
   - [ ] Add dashboardTitle selector
   - [ ] Add notificationBell selector
   
   #### SettingsPage (new - create)
   - [ ] Create new Page Object file
   - [ ] Add emailInput selector
   - [ ] Add saveButton selector
   - [ ] Add successNotification selector
   ```

**Expected Output**: Clear plan of what needs to be implemented.

### Task 2: Extend Existing Page Objects

**Actions**:
1. For each Page Object that needs new selectors:
   - Read the existing Page Object file
   - Understand its structure and patterns:
     - How are selectors defined? (constants, getters, class properties)
     - What naming convention is used? (camelCase, UPPER_CASE)
     - Where are selectors located in the file?
     - Are there comments or documentation?
2. Add new selectors following the exact pattern:
   ```typescript
   // Example: If existing pattern is:
   private readonly loginButton = '[data-testid="login-btn"]';
   
   // Add new selectors in same style:
   private readonly welcomeMessage = '[data-testid="welcome-message"]';
   private readonly dashboardTitle = '#dashboard-title';
   ```
3. Maintain consistency:
   - Same access modifiers (private, public, protected)
   - Same data types
   - Same formatting and indentation
   - Same comment style if comments are used
4. Add selectors in logical location:
   - Group related selectors together
   - Follow existing ordering (alphabetical, by feature, by location on page)
5. Add helper methods if needed:
   ```typescript
   // If Page Object has action methods, add new ones:
   async getWelcomeMessage(): Promise<string> {
     return await this.page.textContent(this.welcomeMessage);
   }
   
   async clickNotificationBell(): Promise<void> {
     await this.page.click(this.notificationBell);
   }
   ```

**Expected Output**: Existing Page Objects extended with new selectors and methods.

### Task 3: Create New Page Objects (If Needed)

**Actions**:
1. If new Page Object is needed:
   - Find existing Page Object to use as template
   - Copy structure and patterns
   - Follow project naming conventions
2. Create file in correct location (from Phase 3 analysis):
   ```typescript
   // Example: src/pages/SettingsPage.ts
   
   import { Page } from '@playwright/test';
   import { BasePage } from './BasePage'; // If base class exists
   
   export class SettingsPage extends BasePage {
     // Selectors
     private readonly emailInput = '[data-testid="email-input"]';
     private readonly saveButton = '[data-testid="save-btn"]';
     private readonly successNotification = '.notification.success';
     
     constructor(page: Page) {
       super(page);
     }
     
     // Action methods
     async updateEmail(email: string): Promise<void> {
       await this.page.fill(this.emailInput, email);
     }
     
     async clickSave(): Promise<void> {
       await this.page.click(this.saveButton);
     }
     
     async isSuccessNotificationVisible(): Promise<boolean> {
       return await this.page.isVisible(this.successNotification);
     }
   }
   ```
3. Follow all project conventions:
   - Import statements organized correctly
   - Class structure matches existing patterns
   - Constructor pattern matches existing Page Objects
   - Method naming follows convention
   - Type annotations used consistently
4. Add to Page Object index/exports if project uses barrel files

**Expected Output**: New Page Object file(s) created following project standards.

### Task 4: Add Documentation (If Project Uses It)

**Actions**:
1. Check if existing Page Objects have documentation:
   - JSDoc/TSDoc comments
   - README files
   - Inline comments explaining selectors
2. If documentation exists, add for new selectors:
   ```typescript
   /**
    * Welcome message displayed after user login
    * Format: "Welcome, [username]"
    */
   private readonly welcomeMessage = '[data-testid="welcome-message"]';
   
   /**
    * Retrieves the welcome message text
    * @returns The welcome message string
    */
   async getWelcomeMessage(): Promise<string> {
     return await this.page.textContent(this.welcomeMessage);
   }
   ```
3. Update Page Object documentation if it exists:
   - Add new selectors to selector lists
   - Document new methods

**Expected Output**: Documentation added consistent with project standards.

### Task 5: Validate Selector Implementation

**Actions**:
1. Check each modified/created file:
   - [ ] Selectors added in correct format
   - [ ] Naming follows project conventions
   - [ ] All required selectors implemented
   - [ ] Helper methods added if needed
   - [ ] File structure matches existing patterns
   - [ ] Imports correct and organized
   - [ ] No syntax errors
2. Use ReadLints to check for linting errors:
   ```
   Use: ReadLints tool on modified files
   ```
3. Fix any linting issues found
4. Verify against checklist from Task 1

**Expected Output**: All selectors implemented correctly with no errors.

### Task 6: Update Test Plan

**Actions**:
1. Add Phase 5 section to test plan:
   ```markdown
   ## Phase 5: Selector Implementation
   
   ### Page Objects Modified
   
   #### DashboardPage (src/pages/DashboardPage.ts)
   Added selectors:
   - `welcomeMessage`: [data-testid="welcome-message"] - Text verification
   - `dashboardTitle`: #dashboard-title - Text verification
   - `notificationBell`: [aria-label="Notifications"] - Click action
   
   Added methods:
   - `getWelcomeMessage()`: Returns welcome text
   - `getDashboardTitle()`: Returns title text
   - `clickNotificationBell()`: Clicks notification icon
   
   #### SettingsPage (src/pages/SettingsPage.ts) - NEW
   Created new Page Object with selectors:
   - `emailInput`: [data-testid="email-input"] - Text input
   - `saveButton`: [data-testid="save-btn"] - Click action
   - `successNotification`: .notification.success - Visibility check
   
   Methods implemented:
   - `updateEmail(email)`: Updates email field
   - `clickSave()`: Clicks save button
   - `isSuccessNotificationVisible()`: Checks notification
   
   ### Implementation Notes
   - [Any deviations from original plan]
   - [Any issues encountered and resolved]
   
   ### Files Modified
   - src/pages/DashboardPage.ts (extended)
   - src/pages/SettingsPage.ts (created)
   ```

**Expected Output**: Test plan updated with implementation details.

## Completion Criteria

- [ ] All missing selectors implemented in Page Objects
- [ ] New Page Objects created if needed
- [ ] All implementations follow project conventions
- [ ] Helper methods added as needed
- [ ] Documentation added if project uses it
- [ ] Linting errors checked and fixed
- [ ] Implementation matches Phase 4 plan
- [ ] Test plan updated with Phase 5 information
- [ ] `agents/aqa-state.md` updated with Phase 5 completion

## Update State File

After completing Phase 5, update `agents/aqa-state.md`:

```markdown
### Phase 5: Selector Implementation
- Completed: [DateTime]
- Page Objects Modified: [List with file paths]
- Page Objects Created: [List with file paths]
- Total Selectors Added: [Count]
- Helper Methods Added: [Count]
- Linting Issues: [None / Resolved]
```

Mark Phase 5 as completed and Phase 6 as current.

## Next Phase

Proceed to **Phase 6: Test Implementation** by executing:
```
APPLY PHASE aqa-flow-test-implementation.md
```

## Important Notes

- **Consistency is Critical**: New code must match existing patterns exactly
- **No Shortcuts**: Follow all project conventions even if they seem verbose
- **Quality Over Speed**: Take time to ensure proper implementation
- **Check Linting**: Always validate code meets project linting rules
- **Document Changes**: Update test plan with all implementation details
- **Preserve Structure**: Don't reorganize or refactor existing code
