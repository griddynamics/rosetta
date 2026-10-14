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
Initialize the AQA session directory, load the existing project config or collect project-specific information from the user, and seed the workflow state file for backend API test automation. Canonical paths, the `{IDENTIFIER}` derivation rule, the config-key schema, and the state-file shape are owned by USE SKILL `qa-structure` — this phase binds to them and does not restate them.
</description_and_purpose>

<workflow_context>
- Phase 0 of 8 in `api-aqa-flow`
- Input (REQUIRED): user request with test case reference (TMS case ID, Issue Tracker ticket, or direct description — e.g. TestRail `C1234`, Jira `PROJ-123`)
- Input (OPTIONAL, when provided by user): repository-root `gain.json` `sdlc.*` providers, Swagger/OpenAPI spec URL or path, Wiki/docs page URLs, backend source code locations
- Output (paths owned by `qa-structure`): per-session `plans/api-aqa-{IDENTIFIER}/api-aqa-project-config.md` and `plans/api-aqa-{IDENTIFIER}/initial-data.md`; shared workflow state `agents/TEMP/<FEATURE>/api-aqa-state.md`.
- Prerequisite: starting new AQA flow
- HITL: conditional — user is questioned ONLY if the project config does not already exist
- Required skills: `qa-structure` (paths / `{IDENTIFIER}` / config schema / state shape), `sensitive-data` (redaction at intake)
- Recommended skills: `questioning` (config-missing interview)
</workflow_context>

<phase_steps>
1. Parse user input, resolve providers from `gain.json` + evidence, derive `{IDENTIFIER}`, and create the session directory + state-file stub.
2. Load this session's config if present, or collect the still-missing project info from the user and create it.
3. Create the initial-data file and mark Phase 0 complete.
</phase_steps>

<execute_config step="0.1" subagent="discoverer" role="AQA project config loader">

USE SKILL `qa-structure` for the session layout, `{IDENTIFIER}` derivation, and the config-key schema — the skill routes on those topics and loads its own files. This phase performs session initialization DIRECTLY (no dedicated init skill); it delegates only user-questioning to `questioning`. On the config-missing branch it performs a bounded set of loads (layout, config schema, then the interview + config template at step 0.1.5) — load each at its step via the owning skill; never write an artifact from memory.

1. **Parse initial user input.** Extract:
   - **Test case reference** (REQUIRED): TMS case ID, Issue Tracker key/URL, or direct test-case description.
   - **Additional context** (OPTIONAL): Swagger URL, Wiki pages, API documentation links.
   - Supported phrasings: `"Write API tests for TC-1234"`, `"Automate backend tests for PROJ-123"`, `"Create API tests for the user registration endpoint"`, `"Automate TC-1234 with Swagger: https://api.example.com/swagger"`.
2. **Resolve providers (merge evidence; do not force one source).** Read repository-root `gain.json`; use `sdlc.test_management(_project)`, `sdlc.wiki(_project)`, and `sdlc.issue_tracker(_project)` when populated. Explicit user names/handles win for this run; a recognizable provider URL or handle is valid evidence (a Confluence URL implies Confluence). If evidence conflicts or stays ambiguous, ask only about the unresolved provider; a missing `gain.json` never blocks a direct-description run.
3. **Derive `{IDENTIFIER}`** per the `qa-structure` rule (Issue Tracker key → TMS case ID → kebab-case feature). On multiple candidates, first non-empty wins; record the chosen value + rejected candidates in `initial-data.md`.
4. **Create the session directory** `plans/api-aqa-{IDENTIFIER}/` and write the **state-file stub** below to `agents/TEMP/<FEATURE>/api-aqa-state.md`. The full per-phase update schema is owned by `api-aqa-flow.md` `<state_file>`; this stub is only the seed:

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
5. **Load or create the project config** at `plans/api-aqa-{IDENTIFIER}/api-aqa-project-config.md` (per-session, inside the feature plan folder): if the file exists AND is non-empty → `<config_exists>`; if it is missing OR empty → `<config_missing>`.
6. **Verify** the feature plan folder `plans/api-aqa-{IDENTIFIER}/` exists and the config is non-empty before proceeding.

</execute_config>

<config_exists step="0.1.5a">
1. Reuse the existing config as-is; skip to step 0.2 — nothing to collect, no user interaction.
2. Still confirm every required key from `qa-structure`'s config-key schema is present; a malformed / incomplete existing config is handled per `<failure_handling>` (the config-incomplete branch).
</config_exists>

<config_missing step="0.1.5b">
1. Pre-fill every key already resolved by step 0.1.2 provider evidence (`gain.json` + user input); then collect ONLY the still-unresolved project info from the user — USE SKILL `questioning` asking the config-missing interview prompt owned by `qa-structure`, trimmed to the missing keys.
2. Validate the answers + prefill cover at minimum: Wiki/document storage, Swagger/OpenAPI availability, and the test-case source (TMS). If a required field is missing, ask ONE follow-up naming exactly the missing fields — cap 2 rounds total.
3. Write the populated config using `qa-structure`'s config template, applying `<safety_boundaries>` redaction at intake.
4. Required keys + accepted `N/A` forms are in `qa-structure`'s config-key schema.
</config_missing>

<create_initial_data step="0.2">
Write `plans/api-aqa-{IDENTIFIER}/initial-data.md` using the template below; all four fields populated from the parsed input (`None` only for additional-links):

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

`plans/api-aqa-{IDENTIFIER}/api-aqa-project-config.md` is **tracked** — PUBLIC by default; user answers can carry credential-shaped values. **Auth fields record scheme + strategy + source** (e.g. `Bearer JWT from AuthHelper; credentials in env vars E2E_USER + E2E_PASS`), **never literal** tokens/passwords/keys/`client_secret` — regardless of "test"/"throwaway" labels; TMS / Issue Tracker access tokens (e.g. TestRail API key, Jira PAT) → `MCP-managed` or `env var <NAME>`.

**Redaction at intake (pre-write gate, fail-closed):** USE SKILL `sensitive-data` and run its scan against the populated config BEFORE writing — no scan (skill unavailable included) → STOP, never write unscanned. On a hit, replace the literal with mechanism+source and add to `## Additional Notes`: `Original auth answer included a literal <kind> — redacted; request mechanism+source from user if env var name is unknown.` Structure (endpoint paths, framework names, credential-free URLs, project keys) stays verbatim; redaction targets sensitive VALUES only.

</safety_boundaries>

<failure_handling>

- **Test case reference missing or unparseable** (step 0.1 cannot extract a TMS case ID, Issue Tracker key, or feature description): stop, record `Phase 0 blocked: test case reference unresolvable from initial prompt "<prompt>"` in `agents/TEMP/<FEATURE>/api-aqa-state.md`, and ask the user for a TMS case ID, Issue Tracker key, or kebab-case feature name. Do NOT fabricate an `{IDENTIFIER}` — every downstream path depends on it.
- **`{IDENTIFIER}` underivable / ambiguous** (no Issue Tracker key, no TMS case ID, no usable feature name — or several): apply the `qa-structure` precedence (Issue Tracker key → TMS case ID → kebab-case; first non-empty wins) and record chosen + rejected candidates in `initial-data.md`. If still none, ask the user once (naming the three preference levels). After one unsuccessful re-ask, record `Phase 0 blocked: IDENTIFIER unresolvable — awaiting user supply` and stop. Do NOT pick a default like `unknown` or `tmp-N` — `{IDENTIFIER}` is referenced in every downstream phase's paths and a guess pollutes the entire AQA session.
- **User questioning still incomplete after follow-up** (a required field — Wiki/doc storage, Swagger availability, or TMS test-case source — is still missing after the 2-round cap): stop, record `Phase 0 blocked: minimum project info not obtained after follow-up — missing: <list>` in `agents/TEMP/<FEATURE>/api-aqa-state.md`. Do NOT silently fall back to TBD for fields the user actually declined. (`TBD — will discover from codebase/spec` is acceptable only when the user explicitly opts into discovery.)
- **User-pasted literal credential in an answer:** apply `<safety_boundaries>` Redaction-at-intake. If the env-var name is unknown, ask once.
- **Existing config file malformed / missing required config-schema keys:** treat as `config-incomplete` — re-run only the collect-from-user branch (`questioning`) for the missing keys, then re-write the config preserving clean sections, and re-verify. Surface the corruption in `initial-data.md` notes. Do NOT advance to Phase 1 with an incomplete config — Phase 1's Wiki collection will silently degrade if `wiki_provider` is absent rather than `N/A`-tagged.
- **`agents/TEMP/<FEATURE>/api-aqa-state.md` or `api-aqa-project-config.md` unwritable** (permission denied, file locked, disk full): pause, report the filesystem error with the path; do not mark Phase 0 complete.
- **Session directory `plans/api-aqa-{IDENTIFIER}/` not created:** create it directly (simple mkdir), then re-run verification. If the create fails, stop and report the filesystem error.

</failure_handling>

<validation_checklist>
- `plans/api-aqa-{IDENTIFIER}/` directory exists
- `api-aqa-project-config.md` exists in the feature plan folder (per `qa-structure`) with non-empty content — either pre-existing or freshly written
- **Every required key from `qa-structure`'s config-key schema is present** — populated with a real value OR explicitly marked `N/A — <reason>`; no key absent / blank / `TBD` without a documented next-step
- `initial-data.md` created per the inline initial-data template (step 0.2) with all four required fields populated
- `agents/TEMP/<FEATURE>/api-aqa-state.md` created with Phase 0 marked complete and `IDENTIFIER:` field matching the `plans/api-aqa-{IDENTIFIER}/` directory name
- `{IDENTIFIER}` value identical across (a) directory name, (b) api-aqa-state.md IDENTIFIER field, (c) initial-data.md path; no fabricated `{IDENTIFIER}`
- Redaction pre-write gate ran — `sensitive-data` scan executed against the config before write; no literal credential persisted; any redaction noted in `## Additional Notes`
- No failure-handling condition from `<failure_handling>` is currently active — every listed scenario has either not been triggered or has been remediated
</validation_checklist>

</api_aqa_flow_project_config_loading>
