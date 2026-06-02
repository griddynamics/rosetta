---
name: qa-flow-project-config-loading
description: Phase 0 of QA workflow - Project Config Loading (USER INTERACTION CONDITIONALLY REQUIRED)
alwaysApply: false
tags: []
baseSchema: docs/schemas/phase.md
---

<qa_flow_project_config_loading>

<description_and_purpose>
Initialize QA session directory, load existing project config or collect project-specific information from user for backend API test automation.
</description_and_purpose>

<workflow_context>
- Phase 0 of 8 in `qa-flow`
- Input (REQUIRED): user request with test case reference (TestRail ID, Jira ticket, or direct description)
- Input (OPTIONAL, when provided by user): Swagger/OpenAPI spec URL or path, Confluence/docs page URLs, backend source code locations
- `{IDENTIFIER}` derivation rule: prefer Jira key (e.g. `PROJ-123`) → TestRail case ID (e.g. `C12345`) → sanitized kebab-case feature name (e.g. `order-lookup`). First non-empty wins; recorded in `qa-state.md` on session init.
- Output (two paths — different scopes):
  - **Project-wide config (shared across all QA sessions):** `agents/qa/qa-project-config.md` — canonical path, created or reused by every QA session for this project. This is the load-bearing artifact `<config_contract>`, `<failure_handling>`, and `<validation_checklist>` refer to.
  - **Per-session artifacts (this run only):** `agents/qa/{IDENTIFIER}/initial-data.md` and `agents/qa-state.md`. The session directory does NOT contain its own `qa-project-config.md` copy — every session reads the project-wide one above.
- Prerequisite: starting new QA flow
- HITL: conditional — only if project config does not already exist
</workflow_context>

<phase_steps>
1. Parse user input and setup session directory
2. Load or create project config
3. Create initial data file and update state
</phase_steps>

<execute_config step="0.1" subagent="discoverer" role="QA project config loader">
1. USE SKILL `qa-project-config`
2. Verify the **per-session directory** `agents/qa/{IDENTIFIER}/` was created (holds this run's `initial-data.md`).
3. Verify the project-wide config exists with non-empty content at the canonical path (per `<workflow_context>` Output).
4. **ASK USER** for project info only if the project-wide config does not already exist; if it exists, reuse it as-is and proceed to step 0.2.
</execute_config>

<update_state step="0.2">
1. Update `agents/qa-state.md`:
   - Test Case Source: [TestRail ID / Jira key / Manual]
   - Config Source: [Existing / User provided / Discovered]
   - Files Created: initial-data.md, qa-state.md
   - Phase 0 completion timestamp
2. Mark Phase 0 complete, Phase 1 current
</update_state>

<config_contract>

Full template lives in the `qa-project-config` skill (canonical path: see `<workflow_context>` Output). This block lists the **fields downstream phases bind to by exact name** — Phase 0 is not complete until every required key below is either populated with a real value or explicitly marked `N/A — <reason>`.

**Required keys (consumed by later phases):**

| Section / Key | Consumed by | Required value or accepted N/A reason |
|---|---|---|
| `Document Storage` — `documentation_type` | `qa-flow-documentation-mcp-subflow.md` (Phase 1) | One of: `confluence` / `google-drive` / `local` / `none`. `N/A` only when `none`. |
| `Document Storage` — `documentation_mcp_collection_skill` | documentation subflow step 1 (resolved MCP collection skill tag) | Skill tag string (e.g. `mcp-confluence-data-collection`) or `N/A — documentation_type: none` |
| `Document Storage` — `confluence_base_url` / `documentation_base_url` | documentation subflow scope detection | Base URL or `N/A — documentation_type: <non-confluence-value>` |
| `API Specification` — `swagger_url` (or path) | `qa-flow-api-spec-analysis.md` step 2.1 | URL/path, or `N/A — no Swagger spec available; code-based analysis will run` |
| `API Specification` — `spec_format` | `qa-flow-api-spec-analysis.md` step 2.1 | One of: `OpenAPI 3.x` / `Swagger 2.0` / `N/A` |
| `Backend Source Code` — `backend_source_path` | `qa-data-collection` step 4, `qa-flow-api-spec-analysis.md` step 2.1 | Path (e.g. `RefSrc/my-backend/` or `src/`) or `N/A — work from Swagger/docs only` |
| `Test Case Management` — `system` | `qa-data-collection` step 2 (branch selector) | One of: `testrail` / `jira` / `confluence` / `manual` / `other` |
| `Test Case Management` — `project_id` / `suite_id` | `qa-data-collection` step 2 (when system is `testrail`) | IDs, or `N/A — system: <non-testrail-value>` |
| `Test Framework` — `framework` | `qa-data-collection` step 5 (validates discovery) | Name (`pytest` / `Jest` / etc.) or `TBD — will discover from codebase` |
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

<failure_handling>

- **`qa-project-config` skill ACQUIRE returns zero documents:** stop Phase 0 immediately, record in `agents/qa-state.md`: `Phase 0 blocked: ACQUIRE qa-project-config returned zero documents at <ISO timestamp> — awaiting user action`, and ask the user to fix Rosetta/KB access. Apply parent `qa-flow.md` `<failure_handling>` zero-doc rule. Do NOT attempt to write a placeholder config — the skill owns the template.
- **Skill ran but `qa-project-config.md` not created at the canonical path** (per `<workflow_context>`): retry the skill once with the same inputs; if still missing, stop, record `Phase 0 blocked: qa-project-config.md not produced after retry`, and ask the user to inspect the skill's output. Do NOT mark Phase 0 complete.
- **Skill ran but session directory `agents/qa/{IDENTIFIER}/` not created:** create the directory directly (this is a simple mkdir, not a skill responsibility), then re-run the verification. If the create fails (permission denied, disk full, file lock), stop and report the filesystem error.
- **`{IDENTIFIER}` underivable** (no Jira key in the request, no TestRail ID, and no usable feature name): stop, ask the user once for an explicit identifier (Jira key preferred, then TestRail ID, then a kebab-case feature slug — name the three preference levels in the question). After one unsuccessful re-ask, record `Phase 0 blocked: IDENTIFIER unresolvable — awaiting user supply` and stop. Do NOT pick a default like `unknown` or `tmp-N` — `{IDENTIFIER}` is referenced in every downstream phase's paths and a guess pollutes the entire QA session.
- **Config exists but is missing required keys from `<config_contract>`:** treat as `config-incomplete`. Re-run the `qa-project-config` skill's collect-from-user branch for only the missing keys, then re-verify. Do NOT advance to Phase 1 with an incomplete config — Phase 1's documentation subflow will silently degrade if `documentation_mcp_collection_skill` is absent rather than `N/A`-tagged.
- **`agents/qa-state.md` unwritable** (permission denied, file locked): pause, report the write error to the user with the file path, do not mark Phase 0 complete.

</failure_handling>

<validation_checklist>
- `agents/qa/{IDENTIFIER}/` directory exists
- `qa-project-config.md` exists at the canonical path (per `<workflow_context>`) with non-empty content
- **Every required key from `<config_contract>` is present** — populated with a real value OR explicitly marked `N/A — <reason>`; no key absent / blank / `TBD` without a documented next-step
- `initial-data.md` created per `<initial_data_contract>` with all four required fields populated
- `agents/qa-state.md` created with Phase 0 marked complete and `IDENTIFIER:` field matching the `agents/qa/{IDENTIFIER}/` directory name
- `{IDENTIFIER}` value identical across (a) directory name, (b) qa-state.md IDENTIFIER field, (c) initial-data.md path
- No failure-handling condition from `<failure_handling>` is currently active — every listed failure scenario has either not been triggered or has been remediated
</validation_checklist>

</qa_flow_project_config_loading>
