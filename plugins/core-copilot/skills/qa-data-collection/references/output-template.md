# Raw Data Output Template — qa-data-collection

Loaded on demand from SKILL.md step 7 ("Produce Raw Data Document") when actively writing `raw-data.md`. The base SKILL.md keeps step 7 as a thin orchestration entry pointing here; this file holds the verbatim markdown template.

Mirrors the same lazy-loading pattern step 4 (`references/backend-source-analysis.md`) and step 5 (`references/existing-test-patterns.md`) already use.

---

## Verbatim raw-data.md template (referenced from SKILL.md step 7 + `<output_format>`)

File path: `agents/qa/{IDENTIFIER}/raw-data.md`

```markdown
# Raw Data - [IDENTIFIER]

**Extracted**: [DateTime]
**Phase**: 1 - Data Collection

---

## Test Case Data

### Source: [TestRail TC-1234 / Jira PROJ-123 / User Provided]
**URL**: [Source URL if applicable]
**Title**: [Test case title]
**Priority**: [Priority]

### Test Objective
[What is being tested and why]

### Preconditions
[List preconditions]

### Test Steps
1. [Step 1]
   - Expected: [Result]
2. [Step 2]
   - Expected: [Result]

### Expected Overall Result
[Final expected outcome]

---

## Documentation

### Page 1: [Page Title]
**URL**: [URL]
**Relevance**: [Why this page is relevant]

#### Key Information
[Extracted relevant content — API contracts, business rules, constraints]

---

## Existing Test Patterns

### Test Framework
- **Framework**: [Name and version]
- **HTTP Client**: [Library name]
- **Location**: [Test directory path]

### File Naming Convention
- Pattern: [e.g., `*.api.test.ts`, `test_*.py`]
- Example: [Existing file path]

### Test Structure Pattern
[Example of existing test structure from codebase]

### Auth Setup Pattern
[How existing tests handle authentication]

### Shared Utilities
- [Utility 1]: [Purpose and file path]
- [Utility 2]: [Purpose and file path]

### Environment Config
- Base URL source: [env var, config file, hardcoded]
- Test env file: [path or N/A]

---

## Backend Source Code Analysis

Vocabulary for every field below is sourced from [references/backend-source-analysis.md](backend-source-analysis.md) (single source of truth — do not re-enumerate options here):

- **Source Location**: [path / `N/A — <reason>`]
- **Rosetta Docs**: [`RefSrc/{project-name}/docs/` files read, or `N/A — <reason>`]
- **Backend Framework**: [pick from "Framework Markers" table, or `N/A`]
- **Language**: [pick from "Framework Markers" table, or `N/A`]
- **Route Definition Pattern**: [pick from "Route Definition Patterns" table, or `N/A`]
- **Swagger/OpenAPI in Source**: [path found, or `Not found`, or `N/A`]
- **Validation Library**: [as detected, or `N/A`]
- **Key Directories**: [paths matched against "Key Directory Layout" table, or actual layout if non-standard, or `N/A`]

---

## API Endpoints Identified

| Endpoint | Method | Source | Description |
|----------|--------|--------|-------------|
| [Path] | [GET/POST/...] | [TestCase/Docs/Code] | [Brief description] |

---

## Data Collection Summary

- **Test Cases Retrieved**: [Count]
- **Documentation Pages Found**: [Count]
- **API Endpoints Identified**: [Count]
- **Existing Test Files Found**: [Count]
- **Test Framework**: [Name]
- **Notes**: [Any issues during extraction]
```
