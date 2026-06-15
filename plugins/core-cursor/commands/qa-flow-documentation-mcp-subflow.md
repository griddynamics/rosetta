---
name: qa-flow-documentation-mcp-subflow
description: Documentation MCP collection branch for QA Phase 1 — ACQUIRE'd by qa-flow-data-collection when project config scopes a documentation MCP
alwaysApply: false
tags: []
baseSchema: docs/schemas/generic.md
---

<qa_flow_documentation_mcp_subflow>

<role>

QA data collector running the documentation-MCP collection branch of QA Phase 1.

</role>

<when_to_use_prompt>

ACQUIRE'd and executed by `qa-flow-data-collection` (Phase 1) when `qa-project-config.md` scopes a documentation MCP. Writes exactly one documentation MCP outcome under the QA raw-data file and verifies it. This is a conditionally-loaded collection fragment the parent phase runs — not a standalone phase.

</when_to_use_prompt>

<core_concepts>

- **Raw-data heading (fixed for this workflow):** `## Documentation / Confluence` under `agents/qa/{IDENTIFIER}/raw-data.md`. Do not invent a different heading unless `qa-project-config.md` explicitly instructs a rename; if it does, write outcomes under the configured heading and note the mapping in `raw-data.md` once.
- **Config keys (read literally from `qa-project-config.md` / Phase 0 output):** resolve the documentation **vendor binding** from whichever of these fields exists first (stop at first hit): `documentation_mcp_collection_skill`, `documentation.mcp_collection_skill`, `mcp_documentation_collection_skill`, `confluence_mcp_collection_skill`. The resolved value maps to a `discovery` vendor binding (Confluence backend → binding `confluence`); the collection skill is ALWAYS `discovery`, which loads `references/<vendor>-binding.md`. For “is documentation MCP in scope?” use signals such as `documentation_type`, `type` (when value implies a documentation backend), `confluence_base_url`, `confluence_space`, `documentation_base_url`, `documentation_mcp_server`, or any field your `qa-project-config` template documents for documentation MCP — treat absent values as absent.

</core_concepts>

<execute_documentation_mcp>

**Early-exit rule:** whenever any branch other than **COMPLETED** is applied, write the row under the raw-data heading and jump directly to `<verify>` (skip the remaining `<harvest_and_collect>` steps).

<resolve>
1. Pick the **Resolved documentation vendor binding** = the `discovery` vendor binding mapped from the first non-empty config key per `<core_concepts>` precedence list (Confluence backend → binding `confluence`). If none of those keys are set but documentation MCP scope is clearly active per the in-scope signals in `<core_concepts>`, re-read `qa-project-config.md` and Phase 0 notes for a default; if still absent, apply **SKIPPED_NO_CONFIG** (per `<output_contract>`) → early-exit.
2. If **all** documentation MCP signals from `<core_concepts>` are absent: apply **SKIPPED_NO_CONFIG** (per `<output_contract>`) → early-exit.
</resolve>

<harvest_and_collect>
1. ACQUIRE `discovery` FROM KB if not loaded. Zero documents returned → apply **ACQUIRE_FAILED** (per `<output_contract>` — skill name = `discovery`) → early-exit.
2. USE SKILL `discovery` with the **Resolved documentation vendor binding** (from `<resolve>` step 1), passing the Confluence input handle(s) and the `## Documentation / Confluence` raw-data heading as the output contract. `discovery` loads `references/confluence-binding.md` (harvesting discipline + authenticated MCP reads/searches in one binding). No harvestable sources after search + user fallback → apply **EMPTY_HARVEST** (per `<output_contract>`) → jump to `<verify>`. Otherwise, when done, apply **COMPLETED** (per `<output_contract>` — `<skill-name>` = `discovery (<binding>)`). Redaction runs inside `discovery` via `sensitive-data` before write.
</harvest_and_collect>

<verify>
1. Verify `agents/qa/{IDENTIFIER}/raw-data.md` exists and the documentation heading (per `<core_concepts>`) holds **exactly one** outcome line matching the row of `<output_contract>` for the branch taken above.
2. On verification failure, apply the matching fallback below then re-run step 1:
   - **Zero outcomes under the heading** → append the row for the branch taken (per `<output_contract>`).
   - **Duplicate outcomes** (multiple rows from a re-run) → keep only the most recent matching row (latest by `agents/qa-state.md` Phase 1 timestamp); delete earlier rows.
   - **Heading missing entirely** → create the fixed heading from `<core_concepts>`, then append the appropriate row.
3. **Terminal:** after three failed re-runs of step 1, stop; record `Phase 1 subflow verification failed after remediation` in `agents/qa-state.md`; ask the user to inspect `raw-data.md` manually.
</verify>

</execute_documentation_mcp>

<output_contract>
| Branch | Trigger (summary) | Required outcome line (starts with `**Outcome:**`; no extra trailing `**`) |
| --- | --- | --- |
| **SKIPPED_NO_CONFIG** | No documentation MCP configuration / no resolvable collection skill | `**Outcome:** skipped — no documentation MCP configuration` + one-line reason |
| **ACQUIRE_FAILED** | ACQUIRE returned zero docs for harvesting or MCP collection skill | `**Outcome:** skipped — ACQUIRE failed` + skill name + short error |
| **EMPTY_HARVEST** | Harvesting ran but found no fetchable sources | `**Outcome:** no documentation sources after harvesting` + what was searched |
| **COMPLETED** | `discovery` ran the resolved documentation vendor binding | `**Outcome:** collected via <skill-name>` + brief page/URL count (use `discovery (<binding>)` from step 1, e.g. `discovery (confluence)`) |

Apply rows by writing under the fixed heading; each row’s third column is the canonical shape — reference this table instead of paraphrasing.
</output_contract>

</qa_flow_documentation_mcp_subflow>
