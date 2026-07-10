---
name: testing
description: "To engineer tests end-to-end — requirements & gap analysis, scenario/spec design, implementation, and failure triage."
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

<mode_selection>

**Pick exactly one mode by deliverable** (multi-phase → run earliest, stop; next phase re-invokes):

- code → test-arch / API contract → `code_analysis`
- sources → one requirements doc → `synthesis`
- find gaps/contradictions, no fixing → `gap_analysis`
- design test cases/specs (incl. TMS/TestRail), **not runnable** → `scenario_design`
- write/update **runnable tests** -- plain unit/integration (default), or UI / API / selector for QA flows (`.spec`/`.test`) → `implementation_modes`
- categorize run-report failures, no fixing → `test_execution_triage`
- no route matches cleanly (e.g. "assess coverage & suggest improvements") → state the closest-mode interpretation and confirm, or ask which deliverable is wanted, BEFORE proceeding -- never silently pick the nearest mode

</mode_selection>

<code_analysis>

Recover **test-automation architecture** or **extract API contracts** to ground design + implementation. **MUST USE SKILL `reverse-engineering`** for the code→intent method. ACQUIRE `analysis-modes.md` FROM KB (per-mode procedure, inputs, and emit-template pointers).

</code_analysis>

<synthesis>

Synthesize collected multi-source data into ONE structured requirements document, emitted into the provided skeleton. **Redact before quoting** (→ `sensitive-data`); never infer redacted content. ACQUIRE `synthesis-catalogs.md` FROM KB (rules, per-requirement output schemas, document wrapper; load the active schema per step).

</synthesis>

<gap_analysis>

Analysis-only: scan collected multi-source data for contradictions / gaps / ambiguities before design, emitting categorized findings into the provided artifact. **Hard boundary: do NOT act on findings, edit, fix, ask, or generate questions -- surface each and STOP; redact before quoting** (→ `sensitive-data`). ACQUIRE `gap-analysis-catalogs.md` (method + probes + risk tiers) and `gap-finding-templates.md` (G/C/A entry format) FROM KB.

</gap_analysis>

<scenario_design>

Design test scenarios / specs / cases from requirements or contracts (**not runnable** -- runnable tests are `<implementation_modes>`). Per-value honesty + total coverage (→ `<core_concepts>`). ACQUIRE per target FROM KB: Given-When-Then API specs → `gwt-spec.md`; TMS-format cases → `<vendor>-format.md`; TMS export → `<vendor>-export.md`. The TMS `<vendor>` is resolved from config upstream and provided (TestRail shipped: `testrail-format.md` / `testrail-export.md`; fork another TMS → `vendor-fork-guide.md`) -- never hardcode the vendor; empty binding + active scope → `SKIPPED_NO_CONFIG`.

</scenario_design>

<implementation_modes>

Emit **runnable test code** (designing cases/specs is `<scenario_design>`, not here). **General unit/integration mode (default):** a plain "write/update tests for `<code>`" request -- author unit/integration tests for the code under test per the quality bar + mocking policy (`<core_concepts>`); no test plan, ATC specs, page objects, or approvals required. **QA-flow sub-modes** -- UI (page objects from a test plan), API (approved specs → executable tests; missing approval → stop and report), selector (Part A identify → Part B implement page objects) -- used only when their inputs (test plan / approved specs / page sources) are provided: ACQUIRE `implementation-examples.md` FROM KB (method, multi-language code, 4-tier selector table, output templates).

</implementation_modes>

<test_execution_triage>

Read-only: categorize each failure in an execution report and record findings -- **no fixes** (fixing a confirmed root cause hands off to SKILL `debugging`). ACQUIRE `test-execution-triage.md` FROM KB (procedure + evidence labels); assign one category per failure from the flow's failure taxonomy (`api-qa-failure-taxonomy.md` / `ui-qa-failure-taxonomy.md`).

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
- Test-execution triage: every failure has exactly one taxonomy category and exactly one evidence label; `Unknown` states the missing capture; cross-failure Patterns present whenever ≥2 failures share a cause; read-only -- no fixes/edits
- Code analysis: (API-contract) every target endpoint has an entry OR a flagged gap, each with source citations + a Notes/Discrepancies field (`None.` if reconciled clean); (test-arch) every optional input marked `available` / `not available -- <impact>`; read-only -- drives `reverse-engineering`, never reads code ad hoc

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
- ACQUIRE FROM KB, lazy per mode (files held by the `qa-knowledge` library): `implementation-examples.md`, `gwt-spec.md`, `testrail-format.md`, `testrail-export.md`, `vendor-fork-guide.md`, `gap-analysis-catalogs.md`, `synthesis-catalogs.md`, `analysis-modes.md`, `test-execution-triage.md`

</resources>

</testing>
