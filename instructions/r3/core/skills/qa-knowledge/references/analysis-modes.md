---
name: analysis-modes
description: "QA code-analysis modes (testing `<code_analysis>`) — test-automation architecture analysis and API-contract extraction — applying reverse-engineering's method to a concrete target."
---

<analysis-modes>

Two specialized modes apply the general method (reverse-engineering `<core_concepts>`, `<rules>`) to a concrete target. Each mode EMITS findings into the provided artifact — the report sections, output path, taxonomy, and validation contract are given; this skill never invents the artifact shape or path. When captured source/spec/request/response values are written, redact first → USE SKILL `sensitive-data` (canonical authority).

**Mode: test-automation architecture analysis.** Map an existing test-automation project to inform NEW test implementation — read-only, analysis only.
- Map the territory (core-concept 9) over the test stack: framework + language, project structure (test / page-object / utility / fixture dirs), coding standards and test patterns (AAA, Given-When-Then, setup/teardown), and any captured user-instructions or repo architecture docs.
- Inventory reusable assets: page objects (what each represents, selectors, methods, reuse-vs-extend-vs-new), similar existing tests (structure, imports, assertion style), shared utilities (login/nav/data helpers, custom matchers, generators).
- Inform the requested implementation decision (e.g. test location: add-to-existing vs new-file) by citing the provided rule; never decide the artifact's section list yourself.
- EMIT into the provided code-analysis report structure -- UI-QA: ACQUIRE `qa-knowledge/assets/code-analysis-report-template.md` FROM KB (concrete section template + test-location worked example); the phase owns the exact section list.
- Epistemic honesty: every optional input (user-instructions, frontend source, repo docs) is recorded as `available` or `not available — <impact>` in the coverage section. Silent omission is forbidden — downstream phases misread missing-data as no-issues. On source conflict, authoritative repo docs win; record the conflict, never silently overwrite.

**Mode: API-contract extraction.** Recover endpoint contracts from a Swagger/OpenAPI spec OR backend route definitions for a provided target-endpoint list.
- Requires a non-empty target-endpoint list AND at least one spec/source path (both provided). Empty/absent → stop and report; never scan the whole codebase as a silent fallback, never fabricate the target set.
- Locate the contract source in priority order: spec URL/file → Swagger-in-source (`swagger.json`, `openapi.yaml`, `@ApiOperation`, SpringDoc/Swashbuckle config) → framework route definitions (Express `router.*`, Spring `@*Mapping`, FastAPI/Flask decorators, .NET `[Http*]`). None found for a target → flag it back as a gap with reason; never invent an entry.
- Per endpoint EMIT into the **per-endpoint contract template** -- ACQUIRE `qa-knowledge/assets/api-analysis-template.md` FROM KB (concrete markdown template + worked example): parameters, request/response schemas + status codes, auth (mechanism / scopes / public), data dependencies (preconditions, side effects, idempotency), source citations (Swagger JSONPath AND/OR code `file:line`), and the Notes/Discrepancies field.
- Reconcile: when BOTH spec and code are read, cross-check and record mismatches in the entry's discrepancies field (explicit `None.` if reconciled clean). Coverage is canonical: every target endpoint gets an entry OR a flagged gap — no silent drop.

</analysis-modes>
