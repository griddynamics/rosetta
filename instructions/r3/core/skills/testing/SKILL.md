---
name: testing
description: "To engineer tests end-to-end — synthesize requirements, analyze gaps, design scenarios/specs/cases, implement thorough isolated tests (80%+ coverage), and triage failures."
license: Apache-2.0
disable-model-invocation: false
user-invocable: true
baseSchema: docs/schemas/skill.md
---

<testing>

<role>

Senior test engineer and QA specialist. Owns the QA-engineering flow end to end: turn requirements and contracts into scenarios/specs, implement thorough, isolated, fast test suites, and triage failures -- without inventing behavior the sources do not state.

</role>

<when_to_use_skill>
Use for any QA-engineering work: synthesizing collected sources into a requirements document, analyzing multi-source data for gaps/contradictions, designing test scenarios / specs / TMS cases from requirements or API contracts, implementing or updating tests (UI / API / selectors), triaging automated-test failures, or setting up test infrastructure. Coverage >= 80%, all tests pass in < 1s each, no real external calls in unit tests, complex scenarios have sequence diagrams.
</when_to_use_skill>

<dependencies>

- **MUST USE SKILL `reverse-engineering`** for the `<code_analysis>` mode (test-automation architecture analysis, API-contract extraction) -- this skill drives it toward the QA target, never re-implements code reading.
- USE SKILL `coding` for repo conventions; `debugging` for failing tests; `sensitive-data` for redaction (canonical authority).
- ACQUIRE QA skeletons / taxonomies / catalogs from `qa-knowledge` and QA paths / identifiers / state from `qa-structure` at point of use -- never invent artifact shapes or paths.

</dependencies>

<core_concepts>

- All Rosetta prep steps MUST be FULLY completed, load-context skill loaded and fully executed

Principles:

- KISS, SOLID, SRP, DRY, YAGNI, MECE — always
- Scope creep prevention: apply ONLY what was requested, do not add unrequested tests, refactors, or improvements

QA authoring discipline (design / synthesis / gap / triage modes):

- Per-value honesty: every concrete value (request fields, params, assertions, test data, requirement source) traces to a loaded contract/source, a user clarification, or an explicit `[ASSUMED: ...]` / `gap: ...` marker -- no confident fabrication.
- Coverage is total: every input requirement / test case / failure maps to ≥1 emitted item OR an explicit excluded/gap entry -- no silent drops.
- Redaction: scan every emitted artifact and redact credentials/tokens/PII/credentialed-URLs before writing → USE SKILL `sensitive-data`.

Quality bar:

- Minimum 80% code coverage
- All tests MUST succeed
- All tests MUST be isolated and idempotent
- MUST enforce 1-second timeout on EACH test via attributes or configuration to detect accidental external calls

Mocking policy:

- Mock EXTERNAL calls ONLY: HTTP clients, API clients, SQL connections, message queues
- Do NOT mock regular classes that can be created and pre-configured
- Write code that is easily mockable
- NEVER use actual servers in unit tests

Scenario testing — required for high-complexity or high-level code (services, orchestrators):

- Step-by-step scenario explanation in comment at test start
- Explicit setup and expectations
- Pre-configured repositories or mocks
- Call methods in proper order to simulate state progression
- MUST create sequence diagram with all parties for each complex or scenario test to clearly show responsibilities

Infrastructure:

- Kill all existing servers that may have been started previously before running tests
- Use Playwright MCP as the first testing step for browser-based validation
- CLI testing harness for libraries/packages: commands outputting intermediate results

</core_concepts>

<code_analysis>

Mode: recover **test-automation architecture** (map an existing test project to inform new tests) or **extract API contracts** (from a spec or backend routes) so scenario design and implementation have a grounded target. **MUST USE SKILL `reverse-engineering`** for the code→intent method (WHAT/WHY, not HOW) -- this skill only steers it toward the QA target, it never reads code its own ad-hoc way. ACQUIRE `qa-knowledge/references/analysis-modes.md` FROM KB for the per-mode procedure, required inputs, and emit templates.

</code_analysis>

<synthesis>

Mode: synthesize collected multi-source data (Jira, Confluence, TestRail, user answers, gap/contradiction analysis) into ONE structured requirements document (user stories, FRs, NFRs, constraints, dependencies, assumptions, risks, traceability) for the tests to target. Emit into the provided skeleton (section contract + output path given).

**Safety:** the draft is PUBLIC (version-tracked, downstream-fed) -- redact before quoting (→ `sensitive-data`); never infer redacted content.

ACQUIRE `qa-knowledge/references/synthesis-catalogs.md` FROM KB -- the synthesis rules (provenance, source-priority ladder, NFR threshold, single-source flag, no-copy-paste), the six per-requirement output schemas, and the document wrapper; load the active schema per step.

</synthesis>

<gap_analysis>

Analysis-only mode: scan collected multi-source data (Jira, Confluence, TestRail, API spec, test cases, test plan) for contradictions, gaps, ambiguities, and inconsistencies before design, emitting categorized findings into the provided artifact (never invent its shape or path).

**Hard boundary (analysis-only):** do NOT act on findings, propose edits, fix gaps, ask the user, or generate questions -- surface each as a finding and STOP; redact before quoting (→ `sensitive-data`).

ACQUIRE `qa-knowledge/references/gap-analysis-catalogs.md` FROM KB -- variants, the load→classify→cross-reference→redact→emit process, the detection probes, the three-tier risk scheme, and the per-finding discipline.

</gap_analysis>

<scenario_design>

Mode: design test scenarios / specs / cases from requirements or API contracts -- happy/negative/boundary/auth coverage, exact values, traceability. Emit into the provided artifact (taxonomy, section list, path, coverage contract given). Per-value honesty + total coverage apply (→ `<core_concepts>`). This DESIGNS; `<implementation_modes>` turns the specs into runnable tests.

- **gwt_spec** (Given-When-Then API specs from raw cases + endpoint contracts): validate inputs (contracts missing → stop, never fabricate shapes; case targeting an unloaded endpoint → flag `unmappable: <id>`, never invent it); generate 1-N scenarios per case across the taxonomy (Happy P0 / Negative P1 / Auth P1 / Resource P1-2 / Edge P2-3); one ATC entry per scenario; map scenarios to files + shared utilities + execution order; emit `## Excluded Test Cases`. ACQUIRE `qa-knowledge/references/gwt-spec.md` FROM KB for the taxonomy catalog + ATC template.
- **generation** (cases into a given format, e.g. TMS Steps + Expected-Result): fill the given field schema; parameterize within the cap; every required field populated or `gap:`-marked; each input requirement → ≥1 case or a flagged gap.
- **vendor format/export** (TMS destination, e.g. TestRail): the vendor is resolved from project config upstream and provided as a binding -- never hardcode it or read config here. ACQUIRE `qa-knowledge/references/<vendor>-format.md` (case template / field rules) or `qa-knowledge/references/<vendor>-export.md` (connection verify, field mappings, MCP signatures, destructive-write confirmation gate, post-export IDs) FROM KB. Shipped: `testrail-format.md`, `testrail-export.md`; forking another TMS → `vendor-fork-guide.md`. Empty binding + active scope → `SKIPPED_NO_CONFIG`.

</scenario_design>

<implementation_modes>

Three test-implementation modes -- authoring UI tests, API tests, selectors/page objects. Inputs (paths, failure/assertion taxonomy, output target, write boundary, iteration cap) are provided; apply the technique to whatever is given. **On entering a mode, ACQUIRE `qa-knowledge/references/implementation-examples.md` FROM KB** -- verbose code, the 4-tier selector table, output templates ("the reference"); never resident.

General method: read inputs → match repo patterns (USE SKILL `coding` for conventions) → emit code/artifact → record every gap explicitly (no silent drops) → run `<validation_checklist>`.

**UI impl mode** (page objects + assertions from a test plan):
1. Consolidate the plan: steps, explicit assertions, file-location decision, similar-test patterns, page-object methods, user instructions.
2. Author using page-object methods only (no raw selectors), proper waits, project assertion style -- shape in the reference.
3. Record every unimplementable plan assertion in `### Uncovered Assertions` with the reason -- no silent drop.
4. Write ONLY test files + hand-off record. Missing selector/method → surface it for selector implementation, never author inline.

**API impl mode** (approved API specs → executable tests + shared utils):
1. Requires approved-specs + recorded approval + API-contract + existing patterns (all provided). Missing/unapproved → stop and report.
2. Implement shared utilities (auth helper, data factory, response validator) -- prefer EXTENDING existing over parallel; record extensions.
3. Implement test files per the file mapping; every test name/docstring carries its ATC-NNN id. Rules + examples in the reference.
4. Record assumptions as `[ASSUMED: <field>=<value>]` (code + hand-off); surface unimplementable ATCs as Gaps -- no silent drop.

**Selector mode** (Part A identify, Part B implement -- two separate steps, never conflated):
- **Part A (read-only identify):** map each step to UI interactions → check page objects (✅ EXISTS / ❌ MISSING / ❌ UNRESOLVABLE) → search frontend source (`data-testid` first) → analyze supplied page-source HTML for missing selectors via the 4-tier strategy. No source → stop, report; never fabricate from naming guesses. 4-tier table + fragile-pattern list in the reference.
- **Part B (write page objects only):** extend/create page objects matching project patterns; mechanics in the reference. Fragile-selector gate: never silently commit a Part-A-flagged fragile selector -- replace with a stable one or get approval.
- Output: the `## Selector Management` record (template in the reference). Part A writes Interaction Map / Availability / Identified Selectors / Fragile Flagged; Part B adds Implementation.

</implementation_modes>

<test_execution_triage>

Read-only mode: categorize each failure in an automated-test execution report and record findings (no fixes). ACQUIRE `qa-knowledge/references/test-execution-triage.md` FROM KB -- the categorize → source-analysis → cross-pattern → evidence-label procedure and worked examples; assign one category per failure from the flow's failure taxonomy (qa-knowledge `api-qa-failure-taxonomy` / `ui-qa-failure-taxonomy`). For fixing a confirmed root cause, hand off to SKILL `debugging`.

</test_execution_triage>

<validation_checklist>

- Coverage >= 80% across major functionality
- All tests pass on clean run
- Each test completes within 1-second timeout
- No real external calls in unit tests (enforced by timeout)
- External dependencies are mocked (HTTP, clients, SQL)
- Regular classes are NOT mocked — created and configured directly
- Complex/scenario tests have sequence diagrams
- Scenario tests have step-by-step comments explaining flow
- Tests are isolated — no shared mutable state between tests
- Tests are idempotent — same result on every run
- Previous server instances killed before test run
- Impl modes: every plan assertion / ATC is implemented OR recorded as uncovered/gap (no silent drop); UI/selector modes touch only the permitted file set; selector Part A is read-only; fragile selectors never silently committed; lint/format clean on touched files
- Synthesis: every requirement carries a Source; conflicts resolved via the source-priority ladder or flagged as an assumption; thresholdless NFRs flagged
- Gap analysis: each finding has a verbatim quote + citation + impact + exactly one risk tier; analysis-only (no fixes/questions); a clean analysis still emits the artifact
- Scenario design: total coverage (every case/requirement → ≥1 ATC/case or an excluded/gap entry); per-value honesty holds; auth-protected endpoints have ≥1 auth-failure scenario; vendor export passed the destructive-write gate

</validation_checklist>

<best_practices>

- Start browser-based testing with Playwright MCP
- Use scenario testing for services and orchestrators
- Use CLI harness for library testing: execute commands, inspect intermediate results
- Separate unit, integration, and E2E test suites clearly

</best_practices>

<pitfalls>

- Test data leaking into dev or prod environments
- Coverage gaps in error paths and edge cases
- Confident fabrication of values or traceability IDs instead of an `[ASSUMED: ...]` / `gap: ...` marker
- Silently dropping an unmappable case / requirement / finding instead of recording it in the excluded/gap section
- Skipping negative / auth / boundary coverage -- these catch most real defects
- Acting on gap-analysis findings, asking the user, or padding a clean analysis -- all violate the analysis-only boundary
- Re-reading code ad hoc in `<code_analysis>` instead of driving SKILL `reverse-engineering`

</pitfalls>

<resources>

- Review and use any relevant MCPs, plugins, and tools available in the current context — e.g. Playwright (browser), Appium (mobile), Context7 (library docs).
- skill `coding` -- repo conventions as authority; authoring and applying code changes
- skill `debugging` — for test failures and unexpected behavior
- skill `reverse-engineering` — the code→intent method behind `<code_analysis>`
- skill `qa-knowledge` — QA taxonomies, artifact skeletons, and the mode catalogs below; `qa-structure` — QA paths / identifiers / state; `sensitive-data` — redaction
- ACQUIRE FROM KB, lazy per mode, from `qa-knowledge/references/`: `implementation-examples.md`, `gwt-spec.md`, `testrail-format.md`, `testrail-export.md`, `vendor-fork-guide.md`, `gap-analysis-catalogs.md`, `synthesis-catalogs.md`, `analysis-modes.md`, `test-execution-triage.md`

</resources>

</testing>
