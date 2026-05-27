---
name: aqa-codebase-analysis
description: Analyze test automation project architecture — framework, page objects, similar tests, utilities, user instructions — to inform test implementation decisions.
tags: []
baseSchema: docs/schemas/skill.md
---

<aqa-codebase-analysis>

<role>Test automation architecture analyst</role>

<when_to_use_skill>
Understand existing test project structure, patterns, and reusable components before implementing new tests.
</when_to_use_skill>

<prerequisites>
- Test plan with assertions and clarifications complete
- Access to test automation codebase
</prerequisites>

<process>

## 1. Read Project Description

Read `agents/user-app/project_description.md` and extract:
- Test framework (Playwright, Selenium, Cypress, etc.)
- Language (Python, TypeScript, Java, etc.)
- Project structure (test dirs, page object dirs, utility dirs)
- Coding standards (naming, formatting, imports, comments)
- Test patterns (AAA, Given-When-Then, setup/teardown)
- Dependencies

## 2. Read Common User Instructions

If `agents/user-instructions/` exists, read all files and extract:
- Test creation guidelines
- Code style preferences
- Assertion patterns and custom matchers
- Setup/teardown requirements
- Naming conventions
- Error handling patterns

Categorize: **Must Follow** | **Should Follow** | **Nice to Have**

Skip if directory is empty or missing.

## 3. Analyze Frontend Source Code (if available)

Check for frontend source (e.g., `RefSrc/tools-st-frontend/`):
- Search React/Vue/Angular components for feature under test
- Identify `data-testid`, `data-test`, `test-id` attributes
- Note component hierarchy and props
- Document API calls and data models
- Record available test identifiers

## 4. Identify Existing Page Objects

Search codebase for page object files (`**/pages/**`, `**/page-objects/**`, `**/*Page.*`, `**/*page.*`):
- What page/component each represents
- Available selectors and methods
- Naming and organization patterns
- Which are relevant to this test
- Which need extension vs creation

## 5. Search for Similar Tests

Find tests covering similar features:
- Test structure patterns used
- Import and utility patterns
- Assertion styles
- File organization

Determine test location:
- **Add to existing file** if closely related and file not large
- **Create new file** if new area or better organization

## 6. Identify Reusable Utilities

Search utility dirs (`**/utils/**`, `**/helpers/**`, `**/lib/**`, `**/fixtures/**`):
- Setup helpers (login, navigation, data creation)
- Assertion utilities (custom matchers, wait helpers)
- Data generators
- Configuration utilities

## 7. Update Test Plan

Add code analysis section documenting all findings:
- Framework and standards
- Frontend analysis (if available)
- User instructions extracted
- Page objects (existing, missing, to extend)
- Similar tests and patterns
- Recommended test location with rationale
- Reusable utilities list

</process>

<pitfalls>
- Skipping project description — leads to pattern inconsistency
- Ignoring user instructions files
- Creating new page objects when existing ones can be extended
- Not searching for similar tests — misses established patterns
- Assuming project structure without verification
</pitfalls>

</aqa-codebase-analysis>
