---
name: aqa-selector-management
description: Identify required UI selectors from frontend code or page source, determine selector strategy, and implement selectors in page objects following project conventions.
tags: []
baseSchema: docs/schemas/skill.md
---

<aqa-selector-management>

<role>UI selector identification and page object implementation specialist</role>

<when_to_use_skill>
Map test steps to required UI interactions, identify missing selectors, find selectors from source code or page HTML, and implement them in page objects.
</when_to_use_skill>

<prerequisites>
- Test plan with assertions defined
- Code analysis complete (page object inventory available)
- Frontend source code path known (or will request page source)
</prerequisites>

<process>

## Part A: Selector Identification

### 1. Map Test Steps to Interactions

For each test step and assertion, list required UI interactions:
- Elements to click (buttons, links, tabs)
- Elements to type into (inputs, textareas)
- Elements to select from (dropdowns, radios, checkboxes)
- Elements to verify (text, images, status indicators)
- Elements to wait for (spinners, notifications)

### 2. Check Existing Page Objects

For each interaction, check if selector exists:
- Mark as available, missing, or uncertain
- Note which page object should contain missing selectors
- Record element type and intended usage (click, verify, type)

### 3. Search Frontend Source Code (if available)

For missing selectors, search frontend components:
- Look for `data-testid`, `data-test` attributes first
- Check component props and interfaces
- Identify stable `id`, `className`, ARIA attributes
- Note element types and line numbers
- Document which selectors were found vs still missing

If ALL found, skip page source request.

### 4. Analyze Page Source HTML (if needed)

Only when frontend code unavailable or selectors still missing:

For each missing selector, determine best strategy:
1. **Preferred**: `data-testid` or `data-test`
2. **Good**: unique `id` attributes
3. **Acceptable**: specific stable `class` names
4. **Last resort**: CSS by structure or XPath

Flag problematic selectors: dynamic IDs, non-unique, fragile structural.

## Part B: Selector Implementation

### 5. Extend Existing Page Objects

For each page object needing new selectors:
- Read existing file, match its exact patterns
- Same access modifiers, data types, formatting
- Same naming convention (camelCase, UPPER_CASE, etc.)
- Add selectors in logical grouping
- Add helper methods if page object uses them:
  - Getters for text content
  - Click/action methods
  - Visibility checks

### 6. Create New Page Objects (if needed)

- Use existing page object as structural template
- Copy constructor, import, and class patterns exactly
- Follow project naming convention for file and class
- Add to barrel/index exports if project uses them

### 7. Validate Implementation

For each modified/created file:
- Selectors match identified values
- Naming follows project conventions
- Imports correct and organized
- No syntax or linting errors
- Helper methods follow existing patterns

</process>

<output_format>

Document selectors in test plan:

```markdown
## Selector Management

### Interaction Map
[Step → required interactions]

### Selector Availability
✅ [PageObject.selector] — EXISTS
❌ [PageObject.selector] — MISSING

### Identified Selectors
**[PageName] - [ElementName]**
- Selector: [value]
- Type: CSS / ID / ARIA / XPath
- Source: Frontend code / Page source
- Usage: Click / Verify / Type

### Implementation
- Page Objects Modified: [list with paths]
- Page Objects Created: [list with paths]
- Selectors Added: [count]
- Methods Added: [count]
```

</output_format>

<pitfalls>
- Guessing selectors without verifying in source code or HTML
- Using fragile selectors (dynamic IDs, deep structural paths)
- Breaking existing page object patterns (different naming, style)
- Skipping frontend code search and going straight to page source request
- Not validating linting after implementation
</pitfalls>

</aqa-selector-management>
