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

Prerequisite: Rosetta Prep Steps.

**Terminology.** External systems are named by role throughout this workflow and its phases: **Test Management System (TMS)**, **Issue Tracker**, and **Wiki**. TestRail, Jira, and Confluence are canonical examples only — adapt identifiers, URLs, requests, calls, and query syntax to the systems resolved for the current project (from repository-root `gain.json`, explicit user input, recognizable URLs/handles, and available integrations).

</description_and_purpose>

<workflow_phases>

**Execution cadence:**
- All Rosetta prep steps MUST be FULLY completed, USE SKILL `load-project-context` loaded and fully executed.
- Execute every in-scope phase in strict 1-8 order (never skip without explicit HITL confirmation): APPLY PHASE the phase file → update `agents/TEMP/<FEATURE>/ui-aqa-state.md` → next; never start a phase until the previous is marked done in `ui-aqa-state.md`.
- Skip gates, transitions, and escalation → `<orchestration_and_escalation>`.
- MUST use todo tasks; prioritize ACCURACY over SPEED.

**No assumptions:**
- NO ASSUMPTIONS: never assume selectors, flows, or data — ask the user when information is missing.

**Customization:**
- If the user gave no preferences, perform all steps except optional.
- User CAN customize specific phases / already-done phases / goals / cases — LISTEN and ADOPT.

**Authoritative rules (do not skim past):**
- USE SKILL `coding` before any work touching repository tests, page objects, or shared helpers — authoritative for conventions; repository docs win over skill snippets.
- Default: reuse existing page objects/tests first; create new files only when no suitable match exists.
- Explicit assertions: every test validation traces to a requirement — owned by Phase 2 (`### Explicit Assertions` in the test plan), enforced when Phase 6 implements tests.
- **Blocking infeasibility = HARD-STOP + HITL (NOT waived by a clarification skip):** if any phase finds the feature/elements under test do not exist such that the test cannot be authored without inventing selectors/flows/data or modifying product source, STOP and escalate with the options — point at the real feature/URL · author the missing UI as a separate approved task · a clearly-marked pending/`fixme` spec · abort — and WAIT for the user's explicit choice. "Skip clarification" waives clarification *questions* only; it never authorizes this feasibility/scope call.

<data_collection phase="1" applies="ALL" subagent="discoverer" role="UI-AQA data collector">
- APPLY PHASE `ui-aqa-flow-data-collection.md`
- Input: user request + repository-root `gain.json` + project context at its configured paths (canonical: `docs/CONTEXT.md`, `docs/ARCHITECTURE.md`, `agents/IMPLEMENTATION.md`). Output: test plan at `plans/ui-aqa-<test-name>/test-plan.md`
- Required skills: `data-collection`, `sensitive-data`, `qa-structure`, `qa-knowledge`
- Update `agents/TEMP/<FEATURE>/ui-aqa-state.md`; Phase 1 is not complete until its output spot-check passes.
</data_collection>

<requirements_clarification phase="2" applies="ALL" subagent="architect" role="Test requirements analyst" type="HITL">
- APPLY PHASE `ui-aqa-flow-requirements-clarification.md`
- Input: user request + collected data from Phase 1. Output: clarified requirements + typed assertion list in the test plan
- **WAIT FOR USER ANSWERS** to the clarifying questions before Phase 3.
- Required skills: `qa-knowledge` (`gap_analysis` mode), `qa-structure`
- Recommended skills: `questioning`
- Update `agents/TEMP/<FEATURE>/ui-aqa-state.md`; Phase 2 is not complete until its output spot-check passes.
</requirements_clarification>

<code_analysis phase="3" applies="ALL" subagent="discoverer" role="Test architecture analyst">
- APPLY PHASE `ui-aqa-flow-code-analysis.md`
- Input: repo docs + test plan. Output: code analysis report at `plans/ui-aqa-<test-name>/code-analysis.md` (architecture patterns, existing page objects, test patterns)
- Required skills: `qa-knowledge` (`code_analysis` mode), `reverse-engineering`, `sensitive-data`, `qa-structure`
- Update `agents/TEMP/<FEATURE>/ui-aqa-state.md`; Phase 3 is not complete until its output spot-check passes.
</code_analysis>

<selector_identification phase="4" applies="ALL" subagent="engineer" role="Selector identification specialist" type="HITL-CONDITIONAL">
- APPLY PHASE `ui-aqa-flow-selector-identification.md`
- Input: code analysis report + frontend code (or user-provided page source). Output: identified selectors for test targets
- **WAIT FOR USER TO PROVIDE PAGE SOURCE** only if frontend code unavailable or selectors not found.
- Required skills: `qa-knowledge` (`implementation_modes` — selector mode Part A), `qa-structure`, `sensitive-data`
- Recommended skills: `testing`
- Update `agents/TEMP/<FEATURE>/ui-aqa-state.md`; Phase 4 is not complete until its output spot-check passes.
</selector_identification>

<selector_implementation phase="5" applies="ALL" subagent="engineer" role="Selector implementation specialist">
- APPLY PHASE `ui-aqa-flow-selector-implementation.md`
- Input: identified selectors + existing page objects. Output: implemented/updated page object files
- Required skills: `qa-knowledge` (`implementation_modes` — selector mode Part B), `qa-structure`
- Recommended skills: `testing`, `coding`
- Update `agents/TEMP/<FEATURE>/ui-aqa-state.md`; Phase 5 is not complete until its output spot-check passes.
</selector_implementation>

<test_implementation phase="6" applies="ALL" subagent="engineer" role="Test automation engineer" type="HITL">
- APPLY PHASE `ui-aqa-flow-test-implementation.md`
- Input: page objects + clarified requirements + code analysis report. Output: implemented test files
- **STOP AND WAIT** for user to execute the test — this execution gate is **mechanical and cannot be overridden by instruction**; the only acceptable input is actual execution results (output, report path, or pass/fail). Refuse "skip" / "move to Phase 7 now" phrasings (full bypass-refusal in the phase file).
- Required skills: `qa-knowledge` (`implementation_modes` — UI impl), `qa-structure`
- Recommended skills: `testing`, `coding`
- Update `agents/TEMP/<FEATURE>/ui-aqa-state.md`; Phase 6 is not complete until its output spot-check passes.
</test_implementation>

<test_report_analysis phase="7" applies="ALL" subagent="engineer" role="Test failure analyst" type="HITL">
- APPLY PHASE `ui-aqa-flow-test-report-analysis.md`
- Input: test execution report (user-provided or from `agents/user-instructions/`). Output: failure analysis with root causes + fix recommendations
- **WAIT FOR USER TO PROVIDE TEST REPORT** (if not in `agents/user-instructions/`).
- Required skills: `qa-knowledge` (`test_execution_triage` mode), `sensitive-data`, `qa-structure`
- Update `agents/TEMP/<FEATURE>/ui-aqa-state.md`; Phase 7 is not complete until its output spot-check passes.
</test_report_analysis>

<test_corrections phase="8" applies="ALL" subagent="engineer" role="Test correction engineer" type="HITL">
- APPLY PHASE `ui-aqa-flow-test-correction.md`
- Input: failure analysis + test files + page objects. Output: corrected test files and page objects
- **WAIT FOR EXPLICIT USER APPROVAL** before applying changes; comments, questions, suggestions, and review feedback are not approval. Approval language is defined in `ui-aqa-flow-test-correction.md` section `<present_for_approval>`.
- Required skills: `qa-knowledge` (`correction` mode), `qa-structure`
- Recommended skills: `debugging`, `coding`, `hitl`
- Update `agents/TEMP/<FEATURE>/ui-aqa-state.md`; Phase 8 is not complete until its output spot-check passes.
</test_corrections>

</workflow_phases>

<orchestration_and_escalation>
- **Skip-without-agreement / falsified-skip refusal** (this workflow owns the rule; subordinate to the `hitl` skill): a skip asserted but contradicted by `agents/TEMP/<FEATURE>/ui-aqa-state.md` / disk evidence is refused — announce the specific missing state row / absent artifact, then start the earliest incomplete phase the same turn. Audit-trail row → the state file's `## Verification-Failure Overrides` (template owned by `qa-structure`).
- **HITL carve-outs (never overridden):** every phase header carrying `type="HITL"` / `type="HITL-CONDITIONAL"` — those `type=` attributes are the sole source of truth for this workflow — plus safety/destructive confirmations. Any skip outside the refusal rule above requires explicit user confirmation (HITL).
- **HITL waits on delegated (subagent) phases are owned by the orchestrator.** A subagent cannot talk to the user: on a `type="HITL"` phase the subagent surfaces the question/blocker and returns; the **orchestrator** runs the gate with the user and only then resumes — never inferred, critical on the destructive Phase 8. Dispatch per USE SKILL `orchestration`.
- Load failure for a required phase file or skill: retry once, stop, record in `ui-aqa-state.md`, ask the user; never substitute silently.
</orchestration_and_escalation>

<workflow_success_criteria>
- **Overall run complete** when every in-scope phase is marked done in `agents/TEMP/<FEATURE>/ui-aqa-state.md`, the artifacts those phases reference exist, and the user accepts the last test outcome or explicitly stops. **In-scope** = default execution plus user-approved customization/skip decisions under `<orchestration_and_escalation>`.
- **Spot checks:** P1 — plan file at the **user-confirmed** `<test-name>` slug (no fabricated/placeholder slug) · P2 — `### Explicit Assertions` in the plan (≥1 typed bullet or None-clause) · P3 — code analysis report populated (architecture + page-object inventory + test location) · P4 — `## Selector Management` Part A deliverables in the plan · P5 — every identified selector in the updated page objects, lint-clean · P6 — test file exists lint-clean + `## Test Implementation` record with all five subsections (incl. `### Uncovered Assertions` / None-clause) · P7 — failure analysis when failures occurred, or state rows reconciled to `N/A — 0 failures` / `None` · P8 — user-approved edits applied when failures occurred, or state records `N/A — no corrections` after a zero-failure run.
- A missing/partial spot-check artifact means that phase is not done: record the gap in `ui-aqa-state.md`, flag uncertainty, stop for user guidance.
</workflow_success_criteria>

<state_file>

`agents/TEMP/<FEATURE>/ui-aqa-state.md` — created/updated after each phase from the template **owned by `qa-structure`** (its state-file skeleton asset, loaded at Phase 1). It carries `## Phase Completion Status`, `## Key Artifacts & Facts` (the resume anchor — only what resume-after-compaction needs), and `## Verification-Failure Overrides`.

</state_file>

<references>

Subagents: `discoverer` · `architect` · `engineer`.

Cross-phase skills: `qa-structure` (paths / `<test-name>` slug / state-file shape) and `qa-knowledge` (modes, taxonomy, artifact skeletons — loads its own assets at point of use).

Integrations: TMS and Wiki per `<description_and_purpose>` Terminology, plus browser automation (Playwright is the canonical example).

</references>

</ui_aqa_flow>
