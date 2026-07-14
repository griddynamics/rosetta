# UI-AQA flow -- manual test guide

End-to-end smoke check for the UI / browser test-automation workflow
(`ui-aqa-flow.md`, 8 phases 1–8). Use for Playwright / Cypress / Selenium /
WebdriverIO projects. External data is pulled by `data-collection` through role-based
TMS/Wiki bindings. Provider evidence is merged from `gain.json`, the request, recognizable
URLs/handles, and available integrations. TestRail and Confluence are canonical examples.
Two shared skills provide
the cross-phase scaffolding: **`qa-structure`** (canonical
paths, the `<test-name>` slug rules + page-sources contract, state-file shape) and
**`qa-knowledge`** (modes, failure taxonomy, and the per-phase artifact
skeletons, loaded by the skill at point of use). API-AQA uses the same two.

## Prerequisites

- [ ] Rosetta plugin installed and active -- exercise the workflow via the installed plugin (plugin mode), not the raw r3 instructions
- [ ] Browser-automation integration available when the selected project/test path needs it (e.g. Playwright MCP)
- [ ] Target repo has a test-runner configured (`npm test`, `pytest`, etc.)
- [ ] `plans/` writable
- [ ] **External-system auth is optional** (see below). A configured TMS and Wiki are used when available; direct test/feature descriptions remain valid inputs.

## Auth-free / mock testing

The `data-collection` bindings use real configured integration calls or record/stop on a gap; they never fabricate. UI-AQA works without TMS/Wiki auth via a direct case description. Two auth-free modes:

- **Mode A: direct source.** Omit the TMS/Wiki fields from `gain.json.sdlc` or mark them unavailable, and provide a direct test/feature description. Phase 1 records unavailable external sources in `## Access / Truncation Notes` and proceeds.
- **Mode B: stub integration.** Point the configured TMS/Wiki integration at a local fixture provider implementing the required capabilities (get case, get/search page). The binding runs extract → normalize → redact → write without real credentials.

> Mode A validates the degradation/assembly path; Mode B exercises the real pull logic without credentials.

## Trigger prompt (pick one)

```
Write E2E test for checkout flow with valid card. TestRail case: TC-5678.
```
```
Add automation for login with invalid credentials. Use Playwright; follow agents/IMPLEMENTATION.md conventions.
```
```
Fix the failing test test_search_returns_results. Report at agents/user-instructions/last-run.html.
```
```
Automate the password-reset flow end-to-end with Cypress (no ticket -- direct description: user requests a reset, opens the emailed link, sets a new password, logs in).
```
```
Add a Playwright test that adds an item to the cart and asserts the cart-badge count. Confluence spec: https://your-org.atlassian.net/wiki/spaces/QA/pages/45678.
```
```
Automate the checkout cancellation flow. Zephyr case ZEP-42; feature notes: https://github.com/acme/shop/wiki/Checkout-Cancellation.
```

## Per-phase quick checks

| Phase | HITL | File to inspect | Skill(s) | Must see |
|---|---|---|---|---|
| 1 - Data Collection | -- | `plans/ui-aqa-<test-name>/test-plan.md` | `data-collection`, `sensitive-data`, `qa-structure`, `qa-knowledge` | TMS/Wiki/direct sources and provider resolution recorded; Access/Truncation Notes disclose unavailable/restricted/truncated inputs; no fabricated steps; state seeded and Phase 1 delta written |
| 2 - Requirements Clarification | **HITL** | Same plan file (`## Phase 2`) | `qa-knowledge` (`gap_analysis` mode), `questioning` | **`### Explicit Assertions`** present (typed: Presence / State / Content / Behavioral; one per bullet) -- mandatory or the phase fails validation; workflow **paused** with questions; aggregate-cap fires if you decline most Criticals |
| 3 - Code Analysis | -- | `plans/ui-aqa-<test-name>/code-analysis.md` | `qa-knowledge` (`code_analysis` -- test-arch mode), `reverse-engineering`, `sensitive-data` | All 9 sections (Framework/Standards · User Instructions · Frontend Analysis · Page Object Inventory · Similar Tests · Test-Location Decision · Reusable Utilities · Conflicts & Precedence · Coverage); test-location decision cites the ~400-line rule |
| 4 - Selector Identification | conditional | Plan's `## Selector Management` (Part A) | `qa-knowledge` (`implementation_modes` -- selector mode Part A, read-only), `testing` | Interaction Map + Selector Availability (✅/❌/UNRESOLVABLE) + Identified Selectors (4-tier: `data-testid` > `id` > stable class/ARIA > XPath) + Fragile Selectors Flagged; **page sources captured** under `plans/ui-aqa-<test-name>/page-sources/` if any were ambiguous |
| 5 - Selector Implementation | -- | Modified page-object files + plan `### Implementation (Part B)` | `qa-knowledge` (`implementation_modes` -- selector mode Part B), `testing`, `coding` (general repo hygiene) | Selectors added to existing files where possible; new files only when justified; lint-clean; **no inline selectors in test code** |
| 6 - Test Implementation | **HITL** | New/modified test file + plan `## Test Implementation` record | `qa-knowledge` (`implementation_modes` -- UI impl), `testing`, `coding` | Every Phase 2 assertion implemented OR listed in `### Uncovered Assertions` (no silent drop); lint passes; workflow **paused** for you to execute (phase does not run tests) |
| 7 - Test Report Analysis | **HITL** | `failure-analysis.md` when failures exist; state when 0 failures | `qa-knowledge` (`test_execution_triage`), `sensitive-data` | All 7 fields per failure (ID `F-N` / Failure name / Error type / Root cause / Evidence label / Evidence rationale / Recommendation), or explicit zero-failure state evidence; **no source files modified by this phase** |
| 8 - Test Corrections | **HITL** | Proposed Changes for each failure, or N/A state row | `qa-knowledge` (`correction`), `debugging`, `coding`, `hitl` | Explicit scoped approval (exact token `approved`/`approve`/`yes`) required per change; **only test/page-object files modified**, never application source; iteration cap **3 cycles per change** |

State file: `agents/TEMP/<FEATURE>/ui-aqa-state.md` (the feature-scoped resume anchor). Every phase must append its delta before the parent can advance.

**Across all phases:** `qa-structure` supplies paths, slug rules, page-source contract, and state shape; `qa-knowledge` supplies QA modes, taxonomy, and artifact skeletons; `testing` remains active for UI test/selector quality; `sensitive-data` owns fail-closed scans.

## Try to break it

| Action | Expected behavior |
|---|---|
| Trigger without a test name or feature description | Phase 1 asks; no fabricated `<test-name>` slug |
| Remove `gain.json`, then provide a direct feature description | Phase 1 asks only for unresolved provider/input details, records unavailable sources, and continues without inventing configuration |
| Supply a recognizable Confluence/TestRail/other-provider URL absent from `gain.json` | Phase 1 infers the provider when unambiguous and adapts role-binding calls; it does not reject valid URL evidence |
| Make `gain.json` name one provider while the supplied URL names another | Phase 1 surfaces the conflict and asks which applies to this run; it does not silently choose |
| Mid-Phase 2 say *"skip clarification questions"* | Questions waived per-item (each unanswered Critical re-asked once, then recorded declined); **aggregate cap** escalates if ≥50% of Criticals declined (or ≥3 when <6); declining all → Phase 2 stops |
| Mid-Phase 7 say *"fix the selector now, don't wait for Phase 8"* | Refused; Phase 7 is read-only; routed to Phase 8 |
| Mid-Phase 8 say *"Yes, I approve applying Change 1 and Change 3; also clean up some imports"* | Cleanup refused (out of scope); only approved Change 1 + Change 3 applied |
| Page-sources directory missing in Phase 7 | Selector-category failures tagged `Unknown -- page sources not available; needs the selector-identification phase re-run`; non-selector failures still analyzed |
| A single change fails its 3rd in-phase apply cycle (prepare→approve→apply→lint, within Phase 8 step 8.3) | `Phase 8 blocked: in-phase apply retry cap reached` → loop back to Phase 7; no auto-start of a 4th cycle |
| Simulate `sensitive-data` unavailable before the Phase 7 redaction scan | **Fail-closed**: Phase 7 STOPs and reports -- never emits an unscanned `failure-analysis.md` |
| Report 0 failures | Phase 7 records the pass evidence, marks Phase 8 `N/A -- no corrections`, updates state, and returns for final acceptance |

## Done when

- Every in-scope phase marked complete in `agents/TEMP/<FEATURE>/ui-aqa-state.md`
- Test passes (or user explicitly accepts the current outcome)
- No application source modified outside the test layout

## Where to file bugs

Open an issue on the PR branch citing: phase number, configured/resolved providers, plan-file section, and expected vs. actual. If running auth-free, note **Mode A** or **Mode B**.
