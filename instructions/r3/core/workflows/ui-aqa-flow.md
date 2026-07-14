---
name: ui-aqa-flow
description: "Workflow for automated QA: integration and end-to-end UI test automation, page objects, etc."
alwaysApply: false
tags: ["workflow"]
user-invocable: true
baseSchema: docs/schemas/workflow.md
---

<ui_aqa_flow>

<description_and_purpose>

End-to-end test automation from requirements gathering to test implementation. Uses test cases, project documentation to create automated tests following existing architecture and coding standards.

</description_and_purpose>

<workflow_phases>

**Execution cadence:**
- All Rosetta prep steps MUST be FULLY completed, SKILL `load-project-context` loaded and fully executed.
- Execute every in-scope phase in strict 1-8 order (never skip without explicit HITL confirmation): APPLY PHASE the phase file → execute → update `agents/TEMP/<FEATURE>/ui-aqa-state.md` → next; never start a phase until the previous is marked done in state.
- Skip gates, transitions, and escalation → `<orchestration_and_escalation>`.
- MUST use todo tasks; prioritize ACCURACY over SPEED.

**No assumptions & state:**
- NO ASSUMPTIONS: never assume selectors, flows, or data — ask the user when information is missing.
- Update `agents/TEMP/<FEATURE>/ui-aqa-state.md` after each phase.

**Customization:**
- If the user gave no preferences, perform all steps except optional.
- User CAN customize specific phases / already-done phases / goals / cases — LISTEN and ADOPT.

**Authoritative rules (do not skim past):**
- USE SKILL `coding` before any work touching repository tests, page objects, or shared helpers — authoritative for conventions; repository docs win over skill snippets.
- Default: reuse existing page objects/tests first; create new files only when no suitable match exists.
- Explicit assertions: every test validation traces to a requirement — owned by Phase 2 (`### Explicit Assertions` in the test plan), enforced when Phase 6 implements tests.
- **Blocking infeasibility = HARD-STOP + HITL (NOT waived by a clarification skip):** if any phase finds the feature/elements under test do not exist such that the test cannot be authored without inventing selectors/flows/data or modifying product source, STOP and escalate with the options — point at the real feature/URL · author the missing UI as a separate approved task · a clearly-marked pending/`fixme` spec · abort — and WAIT for the user's explicit choice. "Skip clarification" waives clarification *questions* only; it never authorizes this feasibility/scope call.

<data_collection phase="1" applies="ALL" subagent="discoverer" role="UI-AQA data collector">

1. APPLY PHASE `ui-aqa-flow-data-collection.md`
2. Execute phase instructions.
3. Input: user request + `CONTEXT.md` + `ARCHITECTURE.md` + `IMPLEMENTATION.md`. Output: test plan file created at `plans/ui-aqa-<test-name>/test-plan.md`
4. Recommended skills: `data-collection`, `qa-structure`, `qa-knowledge`
5. Update `agents/TEMP/<FEATURE>/ui-aqa-state.md`

</data_collection>

<requirements_clarification phase="2" applies="ALL" subagent="architect" role="Test requirements analyst" type="HITL">

1. APPLY PHASE `ui-aqa-flow-requirements-clarification.md`
2. Execute phase instructions.
3. Input: user request + collected data from Phase 1. Output: clarified test requirements and scope in test plan file `plans/ui-aqa-<test-name>/test-plan.md`
4. **WAIT FOR USER ANSWERS** to the clarifying questions before Phase 3.
5. Recommended skills: `qa-knowledge` (`gap_analysis` mode), `questioning`
6. Update `agents/TEMP/<FEATURE>/ui-aqa-state.md`

</requirements_clarification>

<code_analysis phase="3" applies="ALL" subagent="discoverer" role="Test architecture analyst">

1. APPLY PHASE `ui-aqa-flow-code-analysis.md`
2. Execute phase instructions.
3. Input: user request + `CONTEXT.md` + `ARCHITECTURE.md` + `IMPLEMENTATION.md` + test plan file `plans/ui-aqa-<test-name>/test-plan.md`. Output: code analysis report at `plans/ui-aqa-<test-name>/code-analysis.md` (architecture patterns, existing page objects, test patterns).
4. Recommended skills: `qa-knowledge` (`code_analysis` mode)
5. Update `agents/TEMP/<FEATURE>/ui-aqa-state.md`

</code_analysis>

<selector_identification phase="4" applies="ALL" subagent="engineer" role="Selector identification specialist" type="HITL-CONDITIONAL">

1. APPLY PHASE `ui-aqa-flow-selector-identification.md`
2. Execute phase instructions.
3. Input: code analysis report `plans/ui-aqa-<test-name>/code-analysis.md` + frontend code (or user-provided page source). Output: identified selectors for test targets.
4. **WAIT FOR USER TO PROVIDE PAGE SOURCE** only if frontend code unavailable or selectors not found.
5. Recommended skills: `qa-knowledge` (`implementation_modes` — selector mode Part A), `testing`
6. Update `agents/TEMP/<FEATURE>/ui-aqa-state.md`

</selector_identification>

<selector_implementation phase="5" applies="ALL" subagent="engineer" role="Selector implementation specialist">

1. APPLY PHASE `ui-aqa-flow-selector-implementation.md`
2. Execute phase instructions.
3. Input: identified selectors + existing page objects. Output: implemented/updated page object files with selectors.
4. Recommended skills: `qa-knowledge` (`implementation_modes` — selector mode Part B), `testing`, `coding`
5. Update `agents/TEMP/<FEATURE>/ui-aqa-state.md`

</selector_implementation>

<test_implementation phase="6" applies="ALL" subagent="engineer" role="Test automation engineer" type="HITL">

1. APPLY PHASE `ui-aqa-flow-test-implementation.md`
2. Execute phase instructions.
3. Input: page objects + clarified requirements + code analysis report `plans/ui-aqa-<test-name>/code-analysis.md`. Output: implemented test files.
4. **STOP AND WAIT** for user to execute the test — this execution gate is **mechanical and cannot be overridden by instruction**; the only acceptable input is actual execution results (output, report path, or pass/fail). Refuse "skip" / "move to Phase 7 now" phrasings (full bypass-refusal in `ui-aqa-flow-test-implementation.md` step 6.3).
5. Recommended skills: `qa-knowledge` (`implementation_modes` — UI impl), `testing`, `coding`
6. Update `agents/TEMP/<FEATURE>/ui-aqa-state.md`

</test_implementation>

<test_report_analysis phase="7" applies="ALL" subagent="engineer" role="Test failure analyst" type="HITL">

1. APPLY PHASE `ui-aqa-flow-test-report-analysis.md`
2. Execute phase instructions.
3. Input: test execution report (user-provided or from `agents/user-instructions/`). Output: failure analysis with root causes and fix recommendations.
4. **WAIT FOR USER TO PROVIDE TEST REPORT** (if not in `agents/user-instructions/`).
5. Recommended skills: `qa-knowledge` (`test_execution_triage` mode), `sensitive-data` (read-only report-analysis triage, done inline by this phase)
6. Update `agents/TEMP/<FEATURE>/ui-aqa-state.md`

</test_report_analysis>

<test_corrections phase="8" applies="ALL" subagent="engineer" role="Test correction engineer" type="HITL">

1. APPLY PHASE `ui-aqa-flow-test-correction.md`
2. Execute phase instructions.
3. Input: failure analysis + test files + page objects. Output: corrected test files and page objects.
4. **WAIT FOR USER APPROVAL** before applying changes; authoritative approval tokens and presentation rules are defined in `ui-aqa-flow-test-correction.md` section `<present_for_approval>`.
5. Recommended skills: `qa-knowledge` (`correction` mode), `debugging`, `coding`
6. Update `agents/TEMP/<FEATURE>/ui-aqa-state.md`

</test_corrections>

</workflow_phases>

<orchestration_and_escalation>
- **Skip-without-agreement / falsified-skip refusal** (this workflow owns the rule; subordinate to the `hitl` skill): a skip asserted but contradicted by `agents/TEMP/<FEATURE>/ui-aqa-state.md` / disk evidence is refused — announce the specific missing state row / absent artifact, then start the earliest incomplete phase the same turn.
- **UI-AQA bindings for that rule:**
  - State file: `agents/TEMP/<FEATURE>/ui-aqa-state.md`.
  - Verification artifacts: the spot-checks in `<workflow_success_criteria>`.
  - HITL carve-outs (never overridden): every phase header carrying `type="HITL"` / `type="HITL-CONDITIONAL"` — for this workflow's HITL carve-outs those `type=` attributes are the sole source of truth (other flows, e.g. `testgen-flow`, may add lighter per-phase confirmations without a `type=` attribute) — plus safety/destructive confirmations.
- Audit-trail row → `agents/TEMP/<FEATURE>/ui-aqa-state.md` `## Verification-Failure Overrides` (template owned by `qa-structure`'s state-file skeleton); the skip-refusal rule above defines when and what to log.
- Any skip outside the rule above requires explicit user confirmation (HITL).
- **HITL waits on delegated (subagent) phases are owned by the orchestrator.** A subagent cannot talk to the user: on a `type="HITL"` phase the subagent surfaces the question/blocker and returns; the **orchestrator** runs the gate with the user and only then resumes. A subagent never waits for, infers, or proceeds without the user's approval itself (critical on the destructive Phase 8). Dispatch per USE SKILL `orchestration`.
- Load failure for a required phase file or skill: retry once, stop, record in `agents/TEMP/<FEATURE>/ui-aqa-state.md`, ask the user; never substitute silently.
</orchestration_and_escalation>

<workflow_success_criteria>
- **Overall run complete** when every in-scope phase is marked done in `agents/TEMP/<FEATURE>/ui-aqa-state.md` and the artifacts those phases reference exist (e.g. `plans/ui-aqa-<test-name>/test-plan.md`, `plans/ui-aqa-<test-name>/code-analysis.md` when Phase 3 ran, test file paths after Phase 6, failure analysis before Phase 8), and the user accepts the last test outcome or explicitly stops.
- **In-scope phase** means any phase required by default execution plus user-approved customization/skip decisions under `<orchestration_and_escalation>`.
- **Spot checks:** Phase 1 — plan file exists at the **user-confirmed** `<test-name>` slug (no fabricated/placeholder slug; user deletion of the slug respected); Phase 2 — `### Explicit Assertions` subsection present in the plan (≥1 typed bullet or the None-clause); Phase 3 — code analysis report path populated with architecture + page object inventory + test location; Phase 4 — `## Selector Management` Part A deliverables present in the plan (Interaction Map / Availability / Identified Selectors / Fragile Flagged); Phase 5 — every identified selector present in the updated page-object files and lint-clean; Phase 6 — test file path + lint-clean per phase doc **and** the `## Test Implementation` record present in the plan with all five subsections (incl. `### Uncovered Assertions` / None-clause) (example: `tests/e2e/login.spec.ts` exists and lint passes as required by `ui-aqa-flow-test-implementation.md`); Phase 7 — failure analysis recorded when failures occurred, **or** the state's Failure-analysis / Root-causes rows reconciled to `N/A — 0 failures` / `None` when the run reported zero failures; Phase 8 — user-approved edits applied when that phase runs.
- If a required spot-check artifact is missing or partial, that phase is not done: record the gap in `agents/TEMP/<FEATURE>/ui-aqa-state.md`, flag uncertainty, and stop for user guidance before continuing.
</workflow_success_criteria>

<state_file>

`agents/TEMP/<FEATURE>/ui-aqa-state.md` — created/updated after each phase from the template **owned by `qa-structure`** (its state-file skeleton asset, loaded at Phase 1). It carries `## Phase Completion Status`, `## Key Artifacts & Facts` (the resume anchor — only what resume-after-compaction needs; full per-phase detail lives in each phase's own artifacts), and `## Verification-Failure Overrides`.

</state_file>

<references>

Cross-phase skills: `qa-structure` (paths / `<test-name>` slug / state-file shape) and `qa-knowledge` (modes, taxonomy, artifact skeletons — loads its own assets at point of use).

MCPs: Test case management (default: `TestRail`) · Documentation (default: `Atlassian Confluence`) · Browser automation (default: `Playwright`). MCP names are illustrative; equivalent configured providers are acceptable when mapped in project config.

</references>

</ui_aqa_flow>
