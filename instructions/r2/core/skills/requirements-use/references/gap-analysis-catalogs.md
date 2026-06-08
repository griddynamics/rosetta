# Gap Analysis — Detection Catalogs (requirements-use `<gap_analysis>` mode)

Loaded on demand by the `<gap_analysis>` mode of `requirements-use/SKILL.md` when actively classifying findings. The mode keeps the method, GATEs, redaction rule, and emit contract inline; this file holds the probe catalogs the agent scans against. The calling phase owns the finding-entry template and output-artifact shape — these catalogs only drive *what to look for*, never *how to format the output*.

---

## Contradiction probes (same concept, conflicting values or logic)

- **Value mismatch** — priority, scope, timeline, or owner differs across sources (Jira "High" vs Confluence "Low"; sprint N vs different sprint).
- **Logic conflict** — "must be fast" AND "must show detailed calculations"; "open to all" AND "must be secured"; "minimal MVP" vs "rich feature set".
- **Requirement conflict** — Source A "users can delete records" vs Source B "records are immutable".
- **Cross-source method conflict** — test case expected results vs API-spec response schema; test case HTTP method vs endpoint definition; doc description vs Swagger definition; two doc pages disagreeing.

## Gap probes (missing information required downstream)

- **Functional** — undefined user actions, unspecified edge cases (empty/null/max), missing error handling, undocumented integration points.
- **Non-functional** — missing performance (response time/throughput), unclear security (authn/authz), unspecified scalability (concurrency/volume), missing compliance (GDPR/accessibility).
- **Data** — unspecified formats, missing validation rules, unclear data sources.
- **Business logic** — unexplained calculations, incomplete rules, missing workflow steps.
- **Dependency** — unlisted external systems, undocumented API endpoints, unspecified third-party services.
- **API/test-spec variant** (test-cases-vs-API-spec): missing endpoint details (path/method/version/base URL), request details (required fields/types/validation/headers/Content-Type), response details (status codes/body schema/error format/headers), auth details (mechanism/credentials/token flow/roles), test-data details (input values/expected values/preconditions/cleanup), edge cases (empty/null, over-limit, invalid type, duplicates, concurrency, rate limiting).
- **Test-plan variant** (AQA plan completeness — five dimensions, all MUST be evaluated):
  - **D1 — Steps clarity:** concrete actor, action, target — no vague steps.
  - **D2 — Result measurability:** observable values, not "works correctly" / "as expected".
  - **D3 — Test data:** values, sources, lifecycle defined.
  - **D4 — Edge cases:** boundary values, error paths, concurrency, empty/null inputs.
  - **D5 — Success criteria:** explicit pass/fail thresholds, completion signals.

## Ambiguity probes (one statement, multiple readings)

- Vague terms: "fast", "soon", "many", "few", "approximately".
- Undefined roles ("admin" with no definition), unclear workflows ("system processes request" — how?), undefined acronyms/terms.
- Test-case vagueness: "verify the response is correct", "check the data is saved", "validate error handling", "test with valid data", "ensure proper authentication".

## Cross-reference probes (≥2 sources)

- Information present in one source but not the others (only-in-A / only-in-B).
- Overlapping information at different detail levels.
- Consistent information (record as a positive finding).
- Single-source case: skip cross-reference with an explicit note; never fabricate a comparison against an absent source.

---

## Risk / priority tiers (three only — no fourth tier)

- **High / Blocking** — cannot proceed without resolution (blocks implementation or test design).
- **Medium / Should** — can proceed but quality or correctness is affected.
- **Low / Optional** — minor clarification; will not block.

Each finding receives exactly one tier. For the AQA test-plan variant, also tag **Confidence: High** (clearly a gap) or **Confidence: Low** (borderline — flag for the phase to prioritize). For gaps expressible as a concrete measurable assertion (e.g. `response.statusCode == 200`, `page.title == "Order Confirmed"`), record the derived assertion in the entry; otherwise leave it blank — never fabricate.

## Authoring discipline for every finding

- **Be specific.** Bad: "some details missing". Good: "user authentication method not specified (OAuth, SAML, basic auth?)".
- **Quote sources verbatim** with field/section/page citation — never paraphrase as "the source said X".
- **Assess impact** — link to a concrete downstream blocker.
- **No assumptions** — document what is explicitly missing; do not infer unstated requirements.
- **Redact before quoting** — credentials/tokens/keys/PII replaced with shape-preserving placeholders (`<redacted: bearer token>`, `<redacted: customer email>`). Structural content (paths, methods, status codes, field names, schema shapes) is safe. → USE SKILL `sensitive-data`.
