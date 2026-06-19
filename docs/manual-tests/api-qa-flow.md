# API-QA flow — manual test guide

End-to-end smoke check for the backend API test-automation workflow
(`api-qa-flow.md`, 8 phases 0–7). External data is pulled by the single `discovery` skill
via config-resolved **vendor bindings** (`jira` / `testrail` / `confluence`). Two shared
skills carry the cross-phase scaffolding — **`qa-structure`** (canonical
paths, `{IDENTIFIER}`, state-file shape) and **`qa-knowledge`** (failure taxonomies,
redaction scope, and the per-phase artifact skeletons, `ACQUIRE`'d as assets at point of
use). UI-QA uses the same two.

## Prerequisites

- [ ] Rosetta plugin installed and active — exercise the workflow via the installed plugin (plugin mode), not the raw r3 instructions
- [ ] Working dir lets you write under `agents/api-qa/`
- [ ] Sample backend repo at `RefSrc/<project>/` **or** a Swagger URL handy
- [ ] **Auth is optional** — see *Auth-free / mock testing* below. For a full real run: Atlassian MCP (Jira/Confluence) and/or TestRail MCP authenticated.

## Auth-free / mock testing

You do **not** need real Jira/Confluence/TestRail credentials to test this flow. The `discovery` bindings only ever make *real* MCP calls or stop with a gap — they never fabricate. Two ways to run auth-free:

- **Mode A — source out-of-scope / provided (no MCP call).** In `agents/api-qa/api-qa-project-config.md` leave the vendor's in-scope keys unset (`testrail_base_url`, `jira_base_url`, `confluence_base_url` → `N/A`). Phase 1 then resolves **`SKIPPED_NO_CONFIG`**, records the gap, and proceeds on what you supply directly (paste case fields / use the direct-description trigger, or a Swagger URL/`RefSrc` path for the API contract). Validates degradation + the whole downstream pipeline on your canned input. *Caveat:* the bindings have no "provided-inline retrieval" path, so if you **do** set an in-scope key, Phase 1 will attempt the real MCP and stop on auth failure.
- **Mode B — stub MCP (canned data).** Point the Atlassian/TestRail MCP at a local stub that answers the tool calls (`jira_get_issue`, `confluence_*`, `mcp_testrail_*`) with fixture JSON. The binding treats the fixtures like a real MCP, running the full extract → normalize → redact → write path with zero real auth. Guardrails permit this (*"User can override (mocked data)"*).

> What Mode A actually validates: the **degradation** path (gap/skip, no fabrication), not the real data-pull. Use Mode B to exercise the pull logic without credentials.

## Trigger prompt (pick one)

```
Write backend API tests for TC-1234.
Swagger: https://api.example.com/swagger.json
```
```
Automate backend tests for PROJ-123 with Swagger from RefSrc/my-backend/docs/openapi.json
```
```
Create API tests for the user registration endpoint (no ticket, direct description).
```
```
Generate API tests for POST /orders and GET /orders/{id} from RefSrc/orders-svc/. TestRail suite: S-42.
```
```
Write contract tests for the auth endpoints (login / refresh / logout). Swagger: https://api.example.com/v2/openapi.yaml; Jira: PROJ-789.
```

## Per-phase quick checks

| Phase | HITL | File to inspect | Skill(s) | Must see |
|---|---|---|---|---|
| 0 — Config Loading | conditional | `agents/api-qa/api-qa-project-config.md` + `agents/api-qa/{IDENTIFIER}/initial-data.md` | `qa-structure`, `questioning` (only if config missing) | Config carries the required keys (each a real value **or** `N/A — <reason>`): `documentation_mcp_collection_skill`, `confluence_base_url`, `swagger_url`, `spec_format`, `backend_source_path`, `system`, `testrail_base_url`, `jira_base_url`, `testcase_mcp_collection_skill`, `project_id`/`suite_id`, `framework`, `mechanism`. If config didn't pre-exist you were asked the data-retrieval intake question. |
| 1 — Data Collection | — | `agents/api-qa/{IDENTIFIER}/raw-data.md` | `discovery` (`testrail`/`jira` + `confluence` documentation MCP, inline in step 1.2b), `reverse-engineering` | Sections: Test Case Data · Documentation (or `SKIPPED_NO_CONFIG` outcome) · Existing Test Patterns · Backend Source Code Analysis · API Endpoints Identified · Summary. **No literal `.env` values / passwords.** |
| 2 — API Spec Analysis | — | `agents/api-qa/{IDENTIFIER}/api-analysis.md` | `reverse-engineering` (API-contract mode), `sensitive-data` | Every target endpoint has a contract entry OR is flagged a gap with reason; `Source: hybrid` entries have a non-empty Notes/Discrepancies field (reconciliation or explicit `None.`). |
| 3 — Gap & Requirements Clarification | **HITL** | `agents/api-qa/{IDENTIFIER}/analysis.md` | `requirements-use` (gap_analysis mode), `questioning` | All 7 sections (Gaps `G[N]` · Contradictions `C[N]` · Ambiguities `A[N]` · Questions Critical/Important/Optional · Answers · Resolutions · Open Assumptions). Workflow **paused** with concrete questions; after answers, the invariant `Questions == Answers + Open Assumptions + Skipped + Deferred` holds and no Critical sits in a BLOCKING ASSUMPTION state. |
| 4 — Test Case Specification | **HITL** | `agents/api-qa/{IDENTIFIER}/test-specs.md` | `scenarios-generation` (gwt_spec mode), `sensitive-data` | `ATC-NNN` Given-When-Then entries each trace to a Phase 3 requirement; Summary + Test File Mapping + Shared Utilities + Execution Order present. Workflow **paused** for approval — exact token `approved`/`approve`/`yes`. |
| 5 — Test Implementation | **HITL** | Test files at project layout + hand-off summary returned inline | `testing` (API impl mode), `coding` (repo conventions) | Every ATC has a test fn with its `ATC-NNN` in name/docstring **or** is surfaced under `### Gaps`; lint/format clean; **no hardcoded credentials**; workflow **paused** for you to execute tests (the phase does not run them). |
| 6 — Execution & Report Analysis | **HITL** | `agents/api-qa/{IDENTIFIER}/execution-report.md` | `debugging` (triage mode), `sensitive-data` | Execution Summary + Failures-by-Category (8-item API taxonomy: Connection/Environment · Authentication · Request · Response Assertion · Test Data · Timing/Race · Application Bug · Unknown) + per-failure Evidence label; **no literal tokens / Authorization headers**; workflow **paused** for test-report input. |
| 7 — Test Corrections | **HITL** | Proposed Changes block | `debugging`, `coding` | Per-change proposal (Source root cause · File · In-scope · Change type · Before/After · Reason · Impact · Risk · Approval). After approval, **only test files modified — NOT application source**. Iteration cap **3 cycles per change**, then escalate. |

State file: `agents/api-qa-state.md` (`## Phase Completion Status` + per-phase append blocks).

**Across all phases:** `qa-structure` supplies the canonical paths, `{IDENTIFIER}`, and state-file shape; `qa-knowledge` supplies the failure taxonomy, the artifact skeletons (each `ACQUIRE`'d FROM KB at the step that writes it — expect to see those loads), and the redaction scope. The Skill(s) column lists each phase's domain skills on top of these two. The Phase 0 config interview, config template, and config schema are `qa-structure` assets/references; the tiny QA state-stub + initial-data skeletons stay inline in the phase.

## Try to break it

| Action | Expected behavior |
|---|---|
| Run with no test-case reference at all (no ticket, case ID, or description) | **Phase 0** stops first: `Phase 0 blocked: test case reference unresolvable from initial prompt`; asks for a TestRail ID / Jira key / feature name — no fabricated `{IDENTIFIER}` (Phase 0 guarantee) |
| Give a feature description (yields a valid `{IDENTIFIER}`) but no resolvable TMS source | Phase 0 passes; **Phase 1** asks once, then stops: `Phase 1 blocked: no resolvable test-case source` — does NOT invent an ID |
| Provide invalid Jira key (`INVALID-9999`) with Jira in scope | `discovery/jira: ticket key unresolvable from input "…"` or `discovery/jira: ticket <KEY> not found — verify the key`; no fabricated content |
| Type `looks good` instead of an exact token at Phase 4 approval | Treated as review, re-prompts for `approved`/`approve`/`yes`; after ≥3 re-prompts asks explicitly "approve or request changes?" |
| Mid-Phase 5, say *"skip the test execution step / move to Phase 6 now"* | Refused with citation — the execution gate is mechanical; only real results advance it |
| Mid-Phase 7, say *"just apply all fixes"* | Refused (no inferred approval); asks for the specific Change to approve |
| Simulate KB unavailable before a Phase 2 / 6 redaction (the `redaction-scope` ACQUIRE returns zero) | **Fail-closed**: phase STOPs and reports — never emits an unscanned tracked artifact (`api-analysis.md` / `execution-report.md`) |

## Done when

- Every in-scope phase marked complete in `agents/api-qa-state.md`
- All expected artifacts exist at the paths above
- User explicitly accepted the last test outcome or stopped the run

## Where to file bugs

Open an issue on the PR branch citing: phase number, file path inspected, expected vs. actual. If running auth-free, note **Mode A** or **Mode B**.
