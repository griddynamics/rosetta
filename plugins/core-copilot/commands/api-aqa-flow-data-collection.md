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
Gather test case details from the configured TMS, search the configured Wiki, and discover existing API test patterns in the codebase to establish baseline for automation.
</description_and_purpose>

<workflow_context>
- Phase 1 of 8 in `api-aqa-flow`
- Input: project config + initial data from Phase 0
- Output: `plans/api-aqa-{IDENTIFIER}/raw-data.md` with test cases, documentation, and existing test patterns
- Prerequisite: Phase 0 complete, `api-aqa-project-config.md` and `initial-data.md` exist
- Collection skill: `data-collection` (single canonical collector for TMS + Wiki sources) — this phase resolves each in-scope provider and passes its role + provider to the skill; the skill loads the role-named binding. Existing-test-pattern scan: `qa-knowledge` (`code_analysis` mode, via `reverse-engineering`). This phase OWNS the raw-data aggregation contract (`<raw_data_contract>`) — the skills EMIT into the sections this phase asserts.
- **Provider resolution (merge evidence; providers are NOT hardcoded).** Providers were resolved in Phase 0 and recorded in `api-aqa-project-config.md` (`tms_provider`, `wiki_provider` + base URLs, prefilled from `gain.json` `sdlc.*`). Reconcile with explicit user names/handles (which win for this run), recognizable provider URLs (valid evidence when unambiguous), and available integrations. If evidence conflicts or remains ambiguous, ask only about the unresolved provider/input; never silently choose between conflicting systems.
- Optional **Wiki collection** when in scope — signals in `<config_binding>`; procedure in `<execute_collection>` step **1.2b**.
- Required skills: `data-collection` (TMS + Wiki collector), `qa-knowledge` (`code_analysis` mode — existing-test + backend-source scan), `reverse-engineering`, `qa-structure` (`{IDENTIFIER}` + raw-data path)
</workflow_context>

<config_binding>
Wiki scope comes from **`api-aqa-project-config.md`** (Phase 0, prefilled from `gain.json`) plus run evidence per `<workflow_context>`. This phase OWNS the resolution + collection inline (step 1.2b) — there is no separate sub-flow.
- **In-scope signals ("is a Wiki in scope?"):** `wiki_provider` holds a real provider (not `none`/`N/A`), `wiki_base_url` / Location is set, the user supplied Wiki pages/URLs, or `gain.json` `sdlc.wiki` names one — treat absent values as absent. The collection skill is ALWAYS `data-collection` with role `Wiki` + the resolved provider (Confluence is the canonical example; any Wiki backend maps the same way).
- **Raw-data heading (fixed):** `## Documentation / Wiki` under `plans/api-aqa-{IDENTIFIER}/raw-data.md`. Do not invent a different heading unless `api-aqa-project-config.md` explicitly instructs a rename (then write under the configured heading and note the mapping once).
</config_binding>

<raw_data_contract>
This phase owns the raw-data aggregation artifact `plans/api-aqa-{IDENTIFIER}/raw-data.md` and its sections — `data-collection` and `qa-knowledge` emit into these, they do not define them. Required sections (empty → `N/A — <reason>`, never blank):
- **Test Case Data** — from `data-collection` (role `TMS`, resolved provider); ≥1 test-case source required.
- **Documentation / Wiki** — from `data-collection` (role `Wiki`, resolved provider) via step 1.2b when scoped; else the `SKIPPED_NO_CONFIG` outcome row (per `<wiki_outcomes>`).
- **Existing Test Patterns** — from `qa-knowledge` (`code_analysis` mode — test-automation architecture analysis, via `reverse-engineering`); framework, HTTP client, structure/assertion/auth conventions, reusable utilities. Record env-file **path + variable names only**, never literal values.
- **Backend Source Code Analysis** — backend path from config or discoverable `RefSrc/` docs; framework, route patterns, key dirs (or `N/A` when no path).
- **API Endpoints Identified** — every row has Method + Source populated; partial rows tagged as gaps.
- **Data Collection Summary** — counts + gap notes; a delegated-skill stop is recorded verbatim as `Gap: <skill> stopped — <message>`, never fabricated over.

Redaction of every captured value runs inside `data-collection` via `sensitive-data` before write; `raw-data.md` is PUBLIC by default.
</raw_data_contract>

<phase_steps>
1. Confirm data sources from project config
2. Execute data collection — see `<execute_collection>`: **1.2a** core collection (`data-collection` TMS role + `qa-knowledge` existing-test scan → `<raw_data_contract>`), **1.2b** optional Wiki collection when scoped
3. Validate and update state
</phase_steps>

<confirm_inputs step="1.1">
1. Verify project config loaded with data source information
2. Verify initial data file exists with test case reference
3. Identify TMS, Wiki, and codebase sources to query
4. **Failure path:** if (1) or (2) is missing, stop Phase 1, record `Phase 1 blocked: missing prerequisite [config | initial-data]` in `agents/TEMP/<FEATURE>/api-aqa-state.md`, and ask the user to re-run Phase 0. If (3) finds no usable sources, record the gap and ask the user to confirm proceeding with empty data sources before continuing.
</confirm_inputs>

<execute_collection step="1.2" subagent="discoverer" role="AQA data collector">

<verify_primary_raw_data step="1.2a">
1. Resolve the **TMS provider** per `<workflow_context>` (Jira tickets are a valid TMS source when the project stores test cases there). If no TMS source is resolvable, ask the user once; if still missing, stop Phase 1 and record `Phase 1 blocked: no resolvable test-case source` in `agents/TEMP/<FEATURE>/api-aqa-state.md` — do NOT invent an ID.
2. USE SKILL `data-collection` with role `TMS`, the resolved provider, the test-case input handle, and the **Test Case Data** + **API Endpoints Identified** sections of `<raw_data_contract>`; the skill loads its TMS binding and adapts the canonical TestRail/Jira examples to the target system. A delegated stop is recorded verbatim per `<raw_data_contract>`; if the failed source was the only test-case source, stop the phase.
3. USE SKILL `reverse-engineering` and USE SKILL `qa-knowledge` (`code_analysis` mode — test-automation architecture analysis) over the existing test project to populate the **Existing Test Patterns** (and **Backend Source Code Analysis** where backend source is discoverable) sections of `<raw_data_contract>` — read-only scan of framework, HTTP client, structure/assertion/auth conventions, reusable utilities; env-file path + var names only.
4. Assemble `plans/api-aqa-{IDENTIFIER}/raw-data.md` per `<raw_data_contract>` from the emitted sections. Verify it exists. If missing, **re-run steps 2–4 once**; if still missing, stop Phase 1, record the gap in `agents/TEMP/<FEATURE>/api-aqa-state.md`, and notify the user — **do not** run `<wiki_collection_optional>` until the primary raw-data artifact exists.
</verify_primary_raw_data>

<wiki_collection_optional step="1.2b">
This phase runs the Wiki collection **inline** (no sub-flow). Provider resolution + in-scope signals per `<config_binding>`; record **exactly one** outcome line per `<wiki_outcomes>`.

1.2b.1. **Scope check.** If no in-scope Wiki signal is present (per `<config_binding>`), apply **SKIPPED_NO_CONFIG** and skip the rest of this sub-block.
1.2b.2. **Resolve the provider.** Take the Wiki provider from `<config_binding>` signals. If signals are active but no provider is named, re-read `api-aqa-project-config.md` + Phase 0 evidence; if still none, apply **SKIPPED_NO_CONFIG** and skip.
1.2b.3. **Collect.** USE SKILL `data-collection` with role `Wiki`, the resolved provider, the input handle(s), and the fixed `## Documentation / Wiki` heading as the output target; the skill loads its Wiki binding (adapting the canonical Confluence examples) and runs harvest → redact (via `sensitive-data`) → write internally. If the skill cannot be loaded → apply **LOAD_FAILED** (skill = `data-collection`) and skip. No harvestable sources after search + user fallback → apply **EMPTY_HARVEST**; otherwise apply **COMPLETED**.
1.2b.4. **Verify.** Confirm the `## Documentation / Wiki` heading holds **exactly one** outcome line matching the branch taken (per `<wiki_outcomes>`). On mismatch: zero rows → append the branch row; duplicate rows → keep only the most recent (latest by `agents/TEMP/<FEATURE>/api-aqa-state.md` Phase 1 timestamp); heading missing → create it, then append. After three failed re-verifies, stop and record `Phase 1 blocked: Wiki-collection verification failed after remediation` in `agents/TEMP/<FEATURE>/api-aqa-state.md`; ask the user to inspect `raw-data.md`.
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
3. **Failure path:** if `agents/TEMP/<FEATURE>/api-aqa-state.md` cannot be written (permission denied, disk full, file locked), do not mark Phase 1 complete; record the write error in chat output, ask the user to resolve the filesystem issue, and pause before Phase 2.
</update_state>

<validation_checklist>
- Test case data retrieved and documented
- `plans/api-aqa-{IDENTIFIER}/raw-data.md` exists (verified in step 1.2a) with core collection sections populated per `<raw_data_contract>`
- Wiki searched (results found OR user confirmed skip)
- Wiki outcome in `raw-data.md` is exactly one `<wiki_outcomes>` branch matching the path taken in step 1.2b
- Existing test patterns analyzed
- Backend source code searched (if path configured in project config)
- API endpoints identified from test cases
</validation_checklist>

</api_aqa_flow_data_collection>
