# testing

Enforces coverage, isolation, and mocking discipline on test-writing, with a sequence-diagram requirement for complex scenarios.

## Why it exists

Without this skill a model would treat "tests pass" as sufficient, with no coverage floor, and would either mock everything (including plain in-process classes, masking real wiring bugs) or mock nothing (letting real external calls make unit tests slow/flaky). It would let state leak between test runs (stale servers left running from a previous pass) and would skip a sequence diagram for a complex orchestrator scenario, leaving call order to be reverse-engineered from prose later. It would also scope-creep: asked to fix one test, it would add unrequested refactors while in the file.

## When to engage

Use when writing/updating tests, verifying implementation correctness, setting up test infrastructure, or browser-based testing. Actor: any agent, mainly `engineer` (`agents/engineer.md` names it explicitly in `skills_available` and process step 2); auto-activates via description match (`disable-model-invocation: false`) or manual `/testing` (`user-invocable: true`). Prerequisite: "All Rosetta prep steps MUST be FULLY completed, load-project-context skill loaded and fully executed." Thresholds carried in the trigger line itself: coverage >= 80%, each test < 1s, no real external calls in unit tests, complex/high-level (services/orchestrators) scenarios require sequence diagrams.

## How it works

Single-file skill — no `assets/` or `references/` subfolders exist. `SKILL.md` is one flat pass: `role` -> `when_to_use_skill` -> `core_concepts` (prep-step prerequisite; KISS/SOLID/SRP/DRY/YAGNI/MECE; scope-creep prevention; quality bar; mocking policy; scenario-testing requirement; infra notes) -> `validation_checklist` (mirrors `core_concepts` as pass/fail items) -> `best_practices` -> `pitfalls` -> `resources`. `resources` is the fallback map: `coding` for implementation context, `debugging` for test failures/unexpected behavior, plus whatever MCPs/tools are available (Playwright, Appium, Context7). The skill has no sub-agent of its own — it is applied by whichever agent invokes it.

## Mental hooks & unexpected rules

- "MUST enforce 1-second timeout on EACH test via attributes or configuration to detect accidental external calls" — the timeout is a tripwire for leaked real network/DB calls, not a performance target.
- "Mock EXTERNAL calls ONLY: HTTP clients, API clients, SQL connections, message queues" / "Do NOT mock regular classes that can be created and pre-configured" — mocking a plain in-process object is a defect, not a style choice.
- "NEVER use actual servers in unit tests" — a hard prohibition, not a preference.
- "MUST create sequence diagram with all parties for each complex or scenario test" — mandatory artifact, not optional documentation, once a test crosses the services/orchestrators complexity line.
- "Kill all existing servers that may have been started previously before running tests" — a required pre-run step, not post-run cleanup.
- "Use Playwright MCP as the first testing step for browser-based validation" — ordering rule: Playwright MCP precedes any other browser tooling.
- "apply ONLY what was requested, do not add unrequested tests, refactors, or improvements" — scope discipline stated locally, matching `coding` skill's zero-tolerance stance without referencing it.

## Invariants — do not change

- Frontmatter `name: testing` matches the folder name and the `docs/definitions/skills.md` registry entry (`- testing`, confirmed present).
- `description: "To write thorough, isolated, idempotent tests — 80%+ coverage, external-only mocking, scenario-driven."` — short and keyword-dense on purpose; it drives auto-activation matching since `disable-model-invocation: false`.
- `disable-model-invocation: false` / `user-invocable: true` — keep both as-is; flipping either removes auto-engagement or the `/testing` manual entry point.
- Outer tag `<testing>` must keep matching `name: testing`.
- Numeric thresholds `80%` coverage and `1-second` per-test timeout: no other r3/core file cites *this file's* values by reference. `80%` recurs independently in `configure/{windsurf,cursor,antigravity}.md` and several `modernization-flow*`/`testgen-flow*` files as a separate repo-wide convention, not a dependency on this skill; the `1-second` timeout is stated only here. Changing either number changes only this skill's own bar.
- `resources` cross-skill references (`skill \`coding\``, `skill \`debugging\``) use bare skill-name form per `docs/schemas/skill.md`; both target skills exist.
- Inbound couplings (`grep -rn "testing" instructions/r3/core --include="*.md"`, filtered — the plain word "testing" also hits many unrelated generic uses: "testing framework", "load testing", "unit testing", "re-testing", CLI/browser "testing harness" phrasing in `coding/SKILL.md`, `validator.md`, `coding-agents-farm/SKILL.md`, and workflow prose; `dangerous-actions/SKILL.md`'s "actual servers in unit testing" pitfall overlaps this skill's mocking policy semantically but does not reference it — none of these are couplings):
  - `agents/engineer.md` — `skills_available` entry `USE SKILL \`testing\`` and process step 2 ("USE SKILL `coding` or `testing` or `debugging`").
  - `commands/coding-flow.md` — lists `testing` as a **Required** skill for two implementation phases and as **Recommended** in several other phases and agent-skill rosters.
  - `commands/self-help-flow.md` — cites `/testing` as an example of a skill users should not invoke directly (routed through `coding-flow` instead).
  - `docs/definitions/skills.md` — registry entry `- testing`.

## Editing guide

Safe to extend: `best_practices`, `pitfalls`, `resources` — additive lists, low coupling risk. Handle with care: `core_concepts` (quality bar, mocking policy, scenario-testing rule) and `validation_checklist` mirror each other item-for-item — edit both together or the checklist drifts from the rules it verifies. Also handle with care: the `when_to_use_skill` trigger line, since `coding-flow` treats `testing` as Required in some phases and routing depends on the description/trigger match. New generic testing guidance belongs directly in `SKILL.md` — there is no assets/references split to route into yet; if a topic (e.g., a Playwright-specific procedure) grows beyond a few lines, that is the signal to add a `references/` file rather than expanding the flat body further. Referenced by: `agents/engineer.md`, `commands/coding-flow.md`, `commands/self-help-flow.md`, `docs/definitions/skills.md`.
