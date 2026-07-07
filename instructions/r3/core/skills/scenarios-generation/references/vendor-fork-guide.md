# TMS EXPORT binding -- vendor fork guide

Loaded ONLY when forking an existing EXPORT binding to another TMS (Zephyr / Xray / qTest / Polarion). Copy the canonical binding (ACQUIRE `references/testrail-export.md` FROM KB) to `references/<vendor>-export.md` and rebind only the vendor-specific items below; keep the process shape, destructive-write confirmation gate, and redaction discipline verbatim. Gather these first:

| Rebind item | TestRail value | Replace with |
|---|---|---|
| MCP tool names | `mcp_testrail_get_project` / `_get_cases` / `_add_case` | vendor's verify / list / create-case calls |
| Container concept | `section_id` (manual UI creation) | folder ID / module ID / category; offer API creation if the vendor supports it |
| Priority enum | numeric `priority_id` 1–4 | vendor enum (numeric / string; 3/4/5-tier) |
| Type taxonomy | numeric `type_id` 1, 6–10 | vendor type set (Xray Manual/Cucumber/Generic, etc.) |
| Step / precond fields | `custom_steps_separated` / `custom_preconds` | vendor field IDs; concatenate with `--- EXPECTED ---` if the vendor has no split |
| Case ID shape | `C12345` (C-prefix) | `XRAY-NNN` / `TC-NNN` / project-prefixed key |

**Degrade-safely rule:** when the vendor lacks a TestRail concept, degrade the *content* (e.g. skip dedup detection if there is no list-cases call) but NEVER the *gate* -- always keep the confirmation gate, redaction, and a workflow-state record of the skip. Do not abstract into a shared parent until a third vendor binding exists (YAGNI).

**Self-validation grep after a fork** -- `grep -nE 'mcp_testrail_|section_id|custom_steps_separated|custom_preconds|\bC[0-9]{4,}\b|TestRail' <vendor>-export.md` must return zero matches (or intentional retentions tagged `# <vendor>-port: intentional retention — <reason>`).
