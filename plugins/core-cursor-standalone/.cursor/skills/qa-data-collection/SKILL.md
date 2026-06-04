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

<core_concepts>

- All Rosetta prep steps MUST be FULLY completed, load-context skill loaded and fully executed.
- **Hard safety constraint** (full rule in `<safety_boundaries>` below): NEVER copy literal credentials / tokens / API keys / passwords / PII into `raw-data.md`. Record source + mechanism, never the literal value.
- **Lazy-loading convention** (stated once; not restated per step): every `references/<file>.md` named below is loaded on demand at the step that owns it (step 4 → `backend-source-analysis.md`; step 5 → `existing-test-patterns.md`; step 6 → `validation-checklist.md`; step 7 → `output-template.md`).
- **Canonical paths** for prerequisite artifacts:
  - `agents/qa/qa-project-config.md` — project config (project-wide, written by Phase 0 `qa-flow-project-config-loading` / `qa-project-config` skill).
  - `agents/qa/{IDENTIFIER}/initial-data.md` — initial-data file (per-IDENTIFIER, written by Phase 0).
  - `agents/qa-state.md` — workflow state file (project-wide).

</core_concepts>

<prerequisites>
- Project config loaded (`agents/qa/qa-project-config.md`)
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

Orchestration only — framework markers, route-definition patterns, Swagger-discovery rules, and per-framework directory layouts live in [references/backend-source-analysis.md](references/backend-source-analysis.md). Determine the backend source path using this priority:

1. Read `Backend Source Code` section from project config (`agents/qa/qa-project-config.md`) — use if path is explicitly set.
2. If NOT set in project config, check for `RefSrc/` projects that have Rosetta docs at `RefSrc/{project-name}/docs/` (key files: `ARCHITECTURE.md`, `CODEMAP.md`, `CONTEXT.md`, `TECHSTACK.md`).
3. The workspace-level `ARCHITECTURE.md` may also reference `RefSrc/` paths (added by `external-lib-flow` during onboarding).

If a path is found:

1. Verify the path exists (Glob).
2. Read Rosetta docs first if `RefSrc/{project-name}/docs/` exists — `TECHSTACK.md` for framework/language, `CODEMAP.md` for directory structure, `ARCHITECTURE.md` for endpoint patterns/auth.
3. Identify framework + language + route patterns + key directories per the tables in [references/backend-source-analysis.md](references/backend-source-analysis.md). If a Repomix XML file (`RefSrc/{project-name}.xml`) is present, grep within that file rather than walking the tree.
4. Record findings in raw data under "Backend Source Code Analysis" — fields use the same vocabulary as the references file (single source of truth).

If no backend source path is discoverable, skip this step entirely.

## 5. Discover Existing Test Patterns

Orchestration only — search globs, framework markers, HTTP clients, structure/assertion/auth patterns, project conventions, and mock frameworks live in [references/existing-test-patterns.md](references/existing-test-patterns.md).

1. Search for existing test files (globs in references sub-step 1) — focus on API / integration directories.
2. Identify framework + HTTP client + test structure (markers in references sub-step 2).
3. Identify project conventions — naming, directory layout, shared utilities, env config, mocks (references sub-step 3).
4. **Env-config safety:** record env-file **path and variable names only** — NEVER copy literal values (per `<safety_boundaries>`).
5. Record findings in `raw-data.md` "Existing Test Patterns" per `<output_format>`.

## 6. Pre-write Safety + Completeness Re-check

Before writing `raw-data.md`, re-verify against `<safety_boundaries>` and `<failure_handling>`:

1. **Secret scan per `<safety_boundaries>`.** Review every section that will be written; replace any literal credentials/tokens/PII with the path + mechanism placeholders from the `<safety_boundaries>` Targets list.
2. **Anti-assumption scan.** For each section, confirm it either has real data OR explicitly records the gap (see Gap-note example below). Do not silently fill missing TMS / docs / codebase info with inferences.
3. **Endpoint table completeness.** Every row in the API Endpoints table must have Method + Source populated; partial rows are tagged as gaps in the Notes section.

**Inline examples** (grounding for the highest-risk emit shapes — full template in `references/output-template.md`):

```markdown
Gap: mcp-jira-data-collection stopped — Jira issue PROJ-456 not found in configured project; user supplied no fallback URL after re-ask.
```

```markdown
| Endpoint | Method | Source |
|---|---|---|
| /api/v1/orders/{id} | GET | TestRail TC-1234 + Swagger `paths./api/v1/orders/{id}.get` |
| /api/v1/refunds | POST | Gap: endpoint mentioned in Jira PROJ-123 description but absent from Swagger; awaiting confirmation. |
```

If any of (1)(2)(3) fails, fix the draft before proceeding to step 7.

## 7. Produce Raw Data Document

Create `agents/qa/{IDENTIFIER}/raw-data.md` using the verbatim template in [references/output-template.md](references/output-template.md). Populate each section with the data collected in steps 2–5 per `<output_format>`.

</process>

<output_format>

File: `agents/qa/{IDENTIFIER}/raw-data.md`. Verbatim template + 6 required sections (Test Case Data / Documentation / Existing Test Patterns / Backend Source Code Analysis / API Endpoints Identified / Data Collection Summary) live in [references/output-template.md](references/output-template.md).

</output_format>

<safety_boundaries>

`raw-data.md` is **PUBLIC by default** (tracked, shared review, downstream prompt contexts). This skill MUST NOT capture sensitive values verbatim:

- **Credentials / API keys / tokens / passwords / OAuth secrets:** record **source** (env var, secret-manager path, config-file path) + **mechanism** (Bearer / Basic / OAuth client-credentials / `X-Api-Key` header / etc.). NEVER copy the literal value.
- **`.env`, `.env.test`, `.env.local`, `secrets.yaml`:** record **path** + **variable names** test/auth/base-URL logic depends on. Do NOT copy values; gitignored → note that fact, do not open.
- **DB connection strings, service-account JSONs, private keys, certificates, signed URLs:** record presence + path only.
- **Base URLs / endpoint paths:** safe verbatim (`https://api.staging.example.com/v1/orders`). Exception: redact `user:pass@` if embedded.
- **PII in test fixtures** (real names/emails/phones/account IDs): use the structural shape only; replace values with placeholders.

**Reconciliation — PUBLIC-by-default vs base-URLs-safe-verbatim:** internal/staging URLs (e.g. `https://api.staging.example.com`, internal hostnames, non-production environment identifiers) are **acceptable verbatim** in `raw-data.md` per the base-URL rule above. The PUBLIC-by-default rule targets **secrets** (credentials, tokens, PII) — NOT infrastructure topology. If a project explicitly classifies internal hostnames as sensitive (rare; declared in `qa-project-config.md`'s `Security` notes), reduce to host-shape (`https://api.<env>.<host>/...`) with a one-line note; otherwise commit verbatim.

If an `<output_format>` section would naturally require sensitive content (e.g., auth-setup snippet with a hardcoded token), describe the pattern in prose with a placeholder.

</safety_boundaries>

<success_criteria>
Complete when `raw-data.md` is written with every `<output_format>` section present-or-`N/A — <reason>`, at least one test-case source captured per step 2, step 6 (1)(2)(3) re-checks passed, and every API endpoints row has Method + Source populated. NOT complete on silent omissions, inferred values where gaps belong, or literal credentials/PII.
</success_criteria>

<failure_handling>

- **Project config or initial-data file missing/unreadable** (canonical paths in `<core_concepts>`): stop, report the missing path, ask the user to rerun Phase 0 (`qa-flow-project-config-loading`). Do NOT proceed with assumed defaults; do NOT pick a default identifier.
- **Delegated MCP skill stops** (`mcp-testrail-data-collection` / `mcp-jira-data-collection` / `mcp-confluence-data-collection` returns a stop per its own `<failure_handling>`): record the sub-skill's failure message verbatim in the corresponding section's `## Notes / Gaps` as `Gap: <sub-skill-name> stopped — <verbatim message>`. Do NOT fabricate substitute content. Continue with remaining sources, EXCEPT if the failed source was the only test-case source (step 2) — then stop the whole skill (`<success_criteria>` requires ≥1 test-case source).
- **No TMS source resolvable** (step 2): ask the user once. If still missing, stop the skill and record `Phase 1 blocked: no resolvable test-case source — TMS configured but identifier not supplied` in `agents/qa-state.md`. Do NOT invent an ID.
- **Documentation step user response missing** (step 3): re-ask once. If still no response, treat as `skip` and record `Documentation: not available — no user response after re-ask` in `## Documentation`. Continue.
- **Backend source path absent on disk** (step 4, when set in config): record `Gap: backend source path <path> set in qa-project-config.md but not found on disk` in the Backend Source Code Analysis Notes. Continue; do NOT silently mark `N/A`.
- **`raw-data.md` unwritable**: pause, report the filesystem error with the path; do not mark Phase 1 complete.

</failure_handling>

<validation_checklist>

5-item pre-emit checklist lives in [references/validation-checklist.md](references/validation-checklist.md) — loaded on demand from `<process>` step 6 (the only step that runs the checklist).

</validation_checklist>

</qa-data-collection>
