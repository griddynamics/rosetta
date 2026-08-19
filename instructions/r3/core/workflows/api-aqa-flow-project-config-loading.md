---
name: api-aqa-flow-project-config-loading
description: "Phase 0 Project Config Loading of api-aqa-flow (USER INTERACTION CONDITIONALLY REQUIRED)"
alwaysApply: false
disable-model-invocation: true
user-invocable: false
baseSchema: docs/schemas/phase.md
---

<api_aqa_flow_project_config_loading>

<description_and_purpose>
Initialize AQA session directory, load or collect project config, seed state file. Canonical paths, `{IDENTIFIER}` derivation, config-key schema, and state-file shape owned by USE SKILL `qa-structure`.
</description_and_purpose>

<workflow_context>
- Phase 0 of 8 in `api-aqa-flow`
- Input (REQUIRED): test case reference (TMS case ID, Issue Tracker ticket, or direct description — e.g. TestRail `C1234`, Jira `PROJ-123`)
- Input (OPTIONAL): repository-root `gain.json` `sdlc.*` providers, Swagger/OpenAPI spec URL or path, Wiki/docs page URLs, backend source code locations
- Output: `plans/api-aqa-{IDENTIFIER}/api-aqa-project-config.md`, `plans/api-aqa-{IDENTIFIER}/initial-data.md`, `agents/TEMP/<FEATURE>/api-aqa-state.md`
- Prerequisite: new AQA run
- HITL: conditional — only if config absent
- Required skills: `qa-structure` (paths / `{IDENTIFIER}` / config schema / state shape), `sensitive-data` (redaction at intake)
- Recommended skills: `questioning` (config-missing interview)
</workflow_context>

<phase_steps>
1. Parse input, resolve providers, derive `{IDENTIFIER}`, seed session.
2. Load or collect project config from `gain.json`.
3. Write initial-data; mark Phase 0 complete.
</phase_steps>

<execute_config step="0.1" subagent="discoverer" role="AQA project config loader">

USE SKILL `qa-structure` for session layout, `{IDENTIFIER}` derivation, and config-key schema. Load each at its step; never write an artifact from memory.

1. **Parse input.** Extract:
   - **Test case reference** (REQUIRED): TMS case ID, Issue Tracker key/URL, or description.
   - **Additional context** (OPTIONAL): Swagger URL, Wiki pages, API docs.
   - Phrasings: `"Write API tests for TC-1234"`, `"Automate backend tests for PROJ-123"`, `"Create API tests for the user registration endpoint"`.
2. **Resolve providers (merge evidence; do not force one source).** Read `gain.json`; use `sdlc.test_management(_project)`, `sdlc.wiki(_project)`, `sdlc.issue_tracker(_project)` when populated. Explicit user input wins for this run; URL/handle is valid evidence (Confluence URL → Confluence). Conflicts → ask only unresolved provider. Missing `gain.json` ≠ block.
3. **Derive `{IDENTIFIER}`** per `qa-structure` (Issue Tracker key → TMS case ID → kebab-case). First non-empty wins; record chosen + rejected in `initial-data.md`.
4. **Create** `plans/api-aqa-{IDENTIFIER}/`; write **state-file stub** to `agents/TEMP/<FEATURE>/api-aqa-state.md`:

   ```markdown
   # API AQA State - <Test Name / Feature>

   **Last Updated**: [DateTime]
   **Current Phase**: 0
   **Test Case Source**: [TMS case ID / Issue Tracker ticket / Manual]
   **Feature**: [Feature Name]
   **IDENTIFIER**: [the {IDENTIFIER} value chosen above — must match plans/api-aqa-{IDENTIFIER}/ directory]
   **Providers**: [resolved TMS / Wiki / Issue Tracker + project handles, or N/A per role]

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
5. **Load or create** `plans/api-aqa-{IDENTIFIER}/api-aqa-project-config.md`: exists AND non-empty → `<config_exists>`; missing OR empty → `<config_missing>`.
6. **Verify** `plans/api-aqa-{IDENTIFIER}/` exists and config non-empty.

</execute_config>

<config_exists step="0.1.5a">
1. Reuse existing config; skip to step 0.2.
2. Confirm all required config keys present per `qa-structure` schema; malformed → `<failure_handling>` config-incomplete.
</config_exists>

<config_missing step="0.1.5b">
1. Pre-fill resolved keys; USE SKILL `questioning` for missing keys (config-missing prompt from `qa-structure`, trimmed to gaps).
2. Validate at minimum: Wiki storage, Swagger availability, TMS source. ONE follow-up naming exactly the missing fields — 2 rounds max.
3. Write populated config using `qa-structure`'s config template, applying `<safety_boundaries>` redaction at intake.
4. Required keys + accepted `N/A` forms in `qa-structure`'s config-key schema.
</config_missing>

<create_initial_data step="0.2">
Write `plans/api-aqa-{IDENTIFIER}/initial-data.md`; all four fields from parsed input (`None` only for additional-links):

```markdown
# Initial Data — [IDENTIFIER]

**Initial user prompt:** [verbatim user text that started this AQA run]
**Project config file:** plans/api-aqa-{IDENTIFIER}/api-aqa-project-config.md
**Test case reference:** [TMS case ID / Issue Tracker key / direct description summary]
**Additional links provided:** [list URLs verbatim, or `None`]
```
</create_initial_data>

<update_state step="0.3">
1. Update `agents/TEMP/<FEATURE>/api-aqa-state.md`:
   - Test Case Source: [TMS case ID / Issue Tracker key / Manual]
   - Providers: [resolved TMS / Wiki / Issue Tracker, with evidence source: gain.json / user / URL]
   - Config Source: [Existing / User provided / Discovered]
   - Files Created: initial-data.md, api-aqa-state.md
   - Phase 0 completion timestamp
2. Mark Phase 0 complete, Phase 1 current.
</update_state>

<safety_boundaries>

`plans/api-aqa-{IDENTIFIER}/api-aqa-project-config.md` is **tracked** — PUBLIC by default. **Auth fields record scheme + strategy + source** (e.g. `Bearer JWT from AuthHelper; credentials in env vars E2E_USER + E2E_PASS`), **never literal** tokens/passwords/keys/`client_secret` — regardless of "test"/"throwaway" labels; TMS / Issue Tracker access tokens (e.g. TestRail API key, Jira PAT) → `MCP-managed` or `env var <NAME>`.

**Redaction at intake (pre-write gate, fail-closed):** USE SKILL `sensitive-data`, scan config BEFORE writing — no scan (skill unavailable included) → STOP, never write unscanned. Hit → replace with mechanism+source; add to `## Additional Notes`: `Original auth answer included a literal <kind> — redacted; request mechanism+source from user if env var name is unknown.` Structure (endpoint paths, framework names, credential-free URLs, project keys) verbatim; redact VALUES only.

</safety_boundaries>

<failure_handling>

- **Test case reference missing or unparseable** (step 0.1 cannot extract TMS case ID, Issue Tracker key, or feature description): stop, record `Phase 0 blocked: test case reference unresolvable from initial prompt "<prompt>"` in `agents/TEMP/<FEATURE>/api-aqa-state.md`; ask for TMS case ID, Issue Tracker key, or kebab-case feature name. Do NOT fabricate `{IDENTIFIER}`.
- **`{IDENTIFIER}` underivable / ambiguous:** apply `qa-structure` precedence (Issue Tracker key → TMS case ID → kebab-case; first non-empty wins); record chosen + rejected in `initial-data.md`. If still none, ask once (naming three preference levels). After one re-ask, record `Phase 0 blocked: IDENTIFIER unresolvable — awaiting user supply` → stop. Do NOT default to `unknown` or `tmp-N`.
- **User questioning incomplete after follow-up** (Wiki storage, Swagger availability, or TMS source still missing after 2-round cap): stop, record `Phase 0 blocked: minimum project info not obtained after follow-up — missing: <list>` in `agents/TEMP/<FEATURE>/api-aqa-state.md`. Do NOT silently fall back to TBD. (`TBD — will discover from codebase/spec` only if user explicitly opts in.)
- **User-pasted literal credential:** apply `<safety_boundaries>` redaction. If env-var name unknown, ask once.
- **Existing config malformed / missing required keys:** `config-incomplete` — re-run collect-from-user branch (`questioning`) for missing keys, re-write preserving clean sections, re-verify. Surface corruption in `initial-data.md`. Do NOT advance to Phase 1 with incomplete config.
- **`agents/TEMP/<FEATURE>/api-aqa-state.md` or `api-aqa-project-config.md` unwritable** (permission denied, file locked, disk full): pause, report filesystem error with path; do not mark Phase 0 complete.
- **Session directory `plans/api-aqa-{IDENTIFIER}/` not created:** create directly, re-run verification. Create failure → stop, report filesystem error.

</failure_handling>

<validation_checklist>
- `plans/api-aqa-{IDENTIFIER}/` exists
- `api-aqa-project-config.md` in `plans/api-aqa-{IDENTIFIER}/` exists + non-empty (per `qa-structure`)
- Every required config key (per `qa-structure`) present — real value OR `N/A — <reason>`; none absent/blank/`TBD` without documented next-step
- `initial-data.md` exists; all four fields populated
- `agents/TEMP/<FEATURE>/api-aqa-state.md` created; Phase 0 complete; `IDENTIFIER:` matches `plans/api-aqa-{IDENTIFIER}/` directory name
- `{IDENTIFIER}` identical across: (a) directory name, (b) `api-aqa-state.md` IDENTIFIER field, (c) `initial-data.md` path; no fabricated `{IDENTIFIER}`
- Redaction gate ran: `sensitive-data` scan complete, no literals persisted, redactions in `## Additional Notes`
- No unremediated `<failure_handling>` condition remains
</validation_checklist>

</api_aqa_flow_project_config_loading>
