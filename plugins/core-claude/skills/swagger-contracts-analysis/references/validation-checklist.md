# Pre-Emit Validation Checklist — swagger-contracts-analysis

Loaded on demand from SKILL.md `<process>` step 5.3 ("Run `<validation_checklist>`") when re-checking the assembled artifact before emission. The base SKILL.md keeps the 5-step process + `<safety_boundaries>` + `<failure_handling>` + `<success_criteria>` inline (decision-time content); this file holds the structural proof-oriented items that fire at the single pre-emit pass.

Mirrors the same lazy-loading pattern `references/per-endpoint-template.md`, `references/canonical-example.md`, `references/failure-handling-edge-cases.md`, and `references/redaction-catalog.md` already use.

---

## Validation items (referenced from SKILL.md step 5.3)

Run as part of step 5 before emission. Proof-oriented items only — section-presence is enforced by `<output_format>` itself; this checklist verifies things the template can't.

- **Coverage:** every endpoint in the calling workflow's target list has a contract entry OR is flagged back as a gap with reason. No silent drops.
- **Source Citations populated:** every entry has at least one citation (Swagger JSONPath OR code file:line). Citation-less entries are gaps, not entries.
- **No fabricated content:** every field traces to the spec, to the code, or is explicitly marked `N/A — <reason>` / `Gap: <reason>`. No invented schema fields, no invented status codes, no inferred auth requirements without source.
- **Reconciliation evidence:** entries marked `Source: hybrid` have a non-empty Notes / Discrepancies section (either a recorded mismatch OR an explicit `None.` confirming reconciliation ran). Empty Notes on a hybrid entry means the reconciliation step was skipped.
- **API-level auth strategy summarized:** if endpoints share one mechanism, state it once in the handoff note; if mechanism varies per endpoint, summarize the variance for the calling workflow.
- **Undocumented error responses surfaced as gaps:** a `200`-only entry is acceptable only when both sources truly lack other status codes; otherwise the absence of `401`/`403`/`404`/`500` is recorded in Notes as a documentation gap, not silently omitted.
- **N/A discipline:** every `N/A` in any field has a one-line reason; bare `N/A` is forbidden.
- **Redaction scan ran** per `<safety_boundaries>` — no literal credentials/tokens/PII remain in the artifact.
