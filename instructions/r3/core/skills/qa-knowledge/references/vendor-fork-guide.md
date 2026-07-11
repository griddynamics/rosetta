# TMS binding -- vendor fork guide (format + export)

For forking a TMS binding -- **FORMAT** and/or **EXPORT** -- to another vendor (Zephyr / Xray / qTest / Polarion). Copy the canonical binding (`testrail-format.md` and/or `testrail-export.md`) to `<vendor>-format.md` / `<vendor>-export.md` and rebind only the vendor-specific items below; keep the template + process shape, the destructive-write confirmation gate, and the redaction discipline verbatim. The FORMAT binding's sole vendor-specific item is the Steps/Expected field mapping (the `Step / precond fields` row below); the other rows are EXPORT-only. Gather these first:

| Rebind item | TestRail value | Replace with |
|---|---|---|
| MCP tool names | `mcp_testrail_get_project` / `_get_cases` / `_add_case` | vendor's verify / list / create-case calls |
| Container concept | `section_id` (manual UI creation) | folder ID / module ID / category; offer API creation if the vendor supports it |
| Priority enum | numeric `priority_id` 1–4 | vendor enum (numeric / string; 3/4/5-tier) |
| Type taxonomy | numeric `type_id` 1, 6–10 | vendor type set (Xray Manual/Cucumber/Generic, etc.) |
| Step / precond fields | `custom_steps_separated` / `custom_preconds` | vendor field IDs; concatenate with `--- EXPECTED ---` if the vendor has no split |
| Case ID shape | `C12345` (C-prefix) | `XRAY-NNN` / `TC-NNN` / project-prefixed key |

**Degrade-safely rule:** when the vendor lacks a TestRail concept, degrade the *content* (e.g. skip dedup detection if there is no list-cases call) but NEVER the *gate* -- always keep the confirmation gate, redaction, and a workflow-state record of the skip. Do not abstract into a shared parent until a third vendor binding exists (YAGNI).

**Why per-file forks (not `data-collection`'s single-file, capability-abstracted binding):** these are *destructive-write* bindings, so each vendor stays a standalone, independently-auditable file -- the self-validation grep can then assert zero source-vendor leakage against one concrete target. Read-only collection bindings can safely share one abstracted file; a write binding should not until a third vendor proves the shape.

**Self-validation grep after a fork** -- `grep -nE 'mcp_testrail_|section_id|custom_steps_separated|custom_preconds|\bC[0-9]{4,}\b|TestRail' <vendor>-export.md` must return zero matches (or intentional retentions tagged `# <vendor>-port: intentional retention — <reason>`).

**Discovery (skip this and the fork is orphaned)** -- name the fork exactly `<vendor>-format.md` / `<vendor>-export.md`. The `<scenario_design>` router rows are vendor-templated (`references/<vendor>-format.md` / `references/<vendor>-export.md`), with `<vendor>` resolved from project config (supplied by the phase, or asked of the user in a standalone run) -- so a correctly-named fork is loaded automatically, no router edit needed. If any router row or ACQUIRE line still hardcodes a specific vendor's filename, generalize it to the `<vendor>` form.
