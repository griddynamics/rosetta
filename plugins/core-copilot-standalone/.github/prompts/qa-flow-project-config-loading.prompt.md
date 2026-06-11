---
name: qa-flow-project-config-loading
description: Phase 0 of QA workflow - Project Config Loading (USER INTERACTION CONDITIONALLY REQUIRED)
alwaysApply: false
tags: []
baseSchema: docs/schemas/phase.md
---

<qa_flow_project_config_loading>

<description_and_purpose>
Initialize the QA session directory, load the existing project config or collect project-specific information from the user, and seed the workflow state file for backend API test automation. This phase is the SSoT for the QA session-folder layout and the project-config schema; downstream phases bind to the config keys defined here.
</description_and_purpose>

<workflow_context>
- Phase 0 of 8 in `qa-flow`
- Input (REQUIRED): user request with test case reference (TestRail ID, Jira ticket, or direct description)
- Input (OPTIONAL, when provided by user): Swagger/OpenAPI spec URL or path, Confluence/docs page URLs, backend source code locations
- `{IDENTIFIER}` derivation rule: prefer Jira key (e.g. `PROJ-123`) → TestRail case ID (e.g. `C12345`) → sanitized kebab-case feature name (e.g. `order-lookup`). First non-empty wins; recorded in `qa-state.md` on session init.
- Output (three paths — different scopes):
  - **Project-wide config (shared across all QA sessions):** `agents/qa/qa-project-config.md` — canonical path, created or reused by every QA session for this project. This is the load-bearing artifact `<config_contract>`, `<failure_handling>`, and `<validation_checklist>` refer to.
  - **Per-session artifacts (this run only):** `agents/qa/{IDENTIFIER}/initial-data.md`. The session directory does NOT contain its own `qa-project-config.md` copy — every session reads the project-wide one above.
  - **Workflow state file (one per QA project):** `agents/qa-state.md` — sibling to `agents/qa/`, seeded here and updated after every phase by `qa-flow.md` `<state_file>`.
- Prerequisite: starting new QA flow
- HITL: conditional — user is questioned ONLY if the project config does not already exist
</workflow_context>

<session_layout>

Canonical paths this phase creates / seeds (SSoT — downstream phases reuse these verbatim):

```
agents/qa-state.md                       (workflow state file — sibling to agents/qa/; one per QA project)
agents/qa/qa-project-config.md           (project-wide config — shared across ALL tickets in this project)
agents/qa/{IDENTIFIER}/                   (per-ticket session directory)
agents/qa/{IDENTIFIER}/initial-data.md   (this run's handoff artifact)
```

`{IDENTIFIER}` is chosen ONCE per `<workflow_context>` derivation rule and reused everywhere: the session directory name, the `IDENTIFIER` field in `qa-state.md`, and the `initial-data.md` path MUST all carry the same value. The project config is project-wide (NOT per-`{IDENTIFIER}`) — the same file is shared across every ticket.

</session_layout>

<phase_steps>
1. Parse user input, derive `{IDENTIFIER}`, and create the session directory + state-file stub.
2. Load the project-wide config, or collect project info from the user and create it.
3. Create the initial-data file and mark Phase 0 complete.
</phase_steps>

<execute_config step="0.1" subagent="discoverer" role="QA project config loader">

This phase performs session initialization DIRECTLY (no dedicated init skill); it delegates only user-questioning to `questioning`.

1. **Parse initial user input.** Extract:
   - **Test case reference** (REQUIRED): TestRail ID, Jira ticket key/URL, or direct test-case description.
   - **Additional context** (OPTIONAL): Swagger URL, Confluence pages, API documentation links.
   - Supported phrasings: `"Write API tests for TC-1234"`, `"Automate backend tests for PROJ-123"`, `"Create API tests for the user registration endpoint"`, `"Automate TC-1234 with Swagger: https://api.example.com/swagger"`.
2. **Derive `{IDENTIFIER}`** per the `<workflow_context>` rule (Jira key → TestRail ID → kebab-case feature). On multiple candidates, first non-empty wins; record the chosen value + rejected candidates in `initial-data.md`.
3. **Create the session directory** `agents/qa/{IDENTIFIER}/` and write the **state-file stub** to `agents/qa-state.md` (template in `<templates>` → State-file initial stub). The full per-phase update schema is owned by `qa-flow.md` `<state_file>`; this stub is only the seed.
4. **Load or create the project config** at the canonical path `agents/qa/qa-project-config.md` (project-wide, NOT per-`{IDENTIFIER}`):
   - **File exists AND non-empty:** reuse as-is; skip to step 0.2 — nothing to collect, no user interaction.
   - **File missing OR empty:** collect project info from the user — **USE SKILL `questioning`** asking the verbatim prompt in `<templates>` → Step-input user-prompt template. Validate the answer covers at minimum: document storage (or confirmation docs are in-repo), Swagger/OpenAPI availability, and where test cases come from. If a required field is missing, ask ONE follow-up naming exactly the missing fields (cap: 2 rounds total). Then write the populated config to the same canonical path using the `<templates>` → Project config template, applying `<safety_boundaries>` redaction at intake.
5. **Verify** the per-session directory `agents/qa/{IDENTIFIER}/` exists and the project-wide config is non-empty at the canonical path before proceeding.

</execute_config>

<create_initial_data step="0.2">
Write `agents/qa/{IDENTIFIER}/initial-data.md` per `<initial_data_contract>` — all four fields populated from the parsed input.
</create_initial_data>

<update_state step="0.3">
1. Update `agents/qa-state.md`:
   - Test Case Source: [TestRail ID / Jira key / Manual]
   - Config Source: [Existing / User provided / Discovered]
   - Files Created: initial-data.md, qa-state.md
   - Phase 0 completion timestamp
2. Mark Phase 0 complete, Phase 1 current.
</update_state>

<config_contract>

This block is the SSoT for the project-config field schema. Phase 0 is not complete until every required key below is populated with a real value or explicitly marked `N/A — <reason>` (or `TBD — <next-step>` where noted). The full markdown shape is in `<templates>` → Project config template.

**Required keys (consumed by later phases — vendor resolution downstream binds to these by exact name):**

| Section / Key | Consumed by | Required value or accepted N/A reason |
|---|---|---|
| `Document Storage` — `documentation_type` | `qa-flow-documentation-mcp-subflow.md` (Phase 1) | One of: `confluence` / `google-drive` / `local` / `none`. `N/A` only when `none`. |
| `Document Storage` — `documentation_mcp_collection_skill` | documentation subflow step 1 (resolved vendor binding) | Vendor binding (e.g. the `discovery` confluence binding) or `N/A — documentation_type: none` |
| `Document Storage` — `confluence_base_url` / `documentation_base_url` | documentation subflow scope detection | Base URL or `N/A — documentation_type: <non-confluence-value>` |
| `API Specification` — `swagger_url` (or path) | `qa-flow-api-spec-analysis.md` step 2.1 | URL/path, or `N/A — no Swagger spec available; code-based analysis will run` |
| `API Specification` — `spec_format` | `qa-flow-api-spec-analysis.md` step 2.1 | One of: `OpenAPI 3.x` / `Swagger 2.0` / `N/A` |
| `Backend Source Code` — `backend_source_path` | data-collection phase via `discovery`, `qa-flow-api-spec-analysis.md` step 2.1 | Path (e.g. `RefSrc/my-backend/` or `src/`) or `N/A — work from Swagger/docs only` |
| `Test Case Management` — `system` | data-collection phase via `discovery` (branch selector) | One of: `testrail` / `jira` / `confluence` / `manual` / `other` |
| `Test Case Management` — `testrail_base_url` | data-collection phase via `discovery` (vendor resolution when system is `testrail`) | Base URL or `N/A — system: <non-testrail-value>` |
| `Test Case Management` — `jira_base_url` | data-collection phase via `discovery` (vendor resolution when system is `jira`) | Base URL or `N/A — system: <non-jira-value>` |
| `Test Case Management` — `testcase_mcp_collection_skill` | data-collection phase via `discovery` (resolved vendor binding) | Vendor binding (e.g. the `discovery` testrail binding) or `N/A — system: manual` |
| `Test Case Management` — `project_id` / `suite_id` | data-collection phase via `discovery` (when system is `testrail`) | IDs, or `N/A — system: <non-testrail-value>` |
| `Test Framework` — `framework` | data-collection phase via `discovery` (validates discovery) | Name (`pytest` / `Jest` / etc.) or `TBD — will discover from codebase` |
| `Authentication` — `mechanism` | `qa-flow-api-spec-analysis.md` step 3 cross-check | One of: `oauth2` / `jwt` / `api-key` / `basic` / `none` / `TBD — will discover from spec/code` |

**Empty-field rule.** If the user is unsure or the project genuinely lacks one of the optional inputs, write `N/A — <reason>` for that key. Do NOT leave the key absent — Phase 1 grepping for the key by name will silently miss it and degrade analysis without flagging the gap.

</config_contract>

<initial_data_contract>

`agents/qa/{IDENTIFIER}/initial-data.md` is a thin handoff artifact for downstream phases. Required shape:

```markdown
# Initial Data — [IDENTIFIER]

**Initial user prompt:** [verbatim user text that started this QA run]
**Project config file:** agents/qa/qa-project-config.md
**Test case reference:** [TestRail ID / Jira key / direct description summary]
**Additional links provided:** [list URLs verbatim, or `None`]
```

All four fields are required. Use `None` only for the additional-links field; the other three must have content.

</initial_data_contract>

<safety_boundaries>

`agents/qa/qa-project-config.md` is **tracked + project-wide** (committed to VCS, read by every QA session). User-supplied answers can carry credential-shaped values that would persist into the repo without redaction.

**Auth fields — record mechanism + source, never literal values:**

- **API Auth Mechanism** (`mechanism`): record the **scheme name** only (`OAuth2 client-credentials` / `JWT Bearer` / `API Key in X-Api-Key header` / `Basic Auth` / `Session cookie` / `None`). Structural; acceptable.
- **Test Auth Strategy**: record the **strategy + source** (e.g. `Bearer JWT from AuthHelper.get_token('admin'); credentials in env vars E2E_USER + E2E_PASS`). **Never paste:** actual tokens, passwords, JSON contents, API key values, OAuth `client_secret`, or any production secret — regardless of "test"/"throwaway" labels.
- **Redaction at intake:** if a user answer pastes a literal secret (`Bearer eyJ...`, `password: SuperSecret123`, JSON with `client_secret`, etc.), redact at capture time before writing the config: replace with a mechanism+source description and add a one-line `## Additional Notes`: `Original auth answer included a literal <kind> — redacted; agent should request mechanism+source description from user if env var name is unknown.`
- **Other credential-shaped fields:** `Test Case Management` access tokens (TestRail API key, Jira PAT) → record as `MCP-managed` or `env var <NAME>`. Credentialed URLs (`https://user:pass@host`) → redact to `https://<redacted: credentialed URL>` + describe credential location in prose.
- **Synthetic test-user identities:** keep emails on IETF reserved domains (`test.user-1@example.com`); do not record real production emails even if "marked test".

**Structural content stays verbatim** — endpoint paths, framework names, directory paths, MCP names, base URLs and spec URLs without embedded credentials, TestRail/Jira project keys. Redaction targets sensitive **values**. Consistent with `requirements-use` and `debugging` `<safety_boundaries>`.

</safety_boundaries>

<failure_handling>

- **Test case reference missing or unparseable** (step 0.1 cannot extract a TestRail ID, Jira key, or feature description): stop, record `Phase 0 blocked: test case reference unresolvable from initial prompt "<prompt>"` in `agents/qa-state.md`, and ask the user for a TestRail case ID, Jira ticket key, or kebab-case feature name. Do NOT fabricate an `{IDENTIFIER}` — every downstream path depends on it.
- **`{IDENTIFIER}` underivable / ambiguous** (no Jira key, no TestRail ID, no usable feature name — or several): apply the `<workflow_context>` precedence (Jira key → TestRail ID → kebab-case; first non-empty wins) and record chosen + rejected candidates in `initial-data.md`. If still none, ask the user once (naming the three preference levels). After one unsuccessful re-ask, record `Phase 0 blocked: IDENTIFIER unresolvable — awaiting user supply` and stop. Do NOT pick a default like `unknown` or `tmp-N` — `{IDENTIFIER}` is referenced in every downstream phase's paths and a guess pollutes the entire QA session.
- **User questioning still incomplete after follow-up** (a required field — doc storage, Swagger availability, or test-case source — is still missing after the 2-round cap): stop, record `Phase 0 blocked: minimum project info not obtained after follow-up — missing: <list>` in `agents/qa-state.md`. Do NOT silently fall back to TBD for fields the user actually declined. (`TBD — will discover from codebase/spec` is acceptable only when the user explicitly opts into discovery.)
- **User-pasted literal credential in an answer:** apply `<safety_boundaries>` Redaction-at-intake. If the env-var name is unknown, ask once.
- **Existing config file malformed / missing required `<config_contract>` keys:** treat as `config-incomplete` — re-run only the collect-from-user branch (`questioning`) for the missing keys, then re-write the config preserving clean sections, and re-verify. Surface the corruption in `initial-data.md` notes. Do NOT advance to Phase 1 with an incomplete config — Phase 1's documentation subflow will silently degrade if `documentation_mcp_collection_skill` is absent rather than `N/A`-tagged.
- **`agents/qa-state.md` or `qa-project-config.md` unwritable** (permission denied, file locked, disk full): pause, report the filesystem error with the path; do not mark Phase 0 complete.
- **Session directory `agents/qa/{IDENTIFIER}/` not created:** create it directly (simple mkdir), then re-run verification. If the create fails, stop and report the filesystem error.

</failure_handling>

<validation_checklist>
- `agents/qa/{IDENTIFIER}/` directory exists
- `qa-project-config.md` exists at the canonical path (per `<workflow_context>`) with non-empty content — either pre-existing or freshly written
- **Every required key from `<config_contract>` is present** — populated with a real value OR explicitly marked `N/A — <reason>`; no key absent / blank / `TBD` without a documented next-step
- `initial-data.md` created per `<initial_data_contract>` with all four required fields populated
- `agents/qa-state.md` created with Phase 0 marked complete and `IDENTIFIER:` field matching the `agents/qa/{IDENTIFIER}/` directory name
- `{IDENTIFIER}` value identical across (a) directory name, (b) qa-state.md IDENTIFIER field, (c) initial-data.md path; no fabricated `{IDENTIFIER}`
- No literal credential persisted in the saved config (per `<safety_boundaries>` Redaction-at-intake); any redaction noted in `## Additional Notes`
- No failure-handling condition from `<failure_handling>` is currently active — every listed scenario has either not been triggered or has been remediated
</validation_checklist>

<templates>

## State-file initial stub

Written to `agents/qa-state.md` at session init. The full per-phase update schema is owned by `qa-flow.md` `<state_file>`; this stub is the seed.

```markdown
# API QA State - <Test Name / Feature>

**Last Updated**: [DateTime]
**Current Phase**: 0
**Test Case Source**: [TestRail ID / Jira Ticket / Manual]
**Feature**: [Feature Name]
**IDENTIFIER**: [the {IDENTIFIER} value chosen above — must match agents/qa/{IDENTIFIER}/ directory]

## Phase Completion Status

- [x] Phase 0: Project Config Loading
- [ ] Phase 1: Data Collection
- [ ] Phase 2: API Spec Analysis
- [ ] Phase 3: Gap & Requirements Clarification
- [ ] Phase 4: Test Case Specification
- [ ] Phase 5: Test Implementation
- [ ] Phase 6: Execution & Report Analysis
- [ ] Phase 7: Test Corrections
```

## Step-input user-prompt template

Asked verbatim via `USE SKILL questioning` only when the project config does not already exist.

```
To automate backend API tests effectively, I need the following project details:

1. **Document Storage**: Where is your project documentation?
   - Confluence (provide space key or page URLs)
   - Google Drive (provide links)
   - Local docs in repository (provide paths)
   - Other (please specify)

2. **API Specification**: Do you have a Swagger/OpenAPI spec?
   - If yes, provide the URL (e.g., https://api.example.com/swagger.json)
   - If no, I will work from documentation and code analysis

3. **Test Case Management**: Where are your test cases stored?
   - TestRail (provide project/suite IDs)
   - Jira (test cases as tickets or in description)
   - Confluence (test case pages)
   - Provided directly in this conversation
   - Other (please specify)

4. **Test Framework** (optional — I can discover from codebase):
   - What test framework does the project use? (e.g., pytest, Jest, JUnit, RestAssured, SuperTest)
   - Where are existing API tests located? (e.g., tests/api/, src/test/)

5. **Authentication** (optional — I can discover from Swagger/code):
   - What auth mechanism does the API use? (OAuth2, JWT, API Key, Basic, None)
   - How should tests authenticate? (test credentials, mock auth, service account)

6. **Backend Source Code** (optional — helps me analyze API routes and validation; I can also discover from ARCHITECTURE.md RefSrc references):
   - In RefSrc/ folder (provide project name, e.g., RefSrc/my-backend/)
   - In the current workspace (provide path, e.g., src/, backend/)
   - Not available (I will work from Swagger/docs only)

Please answer what you know — I can discover the rest from code and docs.
```

## Project config template

Written to the canonical path `agents/qa/qa-project-config.md` (project-wide; shared across every QA session for this project). Populate each section from the user's answers; mark optional fields `TBD — <reason>` when discovery is intentionally deferred. The `<config_contract>` table is the authority for which keys are required.

```markdown
# QA Project Config

**Created**: [DateTime]
**Last Updated**: [DateTime]

## Document Storage
- **documentation_type**: [confluence / google-drive / local / none]
- **documentation_mcp_collection_skill**: [skill tag or N/A — documentation_type: none]
- **confluence_base_url / documentation_base_url**: [Base URL or N/A — documentation_type: <value>]
- **Location**: [URLs, space keys, paths]

## API Specification
- **swagger_url**: [URL/path or N/A — no Swagger spec available; code-based analysis will run]
- **spec_format**: [OpenAPI 3.x / Swagger 2.0 / N/A]

## Backend Source Code
- **backend_source_path**: [RefSrc/{project-name}/ / workspace path / N/A — work from Swagger/docs only]
- **Framework**: [Spring / Express / FastAPI / .NET / Other / TBD]

## Test Case Management
- **system**: [testrail / jira / confluence / manual / other]
- **testrail_base_url**: [Base URL or N/A — system: <non-testrail-value>]
- **jira_base_url**: [Base URL or N/A — system: <non-jira-value>]
- **testcase_mcp_collection_skill**: [skill tag or N/A — system: manual]
- **project_id / suite_id**: [IDs if applicable, or N/A — system: <value>]
- **Access**: [MCP-managed / env var <NAME> / manual]

## Test Framework
- **framework**: [pytest / Jest / JUnit / RestAssured / SuperTest / Other / TBD — will discover from codebase]
- **Test Location**: [Directory path or TBD]
- **Existing API Tests**: [Yes / No / TBD]

## Authentication
- **mechanism**: [oauth2 / jwt / api-key / basic / none / TBD — will discover from spec/code]
- **Test Auth Strategy**: [strategy + source, e.g. Bearer JWT from AuthHelper; creds in env vars — never literal values]

## Additional Notes
- [Any project-specific details, constraints, or preferences]
- [If `<safety_boundaries>` Redaction-at-intake was applied: `Original auth answer included a literal <kind> — redacted; agent should request mechanism+source description from user if env var name is unknown.`]
```

</templates>

</qa_flow_project_config_loading>
