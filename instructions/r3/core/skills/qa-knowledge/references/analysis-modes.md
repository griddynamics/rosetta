# QA code-analysis modes (qa-knowledge `<code_analysis>`)

Test-automation architecture analysis + API-contract extraction.

<analysis-modes>

Both modes apply reverse-engineering's method to a concrete QA target and EMIT findings into the provided artifact (report sections, output path, taxonomy, validation contract given) -- never invent the artifact shape or path. Redact captured source/spec/request/response values before writing → USE SKILL `sensitive-data`.

**Mode: test-automation architecture analysis.** Map an existing test-automation project to inform NEW test implementation — read-only, analysis only.
- Apply reverse-engineering's map-the-territory discipline over the test stack: framework + language, project structure (test / page-object / utility / fixture dirs), coding standards and test patterns (AAA, Given-When-Then, setup/teardown), and any captured user-instructions or repo architecture docs.
- Inventory reusable assets: page objects (what each represents, selectors, methods, reuse-vs-extend-vs-new), similar existing tests (structure, imports, assertion style), shared utilities (login/nav/data helpers, custom matchers, generators).
- Inform the requested implementation decision (e.g. test location: add-to-existing vs new-file) by citing the provided rule; never decide the artifact's section list yourself.
- EMIT into the provided code-analysis report structure -- UI-QA: READ SKILL FILE `assets/code-analysis-report-template.md` (concrete section template + test-location worked example).
- Epistemic honesty: every optional input (user-instructions, frontend source, repo docs) is recorded as `available` or `not available — <impact>` in the coverage section. Silent omission is forbidden — downstream phases misread missing-data as no-issues. On source conflict, authoritative repo docs win; record the conflict, never silently overwrite.

**Mode: API-contract extraction.** Recover endpoint contracts from a Swagger/OpenAPI spec OR backend route definitions for a provided target-endpoint list.
- Requires a non-empty target-endpoint list AND at least one spec/source path (both provided). Empty/absent → stop and report; never scan the whole codebase as a silent fallback, never fabricate the target set.
- Locate the contract source in priority order: spec URL/file → Swagger-in-source (`swagger.json`, `openapi.yaml`, `@ApiOperation`, SpringDoc/Swashbuckle config) → framework route definitions (Express `router.*`, Spring `@*Mapping`, FastAPI/Flask decorators, .NET `[Http*]`). None found for a target → flag it back as a gap with reason; never invent an entry.
- Per endpoint EMIT into the **per-endpoint contract template** -- READ SKILL FILE `assets/api-analysis-template.md` (concrete markdown template + worked example): parameters, request/response schemas + status codes, auth (mechanism / scopes / public), data dependencies (preconditions, side effects, idempotency), source citations (Swagger JSONPath AND/OR code `file:line`), and the Notes/Discrepancies field.
- Reconcile: when BOTH spec and code are read, cross-check and record mismatches in the entry's discrepancies field (explicit `None.` if reconciled clean). Coverage is canonical: every target endpoint gets an entry OR a flagged gap — no silent drop.

</analysis-modes>
