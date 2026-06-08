---
name: testing
description: Rosetta testing skill for thorough, isolated, idempotent tests with 80% minimum coverage, external-only mocking, and scenario-driven testing. Use when writing or updating tests.
license: Apache-2.0
baseSchema: docs/schemas/skill.md
---

<testing>

<role>

Senior test engineer and quality specialist. Designs thorough, isolated, fast test suites.

</role>

<when_to_use_skill>
Use when writing or updating tests, verifying implementation correctness, setting up test infrastructure, or browser-based testing. Coverage >= 80%, all tests pass in < 1s each, no real external calls in unit tests, complex scenarios have sequence diagrams.
</when_to_use_skill>

<core_concepts>

- All Rosetta prep steps MUST be FULLY completed, load-context skill loaded and fully executed
- Quality bar, mocking policy, and scenario rules below are canonical — single source of truth; other sections reference, do not restate
- Verbose multi-language code, selector tables, and templates live in `references/implementation-examples.md` — lazy-loaded only inside the relevant `<implementation_modes>` mode, never resident here

Principles:

- KISS, SOLID, SRP, DRY, YAGNI, MECE — always
- Scope creep prevention: apply ONLY what was requested, do not add unrequested tests, refactors, or improvements

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

<implementation_modes>

Three test-implementation modes. The calling workflow PHASE is the SSoT for paths, the failure/assertion taxonomy, the output-artifact contract, the read-only-vs-write boundary, and any iteration cap; this skill EMITS against those bindings. Verbose code/templates load on demand from [references/implementation-examples.md](references/implementation-examples.md) at the cited step — never resident.

General method (all modes): read the phase-supplied inputs → match the repository's existing patterns (USE SKILL `coding` standards-first mode for the authoritative conventions) → emit code/artifact → record every gap explicitly (no silent drops) → run `<validation_checklist>`.

**UI impl mode** (integrate page objects + assertions from a test plan):
1. Consolidate the plan: steps, explicit assertions, file-location decision, similar-test patterns, available page-object methods, user instructions.
2. Author the test using page-object methods only (no raw selectors in test code), proper waits, project assertion style — shape in `references/implementation-examples.md` "UI impl mode".
3. Record every plan assertion that could NOT be implemented in the phase's `### Uncovered Assertions` with the reason — silent drop forbidden (worked example in the reference).
4. Write ONLY test files (and the phase's hand-off record). Missing selector/page-object method → do not author it inline; surface to the phase to re-run the selector phase.

**API impl mode** (implement approved API specs as executable tests with shared utils):
1. GATE: approved-specs artifact + recorded approval + API-contract artifact + discoverable existing patterns all present (phase supplies paths + the approval signal). Missing/unapproved → stop, report to the phase; never author from unapproved specs.
2. Implement shared utilities (auth helper, data factory, response validator) — prefer EXTENDING existing helpers over parallel ones; record any extension.
3. Implement test files per the file mapping; every test name/docstring carries its ATC-NNN id. Rules + multi-language examples in `references/implementation-examples.md` "API impl mode".
4. Record assumptions as `[ASSUMED: <field>=<value>]` (code + hand-off) and surface unimplementable ATCs as Gaps — no silent ATC drop.

**Selector mode** (Part A identify, Part B implement — invoked by separate phases; never conflate in one phase):
- **Part A (read-only identify):** map each test step to required UI interactions → check existing page objects (✅ EXISTS / ❌ MISSING / ❌ UNRESOLVABLE) → search frontend source (`data-testid` first) → analyze the phase-supplied page-source HTML for still-missing selectors using the 4-tier strategy. No source available → stop, report; never fabricate a selector from naming guesses. 4-tier table + fragile-pattern list in `references/implementation-examples.md` "Selector mode".
- **Part B (write page objects only):** extend existing / create new page objects matching project patterns exactly; mechanics in the reference. Fragile-selector gate: a selector Part A flagged fragile is never silently committed — replace with a stable alternative or get explicit approval first.
- Output: the phase's `## Selector Management` section (template in the reference). Part A writes Interaction Map / Availability / Identified Selectors / Fragile Flagged; Part B adds the Implementation subsection.

</implementation_modes>

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
- Impl modes: every plan assertion / ATC is implemented OR recorded as uncovered/gap (no silent drop); UI/selector modes touch only the phase-permitted file set; selector Part A is read-only; fragile selectors never silently committed; lint/format clean on touched files

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

</pitfalls>

<resources>

- MCP `Playwright` — browser-based testing
- MCP `Chrome-DevTools` — browser debugging and inspection
- MCP `Appium` — mobile testing
- MCP `Context7` — library documentation
- MCP `DeepWiki` — external documentation and knowledge
- MCP `GitNexus` — codebase knowledge graph
- MCP `Serena` — semantic code retrieval at symbol level
- skill `coding` — standards-first mode (repo conventions as authority) + approved-apply mode for corrections
- skill `debugging` — for test failures and unexpected behavior
- `references/implementation-examples.md` — multi-language code, 4-tier selector table, output templates (lazy-loaded per `<implementation_modes>`)

</resources>

</testing>
