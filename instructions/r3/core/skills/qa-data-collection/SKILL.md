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
   - Environment configuration (`.env.test`, test config files) — **record path and variable names only, NEVER copy literal values** (see `<safety_boundaries>`)
   - Mock/stub patterns for external services

## 6. Pre-write Safety + Completeness Re-check

Before writing `raw-data.md`, re-verify against `<safety_boundaries>` and `<pitfalls>`:

1. **Secret scan.** Review every section that will be written. No literal credentials, API keys, tokens, passwords, full `.env` contents, connection strings, or private keys may appear. Replace with `<source: env var X / config Y>` placeholders.
2. **Anti-assumption scan.** For each pitfall in `<pitfalls>`, confirm the corresponding section either has real data OR explicitly records the gap. Do not silently fill missing TMS / docs / codebase info with inferences.
3. **Endpoint table completeness.** Every row in the API Endpoints table must have Method + Source populated; partial rows are tagged as gaps in the Notes section.

If any of (1) (2) (3) fails, fix the draft before proceeding to step 7.

## 7. Produce Raw Data Document

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
- **Copying literal `.env` values, API keys, tokens, or passwords into `raw-data.md` — this artifact is tracked and may be shared; record source + mechanism only (see `<safety_boundaries>`)**
- Marking sections "TBD" or skipping them silently instead of explicitly recording the gap with a reason
</pitfalls>

<safety_boundaries>

`raw-data.md` is a tracked artifact and may end up in version control, shared review, or downstream prompt contexts. Treat it as **PUBLIC by default**. This skill MUST NOT capture sensitive values verbatim:

- **Credentials / API keys / tokens / passwords / OAuth secrets:** record only the **source** (env var name, secret-manager path, config-file path) and the **mechanism** (Bearer token, Basic Auth, OAuth client-credentials flow, API key header `X-Api-Key`, etc.). NEVER copy the literal value.
- **`.env`, `.env.test`, `.env.local`, `secrets.yaml`, or similar files:** record their **path** and the **variable names** that test/auth/base-URL logic depends on. Do NOT copy values. If a file is gitignored, note that fact instead of opening it for content capture.
- **Database connection strings, service-account JSONs, private keys, certificates, signed URLs:** record presence and path only. Do not paste contents into `raw-data.md`.
- **Base URLs and endpoint paths** are usually safe to record verbatim (e.g., `https://api.staging.example.com/v1/orders`). Exception: if a URL embeds credentials in the form `https://user:pass@host/...`, redact the `user:pass@` portion before recording.
- **Test data fixtures with PII** (real names, real emails, real phone numbers, real account IDs of production users): use the pattern's structure only, not the values. Replace with placeholders if needed for shape demonstration.

If a section in the `<output_format>` template would naturally require sensitive content (e.g., an auth-setup snippet that includes a hardcoded token), describe the pattern in prose with a placeholder rather than reproduce the literal code.

</safety_boundaries>

<validation_checklist>

Before declaring this skill complete, all of the following must hold:

- `agents/qa/{IDENTIFIER}/raw-data.md` was written with every section from the `<output_format>` template present (or explicitly marked "N/A" with a one-line reason — not silently skipped)
- **Test cases section:** at least one source identified (TestRail / Jira / User Provided); gaps from incomplete TMS / Jira / Confluence retrieval are recorded as explicit `Gap: ...` notes, NOT silently filled with assumptions
- **Documentation section:** if no documentation was found, the user was asked and the response (URLs supplied OR explicit `skip` decision) is recorded
- **Existing test patterns section:** if a test framework was identified, the file naming convention, test structure example, and auth-setup pattern (described, not pasted) are filled in (not "TBD"); if no existing tests, the section explicitly says so with a reason
- **Backend source code section:** populated when backend path was set in project config OR discovered via `RefSrc/`; explicitly marked "N/A" with a reason when no source was available — NOT skipped silently
- **API endpoints table:** every row has Method + Source columns populated; partial rows (e.g., method unknown) are tagged as gaps in the Notes section
- **Safety re-check (per step 6.1):** `raw-data.md` was scanned for literal secrets (passwords, tokens, API keys, full `.env` contents, connection strings, private keys); none are present — only paths and mechanism descriptions
- **Anti-assumption re-check (per step 6.2):** every pitfall in `<pitfalls>` was reviewed against the artifact before declaring complete; gaps in TMS / Confluence / codebase analysis are recorded as gaps, not filled by inference

</validation_checklist>

</qa-data-collection>
