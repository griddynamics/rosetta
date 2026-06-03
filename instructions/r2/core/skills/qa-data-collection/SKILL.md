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

This step is **orchestration only**. The detailed framework markers, route-definition patterns, Swagger-discovery rules, and per-framework directory layouts live in [references/backend-source-analysis.md](references/backend-source-analysis.md) — load that file on demand when running this step. Do **not** restate its enumerations here or in the output template.

Determine the backend source path using this priority:

1. Read `Backend Source Code` section from project config (`qa-project-config.md`) — use if path is explicitly set.
2. If NOT set in project config, check for `RefSrc/` projects that have Rosetta docs at `RefSrc/{project-name}/docs/` (key files: `ARCHITECTURE.md`, `CODEMAP.md`, `CONTEXT.md`, `TECHSTACK.md`).
3. The workspace-level `ARCHITECTURE.md` may also reference `RefSrc/` paths (added by `external-lib-flow` during onboarding).

If a path is found:

1. Verify the path exists (Glob).
2. Read Rosetta docs first if `RefSrc/{project-name}/docs/` exists — `TECHSTACK.md` for framework/language, `CODEMAP.md` for directory structure, `ARCHITECTURE.md` for endpoint patterns/auth.
3. Identify framework + language + route patterns + key directories per the tables in [references/backend-source-analysis.md](references/backend-source-analysis.md). If a Repomix XML file (`RefSrc/{project-name}.xml`) is present, grep within that file rather than walking the tree.
4. Record findings in raw data under "Backend Source Code Analysis" — fields use the same vocabulary as the references file (single source of truth).

If no backend source path is discoverable, skip this step entirely.

## 5. Discover Existing Test Patterns

**Orchestration only** — detailed enumerations (search globs, framework markers, HTTP clients, structure/assertion/auth patterns, project conventions, mock frameworks) live in [references/existing-test-patterns.md](references/existing-test-patterns.md); load on demand.

1. Search for existing test files (globs in references sub-step 1) — focus on API / integration directories.
2. Identify framework + HTTP client + test structure (markers in references sub-step 2).
3. Identify project conventions — naming, directory layout, shared utilities, env config, mocks (references sub-step 3).
4. **Env-config safety:** record env-file **path and variable names only** — NEVER copy literal values (per `<safety_boundaries>`).
5. Record findings in `raw-data.md` "Existing Test Patterns" per `<output_format>`.

## 6. Pre-write Safety + Completeness Re-check

Before writing `raw-data.md`, re-verify against `<safety_boundaries>` and `<pitfalls>`:

1. **Secret scan per `<safety_boundaries>`.** Review every section that will be written; replace any literal credentials/tokens/PII with the path + mechanism placeholders from the `<safety_boundaries>` Targets list.
2. **Anti-assumption scan.** For each pitfall in `<pitfalls>`, confirm the corresponding section either has real data OR explicitly records the gap. Do not silently fill missing TMS / docs / codebase info with inferences.
3. **Endpoint table completeness.** Every row in the API Endpoints table must have Method + Source populated; partial rows are tagged as gaps in the Notes section.

If any of (1) (2) (3) fails, fix the draft before proceeding to step 7.

## 7. Produce Raw Data Document

Create `agents/qa/{IDENTIFIER}/raw-data.md` using the verbatim template in [references/output-template.md](references/output-template.md) — load on demand at this step. Populate each section with the data collected in steps 2–5 per `<output_format>` (which is itself a thin pointer to the same reference).

</process>

<output_format>

File: `agents/qa/{IDENTIFIER}/raw-data.md`

Verbatim template + section structure (Test Case Data, Documentation, Existing Test Patterns, Backend Source Code Analysis, API Endpoints Identified, Data Collection Summary): [references/output-template.md](references/output-template.md) — loaded on demand at step 7 (same lazy-loading pattern step 4 + step 5 use).

</output_format>

<pitfalls>
- Assuming test data when TestRail or Confluence returns incomplete results — note gaps instead
- Not cross-referencing TMS data with documentation findings
- Skipping codebase analysis for existing test patterns — leads to inconsistent implementation
- Not asking user for IDs/URLs when missing from config
- Ignoring existing test patterns and conventions in the codebase
- Skipping backend source code analysis when path is configured in project config — leads to less accurate API spec analysis in Phase 2
- **Copying literal `.env` values, tokens, or passwords into `raw-data.md` — see `<safety_boundaries>`**
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

<success_criteria>

Complete when **all of** the following hold:

- `agents/qa/{IDENTIFIER}/raw-data.md` written with every `<output_format>` template section present-or-`N/A — <reason>` (silent omission is forbidden).
- At least one test-case source captured (TestRail / Jira / User Provided) per step 2 — a raw-data.md with zero test-case data is incomplete.
- Step 6.1 secret-scan + step 6.2 anti-assumption scan both passed (canonical procedures live in `<process>` step 6 + `<safety_boundaries>`).
- API endpoints table has every row with Method + Source populated (partial rows tagged as Notes gaps).

The skill is **NOT complete** if it emits a raw-data.md with silently missing sections, with inferred values where gaps belong, or with literal credentials/PII — OR if a `<failure_handling>` stop path was reached and not followed (paused phase, not complete).

</success_criteria>

<failure_handling>

- **Project config missing or unreadable** at `agents/qa/qa-project-config.md` (step 1 prerequisite): stop, report `qa-data-collection: project config missing/unreadable at <path>`, ask the user to rerun Phase 0 (qa-flow-project-config-loading). Do NOT proceed with assumed defaults.
- **Initial-data file missing or unreadable** at `agents/qa/{IDENTIFIER}/initial-data.md`: stop, report the missing/unreadable path, ask user to rerun Phase 0. Do NOT pick a default identifier.
- **Delegated MCP skill stops with a failure** (`mcp-testrail-data-collection`, `mcp-jira-data-collection`, `mcp-confluence-data-collection` returns a stop report — auth failure, ticket/case/page not found, MCP not configured, transport error per the sub-skill's own `<failure_handling>`):
  - Record the sub-skill's failure message verbatim in the corresponding `raw-data.md` section's `## Notes / Gaps` as `Gap: <sub-skill-name> stopped — <verbatim message>`.
  - Do NOT fabricate substitute content for the failed source — the gap is the data point.
  - Continue collection with the **remaining sources** unless the failed source was the **only** test-case source (step 2). If the only test-case source failed, stop the whole skill and surface to the calling workflow — `<success_criteria>` requires at least one test-case source.
- **No TMS source resolvable** (step 2 — project config names a TMS but the user supplied no ticket/case ID AND the delegated MCP skill cannot infer one): stop, ask the user once for the ticket/case ID. After one re-ask still missing, stop the skill, record `Phase 1 blocked: no resolvable test-case source — TMS configured but identifier not supplied` in `agents/qa-state.md`. Do NOT invent an ID.
- **Documentation step user response missing** (step 3 ask-once: no documentation found AND user supplies neither URLs nor explicit `skip`): re-ask once. If still no response, treat as explicit `skip` AND record `Documentation: not available — no user response after re-ask` in `## Documentation`. Continue with the remaining steps.
- **Backend source code path set in config but absent on disk** (step 4): record `Gap: backend source path <path> set in qa-project-config.md but not found on disk` in the Backend Source Code Analysis section's Notes. Continue with the remaining steps; do NOT silently mark `N/A`.
- **`raw-data.md` unwritable** (permission denied, disk full): pause, report the filesystem error with the file path, do not mark Phase 1 complete.

</failure_handling>

<validation_checklist>

5-item pre-emit checklist lives in [references/validation-checklist.md](references/validation-checklist.md) — loaded on demand from `<process>` step 6 (the only step that runs the checklist).

</validation_checklist>

</qa-data-collection>
