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

Three sub-blocks executed in order: **resolve** → **harvest_and_collect** → **verify**. Each sub-block carries only its own directives; branch triggers live in `<output_contract>` and are referenced by name (e.g. "apply **SKIPPED_NO_CONFIG**") rather than restated. Config-key precedence lives in `<workflow_context>` and is referenced, not relisted.

**Early-exit rule:** whenever any sub-block applies a branch from `<output_contract>` **other than COMPLETED**, write the row under the raw-data heading and **jump directly to `<verify>` (skip the rest of harvest_and_collect)**.

<resolve>
1. Pick the **Resolved MCP collection skill** = first non-empty config key per `<workflow_context>` precedence list. If none of those keys are set but documentation MCP scope is clearly active per the in-scope signals in `<workflow_context>`, re-read `qa-project-config.md` and Phase 0 notes for a default tag; if still absent, apply **SKIPPED_NO_CONFIG** → early-exit.
2. If **all** documentation MCP signals from `<workflow_context>` are absent: apply **SKIPPED_NO_CONFIG** → early-exit.
</resolve>

<harvest_and_collect>
1. ACQUIRE `confluence-source-harvesting` FROM KB if not loaded. Zero documents returned → apply **ACQUIRE_FAILED** (skill `confluence-source-harvesting`) → early-exit.
2. ACQUIRE the **Resolved MCP collection skill** (from `<resolve>` step 1) FROM KB if not loaded. Zero documents returned → apply **ACQUIRE_FAILED** (Resolved MCP collection skill) → early-exit.
3. USE SKILL `confluence-source-harvesting`. No harvestable sources → apply **EMPTY_HARVEST** → jump to `<verify>` (do NOT run the next step).
4. USE SKILL with the **Resolved MCP collection skill**; when done, apply **COMPLETED**.
</harvest_and_collect>

<verify>
1. Verify `agents/qa/{IDENTIFIER}/raw-data.md` exists and the documentation heading (per `<workflow_context>`) holds **exactly one** outcome line matching the row of `<output_contract>` for the branch taken above.
2. On verification failure: apply the matching case in `<verify_remediation>`, then re-run verify. After three failed passes total, stop and escalate per `<verify_remediation>` "terminal" rule.
</verify>

<verify_remediation>
Triggered from `<verify>` step 2. Each case is a one-step remediation followed by re-running `<verify>`.

- **Zero outcomes under the heading** → append the row for the branch taken (per `<output_contract>`); re-run verify.
- **Duplicate outcomes** (multiple rows from a re-run) → keep only the most recent matching row (latest by `agents/qa-state.md` Phase 1 timestamp), delete earlier rows; re-run verify.
- **Heading missing entirely** → create the fixed heading from `<workflow_context>`, then append the appropriate row; re-run verify.
- **Terminal (third pass still fails)** → stop; record `Phase 1 subflow verification failed after remediation` in `agents/qa-state.md`; ask the user to inspect `raw-data.md` manually.
</verify_remediation>

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
