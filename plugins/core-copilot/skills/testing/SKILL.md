---
name: testing
description: Rosetta testing skill for thorough, isolated, idempotent tests with 80% minimum coverage, external-only mocking, and scenario-driven testing. Use when writing or updating tests.
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

- Rosetta prep steps completed

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
- skill `coding` — implementation context and validation methodology
- skill `debugging` — for test failures and unexpected behavior

</resources>

</testing>
