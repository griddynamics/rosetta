---
name: qa-flow-project-config-loading
description: Phase 0 of QA workflow - Project Config Loading (USER INTERACTION CONDITIONALLY REQUIRED)
alwaysApply: false
tags: []
baseSchema: docs/schemas/phase.md
---

<qa_flow_project_config_loading>

<description_and_purpose>
Initialize the QA session directory, load the existing project config or collect project-specific information from the user, and seed the workflow state file for backend API test automation. Canonical paths, the `{IDENTIFIER}` derivation rule, the config-key schema, and the state-file shape are owned by `USE SKILL qa-structure` — this phase binds to them and does not restate them.
</description_and_purpose>

<workflow_context>
- Phase 0 of 8 in `qa-flow`
- Input (REQUIRED): user request with test case reference (TestRail ID, Jira ticket, or direct description)
- Input (OPTIONAL, when provided by user): Swagger/OpenAPI spec URL or path, Confluence/docs page URLs, backend source code locations
- Output (canonical paths owned by `qa-structure`): project-wide `agents/qa/qa-project-config.md`; per-session `agents/qa/{IDENTIFIER}/initial-data.md`; workflow state `agents/qa-state.md`.
- Prerequisite: starting new QA flow
- HITL: conditional — user is questioned ONLY if the project config does not already exist
- Skills: `qa-structure` (paths / `{IDENTIFIER}` / config schema / state shape), `questioning` (config-missing interview), `qa-knowledge` (redaction scope for the pre-write gate)
</workflow_context>

<phase_steps>
1. Parse user input, derive `{IDENTIFIER}`, and create the session directory + state-file stub.
2. Load the project-wide config, or collect project info from the user and create it.
3. Create the initial-data file and mark Phase 0 complete.
</phase_steps>

<execute_config step="0.1" subagent="discoverer" role="QA project config loader">

**QA (backend API) flow — use the `qa-*` layout/asset variants, never the `aqa-*` ones.** USE SKILL `qa-structure`; ACQUIRE `qa-structure/references/qa-layout.md` FROM KB for the session layout + `{IDENTIFIER}` derivation, and `qa-structure/references/config-schema.md` for the config-key schema. This phase performs session initialization DIRECTLY (no dedicated init skill); it delegates only user-questioning to `questioning`. On the config-missing branch it performs a bounded set of loads (qa-layout, config-schema, then the interview + config-template assets at step 0.1.4) — load each at its step; never write an artifact from memory.

1. **Parse initial user input.** Extract:
   - **Test case reference** (REQUIRED): TestRail ID, Jira ticket key/URL, or direct test-case description.
   - **Additional context** (OPTIONAL): Swagger URL, Confluence pages, API documentation links.
   - Supported phrasings: `"Write API tests for TC-1234"`, `"Automate backend tests for PROJ-123"`, `"Create API tests for the user registration endpoint"`, `"Automate TC-1234 with Swagger: https://api.example.com/swagger"`.
2. **Derive `{IDENTIFIER}`** per the `qa-structure` rule (Jira key → TestRail ID → kebab-case feature). On multiple candidates, first non-empty wins; record the chosen value + rejected candidates in `initial-data.md`.
3. **Create the session directory** `agents/qa/{IDENTIFIER}/` and write the **state-file stub** (below — kept inline, always needed) to `agents/qa-state.md`. The full per-phase update schema is owned by `qa-flow.md` `<state_file>`; this stub is only the seed:

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
4. **Load or create the project config** at the canonical path `agents/qa/qa-project-config.md` (project-wide, NOT per-`{IDENTIFIER}`): if the file exists AND is non-empty → `<config_exists>`; if it is missing OR empty → `<config_missing>`.
5. **Verify** the per-session directory `agents/qa/{IDENTIFIER}/` exists and the project-wide config is non-empty at the canonical path before proceeding.

</execute_config>

<config_exists step="0.1.4a">
1. Reuse the existing config as-is; skip to step 0.2 — nothing to collect, no user interaction.
2. Still confirm every required key from `qa-structure/references/config-schema.md` is present; a malformed / incomplete existing config is handled per `<failure_handling>` (the config-incomplete branch).
</config_exists>

<config_missing step="0.1.4b">
1. Collect project info from the user — **USE SKILL `questioning`** asking the verbatim prompt in the asset `qa-structure/assets/qa-config-interview.md` (ACQUIRE FROM KB).
2. Validate the answer covers at minimum: document storage, Swagger/OpenAPI availability, and the test-case source. If a required field is missing, ask ONE follow-up naming exactly the missing fields — cap 2 rounds total.
3. Write the populated config using the asset `qa-structure/assets/qa-project-config-template.md` (ACQUIRE FROM KB), applying `<safety_boundaries>` redaction at intake.
4. Required keys + accepted `N/A` forms are in `qa-structure/references/config-schema.md`.
</config_missing>

<create_initial_data step="0.2">
Write `agents/qa/{IDENTIFIER}/initial-data.md` using the inline template below (kept inline — tiny + always needed); all four fields populated from the parsed input (`None` only for additional-links):

```markdown
# Initial Data — [IDENTIFIER]

**Initial user prompt:** [verbatim user text that started this QA run]
**Project config file:** agents/qa/qa-project-config.md
**Test case reference:** [TestRail ID / Jira key / direct description summary]
**Additional links provided:** [list URLs verbatim, or `None`]
```
</create_initial_data>

<update_state step="0.3">
1. Update `agents/qa-state.md`:
   - Test Case Source: [TestRail ID / Jira key / Manual]
   - Config Source: [Existing / User provided / Discovered]
   - Files Created: initial-data.md, qa-state.md
   - Phase 0 completion timestamp
2. Mark Phase 0 complete, Phase 1 current.
</update_state>

<safety_boundaries>

`agents/qa/qa-project-config.md` is **tracked + project-wide** (committed to VCS, read by every QA session) — treat as PUBLIC by default. User-supplied answers can carry credential-shaped values that would persist into the repo without redaction.

**Auth fields — record mechanism + source, never literal values:** record the **scheme name** (`OAuth2 client-credentials` / `JWT Bearer` / `API Key in X-Api-Key header` / `Basic Auth` / `Session cookie` / `None`) and the **strategy + source** (e.g. `Bearer JWT from AuthHelper.get_token('admin'); credentials in env vars E2E_USER + E2E_PASS`). **Never paste** actual tokens, passwords, JSON contents, API key values, or OAuth `client_secret` — regardless of "test"/"throwaway" labels. `Test Case Management` access tokens (TestRail API key, Jira PAT) → record as `MCP-managed` or `env var <NAME>`.

**Redaction at intake (pre-write gate, MANDATORY):** before writing the config, MUST ACQUIRE `qa-knowledge/references/redaction-scope.md` FROM KB and run its re-scan grep list against the populated config — writing is FORBIDDEN until that scan has run. **Fail-closed:** if that ACQUIRE returns zero documents (KB unavailable), STOP and report — never write an unscanned config. Always-present minimal floor (so a scan can run even if the KB fetch fails) — at minimum grep for: `Bearer `, `Authorization:`, `password:`, `api_key=`, `client_secret`, `eyJ` (JWT), `BEGIN PRIVATE KEY`, `user:pass@`. On a hit, replace the literal with a mechanism+source description and add a one-line `## Additional Notes`: `Original auth answer included a literal <kind> — redacted; request mechanism+source from user if env var name is unknown.` The full target catalog + shape-preserving placeholders + complete re-scan list live in the reference (structural content — endpoint paths, framework names, base/spec URLs without embedded credentials, project keys — stays verbatim).

</safety_boundaries>

<failure_handling>

- **Test case reference missing or unparseable** (step 0.1 cannot extract a TestRail ID, Jira key, or feature description): stop, record `Phase 0 blocked: test case reference unresolvable from initial prompt "<prompt>"` in `agents/qa-state.md`, and ask the user for a TestRail case ID, Jira ticket key, or kebab-case feature name. Do NOT fabricate an `{IDENTIFIER}` — every downstream path depends on it.
- **`{IDENTIFIER}` underivable / ambiguous** (no Jira key, no TestRail ID, no usable feature name — or several): apply the `qa-structure` precedence (Jira key → TestRail ID → kebab-case; first non-empty wins) and record chosen + rejected candidates in `initial-data.md`. If still none, ask the user once (naming the three preference levels). After one unsuccessful re-ask, record `Phase 0 blocked: IDENTIFIER unresolvable — awaiting user supply` and stop. Do NOT pick a default like `unknown` or `tmp-N` — `{IDENTIFIER}` is referenced in every downstream phase's paths and a guess pollutes the entire QA session.
- **User questioning still incomplete after follow-up** (a required field — doc storage, Swagger availability, or test-case source — is still missing after the 2-round cap): stop, record `Phase 0 blocked: minimum project info not obtained after follow-up — missing: <list>` in `agents/qa-state.md`. Do NOT silently fall back to TBD for fields the user actually declined. (`TBD — will discover from codebase/spec` is acceptable only when the user explicitly opts into discovery.)
- **User-pasted literal credential in an answer:** apply `<safety_boundaries>` Redaction-at-intake. If the env-var name is unknown, ask once.
- **Existing config file malformed / missing required config-schema keys:** treat as `config-incomplete` — re-run only the collect-from-user branch (`questioning`) for the missing keys, then re-write the config preserving clean sections, and re-verify. Surface the corruption in `initial-data.md` notes. Do NOT advance to Phase 1 with an incomplete config — Phase 1's documentation-MCP collection (step 1.2b) will silently degrade if `documentation_mcp_collection_skill` is absent rather than `N/A`-tagged.
- **`agents/qa-state.md` or `qa-project-config.md` unwritable** (permission denied, file locked, disk full): pause, report the filesystem error with the path; do not mark Phase 0 complete.
- **Session directory `agents/qa/{IDENTIFIER}/` not created:** create it directly (simple mkdir), then re-run verification. If the create fails, stop and report the filesystem error.

</failure_handling>

<validation_checklist>
- `agents/qa/{IDENTIFIER}/` directory exists
- `qa-project-config.md` exists at the canonical path (per `qa-structure`) with non-empty content — either pre-existing or freshly written
- **Every required key from `qa-structure/references/config-schema.md` is present** — populated with a real value OR explicitly marked `N/A — <reason>`; no key absent / blank / `TBD` without a documented next-step
- `initial-data.md` created per the inline initial-data template (step 0.2) with all four required fields populated
- `agents/qa-state.md` created with Phase 0 marked complete and `IDENTIFIER:` field matching the `agents/qa/{IDENTIFIER}/` directory name
- `{IDENTIFIER}` value identical across (a) directory name, (b) qa-state.md IDENTIFIER field, (c) initial-data.md path; no fabricated `{IDENTIFIER}`
- Redaction pre-write gate ran — `qa-knowledge/references/redaction-scope.md` (ACQUIRE FROM KB) loaded and its grep list executed against the config before write; no literal credential persisted; any redaction noted in `## Additional Notes`
- No failure-handling condition from `<failure_handling>` is currently active — every listed scenario has either not been triggered or has been remediated
</validation_checklist>

</qa_flow_project_config_loading>
