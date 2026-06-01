---
name: qa-flow-documentation-mcp-subflow
description: Documentation MCP collection branch for QA Phase 1 — invoked when qa-project-config scopes a documentation MCP
alwaysApply: false
tags: []
baseSchema: docs/schemas/phase.md
---

<qa_flow_documentation_mcp_subflow>

<description_and_purpose>
Write exactly one documentation MCP outcome under the QA raw-data file and verify it. Parent phase: `qa-flow-data-collection` ACQUIREs this fragment when config scopes documentation MCP collection.
</description_and_purpose>

<workflow_context>
- **Raw-data heading (fixed for this workflow):** `## Documentation / Confluence` under `agents/qa/{IDENTIFIER}/raw-data.md`. Do not invent a different heading unless `qa-project-config.md` explicitly instructs a rename; if it does, write outcomes under the configured heading and note the mapping in `raw-data.md` once.
- **Config keys (read literally from `qa-project-config.md` / Phase 0 output):** resolve the MCP collection skill tag from whichever of these fields exists first (stop at first hit): `documentation_mcp_collection_skill`, `documentation.mcp_collection_skill`, `mcp_documentation_collection_skill`, `confluence_mcp_collection_skill`. For “is documentation MCP in scope?” use signals such as `documentation_type`, `type` (when value implies a documentation backend), `confluence_base_url`, `confluence_space`, `documentation_base_url`, `documentation_mcp_server`, or any field your `qa-project-config` template documents for documentation MCP — treat absent values as absent.
</workflow_context>

<phase_steps>
1. Resolve MCP skill tag and configuration presence
2. Harvest and collect documentation pages
3. Verify raw-data documentation subsection
</phase_steps>

<execute_documentation_mcp step="1.2b" subagent="discoverer" role="QA data collector">
**Early-exit rule:** whenever you must finish **without** running the MCP collection USE in step 9 below, write the branch row under the raw-data heading (see **Output contract** table), run **only** step 10 (verify), then **stop this subflow**.

1. **Resolved MCP collection skill:** pick the first non-empty string from the config keys listed in `<workflow_context>` (`documentation_mcp_collection_skill`, `documentation.mcp_collection_skill`, `mcp_documentation_collection_skill`, `confluence_mcp_collection_skill`). If none are set but documentation MCP scope is clearly active per other config fields, re-read `qa-project-config.md` and Phase 0 notes from `qa-flow-project-config-loading` for a default tag; if still absent, apply **SKIPPED_NO_CONFIG** row from the table → **Early-exit rule**.
2. If **all** documentation MCP signals listed in `<workflow_context>` are absent (no URLs/spaces/types/MCP entries/skill tags for documentation): apply **SKIPPED_NO_CONFIG** → **Early-exit rule**.
3. ACQUIRE `confluence-source-harvesting` FROM KB if not already loaded.
4. If step 3 returned **zero** documents: apply **ACQUIRE_FAILED** with skill `confluence-source-harvesting` → **Early-exit rule**.
5. ACQUIRE the **Resolved MCP collection skill** tag from step 1 FROM KB if not already loaded.
6. If step 5 returned **zero** documents: apply **ACQUIRE_FAILED** with the **Resolved MCP collection skill** tag → **Early-exit rule**.
7. USE SKILL `confluence-source-harvesting`.
8. If step 7 produced no harvestable sources: apply **EMPTY_HARVEST** → go to step 10 only (**do not** run step 9).
9. USE SKILL with the **Resolved MCP collection skill** tag; when done, apply **COMPLETED**.
10. Verify `agents/qa/{IDENTIFIER}/raw-data.md` exists and the documentation heading holds **exactly one** outcome matching **one row** of the **Output contract** table, consistent with the branch taken above. **Verification-failure remediation:**
    - **Zero outcomes found under the heading:** append the appropriate row for the branch taken; re-run step 10.
    - **Duplicate outcomes (multiple rows under the heading, typically from a re-run):** keep only the most recent matching row (latest by `agents/qa-state.md` Phase 1 timestamp), delete earlier rows; re-run step 10.
    - **Heading missing entirely:** create the fixed heading from `<workflow_context>`, then append the appropriate row; re-run step 10.
    - **After remediation:** if verification still fails on a third pass, stop, record `Phase 1 subflow verification failed after remediation` in `agents/qa-state.md`, and ask the user to inspect `raw-data.md` manually.
</execute_documentation_mcp>

<output_contract>
| Branch | Trigger (summary) | Required outcome line (starts with `**Outcome:**`; no extra trailing `**`) |
| --- | --- | --- |
| **SKIPPED_NO_CONFIG** | No documentation MCP configuration / no resolvable collection skill | `**Outcome:** skipped — no documentation MCP configuration` + one-line reason |
| **ACQUIRE_FAILED** | ACQUIRE returned zero docs for harvesting or MCP collection skill | `**Outcome:** skipped — ACQUIRE failed` + skill name + short error |
| **EMPTY_HARVEST** | Harvesting ran but found no fetchable sources | `**Outcome:** no documentation sources after harvesting` + what was searched |
| **COMPLETED** | MCP collection skill ran after successful harvest | `**Outcome:** collected via <skill-name>` + brief page/URL count (use **Resolved MCP collection skill** tag from step 1) |

Apply rows by writing under the fixed heading; each row’s third column is the canonical shape — reference this table instead of paraphrasing.
</output_contract>

</qa_flow_documentation_mcp_subflow>
