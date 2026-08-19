---
name: api-aqa-flow-data-collection
description: "Phase 1 Data Collection of api-aqa-flow"
alwaysApply: false
disable-model-invocation: true
user-invocable: false
baseSchema: docs/schemas/phase.md
---

<api_aqa_flow_data_collection>

<description_and_purpose>
Gather TMS test-case details, Wiki docs, and existing API test patterns → automation baseline.
</description_and_purpose>

<workflow_context>
- Phase 1 of 8 in `api-aqa-flow`
- Input: project config + initial data from Phase 0
- Output: `plans/api-aqa-{IDENTIFIER}/raw-data.md` with test cases, documentation, and existing test patterns
- Prerequisite: Phase 0 complete, `api-aqa-project-config.md` and `initial-data.md` exist
- Collectors: `data-collection` (pass role + resolved provider); pattern scan: `qa-knowledge` (`code_analysis` mode, via `reverse-engineering`). Contract: `<raw_data_contract>`.
- **Provider resolution** (NOT hardcoded): Phase 0 → `api-aqa-project-config.md` (`tms_provider`, `wiki_provider`, base URLs, `gain.json` `sdlc.*`). Merge evidence:
  - Explicit user names/handles → win for this run.
  - Recognizable provider URLs → valid evidence. Available integrations → evidence.
  - Conflicts/ambiguity → ask only about unresolved; NEVER silently choose.
- Optional Wiki → scope in `<config_binding>`; procedure in step **1.2b**.
- Required skills: `data-collection` (TMS + Wiki collector), `qa-knowledge` (`code_analysis` mode — existing-test + backend-source scan), `reverse-engineering`, `qa-structure` (`{IDENTIFIER}` + raw-data path)
</workflow_context>

<config_binding>
Wiki scope: `api-aqa-project-config.md` + run evidence per `<workflow_context>`. Collection inline (step 1.2b); no sub-flow.
- **In-scope signals:** `wiki_provider` real (not `none`/`N/A`) · `wiki_base_url`/Location set · user supplied pages/URLs · `gain.json` `sdlc.wiki` named. Treat absent as absent. Skill: ALWAYS `data-collection`, role `Wiki` + resolved provider. Canonical examples (TestRail · Jira · Confluence) adapt to the resolved provider; any backend maps the same way.
- **Raw-data heading (fixed):** `## Documentation / Wiki` in `plans/api-aqa-{IDENTIFIER}/raw-data.md`. `api-aqa-project-config.md` rename instruction → use configured heading; note mapping once.
</config_binding>

<raw_data_contract>
`plans/api-aqa-{IDENTIFIER}/raw-data.md` — assemble here. Required sections (empty → `N/A — <reason>`, never blank):
- **Test Case Data** — from `data-collection` (role `TMS`, resolved provider); ≥1 test-case source required.
- **Documentation / Wiki** — from `data-collection` (role `Wiki`, resolved provider) via step 1.2b when scoped; else `SKIPPED_NO_CONFIG` outcome row (per `<wiki_outcomes>`).
- **Existing Test Patterns** — from `qa-knowledge` (`code_analysis` via `reverse-engineering`); framework, HTTP client, structure/assertion/auth conventions, utilities. Env-file: **path + variable names only**, never literal values.
- **Backend Source Code Analysis** — path from config or `refsrc/`; framework, routes, key dirs (else `N/A`).
- **API Endpoints Identified** — every row has Method + Source; partial rows tagged as gaps.
- **Data Collection Summary** — counts + gap notes; delegated-skill stop → `Gap: <skill> stopped — <message>`, never fabricated over.

Redaction of every captured value runs inside `data-collection` via `sensitive-data` before write; `raw-data.md` is PUBLIC by default.
</raw_data_contract>

<phase_steps>
1. Confirm data sources from project config
2. Execute data collection per `<execute_collection>`
3. Validate and update state
</phase_steps>

<confirm_inputs step="1.1">
1. Verify project config loaded
2. Verify initial-data file exists with test case reference
3. Identify TMS, Wiki, codebase sources
4. **Failure path:** (1)/(2) missing → record `Phase 1 blocked: missing prerequisite [config | initial-data]` in `agents/TEMP/<FEATURE>/api-aqa-state.md` → ask re-run Phase 0. (3) no usable sources → record gap → ask user to confirm empty-source proceed.
</confirm_inputs>

<execute_collection step="1.2" subagent="discoverer" role="AQA data collector">

<verify_primary_raw_data step="1.2a">
1. Resolve **TMS provider** per `<workflow_context>` (Jira tickets valid when project stores cases there). No source → ask once; still missing → record `Phase 1 blocked: no resolvable test-case source` in `agents/TEMP/<FEATURE>/api-aqa-state.md`; do NOT invent an ID.
2. USE SKILL `data-collection`: role `TMS`, resolved provider, test-case handle → **Test Case Data** + **API Endpoints Identified** per `<raw_data_contract>`. Delegated stop → record verbatim; if it was the only test-case source → stop phase.
3. USE SKILL `reverse-engineering`; USE SKILL `qa-knowledge` (`code_analysis` mode) → **Existing Test Patterns** + **Backend Source Code Analysis** sections; env-file path + var names only.
4. Assemble `plans/api-aqa-{IDENTIFIER}/raw-data.md` per `<raw_data_contract>`. Verify exists. Missing → **re-run steps 2–4 once**; still missing → record gap in `agents/TEMP/<FEATURE>/api-aqa-state.md` + notify user; **do not** run `<wiki_collection_optional>` until artifact exists.
</verify_primary_raw_data>

<wiki_collection_optional step="1.2b">
Provider + scope per `<config_binding>`; record **exactly one** outcome line per `<wiki_outcomes>`.

1.2b.1. **Scope check:** no Wiki signal (per `<config_binding>`) → **SKIPPED_NO_CONFIG**, skip rest.
1.2b.2. **Resolve provider:** from `<config_binding>` signals. Active but no provider → re-read `api-aqa-project-config.md`; still none → **SKIPPED_NO_CONFIG**, skip.
1.2b.3. **Collect:** USE SKILL `data-collection`: role `Wiki`, resolved provider, input handle(s) → `## Documentation / Wiki` heading. Cannot load → **LOAD_FAILED** (`data-collection`), skip. No sources after search + user fallback → **EMPTY_HARVEST**; else → **COMPLETED**.
1.2b.4. **Verify:** `## Documentation / Wiki` holds **exactly one** outcome line per `<wiki_outcomes>`. Mismatch: zero rows → append; duplicate → keep most recent (by `agents/TEMP/<FEATURE>/api-aqa-state.md` Phase 1 timestamp); heading missing → create + append. Three failed re-verifies → record `Phase 1 blocked: Wiki-collection verification failed after remediation` in `agents/TEMP/<FEATURE>/api-aqa-state.md`; ask user to inspect `raw-data.md`.
</wiki_collection_optional>

<wiki_outcomes>
The `## Documentation / Wiki` heading carries **exactly one** outcome line (starts with `**Outcome:**`; no extra trailing `**`):
| Branch | Trigger | Outcome line |
| --- | --- | --- |
| **SKIPPED_NO_CONFIG** | no Wiki configured / no resolvable provider | `**Outcome:** skipped — no Wiki configured` + one-line reason |
| **LOAD_FAILED** | the `data-collection` skill could not be loaded | `**Outcome:** skipped — skill load failed` + skill name + short error |
| **EMPTY_HARVEST** | harvesting ran but found no fetchable sources | `**Outcome:** no Wiki sources after harvesting` + what was searched |
| **COMPLETED** | `data-collection` ran the resolved provider | `**Outcome:** collected via data-collection (Wiki: <provider>) — <page/URL count>` |

Literal examples: `**Outcome:** collected via data-collection (Wiki: confluence) — 12 pages fetched`; `**Outcome:** no Wiki sources after harvesting — searched 3 spaces, 0 pages returned`.
</wiki_outcomes>

</execute_collection>

<update_state step="1.3">
1. Update `agents/TEMP/<FEATURE>/api-aqa-state.md`:
   - Test Cases Retrieved: [count]
   - Wiki Pages Found: [count]
   - API Endpoints Identified: [count]
   - Existing Test Files Found: [count]
   - Test Framework: [name]
   - Backend Source: [path or N/A]
   - Phase 1 completion timestamp
2. Mark Phase 1 complete, Phase 2 current
3. **Failure path:** `agents/TEMP/<FEATURE>/api-aqa-state.md` unwritable → do NOT mark Phase 1 complete; record error in chat; ask user to resolve; pause before Phase 2.
</update_state>

<validation_checklist>
- `plans/api-aqa-{IDENTIFIER}/raw-data.md` exists; all `<raw_data_contract>` sections populated, none blank
- Wiki: exactly one `<wiki_outcomes>` branch outcome line in `raw-data.md`
- Existing test patterns analyzed
- Backend source code searched (if path configured in project config)
- API endpoints identified from test cases
</validation_checklist>

</api_aqa_flow_data_collection>
