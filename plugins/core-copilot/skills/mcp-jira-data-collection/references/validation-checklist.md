# Pre-Emit Validation Checklist — mcp-jira-data-collection

Loaded on demand from SKILL.md `<process>` step 4 ("Pre-emit validation") when re-checking the assembled artifact before write. The base SKILL.md keeps the 5-step process + `<safety_boundaries>` + `<failure_handling>` + `<success_criteria>` inline (decision-time content); this file holds the structural validation items that fire at the single pre-emit pass.

Mirrors the same lazy-loading pattern `<vendor_replacement>` uses for the porting guide and `<safety_boundaries>` uses for the redaction catalog.

---

## Validation items (referenced from SKILL.md step 4)

Run before declaring the skill complete. All items must hold:

- **Issue successfully retrieved:** `jira_get_issue` returned a non-empty issue object; if it did not, this skill is NOT complete — the failure path in SKILL.md `<failure_handling>` was followed instead.
- **All `<output_format>` sections present:** Ticket header, Description, Labels, Components, Assignee/Reporter, Comments, Custom Fields, Gaps, Sensitive-content redactions. No section omitted; empty sections explicitly say `None` (or `<restricted by permissions>` with a Gaps note) rather than left blank.
- **Every empty / restricted required field is in the Gaps section** per `<process>` step 3 (Summary + Description required; empty or restricted → Gaps).
- **Comments cap respected** — at most 10 comments; if Jira had more, a Gaps entry notes `Comments: showing 10 most recent; <total> total exist in Jira`.
- **Custom-field discovery attempted when needed** per `<process>` step 3 custom-fields branch — `jira_search_fields` called on cryptic `customfield_NNNNN` IDs.
- **Redaction scan completed** per `<safety_boundaries>` step 5 re-scan — Description + Comments matches replaced and recorded; no matches → `None.`
- **No fabricated content** per `<process>` step 3 + `<safety_boundaries>` — every output field traces to the actual Jira issue object; gaps recorded, not filled.
- **Read-only contract honored** per `<safety_boundaries>` — no Jira MCP write operations were called.
