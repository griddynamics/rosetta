# Pre-Emit Validation Checklist — mcp-confluence-data-collection

Loaded on demand from SKILL.md `<process>` step 7 ("Pre-emit validation") when re-checking the assembled artifact before write. The base SKILL.md keeps the 8-step process + `<safety_boundaries>` + `<failure_handling>` + `<success_criteria>` inline (decision-time content); this file holds the structural validation items that fire at the single pre-emit pass.

Mirrors the same lazy-loading pattern `references/cql-and-redaction.md` and `references/vendor-swap.md` already use.

---

## Validation items (referenced from SKILL.md step 7)

Run before declaring the skill complete. All items must hold:

- **Target pages retrieved** via `confluence_get_page` (or via search + retrieve when no URLs were supplied). If retrieval failed entirely, the failure path in SKILL.md `<failure_handling>` was followed instead — this skill is NOT complete.
- **All `<output_format>` sections present:** Page entries with URL/Space/Labels/Updated/Type/Status/Content/Child Pages, Search Provenance (when search was used) OR `N/A — URL-driven retrieval`, Gaps, Sensitive-content redactions. No section omitted; empty sections explicitly say `None.` rather than left blank.
- **Child pages checked for each parent** per `<process>` step 3 (or `None — no children exposed by API` recorded). Parent-only retrieval without checking children is a regression.
- **Truncation noted** on every page exceeding the ~5000-word budget per `<process>` step 6, with a description of what was omitted. Silent truncation is forbidden.
- **Permission errors recorded, not hidden** per `<safety_boundaries>` "Permission errors are not empty content" — any page returning 401/403 appears with `<restricted by permissions>` + a Gaps entry, never as `[empty]`.
- **Search Provenance recorded** when step 2 ran — the exact CQL query, top-N page IDs in ranked order, and the ranking rule applied (title > label > body). Without this, the search run is not reproducible.
- **Redaction scan completed** per `<safety_boundaries>` step 8 re-scan: any matches replaced + recorded in Sensitive-content redactions; if none, that section says `None.` (not blank).
- **No fabricated content** per `<process>` step 4 — every page entry describes content actually returned by `confluence_get_page`. Inference, paraphrase-without-source, or guessed values are forbidden — gaps are recorded.
- **Read-only contract honored** per `<safety_boundaries>` — no Confluence MCP write operations were called.
