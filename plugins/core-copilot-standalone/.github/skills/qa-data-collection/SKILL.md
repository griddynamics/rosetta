---
name: qa-data-collection
description: Gather test cases from TMS, search documentation, discover existing API test patterns in codebase, and produce raw data document.
tags: ["qa"]
baseSchema: docs/schemas/skill.md
---

<qa-data-collection>

<role>Backend API test data collection specialist using external MCPs and codebase analysis</role>

<when_to_use_skill>
Collect test case details, feature documentation, and existing API test patterns before backend test automation implementation.
</when_to_use_skill>

<prerequisites>
- Project config loaded (`qa-project-config.md`)
- Initial data file exists (`agents/qa/{IDENTIFIER}/initial-data.md`)
- TestRail and/or Jira MCPs configured (if applicable)
- Atlassian (Confluence) MCP configured (if applicable)
</prerequisites>

<process>

## 1. Load Project Config and Initial Data

1. Read `qa-project-config.md` for project settings
2. Read `agents/qa/{IDENTIFIER}/initial-data.md` for initial context
3. Identify data sources to query based on config:
   - Test case management system (TestRail, Jira, etc.)
   - Documentation storage (Confluence, local docs, etc.)
   - Swagger/OpenAPI spec URL (if available)

## 2. Retrieve Test Case(s)

Based on test case source from project config:

### Option A: TestRail Test Case
1. USE SKILL `mcp-testrail-data-collection`
2. Extract:
   - Test case ID and title
   - Test description / objective
   - Preconditions
   - Test steps (step-by-step actions)
   - Expected results for each step
   - Priority and test type
   - Custom fields (API endpoint, HTTP method if available)

### Option B: Jira Ticket
1. USE SKILL `mcp-jira-data-collection`
2. Extract:
   - Summary, description (both raw and rendered)
   - Acceptance criteria
   - Issue type, status, priority
   - Labels, components
   - Comments (up to 10 recent)
   - Custom fields (API endpoint, story points, etc.)

### Option C: Direct User Input
- Document the test case description as provided by user
- Ask for clarification on any ambiguous steps

For ALL options, capture:
- What endpoint(s) are being tested
- What HTTP method(s) are involved
- What the expected behavior is
- What test data is needed
- What preconditions exist

## 3. Search Documentation

Based on document storage config:

### Confluence Documentation
1. USE SKILL `mcp-confluence-data-collection`
2. Search for pages related to the API endpoints and feature under test
3. For each relevant page, extract feature context, API contracts, and business rules
4. Check for child pages with additional detail

### Local Documentation
- Search repository for relevant docs: `docs/`, `api-docs/`, `README.md`
- API design documents, Architecture decision records (ADRs)
- Grep for endpoint paths, feature names, API keywords

If user provided documentation URLs in initial prompt, use those directly and skip search.

If no documentation found, ask user:
```
No documentation found for [feature/endpoint]. Please provide:
- Documentation page URLs or paths
- Or type 'skip' to proceed with test cases and Swagger only
```

## 4. Analyze Backend Source Code (if available)

Determine backend source path using this priority:

1. Read `Backend Source Code` section from project config (`qa-project-config.md`) — use if path is explicitly set.
2. If NOT set in project config, check for `RefSrc/` projects that have Rosetta docs at `RefSrc/{project-name}/docs/`. Look for these key files:
   - `ARCHITECTURE.md` — system architecture, component relationships, API design
   - `CODEMAP.md` — file/directory structure, module organization
   - `CONTEXT.md` — project purpose, domain context, key concepts
   - `TECHSTACK.md` — frameworks, languages, libraries, dependencies
3. The workspace-level `ARCHITECTURE.md` may also reference `RefSrc/` paths (added by `external-lib-flow` during onboarding).

If backend source path is found (e.g., `RefSrc/{project-name}/` or a workspace path):

1. Verify the path exists using Glob
2. Read Rosetta docs first (if `RefSrc/{project-name}/docs/` exists):
   - `ARCHITECTURE.md` — extract API design, endpoint patterns, auth architecture
   - `CODEMAP.md` — identify controller/route/model directories and key files
   - `TECHSTACK.md` — identify backend framework, language, and dependencies
   - This gives a high-level map before searching source code
3. Identify backend framework and language (if not already determined from docs):
   - Search for framework markers: `pom.xml` / `build.gradle` (Spring), `package.json` (Express/Koa/NestJS), `requirements.txt` / `pyproject.toml` (FastAPI/Flask/Django), `*.csproj` (.NET)
4. If path contains a Repomix XML file (`RefSrc/{project-name}.xml`), search within that file for API route definitions and Swagger references
5. If path points to a source directory, search within it for:
   - Swagger/OpenAPI spec files: `swagger.json`, `swagger.yaml`, `openapi.json`, `openapi.yaml`
   - API route definitions:
     - Express/Koa: `router.get()`, `router.post()`, `app.get()`, `app.post()`
     - Spring: `@GetMapping`, `@PostMapping`, `@RequestMapping`
     - FastAPI/Flask: `@app.get()`, `@app.post()`, route decorators
     - .NET: `[HttpGet]`, `[HttpPost]`, controller endpoints
6. Note key directories (controllers/, routes/, models/, dto/, middleware/, validators/)
7. Record findings in raw data under "Backend Source Code Analysis" section

If backend source path is NOT found in any of the sources above, skip this step entirely.

## 5. Discover Existing Test Patterns

Analyze codebase for existing API test patterns:

1. Search for existing test files:
   - `*.test.*`, `*.spec.*`, `*_test.*`, `test_*.*`
   - `__tests__/`, `tests/`, `test/`, `spec/`
   - Focus on API/integration test directories

2. Identify test framework and patterns:
   - Import statements (pytest, jest, junit, restassured, supertest, etc.)
   - HTTP client library (requests, axios, fetch, RestAssured, HttpClient, etc.)
   - Test structure (describe/it, test classes, test functions)
   - Assertion patterns
   - Auth setup patterns (fixtures, beforeAll, setup methods)
   - Base URL configuration
   - Test data management (factories, fixtures, seed data)

3. Identify project conventions:
   - Test file naming conventions
   - Test directory structure
   - Shared utilities and helpers
   - Environment configuration (`.env.test`, test config files)
   - Mock/stub patterns for external services

## 6. Produce Raw Data Document

Create `agents/qa/{IDENTIFIER}/raw-data.md` using the template in `<output_format>`.

</process>

<output_format>

File: `agents/qa/{IDENTIFIER}/raw-data.md`

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

- **Source Location**: [RefSrc/{project-name}/ or workspace path or N/A]
- **Rosetta Docs**: [RefSrc/{project-name}/docs/ — ARCHITECTURE.md, CODEMAP.md, CONTEXT.md, TECHSTACK.md / N/A]
- **Backend Framework**: [Spring / Express / FastAPI / .NET / Other / N/A]
- **Language**: [Java / TypeScript / Python / C# / Other / N/A]
- **Route Definition Pattern**: [e.g., @GetMapping, router.get(), @app.get() / N/A]
- **Swagger/OpenAPI in Source**: [Found at path / Not found / N/A]
- **Validation Library**: [Joi / Zod / Pydantic / Bean Validation / Other / N/A]
- **Key Directories**: [controllers/, routes/, models/, dto/, middleware/ / N/A]

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

</output_format>

<pitfalls>
- Assuming test data when TestRail or Confluence returns incomplete results — note gaps instead
- Not cross-referencing TMS data with documentation findings
- Skipping codebase analysis for existing test patterns — leads to inconsistent implementation
- Not asking user for IDs/URLs when missing from config
- Ignoring existing test patterns and conventions in the codebase
- Skipping backend source code analysis when path is configured in project config — leads to less accurate API spec analysis in Phase 2
</pitfalls>

</qa-data-collection>
