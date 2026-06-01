---
name: aqa-test-authoring
description: Implement automated test following project standards, integrating page objects and assertions from test plan.
tags: []
baseSchema: docs/schemas/skill.md
---

<aqa-test-authoring>

<role>Test automation implementation specialist</role>

<when_to_use_skill>
Create automated test code integrating all page objects, assertions, and patterns established in previous analysis phases.
</when_to_use_skill>

<prerequisites>
- Complete test plan (requirements, assertions, code analysis, selectors)
- Page objects updated with all required selectors
- Project coding standards understood
- User instructions from `agents/user-instructions/` applied
</prerequisites>

<process>

## 1. Review Implementation Plan

Consolidate from test plan:
- Test steps and expected results
- Explicit assertions
- Test location decision (new file or add to existing)
- Similar test patterns to follow
- Available page objects and methods
- Reusable utilities
- User instructions to apply

Create outline: test name, setup requirements, dependencies, structure.

## 2. Determine File Location

- **Add to existing**: closely related test exists, file not too large
- **Create new**: new feature area or logical separation needed

If existing: read file, find appropriate insertion point.
If new: follow file naming convention from project standards.

## 3. Set Up Test Structure

Match project patterns exactly:
- Import order (framework → pages → utilities → types)
- Test suite organization (describe blocks)
- Test hooks (beforeEach, afterEach, beforeAll, afterAll)
- Shared setup/fixtures

## 4. Implement Setup

Based on preconditions:
- Initialize page objects
- Use reusable utilities (login helpers, navigation)
- Navigate to starting point
- Perform any prerequisite actions

## 5. Implement Test Actions

For each test step:
- Use page object methods when available
- Add appropriate waits (page loads, element visibility, network idle)
- Follow action patterns from similar tests
- No hardcoded sleeps/timeouts

## 6. Implement Assertions

For each assertion from requirements:
- Use project assertion style (expect, custom matchers)
- Make assertions specific and measurable
- Include assertion messages if project convention
- Follow patterns from similar tests

## 7. Add Cleanup (if needed)

- Try/finally or afterEach hooks
- Match cleanup patterns from similar tests
- Only if test modifies state or creates data

## 8. Add Documentation

- TestRail case reference as comment
- Brief test description
- Inline comments only for complex/non-obvious logic

## 9. Validate

- All imports correct
- All assertions from requirements included
- Uses page objects (never bypasses for direct selectors)
- Follows project coding standards
- User instructions applied
- No linting errors
- Test is ready to run

</process>

<output_format>

Update test plan with implementation details:

```markdown
## Test Implementation

### Test File
- Location: [path]
- Type: New file / Added to existing
- Test Name: [descriptive name]

### Implementation Summary
- Assertions: [count]
- Page Objects Used: [list]
- Utilities Used: [list]

### Validation
- [x] All assertions implemented
- [x] Page objects used correctly
- [x] Project standards followed
- [x] Linting passed
- [x] Ready for execution
```

</output_format>

<pitfalls>
- Bypassing page objects to use selectors directly
- Missing assertions from requirements phase
- Ignoring user instructions from `agents/user-instructions/`
- Not matching existing test patterns (imports, structure, naming)
- Adding hardcoded waits instead of proper wait strategies
- Skipping linting validation
</pitfalls>

</aqa-test-authoring>
