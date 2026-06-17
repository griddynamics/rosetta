# AQA flow — manual test guide

End-to-end smoke check for the UI / browser test-automation workflow
(`aqa-flow.md`, 8 phases 1–8). Use for Playwright / Cypress / Selenium /
WebdriverIO projects. External data is pulled by the single `discovery` skill via
config-resolved vendor bindings (`testrail` / `confluence`). Two shared skills carry
the cross-phase scaffolding — **`qa-structure`** (canonical
paths, the `<test-name>` slug rules + page-sources contract, state-file shape) and
**`qa-knowledge`** (failure taxonomy, redaction scope, and the per-phase artifact
skeletons, `ACQUIRE`'d as assets at point of use). QA uses the same two.

## Prerequisites

- [ ] Rosetta plugin installed and active (plugin mode — the form under test)
- [ ] Browser-automation MCP (e.g. Playwright MCP) available
- [ ] Target repo has a test-runner configured (`npm test`, `pytest`, etc.)
- [ ] `agents/plans/` writable
- [ ] **Auth is optional** (see below). AQA never uses **Jira**; it reads test cases from **TestRail** (optional) and docs from **Confluence** (optional; degrades to a recorded gap). For a full real run: TestRail and/or Confluence MCP authenticated.

## Auth-free / mock testing

The `discovery` bindings only ever make *real* MCP calls or stop with a gap — they never fabricate. AQA works with **no TMS/doc auth** via a direct case description. Two auth-free modes:

- **Mode A — source out-of-scope / provided.** Leave `testrail_base_url` / `confluence_base_url` unset (`N/A`). Phase 1 resolves **`SKIPPED_NO_CONFIG`**, records the gap in `## Access / Truncation Notes`, and proceeds on the case/feature you describe in the trigger. (One of the trigger prompts is exactly this — direct description, no case ID.)
- **Mode B — stub MCP (canned data).** Point the TestRail/Confluence MCP at a local stub answering `mcp_testrail_*` / `confluence_*` with fixtures; the binding runs its full extract → normalize → redact → write path with zero real auth. Guardrails permit this (*"User can override (mocked data)"*).

> Mode A validates the degradation path; Mode B exercises the real pull logic without credentials.

## Trigger prompt (pick one)

```
Write E2E test for checkout flow with valid card. TestRail case: TC-5678.
```
```
Add automation for login with invalid credentials. Use Playwright; follow IMPLEMENTATION.md conventions.
```
```
Fix the failing test test_search_returns_results. Report at agents/user-instructions/last-run.html.
```
```
Automate the password-reset flow end-to-end with Cypress (no ticket — direct description: user requests a reset, opens the emailed link, sets a new password, logs in).
```
```
Add a Playwright test that adds an item to the cart and asserts the cart-badge count. Confluence spec: https://your-org.atlassian.net/wiki/spaces/QA/pages/45678.
```

## Per-phase quick checks

| Phase | HITL | File to inspect | Skill(s) | Must see |
|---|---|---|---|---|
| 1 — Data Collection | — | `agents/plans/aqa-<test-name>.md` | `discovery` (`testrail` + `confluence` bindings), `qa-structure` | Test Case Information + Feature Context + **Access / Truncation Notes** (all page-access gaps disclosed); sources cited; no fabricated steps. Plan written from the `aqa-plan-template` asset; `agents/aqa-state.md` seeded from the `aqa-state-template` asset |
| 2 — Requirements Clarification | **HITL** | Same plan file (`## Phase 2`) | `requirements-use` (gap_analysis mode), `questioning` | **`### Explicit Assertions`** present (typed: Presence / State / Content / Behavioral; one per bullet) — mandatory or the phase fails validation; workflow **paused** with questions; aggregate-cap fires if you decline most Criticals |
| 3 — Code Analysis | — | `agents/plans/aqa-<test-name>-code-analysis.md` | `reverse-engineering` (test-arch mode), `sensitive-data` | All 9 sections (Framework/Standards · User Instructions · Frontend Analysis · Page Object Inventory · Similar Tests · Test-Location Decision · Reusable Utilities · Conflicts & Precedence · Coverage); test-location decision cites the ~400-line rule |
| 4 — Selector Identification | conditional | Plan's `## Selector Management` (Part A) | `testing` (selector mode, Part A — read-only) | Interaction Map + Selector Availability (✅/❌/UNRESOLVABLE) + Identified Selectors (4-tier: `data-testid` > `id` > stable class/ARIA > XPath) + Fragile Selectors Flagged; **page sources captured** under `agents/plans/aqa-<test-name>-page-sources/` if any were ambiguous |
| 5 — Selector Implementation | — | Modified page-object files + plan `### Implementation (Part B)` | `testing` (selector mode, Part B), `coding` (general repo hygiene) | Selectors added to existing files where possible; new files only when justified; lint-clean; **no inline selectors in test code** |
| 6 — Test Implementation | **HITL** | New/modified test file + plan `## Test Implementation` record | `testing` (UI impl mode), `coding` (repo conventions) | Every Phase 2 assertion implemented OR listed in `### Uncovered Assertions` (no silent drop); lint passes; workflow **paused** for you to execute (phase does not run tests) |
| 7 — Test Report Analysis | **HITL** | `agents/plans/aqa-<test-name>-failure-analysis.md` | `debugging` (triage mode), `sensitive-data` | All 6 fields per failure (Failure name / Error type / Root cause / Evidence label / Evidence rationale / Recommendation), category from the 7-item UI taxonomy; **no source files modified by this phase** |
| 8 — Test Corrections | **HITL** | Proposed Changes for each failure | `debugging`, `coding` | Approval required per-change (exact token `approved`/`approve`/`yes`); **only test/page-object files modified**, never application source; iteration cap **3 cycles per change** |

State file: `agents/aqa-state.md` (created by Phase 1 from the `qa-structure` `aqa-state-template` asset: `## Phase Completion Status` · `## Key Artifacts & Facts` · `## Verification-Failure Overrides`).

**Across all phases:** `qa-structure` supplies the canonical paths, `<test-name>` slug rules + page-sources contract, and state-file shape; `qa-knowledge` supplies the UI failure taxonomy, the artifact skeletons (plan, code-analysis report, clarification templates, failure-analysis — each `ACQUIRE`'d FROM KB at the step that writes it), and the redaction scope. The Skill(s) column lists each phase's domain skills on top of these two.

## Try to break it

| Action | Expected behavior |
|---|---|
| Trigger without a test name or feature description | Phase 1 asks; no fabricated `<test-name>` slug |
| Mid-Phase 2 say *"skip clarification questions"* | Refused if ≥1 Critical question would remain unanswered (aggregate cap) |
| Mid-Phase 7 say *"fix the selector now, don't wait for Phase 8"* | Refused; Phase 7 is read-only; routed to Phase 8 |
| Mid-Phase 8 say *"apply Change 1 and Change 3, also clean up some imports"* | Cleanup refused (out of scope); Change 1 + Change 3 applied |
| Page-sources directory missing in Phase 7 | Selector-category failures tagged `Unknown — page sources not available; would need the selector-identification phase re-run`; non-selector failures still analyzed |
| Iteration 3 of the Phase 6→7→8 loop with failures remaining | `Phase 8 blocked: in-phase apply retry cap reached` (3 cycles/change) → escalate; no auto-start of a 4th cycle |
| Simulate KB unavailable before Phase 7 redaction (the `redaction-scope` ACQUIRE returns zero) | **Fail-closed**: Phase 7 STOPs and reports — never emits an unscanned `failure-analysis.md` |

## Done when

- Every in-scope phase marked complete in `agents/aqa-state.md`
- Test passes (or user explicitly accepts the current outcome)
- No application source modified outside the test layout

## Where to file bugs

Open an issue on the PR branch citing: phase number, plan-file section, expected vs. actual. If running auth-free, note **Mode A** or **Mode B**.
