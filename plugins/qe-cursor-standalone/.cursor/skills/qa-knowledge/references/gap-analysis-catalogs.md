# Gap Analysis - Detection Catalogs (qa-knowledge `<gap_analysis>` mode)

The runnable gap-analysis method (variants + process) and the probe catalogs to scan against. Drives *what to look for* and *how to run the analysis*, never *how to format output*. The G/C/A finding-entry **format** lives in the asset -- READ SKILL FILE `assets/gap-finding-templates.md`.

## Variants

- **General multi-source** -- contradictions / gaps / ambiguities across all loaded sources; cross-reference sources against each other.
- **Test-cases-vs-API-spec** -- cross-reference each test step against the API analysis (endpoint/method/request/response/status/auth/error); emit gaps where inputs/assertions are spec-unsupported (probes: the API/test-spec gap variant below).
- **Test-plan** -- evaluate all five completeness dimensions D1–D5 (the test-plan gap variant below); per gap record a derived measurable assertion when cleanly derivable, else leave blank -- never fabricate.

## Process

1. **Load** every source completely -- surface missing/empty/partial, never fabricate.
2. **Classify** against the probe catalogs below -- one finding per item, each with a verbatim quote + citation, impact, and exactly one risk tier (tiers → *Risk / priority tiers*; per-finding form → *Authoring discipline*, both below).
3. **Cross-reference** sources against each other (single-source → skip with an explicit note; → *Cross-reference probes*).
4. **Redact** before quoting (→ USE SKILL `sensitive-data`; → *Authoring discipline*).
5. **Emit** findings into the provided artifact -- produce it even when clean (`No issues found` / "all dimensions satisfied"), never pad.

---

## Contradiction probes (same concept, conflicting values or logic)

- **Value mismatch** -- priority, scope, timeline, or owner differs across sources (Jira "High" vs Confluence "Low"; sprint N vs different sprint).
- **Logic conflict** -- "must be fast" AND "must show detailed calculations"; "open to all" AND "must be secured"; "minimal MVP" vs "rich feature set".
- **Requirement conflict** -- Source A "users can delete records" vs Source B "records are immutable".
- **Cross-source method conflict** -- test case expected results vs API-spec response schema; test case HTTP method vs endpoint definition; doc description vs Swagger definition; two doc pages disagreeing.

## Gap probes (missing information required downstream)

- **Functional** -- undefined user actions, unspecified edge cases (empty/null/max), missing error handling, undocumented integration points.
- **Non-functional** -- missing performance (response time/throughput), unclear security (authn/authz), unspecified scalability (concurrency/volume), missing compliance (GDPR/accessibility).
- **Data** -- unspecified formats, missing validation rules, unclear data sources.
- **Business logic** -- unexplained calculations, incomplete rules, missing workflow steps.
- **Dependency** -- unlisted external systems, undocumented API endpoints, unspecified third-party services.
- **API/test-spec variant** (test-cases-vs-API-spec): missing endpoint details (path/method/version/base URL), request details (required fields/types/validation/headers/Content-Type), response details (status codes/body schema/error format/headers), auth details (mechanism/credentials/token flow/roles), test-data details (input values/expected values/preconditions/cleanup), edge cases (empty/null, over-limit, invalid type, duplicates, concurrency, rate limiting).
- **Test-plan variant** (UI-AQA plan completeness -- five dimensions, all MUST be evaluated):
  - **D1 -- Steps clarity:** concrete actor, action, target -- no vague steps.
  - **D2 -- Result measurability:** observable values, not "works correctly" / "as expected".
  - **D3 -- Test data:** values, sources, lifecycle defined.
  - **D4 -- Edge cases:** boundary values, error paths, concurrency, empty/null inputs.
  - **D5 -- Success criteria:** explicit pass/fail thresholds, completion signals.

## Ambiguity probes (one statement, multiple readings)

- Vague terms: "fast", "soon", "many", "few", "approximately".
- Undefined roles ("admin" with no definition), unclear workflows ("system processes request" -- how?), undefined acronyms/terms.
- Test-case vagueness: "verify the response is correct", "check the data is saved", "validate error handling", "test with valid data", "ensure proper authentication".

## Cross-reference probes (≥2 sources)

- Information present in one source but not the others (only-in-A / only-in-B).
- Overlapping information at different detail levels.
- Consistent information (record as a positive finding).
- Single-source case: skip cross-reference with an explicit note; never fabricate a comparison against an absent source.

---

## Risk / priority tiers (three only -- no fourth tier)

- **High / Blocking** -- cannot proceed without resolution (blocks implementation or test design).
- **Medium / Should** -- can proceed but quality or correctness is affected.
- **Low / Optional** -- minor clarification; will not block.

Each finding receives exactly one tier. For the UI-AQA test-plan variant, also tag **Confidence: High** (clearly a gap) or **Confidence: Low** (borderline -- flag for the phase to prioritize). For gaps expressible as a concrete measurable assertion (e.g. `response.statusCode == 200`, `page.title == "Order Confirmed"`), record the derived assertion in the entry; otherwise leave it blank -- never fabricate.

## Authoring discipline for every finding

- **Be specific.** Bad: "some details missing". Good: "user authentication method not specified (OAuth, SAML, basic auth?)".
- **Quote sources verbatim** with field/section/page citation -- never paraphrase as "the source said X".
- **Assess impact** -- link to a concrete downstream blocker.
- **No assumptions** -- document what is explicitly missing; do not infer unstated requirements.
- **Redact before quoting** -- credentials/tokens/keys/PII replaced with shape-preserving placeholders (`<redacted: bearer token>`, `<redacted: customer email>`). Structural content (paths, methods, status codes, field names, schema shapes) is safe. → USE SKILL `sensitive-data`.
