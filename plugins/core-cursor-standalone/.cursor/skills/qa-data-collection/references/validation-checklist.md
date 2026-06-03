# Pre-Emit Validation Checklist — qa-data-collection

Loaded on demand from SKILL.md `<process>` step 6 ("Pre-write Safety + Completeness Re-check") when re-checking the assembled artifact before write. The base SKILL.md keeps the 7-step process + `<safety_boundaries>` + `<failure_handling>` + `<success_criteria>` inline (decision-time content); this file holds the proof-oriented validation items that fire at the single pre-emit pass.

Mirrors the same lazy-loading pattern `references/backend-source-analysis.md` (step 4) and `references/existing-test-patterns.md` (step 5) and `references/output-template.md` (step 7) already use.

---

## Validation items (referenced from SKILL.md `<process>` step 6)

Proof-oriented checks only — section presence is enforced by `<success_criteria>`; this checklist verifies things the success contract cannot directly grep.

- **Every output section present-or-N/A** per `<output_format>` (verify by section-header grep before emit; silent omission is forbidden).
- **API endpoints table grep:** every row has non-blank Method + Source columns; partial rows are tagged as Notes gaps.
- **Safety re-check (per step 6.1):** `<safety_boundaries>` Targets-list grep ran; no hits.
- **Anti-assumption re-check (per step 6.2):** every `<pitfalls>` item was reviewed against the artifact; gaps recorded as `Gap: ...` notes per step 6.2 canonical procedure.
- **Sub-skill failure surfacing:** if any delegated MCP skill stopped per `<failure_handling>`, its verbatim failure message appears in the relevant section's `## Notes / Gaps`. No silent absorption of stop reports.
