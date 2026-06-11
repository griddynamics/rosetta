---
name: aqa-flow-selector-identification
description: "Phase 4 Selector Identification of aqa-flow"
alwaysApply: false
user-invocable: false
baseSchema: docs/schemas/phase.md
---

# Phase 4: Selector Identification

## Objective

Identify missing selectors needed for test implementation. First attempt to find selectors from frontend source code. If frontend code is unavailable or selectors cannot be found, request page source from user.

## Prerequisites

- Phase 1, 2, and 3 completed
- Test plan updated with assertions and code analysis
- Understanding of existing Page Objects
- Understanding of test requirements
- Frontend code analysis completed (if available)

## Phase Tasks

### Task 1: Map Test Steps to Required Interactions

**Actions**:
1. Review test plan - each test step and assertion
2. For each step, list all UI interactions needed:
   - Elements to click (buttons, links, tabs, etc.)
   - Elements to type into (input fields, textareas)
   - Elements to select from (dropdowns, radio buttons, checkboxes)
   - Elements to verify (text, images, status indicators)
   - Elements to wait for (loading spinners, notifications)
3. Create interaction map:
   ```markdown
   ### Test Step 1: Navigate to Login Page
   Required Interactions:
   - Click: "Login" navigation link
   - Verify: Login page heading "Sign In"
   
   ### Test Step 2: Enter Credentials
   Required Interactions:
   - Type: Username field
   - Type: Password field
   - Click: "Login" button
   
   ### Test Step 3: Verify Dashboard
   Required Interactions:
   - Verify: Welcome message text
   - Verify: User profile icon visible
   - Verify: Dashboard title "My Dashboard"
   ```

**Expected Output**: Complete list of all required UI interactions.

### Task 2: Check Existing Page Objects for Selectors

**Actions**:
1. For each required interaction, check if selector already exists in Page Objects:
   ```markdown
   ### Selector Availability Check
   
   ✅ LoginPage.usernameInput - EXISTS
   ✅ LoginPage.passwordInput - EXISTS
   ✅ LoginPage.loginButton - EXISTS
   ❌ DashboardPage.welcomeMessage - MISSING
   ❌ DashboardPage.dashboardTitle - MISSING
   ✅ DashboardPage.userProfileIcon - EXISTS
   ```
2. Categorize findings:
   - **Available**: Selectors that already exist
   - **Missing**: Selectors that need to be added
   - **Uncertain**: Selectors that might exist under different names
3. For each missing selector, note:
   - Which Page Object should contain it
   - What element it represents
   - How it will be used (click, verify, type)

**Expected Output**: Clear list of missing selectors with their intended Page Objects.

### Task 3: Search Frontend Source Code for Selectors (if available)

**Actions**:
1. Check if frontend source code is available 
2. If available, search for missing selectors:
   ```
   Use: Grep or SemanticSearch 
   Search for: data-testid, data-test, component names, feature names
   ```
3. For each missing selector, search relevant component files:
   - Look for `data-testid="selector-name"` attributes
   - Check component props and interfaces
   - Identify stable `id`, `className`, or ARIA attributes
   - Note element types (button, input, div, etc.)
4. Document found selectors:
   ```markdown
   ### Selectors Found in Frontend Code
   
   #### DashboardPage 
   - Welcome Message: `data-testid="welcome-message"` (h2 element, line 45)
   - Dashboard Title: `data-testid="dashboard-title"` (h1 element, line 38)
   - Notification Bell: `data-testid="notification-bell"` (button element, line 52)
   
   #### SettingsPage 
   - Email Input: `data-testid="email-input"` (input type="email", line 67)
   - Save Button: `data-testid="save-settings-btn"` (button element, line 89)
   ```
5. Categorize findings:
   - **Found in Frontend**: Selectors identified in source code
   - **Still Missing**: Selectors not found (need user page source)
6. If ALL selectors found, skip Task 4 and proceed to Task 5
7. If frontend code NOT available or selectors still missing, proceed to Task 4

**Expected Output**: Selectors found from frontend code OR list of selectors still needing page source.

### Task 4: Prepare Page Source Request (if needed)

**Actions**:
1. **ONLY execute this task if**:
   - Frontend source code is not available, OR
   - Some selectors could not be found in frontend code
2. Group missing selectors by page/component:
   ```markdown
   ### Missing Selectors by Page
   
   #### Dashboard Page
   - Welcome message (text element showing "Welcome, [username]")
   - Dashboard title (heading with "My Dashboard")
   - Notification bell icon (clickable icon in header)
   
   #### Settings Page  
   - Email input field (editable field for email)
   - Save button (button to save settings)
   - Success notification (message shown after save)
   ```
2. For each page, specify what HTML is needed:
   - Specific elements to locate
   - Surrounding context (parent elements, siblings)
   - Any attributes to note (id, class, data-testid, aria-label)
3. Create detailed request for user:
   ```
   I need page source HTML to identify the correct selectors. Please provide:
   
   ### Dashboard Page HTML
   Please save the HTML for these elements:
   - The welcome message element (showing "Welcome, [username]")
   - The dashboard title/heading
   - The notification bell icon
   
   To capture:
   1. Open browser Developer Tools (F12)
   2. Right-click the element → Inspect
   3. In Elements tab, right-click the element → Copy → Copy outerHTML
   4. Include parent containers for context (2-3 levels up)
   5. Save HTML in files in `agents/aqa/{TICKET-KEY}/page-sources/` directory
      (e.g., dashboard-page.html, settings-page.html)
   
   ### Settings Page HTML
   [Similar instructions for Settings page elements]
   ```

**Expected Output**: Clear, specific request for user with instructions on how to provide HTML.

**Note**: If all selectors were found in Task 3 (frontend code), skip this task entirely.

### Task 5: Create Directory and Wait for User to Add Page Sources (if needed)

**Actions**:
1. Create directory for page sources using Shell tool:
   ```bash
   mkdir -p agents/aqa/{TICKET-KEY}/page-sources/
   ```
2. Present request to user in clear, actionable format
3. Explain why page source is needed and where to save files
4. Provide clear instructions with file naming convention
5. **WAIT** for user to add page source files to the directory
6. **DO NOT PROCEED** to Task 5 until user confirms files are added
7. List directory contents using LS tool to verify files exist
8. Ask clarifying questions if provided HTML is unclear or incomplete

**User Interaction Format**:
```
To implement the test accurately, I need to identify the correct selectors.

I've created a directory for page sources at: `agents/aqa/{TICKET-KEY}/page-sources/`

## Missing Selectors
I need HTML for the following elements:

### Dashboard Page
- [Element 1 description]
- [Element 2 description]

### Settings Page  
- [Element 1 description]
- [Element 2 description]

## How to Provide Page Sources

1. Open the application and navigate to each page
2. For each page, create a separate HTML file in the `page-sources/` directory:
   - `dashboard-page.html` for Dashboard Page elements
   - `settings-page.html` for Settings Page elements
3. Use this naming convention: `{page-name}.html` in kebab-case
4. In each HTML file, include the HTML for all relevant elements with surrounding context
5. To capture HTML:
   - Open Developer Tools (F12 or Right-click → Inspect)
   - Right-click the element → Inspect
   - In Elements/Inspector tab, find the element
   - Right-click the HTML → Copy → Copy outerHTML
   - Include 2-3 parent levels for context
   - Paste into the appropriate `.html` file

**Please add the page source files to the `agents/aqa/{TICKET-KEY}/page-sources/` directory and let me know when ready.**
```

**Expected Output**: User adds HTML files to the `page-sources/` directory and confirms.

**Note**: If all selectors were found in Task 3 (frontend code), skip this task entirely.

### Task 6: Analyze Provided HTML and Document Selectors (if needed)

**Actions**:
1. List files in `agents/aqa/{TICKET-KEY}/page-sources/` directory using LS tool, then read each page source file using Read tool
2. For each missing selector, determine best selector strategy:
   - **Preferred**: `data-testid` or `data-test` attributes
   - **Good**: Unique `id` attributes
   - **Acceptable**: Specific `class` names (if stable)
   - **Last Resort**: CSS selectors by structure or XPath
3. Document selected selectors:
   ```markdown
   ### Identified Selectors
   
   #### DashboardPage Selectors
   
   **Welcome Message**
   - HTML: `<h2 class="welcome-text" data-testid="welcome-message">`
   - Selector: `[data-testid="welcome-message"]`
   - Type: CSS
   - Usage: Text verification
   
   **Dashboard Title**
   - HTML: `<h1 id="dashboard-title">My Dashboard</h1>`
   - Selector: `#dashboard-title`
   - Type: CSS (ID)
   - Usage: Text verification
   
   **Notification Bell**
   - HTML: `<button class="notification-icon" aria-label="Notifications">`
   - Selector: `[aria-label="Notifications"]`
   - Type: CSS (ARIA)
   - Usage: Click action
   ```
4. Flag any problematic selectors:
   - Dynamic IDs or classes
   - Non-unique selectors
   - Fragile structural selectors
5. Ask user for clarification if needed:
   - "I noticed the ID includes a timestamp. Is there a more stable way to identify this element?"
   - "This element has no unique attributes. Can a `data-testid` be added?"

**Expected Output**: Complete list of selectors with selection rationale.

**Note**: If all selectors were found in Task 3 (frontend code), this task combines results from frontend code analysis.

### Task 7: Update Test Plan

**Actions**:
1. Add Phase 4 section to test plan:
   ```markdown
   ## Phase 4: Selector Identification
   
   ### Required Selectors Analysis
   [Interaction map from Task 1]
   
   ### Existing vs Missing Selectors
   [Availability check from Task 2]
   
   ### Frontend Code Analysis
   - Frontend Source Available: [Yes/No]
   - Components Searched: [List]
   - Selectors Found in Code: [Count and list]
   - Selectors Still Missing: [Count and list]
   
   ### Page Source Requested (if applicable)
   - Pages: [List]
   - Elements: [List]
   - Provided: [File path]
   - Note: [Only if frontend code unavailable or selectors not found]
   
   ### Identified Selectors
   [Detailed selector documentation - from frontend code (Task 3) or HTML analysis (Task 6)]
   
   ### Selector Strategy
   - Preferred method: [e.g., data-testid]
   - Fallback method: [e.g., id or aria-label]
   
   ### Notes
   - [Any concerns about selector stability]
   - [Recommendations for improvements]
   ```

**Expected Output**: Test plan updated with all selector information.

## Completion Criteria

- [ ] All required UI interactions mapped to test steps
- [ ] Existing selectors identified in Page Objects
- [ ] Missing selectors documented
- [ ] Frontend source code searched for selectors (if available)
- [ ] Selectors found in frontend code documented (if applicable)
- [ ] Page source requested from user (only if frontend code unavailable or selectors not found)
- [ ] `page-sources/` directory created (only if page source needed)
- [ ] User added page source files to directory (only if page source needed)
- [ ] Files validated (only if page source needed)
- [ ] Provided HTML analyzed and selectors identified (only if page source needed)
- [ ] Selector strategy documented
- [ ] Test plan updated with Phase 4 information
- [ ] `agents/aqa-state.md` updated with Phase 4 completion

## Update State File

After completing Phase 4, update `agents/aqa-state.md`:

```markdown
### Phase 4: Selector Identification
- Completed: [DateTime]
- Total Selectors Needed: [Count]
- Existing Selectors: [Count]
- Missing Selectors: [Count]
- Frontend Code Available: [Yes/No]
- Selectors Found in Frontend: [Count]
- Page Source Required: [Yes/No]
- Page Source Directory: agents/aqa/{TICKET-KEY}/page-sources/ (if applicable)
- Files Provided: [list of filenames] (if applicable)
- Selector Strategy: [Preferred method]
```

Mark Phase 4 as completed and Phase 5 as current.

## Next Phase

After selectors are identified (either from frontend code or page source), proceed to **Phase 5: Selector Implementation** by executing:
```
ACQUIRE aqa-flow-selector-implementation.md FROM KB
```

## Important Notes

- **Frontend First**: Always check frontend code for selectors before requesting page source
- **Conditional User Interaction**: Only request page source if frontend code unavailable or selectors not found
- **Never Guess**: Do not assume HTML structure or make up selectors
- **Stability First**: Choose stable, reliable selectors over convenient but fragile ones
- **Prefer data-testid**: Frontend code analysis should look for `data-testid` attributes first
- **Ask Questions**: If selectors are unclear or problematic, ask user
- **Document Source**: Clearly note whether selectors came from frontend code or page source
- **User Guidance**: If page source needed, provide clear step-by-step instructions
